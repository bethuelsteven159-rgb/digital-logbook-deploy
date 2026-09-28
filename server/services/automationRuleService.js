const automationRuleRepository = require("../repositories/postgresAutomationRuleRepository");
const projectDetailsRepository = require("../repositories/projectDetailsRepository");

const MAX_ENTRY_TAGS = 10;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// Mirrors the saved-filter matching semantics, kept private to the
// automation feature so savedFilterService stays untouched.
function matchesRuleCondition(values, rule) {
  const actualValue = (Array.isArray(values) ? values : []).find(
    (value) => value && value.fieldId === rule.conditionFieldId,
  )?.value;

  if (actualValue === undefined || actualValue === null) {
    return false;
  }

  if (
    rule.conditionValue === undefined ||
    rule.conditionValue === null
  ) {
    return false;
  }

  switch (rule.conditionOperator) {
    case "equals":
      return String(actualValue) === String(rule.conditionValue);

    case "not_equals":
      return String(actualValue) !== String(rule.conditionValue);

    case "contains":
      return String(actualValue)
        .toLowerCase()
        .includes(String(rule.conditionValue).toLowerCase());

    case "greater_than":
      return Number(actualValue) > Number(rule.conditionValue);

    case "less_than":
      return Number(actualValue) < Number(rule.conditionValue);

    default:
      return false;
  }
}

async function applyAutomationRulesForEntry({
  tx,
  projectId,
  entryId,
  values,
  existingTags = [],
}) {
  const rules = await tx.getEnabledAutomationRules(projectId);

  if (!Array.isArray(rules) || rules.length === 0) {
    return { applied: false, tags: existingTags };
  }

  const tagsToAdd = [];

  for (const rule of rules) {
    if (!rule || typeof rule !== "object") {
      continue;
    }

    if (rule.actionType !== "add_tag") {
      continue;
    }

    if (matchesRuleCondition(values, rule)) {
      tagsToAdd.push(rule.actionValue);
    }
  }

  if (tagsToAdd.length === 0) {
    return { applied: false, tags: existingTags };
  }

  const existing = Array.isArray(existingTags) ? existingTags : [];
  const combined = [...existing];

  for (const tag of tagsToAdd) {
    if (typeof tag !== "string") {
      continue;
    }

    const normalized = tag.trim().toLowerCase();

    if (!normalized || combined.includes(normalized)) {
      continue;
    }

    if (combined.length >= MAX_ENTRY_TAGS) {
      break;
    }

    combined.push(normalized);
  }

  if (combined.length === existing.length) {
    return { applied: false, tags: existing };
  }

  await tx.setEntryTags(entryId, combined);

  return { applied: true, tags: combined };
}

async function assertConditionFieldUsable({
  projectId,
  conditionFieldId,
}) {
  const fields = await projectDetailsRepository.getProjectFields(
    projectId,
    { includeArchived: true },
  );

  const field = fields.find(
    (field) => field.id === conditionFieldId,
  );

  if (!field) {
    throw createHttpError(
      400,
      "Condition field does not belong to this project",
    );
  }

  if (field.archivedAt) {
    throw createHttpError(
      400,
      "Archived fields cannot be used in automation rules",
    );
  }
}

async function createAutomationRuleService({
  ownerId,
  projectId,
  data,
}) {
  const project = await projectDetailsRepository.getOwnedProject(
    projectId,
    ownerId,
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  await assertConditionFieldUsable({
    projectId,
    conditionFieldId: data.conditionFieldId,
  });

  return automationRuleRepository.createAutomationRule({
    ownerId,
    projectId,
    name: data.name,
    conditionFieldId: data.conditionFieldId,
    conditionOperator: data.conditionOperator,
    conditionValue: data.conditionValue,
    actionType: data.actionType,
    actionValue: data.actionValue,
    enabled: data.enabled,
  });
}

async function listAutomationRulesService({ ownerId, projectId }) {
  const project = await projectDetailsRepository.getOwnedProject(
    projectId,
    ownerId,
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  return automationRuleRepository.getAutomationRulesForProject({
    ownerId,
    projectId,
  });
}

async function updateAutomationRuleService({
  ownerId,
  ruleId,
  data,
}) {
  const existing = await automationRuleRepository.getAutomationRuleById({
    ruleId,
    ownerId,
  });

  if (!existing) {
    throw createHttpError(404, "Automation rule not found");
  }

  if (data.conditionFieldId !== undefined) {
    await assertConditionFieldUsable({
      projectId: existing.projectId,
      conditionFieldId: data.conditionFieldId,
    });
  }

  return automationRuleRepository.updateAutomationRule({
    ruleId,
    ownerId,
    name: data.name !== undefined ? data.name : existing.name,
    conditionFieldId:
      data.conditionFieldId !== undefined
        ? data.conditionFieldId
        : existing.conditionFieldId,
    conditionOperator:
      data.conditionOperator !== undefined
        ? data.conditionOperator
        : existing.conditionOperator,
    conditionValue:
      data.conditionValue !== undefined
        ? data.conditionValue
        : existing.conditionValue,
    actionType:
      data.actionType !== undefined
        ? data.actionType
        : existing.actionType,
    actionValue:
      data.actionValue !== undefined
        ? data.actionValue
        : existing.actionValue,
    enabled: data.enabled !== undefined ? data.enabled : existing.enabled,
  });
}

async function deleteAutomationRuleService({ ownerId, ruleId }) {
  const existing = await automationRuleRepository.getAutomationRuleById({
    ruleId,
    ownerId,
  });

  if (!existing) {
    throw createHttpError(404, "Automation rule not found");
  }

  await automationRuleRepository.deleteAutomationRule({ ruleId, ownerId });

  return { id: ruleId };
}

module.exports = {
  createAutomationRuleService,
  listAutomationRulesService,
  updateAutomationRuleService,
  deleteAutomationRuleService,
  applyAutomationRulesForEntry,
};
