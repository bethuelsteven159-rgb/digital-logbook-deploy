import { describe, it, expect } from "vitest";
import {
  evaluateFormula,
  bindFormulaToFields,
} from "./computedFieldService.js";

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

  it("returns null when there are no source values at all", () => {
    expect(evaluateFormula("Hours * Rate", [])).toBeNull();
  });

  it("coerces numeric string values stored in text fields", () => {
    const result = evaluateFormula("Hours * Rate", [
      { name: "Hours", value: "3" },
      { name: "Rate", value: "20" },
    ]);

    expect(result).toBe(60);
  });

  it("skips empty string values instead of treating them as zero", () => {
    const result = evaluateFormula("Hours * Rate", [
      { name: "Hours", value: 5 },
      { name: "Rate", value: "" },
    ]);

    expect(result).toBeNull();
  });

  it("skips boolean values", () => {
    const result = evaluateFormula("Hours * 2", [
      { name: "Hours", value: true },
    ]);

    expect(result).toBeNull();
  });

  it("returns null when a numeric source value is NaN", () => {
    const result = evaluateFormula("Hours * 2", [
      { name: "Hours", value: NaN },
    ]);

    expect(result).toBeNull();
  });

  it("returns null when the evaluation produces a non-finite result", () => {
    const result = evaluateFormula("Hours / 0", [
      { name: "Hours", value: 5 },
    ]);

    expect(result).toBeNull();
  });
});

describe("formula binding stability", () => {
  const hoursId = "11111111-1111-4111-8111-111111111111";
  const rateId = "22222222-2222-4222-8222-222222222222";

  it("binds formulas to field ID symbols so renames keep them computable", () => {
    const formula = bindFormulaToFields("Hours * Rate", [
      { id: hoursId, name: "Hours" },
      { id: rateId, name: "Rate" },
    ]);

    expect(formula).toContain(`field_${hoursId.replace(/-/g, "")}`);
    expect(formula).toContain(`field_${rateId.replace(/-/g, "")}`);

    const result = evaluateFormula(formula, [
      { fieldId: hoursId, name: "Renamed hours", value: 3 },
      { fieldId: rateId, name: "Renamed rate", value: 20 },
    ]);

    expect(result).toBe(60);
  });

  it("returns the formula unchanged when it cannot be parsed", () => {
    expect(bindFormulaToFields("Hours * * 2", [
      { id: hoursId, name: "Hours" },
    ])).toBe("Hours * * 2");

    expect(bindFormulaToFields(null, [
      { id: hoursId, name: "Hours" },
    ])).toBeNull();
  });
});
