import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { CheckSquare, Plus, X } from "lucide-react";

import {
  createRecurringEntry,
  deleteRecurringEntry,
  fetchRecurringEntries,
  updateRecurringEntry,
} from "../../api/recurringEntriesApi";

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const INTERVAL_UNITS = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

function todayIsoDate() {
  const now = new Date();
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(now.getDate()).padStart(
    2,
    "0",
  );

  return `${now.getFullYear()}-${month}-${day}`;
}

function formatSchedule(definition) {
  const interval = definition.intervalCount || 1;
  const unit =
    INTERVAL_UNITS[definition.frequency] || "day";

  const every =
    interval === 1
      ? `Every ${unit}`
      : `Every ${interval} ${unit}s`;

  if (definition.endsOn) {
    return `${every} until ${definition.endsOn}`;
  }

  return every;
}

export default function RecurringEntriesModal({
  projectId,
  onClose,
  onChanged,
}) {
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [durationMinutes, setDurationMinutes] =
    useState("");
  const [frequency, setFrequency] = useState("daily");
  const [intervalCount, setIntervalCount] =
    useState("1");
  const [startsOn, setStartsOn] = useState(
    todayIsoDate,
  );
  const [endsOn, setEndsOn] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [checklistText, setChecklistText] =
    useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadDefinitions = useCallback(async () => {
    try {
      setLoading(true);
      setListError("");

      const data = await fetchRecurringEntries(
        projectId,
      );

      setDefinitions(
        Array.isArray(data) ? data : [],
      );
    } catch (loadError) {
      setListError(
        loadError.message ||
          "Failed to load recurring entries.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setDurationMinutes("");
    setFrequency("daily");
    setIntervalCount("1");
    setStartsOn(todayIsoDate());
    setEndsOn("");
    setTags([]);
    setTagInput("");
    setChecklist([]);
    setChecklistText("");
    setError("");
  }

  function startEdit(definition) {
    setEditingId(definition.id);
    setName(definition.name || "");
    setDurationMinutes(
      definition.durationMinutes
        ? String(definition.durationMinutes)
        : "",
    );
    setFrequency(definition.frequency || "daily");
    setIntervalCount(
      String(definition.intervalCount || 1),
    );
    setStartsOn(definition.startsOn || todayIsoDate());
    setEndsOn(definition.endsOn || "");
    setTags(
      Array.isArray(definition.tags)
        ? definition.tags
        : [],
    );
    setChecklist(
      Array.isArray(definition.checklist)
        ? definition.checklist
        : [],
    );
    setTagInput("");
    setChecklistText("");
    setError("");
  }

  function addTag() {
    const clean = tagInput.trim().toLowerCase();

    if (!clean) {
      return;
    }

    if (tags.includes(clean)) {
      setTagInput("");
      return;
    }

    if (tags.length >= 10) {
      setError("You can add up to 10 tags.");
      return;
    }

    setTags((current) => [...current, clean]);
    setTagInput("");
    setError("");
  }

  function removeTag(tag) {
    setTags((current) =>
      current.filter((item) => item !== tag),
    );
  }

  function addChecklistItem() {
    const text = checklistText.trim();

    if (!text) {
      return;
    }

    if (checklist.length >= 100) {
      setError(
        "A checklist can contain at most 100 items.",
      );
      return;
    }

    if (text.length > 300) {
      setError(
        "Checklist items cannot exceed 300 characters.",
      );
      return;
    }

    setChecklist((current) => [...current, { text }]);
    setChecklistText("");
    setError("");
  }

  function removeChecklistItem(index) {
    setChecklist((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Recurring entry name is required.");
      return;
    }

    const duration =
      durationMinutes === "" ? 0 : Number(durationMinutes);

    if (
      !Number.isInteger(duration) ||
      duration < 0 ||
      duration > 10080
    ) {
      setError(
        "Time spent must be a whole number of minutes between 0 and 10080.",
      );
      return;
    }

    const interval = Number(intervalCount);

    if (
      !Number.isInteger(interval) ||
      interval < 1 ||
      interval > 365
    ) {
      setError(
        "Repeat interval must be a whole number between 1 and 365.",
      );
      return;
    }

    if (!startsOn) {
      setError("Start date is required.");
      return;
    }

    if (endsOn && endsOn < startsOn) {
      setError(
        "End date cannot be earlier than the start date.",
      );
      return;
    }

    const payload = {
      name: cleanName,
      durationMinutes: duration,
      frequency,
      intervalCount: interval,
      startsOn,
      endsOn: endsOn || null,
      tags,
      checklist,
    };

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        await updateRecurringEntry(
          editingId,
          payload,
        );
      } else {
        await createRecurringEntry(
          projectId,
          payload,
        );
      }

      resetForm();
      await loadDefinitions();
      onChanged?.();
    } catch (submitError) {
      setError(
        submitError.message ||
          "Failed to save recurring entry.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(definition) {
    try {
      setBusyId(definition.id);
      setListError("");

      await updateRecurringEntry(definition.id, {
        enabled: !definition.enabled,
      });

      await loadDefinitions();
      onChanged?.();
    } catch (toggleError) {
      setListError(
        toggleError.message ||
          "Failed to update recurring entry.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(definition) {
    const confirmed = window.confirm(
      `Delete the recurring entry "${definition.name}"? Entries it already generated will be kept.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setBusyId(definition.id);
      setListError("");

      await deleteRecurringEntry(definition.id);

      if (editingId === definition.id) {
        resetForm();
      }

      await loadDefinitions();
      onChanged?.();
    } catch (deleteError) {
      setListError(
        deleteError.message ||
          "Failed to delete recurring entry.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <div
        className="modal recurring-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2
              className="modal-title"
              id="recurring-modal-title"
            >
              Recurring Entries
            </h2>

            <p className="entry-intro">
              Set up entries that repeat on a schedule. Due
              occurrences are generated automatically when
              this project is opened.
            </p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            <X size={14} />
          </button>
        </div>

        <form
          className="modal-form"
          onSubmit={handleSubmit}
        >
          <div className="modal-body">
            {listError && (
              <p className="form-error">{listError}</p>
            )}

            <div className="fields-block">
              <p className="fields-section-label">
                Scheduled recurring entries
              </p>

              {loading ? (
                <p className="form-help">
                  Loading recurring entries…
                </p>
              ) : definitions.length === 0 ? (
                <p className="form-help">
                  No recurring entries yet. Create one
                  below to have entries appear on a fixed
                  schedule.
                </p>
              ) : (
                <div className="recurring-list">
                  {definitions.map((definition) => (
                    <div
                      className="recurring-row"
                      key={definition.id}
                    >
                      <div className="recurring-row-text">
                        <span className="recurring-row-name">
                          {definition.name}
                        </span>

                        <span className="recurring-row-meta">
                          {formatSchedule(definition)}
                          {definition.durationMinutes
                            ? ` · ${definition.durationMinutes} min`
                            : ""}
                        </span>
                      </div>

                      <span
                        className={`recurring-badge${
                          definition.enabled
                            ? " recurring-badge-active"
                            : ""
                        }`}
                      >
                        {definition.enabled
                          ? "Active"
                          : "Paused"}
                      </span>

                      <div className="recurring-row-actions">
                        <button
                          type="button"
                          className="btn-secondary recurring-action"
                          onClick={() =>
                            startEdit(definition)
                          }
                          disabled={
                            saving ||
                            busyId === definition.id
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn-secondary recurring-action"
                          onClick={() =>
                            toggleEnabled(definition)
                          }
                          disabled={
                            saving ||
                            busyId === definition.id
                          }
                        >
                          {definition.enabled
                            ? "Pause"
                            : "Resume"}
                        </button>

                        <button
                          type="button"
                          className="btn-secondary recurring-action recurring-action-danger"
                          onClick={() =>
                            handleDelete(definition)
                          }
                          disabled={
                            saving ||
                            busyId === definition.id
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="fields-block">
              <div className="recurring-form-header">
                <p className="fields-section-label">
                  {editingId
                    ? "Edit recurring entry"
                    : "New recurring entry"}
                </p>

                {editingId && (
                  <button
                    type="button"
                    className="recurring-cancel-edit"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              <p className="form-help">
                Each occurrence copies the name, time spent,
                tags, and checklist below. Extra fields and
                references are not copied in this version.
              </p>

              <div className="form-field">
                <label
                  className="form-label form-label-required"
                  htmlFor="recurring-name"
                >
                  Entry name
                </label>

                <input
                  id="recurring-name"
                  className="form-input"
                  type="text"
                  maxLength={150}
                  placeholder="e.g. Weekly review"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                />
              </div>

              <div className="recurring-grid">
                <div className="form-field">
                  <label
                    className="form-label"
                    htmlFor="recurring-frequency"
                  >
                    Repeats
                  </label>

                  <select
                    id="recurring-frequency"
                    className="form-select"
                    value={frequency}
                    onChange={(event) =>
                      setFrequency(event.target.value)
                    }
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label
                    className="form-label"
                    htmlFor="recurring-interval"
                  >
                    Every
                  </label>

                  <input
                    id="recurring-interval"
                    className="form-input"
                    type="number"
                    min="1"
                    max="365"
                    step="1"
                    value={intervalCount}
                    onChange={(event) =>
                      setIntervalCount(event.target.value)
                    }
                  />
                </div>

                <div className="form-field">
                  <label
                    className="form-label form-label-required"
                    htmlFor="recurring-starts-on"
                  >
                    Starts on
                  </label>

                  <input
                    id="recurring-starts-on"
                    className="form-input"
                    type="date"
                    value={startsOn}
                    onChange={(event) =>
                      setStartsOn(event.target.value)
                    }
                  />
                </div>

                <div className="form-field">
                  <label
                    className="form-label"
                    htmlFor="recurring-ends-on"
                  >
                    Ends on (optional)
                  </label>

                  <input
                    id="recurring-ends-on"
                    className="form-input"
                    type="date"
                    value={endsOn}
                    onChange={(event) =>
                      setEndsOn(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="form-field">
                <label
                  className="form-label"
                  htmlFor="recurring-duration"
                >
                  Time spent per occurrence (minutes)
                </label>

                <input
                  id="recurring-duration"
                  className="form-input"
                  type="number"
                  min="0"
                  max="10080"
                  step="1"
                  placeholder="e.g. 30"
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(event.target.value)
                  }
                />
              </div>

              <div className="form-field">
                <label
                  className="form-label"
                  htmlFor="recurring-tags"
                >
                  Tags
                </label>

                <div className="recurring-tag-input-row">
                  <input
                    id="recurring-tags"
                    className="form-input"
                    type="text"
                    maxLength={30}
                    placeholder="e.g. revision, weekly…"
                    value={tagInput}
                    onChange={(event) =>
                      setTagInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === ","
                      ) {
                        event.preventDefault();
                        addTag();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="btn-add-field"
                    onClick={addTag}
                    aria-label="Add tag"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="recurring-tag-list">
                    {tags.map((tag) => (
                      <span
                        className="recurring-tag-chip"
                        key={tag}
                      >
                        {tag}

                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          aria-label={`Remove ${tag}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-field">
                <label
                  className="form-label"
                  htmlFor="recurring-checklist"
                >
                  Checklist
                </label>

                {checklist.length > 0 && (
                  <div className="person4-list">
                    {checklist.map((item, index) => (
                      <div
                        className="person4-list-row"
                        key={`${item.text}-${index}`}
                      >
                        <CheckSquare size={15} />

                        <span>{item.text}</span>

                        <button
                          type="button"
                          className="field-row-remove"
                          onClick={() =>
                            removeChecklistItem(index)
                          }
                          aria-label={`Remove checklist item ${item.text}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="person4-add-row">
                  <input
                    id="recurring-checklist"
                    className="form-input"
                    type="text"
                    maxLength={300}
                    placeholder="e.g. Review notes"
                    value={checklistText}
                    onChange={(event) =>
                      setChecklistText(
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addChecklistItem();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="btn-add-field"
                    onClick={addChecklistItem}
                  >
                    <Plus size={14} />
                    Add item
                  </button>
                </div>
              </div>

              {error && (
                <p className="form-error">{error}</p>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Close
            </button>

            <button
              type="submit"
              className="btn-save"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create recurring entry"}
            </button>
          </div>
        </form>

        <style>{`
          .recurring-modal {
            max-width: 640px;
          }

          .entry-intro {
            margin: 5px 0 0;
            max-width: 520px;
            font-size: 12px;
            line-height: 1.5;
            color: #64748b;
          }

          .form-help {
            margin: 6px 0 10px;
            font-size: 12px;
            line-height: 1.5;
            color: #64748b;
          }

          .recurring-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .recurring-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border: 1.5px solid #e2e8f0;
            border-radius: 10px;
            background: #f8fafc;
            flex-wrap: wrap;
          }

          .recurring-row-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
            flex: 1;
          }

          .recurring-row-name {
            font-size: 13px;
            font-weight: 600;
            color: #1e293b;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .recurring-row-meta {
            font-size: 12px;
            color: #64748b;
          }

          .recurring-badge {
            font-size: 11px;
            font-weight: 600;
            border-radius: 999px;
            padding: 3px 9px;
            background: #e2e8f0;
            color: #64748b;
            flex-shrink: 0;
          }

          .recurring-badge-active {
            background: #e7f6ec;
            color: #1c7c46;
          }

          .recurring-row-actions {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
          }

          .recurring-action {
            padding: 5px 10px;
            font-size: 12px;
            border-radius: 7px;
          }

          .recurring-action-danger {
            color: #b91c1c;
          }

          .recurring-form-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }

          .recurring-cancel-edit {
            border: none;
            background: none;
            color: #4f63d2;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            padding: 0;
          }

          .recurring-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .recurring-tag-input-row {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .recurring-tag-input-row .form-input {
            flex: 1;
          }

          .recurring-tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
          }

          .recurring-tag-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 3px 8px;
            border-radius: 999px;
            background: #eef2ff;
            color: #3b4ba8;
            font-size: 12px;
            font-weight: 500;
          }

          .recurring-tag-chip button {
            border: none;
            background: none;
            color: inherit;
            cursor: pointer;
            display: flex;
            padding: 0;
          }
        `}</style>
      </div>
    </div>
  );
}
