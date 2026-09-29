import { useEffect, useState } from "react";

export default function CreateProjectModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setError("");
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setError("End date cannot be before the start date.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await onSave?.({
        name: trimmedName,
        description: description.trim(),
        startDate,
        endDate,
      });
    } catch (saveError) {
      setError(
        saveError.message ||
          "Failed to create project.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-project-modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="create-project-modal-title">
            Create New Project
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close" type="button" disabled={saving}>
            <IconX />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-field">
              <label className="form-label form-label-required" htmlFor="create-project-name">
                Project name
              </label>
              <input
                id="create-project-name"
                className="form-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. Final Year Research Project"
                autoFocus
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="create-project-description">
                Description
              </label>
              <textarea
                id="create-project-description"
                className="form-input create-project-form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a short description of what this project is about…"
                rows={4}
              />
            </div>

            <div className="create-project-form-date-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="create-project-start-date">
                  Start date
                </label>
                <input
                  id="create-project-start-date"
                  className="form-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="create-project-end-date">
                  End date
                </label>
                <input
                  id="create-project-end-date"
                  className="form-input"
                  type="date"
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .create-project-form-textarea { resize: vertical; min-height: 96px; }
        .create-project-form-date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 600px) {
          .create-project-form-date-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
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
