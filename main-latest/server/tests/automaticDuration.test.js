const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../db");
const repository = require("../repositories/postgresProjectDetailsRepository");

test("completeEntry uses occurred_at to automatically calculate duration", async () => {
  const originalQuery = db.query;

  db.query = async (sql, params) => {
    assert.match(sql, /duration_minutes = LEAST/);
    assert.match(sql, /EXTRACT/);
    assert.match(sql, /NOW\(\) - occurred_at/);
    assert.deepEqual(params, ["entry-1", "project-1"]);

    return {
      rows: [
        {
          id: "entry-1",
          project_id: "project-1",
          created_by_id: "user-1",
          name: "Test Entry",
          duration_minutes: 45,
          occurred_at: new Date("2026-09-13T19:00:00Z"),
          due_at: null,
          completed_at: new Date("2026-09-13T19:45:00Z"),
          created_at: new Date("2026-09-13T19:00:00Z"),
          updated_at: new Date("2026-09-13T19:45:00Z"),
        },
      ],
    };
  };

  try {
    const result = await repository.completeEntry(
      "project-1",
      "entry-1",
    );

    assert.equal(result.id, "entry-1");
    assert.equal(result.durationMinutes, 45);
    assert.ok(result.completedAt);
  } finally {
    db.query = originalQuery;
  }
});

test("completeEntry returns null when the entry cannot be completed", async () => {
  const originalQuery = db.query;

  db.query = async () => ({
    rows: [],
  });

  try {
    const result = await repository.completeEntry(
      "project-1",
      "entry-1",
    );

    assert.equal(result, null);
  } finally {
    db.query = originalQuery;
  }
});