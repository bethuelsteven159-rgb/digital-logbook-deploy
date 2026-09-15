import { Calendar, CheckSquare, Clock, Edit3, Link2, Trash2, X } from "lucide-react";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLoggedTime(minutes = 0) {
  const safeMinutes = Number(minutes) || 0;
  if (safeMinutes === 0) return "0 hrs";
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hrs`;
  return `${hours}h ${remainingMinutes}m`;
}

function formatFieldValue(field) {
  if (field?.value === null || field?.value === undefined || field?.value === "") {
    return "—";
  }
  if (field.fieldType === "date" && field.value) {
    return formatDate(field.value);
  }
  return String(field.value);
}

export default function EntryDetailsModal({
  entry,
  archived = false,
  onClose,
  onEdit,
  onDelete,
  deleteSaving = false,
  onProjectReferenceClick,
  onChecklistToggle,
  checklistSaving = {},
}) {
  if (!entry) return null;

  const values = Array.isArray(entry.values) ? entry.values : [];
  const checklist = Array.isArray(entry.checklist) ? entry.checklist : [];
  const projectReferences = Array.isArray(entry.references) ? entry.references : [];
  const entryReferences = Array.isArray(entry.entryReferences) ? entry.entryReferences : [];
  const linkedEntries = Array.isArray(entry.linkedEntries) ? entry.linkedEntries : [];

  function handleDeleteClick() {
    const confirmed = window.confirm(
      `Delete "${entry.name || "Logbook Entry"}"? This action cannot be undone.`,
    );

    if (confirmed) {
      onDelete?.(entry);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !deleteSaving) onClose();
      }}
    >
      <div className="modal entry-details-modal" role="dialog" aria-modal="true" aria-labelledby="entry-details-title">
        <div className="modal-header">
          <div>
            <p className="entry-details-eyebrow">Logbook entry</p>
            <h2 className="modal-title" id="entry-details-title">
              {entry.name || "Logbook Entry"}
            </h2>
            <p className="edit-entry-subtitle">
              Full entry contents and references.
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close" disabled={deleteSaving}>
            <X size={14} />
          </button>
        </div>

        <div className="modal-body entry-details-body">
          <div className="entry-details-meta-grid">
            <div className="entry-details-meta-card">
              <Clock size={15} />
              <span>
                <strong>Duration</strong>
                {formatLoggedTime(entry.durationMinutes)}
              </span>
            </div>
            <div className="entry-details-meta-card">
              <Calendar size={15} />
              <span>
                <strong>Entry date</strong>
                {formatDateTime(entry.occurredAt || entry.createdAt)}
              </span>
            </div>
            <div className="entry-details-meta-card">
              <Calendar size={15} />
              <span>
                <strong>Due date</strong>
                {formatDateTime(entry.dueAt)}
              </span>
            </div>
          </div>

          <section className="entry-details-section">
            <div className="entry-details-section-heading">Project fields</div>
            {values.length === 0 ? (
              <p className="entry-details-empty">No field values were recorded.</p>
            ) : (
              <div className="entry-details-fields">
                {values.map((field, index) => (
                  <div className="entry-details-field" key={field.fieldId || field.id || index}>
                    <span>{field.name || "Field"}</span>
                    <strong>{formatFieldValue(field)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="entry-details-section">
            <div className="entry-details-section-heading">
              <CheckSquare size={15} />
              Checklist
            </div>
            {checklist.length === 0 ? (
              <p className="entry-details-empty">No checklist items.</p>
            ) : (
              <div className="entry-details-checklist">
                {checklist.map((item) => {
                  const saving = Boolean(checklistSaving[`${entry.id}:${item.id}`]);

                  return (
                    <label
                      className={`entry-details-checklist-item ${item.completed ? "is-complete" : ""}`}
                      key={item.id}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(item.completed)}
                        disabled={saving || archived || deleteSaving}
                        onChange={(event) =>
                          onChecklistToggle?.(entry.id, item.id, event.target.checked)
                        }
                        aria-label={`${item.completed ? "Uncheck" : "Check"} ${item.text}`}
                      />
                      <span>{item.text}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <section className="entry-details-section">
            <div className="entry-details-section-heading">
              <Link2 size={15} />
              References
            </div>

            <div className="entry-details-reference-group">
              <span className="entry-details-reference-label">Projects</span>
              {projectReferences.length === 0 ? (
                <span className="entry-details-empty">None</span>
              ) : (
                <div className="entry-details-reference-list">
                  {projectReferences.map((reference) => (
                    <button
                      type="button"
                      className="entry-reference-link"
                      key={reference.id}
                      onClick={() => onProjectReferenceClick?.(reference.projectId)}
                      disabled={deleteSaving}
                    >
                      {reference.projectName || "Untitled Project"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="entry-details-reference-group">
              <span className="entry-details-reference-label">Entries</span>
              {entryReferences.length === 0 ? (
                <span className="entry-details-empty">None</span>
              ) : (
                <div className="entry-details-reference-list">
                  {entryReferences.map((reference) => (
                    <span className="entry-link-chip" key={reference.id}>
                      {reference.referencedEntryName || reference.entryName || "Logbook Entry"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {linkedEntries.length > 0 && (
              <div className="entry-details-reference-group">
                <span className="entry-details-reference-label">Linked entries</span>
                <div className="entry-details-reference-list">
                  {linkedEntries.map((linked) => (
                    <span className="entry-link-chip" key={linked.id}>
                      {linked.name || "Logbook Entry"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <div>
            {!archived && (
              <button
                type="button"
                className="btn"
                onClick={handleDeleteClick}
                disabled={deleteSaving}
                style={{
                  background: "#b91c1c",
                  color: "#ffffff",
                  border: "1px solid #b91c1c",
                }}
              >
                <Trash2 size={15} />
                {deleteSaving ? "Deleting..." : "Delete entry"}
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={deleteSaving}>
              Close
            </button>
            {!archived && (
              <button type="button" className="btn btn-primary" onClick={onEdit} disabled={deleteSaving}>
                <Edit3 size={15} />
                Edit entry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
