const express = require("express");

const {
  listCollaborators,
  inviteCollaborator,
  revokeInvitation,
  removeCollaborator,
} = require("../controllers/projectCollaboratorController");

const router = express.Router();

// GET /api/projects/:projectId/collaborators
// Lists the owner, active collaborators, and pending invitations.
router.get(
  "/:projectId/collaborators",
  listCollaborators,
);

// POST /api/projects/:projectId/collaborators/invitations
// Body: { email } — owner or collaborator invites another user.
router.post(
  "/:projectId/collaborators/invitations",
  inviteCollaborator,
);

// DELETE /api/projects/:projectId/collaborators/invitations/:invitationId
// Revokes a pending invitation (owner or original inviter).
router.delete(
  "/:projectId/collaborators/invitations/:invitationId",
  revokeInvitation,
);

// DELETE /api/projects/:projectId/collaborators/:userId
// Owner removes any collaborator; a collaborator removes themselves.
router.delete(
  "/:projectId/collaborators/:userId",
  removeCollaborator,
);

module.exports = router;
