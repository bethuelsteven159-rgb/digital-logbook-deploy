const db = require("../db");

function mapCollaborator(row) {
  if (!row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    name: row.name ?? null,
    email: row.email ?? null,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
  };
}

function mapInvitation(row) {
  if (!row) return null;

  return {
    id: row.id,
    projectId: row.project_id,
    inviterId: row.inviter_id,
    inviterName: row.inviter_name ?? null,
    inviterEmail: row.inviter_email ?? null,
    inviteeEmail: row.invitee_email,
    projectName: row.project_name ?? null,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? null,
  };
}

const repository = {
  async getProjectOwner(projectId) {
    const result = await db.query(
      `
        SELECT u.id, u.name, u.email, u.avatar_url
        FROM projects p
        JOIN users u ON u.id = p.owner_id
        WHERE p.id = $1
        LIMIT 1
      `,
      [projectId],
    );

    return result.rows[0] || null;
  },

  async getCollaborators(projectId) {
    const result = await db.query(
      `
        SELECT pc.id, pc.project_id, pc.user_id, pc.role, pc.created_at,
               u.name, u.email, u.avatar_url
        FROM project_collaborators pc
        JOIN users u ON u.id = pc.user_id
        WHERE pc.project_id = $1
        ORDER BY pc.created_at ASC
      `,
      [projectId],
    );

    return result.rows.map(mapCollaborator);
  },

  async getPendingInvitations(projectId) {
    const result = await db.query(
      `
        SELECT i.id, i.project_id, i.inviter_id, i.invitee_email,
               i.status, i.created_at,
               u.name AS inviter_name, u.email AS inviter_email
        FROM project_invitations i
        JOIN users u ON u.id = i.inviter_id
        WHERE i.project_id = $1
          AND i.status = 'pending'
        ORDER BY i.created_at ASC
      `,
      [projectId],
    );

    return result.rows.map(mapInvitation);
  },

  async findPendingInvitationByEmail(projectId, email) {
    const result = await db.query(
      `
        SELECT id
        FROM project_invitations
        WHERE project_id = $1
          AND LOWER(invitee_email) = LOWER($2)
          AND status = 'pending'
        LIMIT 1
      `,
      [projectId, email],
    );

    return result.rows[0] || null;
  },

  async findUserByEmail(email) {
    const result = await db.query(
      `
        SELECT id, name, email, avatar_url
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email],
    );

    return result.rows[0] || null;
  },

  async isCollaborator(projectId, userId) {
    const result = await db.query(
      `
        SELECT 1
        FROM project_collaborators
        WHERE project_id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [projectId, userId],
    );

    return result.rows.length > 0;
  },

  async createInvitation({ projectId, inviterId, inviteeEmail }) {
    const result = await db.query(
      `
        INSERT INTO project_invitations
          (project_id, inviter_id, invitee_email)
        VALUES ($1, $2, $3)
        RETURNING id, project_id, inviter_id, invitee_email,
                  status, created_at
      `,
      [projectId, inviterId, inviteeEmail],
    );

    return mapInvitation(result.rows[0]);
  },

  async getInvitationById(invitationId) {
    const result = await db.query(
      `
        SELECT i.id, i.project_id, i.inviter_id, i.invitee_email,
               i.status, i.created_at, i.responded_at,
               u.name AS inviter_name, u.email AS inviter_email,
               p.name AS project_name
        FROM project_invitations i
        JOIN users u ON u.id = i.inviter_id
        JOIN projects p ON p.id = i.project_id
        WHERE i.id = $1
        LIMIT 1
      `,
      [invitationId],
    );

    return result.rows[0] ? mapInvitation(result.rows[0]) : null;
  },

  // Atomic pending -> resolved transition; returns null if the
  // invitation was already resolved by a concurrent request.
  async resolveInvitation(invitationId, status) {
    const result = await db.query(
      `
        UPDATE project_invitations
        SET status = $2,
            responded_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
          AND status = 'pending'
        RETURNING id, project_id, invitee_email, status
      `,
      [invitationId, status],
    );

    return result.rows[0] || null;
  },

  async listPendingInvitationsForEmail(email) {
    const result = await db.query(
      `
        SELECT i.id, i.project_id, i.inviter_id, i.invitee_email,
               i.status, i.created_at,
               u.name AS inviter_name, u.email AS inviter_email,
               p.name AS project_name
        FROM project_invitations i
        JOIN users u ON u.id = i.inviter_id
        JOIN projects p ON p.id = i.project_id
        WHERE LOWER(i.invitee_email) = LOWER($1)
          AND i.status = 'pending'
        ORDER BY i.created_at DESC
      `,
      [email],
    );

    return result.rows.map(mapInvitation);
  },

  async addCollaborator({ projectId, userId }) {
    const result = await db.query(
      `
        INSERT INTO project_collaborators (project_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (project_id, user_id) DO NOTHING
        RETURNING id, project_id, user_id, role, created_at
      `,
      [projectId, userId],
    );

    if (result.rows.length > 0) {
      return mapCollaborator(result.rows[0]);
    }

    // Already a collaborator: return the existing row.
    const existing = await db.query(
      `
        SELECT id, project_id, user_id, role, created_at
        FROM project_collaborators
        WHERE project_id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [projectId, userId],
    );

    return mapCollaborator(existing.rows[0]);
  },

  async removeCollaborator(projectId, userId) {
    const result = await db.query(
      `
        DELETE FROM project_collaborators
        WHERE project_id = $1
          AND user_id = $2
        RETURNING id
      `,
      [projectId, userId],
    );

    return result.rowCount > 0;
  },
};

module.exports = repository;
