const db = require("../db");

const DEFINITION_COLUMNS = `
  d.id, d.project_id, d.created_by_id, d.name,
  d.duration_minutes, d.tags, d.checklist,
  d.frequency, d.interval_count,
  d.starts_on::text AS starts_on,
  d.ends_on::text AS ends_on,
  d.enabled,
  d.last_generated_on::text AS last_generated_on,
  d.created_at, d.updated_at
`;

const UPDATE_COLUMNS = {
  name: "name",
  durationMinutes: "duration_minutes",
  tags: "tags",
  checklist: "checklist",
  frequency: "frequency",
  intervalCount: "interval_count",
  startsOn: "starts_on",
  endsOn: "ends_on",
  enabled: "enabled",
};

function mapDefinition(row) {
  if (!row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    createdById: row.created_by_id,
    name: row.name,
    durationMinutes: row.duration_minutes,
    tags: row.tags || [],
    checklist: Array.isArray(row.checklist)
      ? row.checklist
      : [],
    frequency: row.frequency,
    intervalCount: row.interval_count,
    startsOn: row.starts_on,
    endsOn: row.ends_on ?? null,
    enabled: Boolean(row.enabled),
    lastGeneratedOn: row.last_generated_on ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function insertChecklistItems(
  queryable,
  entryId,
  items,
) {
  for (let index = 0; index < items.length; index += 1) {
    await queryable.query(
      `INSERT INTO entry_checklist_items
         (entry_id, text, completed, position)
       VALUES ($1, $2, FALSE, $3)`,
      [entryId, items[index].text, index],
    );
  }

  return items.length;
}

function createRepository(queryable) {
  return {
    // "Owned" here means owned OR shared with the caller via
    // project_collaborators, so collaborators get the same access.
    async getOwnedProject(projectId, userId) {
      const result = await queryable.query(
        `SELECT id, owner_id, name, archived_at
         FROM projects
         WHERE id = $1
           AND (
             owner_id = $2
             OR EXISTS (
               SELECT 1
               FROM project_collaborators pc
               WHERE pc.project_id = projects.id
                 AND pc.user_id = $2
             )
           )
         LIMIT 1`,
        [projectId, userId],
      );

      const row = result.rows[0];

      if (!row) return null;

      return {
        id: row.id,
        ownerId: row.owner_id,
        name: row.name,
        archivedAt: row.archived_at,
      };
    },

    async listDefinitions(projectId) {
      const result = await queryable.query(
        `SELECT ${DEFINITION_COLUMNS}
         FROM recurring_entry_definitions d
         WHERE d.project_id = $1
         ORDER BY d.created_at DESC, d.id ASC`,
        [projectId],
      );

      return result.rows.map(mapDefinition);
    },

    async listEnabledDefinitions(projectId) {
      const result = await queryable.query(
        `SELECT ${DEFINITION_COLUMNS}
         FROM recurring_entry_definitions d
         WHERE d.project_id = $1
           AND d.enabled = TRUE
         ORDER BY d.starts_on ASC, d.created_at ASC,
                  d.id ASC`,
        [projectId],
      );

      return result.rows.map(mapDefinition);
    },

    async getDefinitionById(definitionId) {
      const result = await queryable.query(
        `SELECT ${DEFINITION_COLUMNS}
         FROM recurring_entry_definitions d
         WHERE d.id = $1
         LIMIT 1`,
        [definitionId],
      );

      return mapDefinition(result.rows[0]);
    },

    async getDefinitionWithOwner(definitionId) {
      const result = await queryable.query(
        `SELECT ${DEFINITION_COLUMNS},
                p.owner_id AS project_owner_id,
                p.archived_at AS project_archived_at
         FROM recurring_entry_definitions d
         JOIN projects p ON p.id = d.project_id
         WHERE d.id = $1
         LIMIT 1`,
        [definitionId],
      );

      const row = result.rows[0];

      if (!row) return null;

      return {
        ...mapDefinition(row),
        projectOwnerId: row.project_owner_id,
        projectArchivedAt:
          row.project_archived_at ?? null,
      };
    },

    async createDefinition(data) {
      const result = await queryable.query(
        `INSERT INTO recurring_entry_definitions
           (project_id, created_by_id, name,
            duration_minutes, tags, checklist,
            frequency, interval_count,
            starts_on, ends_on, enabled)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb,
                 $7, $8, $9::date, $10::date, $11)
         RETURNING id`,
        [
          data.projectId,
          data.createdById,
          data.name,
          data.durationMinutes,
          data.tags || [],
          JSON.stringify(data.checklist || []),
          data.frequency,
          data.intervalCount,
          data.startsOn,
          data.endsOn ?? null,
          data.enabled !== false,
        ],
      );

      return this.getDefinitionById(
        result.rows[0].id,
      );
    },

    async updateDefinition(definitionId, changes) {
      const assignments = [];
      const params = [];

      for (const [key, column] of Object.entries(
        UPDATE_COLUMNS,
      )) {
        if (changes[key] === undefined) continue;

        const value =
          key === "checklist"
            ? JSON.stringify(changes[key])
            : changes[key];

        params.push(value);
        assignments.push(
          `${column} = $${params.length}`,
        );
      }

      params.push(definitionId);

      const result = await queryable.query(
        `UPDATE recurring_entry_definitions
         SET ${assignments.join(", ")},
             updated_at = NOW()
         WHERE id = $${params.length}
         RETURNING id`,
        params,
      );

      if (!result.rows[0]) return null;

      return this.getDefinitionById(
        result.rows[0].id,
      );
    },

    async deleteDefinition(definitionId) {
      const result = await queryable.query(
        `DELETE FROM recurring_entry_definitions
         WHERE id = $1
         RETURNING id`,
        [definitionId],
      );

      return result.rows[0]?.id ?? null;
    },

    async createRecurringOccurrence(data) {
      const result = await queryable.query(
        `INSERT INTO entries
           (project_id, created_by_id, name,
            duration_minutes, occurred_at, tags,
            recurring_definition_id, recurrence_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date)
         ON CONFLICT (recurring_definition_id, recurrence_date)
           WHERE recurring_definition_id IS NOT NULL
           DO NOTHING
         RETURNING id, recurrence_date::text AS recurrence_date`,
        [
          data.projectId,
          data.createdById,
          data.name,
          data.durationMinutes,
          `${data.recurrenceDate}T00:00:00.000Z`,
          data.tags || [],
          data.definitionId,
          data.recurrenceDate,
        ],
      );

      const row = result.rows[0];

      if (!row) return null;

      if (Array.isArray(data.checklist) && data.checklist.length) {
        await insertChecklistItems(
          queryable,
          row.id,
          data.checklist,
        );
      }

      return {
        id: row.id,
        recurrenceDate: row.recurrence_date,
      };
    },

    async advanceWatermark(definitionId, isoDate) {
      await queryable.query(
        `UPDATE recurring_entry_definitions
         SET last_generated_on = GREATEST(
               COALESCE(last_generated_on, $2::date),
               $2::date
             ),
             updated_at = NOW()
         WHERE id = $1`,
        [definitionId, isoDate],
      );
    },
  };
}

const repository = createRepository(db);

repository.withTransaction =
  async function withTransaction(work) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const transactionRepository =
        createRepository(client);

      const result = await work(
        transactionRepository,
      );

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
