const { evaluate, parse, SymbolNode } = require('mathjs');

function fieldSymbol(id) {
  return `field_${id.replace(/-/g, '')}`;
}

function bindFormulaToFields(formula, fields) {
  if (!formula) return formula;
  const symbols = new Map(fields.map((field) => [
    field.name.trim().replace(/[^a-zA-Z0-9_]/g, '_'),
    fieldSymbol(field.id),
  ]));
  try {
    return parse(formula).transform((node, path, parent) => {
      if (node.isSymbolNode && symbols.has(node.name) && !(parent?.isFunctionNode && path === 'fn')) {
        return new SymbolNode(symbols.get(node.name));
      }
      return node;
    }).toString();
  } catch {
    return formula;
  }
}

function buildScope(values) {
  const scope = new Map();

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
      scope.set(safeKey, Number(value.value));
      if (value.fieldId) scope.set(fieldSymbol(value.fieldId), Number(value.value));
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
  bindFormulaToFields,
};
