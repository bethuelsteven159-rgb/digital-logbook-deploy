import { useState } from 'react';

const FIELD_TYPES = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
];

export default function EditProjectModal({ project, onClose, onSave }) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [fields, setFields] = useState(project?.fields ?? []);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('short_text');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function addField() {
    const label = newFieldLabel.trim();

    if (!label) {
      setError('Enter a field name first.');
      return;
    }

    const duplicate = fields.some(
      (field) =>
        String(field.label ?? field.name ?? '')
          .trim()
          .toLowerCase() === label.toLowerCase(),
    );

    if (duplicate) {
      setError(`A field named "${label}" already exists.`);
      return;
    }

    setFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label,
        type: newFieldType,
        isNew: true,
      },
    ]);

    setNewFieldLabel('');
    setNewFieldType('short_text');
    setError('');
  }

  function removeField(id) {
    setFields((prev) => prev.filter((field) => field.id !== id));
    setError('');
  }

  function renameField(id, label) {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, label } : field)));
    setError('');
  }

  async function saveProject() {
    const cleanName = name.trim();

    if (!cleanName) {
      setError('Project name is required.');
      return;
    }

    const names = fields.map((field) => field.label.trim());
    if (names.some((label) => !label || label.length > 100)) {
      setError('Field names must contain 1–100 characters.');
      return;
    }
    if (new Set(names.map((label) => label.toLowerCase())).size !== names.length) {
      setError('Each field must have a unique name.');
      return;
    }

    const payload = {
      name: cleanName,
      description: description.trim(),
      fields: fields.map((field) =>
        field.isNew
          ? {
              clientId: field.id,
              name: field.label.trim(),
              fieldType: field.type,
            }
          : {
              id: field.id,
              name: field.label.trim(),
            },
      ),
    };

    try {
      setSaving(true);
      setError('');
      await onSave?.(payload);
    } catch (saveError) {
      setError(saveError.message || 'Failed to update project.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ep-modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="ep-modal-title">
            Edit Project
          </h2>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
            disabled={saving}
          >
            <IconXSmall />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-field">
            <label className="form-label form-label-required" htmlFor="ep-project-name">
              Project name
            </label>

            <input
              id="ep-project-name"
              className="form-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="ep-project-description">
              Description
            </label>

            <textarea
              id="ep-project-description"
              className="form-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <p className="fields-section-label">Entry fields</p>

            <p className="locked-note">
              Renaming keeps existing values. Removed fields disappear from new entry forms, but
              their values remain in old entries. Field types cannot be changed.
            </p>

            <div className="fields-list">
              {fields.map((field, index) => (
                <div key={field.id} className="field-row">
                  <input
                    className="form-input field-row-name"
                    aria-label={`Field ${index + 1} name`}
                    value={field.label}
                    onChange={(event) => renameField(field.id, event.target.value)}
                    maxLength={100}
                    disabled={saving}
                  />
                  <span className="field-row-type">
                    {FIELD_TYPES.find((type) => type.value === field.type)?.label || field.type}
                  </span>
                  <button
                    className="field-row-remove"
                    onClick={() => removeField(field.id)}
                    aria-label={`Remove ${field.label}`}
                    type="button"
                    disabled={saving}
                  >
                    <IconXSmall />
                  </button>
                </div>
              ))}
            </div>

            <div className="add-field-row">
              <div className="form-field add-field-name">
                <label className="form-label" htmlFor="ep-field-label">
                  Add a field
                </label>

                <input
                  id="ep-field-label"
                  className="form-input"
                  type="text"
                  placeholder="Add field name"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addField();
                    }
                  }}
                />
              </div>

              <div className="form-field add-field-type">
                <label className="form-label" htmlFor="ep-field-type">
                  Type
                </label>

                <select
                  id="ep-field-type"
                  className="form-select"
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn-add-field" onClick={addField} type="button">
                <IconPlus />
                Add field
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="edit-project-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} type="button" disabled={saving}>
            Cancel
          </button>

          <button className="btn-save" onClick={saveProject} type="button" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <style>{`
        /* Modal shell + form base now live in index.css (design tokens) */
        .modal {
          max-width: 580px;
        }

        .form-label-required::after {
          content: ' *';
          color: #ef4444;
        }

        .fields-section-label {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #94a3b8;
          margin: 0;
        }

        .locked-note {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 12px;
          line-height: 1.5;
          color: #92601a;
          background: #fef6e7;
          border: 1px solid #fbe4b8;
          border-radius: 8px;
          padding: 8px 10px;
          margin: 0;
        }

        .fields-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
        }

        .field-row-name {
          flex: 1;
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .field-row-type {
          font-size: 11px;
          font-weight: 500;
          color: #94a3b8;
          background: #e2e8f0;
          border-radius: 4px;
          padding: 2px 7px;
          flex-shrink: 0;
        }

        .field-row-remove {
          background: none;
          border: none;
          cursor: pointer;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 4px;
          transition:
            color 0.15s ease,
            background 0.15s ease;
          flex-shrink: 0;
        }

        .field-row-remove:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.06);
        }

        .add-field-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .add-field-name {
          flex: 1;
        }

        .add-field-type {
          width: 140px;
          flex-shrink: 0;
        }

        .edit-project-error {
          margin: 0 24px 4px;
          padding: 10px 12px;
          border: 1px solid #fecaca;
          border-radius: 8px;
          background: #fef2f2;
          color: #b91c1c;
          font-size: 12px;
          line-height: 1.45;
        }

        @media (max-width: 600px) {
          .add-field-row {
            flex-wrap: wrap;
          }

          .add-field-type {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function IconXSmall() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
