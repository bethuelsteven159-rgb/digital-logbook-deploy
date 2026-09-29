import { describe, test, expect } from "vitest";
const {
  createRecurringEntrySchema,
  updateRecurringEntrySchema,
} = require("./recurringEntry.validation");

describe("createRecurringEntrySchema", () => {
  const baseInput = {
    name: "Daily stand-up notes",
    frequency: "daily",
    startsOn: "2026-09-28",
  };

  test("accepts a minimal definition and applies V1 defaults", () => {
    const result = createRecurringEntrySchema.safeParse(baseInput);

    expect(result.success).toBe(true);
    expect(result.data.durationMinutes).toBe(0);
    expect(result.data.tags).toEqual([]);
    expect(result.data.checklist).toEqual([]);
    expect(result.data.intervalCount).toBe(1);
    expect(result.data.endsOn).toBeUndefined();
    expect(result.data.enabled).toBe(true);
  });

  test("trims the definition name", () => {
    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      name: "  Weekly review  ",
    });

    expect(result.success).toBe(true);
    expect(result.data.name).toBe("Weekly review");
  });

  test("rejects an empty or whitespace-only name", () => {
    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        name: "",
      }).success,
    ).toBe(false);

    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        name: "   ",
      }).success,
    ).toBe(false);
  });

  test("rejects a name longer than 150 characters", () => {
    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      name: "a".repeat(151),
    });

    expect(result.success).toBe(false);
  });

  test("accepts a name exactly 150 characters long", () => {
    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      name: "a".repeat(150),
    });

    expect(result.success).toBe(true);
  });

  test("coerces a numeric-string duration", () => {
    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      durationMinutes: "45",
    });

    expect(result.success).toBe(true);
    expect(result.data.durationMinutes).toBe(45);
  });

  test("accepts the duration boundaries 0 and 10080", () => {
    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        durationMinutes: 0,
      }).success,
    ).toBe(true);

    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        durationMinutes: 10080,
      }).success,
    ).toBe(true);
  });

  test("rejects a negative or too-large duration", () => {
    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        durationMinutes: -1,
      }).success,
    ).toBe(false);

    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        durationMinutes: 10081,
      }).success,
    ).toBe(false);
  });

  test("rejects a non-integer duration", () => {
    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      durationMinutes: 12.5,
    });

    expect(result.success).toBe(false);
  });

  test("accepts the interval boundaries 1 and 365", () => {
    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        intervalCount: 1,
      }).success,
    ).toBe(true);

    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        intervalCount: 365,
      }).success,
    ).toBe(true);
  });

  test("rejects an interval below 1 or above 365", () => {
    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        intervalCount: 0,
      }).success,
    ).toBe(false);

    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        intervalCount: 366,
      }).success,
    ).toBe(false);
  });

  test("rejects an unsupported frequency", () => {
    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      frequency: "yearly",
    });

    expect(result.success).toBe(false);
  });

  test("accepts each supported frequency", () => {
    for (const frequency of ["daily", "weekly", "monthly"]) {
      expect(
        createRecurringEntrySchema.safeParse({
          ...baseInput,
          frequency,
        }).success,
      ).toBe(true);
    }
  });

  test("requires a valid calendar startsOn date", () => {
    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        startsOn: "2026-02-30",
      }).success,
    ).toBe(false);

    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        startsOn: "28/09/2026",
      }).success,
    ).toBe(false);

    const missing = { ...baseInput };
    delete missing.startsOn;

    expect(
      createRecurringEntrySchema.safeParse(missing).success,
    ).toBe(false);
  });

  test("accepts a null endsOn and rejects an endsOn before startsOn", () => {
    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        endsOn: null,
      }).success,
    ).toBe(true);

    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      endsOn: "2026-09-27",
    });

    expect(result.success).toBe(false);
    expect(
      result.error.issues.some(
        (issue) =>
          issue.path[0] === "endsOn" &&
          issue.message ===
            "End date cannot be earlier than start date",
      ),
    ).toBe(true);
  });

  test("accepts an endsOn equal to startsOn", () => {
    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      endsOn: "2026-09-28",
    });

    expect(result.success).toBe(true);
  });

  test("lowercases, trims and deduplicates tags", () => {
    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      tags: ["  Review ", "REVIEW", "writing"],
    });

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual(["review", "writing"]);
  });

  test("rejects more than 10 tags and empty tags", () => {
    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
      }).success,
    ).toBe(false);

    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        tags: [""],
      }).success,
    ).toBe(false);
  });

  test("rejects tags longer than 30 characters", () => {
    const result = createRecurringEntrySchema.safeParse({
      ...baseInput,
      tags: ["a".repeat(31)],
    });

    expect(result.success).toBe(false);
  });

  test("trims checklist items and rejects more than 100", () => {
    const valid = createRecurringEntrySchema.safeParse({
      ...baseInput,
      checklist: [{ text: "  Summarise progress  " }],
    });

    expect(valid.success).toBe(true);
    expect(valid.data.checklist).toEqual([
      { text: "Summarise progress" },
    ]);

    const tooMany = createRecurringEntrySchema.safeParse({
      ...baseInput,
      checklist: Array.from({ length: 101 }, (_, i) => ({
        text: `Item ${i}`,
      })),
    });

    expect(tooMany.success).toBe(false);
  });

  test("rejects empty or oversized checklist item text", () => {
    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        checklist: [{ text: "   " }],
      }).success,
    ).toBe(false);

    expect(
      createRecurringEntrySchema.safeParse({
        ...baseInput,
        checklist: [{ text: "a".repeat(301) }],
      }).success,
    ).toBe(false);
  });
});

describe("updateRecurringEntrySchema", () => {
  test("accepts a partial enable/disable update", () => {
    const result = updateRecurringEntrySchema.safeParse({
      enabled: false,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ enabled: false });
  });

  test("accepts clearing endsOn with null", () => {
    const result = updateRecurringEntrySchema.safeParse({
      endsOn: null,
    });

    expect(result.success).toBe(true);
    expect(result.data.endsOn).toBeNull();
  });

  test("rejects an empty update payload", () => {
    const result = updateRecurringEntrySchema.safeParse({});

    expect(result.success).toBe(false);
    expect(
      result.error.issues.some(
        (issue) =>
          issue.message ===
          "At least one recurring entry value must be provided",
      ),
    ).toBe(true);
  });

  test("rejects a payload with only unknown keys", () => {
    const result = updateRecurringEntrySchema.safeParse({
      projectId: "00000000-0000-4000-8000-000000000001",
    });

    expect(result.success).toBe(false);
  });

  test("rejects invalid partial values", () => {
    expect(
      updateRecurringEntrySchema.safeParse({
        frequency: "yearly",
      }).success,
    ).toBe(false);

    expect(
      updateRecurringEntrySchema.safeParse({
        durationMinutes: -5,
      }).success,
    ).toBe(false);

    expect(
      updateRecurringEntrySchema.safeParse({
        intervalCount: 0,
      }).success,
    ).toBe(false);

    expect(
      updateRecurringEntrySchema.safeParse({
        name: "",
      }).success,
    ).toBe(false);
  });

  test("accepts a full replacement payload", () => {
    const result = updateRecurringEntrySchema.safeParse({
      name: "Morning journal",
      durationMinutes: 20,
      tags: ["Mind"],
      checklist: [{ text: "Two pages" }],
      frequency: "daily",
      intervalCount: 1,
      startsOn: "2026-09-01",
      endsOn: null,
      enabled: true,
    });

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual(["mind"]);
  });
});
