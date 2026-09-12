const { evaluate } = require("mathjs");

function buildScope(values) {
  const scope = {};

  for (const value of values) {
    if (!value.name) {
      continue;
    }

    const safeKey = value.name
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, "_");

    if (
      typeof value.value === "number" ||
      (typeof value.value === "string" &&
        value.value !== "" &&
        !Number.isNaN(Number(value.value)))
    ) {
      scope[safeKey] = Number(value.value);
    }
  }

  return scope;
}

function evaluateFormula(formula, values) {
  if (!formula) {
    return null;
  }

  const scope = buildScope(values);

  try {
    const result = evaluate(formula, scope);

    if (typeof result !== "number" || !Number.isFinite(result)) {
      return null;
    }

    return result;
  } catch (error) {
    return null;
  }
}

module.exports = {
  evaluateFormula,
};
