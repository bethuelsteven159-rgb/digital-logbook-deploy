import { useState } from "react";

const FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

export default function EditProjectModal({ project, onClose }) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [fields, setFields] = useState(project?.fields ?? []);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  function addField() {
    const label = newFieldLabel.trim();

    if (!label) return;

    setFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label,
        type: newFieldType,
        usedByEntries: false,
      },
    ]);

    setNewFieldLabel("");
    setNewFieldType("text");
  }

  function removeField(id) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  const hasAnyLockedField = fields.some((f) => f.usedByEntries);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ep-modal-title"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="ep-modal-title">
            Edit Project
          </h2>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <IconXSmall />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label
              className="form-label form-label-required"
              htmlFor="ep-project-name"
            >
              Project name
            </label>

            <input
              id="ep-project-name"
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label
              className="form-label"
              htmlFor="ep-project-description"
            >
              Description
            </label>

            <textarea
              id="ep-project-description"
              className="form-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <p className="fields-section-label">Entry fields</p>

            {hasAnyLockedField && (
              <p className="locked-note">
                <IconLock />
                Fields already used by an entry can't be removed.
                Fields with no entries yet can be removed freely.
              </p>
            )}

            <div className="fields-list">
              {fields.map((field) =>
                field.usedByEntries ? (
                  <div
                    key={field.id}
                    className="field-row field-row--locked"
                  >
                    <IconLock className="field-row-lock" />

                    <span className="field-row-name">
                      {field.label}
                    </span>

                    <span className="field-row-type">
                      {
                        FIELD_TYPES.find(
                          (t) => t.value === field.type
                        )?.label
                      }
                    </span>

                    <span className="field-row-badge field-row-badge--locked">
                      In use
                    </span>
                  </div>
                ) : (
                  <div key={field.id} className="field-row">
                    <span className="field-row-drag">
                      <IconGrip />
                    </span>

                    <span className="field-row-name">
                      {field.label}
                    </span>

                    <span className="field-row-type">
                      {
                        FIELD_TYPES.find(
                          (t) => t.value === field.type
                        )?.label
                      }
                    </span>

                    <span className="field-row-badge field-row-badge--unused">
                      Not used yet
                    </span>

                    <button
                      className="field-row-remove"
                      onClick={() => removeField(field.id)}
                      aria-label={`Remove ${field.label}`}
                      type="button"
                    >
                      <IconXSmall />
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="add-field-row">
              <div className="form-field add-field-name">
                <label
                  className="form-label"
                  htmlFor="ep-field-label"
                >
                  Add a field
                </label>

                <input
                  id="ep-field-label"
                  className="form-input"
                  type="text"
                  placeholder="Add field name"
                  value={newFieldLabel}
                  onChange={(e) =>
                    setNewFieldLabel(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addField();
                    }
                  }}
                />
              </div>

              <div className="form-field add-field-type">
                <label
                  className="form-label"
                  htmlFor="ep-field-type"
                >
                  Type
                </label>

                <select
                  id="ep-field-type"
                  className="form-select"
                  value={newFieldType}
                  onChange={(e) =>
                    setNewFieldType(e.target.value)
                  }
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn-add-field"
                onClick={addField}
                type="button"
              >
                <IconPlus />
                Add field
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn-cancel"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>

          <button
            className="btn-save"
            onClick={onClose}
            type="button"
          >
            Save Changes
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 24px;
          backdrop-filter: blur(2px);
        }

        .modal {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.18),
            0 4px 16px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 22px 24px 18px;
          border-bottom: 1px solid #f1f5f9;
          flex-shrink: 0;
        }

        .modal-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 22px;
          font-weight: 400;
          color: #1a2340;
          margin: 0;
        }

        .modal-close {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition:
            background 0.15s ease,
            color 0.15s ease;
          padding: 0;
        }

        .modal-close:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .modal-body {
          overflow-y: auto;
          flex: 1;
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .form-label-required::after {
          content: ' *';
          color: #ef4444;
        }

        .form-input {
          padding: 9px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
          background: #fff;
          resize: vertical;
        }

        .form-input:focus {
          border-color: #4f63d2;
          box-shadow:
            0 0 0 3px rgba(79, 99, 210, 0.1);
        }

        .form-select {
          padding: 9px 12px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #1e293b;
          outline: none;
          background: #fff;
          cursor: pointer;
          width: 100%;
        }

        .fields-section-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #94a3b8;
          margin: 0;
        }

        .locked-note {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 12px;
          line-height: 1.5;
          color: #92601a;
          background: #fef6e7;
          border: 1px solid #fbe4b8;
          border-radius: 8px;
          padding: 8px 10px;
          margin: 0;
        }

        .fields-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
        }

        .field-row--locked {
          background: #f1f5f9;
        }

        .field-row-lock {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .field-row-drag {
          color: #cbd5e1;
          cursor: grab;
          flex-shrink: 0;
        }

        .field-row-name {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .field-row-type {
          font-size: 11px;
          font-weight: 500;
          color: #94a3b8;
          background: #e2e8f0;
          border-radius: 4px;
          padding: 2px 7px;
          flex-shrink: 0;
        }

        .field-row-badge {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-radius: 4px;
          padding: 3px 7px;
          flex-shrink: 0;
        }

        .field-row-badge--locked {
          color: #92601a;
          background: #fef0d1;
        }

        .field-row-badge--unused {
          color: #15803d;
          background: #dcfce7;
        }

        .field-row-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
          transition:
            color 0.15s ease,
            background 0.15s ease;
          flex-shrink: 0;
        }

        .field-row-remove:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.06);
        }

        .add-field-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .add-field-name {
          flex: 1;
        }

        .add-field-type {
          width: 140px;
          flex-shrink: 0;
        }

        .btn-add-field {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px;
          border: 1.5px dashed #cbd5e1;
          border-radius: 8px;
          background: transparent;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition:
            border-color 0.15s ease,
            color 0.15s ease,
            background 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .btn-add-field:hover {
          border-color: #4f63d2;
          color: #4f63d2;
          background: rgba(79, 99, 210, 0.04);
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
          flex-shrink: 0;
        }

        .btn-cancel {
          padding: 9px 18px;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .btn-cancel:hover {
          background: #f8fafc;
        }

        .btn-save {
          padding: 9px 20px;
          border: none;
          border-radius: 8px;
          background: #4f63d2;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          cursor: pointer;
          transition:
            background 0.15s ease,
            box-shadow 0.15s ease;
        }

        .btn-save:hover {
          background: #3d50bf;
          box-shadow:
            0 2px 10px rgba(79, 99, 210, 0.3);
        }

        @media (max-width: 600px) {
          .add-field-row {
            flex-wrap: wrap;
          }

          .add-field-type {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function IconXSmall() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconGrip() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <circle cx="9" cy="5" r="1.5" />
      <circle cx="15" cy="5" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="15" cy="19" r="1.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconLock({ className }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}