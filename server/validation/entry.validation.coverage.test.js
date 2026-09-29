import { describe, test, expect } from "vitest";
const {
  createEntrySchema,
  updateEntrySchema,
  updateChecklistSchema,
  updateProjectReferencesSchema,
  updateEntryReferencesSchema,
  updateEntryProjectReferencesSchema,
} = require("../validation/entry.validation");

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";

/** Pull the messages out of a failed safeParse result. */
const messages = (result) => result.error.issues.map((issue) => issue.message);

describe("createEntrySchema - duplicate reference checks", () => {
  const baseInput = { name: "Lab Session 3", durationMinutes: 45 };

  test("accepts distinct referenced projects and entries", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      referenceProjectIds: [ID_A, ID_B],
      referenceEntryIds: [ID_A, ID_B],
    });

    expect(result.success).toBe(true);
  });

  test("rejects duplicate referenced projects", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      referenceProjectIds: [ID_A, ID_A],
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toContain(
      "Duplicate referenced projects are not allowed",
    );
    expect(result.error.issues[0].path).toEqual(["referenceProjectIds"]);
  });

  test("rejects duplicate referenced entries", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      referenceEntryIds: [ID_B, ID_C, ID_B],
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toContain(
      "Duplicate referenced entries are not allowed",
    );
    expect(result.error.issues[0].path).toEqual(["referenceEntryIds"]);
  });

  test("reports both problems when projects and entries are duplicated", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      referenceProjectIds: [ID_A, ID_A],
      referenceEntryIds: [ID_B, ID_B],
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toEqual([
      "Duplicate referenced projects are not allowed",
      "Duplicate referenced entries are not allowed",
    ]);
  });

  test("rejects referenced ids that are not UUIDs", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      referenceProjectIds: ["not-a-uuid"],
    });

    expect(result.success).toBe(false);
  });

  test("defaults reference lists to empty arrays", () => {
    const result = createEntrySchema.safeParse(baseInput);

    expect(result.success).toBe(true);
    expect(result.data.referenceProjectIds).toEqual([]);
    expect(result.data.referenceEntryIds).toEqual([]);
  });
});

describe("createEntrySchema - other fields", () => {
  const baseInput = { name: "Lab Session 3" };

  test("defaults durationMinutes to 0", () => {
    const result = createEntrySchema.safeParse(baseInput);

    expect(result.success).toBe(true);
    expect(result.data.durationMinutes).toBe(0);
  });

  test("rejects a negative duration", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      durationMinutes: -1,
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toContain("Duration cannot be negative");
  });

  test("rejects a duration above one week", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      durationMinutes: 10081,
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toContain("Duration is too large");
  });

  test("accepts a valid ISO due date and rejects an invalid one", () => {
    const valid = createEntrySchema.safeParse({
      ...baseInput,
      dueAt: "2026-10-01T09:00:00.000Z",
    });
    const invalid = createEntrySchema.safeParse({
      ...baseInput,
      dueAt: "next friday",
    });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
    expect(messages(invalid)).toContain("Due date must be a valid ISO date-time");
  });

  test("rejects an entry name that is too long", () => {
    const result = createEntrySchema.safeParse({
      name: "a".repeat(151),
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toContain("Entry name is too long");
  });

  test("accepts custom values of each supported primitive type", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      values: [
        { fieldId: ID_A, value: "text" },
        { fieldId: ID_B, value: 12 },
        { fieldId: ID_C, value: true },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("rejects a custom value that is an object", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      values: [{ fieldId: ID_A, value: { nested: true } }],
    });

    expect(result.success).toBe(false);
  });

  test("rejects a new field with an unknown type", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      newFields: [{ clientId: "c1", name: "Mood", type: "emoji" }],
    });

    expect(result.success).toBe(false);
  });

  test("accepts a new computed field with a formula", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      newFields: [
        { clientId: "c1", name: "Ratio", type: "computed", formula: "a / b" },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("rejects an empty checklist item", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      checklist: [{ text: "   " }],
    });

    expect(result.success).toBe(false);
  });
});

describe("updateEntrySchema", () => {
  const baseInput = { name: "Lab Session 3", durationMinutes: 45 };

  test("accepts a minimal update and applies defaults", () => {
    const result = updateEntrySchema.safeParse(baseInput);

    expect(result.success).toBe(true);
    expect(result.data.fieldIds).toEqual([]);
    expect(result.data.values).toEqual([]);
    expect(result.data.newFields).toEqual([]);
    expect(result.data.newChecklistItems).toEqual([]);
  });

  test("accepts values that belong to selected fields", () => {
    const result = updateEntrySchema.safeParse({
      ...baseInput,
      fieldIds: [ID_A, ID_B],
      values: [
        { fieldId: ID_A, value: "done" },
        { fieldId: ID_B, value: 5 },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("rejects two values submitted for the same field", () => {
    const result = updateEntrySchema.safeParse({
      ...baseInput,
      fieldIds: [ID_A],
      values: [
        { fieldId: ID_A, value: "first" },
        { fieldId: ID_A, value: "second" },
      ],
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toContain("Duplicate field values are not allowed");
    expect(result.error.issues[0].path).toEqual(["values"]);
  });

  test("rejects a value for a field that is not selected", () => {
    const result = updateEntrySchema.safeParse({
      ...baseInput,
      fieldIds: [ID_A],
      values: [{ fieldId: ID_B, value: "orphan" }],
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toContain(
      "Every submitted value must belong to a selected field",
    );
  });

  test("reports the not-selected problem only once even with several orphans", () => {
    const result = updateEntrySchema.safeParse({
      ...baseInput,
      fieldIds: [],
      values: [
        { fieldId: ID_A, value: 1 },
        { fieldId: ID_B, value: 2 },
      ],
    });

    expect(result.success).toBe(false);
    const orphanIssues = messages(result).filter(
      (m) => m === "Every submitted value must belong to a selected field",
    );
    expect(orphanIssues).toHaveLength(1);
  });

  test("reports duplicate and orphan problems together", () => {
    const result = updateEntrySchema.safeParse({
      ...baseInput,
      fieldIds: [],
      values: [
        { fieldId: ID_A, value: 1 },
        { fieldId: ID_A, value: 2 },
      ],
    });

    expect(result.success).toBe(false);
    expect(messages(result)).toEqual([
      "Duplicate field values are not allowed",
      "Every submitted value must belong to a selected field",
    ]);
  });

  test("allows dueAt to be null (clearing a due date)", () => {
    const result = updateEntrySchema.safeParse({ ...baseInput, dueAt: null });

    expect(result.success).toBe(true);
    expect(result.data.dueAt).toBeNull();
  });

  test("rejects an invalid dueAt", () => {
    const result = updateEntrySchema.safeParse({
      ...baseInput,
      dueAt: "tomorrow",
    });

    expect(result.success).toBe(false);
  });

  test("requires a name and a non-negative duration", () => {
    expect(
      updateEntrySchema.safeParse({ name: "", durationMinutes: 5 }).success,
    ).toBe(false);
    expect(
      updateEntrySchema.safeParse({ name: "ok", durationMinutes: -5 }).success,
    ).toBe(false);
  });

  test("validates existing checklist items", () => {
    const ok = updateEntrySchema.safeParse({
      ...baseInput,
      checklistItems: [{ id: ID_A, text: "Write tests", completed: false }],
    });
    const bad = updateEntrySchema.safeParse({
      ...baseInput,
      checklistItems: [{ id: "nope", text: "Write tests", completed: false }],
    });

    expect(ok.success).toBe(true);
    expect(bad.success).toBe(false);
  });
});

describe("updateChecklistSchema", () => {
  test("accepts a text-only update", () => {
    expect(updateChecklistSchema.safeParse({ text: "New text" }).success).toBe(
      true,
    );
  });

  test("accepts a completed-only update, including false", () => {
    expect(updateChecklistSchema.safeParse({ completed: false }).success).toBe(
      true,
    );
  });

  test("rejects an empty update", () => {
    const result = updateChecklistSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(messages(result)).toContain(
      "At least one checklist value must be provided",
    );
  });

  test("rejects blank text", () => {
    expect(updateChecklistSchema.safeParse({ text: "   " }).success).toBe(false);
  });
});

describe("reference update schemas", () => {
  const cases = [
    ["updateProjectReferencesSchema", updateProjectReferencesSchema, "projectIds"],
    ["updateEntryReferencesSchema", updateEntryReferencesSchema, "entryIds"],
    [
      "updateEntryProjectReferencesSchema",
      updateEntryProjectReferencesSchema,
      "projectIds",
    ],
  ];

  test.each(cases)("%s accepts a list of UUIDs", (_name, schema, key) => {
    expect(schema.safeParse({ [key]: [ID_A, ID_B] }).success).toBe(true);
  });

  test.each(cases)("%s accepts an empty list", (_name, schema, key) => {
    expect(schema.safeParse({ [key]: [] }).success).toBe(true);
  });

  test.each(cases)("%s rejects non-UUID ids", (_name, schema, key) => {
    expect(schema.safeParse({ [key]: ["abc"] }).success).toBe(false);
  });

  test.each(cases)("%s rejects more than 100 ids", (_name, schema, key) => {
    const tooMany = Array.from(
      { length: 101 },
      (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );

    expect(schema.safeParse({ [key]: tooMany }).success).toBe(false);
  });

  test.each(cases)("%s rejects a missing list", (_name, schema) => {
    expect(schema.safeParse({}).success).toBe(false);
  });
});
