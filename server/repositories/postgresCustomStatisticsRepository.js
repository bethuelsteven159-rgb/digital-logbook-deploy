const db = require("../db");

function mapCustomStatistic(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: row.project_id,
    name: row.name,
    expression: row.expression,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const repository = {
  async createCustomStatistic({
    ownerId,
    projectId,
    name,
    expression,
  }) {
    const result = await db.query(
      `
        INSERT INTO custom_statistics (
          owner_id,
          project_id,
          name,
          expression
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          owner_id,
          project_id,
          name,
          expression,
          created_at,
          updated_at
      `,
      [ownerId, projectId, name, expression],
    );

    return mapCustomStatistic(result.rows[0]);
  },

  async updateCustomStatistic({
    statId,
    ownerId,
    name,
    expression,
  }) {
    const result = await db.query(
      `
        UPDATE custom_statistics
        SET name = $3,
            expression = $4,
            updated_at = NOW()
        WHERE id = $1
          AND owner_id = $2
        RETURNING
          id,
          owner_id,
          project_id,
          name,
          expression,
          created_at,
          updated_at
      `,
      [statId, ownerId, name, expression],
    );

    return mapCustomStatistic(result.rows[0]);
  },

  async getCustomStatisticsForProject({ ownerId, projectId }) {
    const result = await db.query(
      `
        SELECT
          id,
          owner_id,
          project_id,
          name,
          expression,
          created_at,
          updated_at
        FROM custom_statistics
        WHERE owner_id = $1
          AND project_id = $2
        ORDER BY created_at ASC
      `,
      [ownerId, projectId],
    );

    return result.rows.map(mapCustomStatistic);
  },

  async getCustomStatisticById({ statId, ownerId }) {
    const result = await db.query(
      `
        SELECT
          id,
          owner_id,
          project_id,
          name,
          expression,
          created_at,
          updated_at
        FROM custom_statistics
        WHERE id = $1
          AND owner_id = $2
        LIMIT 1
      `,
      [statId, ownerId],
    );

    return mapCustomStatistic(result.rows[0]);
  },

  async deleteCustomStatistic({ statId, ownerId }) {
    const result = await db.query(
      `
        DELETE FROM custom_statistics
        WHERE id = $1
          AND owner_id = $2
        RETURNING id
      `,
      [statId, ownerId],
    );

    return result.rowCount > 0;
  },

  async getProjectFields(projectId) {
    const result = await db.query(
      `
        SELECT
          id,
          name,
          field_type
        FROM project_fields
        WHERE project_id = $1
          AND archived_at IS NULL
        ORDER BY position ASC, created_at ASC
      `,
      [projectId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      fieldType: row.field_type,
    }));
  },

  async getProjectFieldValues(projectId) {
    const result = await db.query(
      `
        SELECT
          v.field_id,
          v.entry_id,
          v.value_text,
          v.value_number,
          v.value_date
        FROM entry_field_values v
        INNER JOIN entries e
          ON e.id = v.entry_id
        WHERE e.project_id = $1
      `,
      [projectId],
    );

    return result.rows.map((row) => ({
      fieldId: row.field_id,
      entryId: row.entry_id,
      valueText: row.value_text,
      valueNumber:
        row.value_number === null
          ? null
          : Number(row.value_number),
      valueDate: row.value_date,
    }));
  },
};

module.exports = repository;
