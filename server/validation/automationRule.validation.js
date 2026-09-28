const { z } = require("zod");

const conditionOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "greater_than",
  "less_than",
]);

const actionTypeSchema = z.enum(["add_tag"]);

const conditionValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
]);

const tagValueSchema = z
  .string()
  .trim()
  .min(1, "Tag cannot be empty")
  .max(30, "Tag is too long")
  .transform((tag) => tag.toLowerCase());

const createAutomationRuleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Rule name is required")
    .max(100, "Rule name is too long"),

  conditionFieldId: z.string().uuid(
    "Condition field must be a valid UUID",
  ),

  conditionOperator: conditionOperatorSchema,

  conditionValue: conditionValueSchema.optional(),

  actionType: actionTypeSchema,

  actionValue: tagValueSchema,

  enabled: z.boolean().default(true),
});

const updateAutomationRuleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Rule name is required")
      .max(100, "Rule name is too long")
      .optional(),

    conditionFieldId: z.string().uuid(
      "Condition field must be a valid UUID",
    ).optional(),

    conditionOperator: conditionOperatorSchema.optional(),

    conditionValue: conditionValueSchema.optional(),

    actionType: actionTypeSchema.optional(),

    actionValue: tagValueSchema.optional(),

    enabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one automation rule field must be provided",
  });

module.exports = {
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
};
