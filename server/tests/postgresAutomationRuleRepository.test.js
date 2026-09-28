const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../db");
const repository = require("../repositories/postgresAutomationRuleRepository");

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const OWNER_ID = "22222222-2222-2222-2222-222222222222";
const RULE_ID = "66666666-6666-6666-6666-666666666666";
const SECOND_RULE_ID = "99999999-9999-4999-8999-999999999999";
const FIELD_ID = "44444444-4444-4444-4444-444444444444";
const CREATED_AT = new Date("2026-09-01T09:00:00.000Z");
const UPDATED_AT = new Date("2026-09-02T10:30:00.000Z");

const MAPPED_COLUMNS =
  "id, owner_id, project_id, name, condition_field_id, condition_operator, condition_value, action_type, action_value, enabled, created_at, updated_at";

function normalizeSql(text) {
  return text.replace(/\s+/g, " ").trim();
}

function makeRow(overrides = {}) {
  return {
    id: RULE_ID,
    owner_id: OWNER_ID,
    project_id: PROJECT_ID,
    name: "Tag completed work",
    condition_field_id: FIELD_ID,
    condition_operator: "equals",
    condition_value: "completed",
    action_type: "add_tag",
    action_value: "completed",
    enabled: true,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function makeRule(overrides = {}) {
  return {
    id: RULE_ID,
    ownerId: OWNER_ID,
    projectId: PROJECT_ID,
    name: "Tag completed work",
    conditionFieldId: FIELD_ID,
    conditionOperator: "equals",
    conditionValue: "completed",
    actionType: "add_tag",
    actionValue: "completed",
    enabled: true,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function mockDbQuery(t, implementation) {
  const mocked = t.mock.method(db, "query", implementation);
  t.after(() => mocked.mock.restore());
  return mocked;
}

test("createAutomationRule inserts the rule with every field and maps the returned row", async (t) => {
  const query = mockDbQuery(t, async (text, parameters) => {
    const sql = normalizeSql(text);
    assert.match(
      sql,
      /^INSERT INTO automation_rules \( owner_id, project_id, name, condition_field_id, condition_operator, condition_value, action_type, action_value, enabled \)/,
    );
    assert.match(sql, /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9\)/);
    assert.match(sql, new RegExp(`RETURNING ${MAPPED_COLUMNS}$`));
    assert.deepEqual(parameters, [
      OWNER_ID,
      PROJECT_ID,
      "Tag completed work",
      FIELD_ID,
      "equals",
      "completed",
      "add_tag",
      "completed",
      true,
    ]);
    return { rows: [makeRow()], rowCount: 1 };
  });

  const rule = await repository.createAutomationRule({
    ownerId: OWNER_ID,
    projectId: PROJECT_ID,
    name: "Tag completed work",
    conditionFieldId: FIELD_ID,
    conditionOperator: "equals",
    conditionValue: "completed",
    actionType: "add_tag",
    actionValue: "completed",
    enabled: true,
  });

  assert.equal(query.mock.callCount(), 1);
  assert.deepEqual(rule, makeRule());
});

test("createAutomationRule stores an omitted condition value as null and defaults enabled to true", async (t) => {
  let parameters;
  mockDbQuery(t, async (text, values) => {
    parameters = values;
    return {
      rows: [makeRow({ condition_value: null, enabled: true })],
      rowCount: 1,
    };
  });

  const rule = await repository.createAutomationRule({
    ownerId: OWNER_ID,
    projectId: PROJECT_ID,
    name: "Anything changed",
    conditionFieldId: FIELD_ID,
    conditionOperator: "not_equals",
    actionType: "add_tag",
    actionValue: "touched",
  });

  assert.deepEqual(parameters, [
    OWNER_ID,
    PROJECT_ID,
    "Anything changed",
    FIELD_ID,
    "not_equals",
    null,
    "add_tag",
    "touched",
    true,
  ]);
  assert.equal(rule.conditionValue, null);
  assert.equal(rule.enabled, true);
});

test("getAutomationRulesForProject filters by owner and project and maps every row", async (t) => {
  const rows = [
    makeRow(),
    makeRow({
      id: SECOND_RULE_ID,
      name: "Long sessions",
      condition_operator: "greater_than",
      condition_value: 8,
      action_value: "long",
      enabled: false,
      updated_at: UPDATED_AT,
    }),
  ];
  const query = mockDbQuery(t, async (text, parameters) => {
    const sql = normalizeSql(text);
    assert.match(sql, new RegExp(`^SELECT ${MAPPED_COLUMNS} FROM automation_rules`));
    assert.match(sql, /WHERE owner_id = \$1 AND project_id = \$2/);
    assert.match(sql, /ORDER BY created_at DESC$/);
    assert.deepEqual(parameters, [OWNER_ID, PROJECT_ID]);
    return { rows, rowCount: rows.length };
  });

  const rules = await repository.getAutomationRulesForProject({
    ownerId: OWNER_ID,
    projectId: PROJECT_ID,
  });

  assert.equal(query.mock.callCount(), 1);
  assert.deepEqual(rules, [
    makeRule(),
    makeRule({
      id: SECOND_RULE_ID,
      name: "Long sessions",
      conditionOperator: "greater_than",
      conditionValue: 8,
      actionValue: "long",
      enabled: false,
      updatedAt: UPDATED_AT,
    }),
  ]);
});

test("getAutomationRulesForProject returns an empty list when the owner has no rules in the project", async (t) => {
  mockDbQuery(t, async () => ({ rows: [], rowCount: 0 }));

  assert.deepEqual(
    await repository.getAutomationRulesForProject({
      ownerId: OWNER_ID,
      projectId: PROJECT_ID,
    }),
    [],
  );
});

test("getAutomationRuleById scopes by rule and owner and maps the row", async (t) => {
  const query = mockDbQuery(t, async (text, parameters) => {
    const sql = normalizeSql(text);
    assert.match(sql, new RegExp(`^SELECT ${MAPPED_COLUMNS} FROM automation_rules`));
    assert.match(sql, /WHERE id = \$1 AND owner_id = \$2 LIMIT 1$/);
    assert.deepEqual(parameters, [RULE_ID, OWNER_ID]);
    return { rows: [makeRow({ condition_value: null })], rowCount: 1 };
  });

  const rule = await repository.getAutomationRuleById({
    ruleId: RULE_ID,
    ownerId: OWNER_ID,
  });

  assert.equal(query.mock.callCount(), 1);
  assert.deepEqual(rule, makeRule({ conditionValue: null }));
});

test("getAutomationRuleById returns null when the owner has no such rule", async (t) => {
  mockDbQuery(t, async () => ({ rows: [], rowCount: 0 }));

  assert.equal(
    await repository.getAutomationRuleById({
      ruleId: RULE_ID,
      ownerId: OWNER_ID,
    }),
    null,
  );
});

test("mapAutomationRule returns null for an absent row", () => {
  assert.equal(repository.mapAutomationRule(undefined), null);
  assert.equal(repository.mapAutomationRule(null), null);
});

test("updateAutomationRule updates every mutable column within the owner scope and maps the result", async (t) => {
  const updatedRow = makeRow({
    name: "Renamed rule",
    condition_value: "done",
    action_value: "done",
    enabled: false,
    updated_at: UPDATED_AT,
  });
  const query = mockDbQuery(t, async (text, parameters) => {
    const sql = normalizeSql(text);
    assert.match(
      sql,
      /^UPDATE automation_rules SET name = \$3, condition_field_id = \$4, condition_operator = \$5, condition_value = \$6, action_type = \$7, action_value = \$8, enabled = \$9, updated_at = NOW\(\)/,
    );
    assert.match(sql, /WHERE id = \$1 AND owner_id = \$2/);
    assert.match(sql, new RegExp(`RETURNING ${MAPPED_COLUMNS}$`));
    assert.deepEqual(parameters, [
      RULE_ID,
      OWNER_ID,
      "Renamed rule",
      FIELD_ID,
      "equals",
      "done",
      "add_tag",
      "done",
      false,
    ]);
    return { rows: [updatedRow], rowCount: 1 };
  });

  const rule = await repository.updateAutomationRule({
    ruleId: RULE_ID,
    ownerId: OWNER_ID,
    name: "Renamed rule",
    conditionFieldId: FIELD_ID,
    conditionOperator: "equals",
    conditionValue: "done",
    actionType: "add_tag",
    actionValue: "done",
    enabled: false,
  });

  assert.equal(query.mock.callCount(), 1);
  assert.deepEqual(
    rule,
    makeRule({
      name: "Renamed rule",
      conditionValue: "done",
      actionValue: "done",
      enabled: false,
      updatedAt: UPDATED_AT,
    }),
  );
});

test("updateAutomationRule persists an omitted condition value as null", async (t) => {
  let parameters;
  mockDbQuery(t, async (text, values) => {
    parameters = values;
    return { rows: [makeRow({ condition_value: null })], rowCount: 1 };
  });

  const rule = await repository.updateAutomationRule({
    ruleId: RULE_ID,
    ownerId: OWNER_ID,
    name: "Tag completed work",
    conditionFieldId: FIELD_ID,
    conditionOperator: "equals",
    actionType: "add_tag",
    actionValue: "completed",
    enabled: true,
  });

  assert.equal(parameters[5], null);
  assert.equal(rule.conditionValue, null);
});

test("deleteAutomationRule reports whether a scoped row was deleted", async (t) => {
  const results = [
    { rows: [{ id: RULE_ID }], rowCount: 1 },
    { rows: [], rowCount: 0 },
  ];
  const query = mockDbQuery(t, async (text, parameters) => {
    const sql = normalizeSql(text);
    assert.match(sql, /^DELETE FROM automation_rules/);
    assert.match(sql, /WHERE id = \$1 AND owner_id = \$2/);
    assert.match(sql, /RETURNING id$/);
    assert.deepEqual(parameters, [RULE_ID, OWNER_ID]);
    return results.shift();
  });

  assert.equal(
    await repository.deleteAutomationRule({
      ruleId: RULE_ID,
      ownerId: OWNER_ID,
    }),
    true,
  );
  assert.equal(
    await repository.deleteAutomationRule({
      ruleId: RULE_ID,
      ownerId: OWNER_ID,
    }),
    false,
  );
  assert.equal(query.mock.callCount(), 2);
});
