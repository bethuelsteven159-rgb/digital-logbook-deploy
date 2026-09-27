import {
  useEffect,
  useState,
} from "react";

import {
  fetchCustomStatistics,
  createCustomStatistic,
  updateCustomStatistic,
  deleteCustomStatistic,
} from "../../api/customStatisticsApi";

const AGGREGATE_OPTIONS = [
  { value: "sum", label: "sum" },
  { value: "avg", label: "avg" },
  { value: "min", label: "min" },
  { value: "max", label: "max" },
  { value: "count", label: "count" },
];

function formatNumber(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return String(value);
  }

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function fieldArgument(fieldName) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(
    fieldName,
  )
    ? fieldName
    : `"${fieldName}"`;
}

export default function CustomStatistics({
  projectId,
  fields = [],
}) {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panelError, setPanelError] = useState("");

  const [name, setName] = useState("");
  const [expression, setExpression] =
    useState("");
  const [aggregate, setAggregate] =
    useState("sum");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deletingId, setDeletingId] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSavedStatistics() {
      if (!projectId) {
        setStatistics([]);
        setPanelError("");
        return;
      }

      try {
        setLoading(true);
        setPanelError("");

        const result =
          await fetchCustomStatistics(projectId);

        const list = Array.isArray(result)
          ? result
          : Array.isArray(result?.statistics)
            ? result.statistics
            : [];

        if (!cancelled) {
          setStatistics(list);
        }
      } catch (requestError) {
        if (!cancelled) {
          setStatistics([]);
          setPanelError(
            requestError.message ||
              "Unable to load custom statistics.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSavedStatistics();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    setName("");
    setExpression("");
    setFormError("");
    setEditingId("");
  }, [projectId]);

  function resetForm() {
    setName("");
    setExpression("");
    setFormError("");
    setEditingId("");
  }

  function startEdit(statistic) {
    setEditingId(statistic.id);
    setName(statistic.name);
    setExpression(statistic.expression);
    setFormError("");
  }

  function insertField(field) {
    const fieldAggregate =
      field.fieldType === "number"
        ? aggregate
        : "count";

    const snippet = `${fieldAggregate}(${fieldArgument(
      field.name,
    )})`;

    setExpression((current) => {
      if (!current.trim()) {
        return snippet;
      }

      return `${current} ${snippet}`;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!projectId) {
      setFormError("Select a project first.");
      return;
    }

    if (!name.trim()) {
      setFormError("Give your statistic a name.");
      return;
    }

    if (!expression.trim()) {
      setFormError(
        "Write an expression, for example sum(Score).",
      );
      return;
    }

    const payload = {
      name: name.trim(),
      expression: expression.trim(),
    };

    try {
      setSaving(true);
      setFormError("");

      const saved = editingId
        ? await updateCustomStatistic(
            projectId,
            editingId,
            payload,
          )
        : await createCustomStatistic(
            projectId,
            payload,
          );

      setStatistics((current) =>
        editingId
          ? current.map((statistic) =>
              statistic.id === saved.id
                ? saved
                : statistic,
            )
          : [...current, saved],
      );

      resetForm();
    } catch (requestError) {
      setFormError(
        requestError.message ||
          "Unable to save this statistic.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(statistic) {
    try {
      setDeletingId(statistic.id);
      setPanelError("");

      await deleteCustomStatistic(
        projectId,
        statistic.id,
      );

      setStatistics((current) =>
        current.filter(
          (item) => item.id !== statistic.id,
        ),
      );

      if (editingId === statistic.id) {
        resetForm();
      }
    } catch (requestError) {
      setPanelError(
        requestError.message ||
          "Unable to delete this statistic.",
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="custom-statistics">
      {!projectId && (
        <div className="stats-selection-empty">
          Select a project to define custom
          statistics.
        </div>
      )}

      {projectId && loading && (
        <div className="custom-stat-loading">
          Loading saved statistics...
        </div>
      )}

      {projectId && panelError && (
        <div className="stats-inline-error">
          {panelError}
        </div>
      )}

      {projectId &&
        !loading &&
        statistics.length === 0 &&
        !panelError && (
          <div className="stats-selection-empty">
            No custom statistics saved for this
            project yet.
          </div>
        )}

      {projectId && statistics.length > 0 && (
        <div className="custom-stat-list">
          {statistics.map((statistic) => (
            <div
              className="custom-stat-row"
              key={statistic.id}
            >
              <div className="custom-stat-row-main">
                <strong>{statistic.name}</strong>

                <code>{statistic.expression}</code>
              </div>

              <div className="custom-stat-value">
                {statistic.error ? (
                  <span className="custom-stat-value-error">
                    {statistic.error}
                  </span>
                ) : statistic.value == null ? (
                  <span className="custom-stat-value-empty">
                    No value
                  </span>
                ) : (
                  <strong>
                    {formatNumber(statistic.value)}
                  </strong>
                )}
              </div>

              <div className="custom-stat-actions">
                <button
                  type="button"
                  className="custom-stat-edit"
                  onClick={() =>
                    startEdit(statistic)
                  }
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="custom-stat-delete"
                  onClick={() =>
                    handleDelete(statistic)
                  }
                  disabled={
                    deletingId === statistic.id
                  }
                >
                  {deletingId === statistic.id
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {projectId && (
        <form
          className="custom-stat-form"
          onSubmit={handleSubmit}
        >
          <div className="custom-stat-fields">
            <div className="stats-control">
              <label htmlFor="custom-stat-name">
                Name
              </label>

              <input
                id="custom-stat-name"
                type="text"
                value={name}
                placeholder="Total training load"
                onChange={(event) =>
                  setName(event.target.value)
                }
              />
            </div>

            <div className="stats-control">
              <label htmlFor="custom-stat-expression">
                Expression
              </label>

              <input
                id="custom-stat-expression"
                type="text"
                value={expression}
                placeholder="sum(Hours) / count(Days)"
                onChange={(event) =>
                  setExpression(event.target.value)
                }
              />
            </div>

            <div className="stats-control">
              <label htmlFor="custom-stat-aggregate">
                Function
              </label>

              <select
                id="custom-stat-aggregate"
                value={aggregate}
                onChange={(event) =>
                  setAggregate(event.target.value)
                }
              >
                {AGGREGATE_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="custom-stat-chip-row">
            <span className="custom-stat-chip-label">
              Insert field:
            </span>

            {fields.length === 0 ? (
              <span className="custom-stat-chip-empty">
                This project has no fields yet.
              </span>
            ) : (
              fields.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  className="custom-stat-chip"
                  title={
                    field.fieldType === "number"
                      ? `Insert ${aggregate}(${field.name})`
                      : `Insert count(${field.name})`
                  }
                  onClick={() => insertField(field)}
                >
                  {field.name}
                </button>
              ))
            )}
          </div>

          {formError && (
            <div className="stats-inline-error">
              {formError}
            </div>
          )}

          <div className="custom-stat-form-actions">
            {editingId && (
              <button
                type="button"
                className="custom-stat-cancel"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="stats-load-btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update statistic"
                  : "Save statistic"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
