const express = require("express");
const db = require("../db");

const router = express.Router();

const ALLOWED_DASHBOARD_STATISTICS = new Set([
  "loggedMinutes",
  "activeProjects",
  "totalEntries",
  "thisWeekMinutes",
  "projectsCreated",
  "projectsArchived",
  "entriesLogged",
  "averageSessionMinutes",
]);

function getAuthenticatedUserId(req) {
  return req.user?.id || req.user?.sub;
}

function validateDashboardLayout(layout) {
  if (!Array.isArray(layout)) {
    return "Dashboard layout must be an array";
  }

  if (layout.length > 12) {
    return "Dashboard layout cannot contain more than 12 widgets";
  }

  const ids = new Set();

  for (const widget of layout) {
    if (!widget || typeof widget !== "object" || Array.isArray(widget)) {
      return "Each dashboard widget must be an object";
    }

    if (typeof widget.id !== "string" || widget.id.trim().length === 0 || widget.id.length > 80) {
      return "Each dashboard widget must have a valid id";
    }

    if (ids.has(widget.id)) {
      return "Dashboard widget ids must be unique";
    }

    ids.add(widget.id);

    if (!ALLOWED_DASHBOARD_STATISTICS.has(widget.statisticId)) {
      return "Dashboard widget contains an unsupported statistic";
    }
  }

  return null;
}

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
    const userId = getAuthenticatedUserId(req);

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

    const layoutResult = await db.query(
      `
        SELECT dashboard_layout
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    const summary = summaryResult.rows[0] || {};
    const storedLayout = layoutResult.rows[0]?.dashboard_layout;

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

        layout: Array.isArray(storedLayout) ? storedLayout : null,

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


/*
 * PUT /api/dashboard
 *
 * Persists the authenticated user's custom dashboard layout.
 */
router.put("/", async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user ID was not found",
      });
    }

    const layout = req.body?.layout;
    const validationError = validateDashboardLayout(layout);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const result = await db.query(
      `
        UPDATE users
        SET
          dashboard_layout = $1::jsonb,
          updated_at = NOW()
        WHERE id = $2
        RETURNING dashboard_layout
      `,
      [JSON.stringify(layout), userId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        layout: result.rows[0].dashboard_layout,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
