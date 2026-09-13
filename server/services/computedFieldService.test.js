import { describe, it, expect } from "vitest";
import { evaluateFormula } from "./computedFieldService.js";

describe("evaluateFormula", () => {
  it("computes a simple multiplication formula correctly", () => {
    const result = evaluateFormula("Hours * 2", [
      { name: "Hours", value: 5 },
    ]);

    expect(result).toBe(10);
  });

  it("computes a formula referencing multiple fields", () => {
    const result = evaluateFormula("Hours * Rate", [
      { name: "Hours", value: 4 },
      { name: "Rate", value: 25 },
    ]);

    expect(result).toBe(100);
  });

  it("returns null when the formula references a field that doesn't exist", () => {
    const result = evaluateFormula("Hours * Missing", [
      { name: "Hours", value: 5 },
    ]);

    expect(result).toBeNull();
  });

  it("returns null when the formula is invalid syntax", () => {
    const result = evaluateFormula("Hours * * 2", [
      { name: "Hours", value: 5 },
    ]);

    expect(result).toBeNull();
  });

  it("returns null when there is no formula", () => {
    const result = evaluateFormula(null, [
      { name: "Hours", value: 5 },
    ]);

    expect(result).toBeNull();
  });

  it("ignores non-numeric field values when building scope", () => {
    const result = evaluateFormula("Hours * 2", [
      { name: "Hours", value: 5 },
      { name: "Notes", value: "some text" },
    ]);

    expect(result).toBe(10);
  });

  it("handles field names with spaces by treating them as safe identifiers", () => {
    const result = evaluateFormula("Total_Hours * 2", [
      { name: "Total Hours", value: 3 },
    ]);

    expect(result).toBe(6);
  });
});
