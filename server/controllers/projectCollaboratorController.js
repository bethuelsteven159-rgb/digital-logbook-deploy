const {
  listCollaboratorsService,
  inviteCollaboratorService,
  revokeInvitationService,
  removeCollaboratorService,
  listMyInvitationsService,
  acceptInvitationService,
  declineInvitationService,
} = require("../services/projectCollaboratorService");

const {
  inviteCollaboratorSchema,
} = require("../validation/projectCollaborator.validation");

function requireUserId(req) {
  const userId = req.user?.id || req.user?.sub;

  if (!userId) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return userId;
}

async function listCollaborators(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await listCollaboratorsService({
      projectId: req.params.projectId,
      userId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function inviteCollaborator(req, res, next) {
  try {
    const userId = requireUserId(req);

    const parsed = inviteCollaboratorSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation data",
        errors: parsed.error.flatten(),
      });
    }

    const data = await inviteCollaboratorService({
      projectId: req.params.projectId,
      userId,
      email: parsed.data.email,
    });

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function revokeInvitation(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await revokeInvitationService({
      projectId: req.params.projectId,
      userId,
      invitationId: req.params.invitationId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function removeCollaborator(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await removeCollaboratorService({
      projectId: req.params.projectId,
      userId,
      targetUserId: req.params.userId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function listMyInvitations(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await listMyInvitationsService({
      userId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function acceptInvitation(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await acceptInvitationService({
      userId,
      invitationId: req.params.invitationId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function declineInvitation(req, res, next) {
  try {
    const userId = requireUserId(req);

    const data = await declineInvitationService({
      userId,
      invitationId: req.params.invitationId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listCollaborators,
  inviteCollaborator,
  revokeInvitation,
  removeCollaborator,
  listMyInvitations,
  acceptInvitation,
  declineInvitation,
};
