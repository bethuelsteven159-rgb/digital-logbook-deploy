const db = require("../db");

function mapProject(row) {
  if (!row) return null;

  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapField(row) {
  if (!row) return null;

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
    usedByEntries: Boolean(row.used_by_entries),
  };
}

function mapChecklist(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    text: row.text,
    completed: row.completed,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEntryProjectReference(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    projectId: row.referenced_project_id,
    projectName: row.project_name,
    createdAt: row.created_at,
  };
}

function mapProjectReference(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    referencedProjectId: row.referenced_project_id,
    referencedProjectName: row.referenced_project_name,
    createdAt: row.created_at,
  };
}

function mapEntryReference(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    referencedEntryId: row.referenced_entry_id,
    referencedEntryName: row.referenced_entry_name,
    referencedProjectId: row.referenced_project_id,
    referencedProjectName: row.referenced_project_name,
    createdAt: row.created_at,
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
    tags: row.tags || [],
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.entry_created_at,
    updatedAt: row.entry_updated_at,
  };
}

function buildEntryFromRows(rows) {
  if (rows.length === 0) return null;

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
        archivedAt: row.field_archived_at,
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

async function attachEntryFeatures(queryable, entries) {
  if (entries.length === 0) {
    return entries;
  }

  const entryIds = entries.map((entry) => entry.id);

  const [
    checklists,
    projectReferences,
    entryReferences,
  ] = await Promise.all([
    queryable.query(
      `SELECT id, entry_id, text, completed, position,
              created_at, updated_at
       FROM entry_checklist_items
       WHERE entry_id = ANY($1::uuid[])
       ORDER BY entry_id, position, created_at`,
      [entryIds],
    ),

    queryable.query(
      `SELECT r.id,
              r.entry_id,
              r.referenced_project_id,
              r.created_at,
              p.name AS project_name
       FROM entry_project_references r
       JOIN projects p
         ON p.id = r.referenced_project_id
       WHERE r.entry_id = ANY($1::uuid[])
       ORDER BY r.created_at`,
      [entryIds],
    ),

    queryable.query(
      `SELECT r.id,
              r.entry_id,
              r.referenced_entry_id,
              r.created_at,
              e.name AS referenced_entry_name,
              e.project_id AS referenced_project_id,
              p.name AS referenced_project_name
       FROM entry_entry_references r
       JOIN entries e
         ON e.id = r.referenced_entry_id
       JOIN projects p
         ON p.id = e.project_id
       WHERE r.entry_id = ANY($1::uuid[])
       ORDER BY r.created_at`,
      [entryIds],
    ),
  ]);

  const checklistByEntry = new Map();

  for (const row of checklists.rows) {
    if (!checklistByEntry.has(row.entry_id)) {
      checklistByEntry.set(row.entry_id, []);
    }

    checklistByEntry.get(row.entry_id).push(mapChecklist(row));
  }

  const projectReferencesByEntry = new Map();

  for (const row of projectReferences.rows) {
    if (!projectReferencesByEntry.has(row.entry_id)) {
      projectReferencesByEntry.set(row.entry_id, []);
    }

    projectReferencesByEntry
      .get(row.entry_id)
      .push(mapEntryProjectReference(row));
  }

  const entryReferencesByEntry = new Map();

  for (const row of entryReferences.rows) {
    if (!entryReferencesByEntry.has(row.entry_id)) {
      entryReferencesByEntry.set(row.entry_id, []);
    }

    entryReferencesByEntry
      .get(row.entry_id)
      .push(mapEntryReference(row));
  }

  for (const entry of entries) {
    entry.checklist =
      checklistByEntry.get(entry.id) || [];

    entry.references =
      projectReferencesByEntry.get(entry.id) || [];

    entry.entryReferences =
      entryReferencesByEntry.get(entry.id) || [];
  }

  return entries;
}

function createRepository(queryable) {
  return {
    async getOwnedProject(projectId, userId, lock = false) {
      const result = await queryable.query(
        `SELECT id, owner_id, name, description,
                start_date, end_date, archived_at,
                created_at, updated_at
         FROM projects
         WHERE id = $1
           AND owner_id = $2
         LIMIT 1
         ${lock ? 'FOR UPDATE' : ''}`,
        [projectId, userId],
      );

      return mapProject(result.rows[0]);
    },

    async getOwnedProjectIds(projectIds, userId) {
      if (!projectIds.length) return [];

      const result = await queryable.query(
        `SELECT id
         FROM projects
         WHERE owner_id = $1
           AND id = ANY($2::uuid[])`,
        [userId, projectIds],
      );

      return result.rows.map((row) => row.id);
    },

    async getProjectFields(projectId, { includeArchived = false } = {}) {
      const result = await queryable.query(
        `SELECT pf.id, pf.project_id, pf.name, pf.field_type,
                pf.formula, pf.position, pf.required, pf.archived_at,
                pf.created_at, pf.updated_at,
                EXISTS (
                  SELECT 1
                  FROM entry_field_values ev
                  JOIN entries e ON e.id = ev.entry_id
                  WHERE ev.field_id = pf.id
                    AND e.project_id = pf.project_id
                ) AS used_by_entries
         FROM project_fields pf
         WHERE pf.project_id = $1
           AND ($2::boolean OR pf.archived_at IS NULL)
         ORDER BY pf.position ASC`,
        [projectId, includeArchived],
      );

      return result.rows.map(mapField);
    },

    async getProjectStats(projectId) {
      const result = await queryable.query(
        `SELECT COUNT(*)::int AS total_entries,
                COALESCE(
                  SUM(duration_minutes),
                  0
                )::int AS logged_minutes,
                MAX(occurred_at) AS last_activity
         FROM entries
         WHERE project_id = $1`,
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
        `SELECT e.id AS entry_id,
                e.project_id,
                e.created_by_id,
                e.name AS entry_name,
                e.duration_minutes,
                e.occurred_at,
                e.tags,
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
                f.archived_at AS field_archived_at,
                f.field_type
         FROM entries e
         LEFT JOIN entry_field_values v
           ON v.entry_id = e.id
         LEFT JOIN project_fields f
           ON f.id = v.field_id
         WHERE e.project_id = $1
         ORDER BY e.occurred_at DESC,
                  e.created_at DESC,
                  v.created_at ASC`,
        [projectId],
      );

      const entries = groupEntries(result.rows);

      return attachEntryFeatures(
        queryable,
        entries,
      );
    },

    async getOutstandingEntries(projectId) {
      const result = await queryable.query(
        `SELECT e.id AS entry_id,
                e.project_id,
                e.created_by_id,
                e.name AS entry_name,
                e.duration_minutes,
                e.occurred_at,
                e.tags,
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
                f.archived_at AS field_archived_at,
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
         ORDER BY e.due_at ASC,
                  v.created_at ASC`,
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

    async getProjectReferences(projectId) {
      const result = await queryable.query(
        `SELECT r.id,
                r.project_id,
                r.referenced_project_id,
                r.created_at,
                p.name AS referenced_project_name
         FROM project_project_references r
         JOIN projects p
           ON p.id = r.referenced_project_id
         WHERE r.project_id = $1
         ORDER BY r.created_at`,
        [projectId],
      );

      return result.rows.map(mapProjectReference);
    },

    async createProjectReferences(
      projectId,
      projectIds,
    ) {
      for (const referencedProjectId of projectIds) {
        await queryable.query(
          `INSERT INTO project_project_references
             (project_id, referenced_project_id)
           VALUES ($1, $2)
           ON CONFLICT
             (project_id, referenced_project_id)
           DO NOTHING`,
          [
            projectId,
            referencedProjectId,
          ],
        );
      }

      return projectIds.length;
    },

    async removeProjectReferences(
      projectId,
      projectIds,
    ) {
      if (!projectIds.length) return 0;

      const result = await queryable.query(
        `DELETE FROM project_project_references
         WHERE project_id = $1
           AND referenced_project_id = ANY($2::uuid[])`,
        [projectId, projectIds],
      );

      return result.rowCount;
    },

    async getEntryProjectReferences(entryId) {
      const result = await queryable.query(
        `SELECT r.id,
                r.entry_id,
                r.referenced_project_id,
                r.created_at,
                p.name AS project_name
         FROM entry_project_references r
         JOIN projects p
           ON p.id = r.referenced_project_id
         WHERE r.entry_id = $1
         ORDER BY r.created_at`,
        [entryId],
      );

      return result.rows.map(mapEntryProjectReference);
    },

    async createEntryProjectReferences(
      entryId,
      projectIds,
    ) {
      for (const projectId of projectIds) {
        await queryable.query(
          `INSERT INTO entry_project_references
             (entry_id, referenced_project_id)
           VALUES ($1, $2)
           ON CONFLICT
             (entry_id, referenced_project_id)
           DO NOTHING`,
          [entryId, projectId],
        );
      }

      return projectIds.length;
    },

    async removeEntryProjectReferences(
      entryId,
      projectIds,
    ) {
      if (!projectIds.length) return 0;

      const result = await queryable.query(
        `DELETE FROM entry_project_references
         WHERE entry_id = $1
           AND referenced_project_id = ANY($2::uuid[])`,
        [entryId, projectIds],
      );

      return result.rowCount;
    },

    async getEntryReferences(entryId) {
      const result = await queryable.query(
        `SELECT r.id,
                r.entry_id,
                r.referenced_entry_id,
                r.created_at,
                e.name AS referenced_entry_name,
                e.project_id AS referenced_project_id,
                p.name AS referenced_project_name
         FROM entry_entry_references r
         JOIN entries e
           ON e.id = r.referenced_entry_id
         JOIN projects p
           ON p.id = e.project_id
         WHERE r.entry_id = $1
         ORDER BY r.created_at`,
        [entryId],
      );

      return result.rows.map(mapEntryReference);
    },

    async createEntryReferences(
      entryId,
      entryIds,
    ) {
      for (const referencedEntryId of entryIds) {
        await queryable.query(
          `INSERT INTO entry_entry_references
             (entry_id, referenced_entry_id)
           VALUES ($1, $2)
           ON CONFLICT
             (entry_id, referenced_entry_id)
           DO NOTHING`,
          [entryId, referencedEntryId],
        );
      }

      return entryIds.length;
    },

    async removeEntryReferences(
      entryId,
      entryIds,
    ) {
      if (!entryIds.length) return 0;

      const result = await queryable.query(
        `DELETE FROM entry_entry_references
         WHERE entry_id = $1
           AND referenced_entry_id = ANY($2::uuid[])`,
        [entryId, entryIds],
      );

      return result.rowCount;
    },

    async getEntriesByIdsForProject(
      entryIds,
      projectId,
    ) {
      if (!entryIds.length) return [];

      const result = await queryable.query(
        `SELECT e.id,
                e.project_id,
                e.name,
                e.duration_minutes,
                e.occurred_at,
                e.due_at,
                e.completed_at,
                e.created_at,
                e.updated_at
         FROM entries e
         WHERE e.id = ANY($1::uuid[])
           AND e.project_id = $2`,
        [entryIds, projectId],
      );

      return result.rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        durationMinutes: row.duration_minutes,
        occurredAt: row.occurred_at,
        dueAt: row.due_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },

    async getProjectEntryLinks(projectId) {
      const result = await queryable.query(
        `SELECT l.id,
                l.source_entry_id,
                source_entry.name AS source_name,
                l.target_entry_id,
                target_entry.name AS target_name
         FROM entry_links l
         JOIN entries source_entry
           ON source_entry.id = l.source_entry_id
         JOIN entries target_entry
           ON target_entry.id = l.target_entry_id
         WHERE source_entry.project_id = $1
           AND target_entry.project_id = $1`,
        [projectId],
      );

      return result.rows.map((row) => ({
        id: row.id,
        sourceEntryId: row.source_entry_id,
        sourceName: row.source_name,
        targetEntryId: row.target_entry_id,
        targetName: row.target_name,
      }));
    },

    async createEntryLinks(
      entryId,
      linkedEntryIds,
    ) {
      for (const linkedEntryId of linkedEntryIds) {
        await queryable.query(
          `
            INSERT INTO entry_links
              (source_entry_id, target_entry_id)
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
        `INSERT INTO project_fields
           (project_id, name, field_type, formula,
            position, required)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, project_id, name,
                   field_type, formula, position, required,
                   archived_at, created_at,
                   updated_at`,
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
        `INSERT INTO entries
           (project_id, created_by_id,
            name, duration_minutes, due_at, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, project_id,
                   created_by_id, name,
                   duration_minutes,
                   occurred_at, due_at, completed_at, tags,
                   created_at, updated_at`,
        [
          data.projectId,
          data.createdById,
          data.name,
          data.durationMinutes,
          data.dueAt ?? null,
          data.tags || [],
        ],
      );

      const row = result.rows[0];

      return {
        id: row.id,
        projectId: row.project_id,
        createdById: row.created_by_id,
        name: row.name,
        durationMinutes:
          row.duration_minutes,
        occurredAt: row.occurred_at,
        dueAt: row.due_at,
        completedAt: row.completed_at,
        tags: row.tags || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },

    async createEntryFieldValues(values) {
      for (const value of values) {
        await queryable.query(
          `INSERT INTO entry_field_values
             (entry_id, field_id,
              value_text, value_number,
              value_date)
           VALUES ($1, $2, $3, $4, $5)`,
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

    async createChecklistItems(
      entryId,
      items,
    ) {
      if (!items.length) return 0;

      const positionResult = await queryable.query(
        `SELECT COALESCE(MAX(position), -1)::int AS max_position
         FROM entry_checklist_items
         WHERE entry_id = $1`,
        [entryId],
      );

      const startingPosition = positionResult.rows[0].max_position + 1;

      for (
        let index = 0;
        index < items.length;
        index += 1
      ) {
        await queryable.query(
          `INSERT INTO entry_checklist_items
             (entry_id, text, completed, position)
           VALUES ($1, $2, FALSE, $3)`,
          [
            entryId,
            items[index].text,
            startingPosition + index,
          ],
        );
      }

      return items.length;
    },

    async getEntryById(entryId) {
      const result = await queryable.query(
        `SELECT e.id AS entry_id,
                e.project_id,
                e.created_by_id,
                e.name AS entry_name,
                e.duration_minutes,
                e.occurred_at,
                e.tags,
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
                f.archived_at AS field_archived_at,
                f.field_type
         FROM entries e
         LEFT JOIN entry_field_values v
           ON v.entry_id = e.id
         LEFT JOIN project_fields f
           ON f.id = v.field_id
         WHERE e.id = $1
         ORDER BY v.created_at ASC`,
        [entryId],
      );

      const entry = buildEntryFromRows(
        result.rows,
      );

      if (!entry) return null;

      return entry;
    },

    async getOwnedEntry(entryId, userId) {
      const result = await queryable.query(
        `SELECT e.id
         FROM entries e
         JOIN projects p
           ON p.id = e.project_id
         WHERE e.id = $1
           AND p.owner_id = $2
         LIMIT 1`,
        [entryId, userId],
      );

      return result.rows[0] || null;
    },

    async getOwnedEntryIds(
      entryIds,
      userId,
    ) {
      if (!entryIds.length) return [];

      const result = await queryable.query(
        `SELECT e.id
         FROM entries e
         JOIN projects p
           ON p.id = e.project_id
         WHERE p.owner_id = $1
           AND e.id = ANY($2::uuid[])`,
        [userId, entryIds],
      );

      return result.rows.map(
        (row) => row.id,
      );
    },

    async updateEntry(entryId, data) {
      const result = await queryable.query(
        `UPDATE entries
         SET name = $2,
             duration_minutes = $3,
             due_at = $4,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, project_id, created_by_id, name,
                   duration_minutes, occurred_at, due_at, completed_at,
                   created_at, updated_at`,
        [
          entryId,
          data.name,
          data.durationMinutes,
          data.dueAt ?? null,
        ],
      );

      return result.rows[0] || null;
    },

    async getEntryFieldValues(entryId) {
      const result = await queryable.query(
        `SELECT id, entry_id, field_id, value_text,
                value_number, value_date, created_at, updated_at
         FROM entry_field_values
         WHERE entry_id = $1
         ORDER BY created_at ASC`,
        [entryId],
      );

      return result.rows;
    },

    async replaceEntryFieldValues(
      entryId,
      values,
    ) {
      await queryable.query(
        `DELETE FROM entry_field_values
         WHERE entry_id = $1`,
        [entryId],
      );

      for (const value of values) {
        await queryable.query(
          `INSERT INTO entry_field_values
             (entry_id, field_id,
              value_text, value_number,
              value_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            entryId,
            value.fieldId,
            value.valueText ?? null,
            value.valueNumber ?? null,
            value.valueDate ?? null,
          ],
        );
      }

      return values.length;
    },

    async archiveProjectFields(fieldIds) {
      if (!fieldIds.length) return 0;

      const result = await queryable.query(
        `UPDATE project_fields
         SET archived_at = NOW(),
             updated_at = NOW()
         WHERE id = ANY($1::uuid[])
           AND archived_at IS NULL`,
        [fieldIds],
      );

      return result.rowCount;
    },

    async reorderProjectFields(fieldIds) {
      for (
        let index = 0;
        index < fieldIds.length;
        index += 1
      ) {
        await queryable.query(
          `UPDATE project_fields
           SET position = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [
            fieldIds[index],
            index,
          ],
        );
      }
    },

    async updateChecklistItem(
      entryId,
      itemId,
      changes,
    ) {
      const sets = [];
      const values = [
        itemId,
        entryId,
      ];

      if (changes.text !== undefined) {
        values.push(changes.text);
        sets.push(
          `text = $${values.length}`,
        );
      }

      if (changes.completed !== undefined) {
        values.push(changes.completed);
        sets.push(
          `completed = $${values.length}`,
        );
      }

      values.push(new Date());
      sets.push(
        `updated_at = $${values.length}`,
      );

      const result = await queryable.query(
        `UPDATE entry_checklist_items
         SET ${sets.join(",\n             ")}
         WHERE id = $1
           AND entry_id = $2
         RETURNING id, entry_id, text,
                   completed, position,
                   created_at, updated_at`,
        values,
      );

      return result.rows[0]
        ? mapChecklist(result.rows[0])
        : null;
    },

    async deleteChecklistItem(
      entryId,
      itemId,
    ) {
      const result = await queryable.query(
        `DELETE FROM entry_checklist_items
         WHERE id = $2
           AND entry_id = $1
         RETURNING id`,
        [
          entryId,
          itemId,
        ],
      );

      return result.rows[0] || null;
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
