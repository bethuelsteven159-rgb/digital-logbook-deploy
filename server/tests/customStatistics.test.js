const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const db = require("../db");
const repository = require("../repositories/postgresCustomStatisticsRepository");
const projectDetailsRepository = require("../repositories/postgresProjectDetailsRepository");
const statsRouter = require("../routes/stats");

const {
  validateCustomStatisticExpression,
  evaluateCustomStatisticValue,
  createCustomStatisticService,
  updateCustomStatisticService,
  listCustomStatisticsService,
  deleteCustomStatisticService,
} = require("../services/customStatisticsService");

const FIELD_SCORE = {
  id: "field-score",
  name: "Score",
  fieldType: "number",
};

const FIELD_NOTE = {
  id: "field-note",
  name: "Note",
  fieldType: "short_text",
};

const FIELD_DURATION = {
  id: "field-duration",
  name: "Total Duration",
  fieldType: "number",
};

const VALUE_ROWS = [
  {
    fieldId: "field-score",
    entryId: "entry-1",
    valueNumber: 10,
    valueText: null,
    valueDate: null,
  },
  {
    fieldId: "field-score",
    entryId: "entry-2",
    valueNumber: 20,
    valueText: null,
    valueDate: null,
  },
  {
    fieldId: "field-note",
    entryId: "entry-1",
    valueNumber: null,
    valueText: "done",
    valueDate: null,
  },
];

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

function makeStat(overrides = {}) {
  return {
    id: "stat-1",
    ownerId: "user-1",
    projectId: "project-1",
    name: "Total score",
    expression: "sum(Score)",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/*
 * Expression validation
 */

test("validation accepts a multi-field expression with aggregates and numbers", () => {
  const result = validateCustomStatisticExpression({
    expression:
      " (sum(Score) + 10) / count(Note) * 2 ",
    fields: [FIELD_SCORE, FIELD_NOTE],
  });

  assert.equal(
    result.expression,
    "(sum(Score) + 10) / count(Note) * 2",
  );

  assert.deepEqual(
    result.references.map((reference) => ({
      aggregate: reference.aggregate,
      fieldId: reference.field.id,
    })),
    [
      { aggregate: "sum", fieldId: "field-score" },
      { aggregate: "count", fieldId: "field-note" },
    ],
  );
});

test("validation accepts quoted field names with spaces", () => {
  const result = validateCustomStatisticExpression({
    expression: 'avg("Total Duration")',
    fields: [FIELD_DURATION],
  });

  assert.equal(result.references.length, 1);
  assert.equal(
    result.references[0].field.id,
    "field-duration",
  );
});

test("validation accepts alias-style field names", () => {
  const result = validateCustomStatisticExpression({
    expression: "sum(total_duration)",
    fields: [FIELD_DURATION],
  });

  assert.equal(
    result.references[0].field.id,
    "field-duration",
  );
});

test("validation rejects a missing expression", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "   ",
          fields: [FIELD_SCORE],
        }),
      ),
    400,
    "Expression is required.",
  );
});

test("validation rejects expressions longer than 500 characters", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "1+".repeat(300),
          fields: [FIELD_SCORE],
        }),
      ),
    400,
    "Expression must be 500 characters or fewer.",
  );
});

test("validation rejects invalid syntax", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "sum(",
          fields: [FIELD_SCORE],
        }),
      ),
    400,
    /Invalid expression syntax/,
  );
});

test("validation rejects unsupported functions", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "sqrt(Score)",
          fields: [FIELD_SCORE],
        }),
      ),
    400,
    /Unsupported function "sqrt\(\)"/,
  );
});

test("validation rejects aggregates with the wrong number of arguments", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "sum(Score, 2)",
          fields: [FIELD_SCORE],
        }),
      ),
    400,
    "sum() needs exactly one field, for example sum(Score).",
  );
});

test("validation rejects bare field names outside an aggregate", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "Score",
          fields: [FIELD_SCORE],
        }),
      ),
    400,
    "Fields must be used inside an aggregate function. Try sum(Score) or count(Score).",
  );
});

test("validation rejects unknown fields and lists the available ones", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "sum(Effort)",
          fields: [FIELD_SCORE, FIELD_NOTE],
        }),
      ),
    400,
    'Unknown field "Effort". Available fields: Score, Note.',
  );
});

test("validation rejects ambiguous alias matches", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "sum(total_duration)",
          fields: [
            FIELD_DURATION,
            {
              id: "field-duration-2",
              name: "Total-Duration",
              fieldType: "number",
            },
          ],
        }),
      ),
    400,
    /is ambiguous/,
  );
});

test("validation rejects non-numeric fields outside count()", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "sum(Note)",
          fields: [FIELD_NOTE],
        }),
      ),
    400,
    'Field "Note" is not a number field. Use count("Note") to count its values.',
  );
});

test("validation rejects unsupported operators", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "sum(Score) == 2",
          fields: [FIELD_SCORE],
        }),
      ),
    400,
    /Operator "==" is not supported/,
  );
});

test("validation rejects string constants and assignments", async () => {
  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: '"hello" + sum(Score)',
          fields: [FIELD_SCORE],
        }),
      ),
    400,
    "Only numeric values are allowed in statistics expressions.",
  );

  await assertServiceError(
    () =>
      Promise.resolve().then(() =>
        validateCustomStatisticExpression({
          expression: "x = sum(Score)",
          fields: [FIELD_SCORE],
        }),
      ),
    400,
    /unsupported element/,
  );
});

/*
 * Expression evaluation
 */

test("evaluation calculates sum, avg, min, max and count over numeric fields", () => {
  const fields = [FIELD_SCORE, FIELD_NOTE];

  assert.equal(
    evaluateCustomStatisticValue({
      expression: "sum(Score)",
      fields,
      valueRows: VALUE_ROWS,
    }),
    30,
  );

  assert.equal(
    evaluateCustomStatisticValue({
      expression: "avg(Score)",
      fields,
      valueRows: VALUE_ROWS,
    }),
    15,
  );

  assert.equal(
    evaluateCustomStatisticValue({
      expression: "min(Score)",
      fields,
      valueRows: VALUE_ROWS,
    }),
    10,
  );

  assert.equal(
    evaluateCustomStatisticValue({
      expression: "max(Score)",
      fields,
      valueRows: VALUE_ROWS,
    }),
    20,
  );

  assert.equal(
    evaluateCustomStatisticValue({
      expression: "count(Note)",
      fields,
      valueRows: VALUE_ROWS,
    }),
    1,
  );
});

test("evaluation combines aggregates and constants", () => {
  const value = evaluateCustomStatisticValue({
    expression: "(sum(Score) + 10) / count(Note) * 2",
    fields: [FIELD_SCORE, FIELD_NOTE],
    valueRows: VALUE_ROWS,
  });

  assert.equal(value, 80);
});

test("evaluation rounds results to six decimal places", () => {
  const value = evaluateCustomStatisticValue({
    expression: "avg(Score)",
    fields: [FIELD_SCORE],
    valueRows: [
      {
        fieldId: "field-score",
        entryId: "entry-1",
        valueNumber: 1,
        valueText: null,
        valueDate: null,
      },
      {
        fieldId: "field-score",
        entryId: "entry-2",
        valueNumber: 2,
        valueText: null,
        valueDate: null,
      },
      {
        fieldId: "field-score",
        entryId: "entry-3",
        valueNumber: 2,
        valueText: null,
        valueDate: null,
      },
    ],
  });

  assert.equal(value, 1.666667);
});

test("evaluation returns zero for sum and count over an empty dataset", () => {
  assert.equal(
    evaluateCustomStatisticValue({
      expression: "sum(Score)",
      fields: [FIELD_SCORE],
      valueRows: [],
    }),
    0,
  );

  assert.equal(
    evaluateCustomStatisticValue({
      expression: "count(Score)",
      fields: [FIELD_SCORE],
      valueRows: [],
    }),
    0,
  );
});

test("evaluation returns null when an average over an empty dataset is used", () => {
  assert.equal(
    evaluateCustomStatisticValue({
      expression: "avg(Score)",
      fields: [FIELD_SCORE],
      valueRows: [],
    }),
    null,
  );

  assert.equal(
    evaluateCustomStatisticValue({
      expression: "count(Score) + avg(Score)",
      fields: [FIELD_SCORE],
      valueRows: [],
    }),
    null,
  );
});

test("evaluation returns null for non-finite results", () => {
  assert.equal(
    evaluateCustomStatisticValue({
      expression: "sum(Score) / 0",
      fields: [FIELD_SCORE],
      valueRows: VALUE_ROWS,
    }),
    null,
  );
});

/*
 * Service layer
 */

test("create rejects projects the user does not own", async () => {
  const restore = patch(
    projectDetailsRepository,
    "getOwnedProject",
    async () => null,
  );

  try {
    await assertServiceError(
      () =>
        createCustomStatisticService({
          ownerId: "user-1",
          projectId: "project-1",
          data: {
            name: "Total",
            expression: "sum(Score)",
          },
        }),
      404,
      "Project not found",
    );
  } finally {
    restore();
  }
});

test("create requires a name", async () => {
  const restores = [
    patch(
      projectDetailsRepository,
      "getOwnedProject",
      async () => ({ id: "project-1" }),
    ),
  ];

  try {
    await assertServiceError(
      () =>
        createCustomStatisticService({
          ownerId: "user-1",
          projectId: "project-1",
          data: {
            name: "   ",
            expression: "sum(Score)",
          },
        }),
      400,
      "Name is required.",
    );
  } finally {
    restoreAll(restores);
  }
});

test("create validates the expression against the project fields", async () => {
  const restores = [
    patch(
      projectDetailsRepository,
      "getOwnedProject",
      async () => ({ id: "project-1" }),
    ),
    patch(repository, "getProjectFields", async () => [
      FIELD_SCORE,
    ]),
  ];

  try {
    await assertServiceError(
      () =>
        createCustomStatisticService({
          ownerId: "user-1",
          projectId: "project-1",
          data: {
            name: "Total",
            expression: "sum(Effort)",
          },
        }),
      400,
      /Unknown field "Effort"/,
    );
  } finally {
    restoreAll(restores);
  }
});

test("create persists the statistic and returns its computed value", async () => {
  let createArguments = null;

  const restores = [
    patch(
      projectDetailsRepository,
      "getOwnedProject",
      async () => ({ id: "project-1" }),
    ),
    patch(repository, "getProjectFields", async () => [
      FIELD_SCORE,
    ]),
    patch(repository, "getProjectFieldValues", async () =>
      VALUE_ROWS.filter(
        (row) => row.fieldId === "field-score",
      ),
    ),
    patch(
      repository,
      "createCustomStatistic",
      async (arguments_) => {
        createArguments = arguments_;

        return makeStat({
          name: arguments_.name,
          expression: arguments_.expression,
        });
      },
    ),
  ];

  try {
    const result = await createCustomStatisticService({
      ownerId: "user-1",
      projectId: "project-1",
      data: {
        name: "  Total score  ",
        expression: " sum(Score) ",
      },
    });

    assert.deepEqual(createArguments, {
      ownerId: "user-1",
      projectId: "project-1",
      name: "Total score",
      expression: "sum(Score)",
    });

    assert.deepEqual(result, {
      id: "stat-1",
      projectId: "project-1",
      name: "Total score",
      expression: "sum(Score)",
      value: 30,
      error: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  } finally {
    restoreAll(restores);
  }
});

test("update rejects missing statistics and project mismatches", async () => {
  const restores = [
    patch(
      repository,
      "getCustomStatisticById",
      async () => null,
    ),
  ];

  try {
    await assertServiceError(
      () =>
        updateCustomStatisticService({
          ownerId: "user-1",
          statId: "stat-1",
          data: {
            name: "Total",
            expression: "sum(Score)",
          },
        }),
      404,
      "Custom statistic not found",
    );

    await assertServiceError(
      () =>
        updateCustomStatisticService({
          ownerId: "user-1",
          projectId: "other-project",
          statId: "stat-1",
          data: {
            name: "Total",
            expression: "sum(Score)",
          },
        }),
      404,
      "Custom statistic not found",
    );
  } finally {
    restoreAll(restores);
  }
});

test("update saves the new definition and recalculates the value", async () => {
  let updateArguments = null;

  const restores = [
    patch(repository, "getCustomStatisticById", async () =>
      makeStat(),
    ),
    patch(
      projectDetailsRepository,
      "getOwnedProject",
      async () => ({ id: "project-1" }),
    ),
    patch(repository, "getProjectFields", async () => [
      FIELD_SCORE,
    ]),
    patch(repository, "getProjectFieldValues", async () =>
      VALUE_ROWS.filter(
        (row) => row.fieldId === "field-score",
      ),
    ),
    patch(
      repository,
      "updateCustomStatistic",
      async (arguments_) => {
        updateArguments = arguments_;

        return makeStat({
          name: arguments_.name,
          expression: arguments_.expression,
          updatedAt: "2026-02-01T00:00:00.000Z",
        });
      },
    ),
  ];

  try {
    const result = await updateCustomStatisticService({
      ownerId: "user-1",
      projectId: "project-1",
      statId: "stat-1",
      data: {
        name: "Average score",
        expression: "avg(Score)",
      },
    });

    assert.deepEqual(updateArguments, {
      statId: "stat-1",
      ownerId: "user-1",
      name: "Average score",
      expression: "avg(Score)",
    });

    assert.equal(result.name, "Average score");
    assert.equal(result.expression, "avg(Score)");
    assert.equal(result.value, 15);
    assert.equal(result.error, null);
  } finally {
    restoreAll(restores);
  }
});

test("list returns an empty array when the project has no statistics", async () => {
  let valuesRequested = false;

  const restores = [
    patch(
      projectDetailsRepository,
      "getOwnedProject",
      async () => ({ id: "project-1" }),
    ),
    patch(
      repository,
      "getCustomStatisticsForProject",
      async () => [],
    ),
    patch(repository, "getProjectFieldValues", async () => {
      valuesRequested = true;
      return [];
    }),
  ];

  try {
    const result = await listCustomStatisticsService({
      ownerId: "user-1",
      projectId: "project-1",
    });

    assert.deepEqual(result, []);
    assert.equal(valuesRequested, false);
  } finally {
    restoreAll(restores);
  }
});

test("list recalculates saved statistics and reports broken ones", async () => {
  const restores = [
    patch(
      projectDetailsRepository,
      "getOwnedProject",
      async () => ({ id: "project-1" }),
    ),
    patch(
      repository,
      "getCustomStatisticsForProject",
      async () => [
        makeStat(),
        makeStat({
          id: "stat-2",
          name: "Old effort",
          expression: "sum(Effort)",
        }),
      ],
    ),
    patch(repository, "getProjectFields", async () => [
      FIELD_SCORE,
    ]),
    patch(repository, "getProjectFieldValues", async () =>
      VALUE_ROWS.filter(
        (row) => row.fieldId === "field-score",
      ),
    ),
  ];

  try {
    const result = await listCustomStatisticsService({
      ownerId: "user-1",
      projectId: "project-1",
    });

    assert.equal(result.length, 2);
    assert.equal(result[0].value, 30);
    assert.equal(result[0].error, null);
    assert.equal(result[1].value, null);
    assert.match(result[1].error, /Unknown field "Effort"/);
  } finally {
    restoreAll(restores);
  }
});

test("list rejects projects the user does not own", async () => {
  const restore = patch(
    projectDetailsRepository,
    "getOwnedProject",
    async () => null,
  );

  try {
    await assertServiceError(
      () =>
        listCustomStatisticsService({
          ownerId: "user-1",
          projectId: "project-1",
        }),
      404,
      "Project not found",
    );
  } finally {
    restore();
  }
});

test("delete removes an owned statistic and rejects unknown ones", async () => {
  let deleted = null;

  const restores = [
    patch(repository, "getCustomStatisticById", async () =>
      makeStat(),
    ),
    patch(
      repository,
      "deleteCustomStatistic",
      async (arguments_) => {
        deleted = arguments_;
        return true;
      },
    ),
  ];

  try {
    const result = await deleteCustomStatisticService({
      ownerId: "user-1",
      statId: "stat-1",
    });

    assert.deepEqual(result, { id: "stat-1" });
    assert.deepEqual(deleted, {
      statId: "stat-1",
      ownerId: "user-1",
    });
  } finally {
    restoreAll(restores);
  }

  const restoreMissing = patch(
    repository,
    "getCustomStatisticById",
    async () => null,
  );

  try {
    await assertServiceError(
      () =>
        deleteCustomStatisticService({
          ownerId: "user-1",
          statId: "stat-404",
        }),
      404,
      "Custom statistic not found",
    );
  } finally {
    restoreMissing();
  }
});

/*
 * Repository layer
 */

test("repository maps database rows for custom statistics", async () => {
  const originalQuery = db.query;

  db.query = async (text, parameters) => {
    assert.match(text, /INSERT INTO custom_statistics/);
    assert.deepEqual(parameters, [
      "user-1",
      "project-1",
      "Total",
      "sum(Score)",
    ]);

    return {
      rows: [
        {
          id: "stat-1",
          owner_id: "user-1",
          project_id: "project-1",
          name: "Total",
          expression: "sum(Score)",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
  };

  try {
    const result = await repository.createCustomStatistic({
      ownerId: "user-1",
      projectId: "project-1",
      name: "Total",
      expression: "sum(Score)",
    });

    assert.deepEqual(result, makeStat({ name: "Total" }));
  } finally {
    db.query = originalQuery;
  }
});

test("repository reads project fields and field values in camelCase", async () => {
  const originalQuery = db.query;
  const calls = [];

  db.query = async (text) => {
    calls.push(text);

    if (text.includes("FROM project_fields")) {
      return {
        rows: [
          {
            id: "field-score",
            name: "Score",
            field_type: "number",
          },
        ],
      };
    }

    return {
      rows: [
        {
          field_id: "field-score",
          entry_id: "entry-1",
          value_text: null,
          value_number: "12.5",
          value_date: null,
        },
      ],
    };
  };

  try {
    const fields = await repository.getProjectFields(
      "project-1",
    );

    assert.deepEqual(fields, [FIELD_SCORE]);

    const values =
      await repository.getProjectFieldValues(
        "project-1",
      );

    assert.deepEqual(values, [
      {
        fieldId: "field-score",
        entryId: "entry-1",
        valueText: null,
        valueNumber: 12.5,
        valueDate: null,
      },
    ]);
  } finally {
    db.query = originalQuery;
  }
});

test("repository delete reports whether a row was removed", async () => {
  const originalQuery = db.query;

  db.query = async () => ({ rowCount: 1, rows: [{ id: "stat-1" }] });

  try {
    assert.equal(
      await repository.deleteCustomStatistic({
        statId: "stat-1",
        ownerId: "user-1",
      }),
      true,
    );
  } finally {
    db.query = originalQuery;
  }

  db.query = async () => ({ rowCount: 0, rows: [] });

  try {
    assert.equal(
      await repository.deleteCustomStatistic({
        statId: "stat-1",
        ownerId: "user-1",
      }),
      false,
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
  app.use("/api/stats", statsRouter);

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

test("custom statistics routes expose list, create, update and delete", async () => {
  const restores = [
    patch(
      projectDetailsRepository,
      "getOwnedProject",
      async () => ({ id: "project-1" }),
    ),
    patch(repository, "getProjectFields", async () => [
      FIELD_SCORE,
    ]),
    patch(repository, "getProjectFieldValues", async () =>
      VALUE_ROWS.filter(
        (row) => row.fieldId === "field-score",
      ),
    ),
    patch(
      repository,
      "getCustomStatisticsForProject",
      async () => [makeStat()],
    ),
    patch(repository, "createCustomStatistic", async (a) =>
      makeStat({ name: a.name, expression: a.expression }),
    ),
    patch(repository, "getCustomStatisticById", async () =>
      makeStat(),
    ),
    patch(repository, "updateCustomStatistic", async (a) =>
      makeStat({ name: a.name, expression: a.expression }),
    ),
    patch(repository, "deleteCustomStatistic", async () => true),
  ];

  const { server, baseUrl } = await startServer();

  try {
    const listResponse = await fetch(
      `${baseUrl}/api/stats/projects/project-1/custom`,
    );

    assert.equal(listResponse.status, 200);

    const listBody = await listResponse.json();

    assert.equal(listBody.statistics.length, 1);
    assert.equal(listBody.statistics[0].value, 30);

    const createResponse = await fetch(
      `${baseUrl}/api/stats/projects/project-1/custom`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Average score",
          expression: "avg(Score)",
        }),
      },
    );

    assert.equal(createResponse.status, 201);

    const created = await createResponse.json();

    assert.equal(created.name, "Average score");
    assert.equal(created.value, 15);

    const updateResponse = await fetch(
      `${baseUrl}/api/stats/projects/project-1/custom/stat-1`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Total score",
          expression: "sum(Score)",
        }),
      },
    );

    assert.equal(updateResponse.status, 200);

    const deleteResponse = await fetch(
      `${baseUrl}/api/stats/projects/project-1/custom/stat-1`,
      { method: "DELETE" },
    );

    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), {
      id: "stat-1",
    });
  } finally {
    restoreAll(restores);
    await new Promise((resolve) =>
      server.close(resolve),
    );
  }
});

test("custom statistics routes reject invalid input and unknown projects", async () => {
  const restoreOwned = patch(
    projectDetailsRepository,
    "getOwnedProject",
    async () => null,
  );

  const { server, baseUrl } = await startServer();

  try {
    const invalidBodyResponse = await fetch(
      `${baseUrl}/api/stats/projects/project-1/custom`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Total",
          expression: "sum(",
        }),
      },
    );

    // The project check happens first, so without
    // ownership the request must fail with 404.
    assert.equal(invalidBodyResponse.status, 404);

    const listResponse = await fetch(
      `${baseUrl}/api/stats/projects/project-1/custom`,
    );

    assert.equal(listResponse.status, 404);
    assert.deepEqual(await listResponse.json(), {
      error: "Project not found",
    });
  } finally {
    restoreOwned();
    await new Promise((resolve) =>
      server.close(resolve),
    );
  }

  const restores = [
    patch(
      projectDetailsRepository,
      "getOwnedProject",
      async () => ({ id: "project-1" }),
    ),
    patch(repository, "getProjectFields", async () => [
      FIELD_SCORE,
    ]),
  ];

  const second = await startServer();

  try {
    const invalidExpressionResponse = await fetch(
      `${second.baseUrl}/api/stats/projects/project-1/custom`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Total",
          expression: "sum(",
        }),
      },
    );

    assert.equal(invalidExpressionResponse.status, 400);

    const body = await invalidExpressionResponse.json();

    assert.match(body.error, /Invalid expression syntax/);

    const missingNameResponse = await fetch(
      `${second.baseUrl}/api/stats/projects/project-1/custom`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expression: "sum(Score)",
        }),
      },
    );

    assert.equal(missingNameResponse.status, 400);
    assert.deepEqual(await missingNameResponse.json(), {
      error: "Name is required.",
    });
  } finally {
    restoreAll(restores);
    await new Promise((resolve) =>
      second.server.close(resolve),
    );
  }
});

test("custom statistics routes require authentication", async () => {
  const { server, baseUrl } = await startServer({
    user: null,
  });

  try {
    const response = await fetch(
      `${baseUrl}/api/stats/projects/project-1/custom`,
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: "Authentication required",
    });
  } finally {
    await new Promise((resolve) =>
      server.close(resolve),
    );
  }
});

test("custom statistics routes surface unexpected failures as 500", async () => {
  const originalError = console.error;

  console.error = () => {};

  const restore = patch(
    projectDetailsRepository,
    "getOwnedProject",
    async () => {
      throw new Error("database offline");
    },
  );

  const { server, baseUrl } = await startServer();

  try {
    const response = await fetch(
      `${baseUrl}/api/stats/projects/project-1/custom`,
    );

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: "database offline",
    });
  } finally {
    restore();
    console.error = originalError;

    await new Promise((resolve) =>
      server.close(resolve),
    );
  }
});
