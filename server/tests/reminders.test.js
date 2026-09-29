const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const reminders = require("../routes/reminders");

/* ---------- helpers ---------- */

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
  app.use("/api/reminders", reminders);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/reminders`;

  // the route logs errors on purpose; keep test output clean
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

const row = (overrides) => ({
  id: "e1",
  project_id: "p1",
  project_name: "Cyber Security",
  name: "Lab report",
  due_at: "2026-09-29T10:00:00.000Z",
  bucket: "dueTomorrow",
  bucket_total: 1,
  ...overrides,
});

/* ---------- tests ---------- */

test("reminders route rejects unauthenticated requests", async () => {
  await withServer(null, async (base) => {
    const { status, body } = await get(base);
    assert.equal(status, 401);
    assert.deepEqual(body, { error: "Authentication required" });
  });
});

test("reminders route rejects an invalid timezone without querying", async () => {
  let queried = false;

  await withDb(
    async () => {
      queried = true;
      return { rows: [] };
    },
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(`${base}?timezone=Not/AZone`);
        assert.equal(status, 400);
        assert.deepEqual(body, { error: "Invalid timezone" });
        assert.equal(queried, false);
      }),
  );
});

test("reminders route queries for the user in Johannesburg time by default", async () => {
  let received;

  await withDb(
    async (_sql, params) => {
      received = params;
      return { rows: [] };
    },
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(base);
        assert.equal(status, 200);
        assert.equal(body.timezone, "Africa/Johannesburg");
        assert.deepEqual(received, ["u1", "Africa/Johannesburg", 50]);
      }),
  );
});

test("reminders route honours a valid timezone query parameter", async () => {
  let received;

  await withDb(
    async (_sql, params) => {
      received = params;
      return { rows: [] };
    },
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(`${base}?timezone=UTC`);
        assert.equal(status, 200);
        assert.equal(body.timezone, "UTC");
        assert.equal(received[1], "UTC");
      }),
  );
});

test("reminders route returns empty buckets when nothing is due", async () => {
  await withDb(
    async () => ({ rows: [] }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(base);
        assert.equal(status, 200);
        assert.deepEqual(body.counts, {
          overdue: 0,
          dueToday: 0,
          dueTomorrow: 0,
        });
        assert.deepEqual(body.overdue, []);
        assert.deepEqual(body.dueToday, []);
        assert.deepEqual(body.dueTomorrow, []);
        assert.ok(!Number.isNaN(Date.parse(body.generatedAt)));
      }),
  );
});

test("reminders route groups rows into buckets and maps fields", async () => {
  const rows = [
    row({ id: "a", name: "Old task", bucket: "overdue", bucket_total: 1 }),
    row({ id: "b", name: "Today task", bucket: "dueToday", bucket_total: 1 }),
    row({ id: "c", name: "Tomorrow 1", bucket: "dueTomorrow", bucket_total: 2 }),
    row({ id: "d", name: "Tomorrow 2", bucket: "dueTomorrow", bucket_total: 2 }),
  ];

  await withDb(
    async () => ({ rows }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(base);
        assert.equal(status, 200);
        assert.deepEqual(body.counts, {
          overdue: 1,
          dueToday: 1,
          dueTomorrow: 2,
        });
        assert.deepEqual(
          body.dueTomorrow.map((r) => r.id),
          ["c", "d"],
        );
        assert.deepEqual(body.overdue[0], {
          id: "a",
          projectId: "p1",
          projectName: "Cyber Security",
          name: "Old task",
          dueAt: "2026-09-29T10:00:00.000Z",
        });
      }),
  );
});

test("reminders counts report the full total even when the list is capped", async () => {
  // the SQL returns at most 50 rows per bucket but reports the real total on each
  const rows = [row({ bucket: "overdue", bucket_total: 61 })];

  await withDb(
    async () => ({ rows }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { body } = await get(base);
        assert.equal(body.overdue.length, 1);
        assert.equal(body.counts.overdue, 61);
      }),
  );
});

test("reminders route returns 500 when the query fails", async () => {
  await withDb(
    async () => {
      throw new Error("db down");
    },
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(base);
        assert.equal(status, 500);
        assert.deepEqual(body, { error: "Failed to load reminders" });
      }),
  );
});

test("reminders SQL keeps its exclusion guards", () => {
  // Mocked tests cannot execute SQL, so pin the rules that keep
  // completed, undated and archived-project entries out of reminders.
  const sql = reminders.REMINDERS_SQL;
  assert.match(sql, /e\.completed_at IS NULL/);
  assert.match(sql, /e\.due_at IS NOT NULL/);
  assert.match(sql, /p\.archived_at IS NULL/);
  assert.match(sql, /e\.created_by_id = \$1/);
});
