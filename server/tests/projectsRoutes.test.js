const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const projectsRouter = require("../routes/projects");

function patch(target, key, value) {
  const original = target[key];

  target[key] = value;

  return () => {
    target[key] = original;
  };
}

function restoreAll(restores) {
  for (const restore of restores.reverse()) {
    restore();
  }
}

function normalize(raw) {
  return raw.replace(/\s+/g, " ").trim();
}

function findStatements(statements, prefix) {
  return statements.filter((statement) =>
    statement.sql.startsWith(prefix),
  );
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
  app.use("/api/projects", projectsRouter);
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

function postJson(url, body) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function patchJson(url, body) {
  return fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const PROJECT_ROW = {
  id: "project-1",
  owner_id: "user-1",
  name: "Logbook",
  description: "Main project",
  start_date: "2026-01-01",
  end_date: null,
  archived_at: null,
  created_at: "2026-01-01T08:00:00Z",
  updated_at: "2026-01-02T08:00:00Z",
};

function createFakeClient({ current = PROJECT_ROW } = {}) {
  let row = current ? { ...current } : null;
  const statements = [];
  let released = false;

  const client = {
    query: async (raw, parameters = []) => {
      const sql = normalize(raw);

      statements.push({ sql, parameters });

      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rowCount: 0, rows: [] };
      }

      if (sql.startsWith("SELECT")) {
        return { rows: row ? [{ ...row }] : [] };
      }

      if (sql.startsWith("UPDATE projects")) {
        row = {
          ...row,
          name: parameters[2],
          description: parameters[3],
          start_date: parameters[4],
          end_date: parameters[5],
        };

        return { rowCount: 1, rows: [] };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
    release: () => {
      released = true;
    },
  };

  return {
    client,
    statements,
    isReleased: () => released,
  };
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

/*
 * GET /api/projects
 */

test("GET /api/projects lists the caller's active projects", async () => {
  const statements = [];

  const restore = patch(db, "query", async (raw, parameters = []) => {
    statements.push({ sql: normalize(raw), parameters });

    return {
      rows: [
        {
          id: "project-1",
          name: "Logbook",
          description: "Main project",
          start_date: "2026-01-01",
          end_date: null,
          archived_at: null,
          created_at: "2026-01-01T08:00:00Z",
          updated_at: "2026-01-02T08:00:00Z",
          total_entries: 3,
          logged_minutes: 125,
          last_activity: "2026-02-03T10:00:00Z",
        },
        {
          id: "project-2",
          name: "Quiet",
          description: null,
          start_date: null,
          end_date: null,
          archived_at: null,
          created_at: "2026-01-01T08:00:00Z",
          updated_at: "2026-01-01T08:00:00Z",
          total_entries: 0,
          logged_minutes: 0,
          last_activity: null,
        },
      ],
    };
  });

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(`${baseUrl}/api/projects`);

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.length, 2);

    const [project, quiet] = body.data;

    assert.equal(project.id, "project-1");
    assert.equal(project.name, "Logbook");
    assert.equal(project.description, "Main project");
    assert.equal(project.startDate, "2026-01-01");
    assert.equal(project.endDate, null);
    assert.equal(project.archivedAt, null);
    assert.equal(project.totalEntries, 3);
    assert.equal(project.loggedMinutes, 125);
    assert.equal(project.lastActivity, "2026-02-03T10:00:00Z");

    assert.equal(quiet.id, "project-2");
    assert.equal(quiet.description, null);
    assert.equal(quiet.totalEntries, 0);
    assert.equal(quiet.loggedMinutes, 0);
    assert.equal(quiet.lastActivity, null);

    assert.equal(statements.length, 1);
    assert.deepEqual(statements[0].parameters, ["user-1"]);
    assert.match(
      statements[0].sql,
      /FROM projects p LEFT JOIN entries e/,
    );
    assert.match(statements[0].sql, /AND p\.archived_at IS NULL/);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("GET /api/projects scopes archived and all listings by status", async () => {
  const statements = [];

  const restore = patch(db, "query", async (raw, parameters = []) => {
    statements.push({ sql: normalize(raw), parameters });

    return { rows: [] };
  });

  const { server, baseUrl } = await startServer();

  try {
    for (const status of ["archived", "all"]) {
      const response = await fetch(
        `${baseUrl}/api/projects?status=${status}`,
      );

      assert.equal(response.status, 200);

      const body = await response.json();

      assert.deepEqual(body, { success: true, data: [] });
    }

    assert.equal(statements.length, 2);

    const [archived, all] = statements;

    assert.match(
      archived.sql,
      /AND p\.archived_at IS NOT NULL/,
    );
    assert.deepEqual(archived.parameters, ["user-1"]);

    assert.equal(all.sql.includes("AND p.archived_at IS"), false);
    assert.deepEqual(all.parameters, ["user-1"]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("GET /api/projects rejects an unknown status", async () => {
  const restore = patch(db, "query", async () => {
    throw new Error("query must not run for an invalid status");
  });

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(
      `${baseUrl}/api/projects?status=deleted`,
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Invalid project status",
    });
  } finally {
    restore();
    await closeServer(server);
  }
});

test("GET /api/projects requires authentication", async () => {
  const { server, baseUrl } = await startServer({ user: null });

  try {
    const response = await fetch(`${baseUrl}/api/projects`);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Authentication required",
    });
  } finally {
    await closeServer(server);
  }
});

test("GET /api/projects accepts the sub claim as the user id", async () => {
  let requestedUserId = null;

  const restore = patch(db, "query", async (raw, parameters = []) => {
    requestedUserId = parameters[0];

    return { rows: [] };
  });

  const { server, baseUrl } = await startServer({
    user: { sub: "user-9" },
  });

  try {
    const response = await fetch(`${baseUrl}/api/projects`);

    assert.equal(response.status, 200);
    assert.equal(requestedUserId, "user-9");
  } finally {
    restore();
    await closeServer(server);
  }
});

/*
 * POST /api/projects
 */

test("POST /api/projects creates a project with optional dates", async () => {
  const statements = [];

  const restore = patch(db, "query", async (raw, parameters = []) => {
    const sql = normalize(raw);

    statements.push({ sql, parameters });

    return {
      rows: [
        {
          id: "project-9",
          name: parameters[1],
          description: parameters[2],
          start_date: parameters[3],
          end_date: parameters[4],
          archived_at: null,
          created_at: "2026-09-28T10:00:00Z",
          updated_at: "2026-09-28T10:00:00Z",
        },
      ],
    };
  });

  const { server, baseUrl } = await startServer();

  try {
    const full = await postJson(`${baseUrl}/api/projects`, {
      name: "Telescope log",
      description: "Observation notes",
      startDate: "2026-01-05",
      endDate: "2026-12-31",
    });

    assert.equal(full.status, 201);

    const fullBody = await full.json();

    assert.equal(fullBody.success, true);
    assert.equal(fullBody.data.id, "project-9");
    assert.equal(fullBody.data.name, "Telescope log");
    assert.equal(fullBody.data.description, "Observation notes");
    assert.equal(fullBody.data.startDate, "2026-01-05");
    assert.equal(fullBody.data.endDate, "2026-12-31");
    assert.equal(fullBody.data.archivedAt, null);
    assert.equal(fullBody.data.totalEntries, 0);
    assert.equal(fullBody.data.loggedMinutes, 0);
    assert.equal(fullBody.data.lastActivity, null);

    const startOnly = await postJson(`${baseUrl}/api/projects`, {
      name: "Start only",
      startDate: "2026-06-01",
    });

    assert.equal(startOnly.status, 201);

    const endOnly = await postJson(`${baseUrl}/api/projects`, {
      name: "End only",
      description: "   ",
      endDate: "2026-08-01",
    });

    assert.equal(endOnly.status, 201);
    assert.equal((await endOnly.json()).data.description, null);

    const nameOnly = await postJson(`${baseUrl}/api/projects`, {
      name: "Bare",
    });

    assert.equal(nameOnly.status, 201);

    assert.equal(statements.length, 4);

    assert.match(statements[0].sql, /^INSERT INTO projects/);
    assert.deepEqual(statements[0].parameters, [
      "user-1",
      "Telescope log",
      "Observation notes",
      "2026-01-05",
      "2026-12-31",
    ]);

    assert.deepEqual(statements[1].parameters, [
      "user-1",
      "Start only",
      null,
      "2026-06-01",
      null,
    ]);

    assert.deepEqual(statements[2].parameters, [
      "user-1",
      "End only",
      null,
      null,
      "2026-08-01",
    ]);

    assert.deepEqual(statements[3].parameters, [
      "user-1",
      "Bare",
      null,
      null,
      null,
    ]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("POST /api/projects rejects invalid names and dates", async () => {
  const restore = patch(db, "query", async () => {
    throw new Error("insert must not run for invalid input");
  });

  const { server, baseUrl } = await startServer();

  const cases = [
    [{}, "Project name is required"],
    [{ name: "   " }, "Project name is required"],
    [{ name: "x".repeat(121) }, "Project name is too long"],
    [
      { name: "Ok", startDate: "13/01/2026" },
      "Start date must be a valid date",
    ],
    [
      { name: "Ok", startDate: "2026-13-01" },
      "Start date must be a valid date",
    ],
    [
      { name: "Ok", endDate: "not a date" },
      "End date must be a valid date",
    ],
    [
      {
        name: "Ok",
        startDate: "2026-05-10",
        endDate: "2026-05-09",
      },
      "End date cannot be before the start date",
    ],
  ];

  try {
    for (const [body, message] of cases) {
      const response = await postJson(`${baseUrl}/api/projects`, body);

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        success: false,
        message,
      });
    }
  } finally {
    restore();
    await closeServer(server);
  }
});

/*
 * PATCH /api/projects/:projectId
 */

test("PATCH /api/projects/:projectId updates the supplied fields and keeps the rest", async () => {
  const { client, statements, isReleased } = createFakeClient();

  const restores = [
    patch(db, "connect", async () => client),
    patch(db, "query", async () => {
      throw new Error("PATCH must use its transaction client");
    }),
  ];

  const { server, baseUrl } = await startServer();

  try {
    const response = await patchJson(
      `${baseUrl}/api/projects/project-1`,
      {
        name: "Renamed",
        description: "Updated",
        startDate: "2026-02-01",
        endDate: "2026-03-01",
      },
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.id, "project-1");
    assert.equal(body.data.name, "Renamed");
    assert.equal(body.data.description, "Updated");
    assert.equal(body.data.startDate, "2026-02-01");
    assert.equal(body.data.endDate, "2026-03-01");

    const update = findStatements(statements, "UPDATE projects")[0];

    assert.ok(update);
    assert.deepEqual(update.parameters, [
      "project-1",
      "user-1",
      "Renamed",
      "Updated",
      "2026-02-01",
      "2026-03-01",
    ]);

    assert.ok(
      statements.some((statement) => statement.sql === "BEGIN"),
    );
    assert.ok(
      statements.some((statement) => statement.sql === "COMMIT"),
    );
    assert.equal(
      statements.some((statement) => statement.sql === "ROLLBACK"),
      false,
    );
    assert.equal(isReleased(), true);
  } finally {
    restoreAll(restores);
    await closeServer(server);
  }
});

test("PATCH /api/projects/:projectId clears blank descriptions", async () => {
  const clients = [];

  const restores = [
    patch(db, "connect", async () => {
      const fake = createFakeClient();

      clients.push(fake);

      return fake.client;
    }),
    patch(db, "query", async () => {
      throw new Error("PATCH must use its transaction client");
    }),
  ];

  const { server, baseUrl } = await startServer();

  try {
    for (const description of [null, "   "]) {
      const response = await patchJson(
        `${baseUrl}/api/projects/project-1`,
        { description },
      );

      assert.equal(response.status, 200);

      const body = await response.json();

      assert.equal(body.data.description, null);
    }

    assert.equal(clients.length, 2);

    for (const { statements } of clients) {
      const update = findStatements(statements, "UPDATE projects")[0];

      assert.ok(update);
      assert.deepEqual(update.parameters, [
        "project-1",
        "user-1",
        "Logbook",
        null,
        "2026-01-01",
        null,
      ]);
    }
  } finally {
    restoreAll(restores);
    await closeServer(server);
  }
});

test("PATCH /api/projects/:projectId preserves the original error when the rollback fails", async () => {
  const statements = [];
  let released = false;

  const client = {
    query: async (raw) => {
      const sql = normalize(raw);

      statements.push(sql);

      if (sql === "ROLLBACK") {
        throw new Error("rollback failed");
      }

      if (sql === "BEGIN" || sql === "COMMIT") {
        return { rowCount: 0, rows: [] };
      }

      if (sql.startsWith("SELECT")) {
        return { rows: [{ ...PROJECT_ROW }] };
      }

      throw new Error("update failed");
    },
    release: () => {
      released = true;
    },
  };

  const restores = [patch(db, "connect", async () => client)];

  const { server, baseUrl } = await startServer();

  try {
    const response = await patchJson(
      `${baseUrl}/api/projects/project-1`,
      { name: "Renamed" },
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "update failed",
    });

    assert.ok(statements.includes("BEGIN"));
    assert.ok(statements.includes("ROLLBACK"));
    assert.equal(statements.includes("COMMIT"), false);
    assert.equal(released, true);
  } finally {
    restoreAll(restores);
    await closeServer(server);
  }
});

/*
 * PATCH /api/projects/:projectId/archive
 */

test("PATCH /api/projects/:projectId/archive archives a project by default", async () => {
  const statements = [];

  const restore = patch(db, "query", async (raw, parameters = []) => {
    statements.push({ sql: normalize(raw), parameters });

    return {
      rowCount: 1,
      rows: [
        {
          id: "project-1",
          name: "Logbook",
          description: null,
          start_date: null,
          end_date: null,
          archived_at: "2026-09-28T10:00:00Z",
          created_at: "2026-01-01T08:00:00Z",
          updated_at: "2026-09-28T10:00:00Z",
        },
      ],
    };
  });

  const { server, baseUrl } = await startServer();

  try {
    const response = await patchJson(
      `${baseUrl}/api/projects/project-1/archive`,
      {},
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.id, "project-1");
    assert.equal(body.data.archivedAt, "2026-09-28T10:00:00Z");

    assert.equal(statements.length, 1);
    assert.match(statements[0].sql, /^UPDATE projects/);
    assert.match(statements[0].sql, /archived_at = CASE/);
    assert.deepEqual(statements[0].parameters, [
      "project-1",
      "user-1",
      true,
    ]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("PATCH /api/projects/:projectId/archive restores an unarchived project", async () => {
  const statements = [];

  const restore = patch(db, "query", async (raw, parameters = []) => {
    statements.push({ sql: normalize(raw), parameters });

    return {
      rowCount: 1,
      rows: [
        {
          id: "project-1",
          name: "Logbook",
          description: null,
          start_date: null,
          end_date: null,
          archived_at: null,
          created_at: "2026-01-01T08:00:00Z",
          updated_at: "2026-09-28T10:00:00Z",
        },
      ],
    };
  });

  const { server, baseUrl } = await startServer();

  try {
    const response = await patchJson(
      `${baseUrl}/api/projects/project-1/archive`,
      { archived: false },
    );

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.success, true);
    assert.equal(body.data.archivedAt, null);

    assert.equal(statements.length, 1);
    assert.deepEqual(statements[0].parameters, [
      "project-1",
      "user-1",
      false,
    ]);
  } finally {
    restore();
    await closeServer(server);
  }
});

test("PATCH /api/projects/:projectId/archive reports missing projects", async () => {
  const restore = patch(db, "query", async () => ({
    rowCount: 0,
    rows: [],
  }));

  const { server, baseUrl } = await startServer();

  try {
    const response = await patchJson(
      `${baseUrl}/api/projects/project-404/archive`,
      { archived: true },
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
