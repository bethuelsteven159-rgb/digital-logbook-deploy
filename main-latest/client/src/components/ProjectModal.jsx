import { useEffect, useState } from "react";

const FIELD_TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
];

export default function ProjectModal({
  mode = "edit",
  entries = [],
  onClose,
  onSave,
}) {
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);

  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) || null;

  useEffect(() => {
    setSelectedEntryId(null);
    setEditingEntry(null);
  }, [entries]);

  function openEntry(entry) {
    setSelectedEntryId(entry.id);
    setEditingEntry({
      ...entry,
      fields: (entry.fields || []).map((field) => ({ ...field })),
    });
  }

  function updateFieldValue(fieldId, value) {
    setEditingEntry((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === fieldId ? { ...field, value } : field
      ),
    }));
  }

  function saveEntry() {
    if (!editingEntry) return;
    onSave?.({ type: "entry", entry: editingEntry });
    setSelectedEntryId(null);
    setEditingEntry(null);
  }

  return (
    <div
      className="project-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <div className="project-modal-header">
          <div>
            <p className="project-modal-eyebrow">Project entries</p>
            <h2 className="project-modal-title" id="project-modal-title">
              {editingEntry ? "Edit Entry" : "Edit Project"}
            </h2>
          </div>
          <button className="project-modal-close" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>

        {!editingEntry ? (
          <>
            <div className="project-modal-body">
              <p className="project-modal-help">
                Choose an entry below to edit its information. Project details such as the name, description, and dates are not changed here.
              </p>

              {entries.length > 0 ? (
                <div className="project-entry-list">
                  {entries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="project-entry-item"
                      onClick={() => openEntry(entry)}
                    >
                      <span className="project-entry-item-content">
                        <span className="project-entry-item-name">
                          {entry.name || entry.title || "Untitled entry"}
                        </span>
                        <span className="project-entry-item-meta">
                          {(entry.fields || []).length} field{(entry.fields || []).length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <IconChevronRight />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="project-entry-empty">
                  <div className="project-entry-empty-icon">
                    <IconEntry />
                  </div>
                  <p className="project-entry-empty-title">No entries yet</p>
                  <p className="project-entry-empty-body">
                    There are no entries to edit yet. Add an entry to this project first, then use Edit Project to choose and edit it.
                  </p>
                </div>
              )}
            </div>

            <div className="project-modal-footer">
              <button type="button" className="project-modal-cancel" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveEntry();
            }}
          >
            <div className="project-modal-body">
              <button
                type="button"
                className="project-modal-back"
                onClick={() => {
                  setSelectedEntryId(null);
                  setEditingEntry(null);
                }}
              >
                <IconChevronLeft />
                Back to entries
              </button>

              <div className="project-entry-edit-heading">
                <span className="project-entry-edit-label">Entry</span>
                <span className="project-entry-edit-name">
                  {editingEntry.name || editingEntry.title || "Untitled entry"}
                </span>
              </div>

              <div className="project-form-field">
                <label className="project-form-label" htmlFor="edit-entry-name">
                  Entry name
                </label>
                <input
                  id="edit-entry-name"
                  className="project-form-input"
                  value={editingEntry.name || editingEntry.title || ""}
                  onChange={(e) =>
                    setEditingEntry((current) => ({
                      ...current,
                      name: e.target.value,
                      title: undefined,
                    }))
                  }
                />
              </div>

              {(editingEntry.fields || []).map((field) => (
                <div className="project-form-field" key={field.id}>
                  <label className="project-form-label" htmlFor={`edit-entry-field-${field.id}`}>
                    {field.label || field.name || "Field"}
                  </label>
                  {renderFieldInput(field, (value) => updateFieldValue(field.id, value))}
                </div>
              ))}

              {(editingEntry.fields || []).length === 0 && (
                <p className="project-modal-help">
                  This entry does not have any editable fields.
                </p>
              )}
            </div>

            <div className="project-modal-footer">
              <button
                type="button"
                className="project-modal-cancel"
                onClick={() => {
                  setSelectedEntryId(null);
                  setEditingEntry(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="project-modal-save">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .project-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(3px);
          animation: projectModalFadeIn 0.15s ease-out;
        }
        .project-modal {
          width: min(100%, 560px);
          max-height: min(720px, 90vh);
          overflow: hidden;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 16px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2), 0 6px 18px rgba(15, 23, 42, 0.08);
          animation: projectModalSlideIn 0.18s ease-out;
        }
        .project-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 24px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .project-modal-eyebrow {
          margin: 0 0 5px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .project-modal-title {
          margin: 0;
          color: #1a2340;
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 24px;
          font-weight: 400;
          line-height: 1.2;
        }
        .project-modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          padding: 0;
          flex-shrink: 0;
          color: #64748b;
          background: #f8fafc;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .project-modal-close:hover { color: #1e293b; background: #e2e8f0; }
        .project-modal-body {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 22px 24px;
          max-height: 56vh;
          overflow-y: auto;
        }
        .project-modal-help {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }
        .project-entry-list { display: flex; flex-direction: column; gap: 8px; }
        .project-entry-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          width: 100%;
          padding: 14px 16px;
          text-align: left;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          color: #1e293b;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }
        .project-entry-item:hover {
          background: #ffffff;
          border-color: #cbd5e1;
          transform: translateY(-1px);
        }
        .project-entry-item-content { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .project-entry-item-name { font-size: 14px; font-weight: 600; color: #1e293b; }
        .project-entry-item-meta { font-size: 12px; color: #94a3b8; }
        .project-entry-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 28px 20px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
        }
        .project-entry-empty-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          border-radius: 11px;
          background: #e2e8f0;
          color: #64748b;
        }
        .project-entry-empty-title { margin: 0 0 5px; font-size: 14px; font-weight: 600; color: #1a2340; }
        .project-entry-empty-body { margin: 0; max-width: 360px; font-size: 12px; line-height: 1.55; color: #94a3b8; }
        .project-modal-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          padding: 0;
          border: none;
          background: transparent;
          color: #64748b;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }
        .project-modal-back:hover { color: #4f63d2; }
        .project-entry-edit-heading { display: flex; flex-direction: column; gap: 3px; padding-bottom: 2px; }
        .project-entry-edit-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; }
        .project-entry-edit-name { font-size: 17px; font-weight: 600; color: #1a2340; }
        .project-form-field { display: flex; flex-direction: column; gap: 7px; }
        .project-form-label { color: #374151; font-size: 13px; font-weight: 600; }
        .project-form-input {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          color: #1e293b;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          outline: none;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          line-height: 1.4;
        }
        .project-form-input:focus { border-color: #4f63d2; box-shadow: 0 0 0 3px rgba(79, 99, 210, 0.1); }
        .project-form-textarea { resize: vertical; min-height: 96px; }
        .project-modal-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
          background: #ffffff;
        }
        .project-modal-cancel,
        .project-modal-save {
          padding: 9px 18px;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .project-modal-cancel { color: #64748b; background: #ffffff; border: 1.5px solid #e2e8f0; }
        .project-modal-cancel:hover { background: #f8fafc; border-color: #cbd5e1; }
        .project-modal-save { color: #ffffff; background: #4f63d2; border: 1.5px solid #4f63d2; }
        .project-modal-save:hover { background: #3d50bf; border-color: #3d50bf; }
        @keyframes projectModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes projectModalSlideIn { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (max-width: 600px) {
          .project-modal-overlay { padding: 14px; }
          .project-modal-header { padding: 20px; }
          .project-modal-body { padding: 20px; }
          .project-modal-footer { padding: 14px 20px; }
        }
      `}</style>
    </div>
  );
}

function renderFieldInput(field, onChange) {
  const id = `edit-entry-field-${field.id}`;
  const value = field.value ?? "";

  if (field.type === "textarea") {
    return (
      <textarea
        id={id}
        className="project-form-input project-form-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
    );
  }

  return (
    <input
      id={id}
      className="project-form-input"
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconEntry() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}
