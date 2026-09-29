import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Clock3,
  FileText,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";

import {
  fetchAiProjectProgress,
  fetchAiProjectSpeech,
} from "../../api/projectDetailsApi";

function formatLoggedTime(
  minutes = 0,
) {
  const value =
    Number(minutes) || 0;

  const hours =
    Math.floor(value / 60);

  const remainingMinutes =
    value % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (
    remainingMinutes === 0
  ) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function getTrendIcon(
  direction,
) {
  if (direction === "up") {
    return (
      <ArrowUpRight
        size={20}
        strokeWidth={2}
      />
    );
  }

  if (direction === "down") {
    return (
      <ArrowDownRight
        size={20}
        strokeWidth={2}
      />
    );
  }

  return (
    <ArrowRight
      size={20}
      strokeWidth={2}
    />
  );
}

function getTrendClass(
  direction,
) {
  if (direction === "up") {
    return "ai-insight-trend-up";
  }

  if (direction === "down") {
    return "ai-insight-trend-down";
  }

  if (
    direction ===
    "insufficient"
  ) {
    return "ai-insight-trend-insufficient";
  }

  return "ai-insight-trend-steady";
}

export default function AiProjectInsight({
  projectId,
}) {
  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    speechLoading,
    setSpeechLoading,
  ] = useState(false);

  const [
    speechError,
    setSpeechError,
  ] = useState("");

  const [
    audioState,
    setAudioState,
  ] = useState("idle");

  const audioRef =
    useRef(null);

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();

      audioRef.current.currentTime =
        0;

      audioRef.current = null;
    }

    setAudioState("idle");

    setSpeechError("");
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();

        audioRef.current =
          null;
      }
    };
  }, []);

  async function handleGenerate() {
    if (
      !projectId ||
      loading
    ) {
      return;
    }

    try {
      stopAudio();

      setLoading(true);

      setError("");

      const response =
        await fetchAiProjectProgress(
          projectId,
        );

      setResult(response);
    } catch (requestError) {
      console.error(
        "Failed to generate AI project insight:",
        requestError,
      );

      if (
        requestError.status ===
        429
      ) {
        setError(
          "AI analysis is receiving too many requests. Please wait a moment and try again.",
        );
      } else if (
        requestError.status ===
          502 ||
        requestError.status ===
          503
      ) {
        setError(
          "The AI service is temporarily unavailable. Please try again shortly.",
        );
      } else if (
        requestError.status ===
        504
      ) {
        setError(
          "The AI analysis took too long to respond. Please try again.",
        );
      } else {
        setError(
          requestError.message ||
            "Unable to generate the AI project insight.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function playAudio(
    audio,
  ) {
    try {
      await audio.play();

      setAudioState(
        "playing",
      );
    } catch (playError) {
      console.error(
        "Browser could not automatically play AI speech:",
        playError,
      );

      setAudioState("ready");
    }
  }

  async function handleSpeech() {
    const insight =
      result?.insight;

    if (
      !insight ||
      speechLoading
    ) {
      return;
    }

    const existingAudio =
      audioRef.current;

    if (
      existingAudio &&
      audioState === "playing"
    ) {
      existingAudio.pause();

      setAudioState(
        "paused",
      );

      return;
    }

    if (
      existingAudio &&
      (audioState ===
        "paused" ||
        audioState ===
          "ready")
    ) {
      await playAudio(
        existingAudio,
      );

      return;
    }

    if (
      existingAudio &&
      audioState === "ended"
    ) {
      existingAudio.currentTime =
        0;

      await playAudio(
        existingAudio,
      );

      return;
    }

    try {
      setSpeechLoading(true);

      setSpeechError("");

      const speech =
        await fetchAiProjectSpeech(
          projectId,
          insight,
        );

      if (!speech?.audio) {
        throw new Error(
          "No audio was returned.",
        );
      }

      const mimeType =
        speech.mimeType ||
        "audio/wav";

      const source =
        `data:${mimeType};base64,${speech.audio}`;

      const audio =
        new Audio(source);

      audio.preload =
        "auto";

      audio.onplay = () => {
        setAudioState(
          "playing",
        );
      };

      audio.onpause = () => {
        if (
          !audio.ended
        ) {
          setAudioState(
            "paused",
          );
        }
      };

      audio.onended = () => {
        setAudioState(
          "ended",
        );
      };

      audio.onerror = () => {
        setSpeechError(
          "The generated audio could not be played.",
        );

        setAudioState(
          "idle",
        );
      };

      audioRef.current =
        audio;

      await playAudio(audio);
    } catch (requestError) {
      console.error(
        "Failed to generate AI speech:",
        requestError,
      );

      if (
        requestError.status ===
        504
      ) {
        setSpeechError(
          "Speech generation took too long. Please try again.",
        );
      } else if (
        requestError.status ===
          502 ||
        requestError.status ===
          503
      ) {
        setSpeechError(
          "AI speech is temporarily unavailable. Please try again shortly.",
        );
      } else {
        setSpeechError(
          requestError.message ||
            "Unable to generate speech for this insight.",
        );
      }

      setAudioState("idle");
    } finally {
      setSpeechLoading(false);
    }
  }

  function getSpeechButton() {
    if (speechLoading) {
      return (
        <>
          <RefreshCw
            size={16}
            className="ai-insight-spinner"
          />

          Preparing audio...
        </>
      );
    }

    if (
      audioState === "playing"
    ) {
      return (
        <>
          <Pause size={16} />
          Pause
        </>
      );
    }

    if (
      audioState === "paused" ||
      audioState === "ready"
    ) {
      return (
        <>
          <Play size={16} />
          Resume
        </>
      );
    }

    if (
      audioState === "ended"
    ) {
      return (
        <>
          <Play size={16} />
          Replay
        </>
      );
    }

    return (
      <>
        <Volume2 size={16} />
        Listen to Insight
      </>
    );
  }

  const insight =
    result?.insight || null;

  const evidence =
    result?.evidence || null;

  return (
    <>
      <section
        className={`ai-insight-shell ${
          insight
            ? "ai-insight-shell-expanded"
            : ""
        }`}
      >
        <div className="ai-insight-top">
          <div className="ai-insight-heading-wrap">
            <div className="ai-insight-icon">
              <BrainCircuit
                size={23}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <div className="ai-insight-kicker">
                <Sparkles
                  size={14}
                  strokeWidth={2}
                />

                AI Project Coach
              </div>

              <h2 className="ai-insight-title">
                Understand your
                project progress
              </h2>

              {!insight && (
                <p className="ai-insight-description">
                  Get an AI-powered
                  explanation of your
                  recent activity,
                  focus areas,
                  momentum and suggested
                  next move.
                </p>
              )}
            </div>
          </div>

          <div className="ai-insight-actions">
            {insight && (
              <button
                type="button"
                className="ai-insight-speech"
                onClick={
                  handleSpeech
                }
                disabled={
                  speechLoading
                }
              >
                {getSpeechButton()}
              </button>
            )}

            <button
              type="button"
              className="ai-insight-generate"
              onClick={
                handleGenerate
              }
              disabled={
                loading
              }
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={16}
                    className="ai-insight-spinner"
                  />

                  Analysing...
                </>
              ) : insight ? (
                <>
                  <RefreshCw
                    size={16}
                  />

                  Refresh Insight
                </>
              ) : (
                <>
                  <Sparkles
                    size={16}
                  />

                  Explain My Progress
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="ai-insight-error"
            role="alert"
          >
            <AlertCircle
              size={18}
            />

            <div>
              <strong>
                Unable to generate
                insight
              </strong>

              <span>
                {error}
              </span>
            </div>
          </div>
        )}

        {speechError && (
          <div
            className="ai-insight-error"
            role="alert"
          >
            <AlertCircle
              size={18}
            />

            <div>
              <strong>
                Unable to play
                insight
              </strong>

              <span>
                {speechError}
              </span>
            </div>
          </div>
        )}

        {insight && (
          <div className="ai-insight-content">
            <div className="ai-insight-hero">
              <span className="ai-insight-label">
                AI PROJECT INSIGHT
              </span>

              <h3>
                {insight.headline}
              </h3>

              <p>
                {insight.summary}
              </p>
            </div>

            <div className="ai-insight-grid">
              <div className="ai-insight-panel">
                <div className="ai-insight-panel-heading">
                  <span className="ai-insight-panel-icon">
                    <Sparkles
                      size={17}
                    />
                  </span>

                  <span>
                    Focus areas
                  </span>
                </div>

                {Array.isArray(
                  insight.focusAreas,
                ) &&
                insight.focusAreas
                  .length > 0 ? (
                  <div className="ai-focus-list">
                    {insight.focusAreas.map(
                      (
                        focusArea,
                      ) => (
                        <span
                          key={
                            focusArea
                          }
                          className="ai-focus-chip"
                        >
                          {
                            focusArea
                          }
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="ai-insight-muted">
                    No clear focus
                    areas yet.
                  </p>
                )}
              </div>

              <div className="ai-insight-panel">
                <div className="ai-insight-panel-heading">
                  <span className="ai-insight-panel-icon">
                    {getTrendIcon(
                      insight
                        .trend
                        ?.direction,
                    )}
                  </span>

                  <span>
                    Momentum
                  </span>
                </div>

                <div
                  className={`ai-insight-trend ${getTrendClass(
                    insight
                      .trend
                      ?.direction,
                  )}`}
                >
                  <div className="ai-insight-trend-title">
                    {getTrendIcon(
                      insight
                        .trend
                        ?.direction,
                    )}

                    <span>
                      {insight
                        .trend
                        ?.label ||
                        "Activity trend"}
                    </span>
                  </div>

                  <p>
                    {
                      insight
                        .trend
                        ?.explanation
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="ai-next-step">
              <div className="ai-next-step-icon">
                <Target
                  size={22}
                />
              </div>

              <div className="ai-next-step-body">
                <span className="ai-next-step-label">
                  Next best move
                </span>

                <h4>
                  {
                    insight
                      .nextStep
                      ?.title
                  }
                </h4>

                <p>
                  {
                    insight
                      .nextStep
                      ?.reason
                  }
                </p>
              </div>
            </div>

            {evidence && (
              <div className="ai-evidence">
                <span className="ai-evidence-intro">
                  Based on your
                  project activity
                </span>

                <div className="ai-evidence-items">
                  <div className="ai-evidence-item">
                    <FileText
                      size={15}
                    />

                    <strong>
                      {evidence
                        .totalEntries ??
                        0}
                    </strong>

                    <span>
                      {Number(
                        evidence
                          .totalEntries,
                      ) === 1
                        ? "entry"
                        : "entries"}
                    </span>
                  </div>

                  <span className="ai-evidence-divider" />

                  <div className="ai-evidence-item">
                    <Clock3
                      size={15}
                    />

                    <strong>
                      {formatLoggedTime(
                        evidence
                          .loggedMinutes,
                      )}
                    </strong>

                    <span>
                      logged
                    </span>
                  </div>

                  <span className="ai-evidence-divider" />

                  <div className="ai-evidence-item">
                    <Target
                      size={15}
                    />

                    <strong>
                      {evidence
                        .unfinishedEntries ??
                        0}
                    </strong>

                    <span>
                      unfinished
                    </span>
                  </div>

                  {Number(
                    evidence
                      .overdueEntries,
                  ) > 0 && (
                    <>
                      <span className="ai-evidence-divider" />

                      <div className="ai-evidence-item ai-evidence-overdue">
                        <AlertCircle
                          size={15}
                        />

                        <strong>
                          {
                            evidence
                              .overdueEntries
                          }
                        </strong>

                        <span>
                          overdue
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <p className="ai-evidence-note">
                  Statistics are
                  calculated from your
                  logbook. AI is used
                  only to interpret the
                  supplied project
                  activity.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <style>{`
        .ai-insight-shell {
          position: relative;
          overflow: hidden;
          margin: 20px 0 24px;
          border: 1px solid #dbe4ff;
          border-radius: 18px;
          background:
            radial-gradient(
              circle at 95% 0%,
              rgba(99, 102, 241, 0.14),
              transparent 34%
            ),
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f8faff 100%
            );
          box-shadow:
            0 12px 30px
              rgba(15, 23, 42, 0.06);
        }

        .ai-insight-shell::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(
            90deg,
            #4f46e5,
            #7c3aed,
            #2563eb
          );
        }

        .ai-insight-top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 22px 24px;
        }

        .ai-insight-heading-wrap {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
        }

        .ai-insight-icon {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          border-radius: 13px;
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #4f46e5,
            #7c3aed
          );
          box-shadow:
            0 8px 18px
              rgba(79, 70, 229, 0.2);
        }

        .ai-insight-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
          color: #5b5bd6;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ai-insight-title {
          margin: 0;
          color: #172033;
          font-size: 19px;
          line-height: 1.25;
          font-weight: 750;
        }

        .ai-insight-description {
          max-width: 620px;
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.55;
        }

        .ai-insight-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex: 0 0 auto;
        }

        .ai-insight-generate,
        .ai-insight-speech {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 40px;
          padding: 0 16px;
          border-radius: 10px;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.16s ease,
            box-shadow 0.16s ease,
            opacity 0.16s ease;
        }

        .ai-insight-generate {
          border: 0;
          color: #ffffff;
          background: linear-gradient(
            135deg,
            #4f46e5,
            #6d4de8
          );
          box-shadow:
            0 7px 18px
              rgba(79, 70, 229, 0.18);
        }

        .ai-insight-speech {
          border: 1px solid #d9dcf8;
          color: #4f46e5;
          background: #ffffff;
        }

        .ai-insight-generate:hover:not(:disabled),
        .ai-insight-speech:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .ai-insight-speech:hover:not(:disabled) {
          background: #f7f7ff;
        }

        .ai-insight-generate:hover:not(:disabled) {
          box-shadow:
            0 10px 22px
              rgba(79, 70, 229, 0.24);
        }

        .ai-insight-generate:disabled,
        .ai-insight-speech:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .ai-insight-spinner {
          animation:
            ai-insight-spin
            0.9s linear
            infinite;
        }

        @keyframes ai-insight-spin {
          to {
            transform:
              rotate(360deg);
          }
        }

        .ai-insight-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0 24px 14px;
          padding: 12px 14px;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #991b1b;
          background: #fff7f7;
          font-size: 13px;
          line-height: 1.45;
        }

        .ai-insight-error svg {
          margin-top: 1px;
          flex: 0 0 auto;
        }

        .ai-insight-error div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ai-insight-content {
          border-top: 1px solid #e8ecf8;
        }

        .ai-insight-hero {
          padding: 22px 24px 18px;
        }

        .ai-insight-label {
          display: inline-block;
          margin-bottom: 7px;
          color: #64748b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.11em;
        }

        .ai-insight-hero h3 {
          margin: 0;
          color: #111827;
          font-size: 22px;
          line-height: 1.3;
          font-weight: 750;
        }

        .ai-insight-hero p {
          max-width: 900px;
          margin: 8px 0 0;
          color: #536174;
          font-size: 14px;
          line-height: 1.65;
        }

        .ai-insight-grid {
          display: grid;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
          gap: 14px;
          padding: 0 24px 16px;
        }

        .ai-insight-panel {
          min-width: 0;
          padding: 16px;
          border: 1px solid #e5eaf4;
          border-radius: 13px;
          background:
            rgba(
              255,
              255,
              255,
              0.8
            );
        }

        .ai-insight-panel-heading {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: #374151;
          font-size: 12px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.055em;
        }

        .ai-insight-panel-icon {
          display: grid;
          place-items: center;
          color: #5b5bd6;
        }

        .ai-focus-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .ai-focus-chip {
          display: inline-flex;
          align-items: center;
          min-height: 29px;
          padding: 4px 10px;
          border: 1px solid #dfe3fb;
          border-radius: 999px;
          color: #4546a8;
          background: #f6f6ff;
          font-size: 12px;
          font-weight: 650;
        }

        .ai-insight-muted {
          margin: 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .ai-insight-trend {
          padding: 12px;
          border-radius: 10px;
        }

        .ai-insight-trend-title {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 5px;
          font-size: 14px;
          font-weight: 750;
        }

        .ai-insight-trend p {
          margin: 0;
          color: #526071;
          font-size: 12px;
          line-height: 1.55;
        }

        .ai-insight-trend-up {
          background: #f0fdf4;
          color: #15803d;
        }

        .ai-insight-trend-down {
          background: #fff7ed;
          color: #c2410c;
        }

        .ai-insight-trend-steady {
          background: #f8fafc;
          color: #475569;
        }

        .ai-insight-trend-insufficient {
          background: #f8fafc;
          color: #64748b;
        }

        .ai-next-step {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin: 0 24px 18px;
          padding: 17px;
          border: 1px solid #ddd6fe;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #faf9ff,
            #f7f8ff
          );
        }

        .ai-next-step-icon {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          border-radius: 10px;
          color: #6d28d9;
          background: #ede9fe;
        }

        .ai-next-step-label {
          display: block;
          margin-bottom: 3px;
          color: #7c3aed;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .ai-next-step h4 {
          margin: 0;
          color: #1f2937;
          font-size: 15px;
          line-height: 1.4;
        }

        .ai-next-step p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .ai-evidence {
          margin: 0 24px 24px;
          padding: 14px 16px;
          border-radius: 12px;
          background: #f8fafc;
        }

        .ai-evidence-intro {
          display: block;
          margin-bottom: 9px;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
        }

        .ai-evidence-items {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }

        .ai-evidence-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #64748b;
          font-size: 12px;
        }

        .ai-evidence-item svg {
          color: #64748b;
        }

        .ai-evidence-item strong {
          color: #1e293b;
        }

        .ai-evidence-overdue,
        .ai-evidence-overdue strong,
        .ai-evidence-overdue svg {
          color: #b91c1c;
        }

        .ai-evidence-divider {
          width: 1px;
          height: 15px;
          background: #cbd5e1;
        }

        .ai-evidence-note {
          margin: 10px 0 0;
          color: #94a3b8;
          font-size: 10px;
          line-height: 1.45;
        }

        @media (
          max-width: 900px
        ) {
          .ai-insight-top {
            align-items: stretch;
            flex-direction: column;
          }

          .ai-insight-actions {
            width: 100%;
          }

          .ai-insight-generate,
          .ai-insight-speech {
            flex: 1;
          }
        }

        @media (
          max-width: 760px
        ) {
          .ai-insight-grid {
            grid-template-columns:
              1fr;
          }

          .ai-evidence-divider {
            display: none;
          }

          .ai-evidence-items {
            align-items:
              flex-start;
            flex-direction:
              column;
          }
        }

        @media (
          max-width: 520px
        ) {
          .ai-insight-actions {
            flex-direction:
              column;
          }

          .ai-insight-generate,
          .ai-insight-speech {
            width: 100%;
          }

          .ai-insight-top,
          .ai-insight-hero {
            padding-left: 18px;
            padding-right: 18px;
          }

          .ai-insight-grid {
            padding-left: 18px;
            padding-right: 18px;
          }

          .ai-next-step,
          .ai-evidence,
          .ai-insight-error {
            margin-left: 18px;
            margin-right: 18px;
          }
        }
      `}</style>
    </>
  );
}