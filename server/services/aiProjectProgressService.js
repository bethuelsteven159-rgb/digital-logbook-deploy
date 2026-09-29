const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_RECENT_ENTRIES = 12;
const MAX_FOCUS_AREAS = 4;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function safeDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getEntryActivityDate(entry) {
  return (
    safeDate(entry.occurredAt) ||
    safeDate(entry.createdAt)
  );
}

function truncate(value, maxLength = 140) {
  const text = String(value ?? "").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function buildProjectEvidence(
  details,
  now = new Date(),
) {
  const entries =
    Array.isArray(details?.entries)
      ? details.entries
      : [];

  const stats = details?.stats || {};

  const currentStart = new Date(now);

  currentStart.setDate(
    currentStart.getDate() - 7,
  );

  const previousStart = new Date(now);

  previousStart.setDate(
    previousStart.getDate() - 14,
  );

  const currentEntries = [];
  const previousEntries = [];

  for (const entry of entries) {
    const activityDate =
      getEntryActivityDate(entry);

    if (!activityDate) continue;

    if (
      activityDate >= currentStart &&
      activityDate <= now
    ) {
      currentEntries.push(entry);
    } else if (
      activityDate >= previousStart &&
      activityDate < currentStart
    ) {
      previousEntries.push(entry);
    }
  }

  const unfinishedEntries =
    entries.filter(
      (entry) => !entry.completedAt,
    );

  const overdueEntries =
    unfinishedEntries.filter((entry) => {
      const dueAt = safeDate(entry.dueAt);

      return dueAt && dueAt < now;
    });

  const recentEntries = [...entries]
    .sort((left, right) => {
      const leftTime =
        getEntryActivityDate(left)
          ?.getTime() || 0;

      const rightTime =
        getEntryActivityDate(right)
          ?.getTime() || 0;

      return rightTime - leftTime;
    })
    .slice(0, MAX_RECENT_ENTRIES)
    .map((entry) => ({
      name: truncate(entry.name, 120),

      occurredAt:
        entry.occurredAt ||
        entry.createdAt ||
        null,

      durationMinutes:
        Number(
          entry.durationMinutes || 0,
        ),

      completed:
        Boolean(entry.completedAt),

      dueAt:
        entry.dueAt || null,

      tags:
        Array.isArray(entry.tags)
          ? entry.tags
              .slice(0, 6)
              .map((tag) =>
                truncate(tag, 50),
              )
          : [],

      fields:
        Array.isArray(entry.values)
          ? entry.values
              .slice(0, 4)
              .map((value) => ({
                name: truncate(
                  value.name,
                  60,
                ),

                value: truncate(
                  value.value,
                  120,
                ),
              }))
          : [],
    }));

  return {
    projectName:
      details?.project?.name ||
      "Untitled project",

    projectDescription:
      truncate(
        details?.project?.description,
        400,
      ),

    totalEntries:
      Number(
        stats.totalEntries ??
        entries.length ??
        0,
      ),

    loggedMinutes:
      Number(
        stats.loggedMinutes || 0,
      ),

    lastActivity:
      stats.lastActivity || null,

    entriesLast7Days:
      currentEntries.length,

    entriesPrevious7Days:
      previousEntries.length,

    unfinishedEntries:
      unfinishedEntries.length,

    overdueEntries:
      overdueEntries.length,

    recentEntries,
  };
}

function validateInsight(value) {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  if (
    typeof value.headline !==
      "string" ||
    !value.headline.trim()
  ) {
    return false;
  }

  if (
    typeof value.summary !==
      "string" ||
    !value.summary.trim()
  ) {
    return false;
  }

  if (
    !Array.isArray(
      value.focusAreas,
    )
  ) {
    return false;
  }

  if (
    !value.trend ||
    typeof value.trend !==
      "object"
  ) {
    return false;
  }

  if (
    ![
      "up",
      "steady",
      "down",
      "insufficient",
    ].includes(
      value.trend.direction,
    )
  ) {
    return false;
  }

  if (
    typeof value.trend.label !==
      "string" ||
    typeof value.trend
      .explanation !== "string"
  ) {
    return false;
  }

  if (
    !value.nextStep ||
    typeof value.nextStep !==
      "object"
  ) {
    return false;
  }

  if (
    typeof value.nextStep.title !==
      "string" ||
    typeof value.nextStep.reason !==
      "string"
  ) {
    return false;
  }

  return true;
}

function insufficientInsight() {
  return {
    headline:
      "Not enough activity yet",

    summary:
      "There isn’t enough project activity yet to provide a meaningful progress analysis.",

    focusAreas: [],

    trend: {
      direction: "insufficient",
      label: "Not enough data",
      explanation:
        "Add a few project entries and try again once there is more activity to compare.",
    },

    nextStep: {
      title:
        "Keep logging your work",

      reason:
        "A few more entries will give the progress analysis enough evidence to identify patterns and useful next steps.",
    },
  };
}

async function generateProjectProgressInsight(
  details,
  options = {},
) {
  const evidence =
    buildProjectEvidence(
      details,
      options.now ||
        new Date(),
    );

  if (
    evidence.totalEntries === 0 ||
    evidence.recentEntries
      .length === 0
  ) {
    return {
      insight:
        insufficientInsight(),

      evidence,

      provider:
        "local-insufficient-data",
    };
  }

  const apiKey =
    options.apiKey ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw createHttpError(
      503,
      "AI progress analysis is not configured.",
    );
  }

  const model =
    options.model ||
    process.env.GEMINI_MODEL ||
    DEFAULT_MODEL;

  const timeoutMs =
    Number(
      options.timeoutMs ||
      process.env
        .GEMINI_TIMEOUT_MS ||
      DEFAULT_TIMEOUT_MS,
    );

  const fetchImpl =
    options.fetchImpl || fetch;

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs,
    );

  const prompt = [
    "You are the project-progress analyst inside a student digital logbook.",

    "Use ONLY the supplied project evidence. Never invent statistics, entries, tasks, deadlines, completion states, or project facts.",

    "The application has already calculated all factual metrics. Your job is to interpret them clearly and helpfully.",

    "Do not claim work is complete unless the evidence says it is complete.",

    "Do not make assumptions about missing data.",

    "Keep the tone encouraging, concise, specific, and useful to a university student.",

    `Return no more than ${MAX_FOCUS_AREAS} focus areas.`,

    "For nextStep, suggest one sensible focus based only on unfinished work, overdue work, recent activity, and project description. If the evidence cannot support a specific next step, suggest reviewing the current unfinished items instead.",

    "Project evidence:",

    JSON.stringify(evidence),
  ].join("\n\n");

  const schema = {
    type: "OBJECT",

    properties: {
      headline: {
        type: "STRING",
      },

      summary: {
        type: "STRING",
      },

      focusAreas: {
        type: "ARRAY",

        items: {
          type: "STRING",
        },

        maxItems:
          MAX_FOCUS_AREAS,
      },

      trend: {
        type: "OBJECT",

        properties: {
          direction: {
            type: "STRING",

            enum: [
              "up",
              "steady",
              "down",
              "insufficient",
            ],
          },

          label: {
            type: "STRING",
          },

          explanation: {
            type: "STRING",
          },
        },

        required: [
          "direction",
          "label",
          "explanation",
        ],
      },

      nextStep: {
        type: "OBJECT",

        properties: {
          title: {
            type: "STRING",
          },

          reason: {
            type: "STRING",
          },
        },

        required: [
          "title",
          "reason",
        ],
      },
    },

    required: [
      "headline",
      "summary",
      "focusAreas",
      "trend",
      "nextStep",
    ],
  };

  try {
    const response =
      await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model,
        )}:generateContent?key=${encodeURIComponent(
          apiKey,
        )}`,

        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          signal:
            controller.signal,

          body:
            JSON.stringify({
              contents: [
                {
                  role: "user",

                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],

              generationConfig: {
                temperature: 0.25,

                maxOutputTokens: 700,

                responseMimeType:
                  "application/json",

                responseSchema:
                  schema,
              },
            }),
        },
      );

    if (!response.ok) {
      const providerBody =
        await response
          .text()
          .catch(() => "");

      console.error(
        "Gemini project progress request failed:",
        response.status,
        providerBody.slice(
          0,
          500,
        ),
      );

      if (
        response.status === 429
      ) {
        throw createHttpError(
          503,
          "AI progress analysis is temporarily busy. Please try again shortly.",
        );
      }

      throw createHttpError(
        502,
        "AI progress analysis is temporarily unavailable.",
      );
    }

    const payload =
      await response.json();

    const text =
      payload?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;

    if (!text) {
      throw createHttpError(
        502,
        "AI progress analysis returned an empty response.",
      );
    }

    let insight;

    try {
      insight =
        JSON.parse(text);
    } catch {
      throw createHttpError(
        502,
        "AI progress analysis returned an invalid response.",
      );
    }

    if (
      !validateInsight(insight)
    ) {
      throw createHttpError(
        502,
        "AI progress analysis returned an unexpected response.",
      );
    }

    return {
      insight: {
        ...insight,

        focusAreas:
          insight.focusAreas.slice(
            0,
            MAX_FOCUS_AREAS,
          ),
      },

      evidence,

      provider: "gemini",

      model,
    };
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw createHttpError(
        504,
        "AI progress analysis took too long. Please try again.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  buildProjectEvidence,
  generateProjectProgressInsight,
};