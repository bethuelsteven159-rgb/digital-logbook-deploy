const test = require("node:test");
const assert = require("node:assert/strict");
const { buildLinkedEntriesMap } = require("../services/projectDetailsService");
const { createEntrySchema } = require("../validation/entry.validation");

test("entry links are exposed in both directions", () => {
  const entries = [
    { id: "entry-a" },
    { id: "entry-b" },
  ];
  const links = [
    {
      sourceEntryId: "entry-a",
      sourceName: "Research",
      targetEntryId: "entry-b",
      targetName: "Implementation",
    },
  ];

  const map = buildLinkedEntriesMap(entries, links);
  assert.deepEqual(map.get("entry-a"), [
    { id: "entry-b", name: "Implementation" },
  ]);
  assert.deepEqual(map.get("entry-b"), [
    { id: "entry-a", name: "Research" },
  ]);
});

test("entry validation accepts linked entry UUIDs", () => {
  const result = createEntrySchema.safeParse({
    name: "Testing entry links",
    durationMinutes: 30,
    values: [],
    newFields: [],
    linkedEntryIds: ["123e4567-e89b-12d3-a456-426614174000"],
  });

  assert.equal(result.success, true);
});

test("entry validation rejects invalid linked entry IDs", () => {
  const result = createEntrySchema.safeParse({
    name: "Testing entry links",
    durationMinutes: 30,
    values: [],
    newFields: [],
    linkedEntryIds: ["not-a-uuid"],
  });

  assert.equal(result.success, false);
});
