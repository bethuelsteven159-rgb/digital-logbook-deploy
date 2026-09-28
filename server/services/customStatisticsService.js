const { parse, ConstantNode } = require("mathjs");

const repository = require("../repositories/postgresCustomStatisticsRepository");
const projectDetailsRepository = require("../repositories/projectDetailsRepository");

const ALLOWED_AGGREGATES = new Set([
  "sum",
  "avg",
  "min",
  "max",
  "count",
]);

const ALLOWED_OPERATORS = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "^",
]);

const MAX_EXPRESSION_LENGTH = 500;
const MAX_NAME_LENGTH = 100;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function fieldAlias(name) {
  return String(name)
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase();
}

function getAvailableFieldNames(fields) {
  return fields.map((field) => field.name).join(", ");
}

function findFieldByArgument(argumentNode, fields) {
  let argumentName;

  if (argumentNode.isSymbolNode) {
    argumentName = argumentNode.name;
  } else if (
    argumentNode.isConstantNode &&
    typeof argumentNode.value === "string"
  ) {
    argumentName = argumentNode.value;
  } else {
    throw createHttpError(
      400,
      "Aggregate functions need a single field name, for example sum(Score) or sum(\"Call Duration\").",
    );
  }

  const target = String(argumentName).trim().toLowerCase();

  const exactMatches = fields.filter(
    (field) => field.name.trim().toLowerCase() === target,
  );

  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const aliasMatches = fields.filter(
    (field) => fieldAlias(field.name) === fieldAlias(target),
  );

  if (aliasMatches.length === 1) {
    return aliasMatches[0];
  }

  if (
    aliasMatches.length > 1 ||
    exactMatches.length > 1
  ) {
    throw createHttpError(
      400,
      `Field name "${argumentName}" is ambiguous. Use the full field name inside quotes.`,
    );
  }

  throw createHttpError(
    400,
    `Unknown field "${argumentName}". Available fields: ${
      getAvailableFieldNames(fields) || "none"
    }.`,
  );
}

function walkExpression(node, fields, references) {
  if (node.isParenthesisNode) {
    walkExpression(node.content, fields, references);
    return;
  }

  if (node.isConstantNode) {
    if (
      typeof node.value !== "number" ||
      !Number.isFinite(node.value)
    ) {
      throw createHttpError(
        400,
        "Only numeric values are allowed in statistics expressions.",
      );
    }

    return;
  }

  if (node.isOperatorNode) {
    if (!ALLOWED_OPERATORS.has(node.op)) {
      throw createHttpError(
        400,
        `Operator "${node.op}" is not supported. Use +, -, *, /, % or ^.`,
      );
    }

    for (const argument of node.args) {
      walkExpression(argument, fields, references);
    }

    return;
  }

  if (node.isFunctionNode) {
    const aggregateName = node.fn?.name;

    if (!ALLOWED_AGGREGATES.has(aggregateName)) {
      throw createHttpError(
        400,
        `Unsupported function "${aggregateName}()". Use sum(), avg(), min(), max() or count().`,
      );
    }

    if (node.args.length !== 1) {
      throw createHttpError(
        400,
        `${aggregateName}() needs exactly one field, for example ${aggregateName}(Score).`,
      );
    }

    const field = findFieldByArgument(node.args[0], fields);

    if (
      aggregateName !== "count" &&
      field.fieldType !== "number"
    ) {
      throw createHttpError(
        400,
        `Field "${field.name}" is not a number field. Use count("${field.name}") to count its values.`,
      );
    }

    references.push({
      aggregate: aggregateName,
      field,
      key: node.toString(),
    });

    return;
  }

  if (node.isSymbolNode) {
    throw createHttpError(
      400,
      `Fields must be used inside an aggregate function. Try sum(${node.name}) or count(${node.name}).`,
    );
  }

  throw createHttpError(
    400,
    "The expression contains an unsupported element. Use numbers, +, -, *, /, % , ^, brackets and sum(), avg(), min(), max() or count().",
  );
}

function validateCustomStatisticExpression({ expression, fields }) {
  if (typeof expression !== "string" || !expression.trim()) {
    throw createHttpError(400, "Expression is required.");
  }

  const trimmed = expression.trim();

  if (trimmed.length > MAX_EXPRESSION_LENGTH) {
    throw createHttpError(
      400,
      `Expression must be ${MAX_EXPRESSION_LENGTH} characters or fewer.`,
    );
  }

  let root;

  try {
    root = parse(trimmed);
  } catch (parseError) {
    throw createHttpError(
      400,
      `Invalid expression syntax: ${parseError.message}`,
    );
  }

  const references = [];
  walkExpression(root, fields || [], references);

  return { expression: trimmed, references };
}

function buildValueIndex(valueRows) {
  const index = new Map();

  for (const row of valueRows || []) {
    let entry = index.get(row.fieldId);

    if (!entry) {
      entry = { numbers: [], presence: 0 };
      index.set(row.fieldId, entry);
    }

    if (row.valueNumber !== null && row.valueNumber !== undefined) {
      entry.numbers.push(row.valueNumber);
    }

    if (
      row.valueText !== null && row.valueText !== undefined ||
      row.valueNumber !== null && row.valueNumber !== undefined ||
      row.valueDate !== null && row.valueDate !== undefined
    ) {
      entry.presence += 1;
    }
  }

  return index;
}

function computeAggregateValue(aggregate, field, valueIndex) {
  const entry = valueIndex.get(field.id) || {
    numbers: [],
    presence: 0,
  };

  switch (aggregate) {
    case "sum":
      return entry.numbers.reduce((total, value) => total + value, 0);

    case "count":
      return entry.presence;

    case "avg":
      if (entry.numbers.length === 0) {
        return null;
      }
      return (
        entry.numbers.reduce((total, value) => total + value, 0) /
        entry.numbers.length
      );

    case "min":
      if (entry.numbers.length === 0) {
        return null;
      }
      return Math.min(...entry.numbers);

    case "max":
      if (entry.numbers.length === 0) {
        return null;
      }
      return Math.max(...entry.numbers);

    default:
      return null;
  }
}

function evaluateCustomStatisticValue({
  expression,
  fields,
  valueRows,
}) {
  const { references } = validateCustomStatisticExpression({
    expression,
    fields,
  });

  const valueIndex = buildValueIndex(valueRows);
  const aggregatedValues = new Map();

  for (const reference of references) {
    const value = computeAggregateValue(
      reference.aggregate,
      reference.field,
      valueIndex,
    );

    if (value === null) {
      return null;
    }

    aggregatedValues.set(reference.key, value);
  }

  let resolved;

  try {
    resolved = parse(expression)
      .transform((node) => {
        if (
          node.isFunctionNode &&
          aggregatedValues.has(node.toString())
        ) {
          return new ConstantNode(
            aggregatedValues.get(node.toString()),
          );
        }

        return node;
      })
      .compile()
      .evaluate();
  } catch {
    return null;
  }

  if (
    typeof resolved !== "number" ||
    !Number.isFinite(resolved)
  ) {
    return null;
  }

  return Number(resolved.toFixed(6));
}

function normalizeName(name, { required }) {
  if (typeof name !== "string" || !name.trim()) {
    if (required) {
      throw createHttpError(400, "Name is required.");
    }

    return null;
  }

  const trimmed = name.trim();

  if (trimmed.length > MAX_NAME_LENGTH) {
    throw createHttpError(
      400,
      `Name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    );
  }

  return trimmed;
}

function serializeCustomStatistic(stat, result) {
  return {
    id: stat.id,
    projectId: stat.projectId,
    name: stat.name,
    expression: stat.expression,
    value: result.value,
    error: result.error,
    createdAt: stat.createdAt,
    updatedAt: stat.updatedAt,
  };
}

async function getOwnedProjectOrThrow(projectId, ownerId) {
  const project = await projectDetailsRepository.getOwnedProject(
    projectId,
    ownerId,
  );

  if (!project) {
    throw createHttpError(404, "Project not found");
  }

  return project;
}

async function computeValueForExpression({
  expression,
  projectId,
}) {
  const fields = await repository.getProjectFields(projectId);

  try {
    const value = evaluateCustomStatisticValue({
      expression,
      fields,
      valueRows: await repository.getProjectFieldValues(
        projectId,
      ),
    });

    return { value, error: null };
  } catch (error) {
    return {
      value: null,
      error:
        error.message ||
        "This statistic can no longer be calculated.",
    };
  }
}

async function createCustomStatisticService({
  ownerId,
  projectId,
  data,
}) {
  await getOwnedProjectOrThrow(projectId, ownerId);

  const name = normalizeName(data?.name, { required: true });
  const fields = await repository.getProjectFields(projectId);

  const { expression } = validateCustomStatisticExpression({
    expression: data?.expression,
    fields,
  });

  const created = await repository.createCustomStatistic({
    ownerId,
    projectId,
    name,
    expression,
  });

  return serializeCustomStatistic(
    created,
    await computeValueForExpression({ expression, projectId }),
  );
}

async function updateCustomStatisticService({
  ownerId,
  projectId,
  statId,
  data,
}) {
  const existing = await repository.getCustomStatisticById({
    statId,
    ownerId,
  });

  if (
    !existing ||
    (projectId && existing.projectId !== projectId)
  ) {
    throw createHttpError(404, "Custom statistic not found");
  }

  await getOwnedProjectOrThrow(
    existing.projectId,
    ownerId,
  );

  const name = normalizeName(data?.name, { required: true });
  const fields = await repository.getProjectFields(
    existing.projectId,
  );

  const { expression } = validateCustomStatisticExpression({
    expression: data?.expression,
    fields,
  });

  const updated = await repository.updateCustomStatistic({
    statId,
    ownerId,
    name,
    expression,
  });

  return serializeCustomStatistic(
    updated,
    await computeValueForExpression({
      expression,
      projectId: existing.projectId,
    }),
  );
}

async function listCustomStatisticsService({
  ownerId,
  projectId,
}) {
  await getOwnedProjectOrThrow(projectId, ownerId);

  const stats =
    await repository.getCustomStatisticsForProject({
      ownerId,
      projectId,
    });

  if (stats.length === 0) {
    return [];
  }

  const fields = await repository.getProjectFields(projectId);
  const valueRows =
    await repository.getProjectFieldValues(projectId);

  return stats.map((stat) => {
    try {
      const value = evaluateCustomStatisticValue({
        expression: stat.expression,
        fields,
        valueRows,
      });

      return serializeCustomStatistic(stat, {
        value,
        error: null,
      });
    } catch (error) {
      return serializeCustomStatistic(stat, {
        value: null,
        error:
          error.message ||
          "This statistic can no longer be calculated.",
      });
    }
  });
}

async function deleteCustomStatisticService({
  ownerId,
  statId,
}) {
  const existing = await repository.getCustomStatisticById({
    statId,
    ownerId,
  });

  if (!existing) {
    throw createHttpError(404, "Custom statistic not found");
  }

  await repository.deleteCustomStatistic({ statId, ownerId });

  return { id: statId };
}

module.exports = {
  validateCustomStatisticExpression,
  evaluateCustomStatisticValue,
  computeAggregateValue,
  createCustomStatisticService,
  updateCustomStatisticService,
  listCustomStatisticsService,
  deleteCustomStatisticService,
};
