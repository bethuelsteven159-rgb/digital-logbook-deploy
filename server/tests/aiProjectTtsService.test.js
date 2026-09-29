const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildInsightNarration,
  generateInsightSpeech,
} = require("../services/aiProjectTtsService");

const insight = {
  headline: "Chess preparation is progressing",
  summary: "You have been working consistently on tournament preparation.",
  focusAreas: ["Openings", "Endgames"],
  trend: {
    direction: "up",
    label: "Increasing",
    explanation: "Activity increased this week.",
  },
  nextStep: {
    title: "Review unfinished opening work",
    reason: "It is the clearest outstanding task.",
  },
};

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

test("buildInsightNarration creates a concise spoken summary from the insight", () => {
  const narration = buildInsightNarration(insight);

  assert.match(narration, /Chess preparation is progressing/);
  assert.match(narration, /Current focus areas are: Openings, Endgames/);
  assert.match(narration, /Momentum: Increasing/);
  assert.match(narration, /Next best move: Review unfinished opening work/);
});

test("buildInsightNarration rejects incomplete insight data", () => {
  assert.throws(
    () => buildInsightNarration({ headline: "Missing summary" }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /incomplete/i);
      return true;
    },
  );
});

test("generateInsightSpeech returns inline audio from Gemini", async () => {
  let requestBody;

  const result = await generateInsightSpeech(insight, {
    apiKey: "test-key",
    model: "test-tts-model",
    voice: "Charon",
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return jsonResponse({
        output_audio: {
          data: "ZmFrZS1hdWRpbw==",
          mime_type: "audio/wav",
        },
      });
    },
  });

  assert.equal(result.audio, "ZmFrZS1hdWRpbw==");
  assert.equal(result.mimeType, "audio/wav");
  assert.equal(result.model, "test-tts-model");
  assert.equal(result.voice, "Charon");
  assert.deepEqual(requestBody.response_format, { type: "audio" });
  assert.equal(requestBody.response_format.delivery, undefined);
});

test("generateInsightSpeech also accepts audio from an Interactions API step", async () => {
  const result = await generateInsightSpeech(insight, {
    apiKey: "test-key",
    fetchImpl: async () =>
      jsonResponse({
        steps: [
          {
            content: [
              {
                type: "audio",
                data: "c3RlcC1hdWRpbw==",
                mime_type: "audio/wav",
              },
            ],
          },
        ],
      }),
  });

  assert.equal(result.audio, "c3RlcC1hdWRpbw==");
  assert.equal(result.mimeType, "audio/wav");
});

test("generateInsightSpeech maps provider unavailability to 503", async () => {
  await assert.rejects(
    () =>
      generateInsightSpeech(insight, {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse(
            { error: { message: "high demand" } },
            503,
          ),
      }),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.match(error.message, /temporarily unavailable/i);
      return true;
    },
  );
});

test("generateInsightSpeech maps rate limits to a friendly 503", async () => {
  await assert.rejects(
    () =>
      generateInsightSpeech(insight, {
        apiKey: "test-key",
        fetchImpl: async () =>
          jsonResponse(
            { error: { message: "rate limited" } },
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

test("generateInsightSpeech rejects a successful response with no audio", async () => {
  await assert.rejects(
    () =>
      generateInsightSpeech(insight, {
        apiKey: "test-key",
        fetchImpl: async () => jsonResponse({ steps: [] }),
      }),
    (error) => {
      assert.equal(error.statusCode, 502);
      assert.match(error.message, /returned no audio/i);
      return true;
    },
  );
});

test("generateInsightSpeech aborts slow TTS requests", async () => {
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
      generateInsightSpeech(insight, {
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
