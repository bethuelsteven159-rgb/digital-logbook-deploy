const test = require("node:test");
const assert = require("node:assert/strict");

const { createEntryService } = require("../services/projectDetailsService");

const db = require("../db");

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const OWNER_ID = "22222222-2222-2222-2222-222222222222";
const ENTRY_ID = "33333333-3333-3333-3333-333333333333";
const FIELD_ID = "44444444-4444-4444-4444-444444444444";
const VALUE_ID = "55555555-5555-5555-5555-555555555555";
const CREATED_AT = new Date("2026-09-01T09:00:00.000Z");

function uuid(n) {
  return `${n}`.padStart(8, "0") + "-0000-4000-8000-" + `${n}`.padStart(12, "0");
}

function createClient({ fields = [], rules = [], failOn } = {}) {
  const client = {
    queries: [],
    released: 0,
    projects: [{ id: PROJECT_ID, owner_id: OWNER_ID }],
    projectFields: fields,
    automationRules: rules,
    entries: [],
    entryValues: [],
    tagUpdates: [],
    _snapshot: null,
    _transactionOpen: false,
    async query(text, parameters = []) {
      const sql = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
      client.queries.push({ sql, parameters });

      if (sql === "BEGIN") {
        client._snapshot = {
          entries: structuredClone(client.entries),
          entryValues: structuredClone(client.entryValues),
          tagUpdates: structuredClone(client.tagUpdates),
        };
        client._transactionOpen = true;
        return { rows: [], rowCount: 0 };
      }
      if (sql === "COMMIT") {
        client._transactionOpen = false;
        return { rows: [], rowCount: 0 };
      }
      if (sql === "ROLLBACK") {
        if (client._snapshot) {
          client.entries = client._snapshot.entries;
          client.entryValues = client._snapshot.entryValues;
          client.tagUpdates = client._snapshot.tagUpdates;
        }
        client._transactionOpen = false;
        return { rows: [], rowCount: 0 };
      }

      if (failOn && failOn(sql)) {
        const error = new Error("Simulated automation database failure");
        error.code = "23505";
        throw error;
      }

      if (sql.startsWith("SELECT id, owner_id, name, description")) {
        assert.match(sql, /FROM projects WHERE id = \$1 AND owner_id = \$2 LIMIT 1 FOR UPDATE/);
        const project = client.projects.find(
          (p) => p.id === parameters[0] && p.owner_id === parameters[1],
        );
        return { rows: project ? [project] : [] };
      }

      if (sql.startsWith("SELECT pf.id, pf.project_id, pf.name, pf.field_type")) {
        assert.match(sql, /FROM project_fields pf WHERE pf\.project_id = \$1 AND \(\$2::boolean OR pf\.archived_at IS NULL\) ORDER BY pf\.position ASC/);
        assert.deepEqual(parameters, [PROJECT_ID, false]);
        return { rows: client.projectFields };
      }

      if (sql.startsWith("SELECT id, owner_id, project_id, name, condition_field_id")) {
        assert.match(sql, /FROM automation_rules WHERE project_id = \$1 AND enabled = TRUE/);
        assert.deepEqual(parameters, [PROJECT_ID]);
        return {
          rows: client.automationRules.filter((rule) => rule && rule.enabled === true),
        };
      }

      if (sql.startsWith("INSERT INTO entries")) {
        assert.match(sql, /RETURNING id, project_id, created_by_id, name, duration_minutes, occurred_at, due_at, completed_at, tags, created_at, updated_at/);
        const entry = {
          id: ENTRY_ID,
          project_id: parameters[0],
          created_by_id: parameters[1],
          name: parameters[2],
          duration_minutes: parameters[3],
          occurred_at: null,
          due_at: parameters[4],
          completed_at: null,
          tags: parameters[5] ?? [],
          created_at: CREATED_AT,
          updated_at: CREATED_AT,
        };
        client.entries.push(entry);
        return { rows: [entry] };
      }

      if (sql.startsWith("INSERT INTO entry_field_values")) {
        const value = {
          id: VALUE_ID,
          entry_id: parameters[0],
          field_id: parameters[1],
          value_text: parameters[2],
          value_number: parameters[3],
          value_date: parameters[4],
          created_at: CREATED_AT,
        };
        client.entryValues.push(value);
        return { rows: [value] };
      }

      if (sql.startsWith("UPDATE entries SET tags = $2, updated_at = NOW() WHERE id = $1")) {
        assert.match(sql, /RETURNING id, tags/);
        const entry = client.entries.find((e) => e.id === parameters[0]);
        if (!entry) {
          throw new Error(`Tag update target entry not found: ${parameters[0]}`);
        }
        entry.tags = parameters[1];
        entry.updated_at = CREATED_AT;
        client.tagUpdates.push({ entryId: parameters[0], tags: parameters[1] });
        return { rows: [{ id: entry.id, tags: entry.tags }] };
      }

      if (sql.startsWith("SELECT e.id AS entry_id, e.project_id, e.created_by_id")) {
        assert.match(sql, /FROM entries e LEFT JOIN entry_field_values v ON v\.entry_id = e\.id LEFT JOIN project_fields f ON f\.id = v\.field_id/);
        const entry = client.entries.find((e) => e.id === parameters[0]);
        if (!entry) {
          return { rows: [] };
        }
        const rows = client.entryValues
          .filter((v) => v.entry_id === entry.id)
          .map((v) => {
            const field = client.projectFields.find((f) => f.id === v.field_id);
            return {
              entry_id: entry.id,
              project_id: entry.project_id,
              created_by_id: entry.created_by_id,
              entry_name: entry.name,
              duration_minutes: entry.duration_minutes,
              occurred_at: entry.occurred_at,
              tags: entry.tags,
              due_at: entry.due_at,
              completed_at: entry.completed_at,
              entry_created_at: entry.created_at,
              entry_updated_at: entry.updated_at,
              value_id: v.id,
              field_id: v.field_id,
              field_name: field ? field.name : null,
              field_type: field ? field.field_type : null,
              value_text: v.value_text,
              value_number: v.value_number,
              value_date: v.value_date,
            };
          });
        if (rows.length === 0) {
          return {
            rows: [
              {
                entry_id: entry.id,
                project_id: entry.project_id,
                created_by_id: entry.created_by_id,
                entry_name: entry.name,
                duration_minutes: entry.duration_minutes,
                occurred_at: entry.occurred_at,
                tags: entry.tags,
                due_at: entry.due_at,
                completed_at: entry.completed_at,
                entry_created_at: entry.created_at,
                entry_updated_at: entry.updated_at,
                value_id: null,
                field_id: null,
                field_name: null,
                field_type: null,
                value_text: null,
                value_number: null,
                value_date: null,
              },
            ],
          };
        }
        return { rows };
      }

      throw new Error(`Unexpected SQL in automation rules transaction test: ${sql}`);
    },
    release() {
      client.released += 1;
    },
  };
  return client;
}

function makeField(overrides = {}) {
  return {
    id: FIELD_ID,
    project_id: PROJECT_ID,
    name: "Status",
    field_type: "short_text",
    formula: null,
    position: 0,
    required: false,
    archived_at: null,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    used_by_entries: false,
    ...overrides,
  };
}

function makeRule(overrides = {}) {
  return {
    id: uuid(70),
    project_id: PROJECT_ID,
    owner_id: OWNER_ID,
    name: "Auto-complete",
    condition_field_id: FIELD_ID,
    condition_operator: "equals",
    condition_value: "completed",
    action_type: "add_tag",
    action_value: "completed",
    enabled: true,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function entryData(overrides = {}) {
  return {
    name: "Lab Session 3",
    durationMinutes: 45,
    tags: ["research"],
    values: [{ fieldId: FIELD_ID, value: "completed" }],
    newFields: [],
    checklist: [],
    references: [],
    linkedEntryIds: [],
    ...overrides,
  };
}

async function withTransactionClient(t, client) {
  const connect = t.mock.method(db, "connect", async () => client);
  t.after(() => connect.mock.restore());
}

test("matching rule adds its tag to the created entry inside the transaction", async (t) => {
  const client = createClient({
    fields: [makeField()],
    rules: [makeRule()],
  });
  await withTransactionClient(t, client);

  const entry = await createEntryService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    data: entryData(),
  });

  assert.equal(entry.id, ENTRY_ID);
  assert.deepEqual(entry.tags, ["research", "completed"]);
  assert.equal(client.tagUpdates.length, 1);
  assert.deepEqual(client.tagUpdates[0].tags, ["research", "completed"]);
  assert.ok(client.queries.some((q) => q.sql === "BEGIN"));
  assert.ok(client.queries.some((q) => q.sql === "COMMIT"));
  assert.equal(client.released, 1);
});

test("enabled automation rules are queried exactly once per entry creation", async (t) => {
  const client = createClient({
    fields: [makeField()],
    rules: [makeRule(), makeRule({ id: uuid(71), action_value: "alpha" })],
  });
  await withTransactionClient(t, client);

  await createEntryService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    data: entryData(),
  });

  const ruleQueries = client.queries.filter((q) =>
    q.sql.startsWith("SELECT id, owner_id, project_id, name, condition_field_id"),
  );
  assert.equal(ruleQueries.length, 1);
  assert.deepEqual(ruleQueries[0].parameters, [PROJECT_ID]);
});

test("multiple matching rules produce a single tag update containing all tags", async (t) => {
  const client = createClient({
    fields: [makeField()],
    rules: [
      makeRule(),
      makeRule({ id: uuid(71), name: "Alpha tag", action_value: "alpha" }),
      makeRule({ id: uuid(72), name: "Beta tag", action_value: "beta" }),
    ],
  });
  await withTransactionClient(t, client);

  const entry = await createEntryService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    data: entryData(),
  });

  assert.equal(client.tagUpdates.length, 1);
  assert.deepEqual(client.tagUpdates[0].tags, ["research", "completed", "alpha", "beta"]);
  assert.deepEqual(entry.tags, ["research", "completed", "alpha", "beta"]);
});

test("non-matching rule leaves entry tags unchanged with no tag update", async (t) => {
  const client = createClient({
    fields: [makeField()],
    rules: [makeRule({ condition_value: "in-progress" })],
  });
  await withTransactionClient(t, client);

  const entry = await createEntryService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    data: entryData(),
  });

  assert.deepEqual(entry.tags, ["research"]);
  assert.equal(client.tagUpdates.length, 0);
  assert.ok(client.queries.some((q) => q.sql === "COMMIT"));
});

test("disabled rules are filtered out by the query and never applied", async (t) => {
  const client = createClient({
    fields: [makeField()],
    rules: [makeRule({ enabled: false })],
  });
  await withTransactionClient(t, client);

  const entry = await createEntryService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    data: entryData(),
  });

  assert.deepEqual(entry.tags, ["research"]);
  assert.equal(client.tagUpdates.length, 0);
  const ruleQueries = client.queries.filter((q) =>
    q.sql.startsWith("SELECT id, owner_id, project_id, name, condition_field_id"),
  );
  assert.equal(ruleQueries.length, 1);
});

test("entry creation without any rules keeps existing behaviour intact", async (t) => {
  const client = createClient({
    fields: [makeField()],
    rules: [],
  });
  await withTransactionClient(t, client);

  const entry = await createEntryService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    data: entryData(),
  });

  assert.equal(entry.id, ENTRY_ID);
  assert.deepEqual(entry.values.map((v) => [v.fieldId, v.value]), [
    [FIELD_ID, "completed"],
  ]);
  assert.equal(client.entries.length, 1);
  assert.equal(client.entryValues.length, 1);
  assert.equal(client.tagUpdates.length, 0);
  assert.ok(client.queries.some((q) => q.sql === "COMMIT"));
  assert.equal(client.released, 1);
});

test("100 enabled rules with few matches load once and produce a single tag update", async (t) => {
  const performance = require("node:perf_hooks").performance;

  const rules = [];
  for (let index = 0; index < 100; index += 1) {
    const matches = index < 3;
    rules.push(
      makeRule({
        id: uuid(100 + index),
        name: `Rule ${index}`,
        condition_value: matches ? "completed" : "in-progress",
        action_value: `auto-${index + 1}`,
      }),
    );
  }

  const client = createClient({
    fields: [makeField()],
    rules,
  });
  await withTransactionClient(t, client);

  const startedAt = performance.now();
  const entry = await createEntryService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    data: entryData(),
  });
  const elapsedMs = performance.now() - startedAt;
  console.log(`100-rule entry creation elapsed: ${elapsedMs.toFixed(2)}ms (informational only)`);

  const ruleQueries = client.queries.filter((q) =>
    q.sql.startsWith("SELECT id, owner_id, project_id, name, condition_field_id"),
  );
  assert.equal(ruleQueries.length, 1);

  assert.equal(client.tagUpdates.length, 1);
  assert.deepEqual(client.tagUpdates[0].tags, [
    "research",
    "auto-1",
    "auto-2",
    "auto-3",
  ]);
  assert.deepEqual(entry.tags, ["research", "auto-1", "auto-2", "auto-3"]);
});

test("automation tag update failure rolls back the whole entry creation", async (t) => {
  const client = createClient({
    fields: [makeField()],
    rules: [makeRule()],
    failOn: (sql) => sql.startsWith("UPDATE entries SET tags = $2, updated_at = NOW()"),
  });
  await withTransactionClient(t, client);

  await assert.rejects(
    createEntryService({
      projectId: PROJECT_ID,
      userId: OWNER_ID,
      data: entryData(),
    }),
    { code: "23505" },
  );

  const lastQuery = client.queries[client.queries.length - 1];
  assert.equal(lastQuery.sql, "ROLLBACK");
  assert.ok(!client.queries.some((q) => q.sql === "COMMIT"));
  assert.equal(client.entries.length, 0);
  assert.equal(client.entryValues.length, 0);
  assert.equal(client.released, 1);
});
