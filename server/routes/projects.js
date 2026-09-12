const express = require("express");
const db = require("../db");

const router = express.Router();

const FIELD_TYPES = new Set([
  "short_text",
  "long_text",
  "number",
  "date",
  "computed",
]);

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireUserId(req) {
  const userId = req.user?.id || req.user?.sub;

  if (!userId) {
    throw httpError(401, "Authentication required");
  }

  return userId;
}

function cleanProjectName(value) {
  const name = String(value ?? "").trim();

  if (!name) {
    throw httpError(400, "Project name is required");
  }

  if (name.length > 120) {
    throw httpError(400, "Project name is too long");
  }

  return name;
}

function cleanOptionalDate(value, label) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = String(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw httpError(400, `${label} must be a valid date`);
  }

  const date = new Date(`${text}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw httpError(400, `${label} must be a valid date`);
  }

  return text;
}

function assertDateRange(startDate, endDate) {
  if (startDate && endDate && endDate < startDate) {
    throw httpError(
      400,
      "End date cannot be before the start date",
    );
  }
}

function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    totalEntries: Number(row.total_entries) || 0,
    loggedMinutes: Number(row.logged_minutes) || 0,
    lastActivity: row.last_activity || null,
  };
}

async function getOwnedProjectRow(client, projectId, userId) {
  const result = await client.query(
    `
      SELECT
        id,
        owner_id,
        name,
        description,
        start_date,
        end_date,
        archived_at,
        created_at,
        updated_at
      FROM projects
      WHERE id = $1
        AND owner_id = $2
      LIMIT 1
    `,
    [projectId, userId],
  );

  return result.rows[0] || null;
}

async function syncProjectFields(client, projectId, requestedFields) {
  if (!Array.isArray(requestedFields)) {
    return;
  }

  const currentResult = await client.query(
    `
      SELECT
        pf.id,
        pf.name,
        pf.field_type,
        pf.position,
        EXISTS (
          SELECT 1
          FROM entry_field_values efv
          WHERE efv.field_id = pf.id
        ) AS used_by_entries
      FROM project_fields pf
      WHERE pf.project_id = $1
        AND pf.archived_at IS NULL
      ORDER BY pf.position ASC, pf.created_at ASC
      FOR UPDATE
    `,
    [projectId],
  );

  const currentFields = currentResult.rows;
  const currentById = new Map(
    currentFields.map((field) => [field.id, field]),
  );

  const requestedExistingIds = new Set();

  for (const field of requestedFields) {
    if (!field?.id) {
      continue;
    }

    if (!currentById.has(field.id)) {
      throw httpError(
        400,
        "One of the supplied project fields is invalid",
      );
    }

    requestedExistingIds.add(field.id);
  }

  const removedFields = currentFields.filter(
    (field) => !requestedExistingIds.has(field.id),
  );

  const lockedRemoval = removedFields.find(
    (field) => field.used_by_entries,
  );

  if (lockedRemoval) {
    throw httpError(
      409,
      `The field "${lockedRemoval.name}" is already used by an entry and cannot be removed`,
    );
  }

  if (removedFields.length > 0) {
    await client.query(
      `
        UPDATE project_fields
        SET archived_at = NOW(),
            updated_at = NOW()
        WHERE id = ANY($1::uuid[])
      `,
      [removedFields.map((field) => field.id)],
    );
  }

  const activeNames = new Set();

  for (const field of currentFields) {
    if (requestedExistingIds.has(field.id)) {
      activeNames.add(field.name.trim().toLowerCase());
    }
  }

  for (let index = 0; index < requestedFields.length; index += 1) {
    const supplied = requestedFields[index];

    if (supplied?.id) {
      await client.query(
        `
          UPDATE project_fields
          SET position = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [supplied.id, index],
      );

      continue;
    }

    const name = String(
      supplied?.name ?? supplied?.label ?? "",
    ).trim();

    const fieldType =
      supplied?.fieldType ?? supplied?.type;

    if (!name) {
      throw httpError(400, "New field name is required");
    }

    if (name.length > 100) {
      throw httpError(400, "Field name is too long");
    }

    if (!FIELD_TYPES.has(fieldType)) {
      throw httpError(
        400,
        `Unsupported field type: ${fieldType}`,
      );
    }

    const normalizedName = name.toLowerCase();

    if (activeNames.has(normalizedName)) {
      throw httpError(
        409,
        `A field named "${name}" already exists`,
      );
    }

    activeNames.add(normalizedName);

        const formula =
        fieldType === "computed"
          ? String(supplied?.formula ?? "").trim() || null
          : null;

      await client.query(
        `
          INSERT INTO project_fields (
            project_id,
            name,
            field_type,
            formula,
            position,
            required
          )
          VALUES ($1, $2, $3, $4, $5, FALSE)
        `,
        [projectId, name, fieldType, formula, index],
      );
  }
}

// GET /api/projects?status=active|archived|all
router.get("/", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const status = req.query.status || "active";

    if (!["active", "archived", "all"].includes(status)) {
      throw httpError(400, "Invalid project status");
    }

    let archivedClause = "";

    if (status === "active") {
      archivedClause = "AND p.archived_at IS NULL";
    } else if (status === "archived") {
      archivedClause = "AND p.archived_at IS NOT NULL";
    }

    const result = await db.query(
      `
        SELECT
          p.id,
          p.name,
          p.description,
          p.start_date,
          p.end_date,
          p.archived_at,
          p.created_at,
          p.updated_at,
          COUNT(e.id)::int AS total_entries,
          COALESCE(SUM(e.duration_minutes), 0)::int AS logged_minutes,
          MAX(e.occurred_at) AS last_activity
        FROM projects p
        LEFT JOIN entries e
          ON e.project_id = p.id
        WHERE p.owner_id = $1
          ${archivedClause}
        GROUP BY p.id
        ORDER BY
          p.updated_at DESC,
          p.created_at DESC
      `,
      [userId],
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map(mapProject),
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/projects
router.post("/", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const name = cleanProjectName(req.body?.name);
    const description =
      String(req.body?.description ?? "").trim() || null;
    const startDate = cleanOptionalDate(
      req.body?.startDate,
      "Start date",
    );
    const endDate = cleanOptionalDate(
      req.body?.endDate,
      "End date",
    );

    assertDateRange(startDate, endDate);

    const result = await db.query(
      `
        INSERT INTO projects (
          owner_id,
          name,
          description,
          start_date,
          end_date
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          name,
          description,
          start_date,
          end_date,
          archived_at,
          created_at,
          updated_at
      `,
      [
        userId,
        name,
        description,
        startDate,
        endDate,
      ],
    );

    return res.status(201).json({
      success: true,
      data: mapProject({
        ...result.rows[0],
        total_entries: 0,
        logged_minutes: 0,
        last_activity: null,
      }),
    });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/projects/:projectId
// Updates project metadata and the ACTIVE field layout.
// Existing fields that already have entry values cannot be removed.
router.patch("/:projectId", async (req, res, next) => {
  let client = null;

  try {
    const userId = requireUserId(req);
    client = await db.connect();

    await client.query("BEGIN");

    const current = await getOwnedProjectRow(
      client,
      req.params.projectId,
      userId,
    );

    if (!current) {
      throw httpError(404, "Project not found");
    }

    const name =
      req.body?.name === undefined
        ? current.name
        : cleanProjectName(req.body.name);

    const description =
      req.body?.description === undefined
        ? current.description
        : String(req.body.description ?? "").trim() || null;

    const startDate =
      req.body?.startDate === undefined
        ? current.start_date
        : cleanOptionalDate(req.body.startDate, "Start date");

    const endDate =
      req.body?.endDate === undefined
        ? current.end_date
        : cleanOptionalDate(req.body.endDate, "End date");

    assertDateRange(startDate, endDate);

    await client.query(
      `
        UPDATE projects
        SET name = $3,
            description = $4,
            start_date = $5,
            end_date = $6,
            updated_at = NOW()
        WHERE id = $1
          AND owner_id = $2
      `,
      [
        req.params.projectId,
        userId,
        name,
        description,
        startDate,
        endDate,
      ],
    );

    if (req.body?.fields !== undefined) {
      await syncProjectFields(
        client,
        req.params.projectId,
        req.body.fields,
      );
    }

    const updated = await getOwnedProjectRow(
      client,
      req.params.projectId,
      userId,
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      data: mapProject({
        ...updated,
        total_entries: 0,
        logged_minutes: 0,
        last_activity: null,
      }),
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {
        // Ignore rollback errors and preserve the original error.
      }
    }

    return next(error);
  } finally {
    client?.release();
  }
});

// PATCH /api/projects/:projectId/archive
// Body: { archived: true } or { archived: false }
router.patch("/:projectId/archive", async (req, res, next) => {
  try {
    const userId = requireUserId(req);
    const archived = req.body?.archived !== false;

    const result = await db.query(
      `
        UPDATE projects
        SET archived_at = CASE
              WHEN $3::boolean THEN NOW()
              ELSE NULL
            END,
            updated_at = NOW()
        WHERE id = $1
          AND owner_id = $2
        RETURNING
          id,
          name,
          description,
          start_date,
          end_date,
          archived_at,
          created_at,
          updated_at
      `,
      [req.params.projectId, userId, archived],
    );

    if (result.rowCount === 0) {
      throw httpError(404, "Project not found");
    }

    return res.status(200).json({
      success: true,
      data: mapProject({
        ...result.rows[0],
        total_entries: 0,
        logged_minutes: 0,
        last_activity: null,
      }),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
