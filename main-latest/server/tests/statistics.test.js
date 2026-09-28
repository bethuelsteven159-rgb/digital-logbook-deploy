const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../db");
const stats = require("../routes/stats");

test("statistics route exports all required statistics functions", () => {
  assert.equal(typeof stats.getTotalStatistics, "function");
  assert.equal(typeof stats.getGroupStatistics, "function");
  assert.equal(typeof stats.getCompareStatistics, "function");
  assert.equal(typeof stats.getPlotStatistics, "function");
});

test("total statistics calculates numeric summary", async () => {
  const originalQuery = db.query;

  db.query = async () => ({
    rows: [
      {
        count: 3,
        sum: "60",
        average: "20",
        minimum: "10",
        maximum: "30",
      },
    ],
  });

  try {
    const result = await stats.getTotalStatistics("project-1", {
      id: "field-1",
      name: "Score",
      field_type: "number",
    });

    assert.deepEqual(result, {
      operation: "total",
      field: {
        id: "field-1",
        name: "Score",
        type: "number",
      },
      count: 3,
      sum: 60,
      average: 20,
      minimum: 10,
      maximum: 30,
    });
  } finally {
    db.query = originalQuery;
  }
});

test("group statistics returns grouped values and counts", async () => {
  const originalQuery = db.query;

  db.query = async () => ({
    rows: [
      { value: "Hard", count: 3 },
      { value: "Easy", count: 2 },
    ],
  });

  try {
    const result = await stats.getGroupStatistics("project-1", {
      id: "field-1",
      name: "Difficulty",
      field_type: "short_text",
    });

    assert.deepEqual(result, {
      operation: "group",
      field: {
        id: "field-1",
        name: "Difficulty",
        type: "short_text",
      },
      groups: [
        { value: "Hard", count: 3 },
        { value: "Easy", count: 2 },
      ],
    });
  } finally {
    db.query = originalQuery;
  }
});

test("compare statistics compares two numeric fields", async () => {
  const originalQuery = db.query;

  db.query = async () => ({
    rows: [
      {
        entries_compared: 3,
        first_total: "60",
        second_total: "45",
        first_average: "20",
        second_average: "15",
      },
    ],
  });

  try {
    const result = await stats.getCompareStatistics(
      "project-1",
      {
        id: "field-1",
        name: "Expected",
        field_type: "number",
      },
      {
        id: "field-2",
        name: "Actual",
        field_type: "number",
      },
    );

    assert.deepEqual(result, {
      operation: "compare",
      fields: [
        {
          id: "field-1",
          name: "Expected",
          type: "number",
        },
        {
          id: "field-2",
          name: "Actual",
          type: "number",
        },
      ],
      entriesCompared: 3,
      first: {
        total: 60,
        average: 20,
      },
      second: {
        total: 45,
        average: 15,
      },
    });
  } finally {
    db.query = originalQuery;
  }
});

test("plot statistics returns numeric entry data", async () => {
  const originalQuery = db.query;

  db.query = async () => ({
    rows: [
      { label: "Entry One", value: "10" },
      { label: "Entry Two", value: "25" },
    ],
  });

  try {
    const result = await stats.getPlotStatistics("project-1", {
      id: "field-1",
      name: "Score",
      field_type: "number",
    });

    assert.deepEqual(result, {
      operation: "plot",
      chartType: "bar",
      field: {
        id: "field-1",
        name: "Score",
        type: "number",
      },
      data: [
        { label: "Entry One", value: 10 },
        { label: "Entry Two", value: 25 },
      ],
    });
  } finally {
    db.query = originalQuery;
  }
});

test("group statistics rejects unsupported field types", async () => {
  await assert.rejects(
    () =>
      stats.getGroupStatistics("project-1", {
        id: "field-1",
        name: "Computed",
        field_type: "computed",
      }),
    {
      statusCode: 400,
      message: "This field type cannot be grouped",
    },
  );
});

test("compare statistics rejects non-numeric fields", async () => {
  await assert.rejects(
    () =>
      stats.getCompareStatistics(
        "project-1",
        {
          id: "field-1",
          name: "Difficulty",
          field_type: "short_text",
        },
        {
          id: "field-2",
          name: "Score",
          field_type: "number",
        },
      ),
    {
      statusCode: 400,
      message: "Compare requires two numeric custom fields",
    },
  );
});