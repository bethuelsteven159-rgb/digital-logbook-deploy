const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const repository = require("../repositories/postgresProjectDetailsRepository");
const projectDetailsRouter = require("../routes/projectDetails");

const {
  updateChecklistItemService,
  deleteChecklistItemService,
} = require("../services/projectDetailsService");

const { updateChecklistSchema } = require("../validation/entry.validation");

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

async function assertServiceError(
  promiseFactory,
  statusCode,
  message,
) {
  await assert.rejects(promiseFactory, (error) => {
    assert.equal(error.statusCode, statusCode);

    if (message instanceof RegExp) {
      assert.match(error.message, message);
    } else {
      assert.equal(error.message, message);
    }

    return true;
  });
}

function makeChecklistItem(overrides = {}) {
  return {
    id: "item-1",
    entryId: "entry-1",
    text: "Prep equipment",
    completed: false,
    position: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/*
 * Validation
 */

test("checklist validation requires at least one change", () => {
  const empty = updateChecklistSchema.safeParse({});

  assert.equal(empty.success, false);
  assert.ok(
    empty.error
      .flatten()
      .formErrors.includes(
        "At least one checklist value must be provided",
      ),
  );

  const blankText = updateChecklistSchema.safeParse({
    text: "   ",
  });

  assert.equal(blankText.success, false);
  assert.equal(updateChecklistSchema.safeParse({ text: "x".repeat(301) }).success, false);
});

test("checklist validation trims text and accepts partial updates", () => {
  const completedOnly = updateChecklistSchema.safeParse({
    completed: true,
  });

  assert.equal(completedOnly.success, true);
  assert.deepEqual(completedOnly.data, { completed: true });

  const both = updateChecklistSchema.safeParse({
    text: "  Review notes  ",
    completed: false,
  });

  assert.equal(both.success, true);
  assert.deepEqual(both.data, {
    text: "Review notes",
    completed: false,
  });

  assert.equal(
    updateChecklistSchema.safeParse({ completed: "yes" }).success,
    false,
  );
});

/*
 * Service layer
 */

test("service updates a checklist item and serializes the result", async () => {
  let updateArguments = null;

  const restores = [
    patch(repository, "getOwnedEntry", async (entryId, userId) => {
      assert.equal(entryId, "entry-1");
      assert.equal(userId, "user-1");
      return { id: "entry-1" };
    }),
    patch(
      repository,
      "updateChecklistItem",
      async (entryId, itemId, changes) => {
        updateArguments = { entryId, itemId, changes };

        return makeChecklistItem({
          text: "Review notes",
          completed: 1,
          position: 2,
        });
      },
    ),
  ];

  try {
    const result = await updateChecklistItemService({
      entryId: "entry-1",
      itemId: "item-1",
      userId: "user-1",
      changes: { completed: true, text: "Review notes" },
    });

    assert.deepEqual(updateArguments, {
      entryId: "entry-1",
      itemId: "item-1",
      changes: { completed: true, text: "Review notes" },
    });

    assert.deepEqual(result, {
      id: "item-1",
      text: "Review notes",
      completed: true,
      position: 2,
    });
  } finally {
    restoreAll(restores);
  }
});

test("service rejects checklist updates for entries the user does not own", async () => {
  const restore = patch(
    repository,
    "getOwnedEntry",
    async () => null,
  );

  try {
    await assertServiceError(
      () =>
        updateChecklistItemService({
          entryId: "entry-1",
          itemId: "item-1",
          userId: "user-1",
          changes: { completed: true },
        }),
      404,
      "Entry not found",
    );
  } finally {
    restore();
  }
});

test("service reports checklist items that no longer exist", async () => {
  const restores = [
    patch(repository, "getOwnedEntry", async () => ({
      id: "entry-1",
    })),
    patch(repository, "updateChecklistItem", async () => null),
  ];

  try {
    await assertServiceError(
      () =>
        updateChecklistItemService({
          entryId: "entry-1",
          itemId: "item-404",
          userId: "user-1",
          changes: { completed: true },
        }),
      404,
      "Checklist item not found",
    );
  } finally {
    restoreAll(restores);
  }
});

test("service deletes owned checklist items only", async () => {
  let deleteArguments = null;

  const restores = [
    patch(repository, "getOwnedEntry", async (entryId, userId) => {
      assert.equal(entryId, "entry-1");
      assert.equal(userId, "user-1");
      return { id: "entry-1" };
    }),
    patch(
      repository,
      "deleteChecklistItem",
      async (entryId, itemId) => {
        deleteArguments = { entryId, itemId };
        return { id: "item-1" };
      },
    ),
  ];

  try {
    const result = await deleteChecklistItemService({
      entryId: "entry-1",
      itemId: "item-1",
      userId: "user-1",
    });

    assert.deepEqual(result, { id: "item-1" });
    assert.deepEqual(deleteArguments, {
      entryId: "entry-1",
      itemId: "item-1",
    });
  } finally {
    restoreAll(restores);
  }
});

test("service delete reports missing entries and items", async () => {
  const noEntry = patch(
    repository,
    "getOwnedEntry",
    async () => null,
  );

  try {
    await assertServiceError(
      () =>
        deleteChecklistItemService({
          entryId: "entry-404",
          itemId: "item-1",
          userId: "user-1",
        }),
      404,
      "Entry not found",
    );
  } finally {
    noEntry();
  }

  const restores = [
    patch(repository, "getOwnedEntry", async () => ({
      id: "entry-1",
    })),
    patch(repository, "deleteChecklistItem", async () => null),
  ];

  try {
    await assertServiceError(
      () =>
        deleteChecklistItemService({
          entryId: "entry-1",
          itemId: "item-404",
          userId: "user-1",
        }),
      404,
      "Checklist item not found",
    );
  } finally {
    restoreAll(restores);
  }
});

/*
 * Repository layer
 */

test("repository updates only the provided checklist columns", async () => {
  const originalQuery = db.query;
  let statement = null;
  let parameters = null;

  db.query = async (text, values) => {
    statement = text;
    parameters = values;

    return {
      rows: [
        {
          id: "item-1",
          entry_id: "entry-1",
          text: "Prep equipment",
          completed: true,
          position: 0,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-02-01T00:00:00.000Z",
        },
      ],
    };
  };

  try {
    const result = await repository.updateChecklistItem(
      "entry-1",
      "item-1",
      { completed: true },
    );

    assert.match(statement, /UPDATE entry_checklist_items/);
    assert.match(statement, /completed = \$3/);
    assert.match(statement, /updated_at = \$4/);
    assert.match(statement, /WHERE id = \$1/);
    assert.match(statement, /entry_id = \$2/);
    assert.equal(statement.includes("text = "), false);

    assert.equal(parameters.length, 4);
    assert.deepEqual(parameters.slice(0, 3), [
      "item-1",
      "entry-1",
      true,
    ]);
    assert.ok(parameters[3] instanceof Date);

    assert.deepEqual(result, {
      id: "item-1",
      entryId: "entry-1",
      text: "Prep equipment",
      completed: true,
      position: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });
  } finally {
    db.query = originalQuery;
  }
});

test("repository includes the text column when renaming an item", async () => {
  const originalQuery = db.query;
  let statement = null;
  let parameters = null;

  db.query = async (text, values) => {
    statement = text;
    parameters = values;

    return { rows: [] };
  };

  try {
    const result = await repository.updateChecklistItem(
      "entry-1",
      "item-1",
      { text: "Review notes", completed: false },
    );

    assert.match(statement, /text = \$3/);
    assert.match(statement, /completed = \$4/);
    assert.match(statement, /updated_at = \$5/);

    assert.equal(parameters.length, 5);
    assert.deepEqual(parameters.slice(0, 4), [
      "item-1",
      "entry-1",
      "Review notes",
      false,
    ]);
    assert.ok(parameters[4] instanceof Date);

    assert.equal(result, null);
  } finally {
    db.query = originalQuery;
  }
});

test("repository delete reports whether a checklist item was removed", async () => {
  const originalQuery = db.query;
  let statement = null;
  let parameters = null;

  db.query = async (text, values) => {
    statement = text;
    parameters = values;

    return { rowCount: 1, rows: [{ id: "item-1" }] };
  };

  try {
    const result = await repository.deleteChecklistItem(
      "entry-1",
      "item-1",
    );

    assert.match(statement, /DELETE FROM entry_checklist_items/);
    assert.match(statement, /WHERE id = \$2/);
    assert.match(statement, /entry_id = \$1/);
    assert.deepEqual(parameters, ["entry-1", "item-1"]);
    assert.deepEqual(result, { id: "item-1" });
  } finally {
    db.query = originalQuery;
  }

  db.query = async () => ({ rowCount: 0, rows: [] });

  try {
    assert.equal(
      await repository.deleteChecklistItem(
        "entry-1",
        "item-404",
      ),
      null,
    );
  } finally {
    db.query = originalQuery;
  }
});

/*
 * HTTP routes
 */

async function startServer({ user = { id: "user-1" } } = {}) {
  const app = express();

  app.use(express.json());
  app.use((req, _res, next) => {
    if (user) {
      req.user = user;
    }

    next();
  });
  app.use("/api/projects", projectDetailsRouter);
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

test("checklist routes update and delete items for the owner", async () => {
  let updateChanges = null;

  const restores = [
    patch(repository, "getOwnedEntry", async () => ({
      id: "entry-1",
    })),
    patch(
      repository,
      "updateChecklistItem",
      async (entryId, itemId, changes) => {
        updateChanges = changes;

        return makeChecklistItem({
          completed: changes.completed ?? false,
          text: changes.text ?? "Prep equipment",
        });
      },
    ),
    patch(
      repository,
      "deleteChecklistItem",
      async () => ({ id: "item-1" }),
    ),
  ];

  const { server, baseUrl } = await startServer();

  try {
    const updateResponse = await fetch(
      `${baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      },
    );

    assert.equal(updateResponse.status, 200);
    assert.deepEqual(updateChanges, { completed: true });

    assert.deepEqual(await updateResponse.json(), {
      success: true,
      data: {
        id: "item-1",
        text: "Prep equipment",
        completed: true,
        position: 0,
      },
    });

    const renameResponse = await fetch(
      `${baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: "  Review notes  " }),
      },
    );

    assert.equal(renameResponse.status, 200);
    assert.deepEqual(updateChanges, { text: "Review notes" });

    const deleteResponse = await fetch(
      `${baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-1`,
      { method: "DELETE" },
    );

    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), {
      success: true,
      data: { id: "item-1" },
    });
  } finally {
    restoreAll(restores);
    await new Promise((resolve) => server.close(resolve));
  }
});

test("checklist routes reject invalid payloads without saving", async () => {
  let updateCalls = 0;

  const restores = [
    patch(repository, "getOwnedEntry", async () => {
      throw new Error("repository should not be called");
    }),
    patch(repository, "updateChecklistItem", async () => {
      updateCalls += 1;
      return makeChecklistItem();
    }),
  ];

  const { server, baseUrl } = await startServer();

  try {
    const emptyResponse = await fetch(
      `${baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    assert.equal(emptyResponse.status, 400);

    const emptyBody = await emptyResponse.json();

    assert.equal(emptyBody.success, false);
    assert.equal(
      emptyBody.message,
      "Invalid checklist data",
    );
    assert.ok(
      emptyBody.errors.formErrors.includes(
        "At least one checklist value must be provided",
      ),
    );

    const wrongTypeResponse = await fetch(
      `${baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: "yes" }),
      },
    );

    assert.equal(wrongTypeResponse.status, 400);

    const wrongTypeBody = await wrongTypeResponse.json();

    assert.equal(wrongTypeBody.success, false);
    assert.equal(
      wrongTypeBody.message,
      "Invalid checklist data",
    );

    assert.equal(updateCalls, 0);
  } finally {
    restoreAll(restores);
    await new Promise((resolve) => server.close(resolve));
  }
});

test("checklist routes report missing entries and items", async () => {
  const restoreNoEntry = patch(
    repository,
    "getOwnedEntry",
    async () => null,
  );

  const first = await startServer();

  try {
    const response = await fetch(
      `${first.baseUrl}/api/projects/project-1/entries/entry-404/checklist/item-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      },
    );

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Entry not found",
    });
  } finally {
    restoreNoEntry();
    await new Promise((resolve) => first.server.close(resolve));
  }

  const restores = [
    patch(repository, "getOwnedEntry", async () => ({
      id: "entry-1",
    })),
    patch(repository, "updateChecklistItem", async () => null),
    patch(repository, "deleteChecklistItem", async () => null),
  ];

  const second = await startServer();

  try {
    const updateResponse = await fetch(
      `${second.baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-404`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      },
    );

    assert.equal(updateResponse.status, 404);
    assert.deepEqual(await updateResponse.json(), {
      success: false,
      message: "Checklist item not found",
    });

    const deleteResponse = await fetch(
      `${second.baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-404`,
      { method: "DELETE" },
    );

    assert.equal(deleteResponse.status, 404);
    assert.deepEqual(await deleteResponse.json(), {
      success: false,
      message: "Checklist item not found",
    });
  } finally {
    restoreAll(restores);
    await new Promise((resolve) =>
      second.server.close(resolve),
    );
  }
});

test("checklist routes require authentication", async () => {
  const { server, baseUrl } = await startServer({
    user: null,
  });

  try {
    const updateResponse = await fetch(
      `${baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      },
    );

    assert.equal(updateResponse.status, 401);
    assert.deepEqual(await updateResponse.json(), {
      success: false,
      message: "Authentication required",
    });

    const deleteResponse = await fetch(
      `${baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-1`,
      { method: "DELETE" },
    );

    assert.equal(deleteResponse.status, 401);
  } finally {
    await new Promise((resolve) =>
      server.close(resolve),
    );
  }
});

test("checklist routes accept the subject claim as the user id", async () => {
  let seenUserId = null;

  const restores = [
    patch(repository, "getOwnedEntry", async (_entryId, userId) => {
      seenUserId = userId;
      return { id: "entry-1" };
    }),
    patch(
      repository,
      "updateChecklistItem",
      async () => makeChecklistItem({ completed: true }),
    ),
  ];

  const { server, baseUrl } = await startServer({
    user: { sub: "user-9" },
  });

  try {
    const response = await fetch(
      `${baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      },
    );

    assert.equal(response.status, 200);
    assert.equal(seenUserId, "user-9");
  } finally {
    restoreAll(restores);
    await new Promise((resolve) => server.close(resolve));
  }
});

test("checklist routes surface unexpected failures as 500", async () => {
  const restore = patch(
    repository,
    "getOwnedEntry",
    async () => {
      throw new Error("database offline");
    },
  );

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(
      `${baseUrl}/api/projects/project-1/entries/entry-1/checklist/item-1`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: true }),
      },
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "database offline",
    });
  } finally {
    restore();
    await new Promise((resolve) =>
      server.close(resolve),
    );
  }
});
