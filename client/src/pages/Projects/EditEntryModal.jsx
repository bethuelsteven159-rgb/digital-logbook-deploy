import { useEffect, useMemo, useState } from "react";
import { Lock, Plus, Save, Trash2, X } from "lucide-react";

const FIELD_TYPES = [
  { value: "short_text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "computed", label: "Computed" },
];

function createNewField() {
  return {
    clientId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    type: "short_text",
    value: "",
    formula: "",
  };
}

function createNewChecklistItem() {
  return {
    clientId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text: "",
    completed: false,
  };
}

export default function EditEntryModal({
  entry,
  fields,
  projects = [],
  entries = [],
  onClose,
  onSave,
}) {
  const [entryName, setEntryName] = useState(entry?.name || "");
  const [durationMinutes, setDurationMinutes] = useState(entry?.durationMinutes ?? 0);
  const [dueAt, setDueAt] = useState(entry?.dueAt ? String(entry.dueAt).slice(0, 16) : "");
  const [values, setValues] = useState({});
  const [selectedFieldIds, setSelectedFieldIds] = useState([]);
  const [newFields, setNewFields] = useState([]);
  const [referenceProjectIds, setReferenceProjectIds] = useState([]);
  const [referenceEntryIds, setReferenceEntryIds] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [newChecklistItems, setNewChecklistItems] = useState([]);
  const [checklistText, setChecklistText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const entryValueMap = useMemo(() => {
    const map = {};
    for (const value of entry?.values || []) {
      if (value.fieldId) map[value.fieldId] = value.value ?? "";
    }
    return map;
  }, [entry]);

  useEffect(() => {
    setEntryName(entry?.name || "");
    setDurationMinutes(entry?.durationMinutes ?? 0);
    setDueAt(entry?.dueAt ? String(entry.dueAt).slice(0, 16) : "");
    setValues(entryValueMap);
    setSelectedFieldIds((fields || []).map((field) => field.id));
    setNewFields([]);
    setReferenceProjectIds(
      (entry?.references || []).map((reference) => reference.projectId).filter(Boolean),
    );
    setReferenceEntryIds(
      (entry?.entryReferences || []).map((reference) => reference.referencedEntryId).filter(Boolean),
    );
    setChecklistItems(
      (entry?.checklist || []).map((item) => ({
        id: item.id,
        text: item.text || "",
        completed: Boolean(item.completed),
      })),
    );
    setNewChecklistItems([]);
    setChecklistText("");
    setError("");
  }, [entry, entryValueMap, fields]);

  function updateValue(fieldId, value) {
    setValues((current) => ({ ...current, [fieldId]: value }));
  }

  function removeField(field) {
    if (field.usedByEntries) return;
    setSelectedFieldIds((current) => current.filter((id) => id !== field.id));
  }

  function addNewField() {
    setNewFields((current) => [...current, createNewField()]);
  }

  function updateNewField(clientId, changes) {
    setNewFields((current) =>
      current.map((field) => (field.clientId === clientId ? { ...field, ...changes } : field)),
    );
  }

  function removeNewField(clientId) {
    setNewFields((current) => current.filter((field) => field.clientId !== clientId));
  }

  function updateChecklistItem(clientId, changes) {
    setChecklistItems((current) =>
      current.map((item) => (item.id === clientId ? { ...item, ...changes } : item)),
    );
  }

  function removeChecklistItem(item) {
    if (item.completed) return;
    setChecklistItems((current) => current.filter((candidate) => candidate.id !== item.id));
  }

  function addChecklistItem() {
    const text = checklistText.trim();
    if (!text) return;
    if (text.length > 300) {
      setError("Checklist items cannot exceed 300 characters.");
      return;
    }
    const total = checklistItems.length + newChecklistItems.length;
    if (total >= 100) {
      setError("A checklist can contain at most 100 items.");
      return;
    }
    setNewChecklistItems((current) => [
      ...current,
      { ...createNewChecklistItem(), text },
    ]);
    setChecklistText("");
    setError("");
  }

  function updateNewChecklistItem(clientId, changes) {
    setNewChecklistItems((current) =>
      current.map((item) => (item.clientId === clientId ? { ...item, ...changes } : item)),
    );
  }

  function removeNewChecklistItem(clientId) {
    setNewChecklistItems((current) => current.filter((item) => item.clientId !== clientId));
  }

  function toggleReference(setter, id) {
    setter((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  }

  function renderInput(field, value, onChange) {
    if (field.fieldType === "computed" || field.type === "computed") {
      return <input className="form-input" type="text" value={value ?? ""} readOnly />;
    }
    if (field.fieldType === "number" || field.type === "number") {
      return <input className="form-input" type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
    if (field.fieldType === "date" || field.type === "date") {
      return <input className="form-input" type="date" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
    if (field.fieldType === "long_text" || field.type === "long_text") {
      return <textarea className="form-input" rows={4} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
    }
    return <input className="form-input" type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanName = entryName.trim();
    if (!cleanName) {
      setError("Entry name is required.");
      return;
    }

    const duration = Number(durationMinutes);
    if (!Number.isInteger(duration) || duration < 0) {
      setError("Duration must be a whole number of minutes.");
      return;
    }

    const cleanedNewFields = newFields.map((field) => ({
      ...field,
      name: field.name.trim(),
    }));
    if (cleanedNewFields.some((field) => !field.name)) {
      setError("Every new field needs a name.");
      return;
    }
    const names = cleanedNewFields.map((field) => field.name.toLowerCase());
    if (new Set(names).size !== names.length) {
      setError("New field names must be unique.");
      return;
    }

    const cleanChecklist = checklistItems.map((item) => ({
      id: item.id,
      text: item.text.trim(),
      completed: Boolean(item.completed),
    }));
    if (cleanChecklist.some((item) => !item.text)) {
      setError("Checklist item text cannot be empty.");
      return;
    }
    const cleanNewChecklist = newChecklistItems.map((item) => ({
      text: item.text.trim(),
    }));
    if (cleanNewChecklist.some((item) => !item.text)) {
      setError("Checklist item text cannot be empty.");
      return;
    }

    const selectedFields = (fields || []).filter((field) => selectedFieldIds.includes(field.id));
    const payload = {
      name: cleanName,
      durationMinutes: duration,
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      fieldIds: selectedFields.map((field) => field.id),
      values: selectedFields.map((field) => ({ fieldId: field.id, value: values[field.id] ?? "" })),
      newFields: cleanedNewFields,
      checklistItems: cleanChecklist,
      newChecklistItems: cleanNewChecklist,
      referenceProjectIds,
      referenceEntryIds,
    };

    try {
      setSaving(true);
      setError("");
      await onSave(payload);
    } catch (saveError) {
      setError(saveError.message || "Failed to update entry.");
    } finally {
      setSaving(false);
    }
  }

  const selectedFields = (fields || []).filter((field) => selectedFieldIds.includes(field.id));
  const projectOptions = (projects || []).filter((project) => project.id !== entry?.projectId);
  const entryOptions = (entries || []).filter((candidate) => candidate.id !== entry?.id);

  return (
    <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <div className="modal edit-entry-modal" role="dialog" aria-modal="true" aria-labelledby="edit-entry-title">
        <div className="modal-header">
          <div>
            <p className="entry-details-eyebrow">Editing entry</p>
            <h2 className="modal-title" id="edit-entry-title">Edit Entry</h2>
            <p className="edit-entry-subtitle">Update the entry contents, checklist, project fields and references.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close" disabled={saving}><X size={14} /></button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-field">
              <label className="form-label form-label-required" htmlFor="edit-entry-name">Entry name</label>
              <input id="edit-entry-name" className="form-input" type="text" maxLength={150} value={entryName} onChange={(e) => setEntryName(e.target.value)} autoFocus disabled={saving} />
            </div>

            <div className="edit-entry-basic-grid">
              <div className="form-field">
                <label className="form-label form-label-required" htmlFor="edit-entry-duration">Duration (minutes)</label>
                <input id="edit-entry-duration" className="form-input" type="number" min="0" max="10080" step="1" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} disabled={saving} />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="edit-entry-due-date">Due date (optional)</label>
                <input id="edit-entry-due-date" className="form-input" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="fields-block">
              <div className="edit-entry-fields-heading">
                <div>
                  <p className="fields-section-label">Project fields</p>
                  <p className="edit-entry-help">Change values, remove unused fields, or add a new project field.</p>
                </div>
                <button type="button" className="btn btn-secondary edit-entry-add-field" onClick={addNewField} disabled={saving}>
                  <Plus size={14} /> Add field
                </button>
              </div>

              {selectedFields.map((field) => (
                <div className="form-field edit-entry-field" key={field.id}>
                  <div className="edit-entry-field-label-row">
                    <label className="form-label">{field.name}{field.required && <span className="required"> *</span>}</label>
                    {field.usedByEntries ? (
                      <span className="field-in-use-badge"><Lock size={11} /> In use</span>
                    ) : (
                      <button type="button" className="field-remove-text" onClick={() => removeField(field)} disabled={saving}>Remove field</button>
                    )}
                  </div>
                  {renderInput(field, values[field.id] ?? "", (value) => updateValue(field.id, value))}
                </div>
              ))}

              {newFields.map((field) => (
                <div className="form-field edit-entry-field edit-entry-new-field" key={field.clientId}>
                  <div className="edit-entry-field-label-row">
                    <label className="form-label">New field</label>
                    <button type="button" className="field-remove-text" onClick={() => removeNewField(field.clientId)} disabled={saving}>Remove</button>
                  </div>
                  <input className="form-input" type="text" maxLength={100} placeholder="Field name" value={field.name} onChange={(e) => updateNewField(field.clientId, { name: e.target.value })} disabled={saving} />
                  <select className="form-select" value={field.type} onChange={(e) => updateNewField(field.clientId, { type: e.target.value })} disabled={saving}>
                    {FIELD_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {field.type === "computed" && (
                    <input className="form-input" type="text" maxLength={500} placeholder="Formula" value={field.formula || ""} onChange={(e) => updateNewField(field.clientId, { formula: e.target.value })} disabled={saving} />
                  )}
                  {renderInput({ type: field.type }, field.value, (value) => updateNewField(field.clientId, { value }))}
                </div>
              ))}

              {selectedFields.length === 0 && newFields.length === 0 && <div className="edit-entry-empty-fields">No project fields are attached to this entry.</div>}
            </div>

            <div className="fields-block">
              <div className="edit-entry-fields-heading">
                <div>
                  <p className="fields-section-label">Checklist</p>
                  <p className="edit-entry-help">Edit or remove unfinished items. Completed items are locked; add more items below.</p>
                </div>
              </div>

              {checklistItems.length > 0 && (
                <div className="person4-list">
                  {checklistItems.map((item) => (
                    <div className={`person4-list-row ${item.completed ? "person4-list-row-locked" : ""}`} key={item.id}>
                      <input
                        className="checklist-edit-checkbox"
                        type="checkbox"
                        checked={item.completed}
                        onChange={(event) => updateChecklistItem(item.id, { completed: event.target.checked })}
                        disabled={saving}
                        aria-label={item.completed ? `Uncheck ${item.text}` : `Check ${item.text}`}
                      />
                      <input
                        className="form-input"
                        type="text"
                        maxLength={300}
                        value={item.text}
                        onChange={(event) => updateChecklistItem(item.id, { text: event.target.value })}
                        disabled={saving || item.completed}
                      />
                      {item.completed ? (
                        <span className="field-in-use-badge"><Lock size={11} /> Locked</span>
                      ) : (
                        <button type="button" className="field-row-remove" onClick={() => removeChecklistItem(item)} disabled={saving}>Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {newChecklistItems.length > 0 && (
                <div className="person4-list">
                  {newChecklistItems.map((item) => (
                    <div className="person4-list-row" key={item.clientId}>
                      <input
                        className="checklist-edit-checkbox"
                        type="checkbox"
                        checked={item.completed}
                        onChange={(event) => updateNewChecklistItem(item.clientId, { completed: event.target.checked })}
                        disabled={saving}
                        aria-label="Mark new checklist item complete"
                      />
                      <input
                        className="form-input"
                        type="text"
                        maxLength={300}
                        value={item.text}
                        onChange={(event) => updateNewChecklistItem(item.clientId, { text: event.target.value })}
                        disabled={saving}
                      />
                      <button type="button" className="field-row-remove" onClick={() => removeNewChecklistItem(item.clientId)} disabled={saving}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="person4-add-row">
                <input className="form-input" type="text" maxLength={300} placeholder="Add a checklist item" value={checklistText} onChange={(e) => setChecklistText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }} disabled={saving} />
                <button type="button" className="btn-add-field" onClick={addChecklistItem} disabled={saving || !checklistText.trim()}>
                  <Plus size={14} /> Add item
                </button>
              </div>
            </div>

            <div className="edit-entry-reference-grid">
              <div className="edit-entry-reference-section">
                <div className="edit-entry-section-heading">Referenced projects</div>
                <div className="edit-entry-help">Select projects to add or remove references.</div>
                <div className="edit-entry-reference-options">
                  {projectOptions.length === 0 ? <span className="edit-entry-muted">No other projects available.</span> : projectOptions.map((project) => (
                    <label className="edit-entry-check-option" key={project.id}>
                      <input type="checkbox" checked={referenceProjectIds.includes(project.id)} onChange={() => toggleReference(setReferenceProjectIds, project.id)} disabled={saving} />
                      <span>{project.name || "Untitled Project"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="edit-entry-reference-section">
                <div className="edit-entry-section-heading">Referenced entries</div>
                <div className="edit-entry-help">Select entries to add or remove references.</div>
                <div className="edit-entry-reference-options">
                  {entryOptions.length === 0 ? <span className="edit-entry-muted">No other entries available in this project.</span> : entryOptions.map((candidate) => (
                    <label className="edit-entry-check-option" key={candidate.id}>
                      <input type="checkbox" checked={referenceEntryIds.includes(candidate.id)} onChange={() => toggleReference(setReferenceEntryIds, candidate.id)} disabled={saving} />
                      <span>{candidate.name || "Logbook Entry"}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="edit-entry-note"><Trash2 size={13} /> Completed checklist items are kept locked so they cannot be accidentally changed or removed.</div>
            {error && <div className="form-error">{error}</div>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
