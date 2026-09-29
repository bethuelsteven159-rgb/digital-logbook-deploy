import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// Use the same CommonJS objects as the controller and service.
const service = require("./savedFilterService");
const { matchesCriterion } = service;
const repository = require("../repositories/postgresSavedFilterRepository");
const projectRepository = require("../repositories/projectDetailsRepository");
const { updateSavedFilter } = require("../controllers/savedFilterController");
const db = require("../db");

beforeEach(() => {
  vi.spyOn(db, "query").mockImplementation(() => { throw new Error("Unexpected database query"); });
  vi.spyOn(db, "connect").mockImplementation(() => { throw new Error("Unexpected database connection"); });
});

afterEach(() => {
  try {
    expect(db.query).not.toHaveBeenCalled();
    expect(db.connect).not.toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
  }
});

describe("matchesCriterion", () => {
  const entry = {
    name: "Literature Review",
    durationMinutes: 45,
    values: [
      { fieldId: "field-1", name: "Difficulty", value: "Hard" },
      { fieldId: "field-2", name: "Score", value: 8 },
    ],
  };

  it("matches on a built-in property using equals", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "equals",
      value: "Literature Review",
    });

    expect(result).toBe(true);
  });

  it("does not match when equals values differ", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "equals",
      value: "Something else",
    });

    expect(result).toBe(false);
  });

  it("matches using not_equals", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "not_equals",
      value: "Different name",
    });

    expect(result).toBe(true);
  });

  it("matches using greater_than on a built-in numeric property", () => {
    const result = matchesCriterion(entry, {
      fieldName: "durationMinutes",
      operator: "greater_than",
      value: 10,
    });

    expect(result).toBe(true);
  });

  it("does not match using greater_than when value is too low", () => {
    const result = matchesCriterion(entry, {
      fieldName: "durationMinutes",
      operator: "greater_than",
      value: 1000,
    });

    expect(result).toBe(false);
  });

  it("matches using less_than", () => {
    const result = matchesCriterion(entry, {
      fieldName: "durationMinutes",
      operator: "less_than",
      value: 1000,
    });

    expect(result).toBe(true);
  });

  it("matches using contains, case-insensitively", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "contains",
      value: "literature",
    });

    expect(result).toBe(true);
  });

  it("matches on a custom field by fieldId", () => {
    const result = matchesCriterion(entry, {
      fieldId: "field-1",
      operator: "equals",
      value: "Hard",
    });

    expect(result).toBe(true);
  });

  it("returns false when the referenced custom field doesn't exist on the entry", () => {
    const result = matchesCriterion(entry, {
      fieldId: "nonexistent-field",
      operator: "equals",
      value: "Anything",
    });

    expect(result).toBe(false);
  });

  it("returns false for an unknown operator", () => {
    const result = matchesCriterion(entry, {
      fieldName: "name",
      operator: "unsupported_operator",
      value: "Literature Review",
    });

    expect(result).toBe(false);
  });
});


describe("saved-filter service contract", () => {
  const ownerId = "owner-1";
  const projectId = "project-1";
  const filterId = "filter-1";
  const criteria = [{ fieldName: "name", operator: "contains", value: "Review" }];
  const data = { name: "  Review filter  ", criteria };
  const saved = { id: filterId, ownerId, projectId, name: "Review filter", criteria };

  it("exports the existing update service", () => {
    expect(typeof service.updateSavedFilterService).toBe("function");
  });

  it("passes a valid controller update through the real service to the repository", async () => {
    const lookup = vi.spyOn(repository, "getSavedFilterById").mockResolvedValue(saved);
    const update = vi.spyOn(repository, "updateSavedFilter").mockResolvedValue(saved);
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
    const next = vi.fn();

    await updateSavedFilter({ user: { id: ownerId }, params: { filterId }, body: data }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalledExactlyOnceWith({ filterId, ownerId });
    expect(update).toHaveBeenCalledExactlyOnceWith({ filterId, ownerId, name: "Review filter", criteria });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: saved });
  });

  it("rejects an update when the filter is missing or not owned by the caller", async () => {
    vi.spyOn(repository, "getSavedFilterById").mockResolvedValue(null);
    const update = vi.spyOn(repository, "updateSavedFilter").mockResolvedValue(saved);
    await expect(service.updateSavedFilterService({ ownerId, filterId, data }))
      .rejects.toMatchObject({ statusCode: 404, message: "Saved filter not found" });
    expect(update).not.toHaveBeenCalled();
  });

  it("preserves creating an owned project's filter", async () => {
    vi.spyOn(projectRepository, "getOwnedProject").mockResolvedValue({ id: projectId });
    const create = vi.spyOn(repository, "createSavedFilter").mockResolvedValue(saved);
    expect(await service.createSavedFilterService({ ownerId, projectId, data })).toEqual(saved);
    expect(create).toHaveBeenCalledWith({ ownerId, projectId, name: "Review filter", criteria });
  });

  it("preserves listing an owned project's filters", async () => {
    vi.spyOn(projectRepository, "getOwnedProject").mockResolvedValue({ id: projectId });
    const list = vi.spyOn(repository, "getSavedFiltersForProject").mockResolvedValue([saved]);
    expect(await service.listSavedFiltersService({ ownerId, projectId })).toEqual([saved]);
    expect(list).toHaveBeenCalledWith({ ownerId, projectId });
  });

  it("preserves applying a filter to serialized entries", async () => {
    vi.spyOn(repository, "getSavedFilterById").mockResolvedValue(saved);
    vi.spyOn(projectRepository, "getOwnedProject").mockResolvedValue({ id: projectId });
    vi.spyOn(projectRepository, "getProjectEntries").mockResolvedValue([
      { id: "entry-1", name: "Literature Review" },
      { id: "entry-2", name: "Implementation" },
    ]);
    const result = await service.applySavedFilterService({ ownerId, projectId, filterId });
    expect(result.map((entry) => entry.id)).toEqual(["entry-1"]);
  });

  it("preserves deleting an owned filter", async () => {
    vi.spyOn(repository, "getSavedFilterById").mockResolvedValue(saved);
    const remove = vi.spyOn(repository, "deleteSavedFilter").mockResolvedValue(true);
    expect(await service.deleteSavedFilterService({ ownerId, filterId })).toEqual({ id: filterId });
    expect(remove).toHaveBeenCalledWith({ filterId, ownerId });
  });
});

describe("saved-filter custom-field filtering", () => {
  const ownerId = "owner-qa";
  const projectId = "project-qa";
  const filterId = "filter-qa";

  it("applies multiple criteria including a custom field", async () => {
    const customFieldId = "11111111-1111-4111-8111-111111111111";

    const criteria = [
      {
        fieldName: "name",
        operator: "contains",
        value: "report",
      },
      {
        fieldId: customFieldId,
        operator: "equals",
        value: "High",
      },
    ];

    vi.spyOn(repository, "getSavedFilterById").mockResolvedValue({
      id: filterId,
      ownerId,
      projectId,
      name: "High reports",
      criteria,
    });

    vi.spyOn(projectRepository, "getOwnedProject").mockResolvedValue({
      id: projectId,
    });

    vi.spyOn(projectRepository, "getProjectEntries").mockResolvedValue([
      {
        id: "entry-1",
        name: "Final report",
        values: [
          {
            fieldId: customFieldId,
            valueText: "High",
            valueNumber: null,
            valueDate: null,
            field: {
              id: customFieldId,
              name: "Priority",
              fieldType: "short_text",
              archivedAt: null,
            },
          },
        ],
      },
      {
        id: "entry-2",
        name: "Final report",
        values: [
          {
            fieldId: customFieldId,
            valueText: "Low",
            valueNumber: null,
            valueDate: null,
            field: {
              id: customFieldId,
              name: "Priority",
              fieldType: "short_text",
              archivedAt: null,
            },
          },
        ],
      },
    ]);

    const result = await service.applySavedFilterService({
      ownerId,
      projectId,
      filterId,
    });

    expect(result.map((entry) => entry.id)).toEqual(["entry-1"]);
  });
});