import { useEffect, useState } from "react";

export default function CreateProjectModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
  }, []);

  function handleSubmit(e) {
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

    onSave?.({
      name: trimmedName,
      description: description.trim(),
      startDate,
      endDate,
    });
  }

  return (
    <div
      className="create-project-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="create-project-modal" role="dialog" aria-modal="true" aria-labelledby="create-project-modal-title">
        <div className="create-project-modal-header">
          <div>
            <p className="create-project-modal-eyebrow">New project</p>
            <h2 className="create-project-modal-title" id="create-project-modal-title">
              Create New Project
            </h2>
          </div>
          <button className="create-project-modal-close" onClick={onClose} aria-label="Close" type="button">
            <IconX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="create-project-modal-body">
            <div className="create-project-form-field">
              <label className="create-project-form-label create-project-form-required" htmlFor="create-project-name">
                Project name
              </label>
              <input
                id="create-project-name"
                className="create-project-form-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. Final Year Research Project"
                autoFocus
              />
            </div>

            <div className="create-project-form-field">
              <label className="create-project-form-label" htmlFor="create-project-description">
                Description
              </label>
              <textarea
                id="create-project-description"
                className="create-project-form-input create-project-form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a short description of what this project is about…"
                rows={4}
              />
            </div>

            <div className="create-project-form-date-grid">
              <div className="create-project-form-field">
                <label className="create-project-form-label" htmlFor="create-project-start-date">
                  Start date
                </label>
                <input
                  id="create-project-start-date"
                  className="create-project-form-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="create-project-form-field">
                <label className="create-project-form-label" htmlFor="create-project-end-date">
                  End date
                </label>
                <input
                  id="create-project-end-date"
                  className="create-project-form-input"
                  type="date"
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="create-project-form-error" role="alert">{error}</p>}
          </div>

          <div className="create-project-modal-footer">
            <button type="button" className="create-project-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="create-project-modal-save">
              Create Project
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .create-project-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(3px);
          animation: createProjectModalFadeIn 0.15s ease-out;
        }
        .create-project-modal {
          width: min(100%, 560px);
          max-height: min(720px, 90vh);
          overflow: hidden;
          background: #fff;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 16px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.2), 0 6px 18px rgba(15, 23, 42, 0.08);
          animation: createProjectModalSlideIn 0.18s ease-out;
        }
        .create-project-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 24px 24px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .create-project-modal-eyebrow {
          margin: 0 0 5px;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .create-project-modal-title {
          margin: 0;
          color: #1a2340;
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 24px;
          font-weight: 400;
          line-height: 1.2;
        }
        .create-project-modal-close {
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
        .create-project-modal-close:hover { color: #1e293b; background: #e2e8f0; }
        .create-project-modal-body {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 22px 24px;
          max-height: 56vh;
          overflow-y: auto;
        }
        .create-project-form-field { display: flex; flex-direction: column; gap: 7px; }
        .create-project-form-label { color: #374151; font-size: 13px; font-weight: 600; }
        .create-project-form-required::after { content: " *"; color: #ef4444; }
        .create-project-form-input {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 12px;
          color: #1e293b;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          outline: none;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          line-height: 1.4;
        }
        .create-project-form-input:focus {
          border-color: #4f63d2;
          box-shadow: 0 0 0 3px rgba(79, 99, 210, 0.1);
        }
        .create-project-form-input::placeholder { color: #94a3b8; }
        .create-project-form-textarea { resize: vertical; min-height: 96px; }
        .create-project-form-date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .create-project-form-error { margin: -4px 0 0; color: #dc2626; font-size: 12px; line-height: 1.4; }
        .create-project-modal-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
          padding: 16px 24px;
          border-top: 1px solid #f1f5f9;
        }
        .create-project-modal-cancel,
        .create-project-modal-save {
          padding: 9px 18px;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .create-project-modal-cancel { color: #64748b; background: #fff; border: 1.5px solid #e2e8f0; }
        .create-project-modal-cancel:hover { background: #f8fafc; border-color: #cbd5e1; }
        .create-project-modal-save { color: #fff; background: #4f63d2; border: 1.5px solid #4f63d2; }
        .create-project-modal-save:hover { background: #3d50bf; border-color: #3d50bf; box-shadow: 0 2px 10px rgba(79, 99, 210, 0.25); }
        .create-project-modal-cancel:focus-visible,
        .create-project-modal-save:focus-visible,
        .create-project-modal-close:focus-visible { outline: 2px solid #4f63d2; outline-offset: 2px; }
        @keyframes createProjectModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes createProjectModalSlideIn { from { opacity: 0; transform: translateY(8px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (max-width: 600px) {
          .create-project-modal-overlay { padding: 14px; }
          .create-project-modal-header { padding: 20px; }
          .create-project-modal-body { padding: 20px; }
          .create-project-modal-footer { padding: 14px 20px; }
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
