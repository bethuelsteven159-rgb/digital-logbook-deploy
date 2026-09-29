import { describe, test, expect } from "vitest";
const {
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
} = require("../validation/automationRule.validation");

describe("createAutomationRuleSchema", () => {
  const baseInput = {
    name: "Tag completed work",
    conditionFieldId: "b3a1c2d4-0000-4000-8000-000000000001",
    conditionOperator: "equals",
    conditionValue: "completed",
    actionType: "add_tag",
    actionValue: "completed",
  };

  test("accepts a valid rule and defaults enabled to true", () => {
    const result = createAutomationRuleSchema.safeParse(baseInput);

    expect(result.success).toBe(true);
    expect(result.data.enabled).toBe(true);
  });

  test("accepts an explicit enabled value", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      enabled: false,
    });

    expect(result.success).toBe(true);
    expect(result.data.enabled).toBe(false);
  });

  test("allows conditionValue to be omitted", () => {
    const withoutValue = { ...baseInput };
    delete withoutValue.conditionValue;

    const result = createAutomationRuleSchema.safeParse(withoutValue);

    expect(result.success).toBe(true);
    expect(result.data.conditionValue).toBeUndefined();
  });

  test("accepts numeric and boolean condition values", () => {
    const numberResult = createAutomationRuleSchema.safeParse({
      ...baseInput,
      conditionOperator: "greater_than",
      conditionValue: 8,
    });

    expect(numberResult.success).toBe(true);
    expect(numberResult.data.conditionValue).toBe(8);
  });

  test("rejects an unsupported condition operator", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      conditionOperator: "starts_with",
    });

    expect(result.success).toBe(false);
  });

  test("rejects an unsupported action type", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      actionType: "set_field",
    });

    expect(result.success).toBe(false);
  });

  test("rejects a malformed condition field UUID", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      conditionFieldId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });

  test("rejects missing required fields", () => {
    const result = createAutomationRuleSchema.safeParse({});

    expect(result.success).toBe(false);
    const issues = result.error.issues.map((issue) => issue.path[0]);
    expect(issues).toContain("name");
    expect(issues).toContain("conditionFieldId");
    expect(issues).toContain("conditionOperator");
    expect(issues).toContain("actionType");
    expect(issues).toContain("actionValue");
  });

  test("rejects an empty rule name", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  test("rejects an empty tag action value", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      actionValue: "   ",
    });

    expect(result.success).toBe(false);
  });

  test("rejects an oversized tag action value", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      actionValue: "a".repeat(31),
    });

    expect(result.success).toBe(false);
  });

  test("accepts a tag action value of exactly 30 characters", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      actionValue: "a".repeat(30),
    });

    expect(result.success).toBe(true);
    expect(result.data.actionValue).toBe("a".repeat(30));
  });

  test("rejects a non-string tag action value", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      actionValue: 123,
    });

    expect(result.success).toBe(false);
  });

  test("trims and lowercases the tag action value", () => {
    const result = createAutomationRuleSchema.safeParse({
      ...baseInput,
      actionValue: "  Completed  ",
    });

    expect(result.success).toBe(true);
    expect(result.data.actionValue).toBe("completed");
  });
});

describe("updateAutomationRuleSchema", () => {
  test("accepts a partial update with only enabled", () => {
    const result = updateAutomationRuleSchema.safeParse({
      enabled: false,
    });

    expect(result.success).toBe(true);
    expect(result.data.enabled).toBe(false);
  });

  test("accepts a partial update with only a name", () => {
    const result = updateAutomationRuleSchema.safeParse({
      name: "Renamed rule",
    });

    expect(result.success).toBe(true);
    expect(result.data.name).toBe("Renamed rule");
  });

  test("rejects an empty update", () => {
    const result = updateAutomationRuleSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  test("still validates supplied fields", () => {
    const operatorResult = updateAutomationRuleSchema.safeParse({
      conditionOperator: "starts_with",
    });

    expect(operatorResult.success).toBe(false);

    const tagResult = updateAutomationRuleSchema.safeParse({
      actionValue: "a".repeat(31),
    });

    expect(tagResult.success).toBe(false);
  });

  test("lowercases a supplied tag action value", () => {
    const result = updateAutomationRuleSchema.safeParse({
      actionValue: "  Urgent  ",
    });

    expect(result.success).toBe(true);
    expect(result.data.actionValue).toBe("urgent");
  });
});
