const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const stats = require("../routes/stats");

/* ---------- helpers (same pattern as stats.compareProjects.test.js) ---------- */

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
 * db mock for the activity route.
 * - daily query (GROUP BY day): answered from `daily`
 * - weekday query (GROUP BY weekday): answered from `weekdayRows`
 * - project query (FROM projects): answered from `projectRows`
 */
function activityDb({ daily = [], weekdayRows = [], projectRows = [], seen = [] } = {}) {
  return async (sql, params) => {
    seen.push({ sql, params });

    if (sql.includes("GROUP BY day")) {
      return { rows: daily };
    }

    if (sql.includes("GROUP BY weekday")) {
      return { rows: weekdayRows };
    }

    if (sql.includes("FROM projects p")) {
      return { rows: projectRows };
    }

    return { rows: [] };
  };
}

/* ---------- tests ---------- */

test("activity route rejects unauthenticated requests", async () => {
  await withServer(null, async (base) => {
    const { status, body } = await get(`${base}/activity`);
    assert.equal(status, 401);
    assert.deepEqual(body, { error: "Authentication required" });
  });
});

test("activity route rejects an invalid timezone without querying", async () => {
  let queried = false;

  await withDb(
    async () => {
      queried = true;
      return { rows: [] };
    },
    () =>
      withServer(USER, async (base) => {
        const { status, body } = await get(`${base}/activity?timezone=Nope/Nope`);
        assert.equal(status, 400);
        assert.deepEqual(body, { error: "Invalid timezone" });
        assert.equal(queried, false);
      }),
  );
});

test("activity route defaults to 30 days in Johannesburg time", async () => {
  const seen = [];

  await withDb(
    activityDb({ seen }),
    () =>
      withServer(USER, async (base) => {
        const { status, body } = await get(`${base}/activity`);
        assert.equal(status, 200);
        assert.deepEqual(body.range, { days: 30, timezone: "Africa/Johannesburg" });

        const dailyCall = seen.find((call) => call.sql.includes("GROUP BY day"));
        assert.deepEqual(dailyCall.params, ["user-1", "Africa/Johannesburg", 30]);
      }),
  );
});

test("activity route clamps the days parameter into 1..365", async () => {
  const seen = [];

  await withDb(
    activityDb({ seen }),
    () =>
      withServer(USER, async (base) => {
        await get(`${base}/activity?days=9999`);
        await get(`${base}/activity?days=0`);
        await get(`${base}/activity?days=banana`);

        const dailyCalls = seen.filter((call) => call.sql.includes("GROUP BY day"));
        assert.deepEqual(dailyCalls[0].params[2], 365);
        assert.deepEqual(dailyCalls[1].params[2], 1);
        assert.deepEqual(dailyCalls[2].params[2], 30);
      }),
  );
});

test("activity route maps daily, weekday and project rows", async () => {
  await withDb(
    activityDb({
      daily: [
        { day: "2026-10-05", minutes: 95, entries: 2 },
        { day: "2026-10-06", minutes: 45, entries: 1 },
      ],
      weekdayRows: [
        { weekday: 1, minutes: 300, entries: 8 },
        { weekday: 3, minutes: 120, entries: 4 },
      ],
      projectRows: [
        { id: "p1", name: "Cyber Security", minutes: 500, entries: 12 },
        { id: "p2", name: "Thesis", minutes: 60, entries: 2 },
      ],
    }),
    () =>
      withServer(USER, async (base) => {
        const { status, body } = await get(`${base}/activity?days=7&timezone=UTC`);
        assert.equal(status, 200);
        assert.deepEqual(body.range, { days: 7, timezone: "UTC" });

        assert.deepEqual(body.daily, [
          { date: "2026-10-05", minutes: 95, entries: 2 },
          { date: "2026-10-06", minutes: 45, entries: 1 },
        ]);

        // all seven weekdays come back, zero-filled
        assert.equal(body.weekdays.length, 7);
        assert.deepEqual(body.weekdays[0], { weekday: 0, label: "Sun", minutes: 0, entries: 0 });
        assert.deepEqual(body.weekdays[1], { weekday: 1, label: "Mon", minutes: 300, entries: 8 });
        assert.deepEqual(body.weekdays[3], { weekday: 3, label: "Wed", minutes: 120, entries: 4 });

        assert.deepEqual(body.projects[0], {
          projectId: "p1",
          name: "Cyber Security",
          minutes: 500,
          entries: 12,
        });

        assert.deepEqual(body.totals, { minutes: 140, entries: 3 });
      }),
  );
});

test("activity route returns an empty overview for a fresh user", async () => {
  await withDb(
    activityDb({}),
    () =>
      withServer(USER, async (base) => {
        const { status, body } = await get(`${base}/activity`);
        assert.equal(status, 200);
        assert.deepEqual(body.daily, []);
        assert.equal(body.weekdays.length, 7);
        assert.deepEqual(body.projects, []);
        assert.deepEqual(body.totals, { minutes: 0, entries: 0 });
      }),
  );
});

test("activity route returns 500 when a query fails", async () => {
  await withDb(
    async () => {
      throw new Error("db down");
    },
    () =>
      withServer(USER, async (base) => {
        const { status, body } = await get(`${base}/activity`);
        assert.equal(status, 500);
        assert.deepEqual(body, { error: "Failed to calculate activity statistics" });
      }),
  );
});

test("activity SQL keeps its exclusion guards", () => {
  // Mocked tests cannot execute SQL, so pin the rules that keep archived
  // rows out of the charts and scope every query to the caller.
  assert.match(stats.DAILY_ACTIVITY_SQL, /created_by_id = \$1/);
  assert.match(stats.DAILY_ACTIVITY_SQL, /archived_at IS NULL/);
  assert.match(stats.WEEKDAY_ACTIVITY_SQL, /created_by_id = \$1/);
  assert.match(stats.PROJECT_ACTIVITY_SQL, /p\.owner_id = \$1/);
  assert.match(stats.PROJECT_ACTIVITY_SQL, /p\.archived_at IS NULL/);
});
