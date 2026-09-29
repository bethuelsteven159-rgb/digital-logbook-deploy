const express = require("express");
const router = express.Router();
const db = require("../db");

const DEFAULT_TIMEZONE = "Africa/Johannesburg";

// Cap each bucket so one huge backlog of overdue work cannot crowd out
// tomorrow's items or bloat the response. Totals are still reported in full.
const MAX_PER_BUCKET = 50;

function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/*
 * Reminders are derived from data that already exists (due_at and
 * completed_at), so no schema change is needed.
 *
 *   overdue      due_at is in the past
 *   dueToday     due later today (in the user's timezone)
 *   dueTomorrow  due tomorrow (in the user's timezone)
 *
 * Completed entries and entries in archived projects never remind.
 */
const REMINDERS_SQL = `
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

/*
 * GET /api/reminders?timezone=Africa/Johannesburg
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

    const result = await db.query(REMINDERS_SQL, [
      userId,
      timezone,
      MAX_PER_BUCKET,
    ]);

    const reminders = { overdue: [], dueToday: [], dueTomorrow: [] };
    const counts = { overdue: 0, dueToday: 0, dueTomorrow: 0 };

    for (const row of result.rows) {
      reminders[row.bucket].push({
        id: row.id,
        projectId: row.project_id,
        projectName: row.project_name,
        name: row.name,
        dueAt: row.due_at,
      });
      counts[row.bucket] = Number(row.bucket_total);
    }

    return res.json({
      timezone,
      generatedAt: new Date().toISOString(),
      counts,
      ...reminders,
    });
  } catch (err) {
    console.error("Reminders error:", err);

    return res.status(500).json({ error: "Failed to load reminders" });
  }
});

module.exports = router;
module.exports.REMINDERS_SQL = REMINDERS_SQL;
