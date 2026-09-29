const DEFAULT_TTS_MODEL =
  "gemini-3.8-flash-lite-tts";

const DEFAULT_TIMEOUT_MS = 45000;
const DEFAULT_VOICE = "Charon";
const MAX_TEXT_LENGTH = 2500;

function createHttpError(
  statusCode,
  message,
) {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildInsightNarration(insight) {
  if (
    !insight ||
    typeof insight !== "object"
  ) {
    throw createHttpError(
      400,
      "AI insight is required.",
    );
  }

  const headline =
    cleanText(insight.headline);

  const summary =
    cleanText(insight.summary);

  const focusAreas =
    Array.isArray(insight.focusAreas)
      ? insight.focusAreas
          .map(cleanText)
          .filter(Boolean)
          .slice(0, 4)
      : [];

  const trendLabel =
    cleanText(
      insight.trend?.label,
    );

  const trendExplanation =
    cleanText(
      insight.trend?.explanation,
    );

  const nextStepTitle =
    cleanText(
      insight.nextStep?.title,
    );

  const nextStepReason =
    cleanText(
      insight.nextStep?.reason,
    );

  if (
    !headline ||
    !summary
  ) {
    throw createHttpError(
      400,
      "The AI insight is incomplete.",
    );
  }

  const sections = [
    `Project progress insight. ${headline}.`,
    summary,
  ];

  if (focusAreas.length) {
    sections.push(
      `Current focus areas are: ${focusAreas.join(
        ", ",
      )}.`,
    );
  }

  if (
    trendLabel ||
    trendExplanation
  ) {
    sections.push(
      `Momentum: ${
        trendLabel ||
        "activity trend"
      }. ${trendExplanation}`,
    );
  }

  if (
    nextStepTitle ||
    nextStepReason
  ) {
    sections.push(
      `Next best move: ${
        nextStepTitle ||
        "review your project"
      }. ${nextStepReason}`,
    );
  }

  return sections
    .filter(Boolean)
    .join(" ")
    .slice(
      0,
      MAX_TEXT_LENGTH,
    );
}

function findAudioContent(
  payload,
) {
  if (
    payload?.output_audio?.data
  ) {
    return {
      data:
        payload.output_audio.data,

      mimeType:
        payload.output_audio
          .mime_type ||
        payload.output_audio
          .mimeType ||
        "audio/wav",
    };
  }

  const steps =
    Array.isArray(
      payload?.steps,
    )
      ? payload.steps
      : [];

  for (const step of steps) {
    const content =
      Array.isArray(
        step?.content,
      )
        ? step.content
        : [];

    for (const item of content) {
      if (
        item?.type ===
          "audio" &&
        item?.data
      ) {
        return {
          data:
            item.data,

          mimeType:
            item.mime_type ||
            item.mimeType ||
            "audio/wav",
        };
      }
    }
  }

  return null;
}

async function generateInsightSpeech(
  insight,
  options = {},
) {
  const apiKey =
    options.apiKey ||
    process.env
      .GEMINI_API_KEY;

  if (!apiKey) {
    throw createHttpError(
      503,
      "AI speech generation is not configured.",
    );
  }

  const model =
    options.model ||
    process.env
      .GEMINI_TTS_MODEL ||
    DEFAULT_TTS_MODEL;

  const voice =
    options.voice ||
    DEFAULT_VOICE;

  const timeoutMs =
    Number(
      options.timeoutMs ||
        process.env
          .GEMINI_TTS_TIMEOUT_MS ||
        DEFAULT_TIMEOUT_MS,
    );

  const fetchImpl =
    options.fetchImpl || fetch;

  const narration =
    buildInsightNarration(
      insight,
    );

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs,
    );

  try {
    const response =
      await fetchImpl(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-goog-api-key":
              apiKey,
          },

          signal:
            controller.signal,

          body:
            JSON.stringify({
              model,

              input: [
                {
                  type:
                    "user_input",

                  content: [
                    {
                      type:
                        "text",

                      text:
                        narration,

                      annotations: [
                        {
                          type:
                            "speech_metadata",

                          style:
                            "Clear, calm, professional and encouraging. Speak at a natural pace suitable for a university student reviewing project progress.",
                        },
                      ],
                    },
                  ],
                },
              ],

              response_format: {
                type:
                  "audio",
              },

              generation_config: {
                speech_config: [
                  {
                    voice,
                  },
                ],
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
        "Gemini TTS request failed:",
        response.status,
        providerBody.slice(
          0,
          500,
        ),
      );

      if (
        response.status ===
        429
      ) {
        throw createHttpError(
          503,
          "AI speech is temporarily busy. Please try again shortly.",
        );
      }

      if (
        response.status ===
        503
      ) {
        throw createHttpError(
          503,
          "AI speech is temporarily unavailable. Please try again shortly.",
        );
      }

      throw createHttpError(
        502,
        "AI speech generation is temporarily unavailable.",
      );
    }

    const payload =
      await response.json();

    const audio =
      findAudioContent(
        payload,
      );

    if (!audio?.data) {
      console.error(
        "Gemini TTS returned no audio data.",
      );

      throw createHttpError(
        502,
        "AI speech generation returned no audio.",
      );
    }

    return {
      audio:
        audio.data,

      mimeType:
        audio.mimeType ||
        "audio/wav",

      model,

      voice,
    };
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw createHttpError(
        504,
        "AI speech generation took too long. Please try again.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  buildInsightNarration,
  generateInsightSpeech,
};