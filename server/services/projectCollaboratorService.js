const projectDetailsRepository = require("../repositories/projectDetailsRepository");
const collaboratorRepository = require("../repositories/projectCollaboratorRepository");
const users = require("../data/userStore");

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

// Project access gate: the owner and every collaborator may
// view and manage sharing for the project.
async function requireAccessibleProject(projectId, userId) {
  const project = await projectDetailsRepository.getOwnedProject(
    projectId,
    userId,
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  return project;
}

async function requireUser(userId) {
  const user = await users.findById(userId);

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  return user;
}

async function listCollaboratorsService({ projectId, userId }) {
  const project = await requireAccessibleProject(projectId, userId);

  const [owner, collaborators, invitations] = await Promise.all([
    collaboratorRepository.getProjectOwner(projectId),
    collaboratorRepository.getCollaborators(projectId),
    collaboratorRepository.getPendingInvitations(projectId),
  ]);

  return {
    project: {
      id: project.id,
      name: project.name,
      ownerId: project.ownerId,
    },
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          email: owner.email,
          avatarUrl: owner.avatar_url,
        }
      : null,
    collaborators,
    invitations,
  };
}

async function inviteCollaboratorService({ projectId, userId, email }) {
  await requireAccessibleProject(projectId, userId);

  const inviter = await requireUser(userId);
  const inviteeEmail = normalizeEmail(email);

  if (!inviteeEmail) {
    throw createHttpError(400, "Invitee email is required");
  }

  if (inviteeEmail === normalizeEmail(inviter.email)) {
    throw createHttpError(
      400,
      "You cannot invite yourself to this project",
    );
  }

  const owner = await collaboratorRepository.getProjectOwner(projectId);

  if (owner && inviteeEmail === normalizeEmail(owner.email)) {
    throw createHttpError(
      400,
      "The project owner already has full access to this project",
    );
  }

  const pendingInvitation =
    await collaboratorRepository.findPendingInvitationByEmail(
      projectId,
      inviteeEmail,
    );

  if (pendingInvitation) {
    throw createHttpError(
      409,
      "An invitation for this email is already pending",
    );
  }

  const inviteeUser =
    await collaboratorRepository.findUserByEmail(inviteeEmail);

  if (inviteeUser) {
    const alreadyCollaborator =
      await collaboratorRepository.isCollaborator(
        projectId,
        inviteeUser.id,
      );

    if (alreadyCollaborator) {
      throw createHttpError(
        409,
        "This user is already a collaborator on this project",
      );
    }
  }

  const invitation = await collaboratorRepository.createInvitation({
    projectId,
    inviterId: userId,
    inviteeEmail,
  });

  return {
    ...invitation,
    inviterName: inviter.name,
    inviterEmail: inviter.email,
  };
}

async function revokeInvitationService({
  projectId,
  userId,
  invitationId,
}) {
  const project = await requireAccessibleProject(projectId, userId);

  const invitation =
    await collaboratorRepository.getInvitationById(invitationId);

  if (!invitation || invitation.projectId !== projectId) {
    throw createHttpError(404, "Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw createHttpError(409, "Invitation is no longer pending");
  }

  const isOwner = project.ownerId === userId;
  const isInviter = invitation.inviterId === userId;

  if (!isOwner && !isInviter) {
    throw createHttpError(
      403,
      "Only the project owner or the inviter can revoke this invitation",
    );
  }

  const revoked = await collaboratorRepository.resolveInvitation(
    invitationId,
    "revoked",
  );

  if (!revoked) {
    throw createHttpError(409, "Invitation is no longer pending");
  }

  return {
    id: revoked.id,
    status: revoked.status,
  };
}

async function removeCollaboratorService({
  projectId,
  userId,
  targetUserId,
}) {
  const project = await requireAccessibleProject(projectId, userId);

  const isOwner = project.ownerId === userId;

  if (isOwner) {
    if (String(targetUserId) === String(userId)) {
      throw createHttpError(
        400,
        "The owner cannot be removed from their own project",
      );
    }
  } else {
    // Collaborators may only remove themselves (leave the project).
    if (String(targetUserId) !== String(userId)) {
      throw createHttpError(
        403,
        "Only the project owner can remove other collaborators",
      );
    }
  }

  const removed = await collaboratorRepository.removeCollaborator(
    projectId,
    targetUserId,
  );

  if (!removed) {
    throw createHttpError(404, "Collaborator not found");
  }

  return {
    projectId,
    userId: targetUserId,
    removed: true,
  };
}

async function listMyInvitationsService({ userId }) {
  const user = await requireUser(userId);

  const invitations =
    await collaboratorRepository.listPendingInvitationsForEmail(
      normalizeEmail(user.email),
    );

  return invitations;
}

async function respondToInvitation({ userId, invitationId, action }) {
  const user = await requireUser(userId);

  const invitation =
    await collaboratorRepository.getInvitationById(invitationId);

  if (
    !invitation ||
    normalizeEmail(invitation.inviteeEmail) !==
      normalizeEmail(user.email)
  ) {
    throw createHttpError(404, "Invitation not found");
  }

  if (invitation.status !== "pending") {
    throw createHttpError(409, "Invitation is no longer pending");
  }

  // Grant access first: if the atomic resolve below loses a race
  // with another concurrent response, the accepting user still
  // ends up with the access they were promised.
  if (action === "accepted") {
    await collaboratorRepository.addCollaborator({
      projectId: invitation.projectId,
      userId,
    });
  }

  const resolved = await collaboratorRepository.resolveInvitation(
    invitationId,
    action,
  );

  if (!resolved) {
    throw createHttpError(409, "Invitation is no longer pending");
  }

  return {
    id: resolved.id,
    projectId: resolved.project_id,
    projectName: invitation.projectName,
    status: resolved.status,
  };
}

async function acceptInvitationService({ userId, invitationId }) {
  return respondToInvitation({ userId, invitationId, action: "accepted" });
}

async function declineInvitationService({ userId, invitationId }) {
  return respondToInvitation({ userId, invitationId, action: "declined" });
}

module.exports = {
  listCollaboratorsService,
  inviteCollaboratorService,
  revokeInvitationService,
  removeCollaboratorService,
  listMyInvitationsService,
  acceptInvitationService,
  declineInvitationService,
};
