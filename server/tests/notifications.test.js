const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const notifications = require("../routes/notifications");

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
  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) req.user = user;
    next();
  });
  app.use("/api/notifications", notifications);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/notifications`;

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

async function post(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

/**
 * db mock for the notifications route.
 * Queries are routed by SQL fingerprint so each source query can be
 * answered independently.
 */
function notificationsDb({
  due = [],
  checklist = [],
  pending = [],
  ending = [],
  stale = [],
  weekly = [{ minutes: 0, entries: 0, completed: 0, projects: 0 }],
  state = [],
  seen = [],
  failOn = null,
} = {}) {
  return async (sql, params) => {
    seen.push({ sql, params });

    if (failOn && sql.includes(failOn)) {
      throw new Error("db down");
    }

    if (sql.includes("WITH due AS")) {
      return { rows: due };
    }

    if (sql.includes("entry_checklist_items")) {
      return { rows: checklist };
    }

    if (sql.includes("recurring_entry_definitions") && sql.includes("last_generated_on")) {
      return { rows: pending };
    }

    if (sql.includes("recurring_entry_definitions")) {
      return { rows: ending };
    }

    if (sql.includes("MAX(e.occurred_at)")) {
      return { rows: stale };
    }

    if (sql.includes("date_trunc('week'")) {
      return { rows: weekly };
    }

    if (sql.includes("FROM notification_state")) {
      return { rows: state };
    }

    // INSERT ... ON CONFLICT upserts
    return { rows: [] };
  };
}

const dueRow = (overrides) => ({
  id: "e1",
  project_id: "p1",
  project_name: "Cyber Security",
  name: "Lab report",
  due_at: "2026-10-07T10:00:00.000Z",
  bucket: "dueToday",
  bucket_total: 1,
  ...overrides,
});

const emptyWeekly = [{ minutes: 0, entries: 0, completed: 0, projects: 0 }];

/* ---------- tests ---------- */

test("notifications route rejects unauthenticated requests", async () => {
  await withServer(null, async (base) => {
    const { status, body } = await get(base);
    assert.equal(status, 401);
    assert.deepEqual(body, { error: "Authentication required" });
  });
});

test("notifications route rejects an invalid timezone without querying", async () => {
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

test("notifications route returns an empty feed when nothing needs attention", async () => {
  await withDb(
    notificationsDb({ weekly: emptyWeekly }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(base);
        assert.equal(status, 200);
        assert.deepEqual(body.counts, {
          overdue: 0,
          dueToday: 0,
          dueTomorrow: 0,
        });
        assert.equal(body.unreadCount, 0);
        assert.deepEqual(body.notifications, []);
        assert.ok(!Number.isNaN(Date.parse(body.generatedAt)));
      }),
  );
});

test("notifications route maps due entries into typed notifications", async () => {
  const rows = [
    dueRow({ id: "a", name: "Old task", bucket: "overdue", due_at: "2026-10-01T09:00:00.000Z" }),
    dueRow({ id: "b", name: "Today task", bucket: "dueToday" }),
    dueRow({ id: "c", name: "Tomorrow task", bucket: "dueTomorrow", due_at: "2026-10-08T10:00:00.000Z" }),
  ];

  await withDb(
    notificationsDb({ due: rows, weekly: emptyWeekly }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(base);
        assert.equal(status, 200);
        assert.deepEqual(body.counts, {
          overdue: 1,
          dueToday: 1,
          dueTomorrow: 1,
        });
        assert.equal(body.unreadCount, 3);
        assert.deepEqual(
          body.notifications.map((n) => n.type),
          ["entry_overdue", "entry_due_today", "entry_due_tomorrow"],
        );
        const overdue = body.notifications[0];
        assert.equal(overdue.key, "entry_overdue:a");
        assert.equal(overdue.severity, "high");
        assert.equal(overdue.title, "Old task is overdue");
        assert.equal(overdue.projectId, "p1");
        assert.equal(overdue.dueAt, "2026-10-01T09:00:00.000Z");
      }),
  );
});

test("notifications route includes checklist, recurring, stale and weekly sources", async () => {
  const checklist = [
    {
      id: "e5",
      project_id: "p2",
      project_name: "Thesis",
      name: "Chapter draft",
      due_at: "2026-10-08T08:00:00.000Z",
      incomplete_items: 2,
    },
  ];
  const pending = [
    {
      id: "r1",
      name: "Weekly standup notes",
      project_id: "p2",
      project_name: "Thesis",
      last_generated_on: null,
      starts_on: "2026-09-01",
      ends_on: null,
    },
  ];
  const ending = [
    {
      id: "r2",
      name: "Daily journal",
      project_id: "p2",
      project_name: "Thesis",
      ends_on: "2026-10-12",
    },
  ];
  const stale = [
    {
      id: "p9",
      name: "Old project",
      last_activity: "2026-09-01T12:00:00.000Z",
    },
  ];
  const weekly = [{ minutes: 270, entries: 5, completed: 2, projects: 2 }];

  await withDb(
    notificationsDb({ checklist, pending, ending, stale, weekly }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(base);
        assert.equal(status, 200);

        const types = body.notifications.map((n) => n.type);
        assert.ok(types.includes("entry_checklist"));
        assert.ok(types.includes("recurring_pending"));
        assert.ok(types.includes("recurring_ending"));
        assert.ok(types.includes("project_stale"));
        assert.ok(types.includes("weekly_summary"));

        const checklistNote = body.notifications.find((n) => n.type === "entry_checklist");
        assert.equal(checklistNote.key, "entry_checklist:e5");
        assert.equal(checklistNote.severity, "warning");
        assert.equal(checklistNote.title, "2 checklist items left on Chapter draft");

        const pendingNote = body.notifications.find((n) => n.type === "recurring_pending");
        assert.equal(pendingNote.body, "Thesis · no occurrences generated yet");

        const staleNote = body.notifications.find((n) => n.type === "project_stale");
        assert.match(staleNote.key, /^project_stale:p9:\d{4}-\d{2}$/);

        const weeklyNote = body.notifications.find((n) => n.type === "weekly_summary");
        assert.equal(weeklyNote.minutes, 270);
        assert.equal(weeklyNote.entries, 5);
        assert.equal(weeklyNote.completed, 2);
        assert.match(weeklyNote.key, /^weekly_summary:\d{4}-W\d{2}$/);
      }),
  );
});

test("notifications route hides the weekly digest for a silent week", async () => {
  await withDb(
    notificationsDb({ weekly: emptyWeekly }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { body } = await get(base);
        assert.equal(
          body.notifications.some((n) => n.type === "weekly_summary"),
          false,
        );
      }),
  );
});

test("notifications route merges read/dismissed state", async () => {
  const state = [
    { notification_key: "entry_due_today:b", read_at: "2026-10-07T06:00:00.000Z", dismissed_at: null },
    { notification_key: "entry_overdue:a", read_at: null, dismissed_at: "2026-10-07T06:00:00.000Z" },
  ];

  await withDb(
    notificationsDb({
      due: [
        dueRow({ id: "a", bucket: "overdue", due_at: "2026-10-01T09:00:00.000Z" }),
        dueRow({ id: "b", bucket: "dueToday" }),
        dueRow({ id: "c", bucket: "dueTomorrow", due_at: "2026-10-08T10:00:00.000Z" }),
      ],
      state,
      weekly: emptyWeekly,
    }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(base);
        assert.equal(status, 200);

        // dismissed overdue item is gone, read item keeps its timestamp
        assert.deepEqual(
          body.notifications.map((n) => n.key),
          ["entry_due_today:b", "entry_due_tomorrow:c"],
        );
        assert.equal(body.notifications[0].readAt, "2026-10-07T06:00:00.000Z");
        assert.equal(body.unreadCount, 1);
      }),
  );
});

test("POST /:key/read upserts the read marker for the user", async () => {
  const seen = [];

  await withDb(
    notificationsDb({ seen, weekly: emptyWeekly }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await post(`${base}/entry_overdue:e1/read`);
        assert.equal(status, 200);
        assert.equal(body.key, "entry_overdue:e1");
        assert.ok(body.readAt);

        const upsert = seen.find((call) => call.sql.includes("notification_state"));
        assert.ok(upsert);
        assert.deepEqual(upsert.params, ["u1", "entry_overdue:e1"]);
      }),
  );
});

test("POST /:key/read rejects malformed keys", async () => {
  await withDb(
    notificationsDb(),
    () =>
      withServer({ id: "u1" }, async (base) => {
        // Express decodes the segment, so the route sees spaces + semicolons
        const { status, body } = await post(
          `${base}/${encodeURIComponent("bad key; DROP TABLE users")}/read`,
        );
        assert.equal(status, 400);
        assert.deepEqual(body, { error: "Invalid notification key" });
      }),
  );
});

test("POST /:key/dismiss upserts the dismissed marker", async () => {
  const seen = [];

  await withDb(
    notificationsDb({ seen, weekly: emptyWeekly }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await post(`${base}/project_stale:p9:2026-10/dismiss`);
        assert.equal(status, 200);
        assert.equal(body.key, "project_stale:p9:2026-10");
        assert.ok(body.dismissedAt);

        const upsert = seen.find((call) => call.sql.includes("dismissed_at"));
        assert.ok(upsert);
        assert.deepEqual(upsert.params, ["u1", "project_stale:p9:2026-10"]);
      }),
  );
});

test("POST /read-all marks every current key as read", async () => {
  const seen = [];

  await withDb(
    notificationsDb({
      seen,
      due: [
        dueRow({ id: "a", bucket: "overdue", due_at: "2026-10-01T09:00:00.000Z" }),
        dueRow({ id: "b", bucket: "dueToday" }),
      ],
      weekly: emptyWeekly,
    }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await post(`${base}/read-all`);
        assert.equal(status, 200);
        assert.equal(body.updated, 2);

        const upsert = seen.find((call) => call.sql.includes("INSERT INTO notification_state"));
        assert.ok(upsert);
        assert.deepEqual(upsert.params, ["u1", "entry_overdue:a", "entry_due_today:b"]);
      }),
  );
});

test("POST /read-all reports zero updates for an empty feed", async () => {
  await withDb(
    notificationsDb({ weekly: emptyWeekly }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await post(`${base}/read-all`);
        assert.equal(status, 200);
        assert.deepEqual(body, { updated: 0 });
      }),
  );
});

test("POST /read-all rejects an invalid timezone", async () => {
  await withDb(
    notificationsDb(),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await post(`${base}/read-all?timezone=Not/AZone`);
        assert.equal(status, 400);
        assert.deepEqual(body, { error: "Invalid timezone" });
      }),
  );
});

test("POST /read-all returns 500 when deriving the feed fails", async () => {
  await withDb(
    notificationsDb({ failOn: "WITH due AS" }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await post(`${base}/read-all`);
        assert.equal(status, 500);
        assert.deepEqual(body, { error: "Failed to mark notifications read" });
      }),
  );
});

test("POST /:key/read returns 500 when the upsert fails", async () => {
  await withDb(
    notificationsDb({ failOn: "INSERT INTO notification_state" }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await post(`${base}/entry_overdue:e1/read`);
        assert.equal(status, 500);
        assert.deepEqual(body, { error: "Failed to mark notification read" });
      }),
  );
});

test("POST /:key/dismiss rejects malformed keys", async () => {
  await withDb(
    notificationsDb(),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await post(
          `${base}/${encodeURIComponent("bad key; DROP TABLE users")}/dismiss`,
        );
        assert.equal(status, 400);
        assert.deepEqual(body, { error: "Invalid notification key" });
      }),
  );
});

test("POST /:key/dismiss returns 500 when the upsert fails", async () => {
  await withDb(
    notificationsDb({ failOn: "INSERT INTO notification_state" }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await post(`${base}/project_stale:p9/dismiss`);
        assert.equal(status, 500);
        assert.deepEqual(body, { error: "Failed to dismiss notification" });
      }),
  );
});

test("notifications route returns 500 when a query fails", async () => {
  await withDb(
    notificationsDb({ failOn: "WITH due AS" }),
    () =>
      withServer({ id: "u1" }, async (base) => {
        const { status, body } = await get(base);
        assert.equal(status, 500);
        assert.deepEqual(body, { error: "Failed to load notifications" });
      }),
  );
});

test("notification SQL keeps its exclusion guards", () => {
  // Mocked tests cannot execute SQL, so pin the rules that keep
  // completed, undated and archived-project entries out of the feed.
  assert.match(notifications.DUE_ENTRIES_SQL, /e\.completed_at IS NULL/);
  assert.match(notifications.DUE_ENTRIES_SQL, /e\.due_at IS NOT NULL/);
  assert.match(notifications.DUE_ENTRIES_SQL, /p\.archived_at IS NULL/);
  assert.match(notifications.DUE_ENTRIES_SQL, /e\.created_by_id = \$1/);
  assert.match(notifications.INCOMPLETE_CHECKLIST_SQL, /ci\.completed = FALSE/);
  assert.match(notifications.RECURRING_PENDING_SQL, /r\.enabled = TRUE/);
  assert.match(notifications.STALE_PROJECTS_SQL, /p\.owner_id = \$1/);
  assert.match(notifications.STALE_PROJECTS_SQL, /p\.archived_at IS NULL/);
});

test("isoWeekKey produces stable ISO week identifiers", () => {
  assert.equal(notifications.isoWeekKey(new Date("2026-01-01T00:00:00Z")), "2026-W01");
  assert.equal(notifications.isoWeekKey(new Date("2026-10-07T00:00:00Z")), "2026-W41");
  assert.equal(notifications.isoWeekKey(new Date("2024-12-30T00:00:00Z")), "2025-W01");
});
