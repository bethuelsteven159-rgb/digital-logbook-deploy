import { useEffect, useState } from "react";

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
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="project-modal-title">
            {editingEntry ? "Edit Entry" : "Edit Project"}
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close" type="button">
            <IconX />
          </button>
        </div>

        {!editingEntry ? (
          <>
            <div className="modal-body">
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

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form
            className="modal-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveEntry();
            }}
          >
            <div className="modal-body">
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

              <div className="form-field">
                <label className="form-label" htmlFor="edit-entry-name">
                  Entry name
                </label>
                <input
                  id="edit-entry-name"
                  className="form-input"
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
                <div className="form-field" key={field.id}>
                  <label className="form-label" htmlFor={`edit-entry-field-${field.id}`}>
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

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedEntryId(null);
                  setEditingEntry(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .project-modal-help { margin: 0; color: var(--text-muted, #64748b); font-size: 13px; line-height: 1.6; }
        .project-entry-list { display: flex; flex-direction: column; gap: 8px; }
        .project-entry-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          width: 100%;
          padding: 14px 16px;
          text-align: left;
          font: inherit;
          background: var(--surface-subtle, #f8fafc);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-md, 8px);
          color: var(--text, #1e293b);
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }
        .project-entry-item:hover {
          background: var(--surface, #ffffff);
          border-color: var(--border-strong, #cbd5e1);
          transform: translateY(-1px);
        }
        .project-entry-item:focus-visible { outline: 2px solid var(--ring, #4f63d2); outline-offset: 2px; }
        .project-entry-item-content { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .project-entry-item-name { font-size: 14px; font-weight: 600; color: var(--text, #1e293b); }
        .project-entry-item-meta { font-size: 12px; color: var(--text-faint, #94a3b8); }
        .project-entry-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 28px 20px;
          background: var(--surface-subtle, #f8fafc);
          border: 1px dashed var(--border-strong, #cbd5e1);
          border-radius: var(--radius-md, 8px);
        }
        .project-entry-empty-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          border-radius: var(--radius-md, 8px);
          background: var(--surface-hover, #e2e8f0);
          color: var(--text-muted, #64748b);
        }
        .project-entry-empty-title { margin: 0 0 5px; font-size: 14px; font-weight: 600; color: var(--text-strong, #1a2340); }
        .project-entry-empty-body { margin: 0; max-width: 360px; font-size: 12px; line-height: 1.55; color: var(--text-faint, #94a3b8); }
        .project-modal-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          width: fit-content;
          padding: 0;
          border: none;
          background: transparent;
          font: inherit;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted, #64748b);
          cursor: pointer;
        }
        .project-modal-back:hover { color: var(--accent-text, #4338ca); }
        .project-modal-back:focus-visible { outline: 2px solid var(--ring, #4f63d2); outline-offset: 2px; }
        .project-entry-edit-heading { display: flex; flex-direction: column; gap: 3px; padding-bottom: 2px; }
        .project-entry-edit-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-faint, #94a3b8); }
        .project-entry-edit-name { font-size: 17px; font-weight: 600; color: var(--text-strong, #1a2340); }
        .project-form-textarea { resize: vertical; min-height: 96px; }
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
        className="form-input project-form-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
      />
    );
  }

  return (
    <input
      id={id}
      className="form-input"
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
