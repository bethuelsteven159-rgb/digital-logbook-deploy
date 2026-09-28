import { describe, it, expect, vi } from "vitest";

const {
  updateEntryProjectReferencesService,
} = require("../services/projectDetailsService");

const entryId = "entry-1";
const userId = "user-1";
const ownProjectId = "project-1";

// Builds a fake transaction object matching the subset of the repository
// interface updateEntryProjectReferencesService actually calls. Passing it
// directly as the second argument bypasses repository.withTransaction
// entirely, so these tests don't need a real database or the SQL-mocking
// harness used elsewhere in this codebase.
function fakeTransaction({
  ownedEntry = { id: entryId, projectId: ownProjectId },
  currentEntry = { id: entryId, projectId: ownProjectId },
  existingReferences = [],
  ownedProjectIds = null, // null = "owns everything asked about"
} = {}) {
  return {
    getOwnedEntry: vi.fn().mockResolvedValue(ownedEntry),
    getEntryById: vi.fn().mockResolvedValue(currentEntry),
    getEntryProjectReferences: vi
      .fn()
      .mockResolvedValue(existingReferences),
    getOwnedProjectIds: vi
      .fn()
      .mockImplementation(async (ids) =>
        ownedProjectIds === null ? ids : ownedProjectIds,
      ),
    createEntryProjectReferences: vi.fn().mockResolvedValue(undefined),
    removeEntryProjectReferences: vi.fn().mockResolvedValue(undefined),
  };
}

function ref(projectId, projectName = `Project ${projectId}`) {
  return { id: `ref-${projectId}`, projectId, projectName };
}

async function call(tx, projectIds) {
  return updateEntryProjectReferencesService(
    { entryId, userId, projectIds },
    tx,
  );
}

describe("US-104: entry-to-project references", () => {
  it("adds new project references when none exist", async () => {
    const tx = fakeTransaction({ existingReferences: [] });

    await call(tx, ["project-2", "project-3"]);

    expect(tx.createEntryProjectReferences).toHaveBeenCalledWith(entryId, [
      "project-2",
      "project-3",
    ]);
    expect(tx.removeEntryProjectReferences).not.toHaveBeenCalled();
  });

  it("removes references that are no longer desired", async () => {
    const tx = fakeTransaction({
      existingReferences: [ref("project-2"), ref("project-3")],
    });

    await call(tx, ["project-2"]);

    expect(tx.removeEntryProjectReferences).toHaveBeenCalledWith(entryId, [
      "project-3",
    ]);
    expect(tx.createEntryProjectReferences).not.toHaveBeenCalled();
  });

  it("adds and removes together when replacing the reference set", async () => {
    const tx = fakeTransaction({
      existingReferences: [ref("project-2")],
    });

    await call(tx, ["project-3"]);

    expect(tx.createEntryProjectReferences).toHaveBeenCalledWith(entryId, [
      "project-3",
    ]);
    expect(tx.removeEntryProjectReferences).toHaveBeenCalledWith(entryId, [
      "project-2",
    ]);
  });

  it("clears all references when given an empty list", async () => {
    const tx = fakeTransaction({
      existingReferences: [ref("project-2"), ref("project-3")],
    });

    await call(tx, []);

    expect(tx.removeEntryProjectReferences).toHaveBeenCalledWith(entryId, [
      "project-2",
      "project-3",
    ]);
  });

  it("is a no-op when the desired set already matches the existing set", async () => {
    const tx = fakeTransaction({
      existingReferences: [ref("project-2")],
    });

    await call(tx, ["project-2"]);

    expect(tx.createEntryProjectReferences).not.toHaveBeenCalled();
    expect(tx.removeEntryProjectReferences).not.toHaveBeenCalled();
  });

  it("deduplicates repeated project IDs in the input", async () => {
    const tx = fakeTransaction({ existingReferences: [] });

    await call(tx, ["project-2", "project-2", "project-2"]);

    expect(tx.createEntryProjectReferences).toHaveBeenCalledWith(entryId, [
      "project-2",
    ]);
  });

  it("rejects an entry that does not belong to the user", async () => {
    const tx = fakeTransaction({ ownedEntry: null });

    await expect(call(tx, ["project-2"])).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(tx.createEntryProjectReferences).not.toHaveBeenCalled();
  });

  it("rejects referencing the entry's own project", async () => {
    const tx = fakeTransaction();

    await expect(call(tx, [ownProjectId])).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(tx.createEntryProjectReferences).not.toHaveBeenCalled();
  });

  it("rejects a project that does not belong to the user", async () => {
    const tx = fakeTransaction({
      ownedProjectIds: [], // simulates none of the requested projects being owned
    });

    await expect(call(tx, ["project-2"])).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(tx.createEntryProjectReferences).not.toHaveBeenCalled();
  });

  it("returns the current list of project references after the update", async () => {
    const finalReferences = [ref("project-2")];
    const tx = fakeTransaction({ existingReferences: [] });
    tx.getEntryProjectReferences
      .mockResolvedValueOnce([]) // read before the update
      .mockResolvedValueOnce(finalReferences); // read after the update

    const result = await call(tx, ["project-2"]);

    expect(result).toEqual(finalReferences);
  });
});
