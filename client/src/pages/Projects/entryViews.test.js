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
