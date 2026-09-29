const test = require("node:test");
const assert = require("node:assert/strict");

const automationRuleRepository = require("../repositories/postgresAutomationRuleRepository");
const projectDetailsRepository = require("../repositories/projectDetailsRepository");

const {
  createAutomationRule,
  listAutomationRules,
  updateAutomationRule,
  deleteAutomationRule,
} = require("../controllers/automationRuleController");

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_PROJECT_ID = "77777777-7777-7777-7777-777777777777";
const OWNER_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_USER_ID = "88888888-8888-8888-8888-888888888888";
const RULE_ID = "66666666-6666-6666-6666-666666666666";
const OTHER_RULE_ID = "99999999-9999-4999-8999-999999999999";
const FIELD_ID = "b3a1c2d4-0000-4000-8000-000000000001";
const CREATED_AT = "2026-09-01T09:00:00.000Z";

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

function makeField(overrides = {}) {
  return {
    id: FIELD_ID,
    projectId: PROJECT_ID,
    name: "Status",
    fieldType: "short_text",
    archivedAt: null,
    ...overrides,
  };
}

function makeCreateBody(overrides = {}) {
  return {
    name: "Tag completed work",
    conditionFieldId: FIELD_ID,
    conditionOperator: "equals",
    conditionValue: "completed",
    actionType: "add_tag",
    actionValue: "completed",
    ...overrides,
  };
}

function createResponse() {
  return {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

function authenticatedRequest({ params = {}, body = {} } = {}) {
  return { user: { id: OWNER_ID }, params, body };
}

async function invoke(handler, request) {
  const response = createResponse();
  const forwarded = [];
  await handler(request, response, (error) => {
    forwarded.push(error);
  });
  return { response, forwarded };
}

function mockMethod(t, object, method, implementation) {
  const mocked = t.mock.method(object, method, implementation);
  t.after(() => mocked.mock.restore());
  return mocked;
}

test("createAutomationRule responds 201 with the created rule and forwards the authenticated owner and parsed body", async (t) => {
  const project = { id: PROJECT_ID, ownerId: OWNER_ID, name: "Project" };
  const rule = makeRule();
  const getOwnedProject = mockMethod(
    t,
    projectDetailsRepository,
    "getOwnedProject",
    async () => project,
  );
  const getProjectFields = mockMethod(
    t,
    projectDetailsRepository,
    "getProjectFields",
    async () => [makeField()],
  );
  const createRule = mockMethod(
    t,
    automationRuleRepository,
    "createAutomationRule",
    async () => rule,
  );

  const { response, forwarded } = await invoke(
    createAutomationRule,
    authenticatedRequest({
      params: { projectId: PROJECT_ID },
      body: {
        ...makeCreateBody({ actionValue: "  Completed  " }),
        projectId: OTHER_PROJECT_ID,
        ownerId: OTHER_USER_ID,
      },
    }),
  );

  assert.deepEqual(forwarded, []);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.payload, { success: true, data: rule });
  assert.deepEqual(getOwnedProject.mock.calls[0].arguments, [
    PROJECT_ID,
    OWNER_ID,
  ]);
  assert.deepEqual(getProjectFields.mock.calls[0].arguments, [
    PROJECT_ID,
    { includeArchived: true },
  ]);
  assert.deepEqual(createRule.mock.calls[0].arguments, [
    {
      ownerId: OWNER_ID,
      projectId: PROJECT_ID,
      name: "Tag completed work",
      conditionFieldId: FIELD_ID,
      conditionOperator: "equals",
      conditionValue: "completed",
      actionType: "add_tag",
      actionValue: "completed",
      enabled: true,
    },
  ]);
});

test("createAutomationRule rejects an invalid body with 400 before the service runs", async (t) => {
  const getOwnedProject = mockMethod(
    t,
    projectDetailsRepository,
    "getOwnedProject",
    async () => {
      throw new Error("getOwnedProject must not run for an invalid body");
    },
  );
  const createRule = mockMethod(
    t,
    automationRuleRepository,
    "createAutomationRule",
    async () => {
      throw new Error("createAutomationRule must not run for an invalid body");
    },
  );

  const { response, forwarded } = await invoke(
    createAutomationRule,
    authenticatedRequest({
      params: { projectId: PROJECT_ID },
      body: makeCreateBody({ conditionOperator: "starts_with" }),
    }),
  );

  assert.deepEqual(forwarded, []);
  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.success, false);
  assert.equal(response.payload.message, "Invalid automation rule data");
  assert.equal(
    response.payload.errors.fieldErrors.conditionOperator.length,
    1,
  );
  assert.equal(getOwnedProject.mock.callCount(), 0);
  assert.equal(createRule.mock.callCount(), 0);
});

test("createAutomationRule forwards a missing or foreign project to next as 404 without creating a rule", async (t) => {
  mockMethod(t, projectDetailsRepository, "getOwnedProject", async () => null);
  const getProjectFields = mockMethod(
    t,
    projectDetailsRepository,
    "getProjectFields",
    async () => [makeField()],
  );
  const createRule = mockMethod(
    t,
    automationRuleRepository,
    "createAutomationRule",
    async () => makeRule(),
  );

  const { response, forwarded } = await invoke(
    createAutomationRule,
    authenticatedRequest({
      params: { projectId: PROJECT_ID },
      body: makeCreateBody(),
    }),
  );

  assert.equal(response.statusCode, null);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].statusCode, 404);
  assert.equal(forwarded[0].message, "Project not found");
  assert.equal(getProjectFields.mock.callCount(), 0);
  assert.equal(createRule.mock.callCount(), 0);
});

test("listAutomationRules responds 200 with the rules owned by the authenticated user", async (t) => {
  const project = { id: PROJECT_ID, ownerId: OWNER_ID, name: "Project" };
  const rules = [makeRule(), makeRule({ id: OTHER_RULE_ID, name: "Second" })];
  mockMethod(t, projectDetailsRepository, "getOwnedProject", async () => project);
  const listRules = mockMethod(
    t,
    automationRuleRepository,
    "getAutomationRulesForProject",
    async () => rules,
  );

  const { response, forwarded } = await invoke(
    listAutomationRules,
    authenticatedRequest({ params: { projectId: PROJECT_ID } }),
  );

  assert.deepEqual(forwarded, []);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload, { success: true, data: rules });
  assert.deepEqual(listRules.mock.calls[0].arguments, [
    { ownerId: OWNER_ID, projectId: PROJECT_ID },
  ]);
});

test("listAutomationRules forwards a missing project to next as 404 without listing rules", async (t) => {
  mockMethod(t, projectDetailsRepository, "getOwnedProject", async () => null);
  const listRules = mockMethod(
    t,
    automationRuleRepository,
    "getAutomationRulesForProject",
    async () => [],
  );

  const { response, forwarded } = await invoke(
    listAutomationRules,
    authenticatedRequest({ params: { projectId: PROJECT_ID } }),
  );

  assert.equal(response.statusCode, null);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].statusCode, 404);
  assert.equal(forwarded[0].message, "Project not found");
  assert.equal(listRules.mock.callCount(), 0);
});

test("unexpected service failures are forwarded to next unchanged", async (t) => {
  const failure = new Error("Automation store unavailable");
  mockMethod(t, projectDetailsRepository, "getOwnedProject", async () => ({
    id: PROJECT_ID,
    ownerId: OWNER_ID,
  }));
  mockMethod(
    t,
    automationRuleRepository,
    "getAutomationRulesForProject",
    async () => {
      throw failure;
    },
  );

  const { response, forwarded } = await invoke(
    listAutomationRules,
    authenticatedRequest({ params: { projectId: PROJECT_ID } }),
  );

  assert.equal(response.statusCode, null);
  assert.deepEqual(forwarded, [failure]);
});

test("updateAutomationRule responds 200 with the merged update for a partial body", async (t) => {
  const existing = makeRule();
  const updated = makeRule({ enabled: false });
  const getRuleById = mockMethod(
    t,
    automationRuleRepository,
    "getAutomationRuleById",
    async () => existing,
  );
  const getProjectFields = mockMethod(
    t,
    projectDetailsRepository,
    "getProjectFields",
    async () => [makeField()],
  );
  const updateRule = mockMethod(
    t,
    automationRuleRepository,
    "updateAutomationRule",
    async () => updated,
  );

  const { response, forwarded } = await invoke(
    updateAutomationRule,
    authenticatedRequest({
      params: { ruleId: RULE_ID },
      body: {
        enabled: false,
        ruleId: OTHER_RULE_ID,
        ownerId: OTHER_USER_ID,
      },
    }),
  );

  assert.deepEqual(forwarded, []);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload, { success: true, data: updated });
  assert.deepEqual(getRuleById.mock.calls[0].arguments, [
    { ruleId: RULE_ID, ownerId: OWNER_ID },
  ]);
  assert.equal(getProjectFields.mock.callCount(), 0);
  assert.deepEqual(updateRule.mock.calls[0].arguments, [
    {
      ruleId: RULE_ID,
      ownerId: OWNER_ID,
      name: existing.name,
      conditionFieldId: existing.conditionFieldId,
      conditionOperator: existing.conditionOperator,
      conditionValue: existing.conditionValue,
      actionType: existing.actionType,
      actionValue: existing.actionValue,
      enabled: false,
    },
  ]);
});

test("updateAutomationRule rejects an empty update with 400 before the service runs", async (t) => {
  const getRuleById = mockMethod(
    t,
    automationRuleRepository,
    "getAutomationRuleById",
    async () => {
      throw new Error("getAutomationRuleById must not run for an empty update");
    },
  );
  const updateRule = mockMethod(
    t,
    automationRuleRepository,
    "updateAutomationRule",
    async () => {
      throw new Error("updateAutomationRule must not run for an empty update");
    },
  );

  const { response, forwarded } = await invoke(
    updateAutomationRule,
    authenticatedRequest({ params: { ruleId: RULE_ID }, body: {} }),
  );

  assert.deepEqual(forwarded, []);
  assert.equal(response.statusCode, 400);
  assert.equal(response.payload.success, false);
  assert.equal(response.payload.message, "Invalid automation rule data");
  assert.equal(getRuleById.mock.callCount(), 0);
  assert.equal(updateRule.mock.callCount(), 0);
});

test("updateAutomationRule forwards a missing rule to next as 404 without updating anything", async (t) => {
  mockMethod(
    t,
    automationRuleRepository,
    "getAutomationRuleById",
    async () => null,
  );
  const updateRule = mockMethod(
    t,
    automationRuleRepository,
    "updateAutomationRule",
    async () => makeRule(),
  );

  const { response, forwarded } = await invoke(
    updateAutomationRule,
    authenticatedRequest({
      params: { ruleId: RULE_ID },
      body: { enabled: false },
    }),
  );

  assert.equal(response.statusCode, null);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].statusCode, 404);
  assert.equal(forwarded[0].message, "Automation rule not found");
  assert.equal(updateRule.mock.callCount(), 0);
});

test("deleteAutomationRule responds 200 with the deleted rule id", async (t) => {
  const getRuleById = mockMethod(
    t,
    automationRuleRepository,
    "getAutomationRuleById",
    async () => makeRule(),
  );
  const deleteRule = mockMethod(
    t,
    automationRuleRepository,
    "deleteAutomationRule",
    async () => true,
  );

  const { response, forwarded } = await invoke(
    deleteAutomationRule,
    authenticatedRequest({
      params: { ruleId: RULE_ID },
      body: { ruleId: OTHER_RULE_ID },
    }),
  );

  assert.deepEqual(forwarded, []);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload, { success: true, data: { id: RULE_ID } });
  assert.deepEqual(getRuleById.mock.calls[0].arguments, [
    { ruleId: RULE_ID, ownerId: OWNER_ID },
  ]);
  assert.deepEqual(deleteRule.mock.calls[0].arguments, [
    { ruleId: RULE_ID, ownerId: OWNER_ID },
  ]);
});

test("deleteAutomationRule forwards a missing rule to next as 404 without deleting anything", async (t) => {
  mockMethod(
    t,
    automationRuleRepository,
    "getAutomationRuleById",
    async () => null,
  );
  const deleteRule = mockMethod(
    t,
    automationRuleRepository,
    "deleteAutomationRule",
    async () => true,
  );

  const { response, forwarded } = await invoke(
    deleteAutomationRule,
    authenticatedRequest({ params: { ruleId: RULE_ID } }),
  );

  assert.equal(response.statusCode, null);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].statusCode, 404);
  assert.equal(forwarded[0].message, "Automation rule not found");
  assert.equal(deleteRule.mock.callCount(), 0);
});

test("all four handlers reject a request without an authenticated user id as 401", async (t) => {
  const spies = [
    mockMethod(t, projectDetailsRepository, "getOwnedProject", async () => {
      throw new Error("getOwnedProject must not run without a user");
    }),
    mockMethod(t, projectDetailsRepository, "getProjectFields", async () => {
      throw new Error("getProjectFields must not run without a user");
    }),
    mockMethod(
      t,
      automationRuleRepository,
      "createAutomationRule",
      async () => {
        throw new Error("createAutomationRule must not run without a user");
      },
    ),
    mockMethod(
      t,
      automationRuleRepository,
      "getAutomationRulesForProject",
      async () => {
        throw new Error(
          "getAutomationRulesForProject must not run without a user",
        );
      },
    ),
    mockMethod(
      t,
      automationRuleRepository,
      "getAutomationRuleById",
      async () => {
        throw new Error("getAutomationRuleById must not run without a user");
      },
    ),
    mockMethod(
      t,
      automationRuleRepository,
      "updateAutomationRule",
      async () => {
        throw new Error("updateAutomationRule must not run without a user");
      },
    ),
    mockMethod(
      t,
      automationRuleRepository,
      "deleteAutomationRule",
      async () => {
        throw new Error("deleteAutomationRule must not run without a user");
      },
    ),
  ];

  for (const handler of [
    createAutomationRule,
    listAutomationRules,
    updateAutomationRule,
    deleteAutomationRule,
  ]) {
    for (const user of [undefined, {}]) {
      const { response, forwarded } = await invoke(handler, {
        user,
        params: { projectId: PROJECT_ID, ruleId: RULE_ID },
        body: {},
      });

      assert.equal(response.statusCode, null);
      assert.equal(forwarded.length, 1);
      assert.equal(forwarded[0].statusCode, 401);
      assert.equal(forwarded[0].message, "Authentication required");
    }
  }

  for (const spy of spies) {
    assert.equal(spy.mock.callCount(), 0);
  }
});
