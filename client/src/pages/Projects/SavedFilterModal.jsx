import { useState } from "react";
import { X } from "lucide-react";

const OPERATORS = {
  equals: "Equals",
  not_equals: "Does not equal",
  contains: "Contains",
  greater_than: "Greater than",
  less_than: "Less than",
};

const TEXT_OPERATORS = ["contains", "equals", "not_equals"];
const NUMBER_OPERATORS = ["greater_than", "less_than", "equals", "not_equals"];

// Entry properties the server can filter on directly (matched by fieldName).
const BUILT_IN_FIELDS = [
  { key: "name", label: "Entry name", kind: "text" },
  { key: "durationMinutes", label: "Duration (minutes)", kind: "number" },
  { key: "tags", label: "Tags", kind: "text" },
];

function buildTargets(fields) {
  const custom = (Array.isArray(fields) ? fields : [])
    .filter((field) => (field.fieldType || field.type) !== "computed")
    .filter((field) => !field.archivedAt)
    .map((field) => ({
      key: `custom:${field.id}`,
      label: field.name,
      kind: (field.fieldType || field.type) === "number" ? "number" : "text",
    }));

  return [...BUILT_IN_FIELDS, ...custom];
}

function operatorsFor(kind) {
  return kind === "number" ? NUMBER_OPERATORS : TEXT_OPERATORS;
}

function blankCondition(targets) {
  const target = targets[0];
  return {
    target: target.key,
    operator: operatorsFor(target.kind)[0],
    value: "",
  };
}

/** Turn a saved criterion from the server back into a form row. */
function conditionFromCriterion(criterion, targets) {
  const key = criterion.fieldId ? `custom:${criterion.fieldId}` : criterion.fieldName;
  const target = targets.find((candidate) => candidate.key === key);

  return {
    target: target ? target.key : key,
    operator: criterion.operator,
    value: criterion.value === null || criterion.value === undefined ? "" : String(criterion.value),
  };
}

/** Turn a form row into the criterion shape the server validates. */
export function criterionFromCondition(condition) {
  const isCustom = condition.target.startsWith("custom:");
  const numeric = condition.operator === "greater_than" || condition.operator === "less_than";

  return {
    ...(isCustom
      ? { fieldId: condition.target.slice("custom:".length) }
      : { fieldName: condition.target }),
    operator: condition.operator,
    value: numeric ? Number(condition.value) : String(condition.value).trim(),
  };
}

export default function SavedFilterModal({ fields, filter, onSave, onClose }) {
  const targets = buildTargets(fields);

  const [name, setName] = useState(filter?.name || "");
  const [conditions, setConditions] = useState(() =>
    filter?.criteria?.length
      ? filter.criteria.map((criterion) => conditionFromCriterion(criterion, targets))
      : [blankCondition(targets)],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateCondition(index, updates) {
    setConditions((current) =>
      current.map((condition, i) => (i === index ? { ...condition, ...updates } : condition)),
    );
  }

  function changeTarget(index, targetKey) {
    const target = targets.find((candidate) => candidate.key === targetKey);
    const allowed = operatorsFor(target.kind);

    setConditions((current) =>
      current.map((condition, i) =>
        i === index
          ? {
              ...condition,
              target: targetKey,
              operator: allowed.includes(condition.operator) ? condition.operator : allowed[0],
            }
          : condition,
      ),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Give the filter a name.");
      return;
    }

    for (const condition of conditions) {
      const value = String(condition.value).trim();

      if (!value) {
        setError("Every condition needs a value.");
        return;
      }

      const numeric = condition.operator === "greater_than" || condition.operator === "less_than";

      if (numeric && Number.isNaN(Number(value))) {
        setError(`"${value}" is not a number.`);
        return;
      }
    }

    setSaving(true);

    try {
      await onSave({
        name: name.trim(),
        criteria: conditions.map(criterionFromCondition),
      });
    } catch (saveError) {
      setError(saveError.message || "Could not save the filter.");
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="modal saved-filter-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-filter-title"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="saved-filter-title">
              {filter ? "Edit filter" : "New filter"}
            </h2>
            <p className="entry-intro">
              Entries must match every condition. The filter is saved for this project.
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

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label" htmlFor="saved-filter-name">
                Filter name
              </label>
              <input
                id="saved-filter-name"
                className="form-input"
                value={name}
                maxLength={100}
                placeholder="e.g. Long sessions"
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="fields-block">
              <p className="fields-section-label">Conditions</p>

              {conditions.map((condition, index) => {
                const target = targets.find((candidate) => candidate.key === condition.target);
                const allowed = operatorsFor(target?.kind);

                return (
                  <div className="saved-filter-row" key={index}>
                    <select
                      className="form-select"
                      aria-label={`Condition ${index + 1} field`}
                      value={condition.target}
                      onChange={(event) => changeTarget(index, event.target.value)}
                    >
                      {targets.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                      {!target && <option value={condition.target}>Deleted field</option>}
                    </select>

                    <select
                      className="form-select"
                      aria-label={`Condition ${index + 1} operator`}
                      value={condition.operator}
                      onChange={(event) => updateCondition(index, { operator: event.target.value })}
                    >
                      {allowed.map((operator) => (
                        <option key={operator} value={operator}>
                          {OPERATORS[operator]}
                        </option>
                      ))}
                    </select>

                    <input
                      className="form-input"
                      aria-label={`Condition ${index + 1} value`}
                      type={
                        condition.operator === "greater_than" ||
                        condition.operator === "less_than"
                          ? "number"
                          : "text"
                      }
                      value={condition.value}
                      onChange={(event) => updateCondition(index, { value: event.target.value })}
                    />

                    <button
                      type="button"
                      className="btn-cancel"
                      aria-label={`Remove condition ${index + 1}`}
                      onClick={() =>
                        setConditions((current) => current.filter((_, i) => i !== index))
                      }
                      disabled={conditions.length === 1}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                className="btn-add-field"
                onClick={() => setConditions((current) => [...current, blankCondition(targets)])}
              >
                + Add condition
              </button>
            </div>

            {error && <p className="form-error" role="alert">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "Saving..." : filter ? "Save changes" : "Save filter"}
            </button>
          </div>
        </form>

        <style>{`
          .saved-filter-modal { max-width: 640px; }

          .saved-filter-row {
            display: grid;
            grid-template-columns: 1.3fr 1.1fr 1fr auto;
            gap: 8px;
            align-items: center;
            margin-bottom: 8px;
          }

          @media (max-width: 600px) {
            .saved-filter-row { grid-template-columns: 1fr 1fr; }
          }
        `}</style>
      </div>
    </div>
  );
}
