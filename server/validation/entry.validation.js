const { z } = require("zod");

// These values match the LIVE PostgreSQL
// project_fields_field_type_check constraint.
const fieldTypeSchema = z.enum([
  "short_text",
  "long_text",
  "number",
  "date",
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

  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(30),
    )
    .max(10, "Too many tags")
    .default([])
    .transform((tags) => [
      ...new Set(tags.map((tag) => tag.toLowerCase())),
    ]),

  values: z
    .array(
      z.object({
        fieldId: z.string().uuid(),
        value: customValueSchema,
      }),
    )
    .default([]),

  newFields: z
    .array(
      z.object({
        clientId: z.string().min(1),
        name: z.string().trim().min(1).max(100),
        type: fieldTypeSchema,
        value: customValueSchema.optional(),
      }),
    )
    .default([]),
});

module.exports = {
  createEntrySchema,
};
