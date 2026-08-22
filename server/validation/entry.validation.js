const { z } = require("zod");

const fieldTypeSchema = z.enum([
  "text",
  "number",
  "date",
  "boolean",
  "tag",
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
    .max(
      10080,
      "Duration is too large",
    ),

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
        name: z
          .string()
          .trim()
          .min(1)
          .max(100),
        type: fieldTypeSchema,
        value:
          customValueSchema.optional(),
      }),
    )
    .default([]),
});

module.exports = {
  createEntrySchema,
};