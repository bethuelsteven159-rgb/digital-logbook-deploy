import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// The service uses CommonJS require; stub its actual repository object below.
const db = require("../db");

const repository = require("../repositories/projectDetailsRepository");
const {
  createEntryService,
  getProjectDetailsService,
  deleteEntryService,
  updateEntryReferencesService,
} = require("../services/projectDetailsService");

function makeTransactionRepo(overrides = {}) {
  return {
    getOwnedProject: vi.fn().mockResolvedValue({
      id: "project-1",
      ownerId: "user-1",
    }),
    getProjectFields: vi.fn().mockResolvedValue([]),
    createProjectField: vi.fn(),
    createEntry: vi.fn().mockResolvedValue({
      id: "entry-1",
      projectId: "project-1",
      createdById: "user-1",
      name: "Lab Session",
      durationMinutes: 30,
      occurredAt: "2026-09-12T00:00:00.000Z",
      tags: ["research"],
      createdAt: "2026-09-12T00:00:00.000Z",
    }),
    createEntryFieldValues: vi.fn().mockResolvedValue(0),
    getEnabledAutomationRules: vi.fn().mockResolvedValue([]),
    getOwnedProjectIds: vi.fn().mockResolvedValue([]),
    getOwnedEntryIds: vi.fn().mockResolvedValue([]),
    getEntriesByIdsForProject: vi.fn().mockResolvedValue([]),
    createChecklistItems: vi.fn().mockResolvedValue(0),
    createEntryProjectReferences: vi.fn().mockResolvedValue(0),
    createEntryReferences: vi.fn().mockResolvedValue(0),
    removeEntryReferences: vi.fn().mockResolvedValue(0),
    createEntryLinks: vi.fn().mockResolvedValue(0),
    getEntryById: vi.fn().mockResolvedValue({
      id: "entry-1",
      name: "Lab Session",
      durationMinutes: 30,
      occurredAt: "2026-09-12T00:00:00.000Z",
      createdAt: "2026-09-12T00:00:00.000Z",
      tags: ["research"],
      values: [],
      checklist: [],
      references: [],
      entryReferences: [],
    }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(db, "query").mockImplementation(() => { throw new Error("Unexpected real database query"); });
  vi.spyOn(db, "connect").mockImplementation(() => { throw new Error("Unexpected real database connection"); });
});

afterEach(() => {
  try {
    expect(db.query).not.toHaveBeenCalled();
    expect(db.connect).not.toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
  }
});

describe("createEntryService - tags", () => {
  test("passes tags through to repository.createEntry", async () => {
    const txRepo = makeTransactionRepo();

    repository.withTransaction = vi.fn((work) => work(txRepo));

    await createEntryService({
      projectId: "project-1",
      userId: "user-1",
      data: {
        name: "Lab Session",
        durationMinutes: 30,
        tags: ["research", "writing"],
        values: [],
        newFields: [],
      },
    });

    expect(txRepo.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ["research", "writing"],
      }),
    );
  });

  test("passes an empty tags array through when none are supplied", async () => {
    const txRepo = makeTransactionRepo();

    repository.withTransaction = vi.fn((work) => work(txRepo));

    await createEntryService({
      projectId: "project-1",
      userId: "user-1",
      data: {
        name: "Lab Session",
        durationMinutes: 30,
        tags: [],
        values: [],
        newFields: [],
      },
    });

    expect(txRepo.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [],
      }),
    );
  });

  test("returns tags in the serialized entry", async () => {
    const txRepo = makeTransactionRepo();

    repository.withTransaction = vi.fn((work) => work(txRepo));

    const result = await createEntryService({
      projectId: "project-1",
      userId: "user-1",
      data: {
        name: "Lab Session",
        durationMinutes: 30,
        tags: ["research"],
        values: [],
        newFields: [],
      },
    });

    expect(result.tags).toEqual(["research"]);
  });

  test("throws 404 when the project is not owned by the user", async () => {
    const txRepo = makeTransactionRepo({
      getOwnedProject: vi.fn().mockResolvedValue(null),
    });

    repository.withTransaction = vi.fn((work) => work(txRepo));

    await expect(
      createEntryService({
        projectId: "project-1",
        userId: "user-1",
        data: {
          name: "Lab Session",
          durationMinutes: 30,
          tags: [],
          values: [],
          newFields: [],
        },
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("getProjectDetailsService - tags", () => {
  function mockBaseProjectDetails(entries) {
    repository.getOwnedProject = vi.fn().mockResolvedValue({
      id: "project-1",
      name: "My Project",
      description: null,
      startDate: null,
      endDate: null,
      archivedAt: null,
      createdAt: "2026-09-12T00:00:00.000Z",
    });

    repository.getProjectFields = vi.fn().mockResolvedValue([]);
    repository.getProjectStats = vi.fn().mockResolvedValue({
      totalEntries: entries.length,
      loggedMinutes: 30,
      lastActivity: "2026-09-12T00:00:00.000Z",
    });
    repository.getProjectEntries = vi.fn().mockResolvedValue(entries);
    repository.getProjectReferences = vi.fn().mockResolvedValue([]);
    repository.getProjectEntryLinks = vi.fn().mockResolvedValue([]);
  }

  test("includes tags on each entry returned to the client", async () => {
    mockBaseProjectDetails([
      {
        id: "entry-1",
        name: "Lab Session",
        durationMinutes: 30,
        occurredAt: "2026-09-12T00:00:00.000Z",
        createdAt: "2026-09-12T00:00:00.000Z",
        tags: ["research", "writing"],
        values: [],
      },
    ]);

    const result = await getProjectDetailsService({
      projectId: "project-1",
      userId: "user-1",
    });

    expect(result.entries[0].tags).toEqual(["research", "writing"]);
  });

  test("defaults tags to [] when the repository returns none", async () => {
    mockBaseProjectDetails([
      {
        id: "entry-1",
        name: "Legacy entry",
        durationMinutes: 10,
        occurredAt: "2026-09-12T00:00:00.000Z",
        createdAt: "2026-09-12T00:00:00.000Z",
        values: [],
      },
    ]);

    const result = await getProjectDetailsService({
      projectId: "project-1",
      userId: "user-1",
    });

    expect(result.entries[0].tags).toEqual([]);
  });
});

describe("computed fields (US-105)", () => {
  const hours = {
    id: "field-hours",
    projectId: "project-1",
    name: "Hours",
    fieldType: "number",
    formula: null,
    position: 0,
    archivedAt: null,
  };
  const rate = {
    id: "field-rate",
    projectId: "project-1",
    name: "Rate",
    fieldType: "number",
    formula: null,
    position: 1,
    archivedAt: null,
  };
  const total = {
    id: "field-total",
    projectId: "project-1",
    name: "Total",
    fieldType: "computed",
    formula: "Hours * Rate",
    position: 2,
    archivedAt: null,
  };

  function entryValue(field, valueNumber) {
    return {
      fieldId: field.id,
      valueNumber,
      valueText: null,
      valueDate: null,
      field: {
        name: field.name,
        fieldType: field.fieldType,
        archivedAt: field.archivedAt,
      },
    };
  }

  function entryRow(overrides = {}) {
    return {
      id: "entry-1",
      name: "Lab Session",
      durationMinutes: 30,
      occurredAt: "2026-09-12T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      values: [],
      ...overrides,
    };
  }

  function mockProjectDetails({ fields, entries }) {
    repository.getOwnedProject = vi.fn().mockResolvedValue({
      id: "project-1",
      name: "My Project",
      description: null,
      startDate: null,
      endDate: null,
      archivedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    repository.getProjectFields = vi.fn().mockResolvedValue(fields);
    repository.getProjectStats = vi.fn().mockResolvedValue({
      totalEntries: entries.length,
      loggedMinutes: 30,
      lastActivity: "2026-09-12T00:00:00.000Z",
    });
    repository.getProjectEntries = vi.fn().mockResolvedValue(entries);
    repository.getProjectReferences = vi.fn().mockResolvedValue([]);
    repository.getProjectEntryLinks = vi.fn().mockResolvedValue([]);
  }

  function computedValueOf(result) {
    return result.entries[0].values.find((value) => value.type === "computed");
  }

  test("attaches computed values to entries returned by getProjectDetailsService", async () => {
    mockProjectDetails({
      fields: [hours, rate, total],
      entries: [entryRow({ values: [entryValue(hours, "3"), entryValue(rate, "20")] })],
    });

    const result = await getProjectDetailsService({ projectId: "project-1", userId: "user-1" });

    expect(result.entries[0].values.map((value) => value.name)).toEqual([
      "Hours",
      "Rate",
      "Total",
    ]);
    expect(computedValueOf(result)).toMatchObject({
      fieldId: "field-total",
      name: "Total",
      archived: false,
      value: 60,
    });
  });

  test("recalculates computed values from current source values on every read", async () => {
    mockProjectDetails({
      fields: [hours, rate, total],
      entries: [entryRow({ values: [entryValue(hours, "3"), entryValue(rate, "20")] })],
    });

    const first = await getProjectDetailsService({ projectId: "project-1", userId: "user-1" });

    repository.getProjectEntries.mockResolvedValue([
      entryRow({ values: [entryValue(hours, "4"), entryValue(rate, "25")] }),
    ]);
    const second = await getProjectDetailsService({ projectId: "project-1", userId: "user-1" });

    expect(computedValueOf(first).value).toBe(60);
    expect(computedValueOf(second).value).toBe(100);
  });

  test("returns a null computed value when a source value is missing", async () => {
    mockProjectDetails({
      fields: [hours, rate, total],
      entries: [entryRow({ values: [entryValue(hours, "3")] })],
    });

    const result = await getProjectDetailsService({ projectId: "project-1", userId: "user-1" });

    expect(computedValueOf(result).value).toBeNull();
  });

  test("keeps archived computed fields for historical entries and hides them from newer entries", async () => {
    const archivedTotal = { ...total, archivedAt: "2026-08-15T00:00:00.000Z" };
    mockProjectDetails({
      fields: [hours, rate, archivedTotal],
      entries: [
        entryRow({
          id: "entry-old",
          createdAt: "2026-08-01T00:00:00.000Z",
          values: [entryValue(hours, "3"), entryValue(rate, "20")],
        }),
        entryRow({
          id: "entry-new",
          createdAt: "2026-09-01T00:00:00.000Z",
          values: [entryValue(hours, "3"), entryValue(rate, "20")],
        }),
      ],
    });

    const result = await getProjectDetailsService({ projectId: "project-1", userId: "user-1" });
    const oldEntry = result.entries.find((entry) => entry.id === "entry-old");
    const newEntry = result.entries.find((entry) => entry.id === "entry-new");

    expect(oldEntry.values.find((value) => value.fieldId === "field-total")).toMatchObject({
      type: "computed",
      archived: true,
      value: 60,
    });
    expect(newEntry.values.some((value) => value.fieldId === "field-total")).toBe(false);
    expect(result.fields.some((field) => field.id === "field-total")).toBe(false);
  });

  test("createEntryService persists a new computed field formula and returns its computed value", async () => {
    const txRepo = makeTransactionRepo({
      getProjectFields: vi.fn()
        .mockResolvedValueOnce([hours, rate])
        .mockResolvedValueOnce([hours, rate, total]),
      createProjectField: vi.fn().mockResolvedValue(total),
      getEntryById: vi.fn().mockResolvedValue(
        entryRow({ values: [entryValue(hours, "3"), entryValue(rate, "20")] }),
      ),
    });

    repository.withTransaction = vi.fn((work) => work(txRepo));

    const result = await createEntryService({
      projectId: "project-1",
      userId: "user-1",
      data: {
        name: "Lab Session",
        durationMinutes: 30,
        tags: [],
        values: [
          { fieldId: "field-hours", value: 3 },
          { fieldId: "field-rate", value: 20 },
        ],
        newFields: [{ name: "Total", type: "computed", formula: "Hours * Rate" }],
      },
    });

    expect(txRepo.createProjectField).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        name: "Total",
        fieldType: "computed",
        formula: "Hours * Rate",
      }),
    );
    expect(result.values.find((value) => value.fieldId === "field-total")).toMatchObject({
      type: "computed",
      value: 60,
    });
  });
});


describe("deleteEntryService", () => {
  test("deletes an entry owned by the signed-in user", async () => {
    repository.getOwnedProject = vi.fn().mockResolvedValue({
      id: "project-1",
      ownerId: "user-1",
    });
    repository.getOwnedEntry = vi.fn().mockResolvedValue({
      id: "entry-1",
    });
    repository.deleteEntry = vi.fn().mockResolvedValue(true);

    const result = await deleteEntryService({
      projectId: "project-1",
      entryId: "entry-1",
      userId: "user-1",
    });

    expect(repository.deleteEntry).toHaveBeenCalledWith(
      "entry-1",
      "project-1",
    );
    expect(result).toEqual({ id: "entry-1", deleted: true });
  });

  test("rejects deletion when the project is not owned by the user", async () => {
    repository.getOwnedProject = vi.fn().mockResolvedValue(null);

    await expect(
      deleteEntryService({
        projectId: "project-1",
        entryId: "entry-1",
        userId: "user-1",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});


describe("entry-reference contract", () => {
  function internalReference(target) {
    return {
      id: `relationship-${target}`,
      referencedEntryId: target,
      referencedEntryName: `Name ${target}`,
      referencedProjectId: "project-2",
      referencedProjectName: "Other project",
    };
  }

  function referenceTransaction(existing = []) {
    let targets = [...existing];
    const tx = makeTransactionRepo({
      getOwnedEntry: vi.fn().mockResolvedValue({ id: "entry-1" }),
      getOwnedEntryIds: vi.fn(async (ids) => ids),
      getEntryReferences: vi.fn(async () => targets.map(internalReference)),
      getEntryById: vi.fn(async () => ({
        id: "entry-1",
        entryReferences: targets.map(internalReference),
      })),
      createEntryReferences: vi.fn(async (_id, ids) => { targets.push(...ids); }),
      removeEntryReferences: vi.fn(async (_id, ids) => {
        targets = targets.filter((id) => !ids.includes(id));
      }),
    });
    repository.withTransaction = vi.fn((work) => work(tx));
    return tx;
  }

  function create(referenceEntryIds) {
    return createEntryService({
      projectId: "project-1", userId: "user-1",
      data: { name: "Work", durationMinutes: 30, values: [], newFields: [], referenceEntryIds },
    });
  }

  function update(entryIds) {
    return updateEntryReferencesService({ entryId: "entry-1", userId: "user-1", entryIds });
  }

  test("transaction reference methods match the real repository interface", () => {
    const tx = makeTransactionRepo();
    for (const name of ["createEntryReferences", "removeEntryReferences"]) {
      expect(typeof repository[name]).toBe("function");
      expect(typeof tx[name]).toBe("function");
    }
    expect(tx.createEntryEntryReferences).toBeUndefined();
    expect(tx.removeEntryEntryReferences).toBeUndefined();
  });

  test("creates references and serializes target IDs using the public entryId property", async () => {
    const tx = referenceTransaction();
    const result = await create(["entry-2"]);
    expect(tx.getOwnedEntryIds).toHaveBeenCalledWith(["entry-2"], "user-1");
    expect(tx.createEntryReferences).toHaveBeenCalledWith("entry-1", ["entry-2"]);
    expect(result.entryReferences).toEqual([{
      id: "relationship-entry-2", entryId: "entry-2", entryName: "Name entry-2",
      projectId: "project-2", projectName: "Other project",
    }]);
  });

  test.each([
    ["adds", ["entry-2"], ["entry-2", "entry-3"], ["entry-3"], []],
    ["removes", ["entry-2", "entry-3"], ["entry-2"], [], ["entry-3"]],
    ["replaces", ["entry-2"], ["entry-3"], ["entry-3"], ["entry-2"]],
    ["clears", ["entry-2", "entry-3"], [], [], ["entry-2", "entry-3"]],
    ["preserves unchanged", ["entry-2"], ["entry-2"], [], []],
  ])("%s references", async (_label, existing, desired, added, removed) => {
    const tx = referenceTransaction(existing);
    const result = await update(desired);
    if (added.length) expect(tx.createEntryReferences).toHaveBeenCalledWith("entry-1", added);
    else expect(tx.createEntryReferences).not.toHaveBeenCalled();
    if (removed.length) expect(tx.removeEntryReferences).toHaveBeenCalledWith("entry-1", removed);
    else expect(tx.removeEntryReferences).not.toHaveBeenCalled();
    expect(result.entryReferences.map((ref) => ref.entryId)).toEqual(desired);
    for (const ref of result.entryReferences) expect(ref).not.toHaveProperty("referencedEntryId");
  });

  test.each(["create", "update"])("%s rejects self references", async (operation) => {
    const tx = referenceTransaction();
    await expect((operation === "create" ? create : update)(["entry-1"]))
      .rejects.toMatchObject({ statusCode: 400, message: "An entry cannot reference itself" });
    expect(tx.createEntryReferences).not.toHaveBeenCalled();
    expect(tx.removeEntryReferences).not.toHaveBeenCalled();
  });

  test.each(["create", "update"])("%s rejects targets not owned by the user", async (operation) => {
    const tx = referenceTransaction();
    tx.getOwnedEntryIds.mockResolvedValue([]);
    await expect((operation === "create" ? create : update)(["entry-2"]))
      .rejects.toMatchObject({ statusCode: 400, message: "One of the referenced entries does not belong to you" });
    expect(tx.createEntryReferences).not.toHaveBeenCalled();
    expect(tx.removeEntryReferences).not.toHaveBeenCalled();
  });

  test("update rejects a source entry not owned by the user", async () => {
    const tx = referenceTransaction();
    tx.getOwnedEntry.mockResolvedValue(null);
    await expect(update(["entry-2"])).rejects.toMatchObject({ statusCode: 404 });
    expect(tx.getOwnedEntryIds).not.toHaveBeenCalled();
    expect(tx.createEntryReferences).not.toHaveBeenCalled();
    expect(tx.removeEntryReferences).not.toHaveBeenCalled();
  });
});
