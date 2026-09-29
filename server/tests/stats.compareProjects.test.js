const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const stats = require("../routes/stats");

/* ---------- helpers (same pattern as stats.coverage.test.js) ---------- */

async function withDb(mock, fn) {
  const originalQuery = db.query;
  db.query = mock;
  try {
    return await fn();
  } finally {
    db.query = originalQuery;
  }
}

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

const USER = { id: "user-1" };

/**
 * db mock for the compare-projects route.
 * - ownership queries (FROM projects): a project is owned when the params
 *   contain both its id and the user id
 * - summary queries (FROM entries): answered from `summaries`, keyed by project id
 */
function compareDb({ owned = {}, summaries = {}, seen = [] } = {}) {
  return async (sql, params) => {
    seen.push({ sql, params });
    if (sql.includes("FROM projects")) {
      const match = Object.entries(owned).find(
        ([projectId, ownerId]) => params.includes(projectId) && params.includes(ownerId),
      );
      return { rows: match ? [{ id: match[0] }] : [] };
    }
    if (sql.includes("FROM entries")) {
      return { rows: [summaries[params[0]]] };
    }
    return { rows: [] };
  };
}

const summaryA = {
  logged_minutes: 120,
  total_entries: 4,
  avg_duration_minutes: 30,
  last_activity: "2026-09-01T10:00:00.000Z",
};
const summaryB = {
  logged_minutes: 45,
  total_entries: 3,
  avg_duration_minutes: 15,
  last_activity: "2026-09-10T08:30:00.000Z",
};

/* ---------- tests ---------- */

test("compare-projects returns both project summaries", async () => {
  const mock = compareDb({
    owned: { p1: "user-1", p2: "user-1" },
    summaries: { p1: summaryA, p2: summaryB },
  });

  await withDb(mock, () =>
    withServer(USER, async (base) => {
      const { status, body } = await get(`${base}/compare-projects?projectId=p1&otherProjectId=p2`);
      assert.equal(status, 200);
      assert.deepEqual(body, {
        projectA: { projectId: "p1", ...summaryA },
        projectB: { projectId: "p2", ...summaryB },
      });
    }),
  );
});

test("compare-projects handles a project with no entries", async () => {
  const empty = {
    logged_minutes: 0,
    total_entries: 0,
    avg_duration_minutes: 0,
    last_activity: null,
  };
  const mock = compareDb({
    owned: { p1: "user-1", p2: "user-1" },
    summaries: { p1: empty, p2: summaryB },
  });

  await withDb(mock, () =>
    withServer(USER, async (base) => {
      const { status, body } = await get(`${base}/compare-projects?projectId=p1&otherProjectId=p2`);
      assert.equal(status, 200);
      assert.equal(body.projectA.total_entries, 0);
      assert.equal(body.projectA.logged_minutes, 0);
      assert.equal(body.projectA.last_activity, null);
      assert.equal(body.projectB.total_entries, 3);
    }),
  );
});

test("compare-projects summary query excludes archived entries", async () => {
  const seen = [];
  const mock = compareDb({
    owned: { p1: "user-1", p2: "user-1" },
    summaries: { p1: summaryA, p2: summaryB },
    seen,
  });

  await withDb(mock, () =>
    withServer(USER, async (base) => {
      await get(`${base}/compare-projects?projectId=p1&otherProjectId=p2`);
    }),
  );

  const summaryQueries = seen.filter((q) => q.sql.includes("FROM entries"));
  assert.equal(summaryQueries.length, 2);
  for (const q of summaryQueries) {
    assert.match(q.sql, /archived_at IS NULL/);
  }
});

test("compare-projects requires projectId", async () => {
  await withDb(compareDb(), () =>
    withServer(USER, async (base) => {
      const { status, body } = await get(`${base}/compare-projects?otherProjectId=p2`);
      assert.equal(status, 400);
      assert.match(body.error, /required/);
    }),
  );
});

test("compare-projects requires otherProjectId", async () => {
  await withDb(compareDb(), () =>
    withServer(USER, async (base) => {
      const { status, body } = await get(`${base}/compare-projects?projectId=p1`);
      assert.equal(status, 400);
      assert.match(body.error, /required/);
    }),
  );
});

test("compare-projects rejects comparing a project with itself", async () => {
  await withDb(compareDb(), () =>
    withServer(USER, async (base) => {
      const { status, body } = await get(`${base}/compare-projects?projectId=p1&otherProjectId=p1`);
      assert.equal(status, 400);
      assert.match(body.error, /itself/);
    }),
  );
});

test("compare-projects 404s when the first project is not owned by the user", async () => {
  const mock = compareDb({
    owned: { p1: "someone-else", p2: "user-1" },
    summaries: { p2: summaryB },
  });

  await withDb(mock, () =>
    withServer(USER, async (base) => {
      const { status, body } = await get(`${base}/compare-projects?projectId=p1&otherProjectId=p2`);
      assert.equal(status, 404);
      assert.match(body.error, /First project/);
    }),
  );
});

test("compare-projects 404s when the second project is not owned by the user", async () => {
  const mock = compareDb({
    owned: { p1: "user-1", p2: "someone-else" },
    summaries: { p1: summaryA },
  });

  await withDb(mock, () =>
    withServer(USER, async (base) => {
      const { status, body } = await get(`${base}/compare-projects?projectId=p1&otherProjectId=p2`);
      assert.equal(status, 404);
      assert.match(body.error, /Second project/);
    }),
  );
});

test("compare-projects rejects unauthenticated requests with 401 and runs no queries", async () => {
  const seen = [];
  const mock = compareDb({
    owned: { p1: "user-1", p2: "user-1" },
    summaries: { p1: summaryA, p2: summaryB },
    seen,
  });

  await withDb(mock, () =>
    withServer(null, async (base) => {
      const { status, body } = await get(`${base}/compare-projects?projectId=p1&otherProjectId=p2`);
      assert.equal(status, 401);
      assert.equal(body.error, "Authentication required");
    }),
  );

  assert.equal(seen.length, 0);
});

test("compare-projects returns 500 with the error message when the query fails", async () => {
  await withDb(
    async () => {
      throw new Error("db exploded");
    },
    () =>
      withServer(USER, async (base) => {
        const { status, body } = await get(`${base}/compare-projects?projectId=p1&otherProjectId=p2`);
        assert.equal(status, 500);
        assert.equal(body.error, "db exploded");
      }),
  );
});

test("compare-projects falls back to a generic message when the error has none", async () => {
  await withDb(
    async () => {
      throw new Error("");
    },
    () =>
      withServer(USER, async (base) => {
        const { status, body } = await get(`${base}/compare-projects?projectId=p1&otherProjectId=p2`);
        assert.equal(status, 500);
        assert.equal(body.error, "Failed to compare projects");
      }),
  );
});