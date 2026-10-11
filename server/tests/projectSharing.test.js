const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const projectCollaboratorsRouter = require("../routes/projectCollaborators");
const invitationsRouter = require("../routes/invitations");

function patch(target, key, value) {
  const original = target[key];

  target[key] = value;

  return () => {
    target[key] = original;
  };
}

function normalize(raw) {
  return raw.replace(/\s+/g, " ").trim();
}

async function startServer({ user = { id: "user-1" } } = {}) {
  const app = express();

  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) {
      req.user = user;
    }

    next();
  });
  app.use("/api/projects", projectCollaboratorsRouter);
  app.use("/api/invitations", invitationsRouter);
  app.use((error, _req, res, _next) => {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  });

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () =>
      resolve(instance),
    );
  });

  return {
    server,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
  };
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function deleteJson(url) {
  return fetch(url, { method: "DELETE" });
}

const PROJECT_ROW = {
  id: "project-1",
  owner_id: "user-1",
  name: "Shared Logbook",
  description: "Collaborative project",
  start_date: null,
  end_date: null,
  archived_at: null,
  created_at: "2026-01-01T08:00:00Z",
  updated_at: "2026-01-02T08:00:00Z",
};

const OWNER_ROW = {
  id: "user-1",
  name: "Owner One",
  email: "owner@example.com",
  avatar_url: null,
};

const INVITER_ROW = {
  id: "user-2",
  name: "Inviter Two",
  email: "inviter@example.com",
  avatar_url: null,
};

const INVITATION_ROW = {
  id: "invitation-1",
  project_id: "project-1",
  inviter_id: "user-1",
  invitee_email: "friend@example.com",
  status: "pending",
  created_at: "2026-10-01T08:00:00Z",
  responded_at: null,
  inviter_name: "Owner One",
  inviter_email: "owner@example.com",
  project_name: "Shared Logbook",
};

/*
 * A fake db.query that routes each SQL statement issued by the
 * collaborator repository, the project access gate, and the user
 * store to configurable fixtures.
 */
function createSharingFakeDb({
  projectRow = PROJECT_ROW,
  ownerRow = OWNER_ROW,
  collaboratorRows = [],
  projectPendingInvitationRows = [],
  usersById = {},
  usersByEmail = {},
  pendingInvitationsByProjectEmail = {},
  collaboratorUserIds = [],
  insertInvitationRow = null,
  invitationsById = {},
  myInvitationRows = [],
  resolveInvitationRow = null,
  addCollaboratorRow = null,
  existingCollaboratorRow = null,
  removeCollaboratorRowCount = 1,
} = {}) {
  const statements = [];

  const fakeQuery = async (raw, parameters = []) => {
    const sql = normalize(raw);

    statements.push({ sql, parameters });

    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
      return { rowCount: 0, rows: [] };
    }

    // Project access gate (owner OR collaborator).
    if (sql.startsWith("SELECT id, owner_id") && sql.includes("FROM projects")) {
      return { rows: projectRow ? [{ ...projectRow }] : [] };
    }

    // users.findById
    if (sql.includes("google_id")) {
      const row = usersById[parameters[0]];
      return { rows: row ? [{ ...row }] : [] };
    }

    // getProjectOwner
    if (sql.includes("JOIN users u ON u.id = p.owner_id")) {
      return { rows: ownerRow ? [{ ...ownerRow }] : [] };
    }

    // getCollaborators
    if (sql.includes("FROM project_collaborators pc")) {
      return { rows: collaboratorRows.map((row) => ({ ...row })) };
    }

    // getPendingInvitations (project scoped)
    if (
      sql.includes("FROM project_invitations i") &&
      sql.includes("WHERE i.project_id = $1")
    ) {
      return {
        rows: projectPendingInvitationRows.map((row) => ({ ...row })),
      };
    }

    // findPendingInvitationByEmail
    if (sql.includes("FROM project_invitations WHERE project_id = $1")) {
      const key = `${parameters[0]}:${String(parameters[1]).toLowerCase()}`;
      const row = pendingInvitationsByProjectEmail[key];
      return { rows: row ? [{ ...row }] : [] };
    }

    // findUserByEmail
    if (sql.includes("FROM users WHERE LOWER(email)")) {
      const row = usersByEmail[String(parameters[0]).toLowerCase()];
      return { rows: row ? [{ ...row }] : [] };
    }

    // isCollaborator
    if (sql.includes("SELECT 1 FROM project_collaborators")) {
      const isMember = collaboratorUserIds.includes(parameters[1]);
      return { rows: isMember ? [{ one: 1 }] : [] };
    }

    // createInvitation
    if (sql.startsWith("INSERT INTO project_invitations")) {
      return {
        rows: insertInvitationRow ? [{ ...insertInvitationRow }] : [],
      };
    }

    // getInvitationById
    if (sql.includes("WHERE i.id = $1")) {
      const row = invitationsById[parameters[0]];
      return { rows: row ? [{ ...row }] : [] };
    }

    // resolveInvitation (atomic pending -> resolved)
    if (sql.startsWith("UPDATE project_invitations")) {
      return {
        rowCount: resolveInvitationRow ? 1 : 0,
        rows: resolveInvitationRow ? [{ ...resolveInvitationRow }] : [],
      };
    }

    // listPendingInvitationsForEmail
    if (sql.includes("WHERE LOWER(i.invitee_email)")) {
      return { rows: myInvitationRows.map((row) => ({ ...row })) };
    }

    // addCollaborator INSERT
    if (sql.startsWith("INSERT INTO project_collaborators")) {
      return {
        rows: addCollaboratorRow ? [{ ...addCollaboratorRow }] : [],
      };
    }

    // addCollaborator fallback for an existing member
    if (
      sql.startsWith(
        "SELECT id, project_id, user_id, role, created_at FROM project_collaborators",
      )
    ) {
      return {
        rows: existingCollaboratorRow ? [{ ...existingCollaboratorRow }] : [],
      };
    }

    // removeCollaborator
    if (sql.startsWith("DELETE FROM project_collaborators")) {
      return {
        rowCount: removeCollaboratorRowCount,
        rows:
          removeCollaboratorRowCount > 0 ? [{ id: parameters[1] }] : [],
      };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  };

  return { statements, fakeQuery };
}

function patchDb(fakeQuery) {
  return patch(db, "query", fakeQuery);
}

/*
 * GET /api/projects/:projectId/collaborators
 */

test("GET collaborators returns the owner, collaborators and pending invitations", async () => {
  const { statements, fakeQuery } = createSharingFakeDb({
    collaboratorRows: [
      {
        id: "collab-1",
        project_id: "project-1",
        user_id: "user-2",
        role: "editor",
        created_at: "2026-10-02T08:00:00Z",
        name: "Inviter Two",
        email: "inviter@example.com",
        avatar_url: null,
      },
    ],
    projectPendingInvitationRows: [
      {
        id: "invitation-1",
        project_id: "project-1",
        inviter_id: "user-1",
        invitee_email: "friend@example.com",
        status: "pending",
        created_at: "2026-10-01T08:00:00Z",
        inviter_name: "Owner One",
        inviter_email: "owner@example.com",
      },
    ],
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(
      `${baseUrl}/api/projects/project-1/collaborators`,
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.project.id, "project-1");
    assert.equal(body.data.project.name, "Shared Logbook");
    assert.equal(body.data.project.ownerId, "user-1");

    assert.equal(body.data.owner.id, "user-1");
    assert.equal(body.data.owner.name, "Owner One");
    assert.equal(body.data.owner.email, "owner@example.com");

    assert.equal(body.data.collaborators.length, 1);
    assert.equal(body.data.collaborators[0].userId, "user-2");
    assert.equal(body.data.collaborators[0].role, "editor");
    assert.equal(body.data.collaborators[0].email, "inviter@example.com");

    assert.equal(body.data.invitations.length, 1);
    assert.equal(body.data.invitations[0].inviteeEmail, "friend@example.com");
    assert.equal(body.data.invitations[0].status, "pending");

    // The access gate must accept owner OR collaborator access.
    const gate = statements[0];

    assert.match(gate.sql, /owner_id = \$2/);
    assert.match(gate.sql, /FROM project_collaborators pc/);
    assert.match(gate.sql, /pc\.user_id = \$2/);
    assert.deepEqual(gate.parameters, ["project-1", "user-1"]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("GET collaborators reports inaccessible projects as 404", async () => {
  const { fakeQuery } = createSharingFakeDb({ projectRow: null });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(
      `${baseUrl}/api/projects/project-404/collaborators`,
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Project not found",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

test("GET collaborators requires authentication", async () => {
  const { server, baseUrl } = await startServer({ user: null });

  try {
    const response = await fetch(
      `${baseUrl}/api/projects/project-1/collaborators`,
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Authentication required",
    });
  } finally {
    await closeServer(server);
  }
});

/*
 * POST /api/projects/:projectId/collaborators/invitations
 */

test("POST invitations invites a user by email and lowercases the address", async () => {
  const { statements, fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-1": OWNER_ROW,
    },
    insertInvitationRow: {
      id: "invitation-9",
      project_id: "project-1",
      inviter_id: "user-1",
      invitee_email: "friend@example.com",
      status: "pending",
      created_at: "2026-10-09T08:00:00Z",
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await postJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations`,
      { email: "Friend@Example.com" },
    );

    assert.equal(response.status, 201);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.id, "invitation-9");
    assert.equal(body.data.inviteeEmail, "friend@example.com");
    assert.equal(body.data.status, "pending");
    assert.equal(body.data.inviterName, "Owner One");
    assert.equal(body.data.inviterEmail, "owner@example.com");

    const insert = statements.find((statement) =>
      statement.sql.startsWith("INSERT INTO project_invitations"),
    );

    assert.ok(insert);
    assert.deepEqual(insert.parameters, [
      "project-1",
      "user-1",
      "friend@example.com",
    ]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("POST invitations rejects an invalid email", async () => {
  const restore = patchDb(async () => {
    throw new Error("queries must not run for invalid input");
  });

  const { server, baseUrl } = await startServer();

  try {
    const response = await postJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations`,
      { email: "not-an-email" },
    );

    assert.equal(response.status, 400);

    const body = await response.json();

    assert.equal(body.success, false);
    assert.equal(body.message, "Invalid invitation data");
    assert.ok(body.errors);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("POST invitations refuses inviting yourself", async () => {
  const { fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-1": OWNER_ROW,
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await postJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations`,
      { email: "Owner@Example.com" },
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "You cannot invite yourself to this project",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

test("POST invitations refuses inviting the project owner", async () => {
  const { fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-2": INVITER_ROW,
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-2" } });

  try {
    const response = await postJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations`,
      { email: "owner@example.com" },
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "The project owner already has full access to this project",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

test("POST invitations rejects a duplicate pending invitation", async () => {
  const { fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-1": OWNER_ROW,
    },
    pendingInvitationsByProjectEmail: {
      "project-1:friend@example.com": { id: "invitation-1" },
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await postJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations`,
      { email: "friend@example.com" },
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "An invitation for this email is already pending",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

test("POST invitations rejects an existing collaborator", async () => {
  const { fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-1": OWNER_ROW,
    },
    usersByEmail: {
      "friend@example.com": {
        id: "user-3",
        name: "Friend Three",
        email: "friend@example.com",
      },
    },
    collaboratorUserIds: ["user-3"],
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await postJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations`,
      { email: "friend@example.com" },
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "This user is already a collaborator on this project",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

/*
 * DELETE /api/projects/:projectId/collaborators/invitations/:invitationId
 */

test("DELETE invitations revokes a pending invitation for the owner", async () => {
  const { statements, fakeQuery } = createSharingFakeDb({
    invitationsById: {
      "invitation-1": { ...INVITATION_ROW, inviter_id: "user-2" },
    },
    resolveInvitationRow: {
      id: "invitation-1",
      project_id: "project-1",
      invitee_email: "friend@example.com",
      status: "revoked",
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await deleteJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations/invitation-1`,
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.id, "invitation-1");
    assert.equal(body.data.status, "revoked");

    const resolve = statements.find((statement) =>
      statement.sql.startsWith("UPDATE project_invitations"),
    );

    assert.ok(resolve);
    assert.match(resolve.sql, /status = 'pending'/);
    assert.deepEqual(resolve.parameters, ["invitation-1", "revoked"]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("DELETE invitations revokes for the original inviter", async () => {
  const { fakeQuery } = createSharingFakeDb({
    invitationsById: {
      "invitation-1": {
        ...INVITATION_ROW,
        inviter_id: "user-2",
        inviter_name: "Inviter Two",
        inviter_email: "inviter@example.com",
      },
    },
    resolveInvitationRow: {
      id: "invitation-1",
      project_id: "project-1",
      invitee_email: "friend@example.com",
      status: "revoked",
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-2" } });

  try {
    const response = await deleteJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations/invitation-1`,
    );

    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.status, "revoked");
  } finally {
    restore();
    await closeServer(server);
  }
});

test("DELETE invitations refuses other collaborators", async () => {
  const { fakeQuery } = createSharingFakeDb({
    invitationsById: {
      "invitation-1": INVITATION_ROW,
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-3" } });

  try {
    const response = await deleteJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations/invitation-1`,
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Only the project owner or the inviter can revoke this invitation",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

test("DELETE invitations reports invitations of other projects as 404", async () => {
  const { fakeQuery } = createSharingFakeDb({
    invitationsById: {
      "invitation-2": {
        ...INVITATION_ROW,
        id: "invitation-2",
        project_id: "project-2",
      },
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await deleteJson(
      `${baseUrl}/api/projects/project-1/collaborators/invitations/invitation-2`,
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Invitation not found",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

/*
 * DELETE /api/projects/:projectId/collaborators/:userId
 */

test("DELETE collaborators lets the owner remove a collaborator", async () => {
  const { statements, fakeQuery } = createSharingFakeDb({});

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await deleteJson(
      `${baseUrl}/api/projects/project-1/collaborators/user-2`,
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.projectId, "project-1");
    assert.equal(body.data.userId, "user-2");
    assert.equal(body.data.removed, true);

    const remove = statements.find((statement) =>
      statement.sql.startsWith("DELETE FROM project_collaborators"),
    );

    assert.ok(remove);
    assert.deepEqual(remove.parameters, ["project-1", "user-2"]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("DELETE collaborators lets a collaborator leave the project", async () => {
  const { fakeQuery } = createSharingFakeDb({});

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-2" } });

  try {
    const response = await deleteJson(
      `${baseUrl}/api/projects/project-1/collaborators/user-2`,
    );

    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.removed, true);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("DELETE collaborators refuses a collaborator removing someone else", async () => {
  const { fakeQuery } = createSharingFakeDb({});

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-2" } });

  try {
    const response = await deleteJson(
      `${baseUrl}/api/projects/project-1/collaborators/user-3`,
    );

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Only the project owner can remove other collaborators",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

test("DELETE collaborators refuses removing the owner", async () => {
  const { fakeQuery } = createSharingFakeDb({});

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await deleteJson(
      `${baseUrl}/api/projects/project-1/collaborators/user-1`,
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "The owner cannot be removed from their own project",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

test("DELETE collaborators reports missing collaborators as 404", async () => {
  const { fakeQuery } = createSharingFakeDb({
    removeCollaboratorRowCount: 0,
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer();

  try {
    const response = await deleteJson(
      `${baseUrl}/api/projects/project-1/collaborators/user-9`,
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Collaborator not found",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

/*
 * GET /api/invitations
 */

test("GET /api/invitations lists pending invitations for the caller's email", async () => {
  const { statements, fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-2": {
        id: "user-2",
        google_id: "g-2",
        name: "Friend Two",
        email: "friend@example.com",
        avatar_url: null,
        bio: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    },
    myInvitationRows: [
      {
        id: "invitation-1",
        project_id: "project-1",
        inviter_id: "user-1",
        invitee_email: "friend@example.com",
        status: "pending",
        created_at: "2026-10-01T08:00:00Z",
        inviter_name: "Owner One",
        inviter_email: "owner@example.com",
        project_name: "Shared Logbook",
      },
    ],
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-2" } });

  try {
    const response = await fetch(`${baseUrl}/api/invitations`);

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0].id, "invitation-1");
    assert.equal(body.data[0].projectName, "Shared Logbook");
    assert.equal(body.data[0].inviterName, "Owner One");
    assert.equal(body.data[0].inviteeEmail, "friend@example.com");
    assert.equal(body.data[0].status, "pending");

    const list = statements.find((statement) =>
      statement.sql.includes("WHERE LOWER(i.invitee_email)"),
    );

    assert.ok(list);
    assert.deepEqual(list.parameters, ["friend@example.com"]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("GET /api/invitations requires authentication", async () => {
  const { server, baseUrl } = await startServer({ user: null });

  try {
    const response = await fetch(`${baseUrl}/api/invitations`);

    assert.equal(response.status, 401);
  } finally {
    await closeServer(server);
  }
});

/*
 * POST /api/invitations/:invitationId/accept
 */

test("POST accept grants access before resolving the invitation", async () => {
  const { statements, fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-2": {
        id: "user-2",
        google_id: "g-2",
        name: "Friend Two",
        email: "friend@example.com",
        avatar_url: null,
        bio: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    },
    invitationsById: {
      "invitation-1": INVITATION_ROW,
    },
    addCollaboratorRow: {
      id: "collab-9",
      project_id: "project-1",
      user_id: "user-2",
      role: "editor",
      created_at: "2026-10-09T08:00:00Z",
    },
    resolveInvitationRow: {
      id: "invitation-1",
      project_id: "project-1",
      invitee_email: "friend@example.com",
      status: "accepted",
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-2" } });

  try {
    const response = await postJson(
      `${baseUrl}/api/invitations/invitation-1/accept`,
      {},
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.id, "invitation-1");
    assert.equal(body.data.projectId, "project-1");
    assert.equal(body.data.projectName, "Shared Logbook");
    assert.equal(body.data.status, "accepted");

    const grant = statements.findIndex((statement) =>
      statement.sql.startsWith("INSERT INTO project_collaborators"),
    );
    const resolve = statements.findIndex((statement) =>
      statement.sql.startsWith("UPDATE project_invitations"),
    );

    assert.ok(grant >= 0, "accept must insert a collaborator row");
    assert.ok(resolve >= 0, "accept must resolve the invitation");
    assert.ok(
      grant < resolve,
      "collaborator access is granted before the invitation resolves",
    );

    assert.deepEqual(statements[grant].parameters, ["project-1", "user-2"]);
    assert.deepEqual(statements[resolve].parameters, [
      "invitation-1",
      "accepted",
    ]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("POST accept ignores invitations addressed to someone else", async () => {
  const { statements, fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-3": {
        id: "user-3",
        google_id: "g-3",
        name: "Stranger Three",
        email: "stranger@example.com",
        avatar_url: null,
        bio: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    },
    invitationsById: {
      "invitation-1": INVITATION_ROW,
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-3" } });

  try {
    const response = await postJson(
      `${baseUrl}/api/invitations/invitation-1/accept`,
      {},
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Invitation not found",
    });

    assert.equal(
      statements.some((statement) =>
        statement.sql.startsWith("INSERT INTO project_collaborators"),
      ),
      false,
    );
  } finally {
    restore();
    await closeServer(server);
  }
});

test("POST accept reports already-resolved invitations as 409", async () => {
  const { statements, fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-2": {
        id: "user-2",
        google_id: "g-2",
        name: "Friend Two",
        email: "friend@example.com",
        avatar_url: null,
        bio: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    },
    invitationsById: {
      "invitation-1": INVITATION_ROW,
    },
    addCollaboratorRow: {
      id: "collab-9",
      project_id: "project-1",
      user_id: "user-2",
      role: "editor",
      created_at: "2026-10-09T08:00:00Z",
    },
    resolveInvitationRow: null,
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-2" } });

  try {
    const response = await postJson(
      `${baseUrl}/api/invitations/invitation-1/accept`,
      {},
    );

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Invitation is no longer pending",
    });

    // Access was still granted before the lost race.
    assert.ok(
      statements.some((statement) =>
        statement.sql.startsWith("INSERT INTO project_collaborators"),
      ),
    );
  } finally {
    restore();
    await closeServer(server);
  }
});

/*
 * POST /api/invitations/:invitationId/decline
 */

test("POST decline resolves the invitation without granting access", async () => {
  const { statements, fakeQuery } = createSharingFakeDb({
    usersById: {
      "user-2": {
        id: "user-2",
        google_id: "g-2",
        name: "Friend Two",
        email: "friend@example.com",
        avatar_url: null,
        bio: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    },
    invitationsById: {
      "invitation-1": INVITATION_ROW,
    },
    resolveInvitationRow: {
      id: "invitation-1",
      project_id: "project-1",
      invitee_email: "friend@example.com",
      status: "declined",
    },
  });

  const restore = patchDb(fakeQuery);
  const { server, baseUrl } = await startServer({ user: { id: "user-2" } });

  try {
    const response = await postJson(
      `${baseUrl}/api/invitations/invitation-1/decline`,
      {},
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.status, "declined");

    assert.equal(
      statements.some((statement) =>
        statement.sql.startsWith("INSERT INTO project_collaborators"),
      ),
      false,
    );
  } finally {
    restore();
    await closeServer(server);
  }
});
