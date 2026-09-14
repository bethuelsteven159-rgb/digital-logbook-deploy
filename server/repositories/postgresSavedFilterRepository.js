const db = require("../db");

function mapSavedFilter(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: row.project_id,
    name: row.name,
    criteria: row.criteria,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const repository = {
  async createSavedFilter({ ownerId, projectId, name, criteria }) {
    const result = await db.query(
      `
        INSERT INTO saved_filters (
          owner_id,
          project_id,
          name,
          criteria
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          owner_id,
          project_id,
          name,
          criteria,
          created_at,
          updated_at
      `,
      [ownerId, projectId, name, JSON.stringify(criteria)],
    );

    return mapSavedFilter(result.rows[0]);
  },

    async updateSavedFilter({ filterId, ownerId, name, criteria }) {
    const result = await db.query(
      `
        UPDATE saved_filters
        SET name = $3,
            criteria = $4,
            updated_at = NOW()
        WHERE id = $1
          AND owner_id = $2
        RETURNING
          id,
          owner_id,
          project_id,
          name,
          criteria,
          created_at,
          updated_at
      `,
      [filterId, ownerId, name, JSON.stringify(criteria)],
    );

    return mapSavedFilter(result.rows[0]);
  },

  async getSavedFiltersForProject({ ownerId, projectId }) {
    const result = await db.query(
      `
        SELECT
          id,
          owner_id,
          project_id,
          name,
          criteria,
          created_at,
          updated_at
        FROM saved_filters
        WHERE owner_id = $1
          AND project_id = $2
        ORDER BY created_at DESC
      `,
      [ownerId, projectId],
    );

    return result.rows.map(mapSavedFilter);
  },

  async getSavedFilterById({ filterId, ownerId }) {
    const result = await db.query(
      `
        SELECT
          id,
          owner_id,
          project_id,
          name,
          criteria,
          created_at,
          updated_at
        FROM saved_filters
        WHERE id = $1
          AND owner_id = $2
        LIMIT 1
      `,
      [filterId, ownerId],
    );

    return mapSavedFilter(result.rows[0]);
  },

  async deleteSavedFilter({ filterId, ownerId }) {
    const result = await db.query(
      `
        DELETE FROM saved_filters
        WHERE id = $1
          AND owner_id = $2
        RETURNING id
      `,
      [filterId, ownerId],
    );

    return result.rowCount > 0;
  },
};

module.exports = repository;
