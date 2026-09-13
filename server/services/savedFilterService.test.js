import { describe, it, expect } from "vitest";
import { matchesCriterion } from "./savedFilterService.js";

describe("matchesCriterion", () => {
  const entry = {
    name: "Literature Review",
    durationMinutes: 45,
    values: [
      { fieldId: "field-1", name: "Difficulty", value: "Hard" },
      { fieldId: "field-2", name: "Score", value: 8 },
    ],
  };

  it("matches on a built-in property using equals", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "equals",
      value: "Literature Review",
    });

    expect(result).toBe(true);
  });

  it("does not match when equals values differ", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "equals",
      value: "Something else",
    });

    expect(result).toBe(false);
  });

  it("matches using not_equals", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "not_equals",
      value: "Different name",
    });

    expect(result).toBe(true);
  });

  it("matches using greater_than on a built-in numeric property", () => {
    const result = matchesCriterion(entry, {
      fieldName: "durationMinutes",
      operator: "greater_than",
      value: 10,
    });

    expect(result).toBe(true);
  });

  it("does not match using greater_than when value is too low", () => {
    const result = matchesCriterion(entry, {
      fieldName: "durationMinutes",
      operator: "greater_than",
      value: 1000,
    });

    expect(result).toBe(false);
  });

  it("matches using less_than", () => {
    const result = matchesCriterion(entry, {
      fieldName: "durationMinutes",
      operator: "less_than",
      value: 1000,
    });

    expect(result).toBe(true);
  });

  it("matches using contains, case-insensitively", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "contains",
      value: "literature",
    });

    expect(result).toBe(true);
  });

  it("matches on a custom field by fieldId", () => {
    const result = matchesCriterion(entry, {
      fieldId: "field-1",
      operator: "equals",
      value: "Hard",
    });

    expect(result).toBe(true);
  });

  it("returns false when the referenced custom field doesn't exist on the entry", () => {
    const result = matchesCriterion(entry, {
      fieldId: "nonexistent-field",
      operator: "equals",
      value: "Anything",
    });

    expect(result).toBe(false);
  });

  it("returns false for an unknown operator", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "unsupported_operator",
      value: "Literature Review",
    });

    expect(result).toBe(false);
  });
});
