const repository = require("../repositories/projectDetailsRepository");
const { evaluateFormula } = require("./computedFieldService");

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}


function buildLinkedEntriesMap(entries, links) {
  const linkedByEntryId = new Map(
    entries.map((entry) => [entry.id, []]),
  );

  for (const link of links) {
    linkedByEntryId.get(link.sourceEntryId)?.push({
      id: link.targetEntryId,
      name: link.targetName,
    });
    linkedByEntryId.get(link.targetEntryId)?.push({
      id: link.sourceEntryId,
      name: link.sourceName,
    });
  }

  return linkedByEntryId;
}

function serializeEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    durationMinutes: entry.durationMinutes,
    occurredAt: entry.occurredAt,
    dueAt: entry.dueAt,
    completedAt: entry.completedAt,
    createdAt: entry.createdAt,
    tags: entry.tags || [],
    values: (entry.values || []).map((value) => ({
      fieldId: value.fieldId,
      name: value.field?.name || "Field",
      type: value.field?.fieldType || null,
      value: serializeFieldValue(value),
    })),
    linkedEntries: Array.isArray(entry.linkedEntries)
      ? entry.linkedEntries
      : [],
  };
}

function attachComputedFields(serializedEntry, allFields) {
  const computedFields = allFields.filter(
    (field) => field.fieldType === "computed",
  );

  if (computedFields.length === 0) {
    return serializedEntry;
  }

  const computedValues = computedFields.map((field) => ({
    fieldId: field.id,
    name: field.name,
    type: "computed",
    value: evaluateFormula(field.formula, serializedEntry.values),
  }));

    return {
      ...serializedEntry,
      values: [...serializedEntry.values, ...computedValues],
    };
  }

function serializeFieldValue(value) {
  const fieldType = value.field?.fieldType;

  if (
    value.valueNumber !== null &&
    value.valueNumber !== undefined
  ) {
    return Number(value.valueNumber);
  }

  if (
    value.valueDate !== null &&
    value.valueDate !== undefined
  ) {
    return new Date(value.valueDate)
      .toISOString()
      .slice(0, 10);
  }

  return value.valueText;
}

function convertValue(field, rawValue) {
  if (
    rawValue === undefined ||
    rawValue === null
  ) {
    return null;
  }

  if (rawValue === "") {
    return null;
  }

  switch (field.fieldType) {
    case "short_text":
    case "long_text":
      return {
        valueText: String(rawValue),
      };

    case "number": {
      const number = Number(rawValue);

      if (!Number.isFinite(number)) {
        throw createHttpError(
          400,
          `${field.name} must contain a valid number`,
        );
      }

      return {
        valueNumber: number,
      };
    }

    case "date": {
      const date = new Date(
        `${rawValue}T00:00:00.000Z`,
      );

      if (Number.isNaN(date.getTime())) {
        throw createHttpError(
          400,
          `${field.name} must contain a valid date`,
        );
      }

      return {
        valueDate: date,
      };
    }

    case "computed":
      return null;

    default:
      throw createHttpError(
        400,
        `Unsupported field type: ${field.fieldType}`,
      );
  }
}

async function getProjectDetailsService({ projectId, userId }) {
  const project = await repository.getOwnedProject(projectId, userId);

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  const [fields, stats, entries, links] = await Promise.all([
    repository.getProjectFields(projectId),
    repository.getProjectStats(projectId),
    repository.getProjectEntries(projectId),
    repository.getProjectEntryLinks(projectId),
  ]);

  const linkedByEntryId = buildLinkedEntriesMap(entries, links);

  for (const entry of entries) {
    entry.linkedEntries = linkedByEntryId.get(entry.id) || [];
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      archivedAt: project.archivedAt,
      createdAt: project.createdAt,
    },

    stats,
    fields,
    entries: entries.map((entry) =>
      attachComputedFields(serializeEntry(entry), fields),
    ),
  };
}

async function createEntryService({ projectId, userId, data }) {
  return repository.withTransaction(async (tx) => {
    const project = await tx.getOwnedProject(projectId, userId);

    if (!project) {
      throw createHttpError(404, "Project not found");
    }

    const existingFields = await tx.getProjectFields(projectId);
    const existingFieldMap = new Map(
      existingFields.map((field) => [field.id, field]),
    );

    for (const suppliedValue of data.values) {
      if (!existingFieldMap.has(suppliedValue.fieldId)) {
        throw createHttpError(
          400,
          "One of the submitted fields does not belong to this project",
        );
      }
    }

    const usedNames = new Set(
      existingFields.map((field) => field.name.trim().toLowerCase()),
    );

    for (const field of data.newFields) {
      const normalizedName = field.name.trim().toLowerCase();

      if (usedNames.has(normalizedName)) {
        throw createHttpError(
          409,
          `A field named "${field.name}" already exists`,
        );
      }

      usedNames.add(normalizedName);
    }

    const maxPosition = existingFields.reduce(
      (max, field) => Math.max(max, field.position || 0),
      0,
    );

    const newlyCreatedFields = [];

    for (let index = 0; index < data.newFields.length; index += 1) {
      const requestedField = data.newFields[index];

      const createdField = await tx.createProjectField({
        projectId,
        name: requestedField.name.trim(),
        fieldType: requestedField.type,
        formula:
          requestedField.type === "computed"
            ? requestedField.formula
            : null,
        position: maxPosition + index + 1,
        required: false,
      });

      newlyCreatedFields.push({
        ...createdField,
        clientId: requestedField.clientId,
        submittedValue: requestedField.value,
      });
    }

    const linkedEntryIds = [...new Set(data.linkedEntryIds || [])];
    const linkedEntries = await tx.getEntriesByIdsForProject(
      projectId,
      linkedEntryIds,
    );

    if (linkedEntries.length !== linkedEntryIds.length) {
      throw createHttpError(
        400,
        "One or more linked entries do not belong to this project",
      );
    }

    const entry = await tx.createEntry({
      projectId,
      createdById: userId,
      name: data.name.trim(),
      durationMinutes: data.durationMinutes,

      tags: data.tags,

      dueAt: data.dueAt ?? null,

    });

    if (linkedEntryIds.length > 0) {
      await tx.createEntryLinks(entry.id, linkedEntryIds);
    }

    const valuesToCreate = [];

    for (const submitted of data.values) {
      const field = existingFieldMap.get(submitted.fieldId);
      const converted = convertValue(field, submitted.value);

      if (!converted) {
        continue;
      }

      valuesToCreate.push({
        entryId: entry.id,
        fieldId: field.id,
        ...converted,
      });
    }

    for (const field of newlyCreatedFields) {
      const converted = convertValue(field, field.submittedValue);

      if (!converted) {
        continue;
      }

      valuesToCreate.push({
        entryId: entry.id,
        fieldId: field.id,
        ...converted,
      });
    }

    if (valuesToCreate.length > 0) {
      await tx.createEntryFieldValues(valuesToCreate);
    }

        const completeEntry = await tx.getEntryById(entry.id);
    const allFields = await tx.getProjectFields(projectId);
    completeEntry.linkedEntries = linkedEntries;

    return attachComputedFields(serializeEntry(completeEntry), allFields);
  });
}
async function getOutstandingEntriesService({ projectId, userId }) {
  const project = await repository.getOwnedProject(projectId, userId);

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  const entries = await repository.getOutstandingEntries(projectId);

  return entries.map(serializeEntry);
}
module.exports = {
  getProjectDetailsService,
  createEntryService,
  getOutstandingEntriesService,
  serializeEntry,
  buildLinkedEntriesMap,
};
