const { z } = require("zod");

// These values match the LIVE PostgreSQL
// project_fields_field_type_check constraint.
const fieldTypeSchema = z.enum([
  "short_text",
  "long_text",
  "number",
  "date",
  "computed",
]);

const customValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const createEntrySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Entry name is required")
    .max(150, "Entry name is too long"),

  durationMinutes: z.coerce
    .number()
    .int()
    .min(0, "Duration cannot be negative")
    .max(10080, "Duration is too large"),

    dueAt: z
    .string()
    .datetime({ message: "Due date must be a valid ISO date-time" })
    .optional(),

  values: z
    .array(
      z.object({
        fieldId: z.string().uuid(),
        value: customValueSchema,
      }),
    )
    .default([]),

  linkedEntryIds: z
    .array(z.string().uuid())
    .default([]),

  newFields: z
  .array(
    z.object({
      clientId: z.string().min(1),
      name: z.string().trim().min(1).max(100),
      type: fieldTypeSchema,
      value: customValueSchema.optional(),
      formula: z.string().trim().max(500).optional(),
    }),
  )
    .default([]),
});

module.exports = {
  createEntrySchema,
};
