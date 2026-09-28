import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const service = require("./automationRuleService");
const automationRuleRepository = require("../repositories/postgresAutomationRuleRepository");
const projectDetailsRepository = require("../repositories/projectDetailsRepository");
const db = require("../db");

const {
  createAutomationRuleService,
  listAutomationRulesService,
  updateAutomationRuleService,
  deleteAutomationRuleService,
  applyAutomationRulesForEntry,
} = service;

const projectId = "project-1";
const ownerId = "user-1";
const fieldId = "field-1";
const entryId = "entry-1";

function makeRule(overrides = {}) {
  return {
    id: "rule-1",
    projectId,
    ownerId,
    name: "Mark completed work",
    conditionFieldId: fieldId,
    conditionOperator: "equals",
    conditionValue: "completed",
    actionType: "add_tag",
    actionValue: "completed",
    enabled: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeTx(rules) {
  return {
    getEnabledAutomationRules: vi
      .fn()
      .mockResolvedValue(rules),
    setEntryTags: vi
      .fn()
      .mockImplementation(async (_entryId, tags) => tags),
  };
}

beforeEach(() => {
  vi.spyOn(db, "query").mockImplementation(() => {
    throw new Error("Unexpected database query");
  });
  vi.spyOn(db, "connect").mockImplementation(() => {
    throw new Error("Unexpected database connection");
  });
});

afterEach(() => {
  try {
    expect(db.query).not.toHaveBeenCalled();
    expect(db.connect).not.toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
  }
});

describe("applyAutomationRulesForEntry", () => {
  const values = [{ fieldId, value: "completed" }];

  it("adds the tag when the equals condition is met and updates the entry once", async () => {
    const tx = makeTx([makeRule()]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags: ["research"],
    });

    expect(tx.getEnabledAutomationRules).toHaveBeenCalledExactlyOnceWith(
      projectId,
    );
    expect(tx.setEntryTags).toHaveBeenCalledExactlyOnceWith(entryId, [
      "research",
      "completed",
    ]);
    expect(result).toEqual({
      applied: true,
      tags: ["research", "completed"],
    });
  });

  it("does not match when the equals value differs", async () => {
    const tx = makeTx([makeRule()]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values: [{ fieldId, value: "in progress" }],
      existingTags: [],
    });

    expect(tx.setEntryTags).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: false, tags: [] });
  });

  it("matches using not_equals", async () => {
    const tx = makeTx([
      makeRule({
        conditionOperator: "not_equals",
        conditionValue: "blocked",
        actionValue: "active",
      }),
    ]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags: [],
    });

    expect(tx.setEntryTags).toHaveBeenCalledExactlyOnceWith(entryId, [
      "active",
    ]);
    expect(result.applied).toBe(true);
  });

  it("matches using contains case-insensitively", async () => {
    const tx = makeTx([
      makeRule({
        conditionOperator: "contains",
        conditionValue: "COMP",
        actionValue: "computer",
      }),
    ]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values: [{ fieldId, value: "Completed work" }],
      existingTags: [],
    });

    expect(tx.setEntryTags).toHaveBeenCalledExactlyOnceWith(entryId, [
      "computer",
    ]);
    expect(result.applied).toBe(true);
  });

  it("matches using greater_than with numeric values", async () => {
    const tx = makeTx([
      makeRule({
        conditionOperator: "greater_than",
        conditionValue: "10",
        actionValue: "high-effort",
      }),
    ]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values: [{ fieldId, value: 45 }],
      existingTags: [],
    });

    expect(tx.setEntryTags).toHaveBeenCalledExactlyOnceWith(entryId, [
      "high-effort",
    ]);
    expect(result.applied).toBe(true);
  });

  it("matches using less_than with numeric values", async () => {
    const tx = makeTx([
      makeRule({
        conditionOperator: "less_than",
        conditionValue: 10,
        actionValue: "quick",
      }),
    ]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values: [{ fieldId, value: 5 }],
      existingTags: [],
    });

    expect(tx.setEntryTags).toHaveBeenCalledExactlyOnceWith(entryId, [
      "quick",
    ]);
    expect(result.applied).toBe(true);
  });

  it("returns false when the entry has no value for the condition field", async () => {
    const tx = makeTx([makeRule()]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values: [{ fieldId: "other-field", value: "completed" }],
      existingTags: ["research"],
    });

    expect(tx.setEntryTags).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: false, tags: ["research"] });
  });

  it("does not match when the persisted condition value is null", async () => {
    const tx = makeTx([makeRule({ conditionValue: null })]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags: [],
    });

    expect(tx.setEntryTags).not.toHaveBeenCalled();
    expect(result.applied).toBe(false);
  });

  it("collects tags from every matching rule into a single update", async () => {
    const tx = makeTx([
      makeRule({ id: "rule-1", actionValue: "alpha" }),
      makeRule({ id: "rule-2", actionValue: "beta" }),
      makeRule({
        id: "rule-3",
        actionValue: "gamma",
        conditionOperator: "not_equals",
        conditionValue: "completed",
      }),
    ]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags: ["research"],
    });

    expect(tx.setEntryTags).toHaveBeenCalledExactlyOnceWith(entryId, [
      "research",
      "alpha",
      "beta",
    ]);
    expect(result.applied).toBe(true);
  });

  it("only adds the tag of the matching rule when others do not match", async () => {
    const tx = makeTx([
      makeRule({ id: "rule-1", actionValue: "alpha" }),
      makeRule({
        id: "rule-2",
        actionValue: "beta",
        conditionValue: "blocked",
      }),
    ]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags: [],
    });

    expect(tx.setEntryTags).toHaveBeenCalledExactlyOnceWith(entryId, [
      "alpha",
    ]);
    expect(result.tags).toEqual(["alpha"]);
  });

  it("deduplicates tags produced by multiple matching rules", async () => {
    const tx = makeTx([
      makeRule({ id: "rule-1", actionValue: "Completed" }),
      makeRule({ id: "rule-2", actionValue: "completed" }),
    ]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags: [],
    });

    expect(tx.setEntryTags).toHaveBeenCalledExactlyOnceWith(entryId, [
      "completed",
    ]);
    expect(result.tags).toEqual(["completed"]);
  });

  it("skips a tag that the entry already has", async () => {
    const tx = makeTx([makeRule({ actionValue: "completed" })]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags: ["completed"],
    });

    expect(tx.setEntryTags).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: false, tags: ["completed"] });
  });

  it("respects the maximum tag count of 10", async () => {
    const existingTags = Array.from({ length: 9 }, (_, i) => `tag${i}`);
    const tx = makeTx([
      makeRule({ id: "rule-1", actionValue: "alpha" }),
      makeRule({ id: "rule-2", actionValue: "beta" }),
    ]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags,
    });

    expect(tx.setEntryTags).toHaveBeenCalledExactlyOnceWith(entryId, [
      ...existingTags,
      "alpha",
    ]);
    expect(result.tags).toHaveLength(10);
  });

  it("does not add tags when the entry already has 10 tags", async () => {
    const existingTags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    const tx = makeTx([makeRule({ actionValue: "alpha" })]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags,
    });

    expect(tx.setEntryTags).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: false, tags: existingTags });
  });

  it("skips malformed persisted rules without crashing", async () => {
    const tx = makeTx([
      null,
      "not-an-object",
      42,
      { id: "rule-bad", actionType: "add_tag" },
      {
        id: "rule-unknown-operator",
        conditionFieldId: fieldId,
        conditionOperator: "starts_with",
        conditionValue: "completed",
        actionType: "add_tag",
        actionValue: "alpha",
      },
      {
        id: "rule-unknown-action",
        conditionFieldId: fieldId,
        conditionOperator: "equals",
        conditionValue: "completed",
        actionType: "send_email",
        actionValue: "alpha",
      },
      {
        id: "rule-non-string-tag",
        conditionFieldId: fieldId,
        conditionOperator: "equals",
        conditionValue: "completed",
        actionType: "add_tag",
        actionValue: 123,
      },
    ]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags: [],
    });

    expect(tx.setEntryTags).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: false, tags: [] });
  });

  it("makes no update when there are no enabled rules", async () => {
    const tx = makeTx([]);

    const result = await applyAutomationRulesForEntry({
      tx,
      projectId,
      entryId,
      values,
      existingTags: ["research"],
    });

    expect(tx.setEntryTags).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: false, tags: ["research"] });
  });

  it("propagates a database error from the tag update", async () => {
    const failure = new Error("update failed");
    const tx = {
      getEnabledAutomationRules: vi
        .fn()
        .mockResolvedValue([makeRule()]),
      setEntryTags: vi.fn().mockRejectedValue(failure),
    };

    await expect(
      applyAutomationRulesForEntry({
        tx,
        projectId,
        entryId,
        values,
        existingTags: [],
      }),
    ).rejects.toBe(failure);
  });
});

describe("createAutomationRuleService", () => {
  const data = {
    name: "Mark completed work",
    conditionFieldId: fieldId,
    conditionOperator: "equals",
    conditionValue: "completed",
    actionType: "add_tag",
    actionValue: "completed",
    enabled: true,
  };

  it("rejects creation when the project is missing or not owned", async () => {
    vi.spyOn(projectDetailsRepository, "getOwnedProject").mockResolvedValue(
      null,
    );

    const create = vi.spyOn(
      automationRuleRepository,
      "createAutomationRule",
    );

    await expect(
      createAutomationRuleService({ ownerId, projectId, data }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Project not found",
    });

    expect(create).not.toHaveBeenCalled();
  });

  it("rejects creation when the condition field does not belong to the project", async () => {
    vi.spyOn(projectDetailsRepository, "getOwnedProject").mockResolvedValue({
      id: projectId,
    });
    vi.spyOn(projectDetailsRepository, "getProjectFields").mockResolvedValue([
      { id: "other-field", archivedAt: null },
    ]);

    const create = vi.spyOn(
      automationRuleRepository,
      "createAutomationRule",
    );

    await expect(
      createAutomationRuleService({ ownerId, projectId, data }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Condition field does not belong to this project",
    });

    expect(create).not.toHaveBeenCalled();
  });

  it("rejects creation when the condition field is archived", async () => {
    vi.spyOn(projectDetailsRepository, "getOwnedProject").mockResolvedValue({
      id: projectId,
    });
    vi.spyOn(projectDetailsRepository, "getProjectFields").mockResolvedValue([
      { id: fieldId, archivedAt: new Date("2026-01-01T00:00:00Z") },
    ]);

    await expect(
      createAutomationRuleService({ ownerId, projectId, data }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Archived fields cannot be used in automation rules",
    });
  });

  it("creates the rule for an owned project and usable field", async () => {
    vi.spyOn(projectDetailsRepository, "getOwnedProject").mockResolvedValue({
      id: projectId,
    });
    vi.spyOn(projectDetailsRepository, "getProjectFields").mockResolvedValue([
      { id: fieldId, archivedAt: null },
    ]);

    const saved = makeRule();
    const create = vi
      .spyOn(automationRuleRepository, "createAutomationRule")
      .mockResolvedValue(saved);

    await expect(
      createAutomationRuleService({ ownerId, projectId, data }),
    ).resolves.toBe(saved);

    expect(create).toHaveBeenCalledWith({
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
  });
});

describe("listAutomationRulesService", () => {
  it("rejects listing when the project is missing or not owned", async () => {
    vi.spyOn(projectDetailsRepository, "getOwnedProject").mockResolvedValue(
      null,
    );

    await expect(
      listAutomationRulesService({ ownerId, projectId }),
    ).rejects.toMatchObject({ statusCode: 404, message: "Project not found" });
  });

  it("lists rules for an owned project", async () => {
    vi.spyOn(projectDetailsRepository, "getOwnedProject").mockResolvedValue({
      id: projectId,
    });

    const rules = [makeRule()];
    const list = vi
      .spyOn(automationRuleRepository, "getAutomationRulesForProject")
      .mockResolvedValue(rules);

    await expect(
      listAutomationRulesService({ ownerId, projectId }),
    ).resolves.toBe(rules);

    expect(list).toHaveBeenCalledWith({ ownerId, projectId });
  });
});

describe("updateAutomationRuleService", () => {
  it("rejects an update when the rule is missing or not owned", async () => {
    vi.spyOn(
      automationRuleRepository,
      "getAutomationRuleById",
    ).mockResolvedValue(null);

    const update = vi.spyOn(
      automationRuleRepository,
      "updateAutomationRule",
    );

    await expect(
      updateAutomationRuleService({
        ownerId,
        ruleId: "rule-1",
        data: { enabled: false },
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Automation rule not found",
    });

    expect(update).not.toHaveBeenCalled();
  });

  it("toggles the enabled flag without changing the definition", async () => {
    const existing = makeRule();
    vi.spyOn(
      automationRuleRepository,
      "getAutomationRuleById",
    ).mockResolvedValue(existing);

    const fields = vi.spyOn(
      projectDetailsRepository,
      "getProjectFields",
    );

    const updated = { ...existing, enabled: false };
    const update = vi
      .spyOn(automationRuleRepository, "updateAutomationRule")
      .mockResolvedValue(updated);

    await expect(
      updateAutomationRuleService({
        ownerId,
        ruleId: existing.id,
        data: { enabled: false },
      }),
    ).resolves.toBe(updated);

    expect(fields).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      ruleId: existing.id,
      ownerId,
      name: existing.name,
      conditionFieldId: existing.conditionFieldId,
      conditionOperator: existing.conditionOperator,
      conditionValue: existing.conditionValue,
      actionType: existing.actionType,
      actionValue: existing.actionValue,
      enabled: false,
    });
  });

  it("updates the definition and merges untouched fields", async () => {
    const existing = makeRule({
      conditionValue: "completed",
      actionValue: "completed",
      enabled: false,
    });
    vi.spyOn(
      automationRuleRepository,
      "getAutomationRuleById",
    ).mockResolvedValue(existing);

    const fields = vi.spyOn(
      projectDetailsRepository,
      "getProjectFields",
    );

    const updated = { ...existing, name: "Renamed rule", enabled: true };
    const update = vi
      .spyOn(automationRuleRepository, "updateAutomationRule")
      .mockResolvedValue(updated);

    await expect(
      updateAutomationRuleService({
        ownerId,
        ruleId: existing.id,
        data: { name: "Renamed rule", enabled: true },
      }),
    ).resolves.toBe(updated);

    expect(fields).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      ruleId: existing.id,
      ownerId,
      name: "Renamed rule",
      conditionFieldId: existing.conditionFieldId,
      conditionOperator: existing.conditionOperator,
      conditionValue: existing.conditionValue,
      actionType: existing.actionType,
      actionValue: existing.actionValue,
      enabled: true,
    });
  });

  it("re-validates the condition field when it changes", async () => {
    const existing = makeRule();
    vi.spyOn(
      automationRuleRepository,
      "getAutomationRuleById",
    ).mockResolvedValue(existing);
    vi.spyOn(projectDetailsRepository, "getProjectFields").mockResolvedValue([
      { id: fieldId, archivedAt: null },
    ]);

    const update = vi.spyOn(
      automationRuleRepository,
      "updateAutomationRule",
    );

    await expect(
      updateAutomationRuleService({
        ownerId,
        ruleId: existing.id,
        data: { conditionFieldId: "missing-field" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Condition field does not belong to this project",
    });

    expect(update).not.toHaveBeenCalled();
  });
});

describe("deleteAutomationRuleService", () => {
  it("rejects deletion when the rule is missing or not owned", async () => {
    vi.spyOn(
      automationRuleRepository,
      "getAutomationRuleById",
    ).mockResolvedValue(null);

    await expect(
      deleteAutomationRuleService({ ownerId, ruleId: "rule-1" }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Automation rule not found",
    });
  });

  it("deletes an owned rule", async () => {
    const existing = makeRule();
    vi.spyOn(
      automationRuleRepository,
      "getAutomationRuleById",
    ).mockResolvedValue(existing);

    const remove = vi
      .spyOn(automationRuleRepository, "deleteAutomationRule")
      .mockResolvedValue({ id: existing.id });

    await expect(
      deleteAutomationRuleService({ ownerId, ruleId: existing.id }),
    ).resolves.toEqual({ id: existing.id });

    expect(remove).toHaveBeenCalledWith({
      ruleId: existing.id,
      ownerId,
    });
  });
});
