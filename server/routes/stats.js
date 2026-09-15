const express = require("express");
const router = express.Router();
const db = require("../db");

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getOwnedProject(projectId, userId) {
  const result = await db.query(
    `
      SELECT id
      FROM projects
      WHERE id = $1
        AND owner_id = $2
      LIMIT 1
    `,
    [projectId, userId],
  );

  return result.rows[0] || null;
}

async function getProjectField(projectId, fieldId) {
  const result = await db.query(
    `
      SELECT
        id,
        project_id,
        name,
        field_type
      FROM project_fields
      WHERE id = $1
        AND project_id = $2
        AND archived_at IS NULL
      LIMIT 1
    `,
    [fieldId, projectId],
  );

  return result.rows[0] || null;
}

function getValueExpression(fieldType) {
  switch (fieldType) {
    case "number":
      return "v.value_number";

    case "date":
      return "v.value_date";

    case "short_text":
    case "long_text":
      return "v.value_text";

    default:
      return null;
  }
}

function ensureSupportedField(field) {
  if (!field) {
    throw createHttpError(404, "Custom field not found");
  }

  if (field.field_type === "computed") {
    throw createHttpError(
      400,
      "Statistics for computed fields are not supported yet",
    );
  }
}

async function getTotalStatistics(projectId, field) {
  if (field.field_type !== "number") {
    const result = await db.query(
      `
        SELECT
          COUNT(*)::INTEGER AS count
        FROM entry_field_values v
        INNER JOIN entries e
          ON e.id = v.entry_id
        WHERE e.project_id = $1
          AND v.field_id = $2
          AND (
            v.value_text IS NOT NULL
            OR v.value_date IS NOT NULL
            OR v.value_number IS NOT NULL
          )
      `,
      [projectId, field.id],
    );

    return {
      operation: "total",
      field: {
        id: field.id,
        name: field.name,
        type: field.field_type,
      },
      count: Number(result.rows[0].count),
    };
  }

  const result = await db.query(
    `
      SELECT
        COUNT(v.value_number)::INTEGER AS count,
        COALESCE(SUM(v.value_number), 0)::NUMERIC AS sum,
        COALESCE(AVG(v.value_number), 0)::NUMERIC AS average,
        COALESCE(MIN(v.value_number), 0)::NUMERIC AS minimum,
        COALESCE(MAX(v.value_number), 0)::NUMERIC AS maximum
      FROM entry_field_values v
      INNER JOIN entries e
        ON e.id = v.entry_id
      WHERE e.project_id = $1
        AND v.field_id = $2
        AND v.value_number IS NOT NULL
    `,
    [projectId, field.id],
  );

  const row = result.rows[0];

  return {
    operation: "total",
    field: {
      id: field.id,
      name: field.name,
      type: field.field_type,
    },
    count: Number(row.count),
    sum: Number(row.sum),
    average: Number(row.average),
    minimum: Number(row.minimum),
    maximum: Number(row.maximum),
  };
}

async function getGroupStatistics(projectId, field) {
  const valueExpression = getValueExpression(field.field_type);

  if (!valueExpression) {
    throw createHttpError(400, "This field type cannot be grouped");
  }

  const result = await db.query(
    `
      SELECT
        ${valueExpression} AS value,
        COUNT(*)::INTEGER AS count
      FROM entry_field_values v
      INNER JOIN entries e
        ON e.id = v.entry_id
      WHERE e.project_id = $1
        AND v.field_id = $2
        AND ${valueExpression} IS NOT NULL
      GROUP BY ${valueExpression}
      ORDER BY count DESC, value ASC
    `,
    [projectId, field.id],
  );

  return {
    operation: "group",
    field: {
      id: field.id,
      name: field.name,
      type: field.field_type,
    },
    groups: result.rows.map((row) => ({
      value: row.value,
      count: Number(row.count),
    })),
  };
}

async function getCompareStatistics(
  projectId,
  firstField,
  secondField,
) {
  if (
    firstField.field_type !== "number" ||
    secondField.field_type !== "number"
  ) {
    throw createHttpError(
      400,
      "Compare requires two numeric custom fields",
    );
  }

  const result = await db.query(
    `
      SELECT
        COUNT(*)::INTEGER AS entries_compared,
        COALESCE(SUM(first_value.value_number), 0)::NUMERIC AS first_total,
        COALESCE(SUM(second_value.value_number), 0)::NUMERIC AS second_total,
        COALESCE(AVG(first_value.value_number), 0)::NUMERIC AS first_average,
        COALESCE(AVG(second_value.value_number), 0)::NUMERIC AS second_average
      FROM entries e
      INNER JOIN entry_field_values first_value
        ON first_value.entry_id = e.id
       AND first_value.field_id = $2
      INNER JOIN entry_field_values second_value
        ON second_value.entry_id = e.id
       AND second_value.field_id = $3
      WHERE e.project_id = $1
        AND first_value.value_number IS NOT NULL
        AND second_value.value_number IS NOT NULL
    `,
    [projectId, firstField.id, secondField.id],
  );

  const row = result.rows[0];

  return {
    operation: "compare",
    fields: [
      {
        id: firstField.id,
        name: firstField.name,
        type: firstField.field_type,
      },
      {
        id: secondField.id,
        name: secondField.name,
        type: secondField.field_type,
      },
    ],
    entriesCompared: Number(row.entries_compared),
    first: {
      total: Number(row.first_total),
      average: Number(row.first_average),
    },
    second: {
      total: Number(row.second_total),
      average: Number(row.second_average),
    },
  };
}

async function getPlotStatistics(projectId, field) {
  const valueExpression = getValueExpression(field.field_type);

  if (!valueExpression) {
    throw createHttpError(400, "This field type cannot be plotted");
  }

  if (field.field_type === "number") {
    const result = await db.query(
      `
        SELECT
          e.name AS label,
          v.value_number AS value
        FROM entry_field_values v
        INNER JOIN entries e
          ON e.id = v.entry_id
        WHERE e.project_id = $1
          AND v.field_id = $2
          AND v.value_number IS NOT NULL
        ORDER BY e.occurred_at ASC, e.created_at ASC
      `,
      [projectId, field.id],
    );

    return {
      operation: "plot",
      chartType: "bar",
      field: {
        id: field.id,
        name: field.name,
        type: field.field_type,
      },
      data: result.rows.map((row) => ({
        label: row.label,
        value: Number(row.value),
      })),
    };
  }

  const result = await db.query(
    `
      SELECT
        ${valueExpression}::TEXT AS label,
        COUNT(*)::INTEGER AS value
      FROM entry_field_values v
      INNER JOIN entries e
        ON e.id = v.entry_id
      WHERE e.project_id = $1
        AND v.field_id = $2
        AND ${valueExpression} IS NOT NULL
      GROUP BY ${valueExpression}
      ORDER BY value DESC, label ASC
    `,
    [projectId, field.id],
  );

  return {
    operation: "plot",
    chartType: "bar",
    field: {
      id: field.id,
      name: field.name,
      type: field.field_type,
    },
    data: result.rows.map((row) => ({
      label: row.label,
      value: Number(row.value),
    })),
  };
}

/*
 * Dashboard statistics.
 *
 * GET /api/stats/dashboard
 */
router.get("/dashboard", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const statsQuery = await db.query(
      `
        SELECT
          COALESCE(SUM(duration_minutes) / 60.0, 0) AS total_hours,
          COUNT(DISTINCT project_id) AS active_projects,
          COUNT(id) AS total_entries
        FROM entries
        WHERE created_by_id = $1
      `,
      [userId],
    );

    return res.json(statsQuery.rows[0]);
  } catch (err) {
    console.error("Dashboard statistics error:", err);

    return res.status(500).json({
      error: "Failed to calculate dashboard statistics",
    });
  }
});

/*
 * Custom-field statistics.
 *
 * GET /api/stats/projects/:projectId?operation=total&fieldId=<uuid>
 *
 * Supported operations:
 *   total
 *   group
 *   compare
 *   plot
 */
router.get("/projects/:projectId", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;

    const {
      operation = "total",
      fieldId,
      compareFieldId,
    } = req.query;

    if (!userId) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    if (!fieldId) {
      return res.status(400).json({
        error: "fieldId is required",
      });
    }

    const project = await getOwnedProject(projectId, userId);

    if (!project) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    const field = await getProjectField(projectId, fieldId);

    ensureSupportedField(field);

    let result;

    switch (operation) {
      case "total":
        result = await getTotalStatistics(projectId, field);
        break;

      case "group":
        result = await getGroupStatistics(projectId, field);
        break;

      case "plot":
        result = await getPlotStatistics(projectId, field);
        break;

      case "compare": {
        if (!compareFieldId) {
          throw createHttpError(
            400,
            "compareFieldId is required for compare",
          );
        }

        if (compareFieldId === fieldId) {
          throw createHttpError(
            400,
            "Compare requires two different custom fields",
          );
        }

        const secondField = await getProjectField(
          projectId,
          compareFieldId,
        );

        ensureSupportedField(secondField);

        result = await getCompareStatistics(
          projectId,
          field,
          secondField,
        );

        break;
      }

      default:
        throw createHttpError(
          400,
          "Invalid operation. Use total, group, compare or plot",
        );
    }

    return res.json(result);
  } catch (err) {
    console.error("Statistics error:", err);

    return res.status(err.statusCode || 500).json({
      error: err.message || "Failed to calculate statistics",
    });
  }
});

module.exports = router;

module.exports.getTotalStatistics = getTotalStatistics;
module.exports.getGroupStatistics = getGroupStatistics;
module.exports.getCompareStatistics = getCompareStatistics;
module.exports.getPlotStatistics = getPlotStatistics;
