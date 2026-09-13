const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const express = require('express');
const db = require('../db');
const repository = require('../repositories/projectDetailsRepository');
const projectRoutes = require('../routes/projects');
const { syncProjectFields } = require('../services/projectFieldsService');
const { bindFormulaToFields, evaluateFormula } = require('../services/computedFieldService');
const {
  getProjectDetailsService,
  createEntryService,
} = require('../services/projectDetailsService');

function uuid(number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

const PROJECT_ID = uuid(1);
const OTHER_PROJECT_ID = uuid(2);
const OWNER_ID = uuid(3);
const HOURS_ID = uuid(10);
const RATE_ID = uuid(11);
const TOTAL_ID = uuid(12);
const NOTES_ID = uuid(13);
const ARCHIVED_ID = uuid(14);
const FOREIGN_ID = uuid(15);
const ENTRY_ID = uuid(20);
const CREATED_AT = '2026-01-01T00:00:00.000Z';
const PREVIOUS_ARCHIVE = '2026-02-01T00:00:00.000Z';
const ARCHIVE_AT = '2026-03-01T00:00:00.000Z';
const AFTER_ARCHIVE = '2026-03-01T00:00:00.001Z';

function fieldRow(id, name, fieldType, position, overrides = {}) {
  return {
    id,
    project_id: PROJECT_ID,
    name,
    field_type: fieldType,
    position,
    formula: null,
    required: false,
    archived_at: null,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function defaultFields() {
  return [
    fieldRow(HOURS_ID, 'Hours', 'number', 0),
    fieldRow(RATE_ID, 'Rate', 'number', 1),
    fieldRow(TOTAL_ID, 'Total', 'computed', 2, { formula: 'Hours * Rate' }),
    fieldRow(NOTES_ID, 'Notes', 'short_text', 3),
    fieldRow(ARCHIVED_ID, 'Hours', 'number', 0, { archived_at: PREVIOUS_ARCHIVE }),
    fieldRow(FOREIGN_ID, 'Hours', 'number', 0, { project_id: OTHER_PROJECT_ID }),
  ];
}

function defaultValues() {
  return [
    { entryId: ENTRY_ID, fieldId: HOURS_ID, valueNumber: '3', valueText: null },
    { entryId: ENTRY_ID, fieldId: RATE_ID, valueNumber: '20', valueText: null },
    {
      entryId: ENTRY_ID,
      fieldId: NOTES_ID,
      valueNumber: null,
      valueText: 'Keep this historical note',
    },
  ];
}

// Model the active partial unique index and transactions, not just canned query results.
// Unrecognized SQL (including any deletion or entry-value write) fails the test.
function createClient({ fields = defaultFields(), entryValues = defaultValues(), failQuery } = {}) {
  const client = {
    fields: structuredClone(fields),
    entryValues: structuredClone(entryValues),
    project: {
      id: PROJECT_ID,
      owner_id: OWNER_ID,
      name: 'Original project',
      description: 'Original description',
      start_date: null,
      end_date: null,
      archived_at: null,
      created_at: CREATED_AT,
      updated_at: CREATED_AT,
    },
    queries: [],
    releaseCount: 0,
    now: ARCHIVE_AT,
    activeFields(projectId = PROJECT_ID) {
      return this.fields
        .filter((field) => field.project_id === projectId && !field.archived_at)
        .sort((left, right) => left.position - right.position);
    },
    snapshot() {
      return structuredClone({
        fields: this.fields,
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
      throw Object.assign(new Error('Active field name violates unique index'), { code: '23505' });
    }
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
    if (sql.startsWith('UPDATE projects SET ')) {
      assert.match(sql, /WHERE id = \$1 AND owner_id = \$2/);
      assert.equal(parameters[0], client.project.id);
      assert.equal(parameters[1], client.project.owner_id);
      Object.assign(client.project, {
        name: parameters[2],
        description: parameters[3],
        start_date: parameters[4],
        end_date: parameters[5],
        updated_at: client.now,
      });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('SELECT ') && sql.includes(' FROM project_fields ')) {
      assert.match(sql, /WHERE (?:pf\.)?project_id = \$1/);
      assert.match(sql, /archived_at IS NULL/);
      const includeArchived = sql.includes('$2::boolean') && parameters[1] === true;
      const rows = client.fields.filter(
        (field) => field.project_id === parameters[0] && (includeArchived || !field.archived_at),
      );
      rows.sort((left, right) => left.position - right.position);
      return { rows: structuredClone(rows) };
    }
    if (sql.startsWith('UPDATE project_fields SET formula = $2 WHERE id = $1')) {
      const field = client.fields.find((item) => item.id === parameters[0]);
      assert.ok(field, 'formula updates must use an existing or inserted field ID');
      field.formula = parameters[1];
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith('UPDATE project_fields SET archived_at = NOW()')) {
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
    throw new Error(`Unexpected SQL in project field regression test: ${sql}`);
  };
  return client;
}

function fieldWrites(client) {
  return client.queries.filter(({ sql }) =>
    /^(UPDATE|INSERT INTO|DELETE FROM) project_fields\b/.test(sql),
  );
}

function retain(client) {
  return client.activeFields().map(({ id }) => ({ id }));
}

function fieldAlias(id) {
  return `field_${id.replace(/-/g, '')}`;
}

function formulaValues(client, entryId = ENTRY_ID) {
  return client.entryValues
    .filter((value) => value.entryId === entryId)
    .map((value) => ({
      fieldId: value.fieldId,
      name: client.fields.find((field) => field.id === value.fieldId).name,
      value: value.valueNumber ?? value.valueText,
    }));
}

function mappedFields(client, includeArchived = false) {
  return client.fields
    .filter((field) => field.project_id === PROJECT_ID && (includeArchived || !field.archived_at))
    .map((field) => ({
      id: field.id,
      projectId: field.project_id,
      name: field.name,
      fieldType: field.field_type,
      formula: field.formula,
      position: field.position,
      archivedAt: field.archived_at,
    }));
}

function joinedEntry(client, id = ENTRY_ID, createdAt = CREATED_AT) {
  return {
    id,
    name: 'Historical entry',
    durationMinutes: 30,
    createdAt,
    values: client.entryValues
      .filter((value) => value.entryId === id)
      .map((value) => {
        const field = client.fields.find((item) => item.id === value.fieldId);
        return {
          ...value,
          field: { name: field.name, fieldType: field.field_type, archivedAt: field.archived_at },
        };
      }),
  };
}

test('adding fields assigns fresh IDs, trims names and preserves existing entry values', async () => {
  const client = createClient();
  const before = client.snapshot();
  await syncProjectFields(client, PROJECT_ID, [
    ...retain(client),
    { label: '  Start date  ', type: 'date', formula: 'not a computed field' },
    { name: 'Description', fieldType: 'long_text' },
  ]);

  const active = client.activeFields();
  assert.deepEqual(
    active.slice(0, 4).map((field) => field.id),
    [HOURS_ID, RATE_ID, TOTAL_ID, NOTES_ID],
  );
  assert.deepEqual(
    active.slice(4).map((field) => [field.name, field.field_type]),
    [
      ['Start date', 'date'],
      ['Description', 'long_text'],
    ],
  );
  assert.equal(new Set(active.map((field) => field.id)).size, 6);
  for (const field of active.slice(4)) {
    assert.ok(!before.fields.some((old) => old.id === field.id));
    assert.equal(field.required, false);
    assert.equal(field.formula, null);
  }
  assert.deepEqual(
    active.map((field) => field.position),
    [0, 1, 2, 3, 4, 5],
  );
  assert.deepEqual(client.entryValues, before.entryValues);
  assert.deepEqual(
    client.fields.find((field) => field.id === FOREIGN_ID),
    before.fields.find((field) => field.id === FOREIGN_ID),
  );
  assert.deepEqual(
    client.fields.find((field) => field.id === ARCHIVED_ID),
    before.fields.find((field) => field.id === ARCHIVED_ID),
  );
  assert.match(client.queries[0].sql, /FOR UPDATE$/);
});

test('removing fields with stored values archives their definitions without deleting their values', async () => {
  const client = createClient();
  const values = structuredClone(client.entryValues);
  await syncProjectFields(client, PROJECT_ID, [{ id: HOURS_ID }, { id: TOTAL_ID }]);

  assert.deepEqual(
    client.activeFields().map((field) => field.id),
    [HOURS_ID, TOTAL_ID],
  );
  for (const id of [RATE_ID, NOTES_ID]) {
    assert.equal(client.fields.find((field) => field.id === id).archived_at, ARCHIVE_AT);
  }
  assert.deepEqual(client.entryValues, values);
  const total = client.fields.find((field) => field.id === TOTAL_ID);
  assert.equal(evaluateFormula(total.formula, formulaValues(client)), 60);
});

test('renaming and reordering retain IDs, types, historical values and computed results', async () => {
  const client = createClient();
  const values = structuredClone(client.entryValues);
  await syncProjectFields(client, PROJECT_ID, [
    { id: NOTES_ID, name: 'Memo' },
    { id: TOTAL_ID, name: 'Budget' },
    { id: RATE_ID, name: 'Price' },
    { id: HOURS_ID, name: '  Time  ' },
  ]);

  assert.deepEqual(
    client.activeFields().map((field) => [field.id, field.name, field.field_type, field.position]),
    [
      [NOTES_ID, 'Memo', 'short_text', 0],
      [TOTAL_ID, 'Budget', 'computed', 1],
      [RATE_ID, 'Price', 'number', 2],
      [HOURS_ID, 'Time', 'number', 3],
    ],
  );
  assert.equal(client.fields.length, 6);
  assert.deepEqual(client.entryValues, values);
  const formula = client.fields.find((field) => field.id === TOTAL_ID).formula;
  assert.equal(formula, `${fieldAlias(HOURS_ID)} * ${fieldAlias(RATE_ID)}`);
  assert.equal(evaluateFormula(formula, formulaValues(client)), 60);
});

test('swapping active names satisfies the partial unique index and keeps formula bindings', async () => {
  const client = createClient();
  await syncProjectFields(client, PROJECT_ID, [
    { id: HOURS_ID, name: 'Rate' },
    { id: RATE_ID, name: 'Hours' },
    { id: TOTAL_ID },
    { id: NOTES_ID },
  ]);
  assert.deepEqual(
    client
      .activeFields()
      .slice(0, 2)
      .map((field) => [field.id, field.name]),
    [
      [HOURS_ID, 'Rate'],
      [RATE_ID, 'Hours'],
    ],
  );
  const formula = client.fields.find((field) => field.id === TOTAL_ID).formula;
  assert.equal(formula, `${fieldAlias(HOURS_ID)} * ${fieldAlias(RATE_ID)}`);
  await syncProjectFields(client, PROJECT_ID, retain(client));
  assert.equal(client.fields.find((field) => field.id === TOTAL_ID).formula, formula);
  assert.equal(evaluateFormula(formula, formulaValues(client)), 60);
  assert.deepEqual(client.entryValues, defaultValues());
});

test('a newly inserted field can reuse a retained field name before that field is renamed', async () => {
  const client = createClient();
  await syncProjectFields(client, PROJECT_ID, [
    { name: 'Hours', fieldType: 'number' },
    { id: HOURS_ID, name: 'Duration' },
    { id: RATE_ID },
    { id: TOTAL_ID },
    { id: NOTES_ID },
  ]);
  const replacement = client.activeFields()[0];
  assert.notEqual(replacement.id, HOURS_ID);
  const formula = client.fields.find((field) => field.id === TOTAL_ID).formula;
  assert.equal(
    evaluateFormula(formula, [
      ...formulaValues(client),
      { fieldId: replacement.id, name: 'Hours', value: 999 },
    ]),
    60,
  );

  await syncProjectFields(
    client,
    PROJECT_ID,
    retain(client).filter((field) => field.id !== HOURS_ID),
  );
  assert.equal(client.fields.find((field) => field.id === HOURS_ID).archived_at, ARCHIVE_AT);
  assert.equal(
    evaluateFormula(client.fields.find((field) => field.id === TOTAL_ID).formula, [
      ...formulaValues(client),
      { fieldId: replacement.id, name: 'Hours', value: 999 },
    ]),
    60,
  );
  assert.deepEqual(client.entryValues, defaultValues());
});

test('an empty list archives all fields and repeated removal preserves original archive dates', async () => {
  const client = createClient();
  await syncProjectFields(client, PROJECT_ID, []);
  assert.deepEqual(client.activeFields(), []);
  for (const id of [HOURS_ID, RATE_ID, TOTAL_ID, NOTES_ID]) {
    assert.equal(client.fields.find((field) => field.id === id).archived_at, ARCHIVE_AT);
  }
  assert.equal(
    evaluateFormula(
      client.fields.find((field) => field.id === TOTAL_ID).formula,
      formulaValues(client),
    ),
    60,
  );
  const after = client.snapshot();
  client.now = AFTER_ARCHIVE;
  await syncProjectFields(client, PROJECT_ID, []);
  assert.deepEqual(client.snapshot(), after);
  assert.deepEqual(client.entryValues, defaultValues());
});

test('new computed formulas bind to returned IDs even when operands are inserted later', async () => {
  const client = createClient({ fields: [], entryValues: [] });
  await syncProjectFields(client, PROJECT_ID, [
    { name: 'Total', fieldType: 'computed', formula: 'Units * Cost' },
    { name: 'Units', fieldType: 'number' },
    { name: 'Cost', fieldType: 'number' },
  ]);
  const [total, units, cost] = client.activeFields();
  assert.equal(total.formula, `${fieldAlias(units.id)} * ${fieldAlias(cost.id)}`);
  assert.equal(
    evaluateFormula(total.formula, [
      { fieldId: units.id, name: 'Renamed units', value: '4' },
      { fieldId: cost.id, name: 'Renamed cost', value: 7 },
    ]),
    28,
  );
});

test('formula binding preserves function calls, sanitized names and stable aliases', () => {
  const fields = [
    { id: HOURS_ID, name: 'Hours worked' },
    { id: RATE_ID, name: 'Rate' },
    { id: NOTES_ID, name: 'round' },
  ];
  const bound = bindFormulaToFields('round(Hours_worked * Rate, 2)', fields);
  assert.match(bound, /^round\(/);
  assert.ok(bound.includes(fieldAlias(HOURS_ID)));
  assert.ok(bound.includes(fieldAlias(RATE_ID)));
  assert.ok(!bound.includes(fieldAlias(NOTES_ID)));
  assert.equal(bindFormulaToFields(bound, fields), bound);
  assert.equal(
    evaluateFormula(bound, [
      { fieldId: HOURS_ID, name: 'Renamed hours', value: 3.333 },
      { fieldId: RATE_ID, name: 'Renamed rate', value: '2' },
      { fieldId: uuid(30), name: 'Hours worked', value: 900 },
      { fieldId: uuid(31), name: 'Rate', value: 900 },
    ]),
    6.67,
  );
});

const invalidRequests = [
  ['missing list', undefined, 400],
  ['null list', null, 400],
  ['object instead of list', {}, 400],
  ['string instead of list', 'Hours', 400],
  ['number instead of list', 4, 400],
  ['null field', [null], 400],
  ['string field', ['Hours'], 400],
  ['field without a name or type', [{}], 400],
  ['new field without a type', [{ name: 'New field' }], 400],
  ['new field without a name', [{ fieldType: 'number' }], 400],
  ['malformed ID', [{ id: 'not-a-uuid' }], 400],
  ['unknown UUID', [{ id: uuid(999) }], 400],
  ['foreign UUID', [{ id: FOREIGN_ID }], 400],
  ['archived UUID', [{ id: ARCHIVED_ID }], 400],
  [
    'repeated UUID',
    [
      { id: HOURS_ID, name: 'First' },
      { id: HOURS_ID, name: 'Second' },
    ],
    400,
  ],
  ['repeated invalid UUID', [{ id: uuid(999) }, { id: uuid(999) }], 400],
  ['empty name', [{ id: HOURS_ID, name: '' }], 400],
  ['whitespace name', [{ id: HOURS_ID, name: ' \t ' }], 400],
  ['overlong name', [{ id: HOURS_ID, name: 'x'.repeat(101) }], 400],
  ['non-string name', [{ id: HOURS_ID, name: 123 }], 400],
  ['blank label', [{ label: '   ', type: 'number' }], 400],
  ['unsupported type', [{ name: 'New field', fieldType: 'boolean' }], 400],
  ['null type', [{ name: 'New field', type: null }], 400],
  ['non-string formula', [{ name: 'New field', fieldType: 'computed', formula: 4 }], 400],
  [
    'overlong formula',
    [{ name: 'New field', fieldType: 'computed', formula: 'x'.repeat(2001) }],
    400,
  ],
  ['incompatible existing type', [{ id: HOURS_ID, fieldType: 'short_text' }], 409],
  ['incompatible existing type alias', [{ id: HOURS_ID, type: 'date' }], 409],
  [
    'duplicate normalized names',
    [
      { id: HOURS_ID, name: ' Count ' },
      { name: 'cOuNt', fieldType: 'number' },
    ],
    409,
  ],
  ['duplicate inherited name', [{ id: HOURS_ID }, { name: ' hours ', fieldType: 'number' }], 409],
];

for (const [label, fields, statusCode] of invalidRequests) {
  test(`field validation rejects ${label} with ${statusCode} before any writes`, async () => {
    const client = createClient();
    const before = client.snapshot();
    // A valid first change must not be written before a later invalid field is checked.
    const requested = Array.isArray(fields)
      ? [{ name: 'Valid pending addition', fieldType: 'number' }, ...fields]
      : fields;
    await assert.rejects(syncProjectFields(client, PROJECT_ID, requested), { statusCode });
    assert.deepEqual(client.snapshot(), before);
    assert.deepEqual(
      client.queries.filter(({ sql }) => !sql.startsWith('SELECT ')),
      [],
    );
  });
}

test('trimmed names accept the one-character and 100-character boundaries', async () => {
  const client = createClient();
  await syncProjectFields(client, PROJECT_ID, [
    { id: HOURS_ID, name: ' x ' },
    { name: `  ${'y'.repeat(100)}  `, fieldType: 'short_text' },
  ]);
  assert.deepEqual(
    client.activeFields().map((field) => field.name.length),
    [1, 100],
  );
});

test('repository field reads exclude archives by default and include them only on request', async (t) => {
  const client = createClient();
  t.mock.method(db, 'query', client.query);
  const active = await repository.getProjectFields(PROJECT_ID);
  assert.deepEqual(
    active.map((field) => field.id),
    [HOURS_ID, RATE_ID, TOTAL_ID, NOTES_ID],
  );
  assert.deepEqual(client.queries[0].parameters, [PROJECT_ID, false]);
  const all = await repository.getProjectFields(PROJECT_ID, { includeArchived: true });
  assert.equal(all.length, 5);
  assert.equal(all.find((field) => field.id === ARCHIVED_ID).archivedAt, PREVIOUS_ARCHIVE);
  assert.ok(!all.some((field) => field.id === FOREIGN_ID));
  assert.deepEqual(client.queries[1].parameters, [PROJECT_ID, true]);
});

for (const method of ['getProjectEntries', 'getEntryById', 'getOutstandingEntries']) {
  test(`${method} keeps archived field names and values in its historical join`, async (t) => {
    t.mock.method(db, 'query', async (text, parameters) => {
      const sql = text.replace(/\s+/g, ' ').trim();
      if (sql.includes('FROM entries')) {
        assert.match(sql, /LEFT JOIN project_fields f ON f.id = v.field_id/);
        assert.doesNotMatch(sql, /(?:f\.)?archived_at IS NULL/);
        assert.deepEqual(parameters, [method === 'getEntryById' ? ENTRY_ID : PROJECT_ID]);
      }
      return {
        rows: [
          {
            entry_id: ENTRY_ID,
            project_id: PROJECT_ID,
            entry_name: 'Old entry',
            entry_created_at: CREATED_AT,
            value_id: uuid(40),
            field_id: NOTES_ID,
            field_name: 'Archived notes',
            field_type: 'short_text',
            field_archived_at: ARCHIVE_AT,
            value_text: 'Original text',
            value_number: null,
            value_date: null,
          },
        ],
      };
    });
    const result = await repository[method](method === 'getEntryById' ? ENTRY_ID : PROJECT_ID);
    const entry = Array.isArray(result) ? result[0] : result;
    assert.equal(entry.values[0].fieldId, NOTES_ID);
    assert.equal(entry.values[0].field.name, 'Archived notes');
    assert.equal(entry.values[0].valueText, 'Original text');
  });
}

test('details expose only active fields but retain old values and archived computations through the archive instant', async (t) => {
  const client = createClient();
  const oldValues = structuredClone(client.entryValues);
  await syncProjectFields(client, PROJECT_ID, [
    { id: HOURS_ID, name: 'Duration' },
    { name: 'Rate', fieldType: 'number' },
    { name: 'Total', fieldType: 'computed', formula: 'Duration * Rate' },
  ]);
  const newRate = client.activeFields().find((field) => field.name === 'Rate');
  const newTotal = client.activeFields().find((field) => field.name === 'Total');
  assert.notEqual(newRate.id, RATE_ID);
  assert.notEqual(newTotal.id, TOTAL_ID);
  const boundaryId = uuid(50);
  const futureId = uuid(51);
  client.entryValues.push(
    ...oldValues.map((value) => ({ ...value, entryId: boundaryId })),
    { entryId: futureId, fieldId: HOURS_ID, valueNumber: '4' },
    { entryId: futureId, fieldId: newRate.id, valueNumber: '5' },
  );
  t.mock.method(repository, 'getOwnedProject', async (projectId, userId) => {
    assert.deepEqual([projectId, userId], [PROJECT_ID, OWNER_ID]);
    return { id: PROJECT_ID, name: 'Project' };
  });
  const fieldsMock = t.mock.method(repository, 'getProjectFields', async (projectId, options) => {
    assert.equal(projectId, PROJECT_ID);
    assert.deepEqual(options, { includeArchived: true });
    return mappedFields(client, options.includeArchived);
  });
  t.mock.method(repository, 'getProjectStats', async () => ({
    totalEntries: 3,
    loggedMinutes: 90,
  }));
  t.mock.method(repository, 'getProjectEntryLinks', async () => []);
  t.mock.method(repository, 'getProjectEntries', async () => [
    joinedEntry(client),
    joinedEntry(client, boundaryId, ARCHIVE_AT),
    joinedEntry(client, futureId, AFTER_ARCHIVE),
  ]);

  const details = await getProjectDetailsService({ projectId: PROJECT_ID, userId: OWNER_ID });
  assert.equal(fieldsMock.mock.callCount(), 1);
  assert.deepEqual(
    details.fields.map((field) => field.id),
    [HOURS_ID, newRate.id, newTotal.id],
  );
  for (const entry of details.entries.slice(0, 2)) {
    assert.equal(entry.values.find((value) => value.fieldId === TOTAL_ID).value, 60);
    assert.deepEqual(
      entry.values.find((value) => value.fieldId === NOTES_ID),
      {
        fieldId: NOTES_ID,
        name: 'Notes',
        type: 'short_text',
        archived: true,
        value: 'Keep this historical note',
      },
    );
    assert.equal(entry.values.find((value) => value.fieldId === HOURS_ID).name, 'Duration');
    assert.equal(entry.values.find((value) => value.fieldId === RATE_ID).value, 20);
  }
  const future = details.entries[2];
  assert.ok(!future.values.some((value) => value.fieldId === TOTAL_ID));
  assert.equal(future.values.find((value) => value.fieldId === newTotal.id).value, 20);
  assert.deepEqual(
    client.entryValues.filter((value) => value.entryId === ENTRY_ID),
    oldValues,
  );
});

function stubEntryTransaction(t, client) {
  const newEntryId = uuid(60);
  const writes = [];
  const tx = {
    getOwnedProject: t.mock.fn(async () => ({ id: PROJECT_ID })),
    getProjectFields: t.mock.fn(async (projectId, options) => {
      assert.equal(projectId, PROJECT_ID);
      assert.equal(options?.includeArchived ?? false, false);
      return mappedFields(client);
    }),
    createProjectField: t.mock.fn(async () => {
      throw new Error('Unexpected field creation');
    }),
    getEntriesByIdsForProject: t.mock.fn(async () => []),
    createEntry: t.mock.fn(async (data) => {
      writes.push({ kind: 'entry', data });
      return { id: newEntryId };
    }),
    createEntryFieldValues: t.mock.fn(async (values) => {
      writes.push({ kind: 'values', values });
      client.entryValues.push(...values);
    }),
    getEntryById: t.mock.fn(async () => joinedEntry(client, newEntryId, AFTER_ARCHIVE)),
  };
  t.mock.method(repository, 'withTransaction', async (work) => work(tx));
  return { tx, writes };
}

function entryData(values) {
  return { name: 'Future entry', durationMinutes: 30, values, newFields: [], linkedEntryIds: [] };
}

test('entry creation rejects archived field IDs before writing an entry or values', async (t) => {
  const client = createClient();
  await syncProjectFields(
    client,
    PROJECT_ID,
    retain(client).filter((field) => field.id !== NOTES_ID),
  );
  const before = client.snapshot();
  const { tx, writes } = stubEntryTransaction(t, client);
  await assert.rejects(
    createEntryService({
      projectId: PROJECT_ID,
      userId: OWNER_ID,
      data: entryData([{ fieldId: NOTES_ID, value: 'Must not write' }]),
    }),
    { statusCode: 400 },
  );
  assert.deepEqual(tx.getOwnedProject.mock.calls[0].arguments, [PROJECT_ID, OWNER_ID, true]);
  assert.equal(tx.createProjectField.mock.callCount(), 0);
  assert.deepEqual(writes, []);
  assert.deepEqual(client.snapshot(), before);
});

test('new entries omit archived computed fields and preserve previous stored values', async (t) => {
  const client = createClient();
  const oldValues = structuredClone(client.entryValues);
  await syncProjectFields(client, PROJECT_ID, [{ id: HOURS_ID }, { id: RATE_ID }]);
  const { tx, writes } = stubEntryTransaction(t, client);
  const entry = await createEntryService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    data: entryData([
      { fieldId: HOURS_ID, value: '4' },
      { fieldId: RATE_ID, value: '5' },
    ]),
  });
  assert.deepEqual(
    entry.values.map((value) => [value.fieldId, value.value]),
    [
      [HOURS_ID, 4],
      [RATE_ID, 5],
    ],
  );
  assert.equal(tx.getProjectFields.mock.callCount(), 2);
  assert.deepEqual(
    writes.map((write) => write.kind),
    ['entry', 'values'],
  );
  assert.deepEqual(
    client.entryValues.filter((value) => value.entryId === ENTRY_ID),
    oldValues,
  );
});

async function routeHarness(t, client, user = { id: OWNER_ID }) {
  const connect = t.mock.method(db, 'connect', async () => client);
  t.mock.method(db, 'query', async () => {
    throw new Error('Route must use its transaction client');
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/projects', projectRoutes);
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  });
  const server = app.listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  await once(server, 'listening');
  return {
    connect,
    patch(body, projectId = PROJECT_ID) {
      return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const request = http.request(
          {
            hostname: '127.0.0.1',
            port: server.address().port,
            path: `/api/projects/${projectId}`,
            method: 'PATCH',
            agent: false,
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            },
          },
          (response) => {
            let text = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
              text += chunk;
            });
            response.on('error', reject);
            response.on('end', () => {
              try {
                resolve({ status: response.statusCode, body: JSON.parse(text) });
              } catch (error) {
                reject(error);
              }
            });
          },
        );
        request.on('error', reject);
        request.setTimeout(5000, () =>
          request.destroy(new Error('Project route request timed out')),
        );
        request.end(data);
      });
    },
  };
}

test('PATCH commits metadata and safe field changes on one owned, locked connection', async (t) => {
  const client = createClient();
  const { patch, connect } = await routeHarness(t, client);
  const response = await patch({
    name: '  Renamed project  ',
    fields: [
      { id: HOURS_ID, name: 'Duration' },
      { id: RATE_ID },
      { id: TOTAL_ID },
      { name: 'New note', type: 'long_text' },
    ],
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.name, 'Renamed project');
  assert.equal(connect.mock.callCount(), 1);
  assert.equal(client.releaseCount, 1);
  assert.equal(client.queries[0].sql, 'BEGIN');
  assert.match(
    client.queries[1].sql,
    /FROM projects WHERE id = \$1 AND owner_id = \$2 LIMIT 1 FOR UPDATE$/,
  );
  assert.deepEqual(client.queries[1].parameters, [PROJECT_ID, OWNER_ID]);
  assert.equal(client.queries.at(-1).sql, 'COMMIT');
  assert.ok(!client.queries.some(({ sql }) => sql === 'ROLLBACK'));
  assert.deepEqual(
    client.activeFields().map((field) => field.name),
    ['Duration', 'Rate', 'Total', 'New note'],
  );
  assert.equal(client.fields.find((field) => field.id === NOTES_ID).archived_at, ARCHIVE_AT);
  assert.deepEqual(client.entryValues, defaultValues());
});

test('PATCH without fields preserves all field definitions', async (t) => {
  const client = createClient();
  const before = client.snapshot();
  const { patch } = await routeHarness(t, client);
  const response = await patch({ description: 'Only metadata changes' });
  assert.equal(response.status, 200);
  assert.deepEqual(client.fields, before.fields);
  assert.deepEqual(client.entryValues, before.entryValues);
  assert.deepEqual(fieldWrites(client), []);
  assert.equal(client.queries.at(-1).sql, 'COMMIT');
  assert.equal(client.releaseCount, 1);
});

test('PATCH with an empty fields list commits archival of all fields', async (t) => {
  const client = createClient();
  const { patch } = await routeHarness(t, client);
  assert.equal((await patch({ fields: [] })).status, 200);
  assert.deepEqual(client.activeFields(), []);
  assert.deepEqual(client.entryValues, defaultValues());
  assert.equal(client.queries.at(-1).sql, 'COMMIT');
  assert.equal(client.releaseCount, 1);
});

test('PATCH without an authenticated user never acquires a connection', async (t) => {
  const client = createClient();
  const { patch, connect } = await routeHarness(t, client, null);
  assert.equal((await patch({ fields: [] })).status, 401);
  assert.equal(connect.mock.callCount(), 0);
  assert.deepEqual(client.queries, []);
  assert.equal(client.releaseCount, 0);
});

for (const [label, user, projectId] of [
  ['another owner', { id: uuid(70) }, PROJECT_ID],
  ['missing project', { id: OWNER_ID }, uuid(71)],
]) {
  test(`PATCH rejects ${label} before field reads or writes and releases the transaction`, async (t) => {
    const client = createClient();
    const before = client.snapshot();
    const { patch } = await routeHarness(t, client, user);
    assert.equal((await patch({ name: 'Forbidden', fields: [] }, projectId)).status, 404);
    assert.deepEqual(client.snapshot(), before);
    assert.equal(client.queries.length, 3);
    assert.equal(client.queries[0].sql, 'BEGIN');
    assert.match(client.queries[1].sql, /FOR UPDATE$/);
    assert.equal(client.queries[2].sql, 'ROLLBACK');
    assert.equal(client.releaseCount, 1);
  });
}

for (const [label, fields, statusCode] of [
  ['malformed fields', { name: 'Not a list' }, 400],
  ['null fields', null, 400],
  ['foreign field', [{ id: FOREIGN_ID }], 400],
  ['duplicate IDs', [{ id: HOURS_ID }, { id: HOURS_ID }], 400],
  ['duplicate names', [{ id: HOURS_ID }, { name: 'HOURS', type: 'number' }], 409],
  ['type changes', [{ id: HOURS_ID, type: 'date' }], 409],
]) {
  test(`PATCH rolls back metadata for ${label}, returns ${statusCode} and releases the connection`, async (t) => {
    const client = createClient();
    const before = client.snapshot();
    const { patch } = await routeHarness(t, client);
    const response = await patch({
      name: 'Must roll back',
      description: 'Also rolls back',
      fields,
    });
    assert.equal(response.status, statusCode);
    assert.equal(response.body.success, false);
    assert.deepEqual(client.snapshot(), before);
    assert.deepEqual(fieldWrites(client), []);
    assert.equal(client.queries[0].sql, 'BEGIN');
    assert.equal(client.queries.at(-1).sql, 'ROLLBACK');
    assert.ok(!client.queries.some(({ sql }) => sql === 'COMMIT'));
    assert.equal(client.releaseCount, 1);
  });
}

test('PATCH rolls back formulas, archival, renames and metadata when a later field insert fails', async (t) => {
  const client = createClient({
    failQuery: (sql) =>
      sql.startsWith('INSERT INTO project_fields ') ? new Error('Injected insert failure') : null,
  });
  const before = client.snapshot();
  const { patch } = await routeHarness(t, client);
  const response = await patch({
    name: 'Must roll back',
    fields: [
      { id: HOURS_ID, name: 'Changed first' },
      { name: 'Fails later', fieldType: 'number' },
    ],
  });
  assert.equal(response.status, 500);
  assert.equal(response.body.message, 'Injected insert failure');
  assert.ok(
    fieldWrites(client).some(({ sql }) => sql.startsWith('UPDATE project_fields SET formula')),
  );
  assert.ok(
    fieldWrites(client).some(({ sql }) => sql.startsWith('UPDATE project_fields SET archived_at')),
  );
  assert.ok(
    fieldWrites(client).some(({ sql }) => sql.startsWith('UPDATE project_fields SET name')),
  );
  assert.deepEqual(client.snapshot(), before);
  assert.equal(client.queries.at(-1).sql, 'ROLLBACK');
  assert.ok(!client.queries.some(({ sql }) => sql === 'COMMIT'));
  assert.equal(client.releaseCount, 1);
});
