/*
 * Performance benchmark for user-defined custom statistics (US-A01).
 *
 * Runs the calculation pipeline from
 * services/customStatisticsService against synthetic in-memory
 * datasets, including the 10,000-entry shared dataset required by the
 * Sprint 3 performance deliverable.
 *
 * No database connection is required.
 *
 * Usage (from the server directory):
 *   node scripts/benchmarkCustomStatistics.js
 */

const os = require("node:os");
const { performance } = require("node:perf_hooks");

const {
  validateCustomStatisticExpression,
  evaluateCustomStatisticValue,
} = require("../services/customStatisticsService");

const SHARED_ENTRY_COUNT = 10000;
const SCALING_ENTRY_COUNTS = [1000, 2500, 5000, 10000, 20000];
const LIST_STAT_COUNTS = [1, 5, 10, 25];
const MISSING_CELL_RATE = 0.08;
const MEASURED_RUNS = 5;

const FIELDS = [
  { id: "field-score", name: "Score", fieldType: "number" },
  {
    id: "field-call-duration",
    name: "Call Duration",
    fieldType: "number",
  },
  {
    id: "field-focus-rating",
    name: "Focus Rating",
    fieldType: "number",
  },
  { id: "field-pages-read", name: "Pages Read", fieldType: "number" },
  { id: "field-session-date", name: "Session Date", fieldType: "date" },
  {
    id: "field-session-notes",
    name: "Session Notes",
    fieldType: "long_text",
  },
  { id: "field-topic", name: "Topic", fieldType: "short_text" },
];

const MIXED_EXPRESSION =
  'sum(Score) + avg("Call Duration") / count(Topic)' +
  ' - max("Focus Rating") + min("Pages Read") * 2';

const LIST_EXPRESSIONS = [
  "sum(Score)",
  'avg("Call Duration")',
  'max("Focus Rating")',
  'min("Pages Read")',
  "count(Topic)",
  'count("Session Date")',
  "sum(Score) / count(Score)",
  'sum(Score) + avg("Call Duration")',
  'max("Focus Rating") - min("Focus Rating")',
  'sum("Pages Read") + count("Session Notes")',
];

function createRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function buildDataset(entryCount, seed = 20260927) {
  const random = createRandom(seed);
  const rows = [];

  for (let entry = 0; entry < entryCount; entry += 1) {
    for (const field of FIELDS) {
      // Real datasets leave some cells empty: ~8% of entry+field
      // combinations never get a value row.
      if (random() < MISSING_CELL_RATE) {
        continue;
      }

      const row = {
        fieldId: field.id,
        entryId: `entry-${entry}`,
        valueText: null,
        valueNumber: null,
        valueDate: null,
      };

      if (field.fieldType === "number") {
        row.valueNumber = Math.round(random() * 10000) / 10;
      } else if (field.fieldType === "date") {
        row.valueDate = `2026-0${1 + (entry % 9)}-1${entry % 9}`;
      } else {
        row.valueText = `${field.name} value ${entry}`;
      }

      rows.push(row);
    }
  }

  return rows;
}

function timeOnce(fn) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

function measure(fn, iterations = MEASURED_RUNS) {
  fn(); // warm-up

  const samples = [];

  for (let index = 0; index < iterations; index += 1) {
    samples.push(timeOnce(fn));
  }

  const total = samples.reduce((sum, sample) => sum + sample, 0);

  return {
    mean: total / samples.length,
    min: Math.min(...samples),
  };
}

function ms(value) {
  return Math.round(value * 1000) / 1000;
}

// Mirrors buildValueIndex() from customStatisticsService so the cost of
// rebuilding the field index can be attributed inside each evaluation.
function buildValueIndexReplica(valueRows) {
  const index = new Map();

  for (const row of valueRows) {
    let entry = index.get(row.fieldId);

    if (!entry) {
      entry = { numbers: [], presence: 0 };
      index.set(row.fieldId, entry);
    }

    if (row.valueNumber !== null && row.valueNumber !== undefined) {
      entry.numbers.push(row.valueNumber);
    }

    if (
      (row.valueText !== null && row.valueText !== undefined) ||
      (row.valueNumber !== null && row.valueNumber !== undefined) ||
      (row.valueDate !== null && row.valueDate !== undefined)
    ) {
      entry.presence += 1;
    }
  }

  return index;
}

function spreadMinWorks(length) {
  const values = new Array(length).fill(1);

  try {
    Math.min(...values);
    return true;
  } catch {
    return false;
  }
}

function probeSpreadLimit(cap = 1 << 21) {
  if (spreadMinWorks(cap)) {
    return cap;
  }

  let low = 1;
  let high = cap;

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);

    if (spreadMinWorks(middle)) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return low;
}

function printHeader() {
  const cpu = os.cpus()[0];

  console.log("Custom statistics benchmark (US-A01)");
  console.log(
    `Environment: Node ${process.version} on ${os.platform()} ` +
      `${os.release()} (${cpu ? cpu.model : "unknown CPU"})`,
  );
  console.log(
    `Dataset: 7 fields per entry, ${MISSING_CELL_RATE * 100}% ` +
      "missing cells, deterministic seed",
  );
  console.log(`Iterations: 1 warm-up + ${MEASURED_RUNS} measured runs`);
  console.log("");
}

function benchmarkSharedDataset() {
  const valueRows = buildDataset(SHARED_ENTRY_COUNT);

  console.log(
    `--- 10,000-entry shared dataset ` +
      `(${valueRows.length} value rows) ---`,
  );

  const counts = FIELDS.map((field) => ({
    field: field.name,
    type: field.fieldType,
    rows: valueRows.filter((row) => row.fieldId === field.id).length,
  }));

  console.table(counts);

  const validation = measure(() =>
    validateCustomStatisticExpression({
      expression: MIXED_EXPRESSION,
      fields: FIELDS,
    }),
  );

  const indexBuild = measure(() =>
    buildValueIndexReplica(valueRows),
  );

  const evaluation = measure(() =>
    evaluateCustomStatisticValue({
      expression: MIXED_EXPRESSION,
      fields: FIELDS,
      valueRows,
    }),
  );

  const checksum = evaluateCustomStatisticValue({
    expression: "sum(Score)",
    fields: FIELDS,
    valueRows,
  });

  const table = [
    {
      step: "validate expression (parse + walk)",
      meanMs: ms(validation.mean),
      minMs: ms(validation.min),
    },
    {
      step: "build value index (replica)",
      meanMs: ms(indexBuild.mean),
      minMs: ms(indexBuild.min),
    },
    {
      step: "full evaluate (all of the above)",
      meanMs: ms(evaluation.mean),
      minMs: ms(evaluation.min),
    },
    {
      step: "aggregation only (best-case residual)",
      meanMs: null,
      minMs: ms(
        Math.max(
          0,
          evaluation.min - validation.min - indexBuild.min,
        ),
      ),
    },
  ];

  console.table(table);
  console.log(`sum(Score) checksum: ${checksum}`);
  console.log("");

  return { valueRows, validation: validation.mean };
}

function benchmarkScaling() {
  console.log("--- Scaling: dataset size vs evaluation time ---");

  const rows = SCALING_ENTRY_COUNTS.map((entryCount) => {
    const valueRows = buildDataset(entryCount);

    const indexBuild = measure(
      () => buildValueIndexReplica(valueRows),
      3,
    );

    const evaluation = measure(
      () =>
        evaluateCustomStatisticValue({
          expression: MIXED_EXPRESSION,
          fields: FIELDS,
          valueRows,
        }),
      3,
    );

    return {
      entries: entryCount,
      valueRows: valueRows.length,
      indexBuildMs: ms(indexBuild.mean),
      evaluateMs: ms(evaluation.mean),
      msPer10kRows: ms(
        (evaluation.mean / valueRows.length) * 10000,
      ),
    };
  });

  console.table(rows);
  console.log("");
}

function benchmarkListEndpoint(valueRows) {
  console.log(
    "--- List endpoint simulation: N statistics over the same " +
      `${valueRows.length} rows ---`,
  );

  const rows = LIST_STAT_COUNTS.map((statCount) => {
    const expressions = [];

    for (let index = 0; index < statCount; index += 1) {
      expressions.push(
        LIST_EXPRESSIONS[index % LIST_EXPRESSIONS.length],
      );
    }

    const evaluation = measure(
      () => {
        for (const expression of expressions) {
          evaluateCustomStatisticValue({
            expression,
            fields: FIELDS,
            valueRows,
          });
        }
      },
      3,
    );

    return {
      statistics: statCount,
      totalMs: ms(evaluation.mean),
      perStatisticMs: ms(evaluation.mean / statCount),
    };
  });

  console.table(rows);
  console.log("");
}

function timeSpread(values) {
  try {
    return measure(() => Math.min(...values));
  } catch {
    // The spread limit shrinks as the call stack gets deeper, so a
    // size that passed the probe can still overflow here.
    return null;
  }
}

function benchmarkMinMaxSpread() {
  console.log("--- Math.min(...values) spread limit probe ---");

  const limit = probeSpreadLimit();
  const microSizes = [10000, Math.floor(limit / 2)];

  const rows = microSizes.map((size) => {
    const values = new Array(size)
      .fill(0)
      .map((_, index) => index % 997);

    const spread = timeSpread(values);
    const loop = measure(() => {
      let minimum = Infinity;

      for (const value of values) {
        if (value < minimum) {
          minimum = value;
        }
      }

      return minimum;
    });

    return {
      values: size,
      spreadMs: spread ? ms(spread.mean) : "stack overflow",
      loopMs: ms(loop.mean),
    };
  });

  console.table(rows);
  console.log(
    "Largest spread Math.min(...) handled without error in this " +
      `environment: ~${limit.toLocaleString("en-US")} values`,
  );
  console.log(
    "The limit is not a fixed constant: it depends on stack depth, " +
      "so min()/max() can throw RangeError before the value count " +
      "ever reaches it.",
  );
  console.log("");
}

function printSummary() {
  console.log("--- Summary ---");
  console.log(
    "1. Every evaluation rebuilds the field index from all value " +
      "rows, so the list endpoint costs O(statistics x rows).",
  );
  console.log(
    "2. Each evaluation parses the expression twice (service " +
      "validation plus evaluateCustomStatisticValue).",
  );
  console.log(
    "3. min()/max() use Math.min/max(...numbers); each numeric " +
      "field is bounded by the spread limit printed above.",
  );
  console.log(
    "4. Rows are loaded from PostgreSQL in full on every " +
      "create/update/list request (getProjectFieldValues).",
  );
}

printHeader();

const { valueRows } = benchmarkSharedDataset();

benchmarkScaling();
benchmarkListEndpoint(valueRows);
benchmarkMinMaxSpread();
printSummary();
