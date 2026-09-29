import { useEffect, useState } from "react";
import { Clock, RotateCcw, X } from "lucide-react";
import {
  fetchEntryRevisions,
  fetchEntryRevision,
  restoreEntryRevision,
} from "../../api/entryFeaturesApi";

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
  return String(field.value);
}

export default function EntryHistoryModal({
  projectId,
  entryId,
  entryName,
  onClose,
  onRestored,
}) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRevision, setSelectedRevision] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchEntryRevisions(projectId, entryId);
        if (!cancelled) setRevisions(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message || "Failed to load entry history.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId, entryId]);

  async function handleViewRevision(revisionId) {
    try {
      setDetailLoadingId(revisionId);
      setError("");
      const detail = await fetchEntryRevision(projectId, entryId, revisionId);
      setSelectedRevision({ id: revisionId, ...detail });
    } catch (requestError) {
      setError(requestError.message || "Failed to load that version.");
    } finally {
      setDetailLoadingId(null);
    }
  }

  async function handleRestore(revisionId) {
    const confirmed = window.confirm(
      "Restore this version? The entry's current values will be replaced. " +
        "The current state is saved to history first, so nothing is lost.",
    );

    if (!confirmed) return;

    try {
      setRestoringId(revisionId);
      setError("");
      await restoreEntryRevision(projectId, entryId, revisionId);
      onRestored?.();
      onClose();
    } catch (requestError) {
      setError(requestError.message || "Failed to restore that version.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal entry-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-history-title"
      >
        <div className="modal-header">
          <div>
            <p className="entry-details-eyebrow">Entry history</p>
            <h2 className="modal-title" id="entry-history-title">
              {entryName || "Logbook Entry"}
            </h2>
            <p className="edit-entry-subtitle">
              Previous versions of this entry.
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="modal-body entry-details-body">
          {error && <p className="entry-details-empty">{error}</p>}

          <section className="entry-details-section">
            <div className="entry-details-section-heading">
              <Clock size={15} />
              Previous versions
            </div>

            {loading ? (
              <p className="entry-details-empty">Loading history...</p>
            ) : revisions.length === 0 ? (
              <p className="entry-details-empty">No previous versions yet.</p>
            ) : (
              <div className="entry-details-fields">
                {revisions.map((revision) => (
                  <div className="entry-details-field" key={revision.id}>
                    <span>
                      {formatDateTime(revision.createdAt)} — {revision.name} (
                      {formatLoggedTime(revision.durationMinutes)})
                    </span>
                    <span style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleViewRevision(revision.id)}
                        disabled={detailLoadingId === revision.id}
                      >
                        {detailLoadingId === revision.id ? "Loading..." : "View"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleRestore(revision.id)}
                        disabled={restoringId === revision.id}
                      >
                        <RotateCcw size={14} />
                        {restoringId === revision.id ? "Restoring..." : "Restore"}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {selectedRevision && (
            <section className="entry-details-section">
              <div className="entry-details-section-heading">
                Version from {formatDateTime(selectedRevision.createdAt)}
              </div>
              <div className="entry-details-fields">
                <div className="entry-details-field">
                  <span>Name</span>
                  <strong>{selectedRevision.name}</strong>
                </div>
                <div className="entry-details-field">
                  <span>Duration</span>
                  <strong>
                    {formatLoggedTime(selectedRevision.durationMinutes)}
                  </strong>
                </div>
                {(selectedRevision.values || []).map((field, index) => (
                  <div
                    className="entry-details-field"
                    key={field.fieldId || index}
                  >
                    <span>{field.name || "Field"}</span>
                    <strong>{formatFieldValue(field)}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
