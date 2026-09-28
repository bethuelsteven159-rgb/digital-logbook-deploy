const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const db = require("../db");
const dashboardRouter = require("../routes/dashboard");

const USER_ID = "11111111-1111-4111-8111-111111111111";

async function withServer({ user = { id: USER_ID }, query }, run) {
  const originalQuery = db.query;
  db.query = query;

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use("/api/dashboard", dashboardRouter);
  app.use((error, _req, res, _next) => {
    res.status(500).json({ success: false, message: error.message });
  });

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    db.query = originalQuery;
  }
}

async function readJson(response) {
  return response.json();
}

test("GET /api/dashboard returns summary, recent activity, and stored layout", async () => {
  const calls = [];
  await withServer({
    query: async (sql, params) => {
      calls.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      if (calls.length === 1) {
        return {
          rows: [{
            projects_created: 5,
            active_projects: 3,
            projects_archived: 2,
            total_entries: 8,
            logged_minutes: 240,
            this_week_minutes: 60,
            average_session_minutes: 30,
          }],
        };
      }
      if (calls.length === 2) {
        return {
          rows: [{
            entry_id: "entry-1",
            project_id: "project-1",
            entry_name: "Planning",
            duration_minutes: 45,
            occurred_at: "2026-09-28T10:00:00.000Z",
            project_name: "Project A",
          }],
        };
      }
      return {
        rows: [{
          dashboard_layout: [{ id: "hours", statisticId: "loggedMinutes" }],
        }],
      };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`);
    const body = await readJson(response);

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.deepEqual(body.data.stats, {
      loggedMinutes: 240,
      activeProjects: 3,
      totalEntries: 8,
      thisWeekMinutes: 60,
    });
    assert.deepEqual(body.data.overview, {
      projectsCreated: 5,
      projectsArchived: 2,
      entriesLogged: 8,
      averageSessionMinutes: 30,
    });
    assert.deepEqual(body.data.layout, [{ id: "hours", statisticId: "loggedMinutes" }]);
    assert.deepEqual(body.data.recentActivity, [{
      entryId: "entry-1",
      projectId: "project-1",
      entryName: "Planning",
      projectName: "Project A",
      durationMinutes: 45,
      occurredAt: "2026-09-28T10:00:00.000Z",
    }]);
    assert.equal(calls.length, 3);
    assert.deepEqual(calls.map((call) => call.params), [[USER_ID], [USER_ID], [USER_ID]]);
  });
});

test("GET /api/dashboard supports an authenticated user id stored in sub", async () => {
  let queryCount = 0;
  await withServer({
    user: { sub: USER_ID },
    query: async () => {
      queryCount += 1;
      if (queryCount === 1) return { rows: [{}] };
      if (queryCount === 2) return { rows: [] };
      return { rows: [{ dashboard_layout: null }] };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`);
    assert.equal(response.status, 200);
    const body = await readJson(response);
    assert.equal(body.data.layout, null);
  });
});

test("dashboard routes reject requests without an authenticated user id", async () => {
  await withServer({
    user: {},
    query: async () => {
      throw new Error("Database should not be called");
    },
  }, async (baseUrl) => {
    const getResponse = await fetch(`${baseUrl}/api/dashboard`);
    assert.equal(getResponse.status, 401);

    const putResponse = await fetch(`${baseUrl}/api/dashboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: [] }),
    });
    assert.equal(putResponse.status, 401);
  });
});

test("PUT /api/dashboard persists and returns a valid layout", async () => {
  const layout = [
    { id: "hours", statisticId: "loggedMinutes" },
    { id: "entries", statisticId: "totalEntries" },
  ];
  let captured;

  await withServer({
    query: async (sql, params) => {
      captured = { sql: sql.replace(/\s+/g, " ").trim(), params };
      return { rows: [{ dashboard_layout: layout }] };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout }),
    });
    const body = await readJson(response);

    assert.equal(response.status, 200);
    assert.deepEqual(body.data.layout, layout);
    assert.match(captured.sql, /UPDATE users SET dashboard_layout = \$1::jsonb, updated_at = NOW\(\) WHERE id = \$2 RETURNING dashboard_layout/);
    assert.deepEqual(captured.params, [JSON.stringify(layout), USER_ID]);
  });
});

test("PUT /api/dashboard accepts an empty layout", async () => {
  await withServer({
    query: async (_sql, params) => {
      assert.equal(params[0], "[]");
      return { rows: [{ dashboard_layout: [] }] };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: [] }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await readJson(response)).data.layout, []);
  });
});

test("PUT /api/dashboard rejects a non-array layout", async () => {
  await withServer({ query: async () => assert.fail("Database should not be called") }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: {} }),
    });
    assert.equal(response.status, 400);
    assert.equal((await readJson(response)).message, "Dashboard layout must be an array");
  });
});

test("PUT /api/dashboard rejects more than 12 widgets", async () => {
  const layout = Array.from({ length: 13 }, (_, index) => ({
    id: `widget-${index}`,
    statisticId: "loggedMinutes",
  }));
  await withServer({ query: async () => assert.fail("Database should not be called") }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout }),
    });
    assert.equal(response.status, 400);
    assert.equal((await readJson(response)).message, "Dashboard layout cannot contain more than 12 widgets");
  });
});

test("PUT /api/dashboard rejects duplicate widget ids", async () => {
  const layout = [
    { id: "same", statisticId: "loggedMinutes" },
    { id: "same", statisticId: "activeProjects" },
  ];
  await withServer({ query: async () => assert.fail("Database should not be called") }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout }),
    });
    assert.equal(response.status, 400);
    assert.equal((await readJson(response)).message, "Dashboard widget ids must be unique");
  });
});

test("PUT /api/dashboard rejects unsupported statistics", async () => {
  const layout = [{ id: "legacy", statisticId: "unsupported" }];
  await withServer({ query: async () => assert.fail("Database should not be called") }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout }),
    });
    assert.equal(response.status, 400);
    assert.equal((await readJson(response)).message, "Dashboard widget contains an unsupported statistic");
  });
});

test("PUT /api/dashboard returns 404 when the authenticated user no longer exists", async () => {
  await withServer({ query: async () => ({ rows: [] }) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: [] }),
    });
    assert.equal(response.status, 404);
    assert.equal((await readJson(response)).message, "User not found");
  });
});

test("database errors are passed to the API error handler", async () => {
  await withServer({
    query: async () => {
      throw new Error("database offline");
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/dashboard`);
    assert.equal(response.status, 500);
    assert.equal((await readJson(response)).message, "database offline");
  });
});
