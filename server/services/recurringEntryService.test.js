import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  MAX_OCCURRENCES_PER_REQUEST,
  computeOccurrenceDates,
  addMonthsClamped,
  listRecurringEntriesService,
  createRecurringEntryService,
  updateRecurringEntryService,
  deleteRecurringEntryService,
  generateDueRecurringEntriesService,
} = require("./recurringEntryService");
const repository = require("../repositories/postgresRecurringEntryRepository");
const db = require("../db");

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

const PROJECT_ID = "project-1";
const USER_ID = "user-1";

const activeProject = {
  id: PROJECT_ID,
  ownerId: USER_ID,
  name: "Project One",
  archivedAt: null,
};

function definitionRow(overrides = {}) {
  return {
    id: "definition-1",
    projectId: PROJECT_ID,
    createdById: USER_ID,
    name: "Daily stand-up notes",
    durationMinutes: 15,
    tags: ["standup"],
    checklist: [{ text: "Write notes" }],
    frequency: "daily",
    intervalCount: 1,
    startsOn: "2026-09-01",
    endsOn: null,
    enabled: true,
    lastGeneratedOn: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function createTransactionMock({
  project = activeProject,
  definitions = [],
} = {}) {
  const occurrences = [];
  const watermarks = [];

  const tx = {
    getOwnedProject: vi.fn(async () => project),
    listEnabledDefinitions: vi.fn(async () => definitions),
    createRecurringOccurrence: vi.fn(async (data) => {
      occurrences.push(data);

      return {
        id: `generated-${occurrences.length}`,
        recurrenceDate: data.recurrenceDate,
      };
    }),
    advanceWatermark: vi.fn(
      async (definitionId, isoDate) => {
        watermarks.push([definitionId, isoDate]);
      },
    ),
  };

  return { tx, occurrences, watermarks };
}

function useTransaction(tx) {
  return vi
    .spyOn(repository, "withTransaction")
    .mockImplementation(async (work) => work(tx));
}

describe("computeOccurrenceDates daily and weekly series", () => {
  it("returns every day between the bounds for a daily series", () => {
    const dates = computeOccurrenceDates({
      frequency: "daily",
      intervalCount: 1,
      startsOn: "2026-09-01",
      through: "2026-09-04",
    });

    expect(dates).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
    ]);
  });

  it("honours the daily interval", () => {
    const dates = computeOccurrenceDates({
      frequency: "daily",
      intervalCount: 3,
      startsOn: "2026-09-01",
      through: "2026-09-08",
    });

    expect(dates).toEqual([
      "2026-09-01",
      "2026-09-04",
      "2026-09-07",
    ]);
  });

  it("returns every seventh day for a weekly series", () => {
    const dates = computeOccurrenceDates({
      frequency: "weekly",
      intervalCount: 1,
      startsOn: "2026-09-01",
      through: "2026-09-22",
    });

    expect(dates).toEqual([
      "2026-09-01",
      "2026-09-08",
      "2026-09-15",
      "2026-09-22",
    ]);
  });

  it("honours the weekly interval", () => {
    const dates = computeOccurrenceDates({
      frequency: "weekly",
      intervalCount: 2,
      startsOn: "2026-09-01",
      through: "2026-09-29",
    });

    expect(dates).toEqual([
      "2026-09-01",
      "2026-09-15",
      "2026-09-29",
    ]);
  });

  it("excludes the watermark date when catching up", () => {
    const dates = computeOccurrenceDates({
      frequency: "daily",
      intervalCount: 1,
      startsOn: "2026-09-01",
      after: "2026-09-20",
      through: "2026-09-23",
    });

    expect(dates).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
    ]);
  });

  it("clamps the upper bound to endsOn", () => {
    const dates = computeOccurrenceDates({
      frequency: "daily",
      intervalCount: 1,
      startsOn: "2026-09-01",
      endsOn: "2026-09-03",
      through: "2026-09-30",
    });

    expect(dates).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
  });

  it("returns an empty list when the window is empty", () => {
    expect(
      computeOccurrenceDates({
        frequency: "daily",
        intervalCount: 1,
        startsOn: "2026-09-10",
        through: "2026-09-01",
      }),
    ).toEqual([]);

    expect(
      computeOccurrenceDates({
        frequency: "daily",
        intervalCount: 1,
        startsOn: "2026-09-01",
        after: "2026-09-28",
        through: "2026-09-28",
      }),
    ).toEqual([]);
  });

  it("never returns more than the per-request cap", () => {
    const dates = computeOccurrenceDates({
      frequency: "daily",
      intervalCount: 1,
      startsOn: "2026-01-01",
      through: "2026-12-31",
    });

    expect(dates).toHaveLength(MAX_OCCURRENCES_PER_REQUEST);
    expect(dates[0]).toBe("2026-01-01");
    expect(dates[dates.length - 1]).toBe("2026-04-10");
  });

  it("honours an explicit lower limit", () => {
    const dates = computeOccurrenceDates({
      frequency: "daily",
      intervalCount: 1,
      startsOn: "2026-01-01",
      through: "2026-12-31",
      limit: 3,
    });

    expect(dates).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });
});

describe("computeOccurrenceDates monthly anchor preservation", () => {
  it("clamps Jan 31 to the end of shorter months and restores the anchor", () => {
    const dates = computeOccurrenceDates({
      frequency: "monthly",
      intervalCount: 1,
      startsOn: "2026-01-31",
      through: "2026-04-30",
    });

    expect(dates).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });

  it("rolls over from December into January", () => {
    const dates = computeOccurrenceDates({
      frequency: "monthly",
      intervalCount: 1,
      startsOn: "2026-11-30",
      through: "2027-02-28",
    });

    expect(dates).toEqual([
      "2026-11-30",
      "2026-12-30",
      "2027-01-30",
      "2027-02-28",
    ]);
  });

  it("honours a multi-month interval", () => {
    const dates = computeOccurrenceDates({
      frequency: "monthly",
      intervalCount: 3,
      startsOn: "2026-01-15",
      through: "2026-10-15",
    });

    expect(dates).toEqual([
      "2026-01-15",
      "2026-04-15",
      "2026-07-15",
      "2026-10-15",
    ]);
  });

  it("steps forward from a clamped candidate to reach the watermark", () => {
    const dates = computeOccurrenceDates({
      frequency: "monthly",
      intervalCount: 1,
      startsOn: "2026-01-31",
      after: "2026-02-28",
      through: "2026-03-31",
    });

    expect(dates).toEqual(["2026-03-31"]);
  });

  it("adds months without losing the original day-of-month anchor", () => {
    expect(addMonthsClamped("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonthsClamped("2026-12-15", 13)).toBe("2028-01-15");
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
  });
});

describe("recurring-entry service contract", () => {
  it("lists definitions for an owned project", async () => {
    vi.spyOn(repository, "getOwnedProject").mockResolvedValue(
      activeProject,
    );
    const list = vi
      .spyOn(repository, "listDefinitions")
      .mockResolvedValue([definitionRow()]);

    const result = await listRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
    });

    expect(list).toHaveBeenCalledWith(PROJECT_ID);
    expect(result).toEqual([
      {
        id: "definition-1",
        projectId: PROJECT_ID,
        name: "Daily stand-up notes",
        durationMinutes: 15,
        tags: ["standup"],
        checklist: [{ text: "Write notes" }],
        frequency: "daily",
        intervalCount: 1,
        startsOn: "2026-09-01",
        endsOn: null,
        enabled: true,
        lastGeneratedOn: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ]);
    expect(result[0]).not.toHaveProperty("createdById");
  });

  it("rejects listing for a project the user does not own", async () => {
    vi.spyOn(repository, "getOwnedProject").mockResolvedValue(null);
    const list = vi.spyOn(repository, "listDefinitions");

    await expect(
      listRecurringEntriesService({
        projectId: PROJECT_ID,
        userId: USER_ID,
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Project not found",
    });

    expect(list).not.toHaveBeenCalled();
  });

  it("creates a definition owned by the caller", async () => {
    vi.spyOn(repository, "getOwnedProject").mockResolvedValue(
      activeProject,
    );
    const create = vi
      .spyOn(repository, "createDefinition")
      .mockImplementation(async (data) =>
        definitionRow({
          name: data.name,
          endsOn: data.endsOn ?? null,
        }),
      );

    const result = await createRecurringEntryService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      data: {
        name: "Weekly review",
        durationMinutes: 45,
        tags: ["review"],
        checklist: [{ text: "Summarise progress" }],
        frequency: "weekly",
        intervalCount: 2,
        startsOn: "2026-09-28",
        enabled: true,
      },
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT_ID,
        createdById: USER_ID,
        name: "Weekly review",
        frequency: "weekly",
        intervalCount: 2,
        startsOn: "2026-09-28",
        endsOn: null,
      }),
    );
    expect(result.name).toBe("Weekly review");
    expect(result.endsOn).toBeNull();
  });

  it("rejects creating in an archived project", async () => {
    vi.spyOn(repository, "getOwnedProject").mockResolvedValue({
      ...activeProject,
      archivedAt: "2026-09-20T10:00:00.000Z",
    });
    const create = vi.spyOn(repository, "createDefinition");

    await expect(
      createRecurringEntryService({
        projectId: PROJECT_ID,
        userId: USER_ID,
        data: {
          name: "Weekly review",
          frequency: "weekly",
          startsOn: "2026-09-28",
        },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Archived projects cannot be edited",
    });

    expect(create).not.toHaveBeenCalled();
  });

  it("updates an owned definition", async () => {
    vi.spyOn(
      repository,
      "getDefinitionWithOwner",
    ).mockResolvedValue({
      ...definitionRow(),
      projectOwnerId: USER_ID,
      projectArchivedAt: null,
    });
    const update = vi
      .spyOn(repository, "updateDefinition")
      .mockResolvedValue(definitionRow({ enabled: false }));

    const result = await updateRecurringEntryService({
      definitionId: "definition-1",
      userId: USER_ID,
      data: { enabled: false },
    });

    expect(update).toHaveBeenCalledWith("definition-1", {
      enabled: false,
    });
    expect(result.enabled).toBe(false);
  });

  it("rejects updating a definition the user does not own", async () => {
    vi.spyOn(
      repository,
      "getDefinitionWithOwner",
    ).mockResolvedValue({
      ...definitionRow(),
      projectOwnerId: "someone-else",
      projectArchivedAt: null,
    });
    const update = vi.spyOn(repository, "updateDefinition");

    await expect(
      updateRecurringEntryService({
        definitionId: "definition-1",
        userId: USER_ID,
        data: { enabled: false },
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Recurring entry not found",
    });

    expect(update).not.toHaveBeenCalled();
  });

  it("rejects updating a definition in an archived project", async () => {
    vi.spyOn(
      repository,
      "getDefinitionWithOwner",
    ).mockResolvedValue({
      ...definitionRow(),
      projectOwnerId: USER_ID,
      projectArchivedAt: "2026-09-20T10:00:00.000Z",
    });
    const update = vi.spyOn(repository, "updateDefinition");

    await expect(
      updateRecurringEntryService({
        definitionId: "definition-1",
        userId: USER_ID,
        data: { enabled: false },
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Archived projects cannot be edited",
    });

    expect(update).not.toHaveBeenCalled();
  });

  it("rejects an update that would put the end date before the start date", async () => {
    vi.spyOn(
      repository,
      "getDefinitionWithOwner",
    ).mockResolvedValue({
      ...definitionRow({
        startsOn: "2026-09-01",
        endsOn: "2026-09-20",
      }),
      projectOwnerId: USER_ID,
      projectArchivedAt: null,
    });
    const update = vi.spyOn(repository, "updateDefinition");

    await expect(
      updateRecurringEntryService({
        definitionId: "definition-1",
        userId: USER_ID,
        data: { startsOn: "2026-09-25" },
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        "End date cannot be earlier than start date",
    });

    expect(update).not.toHaveBeenCalled();
  });

  it("deletes an owned definition", async () => {
    vi.spyOn(
      repository,
      "getDefinitionWithOwner",
    ).mockResolvedValue({
      ...definitionRow(),
      projectOwnerId: USER_ID,
      projectArchivedAt: null,
    });
    const remove = vi
      .spyOn(repository, "deleteDefinition")
      .mockResolvedValue("definition-1");

    const result = await deleteRecurringEntryService({
      definitionId: "definition-1",
      userId: USER_ID,
    });

    expect(remove).toHaveBeenCalledWith("definition-1");
    expect(result).toEqual({ id: "definition-1" });
  });

  it("rejects deleting an archived project's definition", async () => {
    vi.spyOn(
      repository,
      "getDefinitionWithOwner",
    ).mockResolvedValue({
      ...definitionRow(),
      projectOwnerId: USER_ID,
      projectArchivedAt: "2026-09-20T10:00:00.000Z",
    });
    const remove = vi.spyOn(repository, "deleteDefinition");

    await expect(
      deleteRecurringEntryService({
        definitionId: "definition-1",
        userId: USER_ID,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Archived projects cannot be edited",
    });

    expect(remove).not.toHaveBeenCalled();
  });
});

describe("generateDueRecurringEntriesService", () => {
  const now = new Date("2026-09-28T12:00:00.000Z");

  it("generates one entry per due occurrence and advances the watermark", async () => {
    const { tx, occurrences, watermarks } =
      createTransactionMock({
        definitions: [
          definitionRow({
            startsOn: "2026-09-25",
          }),
        ],
      });

    useTransaction(tx);

    const result = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(result.generatedCount).toBe(4);
    expect(result.generatedEntries).toEqual([
      {
        id: "generated-1",
        definitionId: "definition-1",
        recurrenceDate: "2026-09-25",
      },
      {
        id: "generated-2",
        definitionId: "definition-1",
        recurrenceDate: "2026-09-26",
      },
      {
        id: "generated-3",
        definitionId: "definition-1",
        recurrenceDate: "2026-09-27",
      },
      {
        id: "generated-4",
        definitionId: "definition-1",
        recurrenceDate: "2026-09-28",
      },
    ]);

    // The V1 template copy: name, duration, tags and checklist only.
    expect(occurrences[0]).toMatchObject({
      definitionId: "definition-1",
      projectId: PROJECT_ID,
      createdById: USER_ID,
      name: "Daily stand-up notes",
      durationMinutes: 15,
      tags: ["standup"],
      checklist: [{ text: "Write notes" }],
      recurrenceDate: "2026-09-25",
    });

    expect(watermarks).toEqual([
      ["definition-1", "2026-09-28"],
    ]);
  });

  it("counts only newly created rows when occurrences already exist", async () => {
    const { tx, occurrences, watermarks } =
      createTransactionMock({
        definitions: [
          definitionRow({
            startsOn: "2026-09-25",
          }),
        ],
      });

    tx.createRecurringOccurrence.mockImplementation(
      async (data) => {
        occurrences.push(data);

        return null;
      },
    );

    useTransaction(tx);

    const result = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(result.generatedCount).toBe(0);
    expect(result.generatedEntries).toEqual([]);
    expect(occurrences).toHaveLength(4);

    // The watermark still advances so deleted occurrences
    // are never recreated by the next generate-due request.
    expect(watermarks).toEqual([
      ["definition-1", "2026-09-28"],
    ]);
  });

  it("treats the watermark as an exclusive lower bound", async () => {
    const { tx, occurrences } = createTransactionMock({
      definitions: [
        definitionRow({
          startsOn: "2026-09-01",
          lastGeneratedOn: "2026-09-20",
        }),
      ],
    });

    useTransaction(tx);

    const result = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(result.generatedCount).toBe(8);
    expect(occurrences[0].recurrenceDate).toBe(
      "2026-09-21",
    );
  });

  it("skips up-to-date definitions without touching the watermark", async () => {
    const { tx, watermarks } = createTransactionMock({
      definitions: [
        definitionRow({
          startsOn: "2026-09-01",
          lastGeneratedOn: "2026-09-28",
        }),
      ],
    });

    useTransaction(tx);

    const result = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(result.generatedCount).toBe(0);
    expect(
      tx.createRecurringOccurrence,
    ).not.toHaveBeenCalled();
    expect(watermarks).toEqual([]);
  });

  it("caps a single definition's backlog at 100 per request and continues later", async () => {
    const definitions = [
      definitionRow({
        startsOn: "2026-01-01",
      }),
    ];
    const { tx, watermarks } = createTransactionMock({
      definitions,
    });

    useTransaction(tx);

    const first = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(first.generatedCount).toBe(
      MAX_OCCURRENCES_PER_REQUEST,
    );
    expect(
      first.generatedEntries[
        first.generatedEntries.length - 1
      ].recurrenceDate,
    ).toBe("2026-04-10");
    expect(watermarks).toEqual([
      ["definition-1", "2026-04-10"],
    ]);

    // Later requests continue from the persisted watermark.
    definitions[0].lastGeneratedOn = "2026-04-10";

    const second = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(second.generatedCount).toBe(
      MAX_OCCURRENCES_PER_REQUEST,
    );
    expect(second.generatedEntries[0].recurrenceDate).toBe(
      "2026-04-11",
    );
    expect(
      second.generatedEntries[
        second.generatedEntries.length - 1
      ].recurrenceDate,
    ).toBe("2026-07-19");
    expect(watermarks.at(-1)).toEqual([
      "definition-1",
      "2026-07-19",
    ]);

    definitions[0].lastGeneratedOn = "2026-07-19";

    const third = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(third.generatedCount).toBe(71);
    expect(
      third.generatedEntries[
        third.generatedEntries.length - 1
      ].recurrenceDate,
    ).toBe("2026-09-28");
    expect(third.generatedCount + 200).toBe(271);
  });

  it("caps the combined backlog across definitions at 100 total, oldest first", async () => {
    const definitions = [
      definitionRow({
        id: "definition-a",
        startsOn: "2026-06-01",
        endsOn: "2026-08-31",
      }),
      definitionRow({
        id: "definition-b",
        startsOn: "2026-09-01",
      }),
    ];
    const { tx, occurrences, watermarks } =
      createTransactionMock({ definitions });

    useTransaction(tx);

    const first = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    // 92 + 28 = 120 due occurrences, but one request generates at
    // most 100 in total - not 100 per definition.
    expect(first.generatedCount).toBe(
      MAX_OCCURRENCES_PER_REQUEST,
    );

    // Oldest first: every June-August occurrence of definition-a
    // precedes definition-b's September dates, so only the oldest
    // 8 of definition-b fit.
    expect(
      first.generatedEntries.filter(
        (entry) => entry.definitionId === "definition-a",
      ),
    ).toHaveLength(92);
    expect(
      first.generatedEntries.filter(
        (entry) => entry.definitionId === "definition-b",
      ),
    ).toHaveLength(8);
    expect(first.generatedEntries[91].recurrenceDate).toBe(
      "2026-08-31",
    );
    expect(first.generatedEntries[92]).toMatchObject({
      definitionId: "definition-b",
      recurrenceDate: "2026-09-01",
    });
    expect(first.generatedEntries[99].recurrenceDate).toBe(
      "2026-09-08",
    );

    // Watermarks advance only through processed occurrences:
    // definition-b still has 20 due dates left.
    expect(watermarks).toEqual([
      ["definition-a", "2026-08-31"],
      ["definition-b", "2026-09-08"],
    ]);

    // The second request continues the backlog without touching
    // definition-a, which is fully caught up through its endsOn.
    definitions[0].lastGeneratedOn = "2026-08-31";
    definitions[1].lastGeneratedOn = "2026-09-08";

    const second = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(second.generatedCount).toBe(20);
    expect(
      second.generatedEntries.every(
        (entry) => entry.definitionId === "definition-b",
      ),
    ).toBe(true);
    expect(second.generatedEntries[0].recurrenceDate).toBe(
      "2026-09-09",
    );
    expect(
      second.generatedEntries[
        second.generatedEntries.length - 1
      ].recurrenceDate,
    ).toBe("2026-09-28");
    expect(watermarks.at(-1)).toEqual([
      "definition-b",
      "2026-09-28",
    ]);

    // A repeated request after catch-up generates nothing extra.
    definitions[1].lastGeneratedOn = "2026-09-28";

    const third = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(third).toEqual({
      generatedCount: 0,
      generatedEntries: [],
    });

    // Every due occurrence was generated exactly once across the
    // three requests: no duplicates, none lost.
    expect(occurrences).toHaveLength(120);
  });

  it("orders same-date occurrences deterministically by definition id", async () => {
    const { tx } = createTransactionMock({
      definitions: [
        definitionRow({
          id: "definition-b",
          startsOn: "2026-09-27",
        }),
        definitionRow({
          id: "definition-a",
          startsOn: "2026-09-27",
        }),
      ],
    });

    useTransaction(tx);

    const result = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(result.generatedCount).toBe(4);
    expect(result.generatedEntries).toEqual([
      {
        id: "generated-1",
        definitionId: "definition-a",
        recurrenceDate: "2026-09-27",
      },
      {
        id: "generated-2",
        definitionId: "definition-b",
        recurrenceDate: "2026-09-27",
      },
      {
        id: "generated-3",
        definitionId: "definition-a",
        recurrenceDate: "2026-09-28",
      },
      {
        id: "generated-4",
        definitionId: "definition-b",
        recurrenceDate: "2026-09-28",
      },
    ]);
  });

  it("returns zero for an archived project without listing definitions", async () => {
    const { tx } = createTransactionMock({
      project: {
        ...activeProject,
        archivedAt: "2026-09-27T10:00:00.000Z",
      },
    });

    useTransaction(tx);

    const result = await generateDueRecurringEntriesService({
      projectId: PROJECT_ID,
      userId: USER_ID,
      now,
    });

    expect(result).toEqual({
      generatedCount: 0,
      generatedEntries: [],
    });
    expect(
      tx.listEnabledDefinitions,
    ).not.toHaveBeenCalled();
    expect(
      tx.createRecurringOccurrence,
    ).not.toHaveBeenCalled();
  });

  it("rejects generating for a project the user does not own", async () => {
    const { tx } = createTransactionMock({
      project: null,
    });

    useTransaction(tx);

    await expect(
      generateDueRecurringEntriesService({
        projectId: PROJECT_ID,
        userId: USER_ID,
        now,
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Project not found",
    });
  });
});
