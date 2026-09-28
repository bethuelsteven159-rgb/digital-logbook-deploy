import { describe, it, expect, vi, afterEach } from "vitest";

const db = require("../db");
const repository = require("../repositories/projectDetailsRepository");
const {
  updateEntryService,
  getEntryRevisionsService,
  getEntryRevisionService,
  restoreEntryRevisionService,
} = require("../services/projectDetailsService");
const { updateEntrySchema } = require("../validation/entry.validation");

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const projectId = id(1),
  entryId = id(2),
  ownerId = id(3),
  activeId = id(4),
  archivedId = id(5);

// Same in-memory query adapter approach as entryEditSafety.test.js, extended
// with fake entry_revisions storage so revision creation/listing/restore can
// be exercised against the real service, repository SQL and transaction
// wrapper without touching a real Postgres instance.
function harness(failure) {
  let state = {
    entry: {
      id: entryId,
      project_id: projectId,
      name: "Original",
      duration_minutes: 30,
    },
    fields: [
      { id: activeId, name: "Hours", field_type: "number", archived_at: null },
      {
        id: archivedId,
        name: "Supervisor",
        field_type: "short_text",
        archived_at: null,
      },
    ],
    values: [
      {
        id: id(8),
        field_id: activeId,
        value_number: 5,
        value_text: null,
        value_date: null,
      },
    ],
    projects: [],
    references: [],
    revisions: [],
  };

  let revisionCounter = 0;
  const statements = [];
  let snapshot;

  const query = async (raw, args = []) => {
    const sql = raw.replace(/\s+/g, " ").trim();
    statements.push(sql);
    const rows = (items) => ({ rows: items, rowCount: items.length });

    if (sql === "BEGIN") {
      snapshot = structuredClone(state);
      return rows([]);
    }
    if (sql === "ROLLBACK") {
      state = snapshot;
      return rows([]);
    }
    if (sql === "COMMIT") return rows([]);

    if (sql.startsWith("UPDATE project_fields SET archived_at")) {
      for (const field of state.fields)
        if (args[0].includes(field.id)) field.archived_at = "2026-09-01";
      return rows([]);
    }
    if (sql.includes("FROM project_fields pf"))
      return rows(state.fields.filter((f) => args[1] || !f.archived_at));
    if (sql.includes("FROM projects") && sql.includes("owner_id = $2"))
      return rows([{ id: projectId, owner_id: ownerId }]);
    if (sql.startsWith("SELECT e.id FROM entries"))
      return rows(
        (Array.isArray(args[1]) ? args[1] : [entryId]).map((eid) => ({
          id: eid,
        })),
      );
    if (sql.startsWith("SELECT e.id AS entry_id"))
      return rows(
        state.values.map((value) => {
          const field = state.fields.find((f) => f.id === value.field_id);
          return {
            entry_id: entryId,
            project_id: projectId,
            entry_name: state.entry.name,
            duration_minutes: state.entry.duration_minutes,
            value_id: value.id,
            field_id: value.field_id,
            value_text: value.value_text,
            value_number: value.value_number,
            value_date: value.value_date,
            value_created_at: value.created_at,
            field_name: field.name,
            field_type: field.field_type,
            field_archived_at: field.archived_at,
          };
        }),
      );
    if (sql.startsWith("UPDATE entries")) {
      state.entry.name = args[1];
      state.entry.duration_minutes = args[2];
      return rows([state.entry]);
    }
    if (sql.startsWith("DELETE FROM entry_field_values")) {
      state.values = state.values.filter(
        (v) => state.fields.find((f) => f.id === v.field_id).archived_at,
      );
      return rows([]);
    }
    if (sql.startsWith("INSERT INTO entry_field_values")) {
      // Mirror the real uq_entry_field_value (entry_id, field_id) constraint.
      if (state.values.some((v) => v.field_id === args[1])) {
        throw Object.assign(
          new Error("duplicate key value violates unique constraint"),
          { code: "23505" },
        );
      }
      state.values.push({
        id: id(10),
        field_id: args[1],
        value_text: args[2],
        value_number: args[3],
        value_date: args[4],
      });
      return rows([]);
    }

    for (const [table, key, column] of [
      ["entry_project_references", "projects", "referenced_project_id"],
      ["entry_entry_references", "references", "referenced_entry_id"],
    ]) {
      if (sql.includes(`FROM ${table} r`))
        return rows(
          state[key].map((target) => ({
            id: `ref-${target}`,
            [column]: target,
          })),
        );
      if (sql.startsWith(`INSERT INTO ${table}`)) {
        if (failure === key) throw new Error(`${key} write failed`);
        state[key].push(args[1]);
        return rows([]);
      }
      if (sql.startsWith(`DELETE FROM ${table}`)) {
        state[key] = state[key].filter((target) => !args[1].includes(target));
        return rows([]);
      }
    }

    // --- entry_revisions support ---
    if (sql.startsWith("INSERT INTO entry_revisions")) {
      if (failure === "revision") throw new Error("revision write failed");

      revisionCounter += 1;
      const row = {
        id: id(100 + revisionCounter),
        entry_id: args[0],
        project_id: args[1],
        changed_by_id: args[2],
        snapshot: JSON.parse(args[3]),
        created_at: `2026-09-${String(revisionCounter).padStart(2, "0")}T00:00:00Z`,
      };
      state.revisions.push(row);
      return rows([row]);
    }
    if (
      sql.startsWith("SELECT id, entry_id, project_id, changed_by_id") &&
      sql.includes("FROM entry_revisions") &&
      sql.includes("WHERE entry_id = $1")
    ) {
      return rows(
        state.revisions
          .filter((r) => r.entry_id === args[0])
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .slice(0, args[1])
          .map((r) => ({
            ...r,
            name: r.snapshot.name,
            duration_minutes: r.snapshot.durationMinutes,
          })),
      );
    }
    if (
      sql.startsWith("SELECT id, entry_id, project_id, changed_by_id") &&
      sql.includes("FROM entry_revisions") &&
      sql.includes("WHERE id = $1")
    ) {
      return rows(state.revisions.filter((r) => r.id === args[0]));
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  };

  const release = vi.fn();
  const connect = vi.spyOn(db, "connect").mockImplementation(async () => ({
    query,
    release,
  }));
  vi.spyOn(db, "query").mockImplementation(query);

  return { state: () => state, statements, connect, release };
}

function payload(extra = {}) {
  return updateEntrySchema.parse({
    name: "Renamed",
    durationMinutes: 45,
    fieldIds: [activeId],
    values: [{ fieldId: activeId, value: 7 }],
    ...extra,
  });
}

async function save(data) {
  return updateEntryService({ projectId, entryId, userId: ownerId, data });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("entry revision history", () => {
  it("editing an entry creates exactly one revision snapshotting the pre-edit state", async () => {
    const h = harness();

    await save(payload());

    expect(h.state().revisions.length).toBe(1);

    const revision = h.state().revisions[0];
    expect(revision.entry_id).toBe(entryId);
    expect(revision.project_id).toBe(projectId);
    expect(revision.changed_by_id).toBe(ownerId);
    // The snapshot captures the entry as it was BEFORE this edit, not after.
    expect(revision.snapshot.name).toBe("Original");
    expect(revision.snapshot.durationMinutes).toBe(30);
  });

  it("multiple edits accumulate multiple revisions, newest first", async () => {
    harness();

    await save(payload({ name: "First edit" }));
    await save(payload({ name: "Second edit" }));

    const revisions = await getEntryRevisionsService({
      projectId,
      entryId,
      userId: ownerId,
    });

    expect(revisions.length).toBe(2);
    // Newest first: the most recent revision snapshots "First edit" (the
    // state right before the second save), not "Original".
    expect(revisions[0].name).toBe("First edit");
    expect(revisions[1].name).toBe("Original");
  });

  it("a revision write failure rolls back the edit itself, leaving no revision behind", async () => {
    const h = harness("revision");
    const before = structuredClone(h.state());

    await expect(save(payload())).rejects.toThrow(/revision write failed/);

    expect(h.state()).toEqual(before);
    expect(h.statements.at(-1)).toBe("ROLLBACK");
    expect(h.statements.includes("COMMIT")).toBe(false);
  });

  it("getEntryRevisionService returns the full snapshot for a single revision", async () => {
    harness();

    await save(payload({ name: "Renamed once" }));
    const [revision] = await getEntryRevisionsService({
      projectId,
      entryId,
      userId: ownerId,
    });

    const detail = await getEntryRevisionService({
      projectId,
      entryId,
      revisionId: revision.id,
      userId: ownerId,
    });

    expect(detail.name).toBe("Original");
    expect(detail.durationMinutes).toBe(30);
  });

  it("restoring a revision brings back its values and snapshots the pre-restore state first", async () => {
    harness();

    await save(payload({ name: "Renamed once", durationMinutes: 45 }));
    const [revision] = await getEntryRevisionsService({
      projectId,
      entryId,
      userId: ownerId,
    });

    const restored = await restoreEntryRevisionService({
      projectId,
      entryId,
      revisionId: revision.id,
      userId: ownerId,
    });

    // The entry's current values are back to what they were originally.
    expect(restored.name).toBe("Original");
    expect(restored.durationMinutes).toBe(30);

    // Restoring is itself a reversible edit: it must have created a SECOND
    // revision capturing "Renamed once" (the state just before the
    // restore), so restoring never destroys the version being restored
    // from.
    const revisionsAfterRestore = await getEntryRevisionsService({
      projectId,
      entryId,
      userId: ownerId,
    });

    expect(revisionsAfterRestore.length).toBe(2);
    expect(revisionsAfterRestore[0].name).toBe("Renamed once");
  });

  it("requesting revisions for an entry that does not belong to the project is rejected", async () => {
    harness();

    await expect(
      getEntryRevisionsService({
        projectId: id(999),
        entryId,
        userId: ownerId,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("restoring an unknown revision id is rejected", async () => {
    harness();

    await expect(
      restoreEntryRevisionService({
        projectId,
        entryId,
        revisionId: id(9999),
        userId: ownerId,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("restoring a snapshot that includes an archived field's value does not duplicate or lose it", async () => {
    const h = harness();
    h.state().values.push({
      id: id(9),
      field_id: archivedId,
      value_text: "Jane",
      value_number: null,
      value_date: null,
      created_at: "2026-01-01",
    });
    await repository.archiveProjectFields([archivedId]);

    await save(payload({ name: "Edited" }));
    const [revision] = await getEntryRevisionsService({
      projectId,
      entryId,
      userId: ownerId,
    });

    await restoreEntryRevisionService({
      projectId,
      entryId,
      revisionId: revision.id,
      userId: ownerId,
    });

    const archivedRows = h
      .state()
      .values.filter((v) => v.field_id === archivedId);
    expect(archivedRows).toHaveLength(1);
    expect(archivedRows[0].value_text).toBe("Jane");
    expect(
      Number(h.state().values.find((v) => v.field_id === activeId).value_number),
    ).toBe(5);
  });

  it("repeated restores never delete history; each restore adds exactly one revision", async () => {
    harness();
    await save(payload({ name: "First edit" }));
    await save(payload({ name: "Second edit" }));

    const list = () =>
      getEntryRevisionsService({ projectId, entryId, userId: ownerId });
    const restore = (revisionId) =>
      restoreEntryRevisionService({
        projectId,
        entryId,
        revisionId,
        userId: ownerId,
      });

    let revisions = await list();
    expect(revisions.map((r) => r.name)).toEqual(["First edit", "Original"]);
    const firstEdit = revisions[0];
    const original = revisions[1];

    expect((await restore(original.id)).name).toBe("Original");
    expect((await list()).length).toBe(3);

    expect((await restore(firstEdit.id)).name).toBe("First edit");
    expect((await list()).length).toBe(4);

    expect((await restore(original.id)).name).toBe("Original");
    revisions = await list();
    expect(revisions.length).toBe(5);
    expect(revisions.map((r) => r.name)).toEqual(
      expect.arrayContaining(["Original", "First edit", "Second edit"]),
    );
  });

  it("restore leaves references untouched (it restores name, duration, due date and field values only)", async () => {
    const h = harness();
    await save(payload({ name: "Edited" }));
    h.state().projects = [id(6)];
    h.state().references = [id(7)];
    const [revision] = await getEntryRevisionsService({
      projectId,
      entryId,
      userId: ownerId,
    });

    await restoreEntryRevisionService({
      projectId,
      entryId,
      revisionId: revision.id,
      userId: ownerId,
    });

    expect(h.state().projects).toEqual([id(6)]);
    expect(h.state().references).toEqual([id(7)]);
  });
});
