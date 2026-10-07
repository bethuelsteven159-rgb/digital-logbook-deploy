const express = require("express");
const router = express.Router();
const db = require("../db");

const DEFAULT_TIMEZONE = "Africa/Johannesburg";

// Cap each bucket so one huge backlog cannot bloat the response or
// crowd out other notification types. Totals are still reported in full.
const MAX_PER_BUCKET = 50;

// A project counts as "stale" once nothing was logged for this long.
const STALE_DAYS = 14;

// How often a recurring series may fall behind before we flag it (days).
const RECURRING_LAG_DAYS = 1;

// Alert window for series that are about to end (days from today).
const RECURRING_ENDING_DAYS = 7;

// Checklist reminders apply to entries that are overdue or due within…
const CHECKLIST_WINDOW_DAYS = 2;

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/*
 * Notifications are derived from data that already exists, so the only
 * schema change is notification_state (read/dismissed markers).
 *
 *   entry_overdue      due_at is in the past and the entry is not completed
 *   entry_due_today    due later today (in the user's timezone)
 *   entry_due_tomorrow due tomorrow (in the user's timezone)
 *   entry_checklist    incomplete checklist items on an entry due soon
 *   recurring_pending  an enabled recurring series is behind its schedule
 *   recurring_ending   an enabled recurring series ends within a week
 *   project_stale      nothing logged in an active project for 14+ days
 *   weekly_summary     once-per-week digest of logged/completed work
 *
 * Completed entries and entries in archived projects never notify.
 */
const DUE_ENTRIES_SQL = `
  WITH due AS (
    SELECT
      e.id,
      e.project_id,
      p.name AS project_name,
      e.name,
      e.due_at,
      CASE
        WHEN e.due_at < now() THEN 'overdue'
        WHEN (e.due_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date
          THEN 'dueToday'
        ELSE 'dueTomorrow'
      END AS bucket
    FROM entries e
    INNER JOIN projects p
      ON p.id = e.project_id
    WHERE e.created_by_id = $1
      AND e.completed_at IS NULL
      AND e.due_at IS NOT NULL
      AND p.archived_at IS NULL
      AND (e.due_at AT TIME ZONE $2)::date
            <= (now() AT TIME ZONE $2)::date + 1
  ),
  ranked AS (
    SELECT
      due.*,
      COUNT(*) OVER (PARTITION BY bucket)::INTEGER AS bucket_total,
      ROW_NUMBER() OVER (PARTITION BY bucket ORDER BY due_at ASC) AS rn
    FROM due
  )
  SELECT id, project_id, project_name, name, due_at, bucket, bucket_total
  FROM ranked
  WHERE rn <= $3
  ORDER BY due_at ASC
`;

const INCOMPLETE_CHECKLIST_SQL = `
  SELECT
    e.id,
    e.project_id,
    p.name AS project_name,
    e.name,
    e.due_at,
    COUNT(ci.id)::INTEGER AS incomplete_items
  FROM entries e
  INNER JOIN projects p
    ON p.id = e.project_id
  INNER JOIN entry_checklist_items ci
    ON ci.entry_id = e.id
   AND ci.completed = FALSE
  WHERE e.created_by_id = $1
    AND e.completed_at IS NULL
    AND e.due_at IS NOT NULL
    AND p.archived_at IS NULL
    AND (e.due_at AT TIME ZONE $2)::date
          <= (now() AT TIME ZONE $2)::date + $3::int
  GROUP BY e.id, p.name
  ORDER BY e.due_at ASC
`;

const RECURRING_PENDING_SQL = `
  SELECT
    r.id,
    r.name,
    r.project_id,
    p.name AS project_name,
    r.last_generated_on,
    r.starts_on
  FROM recurring_entry_definitions r
  INNER JOIN projects p
    ON p.id = r.project_id
  WHERE r.created_by_id = $1
    AND r.enabled = TRUE
    AND p.archived_at IS NULL
    AND r.starts_on <= (now() AT TIME ZONE $2)::date
    AND (r.ends_on IS NULL OR r.ends_on >= (now() AT TIME ZONE $2)::date)
    AND (
      r.last_generated_on IS NULL
      OR r.last_generated_on < (now() AT TIME ZONE $2)::date - $3::int
    )
  ORDER BY r.last_generated_on ASC NULLS FIRST
`;

const RECURRING_ENDING_SQL = `
  SELECT
    r.id,
    r.name,
    r.project_id,
    p.name AS project_name,
    r.ends_on
  FROM recurring_entry_definitions r
  INNER JOIN projects p
    ON p.id = r.project_id
  WHERE r.created_by_id = $1
    AND r.enabled = TRUE
    AND p.archived_at IS NULL
    AND r.ends_on BETWEEN (now() AT TIME ZONE $2)::date
                      AND ((now() AT TIME ZONE $2)::date + $3::int)
  ORDER BY r.ends_on ASC
`;

const STALE_PROJECTS_SQL = `
  SELECT
    p.id,
    p.name,
    MAX(e.occurred_at) AS last_activity
  FROM projects p
  INNER JOIN entries e
    ON e.project_id = p.id
   AND e.archived_at IS NULL
  WHERE p.owner_id = $1
    AND p.archived_at IS NULL
  GROUP BY p.id, p.name
  HAVING MAX(e.occurred_at) < now() - make_interval(days => $2::int)
  ORDER BY last_activity ASC
`;

const WEEKLY_SUMMARY_SQL = `
  SELECT
    COALESCE(SUM(duration_minutes), 0)::int AS minutes,
    COUNT(*)::int AS entries,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed,
    COUNT(DISTINCT project_id)::int AS projects
  FROM entries
  WHERE created_by_id = $1
    AND occurred_at >= date_trunc('week', now() AT TIME ZONE $2)
`;

const READ_STATE_SQL = `
  SELECT notification_key, read_at, dismissed_at
  FROM notification_state
  WHERE user_id = $1
`;

// Lower rank sorts first: the most urgent items lead the feed.
const SEVERITY_RANK = {
  entry_overdue: 0,
  entry_due_today: 1,
  entry_due_tomorrow: 2,
  entry_checklist: 3,
  recurring_pending: 4,
  recurring_ending: 5,
  project_stale: 6,
  weekly_summary: 7,
};

const SEVERITY_LEVEL = {
  entry_overdue: "high",
  entry_due_today: "warning",
  entry_due_tomorrow: "info",
  entry_checklist: "warning",
  recurring_pending: "warning",
  recurring_ending: "info",
  project_stale: "low",
  weekly_summary: "info",
};

function isoWeekKey(date) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  const dayNumber = d.getUTCDay() || 7;

  d.setUTCDate(d.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  const week = Math.ceil((d - yearStart) / 86400000 / 7 + 0.5);

  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/*
 * Assembles the current notification feed for a user.
 * Returns { notifications, counts, unreadCount } — dismissed items are
 * excluded, read items keep their readAt timestamp.
 */
async function buildNotifications(userId, timezone) {
  const today = new Date();

  const [
    dueResult,
    checklistResult,
    recurringPendingResult,
    recurringEndingResult,
    staleResult,
    weeklyResult,
    stateResult,
  ] = await Promise.all([
    db.query(DUE_ENTRIES_SQL, [userId, timezone, MAX_PER_BUCKET]),
    db.query(INCOMPLETE_CHECKLIST_SQL, [userId, timezone, CHECKLIST_WINDOW_DAYS]),
    db.query(RECURRING_PENDING_SQL, [userId, timezone, RECURRING_LAG_DAYS]),
    db.query(RECURRING_ENDING_SQL, [userId, timezone, RECURRING_ENDING_DAYS]),
    db.query(STALE_PROJECTS_SQL, [userId, STALE_DAYS]),
    db.query(WEEKLY_SUMMARY_SQL, [userId, timezone]),
    db.query(READ_STATE_SQL, [userId]),
  ]);

  const stateByKey = new Map();

  for (const row of stateResult.rows) {
    stateByKey.set(row.notification_key, row);
  }

  const notifications = [];

  for (const row of dueResult.rows) {
    const type =
      row.bucket === "overdue"
        ? "entry_overdue"
        : row.bucket === "dueToday"
          ? "entry_due_today"
          : "entry_due_tomorrow";

    notifications.push({
      key: `${type}:${row.id}`,
      type,
      severity: SEVERITY_LEVEL[type],
      title:
        type === "entry_overdue"
          ? `${row.name} is overdue`
          : type === "entry_due_today"
            ? `${row.name} is due today`
            : `${row.name} is due tomorrow`,
      body: row.project_name,
      projectId: row.project_id,
      projectName: row.project_name,
      entryId: row.id,
      entryName: row.name,
      dueAt: row.due_at,
      bucketTotal: Number(row.bucket_total),
    });
  }

  for (const row of checklistResult.rows) {
    notifications.push({
      key: `entry_checklist:${row.id}`,
      type: "entry_checklist",
      severity: SEVERITY_LEVEL.entry_checklist,
      title: `${row.incomplete_items} checklist ${row.incomplete_items === 1 ? "item" : "items"} left on ${row.name}`,
      body: row.project_name,
      projectId: row.project_id,
      projectName: row.project_name,
      entryId: row.id,
      entryName: row.name,
      dueAt: row.due_at,
    });
  }

  for (const row of recurringPendingResult.rows) {
    notifications.push({
      key: `recurring_pending:${row.id}`,
      type: "recurring_pending",
      severity: SEVERITY_LEVEL.recurring_pending,
      title: `Recurring series "${row.name}" is behind schedule`,
      body: row.last_generated_on
        ? `${row.project_name} · last generated ${row.last_generated_on}`
        : `${row.project_name} · no occurrences generated yet`,
      projectId: row.project_id,
      projectName: row.project_name,
      endsOn: row.ends_on,
      lastGeneratedOn: row.last_generated_on,
    });
  }

  for (const row of recurringEndingResult.rows) {
    notifications.push({
      key: `recurring_ending:${row.id}`,
      type: "recurring_ending",
      severity: SEVERITY_LEVEL.recurring_ending,
      title: `Recurring series "${row.name}" ends soon`,
      body: `${row.project_name} · final occurrence ${row.ends_on}`,
      projectId: row.project_id,
      projectName: row.project_name,
      endsOn: row.ends_on,
    });
  }

  for (const row of staleResult.rows) {
    const staleYearMonth = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;

    notifications.push({
      // The month bucket lets a dismissed "stale project" hint
      // resurface once a month instead of nagging forever.
      key: `project_stale:${row.id}:${staleYearMonth}`,
      type: "project_stale",
      severity: SEVERITY_LEVEL.project_stale,
      title: `No activity in "${row.name}"`,
      body: `Nothing logged here for ${STALE_DAYS}+ days — time for an update?`,
      projectId: row.id,
      projectName: row.name,
      lastActivityAt: row.last_activity,
    });
  }

  const weekly = weeklyResult.rows[0];

  if (weekly && (Number(weekly.entries) > 0 || Number(weekly.minutes) > 0)) {
    notifications.push({
      key: `weekly_summary:${isoWeekKey(today)}`,
      type: "weekly_summary",
      severity: SEVERITY_LEVEL.weekly_summary,
      title: "Your week so far",
      body: `${Number(weekly.minutes)} minutes across ${Number(weekly.entries)} entries`,
      minutes: Number(weekly.minutes),
      entries: Number(weekly.entries),
      completed: Number(weekly.completed),
      projects: Number(weekly.projects),
    });
  }

  const visible = [];

  for (const notification of notifications) {
    const state = stateByKey.get(notification.key);

    if (state?.dismissed_at) {
      continue;
    }

    notification.readAt = state?.read_at || null;
    notification.dismissedAt = null;

    visible.push(notification);
  }

  visible.sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.type] - SEVERITY_RANK[b.type];

    if (rankDiff !== 0) {
      return rankDiff;
    }

    const dateA = a.dueAt || a.lastActivityAt || a.endsOn;
    const dateB = b.dueAt || b.lastActivityAt || b.endsOn;

    if (dateA && dateB) {
      return new Date(dateA) - new Date(dateB);
    }

    return a.title.localeCompare(b.title);
  });

  const counts = {
    overdue: 0,
    dueToday: 0,
    dueTomorrow: 0,
  };

  for (const notification of visible) {
    if (notification.type === "entry_overdue") counts.overdue += 1;
    if (notification.type === "entry_due_today") counts.dueToday += 1;
    if (notification.type === "entry_due_tomorrow") counts.dueTomorrow += 1;
  }

  const unreadCount = visible.filter((n) => !n.readAt).length;

  return { notifications: visible, counts, unreadCount };
}

function isValidKey(key) {
  return typeof key === "string" && /^[A-Za-z0-9_.:-]{1,200}$/.test(key);
}

/*
 * GET /api/notifications?timezone=Africa/Johannesburg
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const timezone = req.query.timezone || DEFAULT_TIMEZONE;

    if (typeof timezone !== "string" || !isValidTimezone(timezone)) {
      return res.status(400).json({ error: "Invalid timezone" });
    }

    const { notifications, counts, unreadCount } = await buildNotifications(
      userId,
      timezone,
    );

    return res.json({
      timezone,
      generatedAt: new Date().toISOString(),
      unreadCount,
      counts,
      notifications,
    });
  } catch (err) {
    console.error("Notifications error:", err);

    return res.status(500).json({ error: "Failed to load notifications" });
  }
});

/*
 * POST /api/notifications/:key/read
 */
router.post("/:key/read", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const key = req.params.key;

    if (!isValidKey(key)) {
      return res.status(400).json({ error: "Invalid notification key" });
    }

    await db.query(
      `
        INSERT INTO notification_state (user_id, notification_key, read_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, notification_key)
        DO UPDATE SET read_at = NOW(), updated_at = NOW()
      `,
      [userId, key],
    );

    return res.json({ key, readAt: new Date().toISOString() });
  } catch (err) {
    console.error("Notifications error:", err);

    return res.status(500).json({ error: "Failed to mark notification read" });
  }
});

/*
 * POST /api/notifications/read-all
 *
 * Re-derives the current feed server-side and marks everything on it as
 * read, so the client never has to send the key list around.
 */
router.post("/read-all", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const timezone =
      typeof req.query.timezone === "string" && req.query.timezone
        ? req.query.timezone
        : DEFAULT_TIMEZONE;

    if (!isValidTimezone(timezone)) {
      return res.status(400).json({ error: "Invalid timezone" });
    }

    const { notifications } = await buildNotifications(userId, timezone);

    const keys = notifications.map((n) => n.key);

    if (keys.length === 0) {
      return res.json({ updated: 0 });
    }

    const values = [];
    const params = [userId];

    keys.forEach((key, index) => {
      values.push(`($1, $${index + 2}, NOW())`);
      params.push(key);
    });

    await db.query(
      `
        INSERT INTO notification_state (user_id, notification_key, read_at)
        VALUES ${values.join(", ")}
        ON CONFLICT (user_id, notification_key)
        DO UPDATE SET read_at = NOW(), updated_at = NOW()
      `,
      params,
    );

    return res.json({ updated: keys.length });
  } catch (err) {
    console.error("Notifications error:", err);

    return res.status(500).json({ error: "Failed to mark notifications read" });
  }
});

/*
 * POST /api/notifications/:key/dismiss
 */
router.post("/:key/dismiss", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const key = req.params.key;

    if (!isValidKey(key)) {
      return res.status(400).json({ error: "Invalid notification key" });
    }

    await db.query(
      `
        INSERT INTO notification_state (user_id, notification_key, dismissed_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, notification_key)
        DO UPDATE SET dismissed_at = NOW(), updated_at = NOW()
      `,
      [userId, key],
    );

    return res.json({ key, dismissedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Notifications error:", err);

    return res.status(500).json({ error: "Failed to dismiss notification" });
  }
});

module.exports = router;
module.exports.buildNotifications = buildNotifications;
module.exports.DUE_ENTRIES_SQL = DUE_ENTRIES_SQL;
module.exports.INCOMPLETE_CHECKLIST_SQL = INCOMPLETE_CHECKLIST_SQL;
module.exports.RECURRING_PENDING_SQL = RECURRING_PENDING_SQL;
module.exports.RECURRING_ENDING_SQL = RECURRING_ENDING_SQL;
module.exports.STALE_PROJECTS_SQL = STALE_PROJECTS_SQL;
module.exports.WEEKLY_SUMMARY_SQL = WEEKLY_SUMMARY_SQL;
module.exports.isoWeekKey = isoWeekKey;
