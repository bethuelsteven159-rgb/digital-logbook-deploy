import { describe, test, expect } from "vitest";
const { createEntrySchema } = require("../validation/entry.validation");

describe("createEntrySchema", () => {
  const baseInput = {
    name: "Lab Session 3",
    durationMinutes: 45,
  };

  test("accepts a valid entry with no tags and defaults tags to []", () => {
    const result = createEntrySchema.safeParse(baseInput);

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual([]);
  });

  test("accepts and preserves valid tags", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: ["research", "writing"],
    });

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual(["research", "writing"]);
  });

  test("lowercases tags for case-insensitive matching", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: ["Research", "WRITING"],
    });

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual(["research", "writing"]);
  });

  test("deduplicates tags after lowercasing", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: ["Research", "research", "RESEARCH"],
    });

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual(["research"]);
  });

  test("trims whitespace on each tag", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: ["  research  "],
    });

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual(["research"]);
  });

  test("rejects an empty-string tag", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: [""],
    });

    expect(result.success).toBe(false);
  });

  test("rejects a tag longer than 30 characters", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: ["a".repeat(31)],
    });

    expect(result.success).toBe(false);
  });

  test("accepts a tag exactly 30 characters long", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: ["a".repeat(30)],
    });

    expect(result.success).toBe(true);
  });

  test("rejects more than 10 tags", () => {
    const tooManyTags = Array.from({ length: 11 }, (_, i) => `tag${i}`);

    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: tooManyTags,
    });

    expect(result.success).toBe(false);
  });

  test("accepts exactly 10 tags", () => {
    const tenTags = Array.from({ length: 10 }, (_, i) => `tag${i}`);

    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: tenTags,
    });

    expect(result.success).toBe(true);
    expect(result.data.tags).toHaveLength(10);
  });

  test("rejects a non-string tag", () => {
    const result = createEntrySchema.safeParse({
      ...baseInput,
      tags: [123],
    });

    expect(result.success).toBe(false);
  });

  test("still requires entry name regardless of tags", () => {
    const result = createEntrySchema.safeParse({
      name: "",
      durationMinutes: 10,
      tags: ["research"],
    });

    expect(result.success).toBe(false);
  });
});
