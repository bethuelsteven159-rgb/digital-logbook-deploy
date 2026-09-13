const { z } = require("zod");

const filterOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "greater_than",
  "less_than",
]);

const filterCriterionSchema = z.object({
  fieldId: z.string().uuid().optional(),
  fieldName: z.string().trim().min(1).optional(),
  operator: filterOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

const createSavedFilterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Filter name is required")
    .max(100, "Filter name is too long"),

  criteria: z
    .array(filterCriterionSchema)
    .min(1, "At least one filter criterion is required"),
});

module.exports = {
  createSavedFilterSchema,
};
