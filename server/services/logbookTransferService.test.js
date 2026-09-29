import { createRequire } from "node:module";
import { describe, it, expect, vi, beforeEach } from "vitest";

const require = createRequire(import.meta.url);

// Load the CommonJS modules via require so the service and the test share
// the same repository instance, then replace its functions with mocks.
const repository = require("../repositories/logbookTransferRepository.js");
repository.getLogbook = vi.fn();
repository.withTransaction = vi.fn();

const {
  exportLogbookService,
  importLogbookService,
  validateImportPayload,
} = require("./logbookTransferService.js");

function buildLogbookRows() {
  return {
    projects: [
      {
        id: "proj-1",
        name: "Research",
        description: "desc",
        start_date: "2026-01-01",
        end_date: null,
        archived_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
    ],
    fields: [
      {
        id: "field-1",
        project_id: "proj-1",
        name: "Notes",
        field_type: "long_text",
        position: 0,
        required: false,
        archived_at: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    entries: [
      {
        id: "entry-1",
        project_id: "proj-1",
        name: "First entry",
        duration_minutes: 30,
        occurred_at: "2026-01-03T00:00:00.000Z",
        archived_at: null,
        created_at: "2026-01-03T00:00:00.000Z",
        updated_at: "2026-01-03T00:00:00.000Z",
      },
    ],
    values: [
      {
        id: "value-1",
        entry_id: "entry-1",
        field_id: "field-1",
        value_text: "hello",
        value_number: null,
        value_date: null,
        created_at: "2026-01-03T00:00:00.000Z",
      },
    ],
    checklist: [
      {
        id: "check-1",
        entry_id: "entry-1",
        text: "Do the thing",
        completed: false,
        position: 0,
        created_at: "2026-01-03T00:00:00.000Z",
        updated_at: "2026-01-03T00:00:00.000Z",
      },
    ],
    references: [{ entry_id: "entry-1", referenced_project_id: "proj-1" }],
  };
}

function buildValidImportPayload() {
  return {
    version: 1,
    exportedAt: "2026-01-05T00:00:00.000Z",
    projects: [
      {
        id: "proj-1",
        name: "Research",
        description: "desc",
        startDate: "2026-01-01",
        endDate: null,
        fields: [
          {
            id: "field-1",
            name: "Notes",
            fieldType: "long_text",
            position: 0,
            required: false,
          },
        ],
        entries: [
          {
            id: "entry-1",
            name: "First entry",
            durationMinutes: 30,
            occurredAt: "2026-01-03T00:00:00.000Z",
            values: [{ fieldId: "field-1", valueText: "hello" }],
            checklist: [{ text: "Do the thing", completed: false, position: 0 }],
            referenceProjectIds: ["proj-1"],
          },
        ],
      },
    ],
  };
}

describe("exportLogbookService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("groups flat repository rows into nested projects, fields and entries", async () => {
    repository.getLogbook.mockResolvedValue(buildLogbookRows());

    const result = await exportLogbookService({ userId: "user-1" });

    expect(result.version).toBe(1);
    expect(result.projects).toHaveLength(1);

    const project = result.projects[0];
    expect(project.id).toBe("proj-1");
    expect(project.fields).toHaveLength(1);
    expect(project.entries).toHaveLength(1);

    const entry = project.entries[0];
    expect(entry.id).toBe("entry-1");
    expect(entry.values).toHaveLength(1);
    expect(entry.checklist).toHaveLength(1);
    expect(entry.referenceProjectIds).toEqual(["proj-1"]);
  });

  it("converts date columns to ISO strings and passes through nulls", async () => {
    repository.getLogbook.mockResolvedValue(buildLogbookRows());

    const result = await exportLogbookService({ userId: "user-1" });
    const project = result.projects[0];

    expect(project.archivedAt).toBeNull();
    expect(project.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(typeof result.exportedAt).toBe("string");
  });

  it("includes archivedAt on exported entries", async () => {
    repository.getLogbook.mockResolvedValue(buildLogbookRows());

    const result = await exportLogbookService({ userId: "user-1" });
    const entry = result.projects[0].entries[0];

    expect(entry.archivedAt).toBeNull();
  });
});

describe("validateImportPayload", () => {
  it("accepts a well-formed payload", () => {
    expect(() => validateImportPayload(buildValidImportPayload())).not.toThrow();
  });

  it("rejects a missing or non-object payload", () => {
    expect(() => validateImportPayload(null)).toThrow(/JSON object/);
    expect(() => validateImportPayload("nope")).toThrow(/JSON object/);
  });

  it("rejects an unsupported version", () => {
    const payload = { ...buildValidImportPayload(), version: 2 };
    expect(() => validateImportPayload(payload)).toThrow(/Unsupported logbook export version/);
  });

  it("rejects a payload whose projects field is not an array", () => {
    const payload = { ...buildValidImportPayload(), projects: {} };
    expect(() => validateImportPayload(payload)).toThrow(/projects array/);
  });

  it("rejects duplicate project ids", () => {
    const payload = buildValidImportPayload();
    payload.projects.push({ ...payload.projects[0] });
    expect(() => validateImportPayload(payload)).toThrow(/Duplicate project id/);
  });

  it("rejects a project with an invalid name", () => {
    const payload = buildValidImportPayload();
    payload.projects[0].name = "   ";
    expect(() => validateImportPayload(payload)).toThrow(/valid name/);
  });

  it("rejects duplicate field ids across the import file", () => {
    const payload = buildValidImportPayload();
    payload.projects[0].fields.push({ ...payload.projects[0].fields[0] });
    expect(() => validateImportPayload(payload)).toThrow(/duplicate field id/);
  });

  it("rejects a field with an unsupported field type", () => {
    const payload = buildValidImportPayload();
    payload.projects[0].fields[0].fieldType = "not_a_real_type";
    expect(() => validateImportPayload(payload)).toThrow(/field is invalid/);
  });

  it("rejects an entry with a negative or over-limit duration", () => {
    const payload = buildValidImportPayload();
    payload.projects[0].entries[0].durationMinutes = -5;
    expect(() => validateImportPayload(payload)).toThrow(/duration is invalid/);

    const tooLong = buildValidImportPayload();
    tooLong.projects[0].entries[0].durationMinutes = 999999;
    expect(() => validateImportPayload(tooLong)).toThrow(/duration is invalid/);
  });

  it("rejects an entry value that references an unknown field", () => {
    const payload = buildValidImportPayload();
    payload.projects[0].entries[0].values[0].fieldId = "field-does-not-exist";
    expect(() => validateImportPayload(payload)).toThrow(/unknown field/);
  });

  it("rejects an entry reference to an unknown project", () => {
    const payload = buildValidImportPayload();
    payload.projects[0].entries[0].referenceProjectIds = ["proj-does-not-exist"];
    expect(() => validateImportPayload(payload)).toThrow(/unknown project/);
  });

  it("rejects an overlong checklist item", () => {
    const payload = buildValidImportPayload();
    payload.projects[0].entries[0].checklist[0].text = "x".repeat(301);
    expect(() => validateImportPayload(payload)).toThrow(/checklist item is invalid/);
  });
});

describe("importLogbookService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("normalizes nested payload into flat arrays before writing", async () => {
    const tx = { insertImportedLogbook: vi.fn().mockResolvedValue({ imported: true }) };
    repository.withTransaction.mockImplementation((callback) => callback(tx));

    const payload = buildValidImportPayload();
    await importLogbookService({ userId: "user-1", payload });

    expect(tx.insertImportedLogbook).toHaveBeenCalledTimes(1);
    const [userId, normalized] = tx.insertImportedLogbook.mock.calls[0];

    expect(userId).toBe("user-1");
    expect(normalized.projects).toHaveLength(1);
    expect(normalized.fields).toEqual([
      expect.objectContaining({ id: "field-1", projectId: "proj-1" }),
    ]);
    expect(normalized.entries).toEqual([
      expect.objectContaining({ id: "entry-1", projectId: "proj-1" }),
    ]);
    expect(normalized.values).toEqual([
      expect.objectContaining({ fieldId: "field-1", entryId: "entry-1" }),
    ]);
    expect(normalized.checklist).toEqual([
      expect.objectContaining({ entryId: "entry-1" }),
    ]);
    expect(normalized.references).toEqual([
      { entryId: "entry-1", referencedProjectId: "proj-1" },
    ]);
  });

  it("rejects an invalid payload before ever opening a transaction", async () => {
    const payload = { version: 999, projects: [] };

    await expect(
      importLogbookService({ userId: "user-1", payload }),
    ).rejects.toThrow(/Unsupported logbook export version/);

    expect(repository.withTransaction).not.toHaveBeenCalled();
  });
});

describe("export/import round trip", () => {
  it("produces export output that the import validator accepts unchanged", async () => {
    repository.getLogbook.mockResolvedValue(buildLogbookRows());

    const exported = await exportLogbookService({ userId: "user-1" });

    expect(() => validateImportPayload(exported)).not.toThrow();
  });
});

describe("importLogbookService archivedAt handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("carries archivedAt on imported entries through to the repository write", async () => {
    const tx = { insertImportedLogbook: vi.fn().mockResolvedValue({ imported: true }) };
    repository.withTransaction.mockImplementation((callback) => callback(tx));

    const payload = buildValidImportPayload();
    payload.projects[0].entries[0].archivedAt = "2026-02-01T00:00:00.000Z";

    await importLogbookService({ userId: "user-1", payload });

    const [, normalized] = tx.insertImportedLogbook.mock.calls[0];
    expect(normalized.entries[0].archivedAt).toBeTruthy();
    expect(new Date(normalized.entries[0].archivedAt).toISOString()).toBe(
      "2026-02-01T00:00:00.000Z",
    );
  });
});