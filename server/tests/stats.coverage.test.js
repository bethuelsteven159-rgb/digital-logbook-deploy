const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const stats = require("../routes/stats");

/* ---------- helpers ---------- */

const numberField = { id: "f-num", name: "Score", field_type: "number" };
const numberField2 = { id: "f-num2", name: "Actual", field_type: "number" };
const textField = { id: "f-text", name: "Difficulty", field_type: "short_text" };
const dateField = { id: "f-date", name: "Reviewed", field_type: "date" };
const computedField = { id: "f-comp", name: "Ratio", field_type: "computed" };

/**
 * Swap db.query for the duration of `fn`, restoring it afterwards
 * (same pattern the existing tests use).
 */
async function withDb(mock, fn) {
  const originalQuery = db.query;
  db.query = mock;
  try {
    return await fn();
  } finally {
    db.query = originalQuery;
  }
}

/**
 * db mock that answers the three query shapes the /projects/:projectId
 * route makes: project ownership, field lookup, then the statistic query.
 */
function routeDb({ project = { id: "p1" }, fields = [], statRows = [] } = {}) {
  return async (sql, params) => {
    if (sql.includes("FROM projects")) {
      return { rows: project ? [project] : [] };
    }
    if (sql.includes("FROM project_fields")) {
      const found = fields.find((f) => f.id === params[0]);
      return { rows: found ? [found] : [] };
    }
    return { rows: statRows };
  };
}

/** Run the stats router in-process and call it with fetch (no extra deps). */
async function withServer(user, fn) {
  const app = express();
  app.use((req, _res, next) => {
    if (user) req.user = user;
    next();
  });
  app.use("/api/stats", stats);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/stats`;

  // the router logs errors on purpose; keep test output clean
  const originalError = console.error;
  console.error = () => {};

  try {
    return await fn(base);
  } finally {
    console.error = originalError;
    await new Promise((resolve) => server.close(resolve));
  }
}

async function get(url) {
  const res = await fetch(url);
  return { status: res.status, body: await res.json() };
}

/* ---------- getTotalStatistics: non-numeric branch (line 77-105) ---------- */

test("total statistics returns a plain count for non-numeric fields", async () => {
  await withDb(
    async () => ({ rows: [{ count: "4" }] }),
    async () => {
      const result = await stats.getTotalStatistics("p1", textField);

      assert.deepEqual(result, {
        operation: "total",
        field: { id: "f-text", name: "Difficulty", type: "short_text" },
        count: 4,
      });
      assert.equal("sum" in result, false);
    },
  );
});

test("total statistics returns a plain count for date fields", async () => {
  await withDb(
    async () => ({ rows: [{ count: 0 }] }),
    async () => {
      const result = await stats.getTotalStatistics("p1", dateField);
      assert.equal(result.count, 0);
      assert.equal(result.field.type, "date");
    },
  );
});

/* ---------- getPlotStatistics: guard + non-numeric branch (249-250, 283-313) ---------- */

test("plot statistics rejects field types that cannot be plotted", async () => {
  await assert.rejects(() => stats.getPlotStatistics("p1", computedField), {
    statusCode: 400,
    message: "This field type cannot be plotted",
  });
});

test("plot statistics groups text fields into value counts", async () => {
  await withDb(
    async () => ({
      rows: [
        { label: "Hard", value: 3 },
        { label: "Easy", value: 1 },
      ],
    }),
    async () => {
      const result = await stats.getPlotStatistics("p1", textField);

      assert.deepEqual(result, {
        operation: "plot",
        chartType: "bar",
        field: { id: "f-text", name: "Difficulty", type: "short_text" },
        data: [
          { label: "Hard", value: 3 },
          { label: "Easy", value: 1 },
        ],
      });
    },
  );
});

test("plot statistics works for date fields", async () => {
  await withDb(
    async () => ({ rows: [{ label: "2026-09-01", value: "2" }] }),
    async () => {
      const result = await stats.getPlotStatistics("p1", dateField);
      assert.deepEqual(result.data, [{ label: "2026-09-01", value: 2 }]);
    },
  );
});

test("plot statistics returns an empty data array when there are no values", async () => {
  await withDb(
    async () => ({ rows: [] }),
    async () => {
      const result = await stats.getPlotStatistics("p1", textField);
      assert.deepEqual(result.data, []);
    },
  );
});

/* ---------- GET /dashboard (322-350) ---------- */

test("dashboard route rejects unauthenticated requests", async () => {
  await withServer(null, async (base) => {
    const { status, body } = await get(`${base}/dashboard`);
    assert.equal(status, 401);
    assert.deepEqual(body, { error: "Authentication required" });
  });
});

test("dashboard route returns the user's totals", async () => {
  const row = { total_hours: "2.5", active_projects: "3", total_entries: "9" };
  let receivedParams;

  await withDb(
    async (_sql, params) => {
      receivedParams = params;
      return { rows: [row] };
    },
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(`${base}/dashboard`);
        assert.equal(status, 200);
        assert.deepEqual(body, row);
        assert.deepEqual(receivedParams, ["u1"]);
      }),
  );
});

test("dashboard route returns 500 when the query fails", async () => {
  await withDb(
    async () => {
      throw new Error("db down");
    },
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(`${base}/dashboard`);
        assert.equal(status, 500);
        assert.deepEqual(body, {
          error: "Failed to calculate dashboard statistics",
        });
      }),
  );
});

/* ---------- GET /projects/:projectId (365-459) ---------- */

test("project stats route rejects unauthenticated requests", async () => {
  await withServer(null, async (base) => {
    const { status, body } = await get(`${base}/projects/p1?fieldId=f-num`);
    assert.equal(status, 401);
    assert.equal(body.error, "Authentication required");
  });
});

test("project stats route requires fieldId", async () => {
  await withServer({ id: "u1" }, async (base) => {
    const { status, body } = await get(`${base}/projects/p1`);
    assert.equal(status, 400);
    assert.equal(body.error, "fieldId is required");
  });
});

test("project stats route 404s when the project is not owned by the user", async () => {
  await withDb(routeDb({ project: null }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(`${base}/projects/p1?fieldId=f-num`);
      assert.equal(status, 404);
      assert.equal(body.error, "Project not found");
    }),
  );
});

test("project stats route 404s when the field does not exist", async () => {
  await withDb(routeDb({ fields: [] }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(`${base}/projects/p1?fieldId=missing`);
      assert.equal(status, 404);
      assert.equal(body.error, "Custom field not found");
    }),
  );
});

test("project stats route rejects computed fields", async () => {
  await withDb(routeDb({ fields: [computedField] }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(`${base}/projects/p1?fieldId=f-comp`);
      assert.equal(status, 400);
      assert.match(body.error, /computed fields are not supported/);
    }),
  );
});

test("project stats route defaults to the total operation", async () => {
  const statRows = [
    { count: 2, sum: "30", average: "15", minimum: "10", maximum: "20" },
  ];

  await withDb(routeDb({ fields: [numberField], statRows }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(`${base}/projects/p1?fieldId=f-num`);
      assert.equal(status, 200);
      assert.equal(body.operation, "total");
      assert.equal(body.sum, 30);
    }),
  );
});

test("project stats route runs the group operation", async () => {
  const statRows = [{ value: "Hard", count: 2 }];

  await withDb(routeDb({ fields: [textField], statRows }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(
        `${base}/projects/p1?fieldId=f-text&operation=group`,
      );
      assert.equal(status, 200);
      assert.equal(body.operation, "group");
      assert.deepEqual(body.groups, [{ value: "Hard", count: 2 }]);
    }),
  );
});

test("project stats route runs the plot operation", async () => {
  const statRows = [{ label: "Entry One", value: "10" }];

  await withDb(routeDb({ fields: [numberField], statRows }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(
        `${base}/projects/p1?fieldId=f-num&operation=plot`,
      );
      assert.equal(status, 200);
      assert.equal(body.operation, "plot");
      assert.deepEqual(body.data, [{ label: "Entry One", value: 10 }]);
    }),
  );
});

test("project stats route runs the compare operation", async () => {
  const statRows = [
    {
      entries_compared: 2,
      first_total: "30",
      second_total: "25",
      first_average: "15",
      second_average: "12.5",
    },
  ];

  await withDb(routeDb({ fields: [numberField, numberField2], statRows }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(
        `${base}/projects/p1?fieldId=f-num&operation=compare&compareFieldId=f-num2`,
      );
      assert.equal(status, 200);
      assert.equal(body.operation, "compare");
      assert.equal(body.entriesCompared, 2);
      assert.deepEqual(body.second, { total: 25, average: 12.5 });
    }),
  );
});

test("compare requires compareFieldId", async () => {
  await withDb(routeDb({ fields: [numberField] }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(
        `${base}/projects/p1?fieldId=f-num&operation=compare`,
      );
      assert.equal(status, 400);
      assert.equal(body.error, "compareFieldId is required for compare");
    }),
  );
});

test("compare rejects comparing a field with itself", async () => {
  await withDb(routeDb({ fields: [numberField] }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(
        `${base}/projects/p1?fieldId=f-num&operation=compare&compareFieldId=f-num`,
      );
      assert.equal(status, 400);
      assert.equal(body.error, "Compare requires two different custom fields");
    }),
  );
});

test("compare 404s when the second field does not exist", async () => {
  await withDb(routeDb({ fields: [numberField] }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(
        `${base}/projects/p1?fieldId=f-num&operation=compare&compareFieldId=nope`,
      );
      assert.equal(status, 404);
      assert.equal(body.error, "Custom field not found");
    }),
  );
});

test("compare rejects a computed second field", async () => {
  await withDb(routeDb({ fields: [numberField, computedField] }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(
        `${base}/projects/p1?fieldId=f-num&operation=compare&compareFieldId=f-comp`,
      );
      assert.equal(status, 400);
      assert.match(body.error, /computed fields are not supported/);
    }),
  );
});

test("project stats route rejects an unknown operation", async () => {
  await withDb(routeDb({ fields: [numberField] }), () =>
    withServer({ id: "u1" }, async (base) => {
      const { status, body } = await get(
        `${base}/projects/p1?fieldId=f-num&operation=median`,
      );
      assert.equal(status, 400);
      assert.equal(
        body.error,
        "Invalid operation. Use total, group, compare or plot",
      );
    }),
  );
});

test("project stats route returns 500 with the error message on unexpected failures", async () => {
  await withDb(
    async () => {
      throw new Error("connection reset");
    },
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(`${base}/projects/p1?fieldId=f-num`);
        assert.equal(status, 500);
        assert.equal(body.error, "connection reset");
      }),
  );
});

test("project stats route falls back to a generic message when the error has none", async () => {
  await withDb(
    async () => {
      throw new Error("");
    },
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(`${base}/projects/p1?fieldId=f-num`);
        assert.equal(status, 500);
        assert.equal(body.error, "Failed to calculate statistics");
      }),
  );
});
