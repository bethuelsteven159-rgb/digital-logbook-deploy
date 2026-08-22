const repository = require("../repositories/projectDetailsRepository");

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    durationMinutes: entry.durationMinutes,
    occurredAt: entry.occurredAt,
    createdAt: entry.createdAt,
    values: (entry.values || []).map((value) => ({
      fieldId: value.fieldId,
      name: value.field?.name || "Field",
      type: value.field?.fieldType || null,
      value: serializeFieldValue(value),
    })),
  };
}

function serializeFieldValue(value) {
  const fieldType = value.field?.fieldType;

  if (fieldType === "boolean") {
    return value.valueText === "true";
  }

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

  if (
    rawValue === "" &&
    field.fieldType !== "boolean"
  ) {
    return null;
  }

  switch (field.fieldType) {
    case "text":
    case "tag":
      return {
        valueText: String(rawValue),
      };

    case "boolean":
      return {
        valueText:
          rawValue === true ||
          rawValue === "true"
            ? "true"
            : "false",
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

  const [fields, stats, entries] = await Promise.all([
    repository.getProjectFields(projectId),
    repository.getProjectStats(projectId),
    repository.getProjectEntries(projectId),
  ]);

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
    },

    stats,
    fields,
    entries: entries.map(serializeEntry),
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
        position: maxPosition + index + 1,
        required: false,
      });

      newlyCreatedFields.push({
        ...createdField,
        clientId: requestedField.clientId,
        submittedValue: requestedField.value,
      });
    }

    const entry = await tx.createEntry({
      projectId,
      createdById: userId,
      name: data.name.trim(),
      durationMinutes: data.durationMinutes,
    });

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

    return serializeEntry(completeEntry);
  });
}

module.exports = {
  getProjectDetailsService,
  createEntryService,
};
