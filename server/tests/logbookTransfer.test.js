const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const repository = require("../repositories/logbookTransferRepository");
const logbookTransferRouter = require("../routes/logbookTransfer");

const {
  exportLogbookService,
  importLogbookService,
  validateImportPayload,
} = require("../services/logbookTransferService");

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

function assertValidationError(payload, message) {
  assert.throws(
    () => validateImportPayload(payload),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.equal(error.message, message);
      return true;
    },
  );
}

const EXPORT_ROWS = {
  projects: [
    {
      id: "project-1",
      name: "Logbook",
      description: "Main project",
      start_date: "2026-01-01",
      end_date: null,
      archived_at: null,
      created_at: new Date("2026-01-01T08:00:00Z"),
      updated_at: new Date("2026-01-02T08:00:00Z"),
    },
    {
      id: "project-2",
      name: "Archive",
      description: null,
      start_date: null,
      end_date: null,
      archived_at: "2026-02-01T00:00:00Z",
      created_at: new Date("2026-01-03T08:00:00Z"),
      updated_at: new Date("2026-01-03T08:00:00Z"),
    },
  ],
  fields: [
    {
      id: "field-1",
      project_id: "project-1",
      name: "Score",
      field_type: "number",
      position: 0,
      required: true,
      archived_at: null,
      created_at: new Date("2026-01-01T08:00:00Z"),
      updated_at: new Date("2026-01-01T08:00:00Z"),
    },
    {
      id: "field-2",
      project_id: "project-2",
      name: "Notes",
      field_type: "long_text",
      position: 1,
      required: false,
      archived_at: null,
      created_at: new Date("2026-01-03T08:00:00Z"),
      updated_at: new Date("2026-01-03T08:00:00Z"),
    },
  ],
  entries: [
    {
      id: "entry-1",
      project_id: "project-1",
      name: "Session",
      duration_minutes: 45,
      occurred_at: "2026-01-05",
      created_at: new Date("2026-01-05T09:00:00Z"),
      updated_at: new Date("2026-01-05T09:30:00Z"),
    },
    {
      id: "entry-2",
      project_id: "project-2",
      name: "Archived session",
      duration_minutes: 10,
      occurred_at: null,
      created_at: new Date("2026-01-06T09:00:00Z"),
      updated_at: new Date("2026-01-06T09:00:00Z"),
    },
  ],
  values: [
    {
      id: "value-1",
      entry_id: "entry-1",
      field_id: "field-1",
      value_text: null,
      value_number: 12.5,
      value_date: null,
      created_at: new Date("2026-01-05T09:10:00Z"),
    },
  ],
  checklist: [
    {
      id: "item-1",
      entry_id: "entry-1",
      text: "Prep equipment",
      completed: true,
      position: 0,
      created_at: new Date("2026-01-05T09:00:00Z"),
      updated_at: new Date("2026-01-05T09:05:00Z"),
    },
  ],
  references: [
    {
      id: "reference-1",
      entry_id: "entry-1",
      referenced_project_id: "project-2",
      created_at: new Date("2026-01-05T09:20:00Z"),
    },
  ],
};

function makeImportData() {
  return {
    projects: [
      {
        id: "project-1",
        name: "Imported logbook",
        description: null,
        startDate: null,
        endDate: null,
        archivedAt: null,
        createdAt: null,
        updatedAt: null,
      },
    ],
    fields: [
      {
        id: "field-1",
        projectId: "project-1",
        name: "Score",
        fieldType: "number",
        position: 0,
        required: false,
        archivedAt: null,
        createdAt: null,
        updatedAt: null,
      },
    ],
    entries: [
      {
        id: "entry-1",
        projectId: "project-1",
        name: "Session",
        durationMinutes: 30,
        occurredAt: null,
        createdAt: null,
        updatedAt: null,
      },
    ],
    values: [
      {
        id: "value-1",
        entryId: "entry-1",
        fieldId: "field-1",
        valueText: null,
        valueNumber: 5,
        valueDate: null,
        createdAt: null,
      },
    ],
    checklist: [
      {
        id: "item-1",
        entryId: "entry-1",
        text: "Prep equipment",
        completed: true,
        position: 0,
        createdAt: null,
        updatedAt: null,
      },
    ],
    references: [
      {
        entryId: "entry-1",
        referencedProjectId: "project-1",
        createdAt: null,
      },
    ],
  };
}

function createFakeQueryable({ existingTables = [] } = {}) {
  const statements = [];

  const query = async (raw, parameters = []) => {
    const sql = raw.replace(/\s+/g, " ").trim();

    statements.push({ sql, parameters });

    const existenceCheck = sql.match(
      /^SELECT id FROM (\w+)/,
    );

    if (existenceCheck) {
      const table = existenceCheck[1];

      return existingTables.includes(table)
        ? { rowCount: 1, rows: [{ id: parameters[0] }] }
        : { rowCount: 0, rows: [] };
    }

    if (
      sql.startsWith(
        "INSERT INTO entry_project_references",
      )
    ) {
      return {
        rowCount: existingTables.includes(
          "entry_project_references",
        )
          ? 0
          : 1,
        rows: [],
      };
    }

    return { rowCount: 1, rows: [] };
  };

  return { query, statements };
}

function findStatements(statements, prefix) {
  return statements.filter((statement) =>
    statement.sql.startsWith(prefix),
  );
}

/*
 * Export service
 */

test("export maps owned rows into a versioned payload", async () => {
  let requestedUserId = null;

  const restore = patch(
    repository,
    "getLogbook",
    async (userId) => {
      requestedUserId = userId;
      return EXPORT_ROWS;
    },
  );

  try {
    const payload = await exportLogbookService({
      userId: "user-1",
    });

    assert.equal(requestedUserId, "user-1");
    assert.equal(payload.version, 1);
    assert.match(
      payload.exportedAt,
      /^\d{4}-\d{2}-\d{2}T/,
    );

    assert.equal(payload.projects.length, 2);

    const [project, archivedProject] = payload.projects;

    assert.equal(project.id, "project-1");
    assert.equal(project.description, "Main project");
    assert.equal(project.startDate, "2026-01-01");
    assert.equal(project.archivedAt, null);
    assert.equal(
      project.createdAt,
      "2026-01-01T08:00:00.000Z",
    );
    assert.equal(
      project.updatedAt,
      "2026-01-02T08:00:00.000Z",
    );

    assert.equal(project.fields.length, 1);
    assert.equal(project.fields[0].id, "field-1");
    assert.equal(project.fields[0].fieldType, "number");
    assert.equal(
      project.fields[0].createdAt,
      "2026-01-01T08:00:00.000Z",
    );

    assert.equal(project.entries.length, 1);

    const [entry] = project.entries;

    assert.equal(entry.id, "entry-1");
    assert.equal(entry.durationMinutes, 45);
    assert.equal(
      entry.occurredAt,
      "2026-01-05T00:00:00.000Z",
    );

    assert.deepEqual(entry.values, [
      {
        id: "value-1",
        fieldId: "field-1",
        valueText: null,
        valueNumber: 12.5,
        valueDate: null,
        createdAt: "2026-01-05T09:10:00.000Z",
      },
    ]);

    assert.deepEqual(entry.checklist, [
      {
        id: "item-1",
        text: "Prep equipment",
        completed: true,
        position: 0,
        createdAt: "2026-01-05T09:00:00.000Z",
        updatedAt: "2026-01-05T09:05:00.000Z",
      },
    ]);

    assert.deepEqual(entry.referenceProjectIds, [
      "project-2",
    ]);

    assert.equal(archivedProject.id, "project-2");
    assert.equal(
      archivedProject.archivedAt,
      "2026-02-01T00:00:00.000Z",
    );
    assert.equal(archivedProject.fields.length, 1);
    assert.equal(
      archivedProject.fields[0].id,
      "field-2",
    );
    assert.equal(archivedProject.entries.length, 1);
    assert.equal(
      archivedProject.entries[0].id,
      "entry-2",
    );
    assert.deepEqual(
      archivedProject.entries[0].values,
      [],
    );
    assert.deepEqual(
      archivedProject.entries[0].checklist,
      [],
    );
    assert.deepEqual(
      archivedProject.entries[0].referenceProjectIds,
      [],
    );
  } finally {
    restore();
  }
});

test("export returns an empty payload for users without projects", async () => {
  const restore = patch(
    repository,
    "getLogbook",
    async () => ({
      projects: [],
      fields: [],
      entries: [],
      values: [],
      checklist: [],
      references: [],
    }),
  );

  try {
    const payload = await exportLogbookService({
      userId: "user-1",
    });

    assert.equal(payload.version, 1);
    assert.match(
      payload.exportedAt,
      /^\d{4}-\d{2}-\d{2}T/,
    );
    assert.deepEqual(payload.projects, []);
  } finally {
    restore();
  }
});

/*
 * Import validation
 */

function validPayload() {
  return {
    version: 1,
    projects: [
      {
        id: "project-1",
        name: "Imported logbook",
        fields: [
          {
            id: "field-1",
            name: "Score",
            fieldType: "number",
          },
        ],
        entries: [
          {
            id: "entry-1",
            name: "Session",
            durationMinutes: 30,
            values: [
              { fieldId: "field-1", valueNumber: 5 },
            ],
            checklist: [
              { text: "Prep equipment", completed: true },
            ],
            referenceProjectIds: ["project-1"],
          },
        ],
      },
    ],
  };
}

test("import validation accepts a well-formed payload", () => {
  assert.equal(validateImportPayload(validPayload()), undefined);
});

test("import validation rejects payloads that are not versioned objects", () => {
  assertValidationError(
    null,
    "Import file must contain a JSON object",
  );

  assertValidationError(
    { version: 2, projects: [] },
    "Unsupported logbook export version",
  );

  assertValidationError(
    { version: 1, projects: {} },
    "Import file must contain a projects array",
  );
});

test("import validation rejects invalid and duplicate projects", () => {
  assertValidationError(
    { version: 1, projects: [null] },
    "Invalid project in import file",
  );

  assertValidationError(
    {
      version: 1,
      projects: [{ name: "No id", fields: [], entries: [] }],
    },
    "Every imported project needs an id",
  );

  const duplicated = validPayload();

  duplicated.projects.push({
    ...duplicated.projects[0],
  });

  assertValidationError(
    duplicated,
    "Duplicate project id in import file",
  );

  assertValidationError(
    {
      version: 1,
      projects: [
        { id: "project-1", name: "   ", fields: [], entries: [] },
      ],
    },
    "Every imported project needs a valid name",
  );

  assertValidationError(
    {
      version: 1,
      projects: [
        {
          id: "project-1",
          name: "x".repeat(121),
          fields: [],
          entries: [],
        },
      ],
    },
    "Every imported project needs a valid name",
  );

  assertValidationError(
    {
      version: 1,
      projects: [
        { id: "project-1", name: "Valid", fields: [] },
      ],
    },
    "Imported project fields and entries must be arrays",
  );
});

test("import validation rejects invalid and duplicate fields", () => {
  const duplicated = validPayload();

  duplicated.projects[0].fields.push({
    id: "field-1",
    name: "Score again",
    fieldType: "number",
  });

  assertValidationError(
    duplicated,
    "Invalid or duplicate field id in import file",
  );

  const unknownType = validPayload();

  unknownType.projects[0].fields[0].fieldType =
    "computed";

  assertValidationError(
    unknownType,
    "Imported project field is invalid",
  );

  const blankName = validPayload();

  blankName.projects[0].fields[0].name = "   ";

  assertValidationError(
    blankName,
    "Imported project field is invalid",
  );
});

test("import validation rejects invalid and duplicate entries", () => {
  const duplicated = validPayload();

  duplicated.projects[0].entries.push({
    ...duplicated.projects[0].entries[0],
  });

  assertValidationError(
    duplicated,
    "Invalid or duplicate entry id in import file",
  );

  const blankName = validPayload();

  blankName.projects[0].entries[0].name = "  ";

  assertValidationError(
    blankName,
    "Imported entry is invalid",
  );

  for (const durationMinutes of [-1, 10081, "soon"]) {
    const invalidDuration = validPayload();

    invalidDuration.projects[0].entries[0].durationMinutes =
      durationMinutes;

    assertValidationError(
      invalidDuration,
      "Imported entry duration is invalid",
    );
  }

  const missingFeatures = validPayload();

  delete missingFeatures.projects[0].entries[0].values;

  assertValidationError(
    missingFeatures,
    "Imported entry features are invalid",
  );
});

test("import validation rejects entries that reference outside data", () => {
  const unknownField = validPayload();

  unknownField.projects[0].entries[0].values[0].fieldId =
    "field-404";

  assertValidationError(
    unknownField,
    "Imported entry references an unknown field",
  );

  const unknownProject = validPayload();

  unknownProject.projects[0].entries[0].referenceProjectIds = [
    "project-404",
  ];

  assertValidationError(
    unknownProject,
    "Imported entry references an unknown project",
  );

  for (const checklist of [
    [{ text: "   " }],
    [{ completed: true }],
    [null],
  ]) {
    const invalidChecklist = validPayload();

    invalidChecklist.projects[0].entries[0].checklist =
      checklist;

    assertValidationError(
      invalidChecklist,
      "Imported checklist item is invalid",
    );
  }
});

/*
 * Import service
 */

test("import normalizes the payload and delegates to one transaction", async () => {
  let capturedArguments = null;

  const restore = patch(
    repository,
    "withTransaction",
    async (work) =>
      work({
        insertImportedLogbook: async (
          userId,
          data,
        ) => {
          capturedArguments = { userId, data };

          return { projectsImported: 1 };
        },
      }),
  );

  try {
    const result = await importLogbookService({
      userId: "user-1",
      payload: validPayload(),
    });

    assert.deepEqual(result, { projectsImported: 1 });
    assert.equal(capturedArguments.userId, "user-1");

    const { data } = capturedArguments;

    assert.equal(data.projects.length, 1);
    assert.deepEqual(data.fields[0].projectId, "project-1");
    assert.ok(data.fields[0].id === "field-1");
    assert.equal(data.entries[0].projectId, "project-1");
    assert.equal(data.values[0].entryId, "entry-1");
    assert.equal(data.checklist[0].entryId, "entry-1");

    assert.deepEqual(data.references, [
      {
        entryId: "entry-1",
        referencedProjectId: "project-1",
      },
    ]);
  } finally {
    restore();
  }
});

test("import rejects invalid payloads before opening a transaction", async () => {
  let transactionStarted = false;

  const restore = patch(
    repository,
    "withTransaction",
    async () => {
      transactionStarted = true;
      return {};
    },
  );

  try {
    await assertServiceError(
      () =>
        importLogbookService({
          userId: "user-1",
          payload: { version: 7, projects: [] },
        }),
      400,
      "Unsupported logbook export version",
    );

    assert.equal(transactionStarted, false);
  } finally {
    restore();
  }
});

/*
 * Repository import
 */

test("repository getLogbook short-circuits for users without projects", async () => {
  const statements = [];
  const originalQuery = db.query;

  db.query = async (raw, parameters = []) => {
    statements.push({
      sql: raw.replace(/\s+/g, " ").trim(),
      parameters,
    });

    return { rows: [] };
  };

  try {
    const data = await repository.getLogbook("user-1");

    assert.deepEqual(data, {
      projects: [],
      fields: [],
      entries: [],
      values: [],
      checklist: [],
      references: [],
    });

    assert.equal(statements.length, 1);
    assert.match(statements[0].sql, /FROM projects/);
    assert.deepEqual(statements[0].parameters, ["user-1"]);
  } finally {
    db.query = originalQuery;
  }
});

test("repository getLogbook collects rows for every owned table", async () => {
  const statements = [];
  const originalQuery = db.query;

  db.query = async (raw, parameters = []) => {
    const sql = raw.replace(/\s+/g, " ").trim();

    statements.push({ sql, parameters });

    if (sql.includes("FROM project_fields")) {
      return {
        rows: [
          {
            id: "field-1",
            project_id: "project-1",
            name: "Score",
          },
        ],
      };
    }

    if (sql.includes("FROM entry_field_values")) {
      return {
        rows: [{ id: "value-1", entry_id: "entry-1" }],
      };
    }

    if (sql.includes("FROM entry_checklist_items")) {
      return {
        rows: [{ id: "item-1", entry_id: "entry-1" }],
      };
    }

    if (sql.includes("FROM entry_project_references")) {
      return {
        rows: [
          {
            id: "reference-1",
            entry_id: "entry-1",
            referenced_project_id: "project-2",
          },
        ],
      };
    }

    if (sql.includes("FROM entries")) {
      return {
        rows: [{ id: "entry-1", project_id: "project-1" }],
      };
    }

    if (sql.includes("FROM projects")) {
      return {
        rows: [
          {
            id: "project-1",
            owner_id: "user-1",
            name: "Logbook",
          },
        ],
      };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  };

  try {
    const data = await repository.getLogbook("user-1");

    assert.equal(statements.length, 6);

    assert.deepEqual(data.projects, [
      { id: "project-1", owner_id: "user-1", name: "Logbook" },
    ]);
    assert.deepEqual(data.fields, [
      { id: "field-1", project_id: "project-1", name: "Score" },
    ]);
    assert.deepEqual(data.entries, [
      { id: "entry-1", project_id: "project-1" },
    ]);
    assert.deepEqual(data.values, [
      { id: "value-1", entry_id: "entry-1" },
    ]);
    assert.deepEqual(data.checklist, [
      { id: "item-1", entry_id: "entry-1" },
    ]);
    assert.deepEqual(data.references, [
      {
        id: "reference-1",
        entry_id: "entry-1",
        referenced_project_id: "project-2",
      },
    ]);

    const referencesStatement = statements.find((statement) =>
      statement.sql.includes(
        "FROM entry_project_references",
      ),
    );

    assert.deepEqual(referencesStatement.parameters, [
      ["project-1"],
      "user-1",
    ]);
  } finally {
    db.query = originalQuery;
  }
});

test("repository counts created rows on a first import", async () => {
  const queryable = createFakeQueryable();
  const originalQuery = db.query;

  db.query = queryable.query;

  try {
    const summary = await repository.insertImportedLogbook(
      "user-1",
      makeImportData(),
    );

    assert.deepEqual(summary, {
      projectsImported: 1,
      projectsUpdated: 0,
      fieldsImported: 1,
      fieldsUpdated: 0,
      entriesImported: 1,
      entriesUpdated: 0,
      valuesImported: 1,
      valuesUpdated: 0,
      checklistImported: 1,
      checklistUpdated: 0,
      referencesImported: 1,
    });

    const projectInsert = findStatements(
      queryable.statements,
      "INSERT INTO projects",
    )[0];

    assert.ok(projectInsert);
    assert.deepEqual(projectInsert.parameters.slice(0, 2), [
      "project-1",
      "user-1",
    ]);

    const entryInsert = findStatements(
      queryable.statements,
      "INSERT INTO entries",
    )[0];

    assert.ok(entryInsert);
    assert.equal(entryInsert.parameters[0], "entry-1");
    assert.equal(entryInsert.parameters[2], "user-1");

    assert.equal(
      findStatements(queryable.statements, "UPDATE")
        .length,
      0,
    );
  } finally {
    db.query = originalQuery;
  }
});

test("repository updates existing rows on a repeat import", async () => {
  const queryable = createFakeQueryable({
    existingTables: [
      "projects",
      "project_fields",
      "entries",
      "entry_field_values",
      "entry_checklist_items",
      "entry_project_references",
    ],
  });
  const originalQuery = db.query;

  db.query = queryable.query;

  try {
    const summary = await repository.insertImportedLogbook(
      "user-1",
      makeImportData(),
    );

    assert.deepEqual(summary, {
      projectsImported: 0,
      projectsUpdated: 1,
      fieldsImported: 0,
      fieldsUpdated: 1,
      entriesImported: 0,
      entriesUpdated: 1,
      valuesImported: 0,
      valuesUpdated: 1,
      checklistImported: 0,
      checklistUpdated: 1,
      referencesImported: 0,
    });

    for (const table of [
      "projects",
      "project_fields",
      "entries",
      "entry_field_values",
      "entry_checklist_items",
    ]) {
      assert.equal(
        findStatements(
          queryable.statements,
          `INSERT INTO ${table}`,
        ).length,
        0,
      );
    }

    assert.equal(
      findStatements(queryable.statements, "UPDATE")
        .length,
      5,
    );
  } finally {
    db.query = originalQuery;
  }
});

test("repository skips orphaned records that cannot be linked", async () => {
  const data = makeImportData();

  data.fields = [];
  data.values[0].fieldId = "field-404";
  data.checklist[0].entryId = "entry-404";
  data.references[0].referencedProjectId =
    "project-404";

  const queryable = createFakeQueryable();
  const originalQuery = db.query;

  db.query = queryable.query;

  try {
    const summary = await repository.insertImportedLogbook(
      "user-1",
      data,
    );

    assert.equal(summary.projectsImported, 1);
    assert.equal(summary.entriesImported, 1);
    assert.equal(summary.fieldsImported, 0);
    assert.equal(summary.valuesImported, 0);
    assert.equal(summary.checklistImported, 0);
    assert.equal(summary.referencesImported, 0);

    for (const table of [
      "entry_field_values",
      "entry_checklist_items",
      "entry_project_references",
    ]) {
      assert.equal(
        findStatements(
          queryable.statements,
          `INSERT INTO ${table}`,
        ).length,
        0,
      );
    }
  } finally {
    db.query = originalQuery;
  }
});

test("repository skips fields and entries for unknown projects", async () => {
  const data = makeImportData();

  data.fields[0].projectId = "project-404";
  data.entries[0].projectId = "project-404";

  const queryable = createFakeQueryable();
  const originalQuery = db.query;

  db.query = queryable.query;

  try {
    const summary = await repository.insertImportedLogbook(
      "user-1",
      data,
    );

    assert.equal(summary.projectsImported, 1);
    assert.equal(summary.fieldsImported, 0);
    assert.equal(summary.entriesImported, 0);
    assert.equal(summary.valuesImported, 0);
    assert.equal(summary.checklistImported, 0);

    for (const table of [
      "project_fields",
      "entries",
      "entry_field_values",
      "entry_checklist_items",
    ]) {
      assert.equal(
        findStatements(
          queryable.statements,
          `INSERT INTO ${table}`,
        ).length,
        0,
      );
    }
  } finally {
    db.query = originalQuery;
  }
});

/*
 * Transaction wrapper
 */

test("withTransaction commits successful work and releases the client", async () => {
  const statements = [];
  let released = false;

  const restore = patch(db, "connect", async () => ({
    query: async (sql) => {
      statements.push(sql);
    },
    release: () => {
      released = true;
    },
  }));

  try {
    const result = await repository.withTransaction(
      async (transactionRepository) => {
        assert.equal(
          typeof transactionRepository
            .insertImportedLogbook,
          "function",
        );

        return "imported";
      },
    );

    assert.equal(result, "imported");
    assert.deepEqual(statements, ["BEGIN", "COMMIT"]);
    assert.equal(released, true);
  } finally {
    restore();
  }
});

test("withTransaction rolls back failed work, releases the client and rethrows", async () => {
  const statements = [];
  let released = false;

  const restore = patch(db, "connect", async () => ({
    query: async (sql) => {
      statements.push(sql);
    },
    release: () => {
      released = true;
    },
  }));

  try {
    await assert.rejects(
      repository.withTransaction(async () => {
        throw new Error("import failed");
      }),
      /import failed/,
    );

    assert.deepEqual(statements, ["BEGIN", "ROLLBACK"]);
    assert.equal(released, true);
  } finally {
    restore();
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
  app.use("/api/logbook", logbookTransferRouter);
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

test("logbook routes export and import through the service layer", async () => {
  const restores = [
    patch(repository, "getLogbook", async () => EXPORT_ROWS),
    patch(
      repository,
      "withTransaction",
      async (work) =>
        work({
          insertImportedLogbook: async () => ({
            projectsImported: 1,
            projectsUpdated: 0,
            fieldsImported: 1,
            fieldsUpdated: 0,
            entriesImported: 1,
            entriesUpdated: 0,
            valuesImported: 1,
            valuesUpdated: 0,
            checklistImported: 1,
            checklistUpdated: 0,
            referencesImported: 1,
          }),
        }),
    ),
  ];

  const { server, baseUrl } = await startServer();

  try {
    const exportResponse = await fetch(
      `${baseUrl}/api/logbook/export`,
    );

    assert.equal(exportResponse.status, 200);

    const exportBody = await exportResponse.json();

    assert.equal(exportBody.success, true);
    assert.equal(exportBody.data.version, 1);
    assert.equal(exportBody.data.projects.length, 2);

    const importResponse = await fetch(
      `${baseUrl}/api/logbook/import`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validPayload()),
      },
    );

    assert.equal(importResponse.status, 201);

    const importBody = await importResponse.json();

    assert.equal(importBody.success, true);
    assert.equal(importBody.data.projectsImported, 1);
    assert.equal(importBody.data.referencesImported, 1);
  } finally {
    restoreAll(restores);
    await new Promise((resolve) => server.close(resolve));
  }
});

test("logbook routes reject invalid import payloads with 400", async () => {
  const restores = [
    patch(repository, "withTransaction", async () => {
      throw new Error("transaction should not start");
    }),
  ];

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(
      `${baseUrl}/api/logbook/import`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ version: 2, projects: [] }),
      },
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "Unsupported logbook export version",
    });
  } finally {
    restoreAll(restores);
    await new Promise((resolve) => server.close(resolve));
  }
});

test("logbook routes require authentication", async () => {
  const { server, baseUrl } = await startServer({
    user: null,
  });

  try {
    const exportResponse = await fetch(
      `${baseUrl}/api/logbook/export`,
    );

    assert.equal(exportResponse.status, 401);
    assert.deepEqual(await exportResponse.json(), {
      success: false,
      message: "Authentication required",
    });

    const importResponse = await fetch(
      `${baseUrl}/api/logbook/import`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validPayload()),
      },
    );

    assert.equal(importResponse.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("logbook routes accept the subject claim as the user id", async () => {
  let requestedUserId = null;

  const restore = patch(
    repository,
    "getLogbook",
    async (userId) => {
      requestedUserId = userId;

      return {
        projects: [],
        fields: [],
        entries: [],
        values: [],
        checklist: [],
        references: [],
      };
    },
  );

  const { server, baseUrl } = await startServer({
    user: { sub: "user-9" },
  });

  try {
    const response = await fetch(
      `${baseUrl}/api/logbook/export`,
    );

    assert.equal(response.status, 200);
    assert.equal(requestedUserId, "user-9");
  } finally {
    restore();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("logbook routes surface unexpected failures as 500", async () => {
  const restore = patch(repository, "getLogbook", async () => {
    throw new Error("database offline");
  });

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(
      `${baseUrl}/api/logbook/export`,
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      success: false,
      message: "database offline",
    });
  } finally {
    restore();
    await new Promise((resolve) => server.close(resolve));
  }
});
