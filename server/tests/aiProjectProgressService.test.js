const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildProjectEvidence,
  generateProjectProgressInsight,
} = require("../services/aiProjectProgressService");

function createDetails(overrides = {}) {
  return {
    project: {
      name: "Chess",
      description: "Tournament preparation",
    },
    stats: {
      totalEntries: 3,
      loggedMinutes: 95,
      lastActivity: "2026-09-28T10:00:00.000Z",
    },
    entries: [
      {
        name: "Opening study",
        occurredAt: "2026-09-28T10:00:00.000Z",
        durationMinutes: 30,
        completedAt: null,
        dueAt: null,
        tags: ["opening"],
        values: [],
      },
      {
        name: "Endgame practice",
        occurredAt: "2026-09-24T10:00:00.000Z",
        durationMinutes: 40,
        completedAt: "2026-09-24T11:00:00.000Z",
        dueAt: null,
        tags: ["endgame"],
        values: [],
      },
      {
        name: "Tactics",
        occurredAt: "2026-09-17T10:00:00.000Z",
        durationMinutes: 25,
        completedAt: null,
        dueAt: "2026-09-20T10:00:00.000Z",
        tags: [],
        values: [],
      },
    ],
    ...overrides,
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test("buildProjectEvidence calculates factual metrics without AI", () => {
  const evidence = buildProjectEvidence(
    createDetails(),
    new Date("2026-09-29T00:00:00.000Z"),
  );

  assert.equal(evidence.projectName, "Chess");
  assert.equal(evidence.totalEntries, 3);
  assert.equal(evidence.loggedMinutes, 95);
  assert.equal(evidence.entriesLast7Days, 2);
  assert.equal(evidence.entriesPrevious7Days, 1);
  assert.equal(evidence.unfinishedEntries, 2);
  assert.equal(evidence.overdueEntries, 1);
  assert.equal(evidence.recentEntries.length, 3);
  assert.equal(evidence.recentEntries[0].name, "Opening study");
});

test("generateProjectProgressInsight returns a local fallback when there is no activity", async () => {
  let called = false;

  const result = await generateProjectProgressInsight(
    createDetails({
      stats: { totalEntries: 0, loggedMinutes: 0, lastActivity: null },
      entries: [],
    }),
    {
      apiKey: "test-key",
      fetchImpl: async () => {
        called = true;
        throw new Error("Gemini should not be called");
      },
    },
  );

  assert.equal(called, false);
  assert.equal(result.provider, "local-insufficient-data");
  assert.equal(result.insight.trend.direction, "insufficient");
  assert.match(result.insight.summary, /enough project activity/i);
});

test("generateProjectProgressInsight returns structured Gemini output", async () => {
  const insight = {
    headline: "Momentum is improving",
    summary: "Recent activity is focused and consistent.",
    focusAreas: ["Opening study", "Endgames"],
    trend: {
      direction: "up",
      label: "Increasing",
      explanation: "More work was logged this week.",
    },
    nextStep: {
      title: "Finish opening review",
      reason: "It is the main unfinished focus area.",
    },
  };

  let requestBody;

  const result = await generateProjectProgressInsight(createDetails(), {
    apiKey: "test-key",
    model: "test-model",
    now: new Date("2026-09-29T00:00:00.000Z"),
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return jsonResponse({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(insight) }],
            },
          },
        ],
      });
    },
  });

  assert.equal(result.provider, "gemini");
  assert.equal(result.model, "test-model");
  assert.deepEqual(result.insight, insight);
  assert.equal(result.evidence.totalEntries, 3);
  assert.equal(requestBody.generationConfig.responseMimeType, "application/json");
  assert.ok(requestBody.generationConfig.responseSchema);
});

test("generateProjectProgressInsight maps Gemini rate limits to a friendly 503", async () => {
  await assert.rejects(
    () =>
      generateProjectProgressInsight(createDetails(), {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse(
            { error: { message: "quota exceeded" } },
            429,
          ),
      }),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.match(error.message, /temporarily busy/i);
      return true;
    },
  );
});

test("generateProjectProgressInsight rejects malformed AI JSON", async () => {
  await assert.rejects(
    () =>
      generateProjectProgressInsight(createDetails(), {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            candidates: [
              {
                content: {
                  parts: [{ text: "not valid json" }],
                },
              },
            ],
          }),
      }),
    (error) => {
      assert.equal(error.statusCode, 502);
      assert.match(error.message, /invalid response/i);
      return true;
    },
  );
});

test("generateProjectProgressInsight rejects an unexpected response shape", async () => {
  await assert.rejects(
    () =>
      generateProjectProgressInsight(createDetails(), {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify({ headline: "Only headline" }) }],
                },
              },
            ],
          }),
      }),
    (error) => {
      assert.equal(error.statusCode, 502);
      assert.match(error.message, /unexpected response/i);
      return true;
    },
  );
});

test("generateProjectProgressInsight aborts slow Gemini requests", async () => {
  const hangingFetch = (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });

  await assert.rejects(
    () =>
      generateProjectProgressInsight(createDetails(), {
        apiKey: "test-key",
        timeoutMs: 10,
        fetchImpl: hangingFetch,
      }),
    (error) => {
      assert.equal(error.statusCode, 504);
      assert.match(error.message, /took too long/i);
      return true;
    },
  );
});
