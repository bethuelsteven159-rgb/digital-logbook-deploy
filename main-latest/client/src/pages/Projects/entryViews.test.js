import test from "node:test";
import assert from "node:assert/strict";
import { getEntryDateKey, getLinkedEntrySummaries, groupEntriesByDate, groupEntriesByField } from "./entryViews.js";

test("calendar groups entries by their occurred date", () => {
  const entries = [
    { id: "1", occurredAt: "2026-09-10T08:00:00Z" },
    { id: "2", occurredAt: "2026-09-10T12:00:00Z" },
    { id: "3", occurredAt: "2026-09-11T09:00:00Z" },
  ];
  const groups = groupEntriesByDate(entries);
  assert.equal(groups[getEntryDateKey(entries[0])].length, 2);
  assert.equal(groups[getEntryDateKey(entries[2])].length, 1);
});

test("board groups entries by the selected custom field", () => {
  const entries = [
    { id: "1", values: [{ fieldId: "status", value: "To Do" }] },
    { id: "2", values: [{ fieldId: "status", value: "Done" }] },
    { id: "3", values: [] },
  ];
  const groups = groupEntriesByField(entries, "status");
  assert.equal(groups["To Do"].length, 1);
  assert.equal(groups.Done.length, 1);
  assert.equal(groups.Unassigned.length, 1);
});

test("entry-link helper returns linked entry summaries supplied by the API", () => {
  const entry = { linkedEntries: [{ id: "2", name: "Follow-up work" }] };
  assert.deepEqual(getLinkedEntrySummaries(entry), [{ id: "2", name: "Follow-up work" }]);
});


test("board grouping preserves a plain object and entry order", () => {
  const entries = [
    { id: "1", values: [{ fieldId: "status", value: "To Do" }] },
    { id: "2", values: [{ fieldId: "status", value: "Done" }] },
    { id: "3", values: [{ fieldId: "status", value: "To Do" }] },
  ];
  const groups = groupEntriesByField(entries, "status");
  assert.equal(Object.getPrototypeOf(groups), Object.prototype);
  assert.deepEqual(Object.entries(groups), [
    ["To Do", [entries[0], entries[2]]],
    ["Done", [entries[1]]],
  ]);
});

for (const value of ["constructor", "__proto__", "prototype", "toString", "hasOwnProperty", "valueOf"]) {
  test(`board groups the property name ${value} safely`, () => {
    const entries = [
      { id: "1", values: [{ fieldId: "status", value }] },
      { id: "2", values: [{ fieldId: "status", value }] },
    ];
    const groups = groupEntriesByField(entries, "status");
    assert.equal(Object.getPrototypeOf(groups), Object.prototype);
    assert.deepEqual(Object.entries(groups), [[value, entries]]);
    assert.deepEqual(groups[value], entries);
  });
}

test("board groups empty and missing values as Unassigned without losing zero or false", () => {
  const unassigned = [
    { values: [{ fieldId: "status", value: "" }] },
    { values: [{ fieldId: "status", value: null }] },
    { values: [{ fieldId: "status" }] },
    { values: [{ fieldId: "other", value: "Done" }] },
    { values: [] },
    {},
  ];
  const zero = { values: [{ fieldId: "status", value: 0 }] };
  const falsy = { values: [{ fieldId: "status", value: false }] };
  const groups = groupEntriesByField([...unassigned, zero, falsy], "status");
  assert.deepEqual(groups, { Unassigned: unassigned, "0": [zero], false: [falsy] });
});

test("board grouping supports date and computed field values", () => {
  const entries = [
    {
      values: [
        { fieldId: "date", value: "2026-09-01" },
        { fieldId: "total", value: 60 },
      ],
    },
    {
      values: [
        { fieldId: "date", value: "2026-09-02" },
        { fieldId: "total", value: 60 },
      ],
    },
    { values: [{ fieldId: "total", value: null }] },
  ];
  assert.deepEqual(groupEntriesByField(entries, "date"), {
    "2026-09-01": [entries[0]],
    "2026-09-02": [entries[1]],
    Unassigned: [entries[2]],
  });
  assert.deepEqual(groupEntriesByField(entries, "total"), {
    "60": [entries[0], entries[1]],
    Unassigned: [entries[2]],
  });
});

test("board grouping returns an empty plain object for empty or omitted entries", () => {
  assert.deepEqual(groupEntriesByField([], "status"), {});
  assert.deepEqual(groupEntriesByField(), {});
});
