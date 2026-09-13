const db = require("../db");

function mapProject(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapField(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    fieldType: row.field_type,
    formula: row.formula,
    position: row.position,
    required: row.required,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEntryRow(row) {
  return {
    id: row.entry_id,
    projectId: row.project_id,
    createdById: row.created_by_id,
    name: row.entry_name,
    durationMinutes: row.duration_minutes,
    occurredAt: row.occurred_at,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.entry_created_at,
    updatedAt: row.entry_updated_at,
  };
}

function buildEntryFromRows(rows) {
  if (rows.length === 0) {
    return null;
  }

  const entry = mapEntryRow(rows[0]);

  entry.values = rows
    .filter((row) => row.value_id !== null)
    .map((row) => ({
      id: row.value_id,
      entryId: row.entry_id,
      fieldId: row.field_id,
      valueText: row.value_text,
      valueNumber: row.value_number,
      valueDate: row.value_date,
      createdAt: row.value_created_at,
      field: {
        id: row.field_id,
        name: row.field_name,
        fieldType: row.field_type,
      },
    }));

  return entry;
}

function groupEntries(rows) {
  const groups = new Map();

  for (const row of rows) {
    if (!groups.has(row.entry_id)) {
      groups.set(row.entry_id, []);
    }

    groups.get(row.entry_id).push(row);
  }

  return Array.from(groups.values()).map(buildEntryFromRows);
}

function createRepository(queryable) {
  return {
    async getOwnedProject(projectId, userId) {
      const result = await queryable.query(
        `
          SELECT
            id,
            owner_id,
            name,
            description,
            archived_at,
            created_at,
            updated_at
          FROM projects
          WHERE id = $1 AND owner_id = $2
          LIMIT 1
        `,
        [projectId, userId],
      );

      return mapProject(result.rows[0]);
    },

    async getProjectFields(projectId) {
      const result = await queryable.query(
        `
          SELECT
            id,
            project_id,
            name,
            field_type,
            formula,
            position,
            required,
            archived_at,
            created_at,
            updated_at
          FROM project_fields
          WHERE project_id = $1
            AND archived_at IS NULL
          ORDER BY position ASC
        `,
        [projectId],
      );

      return result.rows.map(mapField);
  },

    async getProjectStats(projectId) {
      const result = await queryable.query(
        `
          SELECT
            COUNT(*)::int AS total_entries,
            COALESCE(SUM(duration_minutes), 0)::int AS logged_minutes,
            MAX(occurred_at) AS last_activity
          FROM entries
          WHERE project_id = $1
        `,
        [projectId],
      );

      const row = result.rows[0];

      return {
        totalEntries: row.total_entries,
        loggedMinutes: row.logged_minutes,
        lastActivity: row.last_activity,
      };
    },

    async getProjectEntries(projectId) {
      const result = await queryable.query(
        `
          SELECT
            e.id AS entry_id,
            e.project_id,
            e.created_by_id,
            e.name AS entry_name,
            e.duration_minutes,
            e.occurred_at,
            e.due_at,
            e.completed_at,
            e.created_at AS entry_created_at,
            e.updated_at AS entry_updated_at,
            v.id AS value_id,
            v.field_id,
            v.value_text,
            v.value_number,
            v.value_date,
            v.created_at AS value_created_at,
            f.name AS field_name,
            f.field_type
          FROM entries e
          LEFT JOIN entry_field_values v
            ON v.entry_id = e.id
          LEFT JOIN project_fields f
            ON f.id = v.field_id
          WHERE e.project_id = $1
          ORDER BY
            e.occurred_at DESC,
            e.created_at DESC,
            v.created_at ASC
        `,
        [projectId],
      );

      return groupEntries(result.rows);
    },
    async getOutstandingEntries(projectId) {
      const result = await queryable.query(
        `
          SELECT
            e.id AS entry_id,
            e.project_id,
            e.created_by_id,
            e.name AS entry_name,
            e.duration_minutes,
            e.occurred_at,
            e.due_at,
            e.completed_at,
            e.created_at AS entry_created_at,
            e.updated_at AS entry_updated_at,
            v.id AS value_id,
            v.field_id,
            v.value_text,
            v.value_number,
            v.value_date,
            v.created_at AS value_created_at,
            f.name AS field_name,
            f.field_type
          FROM entries e
          LEFT JOIN entry_field_values v
            ON v.entry_id = e.id
          LEFT JOIN project_fields f
            ON f.id = v.field_id
          WHERE e.project_id = $1
            AND e.due_at IS NOT NULL
            AND e.due_at < NOW()
            AND e.completed_at IS NULL
          ORDER BY
            e.due_at ASC,
            v.created_at ASC
        `,
        [projectId],
      );

      return groupEntries(result.rows);
    },

        async markEntryComplete(entryId, projectId) {
      const result = await queryable.query(
        `
          UPDATE entries
          SET completed_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
            AND project_id = $2
          RETURNING id
        `,
        [entryId, projectId],
      );

      return result.rowCount > 0;
    },

        async getIncompleteEntries(projectId) {
      const result = await queryable.query(
        `
          SELECT
            e.id AS entry_id,
            e.project_id,
            e.created_by_id,
            e.name AS entry_name,
            e.duration_minutes,
            e.occurred_at,
            e.due_at,
            e.completed_at,
            e.created_at AS entry_created_at,
            e.updated_at AS entry_updated_at,
            v.id AS value_id,
            v.field_id,
            v.value_text,
            v.value_number,
            v.value_date,
            v.created_at AS value_created_at,
            f.name AS field_name,
            f.field_type
          FROM entries e
          LEFT JOIN entry_field_values v
            ON v.entry_id = e.id
          LEFT JOIN project_fields f
            ON f.id = v.field_id
          WHERE e.project_id = $1
            AND e.completed_at IS NULL
          ORDER BY
            e.due_at ASC NULLS LAST,
            e.occurred_at DESC
        `,
        [projectId],
      );

      return groupEntries(result.rows);
    },

    async getEntriesByIdsForProject(projectId, entryIds) {
      if (!entryIds || entryIds.length === 0) {
        return [];
      }

      const result = await queryable.query(
        `
          SELECT id, name
          FROM entries
          WHERE project_id = $1
            AND id = ANY($2::uuid[])
        `,
        [projectId, entryIds],
      );

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
      }));
    },

    async getProjectEntryLinks(projectId) {
      const result = await queryable.query(
        `
          SELECT
            l.source_entry_id,
            source.name AS source_name,
            l.target_entry_id,
            target.name AS target_name
          FROM entry_links l
          JOIN entries source ON source.id = l.source_entry_id
          JOIN entries target ON target.id = l.target_entry_id
          WHERE source.project_id = $1
            AND target.project_id = $1
          ORDER BY l.created_at ASC
        `,
        [projectId],
      );

      return result.rows.map((row) => ({
        sourceEntryId: row.source_entry_id,
        sourceName: row.source_name,
        targetEntryId: row.target_entry_id,
        targetName: row.target_name,
      }));
    },

    async createEntryLinks(entryId, linkedEntryIds) {
      for (const linkedEntryId of linkedEntryIds) {
        await queryable.query(
          `
            INSERT INTO entry_links (source_entry_id, target_entry_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
          `,
          [entryId, linkedEntryId],
        );
      }

      return linkedEntryIds.length;
    },

    async createProjectField(data) {
      const result = await queryable.query(
        `
          INSERT INTO project_fields (
            project_id,
            name,
            field_type,
            formula,
            position,
            required
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING
            id,
            project_id,
            name,
            field_type,
            formula,
            position,
            required,
            archived_at,
            created_at,
            updated_at
        `,
        [
          data.projectId,
          data.name,
          data.fieldType,
          data.formula ?? null,
          data.position,
          data.required ?? false,
        ],
      );

      return mapField(result.rows[0]);
    },
 async createEntry(data) {
  const result = await queryable.query(
    `
      INSERT INTO entries (
        project_id,
        created_by_id,
        name,
        duration_minutes,
        due_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        project_id,
        created_by_id,
        name,
        duration_minutes,
        occurred_at,
        due_at,
        completed_at,
        created_at,
        updated_at
    `,
    [
      data.projectId,
      data.createdById,
      data.name,
      data.durationMinutes,
      data.dueAt ?? null,
    ],
  );

  const row = result.rows[0];

    return {
      id: row.id,
      projectId: row.project_id,
      createdById: row.created_by_id,
      name: row.name,
      durationMinutes: row.duration_minutes,
      occurredAt: row.occurred_at,
      dueAt: row.due_at,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

    async createEntryFieldValues(values) {
      for (const value of values) {
        await queryable.query(
          `
            INSERT INTO entry_field_values (
              entry_id,
              field_id,
              value_text,
              value_number,
              value_date
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            value.entryId,
            value.fieldId,
            value.valueText ?? null,
            value.valueNumber ?? null,
            value.valueDate ?? null,
          ],
        );
      }

      return values.length;
    },

    async getEntryById(entryId) {
      const result = await queryable.query(
        `
          SELECT
            e.id AS entry_id,
            e.project_id,
            e.created_by_id,
            e.name AS entry_name,
            e.duration_minutes,
            e.occurred_at,
            e.due_at,
            e.completed_at,
            e.created_at AS entry_created_at,
            e.updated_at AS entry_updated_at,
            v.id AS value_id,
            v.field_id,
            v.value_text,
            v.value_number,
            v.value_date,
            v.created_at AS value_created_at,
            f.name AS field_name,
            f.field_type
          FROM entries e
          LEFT JOIN entry_field_values v
            ON v.entry_id = e.id
          LEFT JOIN project_fields f
            ON f.id = v.field_id
          WHERE e.id = $1
          ORDER BY v.created_at ASC
        `,
        [entryId],
      );

      return buildEntryFromRows(result.rows);
    },
  };
}

const repository = createRepository(db);

repository.withTransaction = async function withTransaction(work) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const transactionRepository = createRepository(client);
    const result = await work(transactionRepository);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = repository;

