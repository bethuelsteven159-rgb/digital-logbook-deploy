import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

const HELP_ITEMS = [
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
];

export default function HelpAssistant() {
  const [open, setOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open help assistant"
        title="Need help?"
        style={{
          position: "fixed",
          right: "24px",
          bottom: "24px",
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          border: "none",
          background: "#4f63d2",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          zIndex: 1000,
        }}
      >
        <HelpCircle size={24} />
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: "24px",
            bottom: "88px",
            width: "340px",
            maxHeight: "480px",
            overflowY: "auto",
            background: "white",
            borderRadius: "14px",
            boxShadow: "0 14px 40px rgba(0,0,0,0.18)",
            border: "1px solid #e5e7eb",
            zIndex: 1001,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <div>
              <strong>Digital Logbook Help</strong>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginTop: "3px",
                }}
              >
                Quick guidance for common tasks
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSelectedQuestion(null);
              }}
              aria-label="Close help"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: "12px" }}>
            {selectedQuestion === null ? (
              HELP_ITEMS.map((item, index) => (
                <button
                  key={item.question}
                  type="button"
                  onClick={() => setSelectedQuestion(index)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px",
                    marginBottom: "8px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    background: "#f9fafb",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {item.question}
                </button>
              ))
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#4f63d2",
                    cursor: "pointer",
                    padding: "4px 0 12px",
                  }}
                >
                  ← Back
                </button>

                <h3
                  style={{
                    fontSize: "15px",
                    margin: "0 0 8px",
                  }}
                >
                  {HELP_ITEMS[selectedQuestion].question}
                </h3>

                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.6,
                    color: "#4b5563",
                    margin: 0,
                  }}
                >
                  {HELP_ITEMS[selectedQuestion].answer}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
