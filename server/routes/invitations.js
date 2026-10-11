const express = require("express");

const {
  listMyInvitations,
  acceptInvitation,
  declineInvitation,
} = require("../controllers/projectCollaboratorController");

const router = express.Router();

// GET /api/invitations
// Pending project invitations addressed to the caller's email.
router.get(
  "/",
  listMyInvitations,
);

// POST /api/invitations/:invitationId/accept
router.post(
  "/:invitationId/accept",
  acceptInvitation,
);

// POST /api/invitations/:invitationId/decline
router.post(
  "/:invitationId/decline",
  declineInvitation,
);

module.exports = router;
