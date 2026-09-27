const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../db');
const repository = require('../repositories/projectDetailsRepository');
const { syncProjectFields } = require('../services/projectFieldsService');
const { evaluateFormula } = require('../services/computedFieldService');
const {
  updateEntryService,
  serializeEntry,
} = require('../services/projectDetailsService');

function uuid(number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

const PROJECT_ID = uuid(1);
const OWNER_ID = uuid(3);
const HOURS_ID = uuid(10);
const RATE_ID = uuid(11);
const TOTAL_ID = uuid(12);
const NOTES_ID = uuid(13);
const ENTRY_ID = uuid(20);
const CREATED_AT = '2026-01-01T00:00:00.000Z';
const NOW = '2026-03-01T00:00:00.000Z';

function fieldRow(id, name, fieldType, position, overrides = {}) {
  return {
    id,
    project_id: PROJECT_ID,
    name,
    field_type: fieldType,
    formula: null,
    position,
    required: false,
    archived_at: null,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function scenarioFields() {
  return [
    fieldRow(HOURS_ID, 'Hours', 'number', 0),
    fieldRow(RATE_ID, 'Rate', 'number', 1),
    fieldRow(TOTAL_ID, 'Total', 'computed', 2, { formula: 'Hours * Rate' }),
    fieldRow(NOTES_ID, 'Notes', 'short_text', 3),
  ];
}

function entryRow(overrides = {}) {
  return {
    id: ENTRY_ID,
    project_id: PROJECT_ID,
    created_by_id: OWNER_ID,
    name: 'Historical entry',
    duration_minutes: 30,
    occurred_at: CREATED_AT,
    tags: [],
    due_at: null,
    completed_at: null,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function valueRow(id, fieldId, overrides = {}) {
  return {
    id,
    entryId: ENTRY_ID,
    fieldId,
    valueText: null,
    valueNumber: null,
    valueDate: null,
    created_at: CREATED_AT,
    ...overrides,
  };
}

function scenarioValues() {
  return [
    valueRow(uuid(30), HOURS_ID, { valueNumber: '3' }),
    valueRow(uuid(31), RATE_ID, { valueNumber: '20' }),
    valueRow(uuid(32), NOTES_ID, { valueText: 'Original note' }),
  ];
}

// Model the tables, the (entry_id, field_id) unique index and transaction
// semantics behind entry edits so the repository's real SQL runs against
// in-memory state; unrecognized SQL fails the test.
function createClient({
  fields = scenarioFields(),
  entries = [entryRow()],
  entryValues = scenarioValues(),
  failQuery,
} = {}) {
  const client = {
    fields: structuredClone(fields),
    entries: structuredClone(entries),
    entryValues: structuredClone(entryValues),
    project: {
      id: PROJECT_ID,
      owner_id: OWNER_ID,
      name: 'Original project',
      description: null,
      start_date: null,
      end_date: null,
      archived_at: null,
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    },
    queries: [],
    releaseCount: 0,
    now: NOW,
    activeFields(projectId = PROJECT_ID) {
      return this.fields
        .filter((field) => field.project_id === projectId && !field.archived_at)
        .sort((left, right) => left.position - right.position);
    },
    snapshot() {
      return structuredClone({
        fields: this.fields,
        entries: this.entries,
        entryValues: this.entryValues,
        project: this.project,
      });
    },
    release() {
      this.releaseCount += 1;
    },
  };
  let transaction = null;
  let nextId = 100;

  function assertUnique(candidate) {
    if (candidate.archived_at) return;
    const conflict = client.fields.some(
      (field) =>
        field.id !== candidate.id &&
        field.project_id === candidate.project_id &&
        !field.archived_at &&
        field.name.toLowerCase() === candidate.name.toLowerCase(),
    );
    if (conflict) {
      throw Object.assign(new Error('Active field name violates unique index'), {
        code: '23505',
      });
    }
  }

  function usedByEntries(field) {
    return client.entryValues.some((value) => {
      if (value.fieldId !== field.id) return false;
      const entry = client.entries.find((item) => item.id === value.entryId);
      return Boolean(entry && entry.project_id === field.project_id);
    });
  }

  function joinedEntryRows(entryId) {
    const entry = client.entries.find((item) => item.id === entryId);
    if (!entry) return [];
    const base = {
      entry_id: entry.id,
      project_id: entry.project_id,
      created_by_id: entry.created_by_id,
      entry_name: entry.name,
      duration_minutes: entry.duration_minutes,
      occurred_at: entry.occurred_at,
      tags: entry.tags,
      due_at: entry.due_at,
      completed_at: entry.completed_at,
      entry_created_at: entry.created_at,
      entry_updated_at: entry.updated_at,
    };
    const values = client.entryValues
      .filter((value) => value.entryId === entryId)
      .sort((left, right) => String(left.created_at).localeCompare(String(right.created_at)));
    if (values.length === 0) {
      return [
        {
          ...base,
          value_id: null,
          field_id: null,
          value_text: null,
          value_number: null,
          value_date: null,
          value_created_at: null,
          field_name: null,
          field_archived_at: null,
          field_type: null,
        },
      ];
    }
    return values.map((value) => {
      const field = client.fields.find((item) => item.id === value.fieldId);
      return {
        ...base,
        value_id: value.id,
        field_id: value.fieldId,
        value_text: value.valueText,
        value_number: value.valueNumber,
        value_date: value.valueDate,
        value_created_at: value.created_at,
        field_name: field ? field.name : null,
        field_archived_at: field ? field.archived_at : null,
        field_type: field ? field.field_type : null,
      };
    });
  }

  client.fields.forEach(assertUnique);
  client.query = async (text, parameters = []) => {
    const sql = text.replace(/\s+/g, ' ').trim();
    client.queries.push({ sql, parameters: structuredClone(parameters) });
    const failure = failQuery?.(sql, parameters);
    if (failure) throw failure;

    if (sql === 'BEGIN') {
      assert.equal(transaction, null);
      transaction = client.snapshot();
      return { rows: [] };
    }
    if (sql === 'COMMIT') {
      assert.ok(transaction);
      transaction = null;
      return { rows: [] };
    }
    if (sql === 'ROLLBACK') {
      assert.ok(transaction);
      Object.assign(client, structuredClone(transaction));
      transaction = null;
      return { rows: [] };
    }
    if (sql.startsWith('SELECT ') && sql.includes(' FROM projects ')) {
      assert.match(sql, /WHERE id = \$1 AND owner_id = \$2/);
      const owned =
        parameters[0] === client.project.id && parameters[1] === client.project.owner_id;
      return { rows: owned ? [structuredClone(client.project)] : [] };
    }
    if (sql.startsWith('SELECT ') && sql.includes(' FROM project_fields ')) {
      assert.match(sql, /WHERE (?:pf\.)?project_id = \$1/);
      assert.match(sql, /archived_at IS NULL/);
      const includeArchived = sql.includes('$2::boolean') && parameters[1] === true;
      const rows = client.fields
        .filter(
          (field) =>
            field.project_id === parameters[0] && (includeArchived || !field.archived_at),
        )
        .sort((left, right) => left.position - right.position)
        .map((field) => ({ ...field, used_by_entries: usedByEntries(field) }));
      return { rows: structuredClone(rows) };
    }
    if (sql.startsWith('UPDATE project_fields SET formula = $2 WHERE id = $1')) {
      const field = client.fields.find((item) => item.id === parameters[0]);
      assert.ok(field, 'formula updates must use an existing field ID');
      field.formula = parameters[1];
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('UPDATE project_fields SET archived_at = NOW()')) {
      if (sql.includes('WHERE id = ANY($1::uuid[])')) {
        const ids = new Set(parameters[0]);
        let archived = 0;
        for (const field of client.fields) {
          if (ids.has(field.id) && !field.archived_at) {
            field.archived_at = client.now;
            field.updated_at = client.now;
            archived += 1;
          }
        }
        return { rows: [], rowCount: archived };
      }
      assert.match(sql, /WHERE project_id = \$1 AND archived_at IS NULL$/);
      for (const field of client.activeFields(parameters[0])) {
        field.archived_at = client.now;
        field.updated_at = client.now;
      }
      return { rows: [] };
    }
    if (sql.startsWith('UPDATE project_fields SET name = $2')) {
      assert.match(sql, /position = \$3, archived_at = NULL/);
      assert.match(sql, /WHERE id = \$1 AND project_id = \$4$/);
      const field = client.fields.find(
        (item) => item.id === parameters[0] && item.project_id === parameters[3],
      );
      assert.ok(field);
      const changed = {
        ...field,
        name: parameters[1],
        position: parameters[2],
        archived_at: null,
        updated_at: client.now,
      };
      assertUnique(changed);
      Object.assign(field, changed);
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('INSERT INTO project_fields ')) {
      if (sql.includes('VALUES ($1, $2, $3, $4, $5, $6)')) {
        const [projectId, name, fieldType, formula, position, required] = parameters;
        const field = fieldRow(uuid(nextId++), name, fieldType, position, {
          project_id: projectId,
          formula,
          required: required ?? false,
          created_at: client.now,
          updated_at: client.now,
        });
        assertUnique(field);
        client.fields.push(field);
        return { rows: [structuredClone(field)], rowCount: 1 };
      }
      assert.match(sql, /VALUES \(\$1, \$2, \$3, \$4, \$5, FALSE\) RETURNING id$/);
      const [projectId, name, fieldType, formula, position] = parameters;
      const field = fieldRow(uuid(nextId++), name, fieldType, position, {
        project_id: projectId,
        formula,
        created_at: client.now,
        updated_at: client.now,
      });
      assertUnique(field);
      client.fields.push(field);
      return { rows: [{ id: field.id }], rowCount: 1 };
    }
    if (sql.startsWith('SELECT ') && sql.includes(' FROM entries e ')) {
      assert.match(sql, /WHERE e\.id = \$1/);
      return { rows: joinedEntryRows(parameters[0]) };
    }
    if (sql.startsWith('UPDATE entries SET name = $2')) {
      assert.match(sql, /WHERE id = \$1 RETURNING/);
      const entry = client.entries.find((item) => item.id === parameters[0]);
      assert.ok(entry, 'entry updates must target an existing entry');
      Object.assign(entry, {
        name: parameters[1],
        duration_minutes: parameters[2],
        due_at: parameters[3],
        updated_at: client.now,
      });
      return { rows: [structuredClone(entry)], rowCount: 1 };
    }
    if (
      sql.startsWith('DELETE FROM entry_field_values v USING project_fields f')
    ) {
      assert.match(sql, /v\.field_id = f\.id/);
      assert.match(sql, /f\.archived_at IS NULL/);
      const before = client.entryValues.length;
      client.entryValues = client.entryValues.filter((value) => {
        if (value.entryId !== parameters[0]) return true;
        const field = client.fields.find((item) => item.id === value.fieldId);
        return !field || Boolean(field.archived_at);
      });
      return { rows: [], rowCount: before - client.entryValues.length };
    }
    if (sql.startsWith('INSERT INTO entry_field_values ')) {
      assert.match(sql, /VALUES \(\$1, \$2, \$3, \$4, \$5\)$/);
      const [entryId, fieldId, valueText, valueNumber, valueDate] = parameters;
      const conflict = client.entryValues.some(
        (value) => value.entryId === entryId && value.fieldId === fieldId,
      );
      if (conflict) {
        throw Object.assign(new Error('Duplicate entry field value violates unique index'), {
          code: '23505',
        });
      }
      client.entryValues.push(
        valueRow(uuid(nextId++), fieldId, {
          entryId,
          valueText,
          valueNumber,
          valueDate,
          created_at: client.now,
        }),
      );
      return { rows: [], rowCount: 1 };
    }
  if (sql.startsWith('INSERT INTO entry_revisions ')) {
    assert.match(sql, /VALUES \(\$1, \$2, \$3, \$4::jsonb\) RETURNING/);
    const [entryId, projectId, changedById, snapshot] = parameters;
    return {
      rows: [{
        id: uuid(nextId++),
        entry_id: entryId,
        project_id: projectId,
        changed_by_id: changedById,
        snapshot,
        created_at: client.now,
      }],
      rowCount: 1,
    };
  }
    throw new Error(`Unexpected SQL in entry edit schema evolution test: ${sql}`);
  };
  return client;
}

function mockDatabase(t, client) {
  t.mock.method(db, 'query', client.query);
  t.mock.method(db, 'connect', async () => client);
}

function storedValues(client, entryId = ENTRY_ID) {
  return client.entryValues
    .filter((value) => value.entryId === entryId)
    .map((value) => [
      value.fieldId,
      value.valueNumber !== null && value.valueNumber !== undefined
        ? Number(value.valueNumber)
        : value.valueText,
    ])
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function editData(overrides = {}) {
  return {
    name: 'Updated entry',
    durationMinutes: 45,
    fieldIds: [HOURS_ID, RATE_ID, TOTAL_ID],
    values: [
      { fieldId: HOURS_ID, value: '4' },
      { fieldId: RATE_ID, value: '25' },
    ],
    newFields: [],
    newChecklistItems: [],
    ...overrides,
  };
}

async function archiveNotes(client) {
  await syncProjectFields(client, PROJECT_ID, [
    { id: HOURS_ID },
    { id: RATE_ID },
    { id: TOTAL_ID },
  ]);
}

test('clearing an active field value through an edit removes only that value', async (t) => {
  const client = createClient();
  await archiveNotes(client);
  mockDatabase(t, client);

  await updateEntryService({
    projectId: PROJECT_ID,
    entryId: ENTRY_ID,
    userId: OWNER_ID,
    data: editData({
      values: [
        { fieldId: HOURS_ID, value: '' },
        { fieldId: RATE_ID, value: '25' },
      ],
    }),
  });

  assert.deepEqual(storedValues(client), [
    [RATE_ID, 25],
    [NOTES_ID, 'Original note'],
  ]);
});

test('adding a field through an entry edit stores its value and keeps existing values', async (t) => {
  const client = createClient();
  mockDatabase(t, client);

  await updateEntryService({
    projectId: PROJECT_ID,
    entryId: ENTRY_ID,
    userId: OWNER_ID,
    data: editData({
      fieldIds: [HOURS_ID, RATE_ID, TOTAL_ID, NOTES_ID],
      values: [
        { fieldId: HOURS_ID, value: '3' },
        { fieldId: RATE_ID, value: '20' },
        { fieldId: NOTES_ID, value: 'Original note' },
      ],
      newFields: [
        { clientId: 'new-field', name: 'Priority', type: 'short_text', value: 'High' },
      ],
    }),
  });

  const created = client.fields.find((field) => field.name === 'Priority');
  assert.equal(created.field_type, 'short_text');
  assert.equal(created.archived_at, null);
  assert.equal(created.position, 4);
  assert.deepEqual(storedValues(client), [
    [HOURS_ID, 3],
    [RATE_ID, 20],
    [NOTES_ID, 'Original note'],
    [created.id, 'High'],
  ]);
});

test('renaming a field keeps stored values attached to the same field identity', async (t) => {
  const client = createClient();
  const before = structuredClone(client.entryValues);
  await syncProjectFields(client, PROJECT_ID, [
    { id: NOTES_ID },
    { id: TOTAL_ID },
    { id: RATE_ID },
    { id: HOURS_ID, name: 'Time' },
  ]);
  assert.deepEqual(client.entryValues, before);
  assert.equal(client.fields.find((field) => field.id === HOURS_ID).name, 'Time');
  mockDatabase(t, client);

  const entry = await repository.getEntryById(ENTRY_ID);
  const renamed = entry.values.find((value) => value.fieldId === HOURS_ID);
  assert.equal(renamed.field.name, 'Time');
  assert.equal(Number(renamed.valueNumber), 3);
  assert.equal(entry.values.length, 3);
});

test('successive schema changes keep the entry valid and its computed fields working', async (t) => {
  const client = createClient();
  mockDatabase(t, client);

  await syncProjectFields(client, PROJECT_ID, [
    { id: HOURS_ID },
    { id: RATE_ID },
    { id: TOTAL_ID },
    { id: NOTES_ID },
    { name: 'Priority', fieldType: 'short_text' },
  ]);
  const priority = client.fields.find(
    (field) => field.name === 'Priority' && !field.archived_at,
  );

  await syncProjectFields(client, PROJECT_ID, [
    { id: NOTES_ID },
    { id: TOTAL_ID },
    { id: RATE_ID },
    { id: HOURS_ID, name: 'Time' },
    { id: priority.id },
  ]);

  await syncProjectFields(client, PROJECT_ID, [
    { id: HOURS_ID },
    { id: RATE_ID },
    { id: TOTAL_ID },
    { id: priority.id },
  ]);
  assert.equal(client.fields.find((field) => field.id === NOTES_ID).archived_at, NOW);

  await updateEntryService({
    projectId: PROJECT_ID,
    entryId: ENTRY_ID,
    userId: OWNER_ID,
    data: editData({
      name: 'Journey entry',
      durationMinutes: 60,
      fieldIds: [HOURS_ID, RATE_ID, TOTAL_ID, priority.id],
      values: [
        { fieldId: HOURS_ID, value: '5' },
        { fieldId: RATE_ID, value: '20' },
        { fieldId: priority.id, value: 'High' },
      ],
    }),
  });

  const entry = await repository.getEntryById(ENTRY_ID);
  const serialized = serializeEntry(entry);
  assert.deepEqual(
    serialized.values.map((value) => [value.fieldId, value.name, value.value]),
    [
      [NOTES_ID, 'Notes', 'Original note'],
      [HOURS_ID, 'Time', 5],
      [RATE_ID, 'Rate', 20],
      [priority.id, 'Priority', 'High'],
    ],
  );

  const total = client.fields.find((field) => field.id === TOTAL_ID);
  assert.equal(evaluateFormula(total.formula, serialized.values), 100);
});

test('removing a field that stores values for the entry is rejected before any writes', async (t) => {
  const client = createClient();
  const before = client.snapshot();
  mockDatabase(t, client);

  await assert.rejects(
    updateEntryService({
      projectId: PROJECT_ID,
      entryId: ENTRY_ID,
      userId: OWNER_ID,
      data: editData(),
    }),
    { statusCode: 409 },
  );
  assert.deepEqual(client.snapshot(), before);
  assert.deepEqual(
    client.queries.filter(
      ({ sql }) => !sql.startsWith('SELECT ') && sql !== 'BEGIN' && sql !== 'ROLLBACK',
    ),
    [],
  );
});

test('a failure part-way through an entry edit rolls back so no stored values are lost', async (t) => {
  const failure = new Error('simulated write failure');
  const client = createClient({
    failQuery: (sql) => (sql.startsWith('INSERT INTO entry_field_values ') ? failure : null),
  });
  await archiveNotes(client);
  const before = client.snapshot();
  mockDatabase(t, client);

  await assert.rejects(
    updateEntryService({
      projectId: PROJECT_ID,
      entryId: ENTRY_ID,
      userId: OWNER_ID,
      data: editData(),
    }),
    failure,
  );
  assert.deepEqual(client.snapshot(), before);
  assert.ok(client.queries.some(({ sql }) => sql === 'ROLLBACK'));
  assert.equal(client.releaseCount, 1);
});
