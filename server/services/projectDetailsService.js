const repository = require("../repositories/projectDetailsRepository");
const { evaluateFormula } = require("./computedFieldService");

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeChecklist(item) {
  return {
    id: item.id,
    text: item.text,
    completed: Boolean(item.completed),
    position: item.position,
  };
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

    values: (entry.values || []).map((value) => ({
      fieldId: value.fieldId,
      name: value.field?.name || "Field",
      type: value.field?.fieldType || null,
      value: serializeFieldValue(value),
    })),

    checklist: (entry.checklist || []).map(serializeChecklist),

    references: (entry.references || []).map((reference) => ({
      id: reference.id,
      projectId: reference.projectId,
      projectName: reference.projectName,
    })),

    entryReferences: (entry.entryReferences || []).map((reference) => ({
      id: reference.id,
      entryId: reference.referencedEntryId,
      entryName: reference.referencedEntryName,
      projectId: reference.referencedProjectId,
      projectName: reference.referencedProjectName,
    })),

    linkedEntries: Array.isArray(entry.linkedEntries)
      ? entry.linkedEntries
      : [],
  };
}

function attachComputedFields(serializedEntry, allFields) {
  const computedFields = (allFields || []).filter(
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
    rawValue === null ||
    rawValue === ""
  ) {
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

    case "computed":
      return null;

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

async function getProjectDetailsService({
  projectId,
  userId,
}) {
  const project =
    await repository.getOwnedProject(
      projectId,
      userId,
    );

  if (!project) {
    throw createHttpError(
      404,
      "Project not found",
    );
  }

  const [
    fields,
    stats,
    entries,
    projectReferences,
    links,
  ] = await Promise.all([
    repository.getProjectFields(projectId),
    repository.getProjectStats(projectId),
    repository.getProjectEntries(projectId),
    repository.getProjectReferences(projectId),
    repository.getProjectEntryLinks(projectId),
  ]);

  const linkedByEntryId =
    buildLinkedEntriesMap(
      entries,
      links,
    );

  for (const entry of entries) {
    entry.linkedEntries =
      linkedByEntryId.get(entry.id) || [];
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      startDate: project.startDate,
      endDate: project.endDate,
      archivedAt: project.archivedAt,
      createdAt: project.createdAt,
    },

    stats,

    fields,

    entries: entries.map((entry) =>
      attachComputedFields(serializeEntry(entry), fields),
    ),

    references:
      projectReferences.map(
        (reference) => ({
          id: reference.id,
          projectId:
            reference.referencedProjectId,
          projectName:
            reference.referencedProjectName,
        }),
      ),
  };
}

async function createEntryService({
  projectId,
  userId,
  data,
}) {
  return repository.withTransaction(
    async (tx) => {
      const project =
        await tx.getOwnedProject(
          projectId,
          userId,
        );

      if (!project) {
        throw createHttpError(
          404,
          "Project not found",
        );
      }

      const existingFields =
        await tx.getProjectFields(
          projectId,
        );

      const existingFieldMap =
        new Map(
          existingFields.map(
            (field) => [
              field.id,
              field,
            ],
          ),
        );

      for (const suppliedValue of data.values) {
        if (
          !existingFieldMap.has(
            suppliedValue.fieldId,
          )
        ) {
          throw createHttpError(
            400,
            "One of the submitted fields does not belong to this project",
          );
        }
      }

      const usedNames = new Set(
        existingFields.map(
          (field) =>
            field.name
              .trim()
              .toLowerCase(),
        ),
      );

      for (const field of data.newFields) {
        const normalizedName =
          field.name
            .trim()
            .toLowerCase();

        if (usedNames.has(normalizedName)) {
          throw createHttpError(
            409,
            `A field named "${field.name}" already exists`,
          );
        }

        usedNames.add(
          normalizedName,
        );
      }

      const referenceProjectIds = [
        ...new Set(
          data.referenceProjectIds || [],
        ),
      ];

      if (
        referenceProjectIds.includes(
          projectId,
        )
      ) {
        throw createHttpError(
          400,
          "An entry cannot reference its own project",
        );
      }

      if (
        referenceProjectIds.length > 0
      ) {
        const ownedIds =
          await tx.getOwnedProjectIds(
            referenceProjectIds,
            userId,
          );

        if (
          ownedIds.length !==
          referenceProjectIds.length
        ) {
          throw createHttpError(
            400,
            "One of the referenced projects does not belong to you",
          );
        }
      }

      const maxPosition =
        existingFields.reduce(
          (max, field) =>
            Math.max(
              max,
              field.position || 0,
            ),
          0,
        );

      const newlyCreatedFields = [];

      for (
        let index = 0;
        index < data.newFields.length;
        index += 1
      ) {
        const requestedField =
          data.newFields[index];

        const createdField =
          await tx.createProjectField({
            projectId,
            name:
              requestedField.name.trim(),
            fieldType:
              requestedField.type,
            formula:
              requestedField.type === "computed"
                ? requestedField.formula
                : null,
            position:
              maxPosition +
              index +
              1,
            required: false,
          });

        newlyCreatedFields.push({
          ...createdField,
          clientId:
            requestedField.clientId,
          submittedValue:
            requestedField.value,
        });
      }

      const entry =
        await tx.createEntry({
          projectId,
          createdById: userId,
          name: data.name.trim(),
          durationMinutes:
            data.durationMinutes,
          dueAt: data.dueAt ?? null,
        });

      const valuesToCreate = [];

      for (
        const submitted of data.values
      ) {
        const field =
          existingFieldMap.get(
            submitted.fieldId,
          );

        const converted =
          convertValue(
            field,
            submitted.value,
          );

        if (converted) {
          valuesToCreate.push({
            entryId: entry.id,
            fieldId: field.id,
            ...converted,
          });
        }
      }

      for (
        const field of newlyCreatedFields
      ) {
        const converted =
          convertValue(
            field,
            field.submittedValue,
          );

        if (converted) {
          valuesToCreate.push({
            entryId: entry.id,
            fieldId: field.id,
            ...converted,
          });
        }
      }

      if (valuesToCreate.length > 0) {
        await tx.createEntryFieldValues(
          valuesToCreate,
        );
      }

      if (data.checklist?.length) {
        await tx.createChecklistItems(
          entry.id,
          data.checklist,
        );
      }

      if (
        referenceProjectIds.length
      ) {
        await tx.createEntryProjectReferences(
          entry.id,
          referenceProjectIds,
        );
      }

      const referenceEntryIds = [
        ...new Set(
          data.referenceEntryIds || [],
        ),
      ];

      if (
        referenceEntryIds.includes(
          entry.id,
        )
      ) {
        throw createHttpError(
          400,
          "An entry cannot reference itself",
        );
      }

      if (
        referenceEntryIds.length > 0
      ) {
        const ownedEntryIds =
          await tx.getOwnedEntryIds(
            referenceEntryIds,
            userId,
          );

        if (
          ownedEntryIds.length !==
          referenceEntryIds.length
        ) {
          throw createHttpError(
            400,
            "One of the referenced entries does not belong to you",
          );
        }

        await tx.createEntryEntryReferences(
          entry.id,
          referenceEntryIds,
        );
      }

      const linkedEntryIds = [
        ...new Set(
          data.linkedEntryIds || [],
        ),
      ];

      if (
        linkedEntryIds.includes(
          entry.id,
        )
      ) {
        throw createHttpError(
          400,
          "An entry cannot link to itself",
        );
      }

      if (linkedEntryIds.length > 0) {
        const linkedEntries =
          await tx.getEntriesByIdsForProject(
            linkedEntryIds,
            projectId,
          );

        if (
          linkedEntries.length !==
          linkedEntryIds.length
        ) {
          throw createHttpError(
            400,
            "One or more linked entries do not belong to this project",
          );
        }

        await tx.createEntryLinks(
          entry.id,
          linkedEntryIds,
        );
      }

      const completeEntry =
        await tx.getEntryById(
          entry.id,
        );

      return serializeEntry(
        completeEntry,
      );
    },
  );
}

async function deleteChecklistItemService({
  entryId,
  itemId,
  userId,
}) {
  const ownedEntry =
    await repository.getOwnedEntry(
      entryId,
      userId,
    );

  if (!ownedEntry) {
    throw createHttpError(
      404,
      "Entry not found",
    );
  }

  const deleted =
    await repository.deleteChecklistItem(
      entryId,
      itemId,
    );

  if (!deleted) {
    throw createHttpError(
      404,
      "Checklist item not found",
    );
  }

  return {
    id: deleted.id,
  };
}

async function updateProjectReferencesService({
  projectId,
  userId,
  projectIds,
}) {
  return repository.withTransaction(
    async (tx) => {
      const project =
        await tx.getOwnedProject(
          projectId,
          userId,
        );

      if (!project) {
        throw createHttpError(
          404,
          "Project not found",
        );
      }

      const uniqueProjectIds = [
        ...new Set(projectIds || []),
      ];

      if (
        uniqueProjectIds.includes(
          projectId,
        )
      ) {
        throw createHttpError(
          400,
          "A project cannot reference itself",
        );
      }

      if (
        uniqueProjectIds.length > 0
      ) {
        const ownedIds =
          await tx.getOwnedProjectIds(
            uniqueProjectIds,
            userId,
          );

        if (
          ownedIds.length !==
          uniqueProjectIds.length
        ) {
          throw createHttpError(
            400,
            "One of the referenced projects does not belong to you",
          );
        }
      }

      const existing =
        await tx.getProjectReferences(
          projectId,
        );

      const existingIds = new Set(
        existing.map(
          (reference) =>
            reference.referencedProjectId,
        ),
      );

      const desiredIds =
        new Set(uniqueProjectIds);

      const idsToAdd =
        uniqueProjectIds.filter(
          (referenceId) =>
            !existingIds.has(
              referenceId,
            ),
        );

      const idsToRemove =
        existing
          .map(
            (reference) =>
              reference.referencedProjectId,
          )
          .filter(
            (referenceId) =>
              !desiredIds.has(
                referenceId,
              ),
          );

      if (idsToAdd.length > 0) {
        await tx.createProjectReferences(
          projectId,
          idsToAdd,
        );
      }

      if (idsToRemove.length > 0) {
        await tx.removeProjectReferences(
          projectId,
          idsToRemove,
        );
      }

      return tx.getProjectReferences(
        projectId,
      );
    },
  );
}

async function updateEntryProjectReferencesService({
  entryId,
  userId,
  projectIds,
}) {
  return repository.withTransaction(
    async (tx) => {
      const ownedEntry =
        await tx.getOwnedEntry(
          entryId,
          userId,
        );

      if (!ownedEntry) {
        throw createHttpError(
          404,
          "Entry not found",
        );
      }

      const uniqueProjectIds = [
        ...new Set(projectIds || []),
      ];

      const currentEntry =
        await tx.getEntryById(
          entryId,
        );

      if (!currentEntry) {
        throw createHttpError(
          404,
          "Entry not found",
        );
      }

      if (
        uniqueProjectIds.includes(
          currentEntry.projectId,
        )
      ) {
        throw createHttpError(
          400,
          "An entry cannot reference its own project",
        );
      }

      if (
        uniqueProjectIds.length > 0
      ) {
        const ownedProjectIds =
          await tx.getOwnedProjectIds(
            uniqueProjectIds,
            userId,
          );

        if (
          ownedProjectIds.length !==
          uniqueProjectIds.length
        ) {
          throw createHttpError(
            400,
            "One of the referenced projects does not belong to you",
          );
        }
      }

      const existing =
        await tx.getEntryProjectReferences(
          entryId,
        );

      const existingIds = new Set(
        existing.map(
          (reference) =>
            reference.projectId,
        ),
      );

      const desiredIds =
        new Set(uniqueProjectIds);

      const idsToAdd =
        uniqueProjectIds.filter(
          (projectId) =>
            !existingIds.has(projectId),
        );

      const idsToRemove =
        existing
          .map(
            (reference) =>
              reference.projectId,
          )
          .filter(
            (projectId) =>
              !desiredIds.has(projectId),
          );

      if (idsToAdd.length > 0) {
        await tx.createEntryProjectReferences(
          entryId,
          idsToAdd,
        );
      }

      if (idsToRemove.length > 0) {
        await tx.removeEntryProjectReferences(
          entryId,
          idsToRemove,
        );
      }

      return tx.getEntryProjectReferences(
        entryId,
      );
    },
  );
}

async function updateEntryReferencesService({
  entryId,
  userId,
  entryIds,
}) {
  return repository.withTransaction(
    async (tx) => {
      const ownedEntry =
        await tx.getOwnedEntry(
          entryId,
          userId,
        );

      if (!ownedEntry) {
        throw createHttpError(
          404,
          "Entry not found",
        );
      }

      const uniqueEntryIds = [
        ...new Set(entryIds || []),
      ];

      if (
        uniqueEntryIds.includes(
          entryId,
        )
      ) {
        throw createHttpError(
          400,
          "An entry cannot reference itself",
        );
      }

      if (
        uniqueEntryIds.length > 0
      ) {
        const ownedEntryIds =
          await tx.getOwnedEntryIds(
            uniqueEntryIds,
            userId,
          );

        if (
          ownedEntryIds.length !==
          uniqueEntryIds.length
        ) {
          throw createHttpError(
            400,
            "One of the referenced entries does not belong to you",
          );
        }
      }

      const currentEntry =
        await tx.getEntryById(
          entryId,
        );

      if (!currentEntry) {
        throw createHttpError(
          404,
          "Entry not found",
        );
      }

      const existingIds = new Set(
        (currentEntry.entryReferences || [])
          .map(
            (reference) =>
              reference.referencedEntryId,
          ),
      );

      const desiredIds =
        new Set(uniqueEntryIds);

      const idsToAdd =
        uniqueEntryIds.filter(
          (referenceId) =>
            !existingIds.has(
              referenceId,
            ),
        );

      const idsToRemove =
        Array.from(existingIds).filter(
          (referenceId) =>
            !desiredIds.has(
              referenceId,
            ),
        );

      if (idsToAdd.length > 0) {
        await tx.createEntryEntryReferences(
          entryId,
          idsToAdd,
        );
      }

      if (idsToRemove.length > 0) {
        await tx.removeEntryEntryReferences(
          entryId,
          idsToRemove,
        );
      }

      const updatedEntry =
        await tx.getEntryById(
          entryId,
        );

      return serializeEntry(
        updatedEntry,
      );
    },
  );
}

async function updateEntryService({
  projectId,
  entryId,
  userId,
  data,
}) {
  return repository.withTransaction(
    async (tx) => {
      const project =
        await tx.getOwnedProject(
          projectId,
          userId,
        );

      if (!project) {
        throw createHttpError(
          404,
          "Project not found",
        );
      }

      if (project.archivedAt) {
        throw createHttpError(
          409,
          "Archived projects cannot be edited",
        );
      }

      const entry =
        await tx.getEntryById(
          entryId,
        );

      if (
        !entry ||
        entry.projectId !== projectId
      ) {
        throw createHttpError(
          404,
          "Entry not found",
        );
      }

      const requestedFieldIds = [
        ...new Set(
          data.fieldIds || [],
        ),
      ];

      const fields =
        await tx.getProjectFields(
          projectId,
        );

      const fieldMap = new Map(
        fields.map(
          (field) => [
            field.id,
            field,
          ],
        ),
      );

      for (
        const fieldId of requestedFieldIds
      ) {
        if (!fieldMap.has(fieldId)) {
          throw createHttpError(
            400,
            "One of the submitted fields does not belong to this project",
          );
        }
      }

      const usedNames = new Set(
        fields.map(
          (field) =>
            field.name
              .trim()
              .toLowerCase(),
        ),
      );

      const newFields =
        data.newFields || [];

      const createdFields = [];

      const maxPosition =
        fields.reduce(
          (max, field) =>
            Math.max(
              max,
              field.position || 0,
            ),
          -1,
        );

      for (
        let index = 0;
        index < newFields.length;
        index += 1
      ) {
        const requested =
          newFields[index];

        const normalizedName =
          requested.name
            .trim()
            .toLowerCase();

        if (
          usedNames.has(
            normalizedName,
          )
        ) {
          throw createHttpError(
            409,
            `A field named "${requested.name}" already exists`,
          );
        }

        usedNames.add(
          normalizedName,
        );

        const created =
          await tx.createProjectField({
            projectId,
            name:
              requested.name.trim(),
            fieldType:
              requested.type,
            formula:
              requested.type === "computed"
                ? requested.formula
                : null,
            position:
              maxPosition +
              index +
              1,
            required: false,
          });

        createdFields.push({
          ...created,
          clientId:
            requested.clientId,
          submittedValue:
            requested.value,
        });
      }

      const valuesByField =
        new Map(
          (data.values || []).map(
            (item) => [
              item.fieldId,
              item.value,
            ],
          ),
        );

      const convertedValues = [];

      for (
        const fieldId of requestedFieldIds
      ) {
        const field =
          fieldMap.get(fieldId);

        const converted =
          convertValue(
            field,
            valuesByField.get(
              fieldId,
            ),
          );

        if (converted) {
          convertedValues.push({
            entryId,
            fieldId,
            ...converted,
          });
        }
      }

      for (
        const field of createdFields
      ) {
        const converted =
          convertValue(
            field,
            field.submittedValue,
          );

        if (converted) {
          convertedValues.push({
            entryId,
            fieldId: field.id,
            ...converted,
          });
        }
      }

      const removedFieldIds =
        fields
          .filter(
            (field) =>
              !requestedFieldIds.includes(
                field.id,
              ),
          )
          .map(
            (field) =>
              field.id,
          );

      const protectedRemoved =
        fields.filter(
          (field) =>
            removedFieldIds.includes(
              field.id,
            ) &&
            field.usedByEntries,
        );

      if (
        protectedRemoved.length > 0
      ) {
        throw createHttpError(
          409,
          "A field used by an entry cannot be removed",
        );
      }

      const updatedRow =
        await tx.updateEntry(
          entryId,
          data,
        );

      await tx.replaceEntryFieldValues(
        entryId,
        convertedValues,
      );

      await tx.archiveProjectFields(
        removedFieldIds,
      );

      if (data.checklistItems !== undefined) {
        const existingChecklist = Array.isArray(entry.checklist)
          ? entry.checklist
          : [];
        const existingById = new Map(
          existingChecklist.map((item) => [item.id, item]),
        );
        const requestedItems = data.checklistItems || [];
        const requestedIds = new Set(requestedItems.map((item) => item.id));

        for (const item of requestedItems) {
          const existingItem = existingById.get(item.id);
          if (!existingItem) {
            throw createHttpError(
              400,
              "One of the submitted checklist items does not belong to this entry",
            );
          }

          if (existingItem.completed && item.text !== existingItem.text) {
            throw createHttpError(
              409,
              "Completed checklist items cannot be edited",
            );
          }
        }

        for (const existingItem of existingChecklist) {
          if (!requestedIds.has(existingItem.id)) {
            if (existingItem.completed) {
              throw createHttpError(
                409,
                "Completed checklist items cannot be removed",
              );
            }
            await tx.deleteChecklistItem(entryId, existingItem.id);
            continue;
          }

          const requestedItem = requestedItems.find(
            (item) => item.id === existingItem.id,
          );

          if (
            requestedItem &&
            (requestedItem.text !== existingItem.text ||
              requestedItem.completed !== existingItem.completed)
          ) {
            await tx.updateChecklistItem(
              entryId,
              existingItem.id,
              {
                text: requestedItem.text,
                completed: requestedItem.completed,
              },
            );
          }
        }
      }

      if (data.newChecklistItems?.length) {
        const existingChecklistCount = Array.isArray(entry.checklist)
          ? entry.checklist.length
          : 0;
        const requestedExistingCount = data.checklistItems !== undefined
          ? data.checklistItems.length
          : existingChecklistCount;

        if (requestedExistingCount + data.newChecklistItems.length > 100) {
          throw createHttpError(
            400,
            "A checklist can contain at most 100 items.",
          );
        }

        await tx.createChecklistItems(
          entryId,
          data.newChecklistItems,
        );
      }

      const linkedEntryIds = [
        ...new Set(
          data.linkedEntryIds || [],
        ),
      ];

      if (
        linkedEntryIds.includes(
          entryId,
        )
      ) {
        throw createHttpError(
          400,
          "An entry cannot link to itself",
        );
      }

      if (
        linkedEntryIds.length > 0
      ) {
        const linkedEntries =
          await tx.getEntriesByIdsForProject(
            linkedEntryIds,
            projectId,
          );

        if (
          linkedEntries.length !==
          linkedEntryIds.length
        ) {
          throw createHttpError(
            400,
            "One or more linked entries do not belong to this project",
          );
        }

        await tx.createEntryLinks(
          entryId,
          linkedEntryIds,
        );
      }

      return {
        id: updatedRow.id,
        name: updatedRow.name,
        durationMinutes:
          updatedRow.duration_minutes,
        occurredAt:
          updatedRow.occurred_at,
        updatedAt:
          updatedRow.updated_at,
      };
    },
  );
}

async function updateChecklistItemService({
  entryId,
  itemId,
  userId,
  changes,
}) {
  const ownedEntry =
    await repository.getOwnedEntry(
      entryId,
      userId,
    );

  if (!ownedEntry) {
    throw createHttpError(
      404,
      "Entry not found",
    );
  }

  const item =
    await repository.updateChecklistItem(
      entryId,
      itemId,
      changes,
    );

  if (!item) {
    throw createHttpError(
      404,
      "Checklist item not found",
    );
  }

  return serializeChecklist(item);
}

async function getOutstandingEntriesService({ projectId, userId }) {
  const project = await repository.getOwnedProject(projectId, userId);
  if (!project) {
    throw createHttpError(404, "Project not found");
  }
  const [entries, fields] = await Promise.all([
    repository.getOutstandingEntries(projectId),
    repository.getProjectFields(projectId),
  ]);
  return entries.map((entry) =>
    attachComputedFields(serializeEntry(entry), fields),
  );
}

module.exports = {
  getProjectDetailsService,
  createEntryService,
  updateChecklistItemService,
  deleteChecklistItemService,
  updateProjectReferencesService,
  updateEntryProjectReferencesService,
  updateEntryReferencesService,
  updateEntryService,
  buildLinkedEntriesMap,
};