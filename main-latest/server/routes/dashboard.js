const express = require("express");
const db = require("../db");

const router = express.Router();

/*
 * GET /api/dashboard
 *
 * Read-only dashboard summary for the currently
 * authenticated user.
 */
router.get("/", async (req, res, next) => {
  try {
    /*
     * Some versions of the login code store the user UUID
     * in "sub", while other code expects "id".
     *
     * Supporting both here lets the dashboard read the
     * authenticated user without changing the auth team's code.
     */
    const userId = req.user?.id || req.user?.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user ID was not found",
      });
    }

    const summaryResult = await db.query(
      `
        WITH project_stats AS (
          SELECT
            COUNT(*)::int AS projects_created,
            COUNT(*) FILTER (
              WHERE archived_at IS NULL
            )::int AS active_projects,
            COUNT(*) FILTER (
              WHERE archived_at IS NOT NULL
            )::int AS projects_archived
          FROM projects
          WHERE owner_id = $1
        ),
        entry_stats AS (
          SELECT
            COUNT(e.id)::int AS total_entries,
            COALESCE(
              SUM(e.duration_minutes),
              0
            )::int AS logged_minutes,
            COALESCE(
              SUM(e.duration_minutes) FILTER (
                WHERE e.occurred_at >=
                  date_trunc(
                    'week',
                    CURRENT_TIMESTAMP
                  )
              ),
              0
            )::int AS this_week_minutes,
            COALESCE(
              ROUND(AVG(e.duration_minutes)),
              0
            )::int AS average_session_minutes
          FROM entries e
          INNER JOIN projects p
            ON p.id = e.project_id
          WHERE p.owner_id = $1
        )
        SELECT
          ps.projects_created,
          ps.active_projects,
          ps.projects_archived,
          es.total_entries,
          es.logged_minutes,
          es.this_week_minutes,
          es.average_session_minutes
        FROM project_stats ps
        CROSS JOIN entry_stats es
      `,
      [userId],
    );

    const recentResult = await db.query(
      `
        SELECT
          e.id AS entry_id,
          e.project_id,
          e.name AS entry_name,
          e.duration_minutes,
          e.occurred_at,
          p.name AS project_name
        FROM entries e
        INNER JOIN projects p
          ON p.id = e.project_id
        WHERE p.owner_id = $1
        ORDER BY e.occurred_at DESC
        LIMIT 5
      `,
      [userId],
    );

    const summary = summaryResult.rows[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          loggedMinutes:
            Number(summary.logged_minutes) || 0,
          activeProjects:
            Number(summary.active_projects) || 0,
          totalEntries:
            Number(summary.total_entries) || 0,
          thisWeekMinutes:
            Number(summary.this_week_minutes) || 0,
        },

        overview: {
          projectsCreated:
            Number(summary.projects_created) || 0,
          projectsArchived:
            Number(summary.projects_archived) || 0,
          entriesLogged:
            Number(summary.total_entries) || 0,
          averageSessionMinutes:
            Number(summary.average_session_minutes) || 0,
        },

        recentActivity: recentResult.rows.map(
          (row) => ({
            entryId: row.entry_id,
            projectId: row.project_id,
            entryName: row.entry_name,
            projectName: row.project_name,
            durationMinutes:
              Number(row.duration_minutes) || 0,
            occurredAt: row.occurred_at,
          }),
        ),
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
