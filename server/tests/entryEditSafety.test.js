const { test } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../db");
const repository = require("../repositories/projectDetailsRepository");
const { updateEntryService, serializeEntry } = require("../services/projectDetailsService");
const { updateEntrySchema } = require("../validation/entry.validation");
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const projectId = id(1), entryId = id(2), ownerId = id(3), activeId = id(4), archivedId = id(5);
const targetProject = id(6), targetEntry = id(7);

// Exercise the real service, repository SQL and transaction wrapper against an
// in-memory query adapter. Unexpected queries fail instead of contacting pg.
function harness(t, failure) {
  let state = {
    entry: { id: entryId, project_id: projectId, name: "Original", duration_minutes: 30 },
    fields: [
      { id: activeId, name: "Hours", field_type: "number", archived_at: null },
      { id: archivedId, name: "Supervisor", field_type: "short_text", archived_at: null },
    ],
    values: [
      { id: id(8), field_id: activeId, value_number: 5, value_text: null, value_date: null },
      { id: id(9), field_id: archivedId, value_text: "Jane", value_number: null, value_date: null, created_at: "2026-01-01" },
    ],
    projects: [], references: [],
  };
  const statements = [];
  let snapshot;
  const query = async (raw, args = []) => {
    const sql = raw.replace(/\s+/g, " ").trim();
    statements.push(sql);
    const rows = (items) => ({ rows: items, rowCount: items.length });
    if (sql === "BEGIN") { snapshot = structuredClone(state); return rows([]); }
    if (sql === "ROLLBACK") { state = snapshot; return rows([]); }
    if (sql === "COMMIT") return rows([]);
    if (sql.startsWith("UPDATE project_fields SET archived_at")) {
      for (const field of state.fields) if (args[0].includes(field.id)) field.archived_at = "2026-09-01";
      return rows([]);
    }
    if (sql.includes("FROM project_fields pf")) return rows(state.fields.filter(f => args[1] || !f.archived_at));
    if (sql.includes("FROM projects") && sql.includes("owner_id = $2")) return rows([{ id: projectId, owner_id: ownerId }]);
    if (sql.startsWith("SELECT id FROM projects")) return rows(args[1].map(id => ({ id })));
    if (sql.startsWith("SELECT e.id FROM entries")) return rows((Array.isArray(args[1]) ? args[1] : [entryId]).map(id => ({ id })));
    if (sql.startsWith("SELECT e.id AS entry_id")) return rows(state.values.map(value => {
      const field = state.fields.find(f => f.id === value.field_id);
      return { entry_id: entryId, project_id: projectId, entry_name: state.entry.name,
        duration_minutes: state.entry.duration_minutes, value_id: value.id, field_id: value.field_id,
        value_text: value.value_text, value_number: value.value_number, value_date: value.value_date,
        value_created_at: value.created_at, field_name: field.name, field_type: field.field_type,
        field_archived_at: field.archived_at };
    }));
    if (sql.startsWith("UPDATE entries")) {
      state.entry.name = args[1]; state.entry.duration_minutes = args[2]; return rows([state.entry]);
    }
    if (sql.startsWith("DELETE FROM entry_field_values")) {
      assert.match(sql, /USING project_fields f/);
      assert.match(sql, /v.field_id = f.id/);
      assert.match(sql, /f.archived_at IS NULL/);
      state.values = state.values.filter(v => state.fields.find(f => f.id === v.field_id).archived_at);
      return rows([]);
    }
    if (sql.startsWith("INSERT INTO entry_field_values")) {
      state.values.push({ id: id(10), field_id: args[1], value_text: args[2], value_number: args[3], value_date: args[4] });
      return rows([]);
    }
    for (const [table, key, column] of [
      ["entry_project_references", "projects", "referenced_project_id"],
      ["entry_entry_references", "references", "referenced_entry_id"],
    ]) {
      if (sql.includes(`FROM ${table} r`)) return rows(state[key].map(target => ({ id: `ref-${target}`, [column]: target })));
      if (sql.startsWith(`INSERT INTO ${table}`)) {
        if (failure === key) throw new Error(`${key} write failed`);
        state[key].push(args[1]); return rows([]);
      }
      if (sql.startsWith(`DELETE FROM ${table}`)) {
        state[key] = state[key].filter(target => !args[1].includes(target)); return rows([]);
      }
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  };
  const release = t.mock.fn();
  const connect = t.mock.method(db, "connect", async () => ({ query, release }));
  t.mock.method(db, "query", query);
  return { state: () => state, statements, connect, release };
}
function payload(extra = {}) {
  return updateEntrySchema.parse({ name: "Renamed", durationMinutes: 30,
    fieldIds: [activeId], values: [{ fieldId: activeId, value: 7 }],
    referenceProjectIds: [targetProject], referenceEntryIds: [targetEntry], ...extra });
}
async function save(data) { return updateEntryService({ projectId, entryId, userId: ownerId, data }); }

for (const hours of [5, 7]) {
  test(`archived historical value survives edit and retrieval with Hours=${hours}`, async (t) => {
    const h = harness(t);
    const original = structuredClone(h.state().values[1]);
    await repository.archiveProjectFields([archivedId]);
    await save(payload({ values: [{ fieldId: activeId, value: hours }] }));
    const entry = serializeEntry(await repository.getEntryById(entryId));
    assert.equal(entry.name, "Renamed");
    assert.equal(entry.values.find(v => v.fieldId === archivedId).value, "Jane");
    assert.equal(entry.values.find(v => v.fieldId === archivedId).archived, true);
    assert.equal(entry.values.find(v => v.fieldId === activeId).value, hours);
    assert.deepEqual(h.state().values.find(v => v.field_id === archivedId), original);
    assert.deepEqual(h.state().projects, [targetProject]);
    assert.deepEqual(h.state().references, [targetEntry]);
    assert.equal(h.connect.mock.callCount(), 1);
    assert.equal(h.release.mock.callCount(), 1);
    assert.equal(h.statements.filter(s => s === "COMMIT").length, 1);
  });
}
for (const stage of ["projects", "references"]) {
  test(`${stage} failure rolls back metadata, values and both reference types`, async (t) => {
    const h = harness(t, stage);
    await repository.archiveProjectFields([archivedId]);
    const before = structuredClone(h.state());
    await assert.rejects(save(payload()), new RegExp(`${stage} write failed`));
    assert.deepEqual(h.state(), before);
    assert.equal(h.statements.at(-1), "ROLLBACK");
    assert.ok(!h.statements.includes("COMMIT"));
    assert.equal(h.connect.mock.callCount(), 1);
    assert.equal(h.release.mock.callCount(), 1);
  });
}
test("omitted reference lists preserve references, explicit empty lists clear them", async (t) => {
  const h = harness(t);
  await repository.archiveProjectFields([archivedId]);
  h.state().projects = [targetProject]; h.state().references = [targetEntry];
  await save(payload({ referenceProjectIds: undefined, referenceEntryIds: undefined }));
  assert.deepEqual(h.state().projects, [targetProject]);
  assert.deepEqual(h.state().references, [targetEntry]);
  await save(payload({ referenceProjectIds: [], referenceEntryIds: [] }));
  assert.deepEqual(h.state().projects, []);
  assert.deepEqual(h.state().references, []);
});
test("archived fields cannot be submitted as editable values", async (t) => {
  const h = harness(t);
  await repository.archiveProjectFields([archivedId]);
  const before = structuredClone(h.state());
  await assert.rejects(save(payload({ fieldIds: [activeId, archivedId] })), { statusCode: 400 });
  assert.deepEqual(h.state(), before);
});
test("entry update validation rejects invalid reference IDs before persistence", () => {
  for (const field of ["referenceProjectIds", "referenceEntryIds"]) {
    assert.equal(updateEntrySchema.safeParse({ name: "Work", durationMinutes: 30, [field]: ["invalid"] }).success, false);
  }
});
