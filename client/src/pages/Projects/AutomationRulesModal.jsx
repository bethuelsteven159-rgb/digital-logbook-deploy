import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  fetchAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
} from "../../api/projectDetailsApi";

const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
];

function operatorLabel(operator) {
  return (
    CONDITION_OPERATORS.find(
      (option) => option.value === operator,
    )?.label || operator
  );
}

function describeRule(rule, allowedFields) {
  const field = allowedFields.find(
    (candidate) => candidate.id === rule.conditionFieldId,
  );

  const fieldName = field
    ? field.name
    : "Deleted field";

  const conditionValue =
    rule.conditionValue === null ||
    rule.conditionValue === undefined
      ? ""
      : String(rule.conditionValue);

  return {
    condition: `IF ${fieldName} ${operatorLabel(
      rule.conditionOperator,
    ).toLowerCase()} ${conditionValue || "any value"}`,
    action: `THEN add tag "${rule.actionValue}"`,
  };
}

export default function AutomationRulesModal({
  projectId,
  fields,
  onClose,
}) {
  const allowedFields = (
    Array.isArray(fields) ? fields : []
  ).filter(
    (field) =>
      (field.fieldType || field.type) !== "computed",
  );

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyRuleId, setBusyRuleId] = useState(null);

  const [ruleName, setRuleName] = useState("");
  const [conditionFieldId, setConditionFieldId] =
    useState("");
  const [conditionOperator, setConditionOperator] =
    useState("equals");
  const [conditionValue, setConditionValue] =
    useState("");
  const [tagValue, setTagValue] = useState("");
  const [editingRuleId, setEditingRuleId] =
    useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchAutomationRules(projectId)
      .then((data) => {
        if (!cancelled) {
          setRules(Array.isArray(data) ? data : []);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError.message ||
              "Failed to load automation rules.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function resetForm() {
    setRuleName("");
    setConditionFieldId("");
    setConditionOperator("equals");
    setConditionValue("");
    setTagValue("");
    setEditingRuleId(null);
    setError("");
  }

  function startEdit(rule) {
    setEditingRuleId(rule.id);
    setRuleName(rule.name || "");
    setConditionFieldId(rule.conditionFieldId || "");
    setConditionOperator(
      rule.conditionOperator || "equals",
    );
    setConditionValue(
      rule.conditionValue === null ||
        rule.conditionValue === undefined
        ? ""
        : String(rule.conditionValue),
    );
    setTagValue(rule.actionValue || "");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanName = ruleName.trim();
    const cleanConditionValue =
      conditionValue.trim();
    const cleanTag = tagValue.trim().toLowerCase();

    if (!cleanName) {
      setError("Rule name is required.");
      return;
    }

    if (!conditionFieldId) {
      setError("Select a field for the condition.");
      return;
    }

    if (!cleanConditionValue) {
      setError("Condition value is required.");
      return;
    }

    if (!cleanTag) {
      setError("Enter the tag that should be added.");
      return;
    }

    if (cleanTag.length > 30) {
      setError("Tags cannot exceed 30 characters.");
      return;
    }

    const payload = {
      name: cleanName,
      conditionFieldId,
      conditionOperator,
      conditionValue: cleanConditionValue,
      actionType: "add_tag",
      actionValue: cleanTag,
    };

    try {
      setSaving(true);
      setError("");

      const saved = editingRuleId
        ? await updateAutomationRule(
            editingRuleId,
            payload,
          )
        : await createAutomationRule(
            projectId,
            payload,
          );

      if (saved?.id) {
        setRules((current) =>
          editingRuleId
            ? current.map((rule) =>
                rule.id === editingRuleId
                  ? saved
                  : rule,
              )
            : [saved, ...current],
        );
      }

      resetForm();
    } catch (submitError) {
      setError(
        submitError.message ||
          "Failed to save automation rule.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnabled(rule) {
    try {
      setBusyRuleId(rule.id);
      setError("");

      const updated = await updateAutomationRule(
        rule.id,
        { enabled: !rule.enabled },
      );

      setRules((current) =>
        current.map((item) =>
          item.id === rule.id
            ? updated?.id
              ? updated
              : { ...item, enabled: !rule.enabled }
            : item,
        ),
      );
    } catch (toggleError) {
      setError(
        toggleError.message ||
          "Failed to update automation rule.",
      );
    } finally {
      setBusyRuleId(null);
    }
  }

  async function handleDelete(rule) {
    try {
      setBusyRuleId(rule.id);
      setError("");

      await deleteAutomationRule(rule.id);

      setRules((current) =>
        current.filter((item) => item.id !== rule.id),
      );

      if (editingRuleId === rule.id) {
        resetForm();
      }
    } catch (deleteError) {
      setError(
        deleteError.message ||
          "Failed to delete automation rule.",
      );
    } finally {
      setBusyRuleId(null);
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
        className="modal automation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="automation-rules-title"
      >
        <div className="modal-header">
          <div>
            <h2
              className="modal-title"
              id="automation-rules-title"
            >
              Automation Rules
            </h2>

            <p className="entry-intro">
              When a new entry is created and its condition
              is met, the tag is added automatically.
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
            <div className="fields-block">
              <p className="fields-section-label">
                Existing rules
              </p>

              {loading ? (
                <p className="form-help">
                  Loading automation rules…
                </p>
              ) : rules.length === 0 ? (
                <p className="form-help">
                  No automation rules yet. Create one below.
                </p>
              ) : (
                <div className="automation-rule-list">
                  {rules.map((rule) => {
                    const description =
                      describeRule(
                        rule,
                        allowedFields,
                      );

                    return (
                      <div
                        className="automation-rule-row"
                        key={rule.id}
                      >
                        <div className="automation-rule-info">
                          <strong>
                            {rule.name}
                          </strong>

                          <span>
                            {description.condition}
                          </span>

                          <span>
                            {description.action}
                          </span>

                          <small
                            className={
                              rule.enabled
                                ? "automation-rule-status automation-rule-status--enabled"
                                : "automation-rule-status"
                            }
                          >
                            {rule.enabled
                              ? "Enabled"
                              : "Disabled"}
                          </small>
                        </div>

                        <div className="automation-rule-actions">
                          <button
                            type="button"
                            className="btn-add-field"
                            onClick={() =>
                              handleToggleEnabled(
                                rule,
                              )
                            }
                            disabled={
                              busyRuleId === rule.id
                            }
                          >
                            {rule.enabled
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <button
                            type="button"
                            className="btn-add-field"
                            onClick={() =>
                              startEdit(rule)
                            }
                            disabled={
                              busyRuleId === rule.id
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="field-row-remove"
                            onClick={() =>
                              handleDelete(rule)
                            }
                            aria-label={`Delete ${rule.name}`}
                            disabled={
                              busyRuleId === rule.id
                            }
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="fields-block">
              <p className="fields-section-label">
                {editingRuleId
                  ? "Edit rule"
                  : "Create a rule"}
              </p>

              <p className="form-help">
                Rules run when a new entry is created.
                Archived and computed fields cannot be
                used.
              </p>

              <div className="form-field">
                <label
                  className="form-label form-label-required"
                  htmlFor="automation-rule-name"
                >
                  Rule name
                </label>

                <input
                  id="automation-rule-name"
                  className="form-input"
                  type="text"
                  maxLength={100}
                  placeholder="e.g. Mark completed work"
                  value={ruleName}
                  onChange={(event) =>
                    setRuleName(event.target.value)
                  }
                />
              </div>

              <div className="form-field">
                <label
                  className="form-label form-label-required"
                  htmlFor="automation-rule-field"
                >
                  Condition field
                </label>

                <select
                  id="automation-rule-field"
                  className="form-select"
                  value={conditionFieldId}
                  onChange={(event) =>
                    setConditionFieldId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Select a field…
                  </option>

                  {allowedFields.map((field) => (
                    <option
                      key={field.id}
                      value={field.id}
                    >
                      {field.name}
                    </option>
                  ))}
                </select>

                {allowedFields.length === 0 && (
                  <p className="form-help">
                    This project has no fields that can
                    be used in automation rules.
                  </p>
                )}
              </div>

              <div className="form-field">
                <label
                  className="form-label form-label-required"
                  htmlFor="automation-rule-operator"
                >
                  Condition
                </label>

                <select
                  id="automation-rule-operator"
                  className="form-select"
                  value={conditionOperator}
                  onChange={(event) =>
                    setConditionOperator(
                      event.target.value,
                    )
                  }
                >
                  {CONDITION_OPERATORS.map(
                    (operator) => (
                      <option
                        key={operator.value}
                        value={operator.value}
                      >
                        {operator.label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="form-field">
                <label
                  className="form-label form-label-required"
                  htmlFor="automation-rule-value"
                >
                  Condition value
                </label>

                <input
                  id="automation-rule-value"
                  className="form-input"
                  type="text"
                  placeholder="e.g. completed"
                  value={conditionValue}
                  onChange={(event) =>
                    setConditionValue(
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="form-field">
                <label
                  className="form-label form-label-required"
                  htmlFor="automation-rule-tag"
                >
                  Tag to add
                </label>

                <input
                  id="automation-rule-tag"
                  className="form-input"
                  type="text"
                  maxLength={30}
                  placeholder="e.g. completed"
                  value={tagValue}
                  onChange={(event) =>
                    setTagValue(event.target.value)
                  }
                />

                <p className="form-help">
                  Added to the entry when the condition
                  is met.
                </p>
              </div>

              {editingRuleId && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel edit
                </button>
              )}
            </div>

            {error && (
              <p className="form-error">{error}</p>
            )}
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
                : editingRuleId
                  ? "Save changes"
                  : "Create rule"}
            </button>
          </div>
        </form>

        <style>{`
          .automation-modal {
            max-width: 620px;
          }

          .automation-rule-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .automation-rule-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 14px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #fff;
          }

          .automation-rule-info {
            display: flex;
            flex-direction: column;
            gap: 3px;
            font-size: 13px;
            color: #334155;
          }

          .automation-rule-info strong {
            font-size: 13px;
            color: #1e293b;
          }

          .automation-rule-status {
            font-size: 11px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }

          .automation-rule-status--enabled {
            color: #15803d;
          }

          .automation-rule-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
          }
        `}</style>
      </div>
    </div>
  );
}
