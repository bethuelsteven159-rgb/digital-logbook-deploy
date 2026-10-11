const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function getAuthToken() {
  return localStorage.getItem("authToken");
}

async function request(path, options = {}) {
  const token = getAuthToken();

  if (!token) {
    const error = new Error(
      "Authentication required. Please sign in again.",
    );
    error.status = 401;
    throw error;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  const contentType = response.headers.get("content-type");
  const body = contentType?.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    const error = new Error(
      body?.message ||
        body?.error?.message ||
        body?.error ||
        `Request failed with status ${response.status}`,
    );

    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body?.data ?? body;
}

/**
 * List the owner, active collaborators and pending invitations
 * for a project.
 *
 * GET /api/projects/:projectId/collaborators
 */
export function fetchCollaborators(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(
    `/api/projects/${encodeURIComponent(projectId)}/collaborators`,
  );
}

/**
 * Invite a user (by email) to collaborate on a project.
 *
 * POST /api/projects/:projectId/collaborators/invitations
 */
export function inviteCollaborator(projectId, email) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return request(
    `/api/projects/${encodeURIComponent(projectId)}/collaborators/invitations`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

/**
 * Revoke a pending invitation (owner or original inviter).
 *
 * DELETE /api/projects/:projectId/collaborators/invitations/:invitationId
 */
export function revokeInvitation(projectId, invitationId) {
  if (!projectId || !invitationId) {
    throw new Error("Project ID and invitation ID are required.");
  }

  return request(
    `/api/projects/${encodeURIComponent(projectId)}/collaborators/invitations/${encodeURIComponent(invitationId)}`,
    { method: "DELETE" },
  );
}

/**
 * Remove a collaborator from a project. The owner may remove
 * anyone; collaborators may only remove themselves (leave).
 *
 * DELETE /api/projects/:projectId/collaborators/:userId
 */
export function removeCollaborator(projectId, userId) {
  if (!projectId || !userId) {
    throw new Error("Project ID and user ID are required.");
  }

  return request(
    `/api/projects/${encodeURIComponent(projectId)}/collaborators/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

/**
 * List the caller's pending project invitations.
 *
 * GET /api/invitations
 */
export function fetchMyInvitations() {
  return request("/api/invitations");
}

/**
 * Accept a pending project invitation.
 *
 * POST /api/invitations/:invitationId/accept
 */
export function acceptInvitation(invitationId) {
  if (!invitationId) {
    throw new Error("Invitation ID is required.");
  }

  return request(
    `/api/invitations/${encodeURIComponent(invitationId)}/accept`,
    { method: "POST" },
  );
}

/**
 * Decline a pending project invitation.
 *
 * POST /api/invitations/:invitationId/decline
 */
export function declineInvitation(invitationId) {
  if (!invitationId) {
    throw new Error("Invitation ID is required.");
  }

  return request(
    `/api/invitations/${encodeURIComponent(invitationId)}/decline`,
    { method: "POST" },
  );
}
