const { z } = require("zod");

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

const checklistItemSchema = z.object({
  text: z.string().trim().min(1).max(300),
});

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
      }),
    )
    .default([]),

  checklist: z
    .array(checklistItemSchema)
    .max(100)
    .default([]),

  referenceProjectIds: z
    .array(z.string().uuid())
    .max(100)
    .default([]),

  referenceEntryIds: z
    .array(z.string().uuid())
    .max(100)
    .default([]),
}).superRefine((data, ctx) => {
  if (
    new Set(data.referenceProjectIds).size !==
    data.referenceProjectIds.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["referenceProjectIds"],
      message:
        "Duplicate referenced projects are not allowed",
    });
  }

  if (
    new Set(data.referenceEntryIds).size !==
    data.referenceEntryIds.length
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["referenceEntryIds"],
      message:
        "Duplicate referenced entries are not allowed",
    });
  }
});

const updateEntrySchema = z.object({
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

  fieldIds: z
    .array(z.string().uuid())
    .max(100)
    .default([]),

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
}).superRefine((data, ctx) => {
  const fieldIdSet = new Set(data.fieldIds);
  const valueIds = data.values.map((item) => item.fieldId);
  if (new Set(valueIds).size !== valueIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["values"],
      message: "Duplicate field values are not allowed",
    });
  }
  for (const fieldId of valueIds) {
    if (!fieldIdSet.has(fieldId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["values"],
        message: "Every submitted value must belong to a selected field",
      });
      break;
    }
  }
});

const updateChecklistSchema = z
  .object({
    text: z.string().trim().min(1).max(300).optional(),
    completed: z.boolean().optional(),
  })
  .refine(
    (data) => data.text !== undefined || data.completed !== undefined,
    {
      message: "At least one checklist value must be provided",
    },
  );

const updateProjectReferencesSchema = z.object({
  projectIds: z
    .array(z.string().uuid())
    .max(100),
});

const updateEntryReferencesSchema = z.object({
  entryIds: z
    .array(z.string().uuid())
    .max(100),
});

const updateEntryProjectReferencesSchema = z.object({
  projectIds: z
    .array(z.string().uuid())
    .max(100),
});

module.exports = {
  createEntrySchema,
  updateEntrySchema,
  updateChecklistSchema,
  updateProjectReferencesSchema,
  updateEntryReferencesSchema,
  updateEntryProjectReferencesSchema,
};