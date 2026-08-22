const db = require("../db");

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    googleId: row.google_id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  async findByGoogleId(googleId) {
    const result = await db.query(
      `
        SELECT
          id,
          google_id,
          name,
          email,
          avatar_url,
          bio,
          created_at,
          updated_at
        FROM users
        WHERE google_id = $1
        LIMIT 1
      `,
      [googleId],
    );

    return mapUser(result.rows[0]);
  },

  async findById(id) {
    const result = await db.query(
      `
        SELECT
          id,
          google_id,
          name,
          email,
          avatar_url,
          bio,
          created_at,
          updated_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapUser(result.rows[0]);
  },

  async createUser({
    googleId,
    name,
    email,
    avatarUrl,
  }) {
    const result = await db.query(
      `
        INSERT INTO users (
          google_id,
          name,
          email,
          avatar_url
        )
        VALUES ($1, $2, $3, $4)

        ON CONFLICT (google_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = NOW()

        RETURNING
          id,
          google_id,
          name,
          email,
          avatar_url,
          bio,
          created_at,
          updated_at
      `,
      [
        googleId,
        name,
        email,
        avatarUrl,
      ],
    );

    return mapUser(result.rows[0]);
  },
};