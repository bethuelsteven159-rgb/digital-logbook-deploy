const { z } = require("zod");

const frequencySchema = z.enum([
  "daily",
  "weekly",
  "monthly",
]);

const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(30),
  )
  .max(10, "Too many tags")
  .transform((tags) => [
    ...new Set(tags.map((tag) => tag.toLowerCase())),
  ]);

const checklistSchema = z
  .array(
    z.object({
      text: z.string().trim().min(1).max(300),
    }),
  )
  .max(100);

const startsOnSchema = z
  .string()
  .date(
    "Start date must be a valid ISO date (YYYY-MM-DD)",
  );

const endsOnSchema = z
  .string()
  .date("End date must be a valid ISO date (YYYY-MM-DD)");

const createRecurringEntrySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Recurring entry name is required")
      .max(150, "Recurring entry name is too long"),

    durationMinutes: z.coerce
      .number()
      .int()
      .min(0, "Duration cannot be negative")
      .max(10080, "Duration is too large")
      .default(0),

    tags: tagsSchema.default([]),

    checklist: checklistSchema.default([]),

    frequency: frequencySchema,

    intervalCount: z.coerce
      .number()
      .int()
      .min(1, "Interval must be at least 1")
      .max(365, "Interval must be at most 365")
      .default(1),

    startsOn: startsOnSchema,

    endsOn: endsOnSchema.nullable().optional(),

    enabled: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (
      data.endsOn &&
      data.endsOn < data.startsOn
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsOn"],
        message:
          "End date cannot be earlier than start date",
      });
    }
  });

const updateRecurringEntrySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Recurring entry name is required")
      .max(150, "Recurring entry name is too long")
      .optional(),

    durationMinutes: z.coerce
      .number()
      .int()
      .min(0, "Duration cannot be negative")
      .max(10080, "Duration is too large")
      .optional(),

    tags: tagsSchema.optional(),

    checklist: checklistSchema.optional(),

    frequency: frequencySchema.optional(),

    intervalCount: z.coerce
      .number()
      .int()
      .min(1, "Interval must be at least 1")
      .max(365, "Interval must be at most 365")
      .optional(),

    startsOn: startsOnSchema.optional(),

    endsOn: endsOnSchema.nullable().optional(),

    enabled: z.boolean().optional(),
  })
  .refine(
    (data) =>
      Object.values(data).some(
        (value) => value !== undefined,
      ),
    {
      message:
        "At least one recurring entry value must be provided",
    },
  );

module.exports = {
  createRecurringEntrySchema,
  updateRecurringEntrySchema,
};
