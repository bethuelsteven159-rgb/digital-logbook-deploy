const db = require("../db");

function mapProfile(row) {
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

async function getProfileByUserId(userId) {
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
    [userId],
  );

  return mapProfile(result.rows[0]);
}

async function updateProfile(
  userId,
  { name, bio, avatarUrl },
) {
  const result = await db.query(
    `
      UPDATE users
      SET
        name = $1,
        bio = $2,
        avatar_url = CASE WHEN $4::boolean THEN $5::text ELSE avatar_url END,
        updated_at = NOW()
      WHERE id = $3
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
    [name, bio, userId, avatarUrl !== undefined, avatarUrl ?? null],
  );

  return mapProfile(result.rows[0]);
}

module.exports = {
  getProfileByUserId,
  updateProfile,
};