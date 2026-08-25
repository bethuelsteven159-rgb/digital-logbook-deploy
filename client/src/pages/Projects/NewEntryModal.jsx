import { useState } from "react";
import { Plus, X } from "lucide-react";

const FIELD_TYPES = [
  {
    value: "short_text",
    label: "Short text",
  },
  {
    value: "long_text",
    label: "Long text",
  },
  {
    value: "number",
    label: "Number",
  },
  {
    value: "date",
    label: "Date",
  },
];

export default function NewEntryModal({
  fields,
  onClose,
  onCreate,
}) {
  const [entryName, setEntryName] = useState("");
  const [durationMinutes, setDurationMinutes] =
    useState("");
  const [values, setValues] = useState({});
  const [newFields, setNewFields] = useState([]);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("short_text");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateExistingValue(fieldId, value) {
    setValues((current) => ({
      ...current,
      [fieldId]: value,
    }));
  }

  function updateNewFieldValue(clientId, value) {
    setNewFields((current) =>
      current.map((field) =>
        field.clientId === clientId
          ? {
              ...field,
              value,
            }
          : field,
      ),
    );
  }

  function handleAddField() {
    const cleanName = fieldName.trim();

    if (!cleanName) {
      setError("Enter a field name first.");
      return;
    }

    const duplicateExisting = fields.some(
      (field) =>
        field.name?.trim().toLowerCase() ===
        cleanName.toLowerCase(),
    );

    const duplicateNew = newFields.some(
      (field) =>
        field.name.trim().toLowerCase() ===
        cleanName.toLowerCase(),
    );

    if (duplicateExisting || duplicateNew) {
      setError(
        `A field named "${cleanName}" already exists.`,
      );
      return;
    }

    setNewFields((current) => [
      ...current,
      {
        clientId: crypto.randomUUID(),
        name: cleanName,
        type: fieldType,
        value: "",
      },
    ]);

    setFieldName("");
    setFieldType("short_text");
    setError("");
  }

  function removeNewField(clientId) {
    setNewFields((current) =>
      current.filter(
        (field) => field.clientId !== clientId,
      ),
    );
  }

  function fieldTypeLabel(type) {
    return (
      FIELD_TYPES.find(
        (option) => option.value === type,
      )?.label || type
    );
  }

  function renderInput(field, value, onChange) {
    const type = field.fieldType || field.type;

    if (type === "number") {
      return (
        <input
          className="form-input"
          type="number"
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      );
    }

    if (type === "date") {
      return (
        <input
          className="form-input"
          type="date"
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      );
    }

    if (type === "long_text") {
      return (
        <textarea
          className="form-input"
          rows={4}
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      );
    }

    return (
      <input
        className="form-input"
        type="text"
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanName = entryName.trim();

    if (!cleanName) {
      setError("Entry name is required.");
      return;
    }

    const duration =
      durationMinutes === ""
        ? 0
        : Number(durationMinutes);

    if (
      !Number.isInteger(duration) ||
      duration < 0
    ) {
      setError(
        "Time spent must be a valid number of minutes.",
      );
      return;
    }

    if (duration > 10080) {
      setError(
        "Time spent cannot exceed 10080 minutes.",
      );
      return;
    }

    const payload = {
      name: cleanName,
      durationMinutes: duration,
      values: fields.map((field) => ({
        fieldId: field.id,
        value: values[field.id] ?? "",
      })),
      newFields: newFields.map((field) => ({
        clientId: field.clientId,
        name: field.name,
        type: field.type,
        value: field.value,
      })),
    };

    try {
      setSaving(true);
      setError("");
      await onCreate(payload);
    } catch (submitError) {
      setError(
        submitError.message ||
          "Failed to create entry.",
      );
    } finally {
      setSaving(false);
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
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-entry-title"
      >
        <div className="modal-header">
          <h2
            className="modal-title"
            id="new-entry-title"
          >
            New Entry
          </h2>

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
            <div className="form-field">
              <label
                className="form-label form-label-required"
                htmlFor="entry-name"
              >
                Entry name
              </label>

              <input
                id="entry-name"
                className="form-input"
                type="text"
                maxLength={150}
                placeholder="e.g. Literature Review, Lab Session 3…"
                value={entryName}
                onChange={(event) =>
                  setEntryName(event.target.value)
                }
                autoFocus
              />
            </div>

            <div className="form-field">
              <label
                className="form-label"
                htmlFor="entry-duration"
              >
                Time spent (minutes)
              </label>

              <input
                id="entry-duration"
                className="form-input"
                type="number"
                min="0"
                max="10080"
                step="1"
                placeholder="e.g. 45"
                value={durationMinutes}
                onChange={(event) =>
                  setDurationMinutes(
                    event.target.value,
                  )
                }
              />
            </div>

            {fields.length > 0 && (
              <div className="fields-block">
                <p className="fields-section-label">
                  Project fields
                </p>

                {fields.map((field) => (
                  <div
                    className="form-field"
                    key={field.id}
                  >
                    <label className="form-label">
                      {field.name}
                      {field.required && (
                        <span className="required">
                          {" "}
                          *
                        </span>
                      )}
                    </label>

                    {renderInput(
                      field,
                      values[field.id] ?? "",
                      (value) =>
                        updateExistingValue(
                          field.id,
                          value,
                        ),
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="fields-block">
              <p className="fields-section-label">
                Add custom fields
              </p>

              {newFields.length > 0 && (
                <div className="fields-list">
                  {newFields.map((field) => (
                    <div
                      className="new-field-card"
                      key={field.clientId}
                    >
                      <div className="field-row">
                        <span className="field-row-drag">
                          ⋮⋮
                        </span>

                        <span className="field-row-name">
                          {field.name}
                        </span>

                        <span className="field-row-type">
                          {fieldTypeLabel(
                            field.type,
                          )}
                        </span>

                        <button
                          type="button"
                          className="field-row-remove"
                          onClick={() =>
                            removeNewField(
                              field.clientId,
                            )
                          }
                          aria-label={`Remove ${field.name}`}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="new-field-value">
                        {renderInput(
                          field,
                          field.value,
                          (value) =>
                            updateNewFieldValue(
                              field.clientId,
                              value,
                            ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="add-field-row">
                <div className="form-field add-field-name">
                  <label
                    className="form-label"
                    htmlFor="field-name"
                  >
                    Field name
                  </label>

                  <input
                    id="field-name"
                    className="form-input"
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Difficulty, Notes, Source…"
                    value={fieldName}
                    onChange={(event) =>
                      setFieldName(
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter"
                      ) {
                        event.preventDefault();
                        handleAddField();
                      }
                    }}
                  />
                </div>

                <div className="form-field add-field-type">
                  <label
                    className="form-label"
                    htmlFor="field-type"
                  >
                    Type
                  </label>

                  <select
                    id="field-type"
                    className="form-select"
                    value={fieldType}
                    onChange={(event) =>
                      setFieldType(
                        event.target.value,
                      )
                    }
                  >
                    {FIELD_TYPES.map(
                      (type) => (
                        <option
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-add-field"
                  onClick={handleAddField}
                >
                  <Plus size={14} />
                  Add field
                </button>
              </div>
            </div>

            {error && (
              <p className="form-error">
                {error}
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-save"
              disabled={saving}
            >
              {saving
                ? "Creating..."
                : "Save & Create Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
