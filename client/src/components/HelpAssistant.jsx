import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

const ONBOARDING_EVENT = "digitalLogbookOpenOnboarding";

const HELP_ITEMS = [
  {
    question: "How do I get started?",
    answer:
      "Open the getting-started guide for a short walkthrough of creating a project, opening it, creating your first entry, and reviewing your work.",
    action: "onboarding",
  },
  {
    question: "How do I create a project?",
    answer:
      "Open Projects, select Create Project, enter the project details, then save it.",
  },
  {
    question: "How do I create an entry?",
    answer:
      "Open one of your projects and select New Entry. Give the entry a name, enter the time spent, add any extra project information, then select Save & Create Entry.",
  },
  {
    question: "What is a custom field?",
    answer:
      "A custom field is extra information you choose to store with an entry, such as Status, Difficulty, Notes, or Source.",
  },
  {
    question: "How do I use the calendar?",
    answer:
      "Open a project and choose Calendar view. Your entries will appear according to the date they were recorded.",
  },
  {
    question: "How do I use the board?",
    answer:
      "Open a project and choose Board view. Select a project field, such as Status, and your entries will be grouped by that field.",
  },
  {
    question: "How do linked entries work?",
    answer:
      "When creating an entry, you can link it to an existing related entry. This helps you connect work that belongs together.",
  },
  {
    question: "What is the difference between a project and an entry?",
    answer:
      "A project is the overall piece of work you are tracking. An entry is one record inside that project describing work you completed, time spent, or other project information.",
  },
];

export default function HelpAssistant() {
  const [open, setOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  function closeAssistant() {
    setOpen(false);
    setSelectedQuestion(null);
  }

  function handleQuestionClick(item, index) {
    if (item.action === "onboarding") {
      window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
      closeAssistant();
      return;
    }

    setSelectedQuestion(index);
  }

  return (
    <>
      <button
        type="button"
        className="help-assistant-launcher"
        onClick={() => setOpen(true)}
        aria-label="Open help assistant"
        title="Need help?"
      >
        <HelpCircle size={24} />
      </button>

      {open && (
        <section
          className="help-assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Digital Logbook Help"
        >
          <div className="help-assistant-header">
            <div>
              <strong className="help-assistant-title">
                Digital Logbook Help
              </strong>
              <div className="help-assistant-subtitle">
                Quick guidance for common tasks
              </div>
            </div>

            <button
              type="button"
              className="help-assistant-close"
              onClick={closeAssistant}
              aria-label="Close help"
            >
              <X size={18} />
            </button>
          </div>

          <div className="help-assistant-body">
            {selectedQuestion === null ? (
              HELP_ITEMS.map((item, index) => (
                <button
                  key={item.question}
                  type="button"
                  className="help-assistant-question"
                  onClick={() =>
                    handleQuestionClick(item, index)
                  }
                >
                  {item.question}
                </button>
              ))
            ) : (
              <>
                <button
                  type="button"
                  className="help-assistant-back"
                  onClick={() => setSelectedQuestion(null)}
                >
                  ← Back
                </button>

                <h3 className="help-assistant-answer-title">
                  {HELP_ITEMS[selectedQuestion].question}
                </h3>

                <p className="help-assistant-answer">
                  {HELP_ITEMS[selectedQuestion].answer}
                </p>
              </>
            )}
          </div>
        </section>
      )}

      <style>{`
        .help-assistant-launcher {
          position: fixed;
          right: 24px;
          bottom: 24px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: none;
          background: #4f63d2;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          z-index: 1000;
          transition:
            background 0.15s ease,
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .help-assistant-launcher:hover {
          background: #3d50bf;
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
        }

        .help-assistant-launcher:focus-visible,
        .help-assistant-close:focus-visible,
        .help-assistant-question:focus-visible,
        .help-assistant-back:focus-visible {
          outline: 2px solid #4f63d2;
          outline-offset: 2px;
        }

        .help-assistant-panel {
          position: fixed;
          right: 24px;
          bottom: 88px;
          width: 340px;
          max-width: calc(100vw - 32px);
          max-height: 480px;
          overflow-y: auto;
          background: #ffffff;
          color: #1f2937;
          border-radius: 14px;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.18);
          border: 1px solid #e5e7eb;
          z-index: 1001;
        }

        .help-assistant-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .help-assistant-title {
          color: #1f2937;
          font-size: 14px;
        }

        .help-assistant-subtitle {
          font-size: 12px;
          color: #6b7280;
          margin-top: 3px;
        }

        .help-assistant-close {
          border: none;
          background: transparent;
          color: #4b5563;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .help-assistant-close:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .help-assistant-body {
          padding: 12px;
        }

        .help-assistant-question {
          width: 100%;
          text-align: left;
          padding: 12px;
          margin-bottom: 8px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #f9fafb;
          color: #374151;
          cursor: pointer;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px;
          line-height: 1.4;
          transition:
            background 0.15s ease,
            border-color 0.15s ease;
        }

        .help-assistant-question:last-child {
          margin-bottom: 0;
        }

        .help-assistant-question:hover {
          background: #f3f4f6;
          border-color: #cbd5e1;
        }

        .help-assistant-back {
          border: none;
          background: transparent;
          color: #4f63d2;
          cursor: pointer;
          padding: 4px 0 12px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
        }

        .help-assistant-back:hover {
          color: #3d50bf;
          text-decoration: underline;
        }

        .help-assistant-answer-title {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px;
        }

        .help-assistant-answer {
          font-size: 13px;
          line-height: 1.6;
          color: #4b5563;
          margin: 0;
        }

        html[data-theme="dark"] .help-assistant-panel {
          background: #1a2538;
          color: #e5e7eb;
          border-color: #3b4a61;
          box-shadow:
            0 18px 48px rgba(0, 0, 0, 0.5),
            0 4px 16px rgba(0, 0, 0, 0.25);
        }

        html[data-theme="dark"] .help-assistant-header {
          border-color: #3b4a61;
        }

        html[data-theme="dark"] .help-assistant-title {
          color: #f8fafc;
        }

        html[data-theme="dark"] .help-assistant-subtitle {
          color: #bdc8d6;
        }

        html[data-theme="dark"] .help-assistant-close {
          color: #cbd5e1;
        }

        html[data-theme="dark"] .help-assistant-close:hover {
          background: #25324a;
          color: #ffffff;
        }

        html[data-theme="dark"] .help-assistant-question {
          background: #141f31;
          color: #e5e7eb;
          border-color: #46566c;
        }

        html[data-theme="dark"] .help-assistant-question:hover {
          background: #202d43;
          border-color: #5b6b82;
        }

        html[data-theme="dark"] .help-assistant-back {
          color: #aebaff;
        }

        html[data-theme="dark"] .help-assistant-back:hover {
          color: #c1c9ff;
        }

        html[data-theme="dark"] .help-assistant-answer-title {
          color: #f8fafc;
        }

        html[data-theme="dark"] .help-assistant-answer {
          color: #d5dde8;
        }

        @media (max-width: 500px) {
          .help-assistant-launcher {
            right: 16px;
            bottom: 16px;
          }

          .help-assistant-panel {
            right: 16px;
            bottom: 80px;
            width: calc(100vw - 32px);
          }
        }
      `}</style>
    </>
  );
}
