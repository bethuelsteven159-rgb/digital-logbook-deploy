const savedFilterRepository = require("../repositories/postgresSavedFilterRepository");
const projectDetailsRepository = require("../repositories/projectDetailsRepository");
const { serializeEntry } = require("./projectDetailsService");

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function createSavedFilterService({ ownerId, projectId, data }) {
  const project = await projectDetailsRepository.getOwnedProject(
    projectId,
    ownerId,
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  return savedFilterRepository.createSavedFilter({
    ownerId,
    projectId,
    name: data.name.trim(),
    criteria: data.criteria,
  });
}

async function listSavedFiltersService({ ownerId, projectId }) {
  const project = await projectDetailsRepository.getOwnedProject(
    projectId,
    ownerId,
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  return savedFilterRepository.getSavedFiltersForProject({
    ownerId,
    projectId,
  });
}

async function deleteSavedFilterService({ ownerId, filterId }) {
  const existing = await savedFilterRepository.getSavedFilterById({
    filterId,
    ownerId,
  });

  if (!existing) {
    throw createHttpError(404, "Saved filter not found");
  }

  await savedFilterRepository.deleteSavedFilter({ filterId, ownerId });

  return { id: filterId };
}

function matchesCriterion(entry, criterion) {
  let actualValue;

  if (criterion.fieldName) {
    actualValue = entry[criterion.fieldName];
  } else if (criterion.fieldId) {
    const match = (entry.values || []).find(
      (value) => value.fieldId === criterion.fieldId,
    );
    actualValue = match ? match.value : undefined;
  }

  if (actualValue === undefined || actualValue === null) {
    return false;
  }

  switch (criterion.operator) {
    case "equals":
      return String(actualValue) === String(criterion.value);

    case "not_equals":
      return String(actualValue) !== String(criterion.value);

    case "contains":
      return String(actualValue)
        .toLowerCase()
        .includes(String(criterion.value).toLowerCase());

    case "greater_than":
      return Number(actualValue) > Number(criterion.value);

    case "less_than":
      return Number(actualValue) < Number(criterion.value);

    default:
      return false;
  }
}

async function applySavedFilterService({ ownerId, filterId, projectId }) {
  const filter = await savedFilterRepository.getSavedFilterById({
    filterId,
    ownerId,
  });

  if (!filter) {
    throw createHttpError(404, "Saved filter not found");
  }

  const project = await projectDetailsRepository.getOwnedProject(
    projectId,
    ownerId,
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

    const entries = await projectDetailsRepository.getProjectEntries(projectId);
    const serializedEntries = entries.map(serializeEntry);

    return serializedEntries.filter((entry) =>
        filter.criteria.every((criterion) => matchesCriterion(entry, criterion)),
    );
    }
module.exports = {
  createSavedFilterService,
  listSavedFiltersService,
  deleteSavedFilterService,
  applySavedFilterService,
  matchesCriterion,
};
