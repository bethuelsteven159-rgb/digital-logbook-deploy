const db = require("../db");

function createRepository(queryable) {
  return {
    async getLogbook(userId) {
      const projects = await queryable.query(
        `SELECT id, name, description, start_date, end_date, archived_at, created_at, updated_at
         FROM projects
         WHERE owner_id = $1
         ORDER BY created_at, id`,
        [userId],
      );

      const projectIds = projects.rows.map((row) => row.id);

      if (!projectIds.length) {
        return {
          projects: [],
          fields: [],
          entries: [],
          values: [],
          checklist: [],
          references: [],
        };
      }

      const [fields, entries, values, checklist, references] =
        await Promise.all([
          queryable.query(
            `SELECT id, project_id, name, field_type, position, required, archived_at, created_at, updated_at
             FROM project_fields
             WHERE project_id = ANY($1::uuid[])
             ORDER BY project_id, position, created_at`,
            [projectIds],
          ),

          queryable.query(
            `SELECT id, project_id, name, duration_minutes, occurred_at, created_at, updated_at
             FROM entries
             WHERE project_id = ANY($1::uuid[])
             ORDER BY project_id, occurred_at, created_at, id`,
            [projectIds],
          ),

          queryable.query(
            `SELECT v.id,
                    v.entry_id,
                    v.field_id,
                    v.value_text,
                    v.value_number,
                    v.value_date,
                    v.created_at
             FROM entry_field_values v
             JOIN entries e ON e.id = v.entry_id
             WHERE e.project_id = ANY($1::uuid[])
             ORDER BY v.entry_id, v.created_at, v.id`,
            [projectIds],
          ),

          queryable.query(
            `SELECT c.id,
                    c.entry_id,
                    c.text,
                    c.completed,
                    c.position,
                    c.created_at,
                    c.updated_at
             FROM entry_checklist_items c
             JOIN entries e ON e.id = c.entry_id
             WHERE e.project_id = ANY($1::uuid[])
             ORDER BY c.entry_id, c.position, c.created_at, c.id`,
            [projectIds],
          ),

          queryable.query(
            `SELECT r.id,
                    r.entry_id,
                    r.referenced_project_id,
                    r.created_at
             FROM entry_project_references r
             JOIN entries e ON e.id = r.entry_id
             JOIN projects target ON target.id = r.referenced_project_id
             WHERE e.project_id = ANY($1::uuid[])
               AND target.owner_id = $2
             ORDER BY r.entry_id, r.created_at, r.id`,
            [projectIds, userId],
          ),
        ]);

      return {
        projects: projects.rows,
        fields: fields.rows,
        entries: entries.rows,
        values: values.rows,
        checklist: checklist.rows,
        references: references.rows,
      };
    },

    async insertImportedLogbook(userId, data) {
      const projectMap = new Map();
      const fieldMap = new Map();
      const entryMap = new Map();

      let projectsImported = 0;
      let projectsUpdated = 0;

      let fieldsImported = 0;
      let fieldsUpdated = 0;

      let entriesImported = 0;
      let entriesUpdated = 0;

      let valuesImported = 0;
      let valuesUpdated = 0;

      let checklistImported = 0;
      let checklistUpdated = 0;

      let referencesImported = 0;

      /*
       * Projects
       *
       * The exported UUID is used as the stable identifier.
       *
       * If the project already belongs to this user, update it.
       * Otherwise create it using the exported UUID.
       */
      for (const project of data.projects) {
        const existing = await queryable.query(
          `SELECT id
           FROM projects
           WHERE id = $1
             AND owner_id = $2`,
          [project.id, userId],
        );

        if (existing.rows.length > 0) {
          await queryable.query(
            `UPDATE projects
             SET name = $1,
                 description = $2,
                 start_date = $3,
                 end_date = $4,
                 archived_at = $5,
                 created_at = COALESCE($6::timestamptz, created_at),
                 updated_at = COALESCE($7::timestamptz, NOW())
             WHERE id = $8
               AND owner_id = $9`,
            [
              project.name,
              project.description ?? null,
              project.startDate ?? null,
              project.endDate ?? null,
              project.archivedAt ?? null,
              project.createdAt ?? null,
              project.updatedAt ?? null,
              project.id,
              userId,
            ],
          );

          projectMap.set(project.id, project.id);
          projectsUpdated += 1;
        } else {
          await queryable.query(
            `INSERT INTO projects
               (id, owner_id, name, description, start_date, end_date, archived_at, created_at, updated_at)
             VALUES
               ($1, $2, $3, $4, $5, $6, $7,
                COALESCE($8::timestamptz, NOW()),
                COALESCE($9::timestamptz, NOW()))`,
            [
              project.id,
              userId,
              project.name,
              project.description ?? null,
              project.startDate ?? null,
              project.endDate ?? null,
              project.archivedAt ?? null,
              project.createdAt ?? null,
              project.updatedAt ?? null,
            ],
          );

          projectMap.set(project.id, project.id);
          projectsImported += 1;
        }
      }

      /*
       * Project fields
       */
      for (const field of data.fields) {
        const projectId = projectMap.get(field.projectId);

        if (!projectId) {
          continue;
        }

        const existing = await queryable.query(
          `SELECT id
           FROM project_fields
           WHERE id = $1
             AND project_id = $2`,
          [field.id, projectId],
        );

        if (existing.rows.length > 0) {
          await queryable.query(
            `UPDATE project_fields
             SET name = $1,
                 field_type = $2,
                 position = $3,
                 required = $4,
                 archived_at = $5,
                 created_at = COALESCE($6::timestamptz, created_at),
                 updated_at = COALESCE($7::timestamptz, NOW())
             WHERE id = $8
               AND project_id = $9`,
            [
              field.name,
              field.fieldType,
              field.position ?? 0,
              Boolean(field.required),
              field.archivedAt ?? null,
              field.createdAt ?? null,
              field.updatedAt ?? null,
              field.id,
              projectId,
            ],
          );

          fieldMap.set(field.id, field.id);
          fieldsUpdated += 1;
        } else {
          await queryable.query(
            `INSERT INTO project_fields
               (id, project_id, name, field_type, position, required, archived_at, created_at, updated_at)
             VALUES
               ($1, $2, $3, $4, $5, $6, $7,
                COALESCE($8::timestamptz, NOW()),
                COALESCE($9::timestamptz, NOW()))`,
            [
              field.id,
              projectId,
              field.name,
              field.fieldType,
              field.position ?? 0,
              Boolean(field.required),
              field.archivedAt ?? null,
              field.createdAt ?? null,
              field.updatedAt ?? null,
            ],
          );

          fieldMap.set(field.id, field.id);
          fieldsImported += 1;
        }
      }

      /*
       * Entries
       */
      for (const entry of data.entries) {
        const projectId = projectMap.get(entry.projectId);

        if (!projectId) {
          continue;
        }

        const existing = await queryable.query(
          `SELECT id
           FROM entries
           WHERE id = $1
             AND project_id = $2
             AND created_by_id = $3`,
          [entry.id, projectId, userId],
        );

        if (existing.rows.length > 0) {
          await queryable.query(
            `UPDATE entries
             SET name = $1,
                 duration_minutes = $2,
                 occurred_at = COALESCE($3::timestamptz, occurred_at),
                 created_at = COALESCE($4::timestamptz, created_at),
                 updated_at = COALESCE($5::timestamptz, NOW())
             WHERE id = $6
               AND project_id = $7
               AND created_by_id = $8`,
            [
              entry.name,
              entry.durationMinutes,
              entry.occurredAt ?? null,
              entry.createdAt ?? null,
              entry.updatedAt ?? null,
              entry.id,
              projectId,
              userId,
            ],
          );

          entryMap.set(entry.id, entry.id);
          entriesUpdated += 1;
        } else {
          await queryable.query(
            `INSERT INTO entries
               (id, project_id, created_by_id, name, duration_minutes, occurred_at, created_at, updated_at)
             VALUES
               ($1, $2, $3, $4, $5,
                COALESCE($6::timestamptz, NOW()),
                COALESCE($7::timestamptz, NOW()),
                COALESCE($8::timestamptz, NOW()))`,
            [
              entry.id,
              projectId,
              userId,
              entry.name,
              entry.durationMinutes,
              entry.occurredAt ?? null,
              entry.createdAt ?? null,
              entry.updatedAt ?? null,
            ],
          );

          entryMap.set(entry.id, entry.id);
          entriesImported += 1;
        }
      }

      /*
       * Entry field values
       *
       * A value belongs to an entry + field combination.
       */
      for (const value of data.values) {
        const entryId = entryMap.get(value.entryId);
        const fieldId = fieldMap.get(value.fieldId);

        if (!entryId || !fieldId) {
          continue;
        }

        const existing = await queryable.query(
          `SELECT id
           FROM entry_field_values
           WHERE entry_id = $1
             AND field_id = $2`,
          [entryId, fieldId],
        );

        if (existing.rows.length > 0) {
          await queryable.query(
            `UPDATE entry_field_values
             SET value_text = $1,
                 value_number = $2,
                 value_date = $3,
                 created_at = COALESCE($4::timestamptz, created_at)
             WHERE entry_id = $5
               AND field_id = $6`,
            [
              value.valueText ?? null,
              value.valueNumber ?? null,
              value.valueDate ?? null,
              value.createdAt ?? null,
              entryId,
              fieldId,
            ],
          );

          valuesUpdated += 1;
        } else {
          await queryable.query(
            `INSERT INTO entry_field_values
               (entry_id, field_id, value_text, value_number, value_date, created_at)
             VALUES
               ($1, $2, $3, $4, $5,
                COALESCE($6::timestamptz, NOW()))`,
            [
              entryId,
              fieldId,
              value.valueText ?? null,
              value.valueNumber ?? null,
              value.valueDate ?? null,
              value.createdAt ?? null,
            ],
          );

          valuesImported += 1;
        }
      }

      /*
       * Checklist items
       */
      for (const item of data.checklist) {
        const entryId = entryMap.get(item.entryId);

        if (!entryId) {
          continue;
        }

        const existing = await queryable.query(
          `SELECT id
           FROM entry_checklist_items
           WHERE id = $1
             AND entry_id = $2`,
          [item.id, entryId],
        );

        if (existing.rows.length > 0) {
          await queryable.query(
            `UPDATE entry_checklist_items
             SET text = $1,
                 completed = $2,
                 position = $3,
                 created_at = COALESCE($4::timestamptz, created_at),
                 updated_at = COALESCE($5::timestamptz, NOW())
             WHERE id = $6
               AND entry_id = $7`,
            [
              item.text,
              Boolean(item.completed),
              item.position ?? 0,
              item.createdAt ?? null,
              item.updatedAt ?? null,
              item.id,
              entryId,
            ],
          );

          checklistUpdated += 1;
        } else {
          await queryable.query(
            `INSERT INTO entry_checklist_items
               (id, entry_id, text, completed, position, created_at, updated_at)
             VALUES
               ($1, $2, $3, $4, $5,
                COALESCE($6::timestamptz, NOW()),
                COALESCE($7::timestamptz, NOW()))`,
            [
              item.id,
              entryId,
              item.text,
              Boolean(item.completed),
              item.position ?? 0,
              item.createdAt ?? null,
              item.updatedAt ?? null,
            ],
          );

          checklistImported += 1;
        }
      }

      /*
       * Project references attached to entries.
       *
       * References are unique by entry + referenced project.
       * Existing references are left alone.
       */
      for (const reference of data.references) {
        const entryId = entryMap.get(reference.entryId);
        const referencedProjectId = projectMap.get(
          reference.referencedProjectId,
        );

        if (!entryId || !referencedProjectId) {
          continue;
        }

        const result = await queryable.query(
          `INSERT INTO entry_project_references
             (entry_id, referenced_project_id, created_at)
           VALUES
             ($1, $2, COALESCE($3::timestamptz, NOW()))
           ON CONFLICT (entry_id, referenced_project_id)
           DO NOTHING`,
          [
            entryId,
            referencedProjectId,
            reference.createdAt ?? null,
          ],
        );

        if (result.rowCount > 0) {
          referencesImported += 1;
        }
      }

      return {
        projectsImported,
        projectsUpdated,

        fieldsImported,
        fieldsUpdated,

        entriesImported,
        entriesUpdated,

        valuesImported,
        valuesUpdated,

        checklistImported,
        checklistUpdated,

        referencesImported,
      };
    },
  };
}

const repository = createRepository(db);

repository.withTransaction = async function withTransaction(work) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const txRepository = createRepository(client);

    const result = await work(txRepository);

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