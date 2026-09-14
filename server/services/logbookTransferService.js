const repository = require("../repositories/logbookTransferRepository");

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function exportLogbookService({ userId }) {
  return repository.getLogbook(userId).then((data) => {
    const projects = data.projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.start_date,
      endDate: project.end_date,
      archivedAt: toIso(project.archived_at),
      createdAt: toIso(project.created_at),
      updatedAt: toIso(project.updated_at),
      fields: data.fields
        .filter((field) => field.project_id === project.id)
        .map((field) => ({
          id: field.id,
          name: field.name,
          fieldType: field.field_type,
          position: field.position,
          required: field.required,
          archivedAt: toIso(field.archived_at),
          createdAt: toIso(field.created_at),
          updatedAt: toIso(field.updated_at),
        })),
      entries: data.entries
        .filter((entry) => entry.project_id === project.id)
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          durationMinutes: entry.duration_minutes,
          occurredAt: toIso(entry.occurred_at),
          createdAt: toIso(entry.created_at),
          updatedAt: toIso(entry.updated_at),
          values: data.values
            .filter((value) => value.entry_id === entry.id)
            .map((value) => ({
              id: value.id,
              fieldId: value.field_id,
              valueText: value.value_text,
              valueNumber: value.value_number,
              valueDate: value.value_date,
              createdAt: toIso(value.created_at),
            })),
          checklist: data.checklist
            .filter((item) => item.entry_id === entry.id)
            .map((item) => ({
              id: item.id,
              text: item.text,
              completed: item.completed,
              position: item.position,
              createdAt: toIso(item.created_at),
              updatedAt: toIso(item.updated_at),
            })),
          referenceProjectIds: data.references
            .filter((reference) => reference.entry_id === entry.id)
            .map((reference) => reference.referenced_project_id),
        })),
    }));

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
    };
  });
}

function validateImportPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw httpError(400, "Import file must contain a JSON object");
  }
  if (payload.version !== 1) {
    throw httpError(400, "Unsupported logbook export version");
  }
  if (!Array.isArray(payload.projects)) {
    throw httpError(400, "Import file must contain a projects array");
  }

  const projectIds = new Set();
  const fieldIds = new Set();
  const entryIds = new Set();

  for (const project of payload.projects) {
    if (!project || typeof project !== "object") throw httpError(400, "Invalid project in import file");
    if (typeof project.id !== "string" || !project.id) throw httpError(400, "Every imported project needs an id");
    if (projectIds.has(project.id)) throw httpError(400, "Duplicate project id in import file");
    projectIds.add(project.id);
    if (typeof project.name !== "string" || !project.name.trim() || project.name.length > 120) {
      throw httpError(400, "Every imported project needs a valid name");
    }
    if (!Array.isArray(project.fields) || !Array.isArray(project.entries)) {
      throw httpError(400, "Imported project fields and entries must be arrays");
    }
    for (const field of project.fields) {
      if (!field || typeof field.id !== "string" || fieldIds.has(field.id)) throw httpError(400, "Invalid or duplicate field id in import file");
      fieldIds.add(field.id);
      if (typeof field.name !== "string" || !field.name.trim() || !["short_text", "long_text", "number", "date"].includes(field.fieldType)) {
        throw httpError(400, "Imported project field is invalid");
      }
    }
    for (const entry of project.entries) {
      if (!entry || typeof entry.id !== "string" || entryIds.has(entry.id)) throw httpError(400, "Invalid or duplicate entry id in import file");
      entryIds.add(entry.id);
      if (typeof entry.name !== "string" || !entry.name.trim() || entry.name.length > 150) throw httpError(400, "Imported entry is invalid");
      if (!Number.isInteger(Number(entry.durationMinutes)) || Number(entry.durationMinutes) < 0 || Number(entry.durationMinutes) > 10080) throw httpError(400, "Imported entry duration is invalid");
      if (!Array.isArray(entry.values) || !Array.isArray(entry.checklist) || !Array.isArray(entry.referenceProjectIds)) throw httpError(400, "Imported entry features are invalid");
      for (const value of entry.values) {
        if (!fieldIds.has(value.fieldId)) throw httpError(400, "Imported entry references an unknown field");
      }
      for (const referenceProjectId of entry.referenceProjectIds) {
        if (!projectIds.has(referenceProjectId)) throw httpError(400, "Imported entry references an unknown project");
      }
      for (const item of entry.checklist) {
        if (!item || typeof item.text !== "string" || !item.text.trim() || item.text.length > 300) throw httpError(400, "Imported checklist item is invalid");
      }
    }
  }
}

async function importLogbookService({ userId, payload }) {
  validateImportPayload(payload);
  const normalized = {
    projects: payload.projects,
    fields: payload.projects.flatMap((project) => project.fields.map((field) => ({ ...field, projectId: project.id }))),
    entries: payload.projects.flatMap((project) => project.entries.map((entry) => ({ ...entry, projectId: project.id }))),
    values: payload.projects.flatMap((project) => project.entries.flatMap((entry) => entry.values.map((value) => ({ ...value, entryId: entry.id })))),
    checklist: payload.projects.flatMap((project) => project.entries.flatMap((entry) => entry.checklist.map((item) => ({ ...item, entryId: entry.id })))),
    references: payload.projects.flatMap((project) => project.entries.flatMap((entry) => entry.referenceProjectIds.map((referencedProjectId) => ({ entryId: entry.id, referencedProjectId })))),
  };

  return repository.withTransaction((tx) => tx.insertImportedLogbook(userId, normalized));
}

module.exports = { exportLogbookService, importLogbookService, validateImportPayload };
