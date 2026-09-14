import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("../repositories/projectDetailsRepository");

const repository = require("../repositories/projectDetailsRepository");
const {
  createEntryService,
  getProjectDetailsService,
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
    getOwnedProjectIds: vi.fn().mockResolvedValue([]),
    getOwnedEntryIds: vi.fn().mockResolvedValue([]),
    getEntriesByIdsForProject: vi.fn().mockResolvedValue([]),
    createChecklistItems: vi.fn().mockResolvedValue(0),
    createEntryProjectReferences: vi.fn().mockResolvedValue(0),
    createEntryEntryReferences: vi.fn().mockResolvedValue(0),
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
