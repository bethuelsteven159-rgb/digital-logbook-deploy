const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const http = require('node:http');
const express = require('express');
const db = require('../db');
const repository = require('../repositories/postgresRecurringEntryRepository');
const recurringRoutes = require('../routes/recurringEntries');
const {
  generateDueRecurringEntriesService,
} = require('../services/recurringEntryService');

function uuid(number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
}

const PROJECT_ID = uuid(1);
const OWNER_ID = uuid(3);
const DEFINITION_ID = uuid(30);
const ENTRY_ID = uuid(40);

const activeProject = {
  id: PROJECT_ID,
  ownerId: OWNER_ID,
  name: 'Project One',
  archivedAt: null,
};

function definition(overrides = {}) {
  return {
    id: DEFINITION_ID,
    projectId: PROJECT_ID,
    createdById: OWNER_ID,
    name: 'Morning journal',
    durationMinutes: 20,
    tags: ['journal'],
    checklist: [{ text: 'Write three lines' }],
    frequency: 'daily',
    intervalCount: 1,
    startsOn: '2026-09-01',
    endsOn: null,
    enabled: true,
    lastGeneratedOn: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function definitionRow(overrides = {}) {
  return {
    id: DEFINITION_ID,
    project_id: PROJECT_ID,
    created_by_id: OWNER_ID,
    name: 'Morning journal',
    duration_minutes: 20,
    tags: ['journal'],
    checklist: [{ text: 'Write three lines' }],
    frequency: 'daily',
    interval_count: 1,
    starts_on: '2026-09-01',
    ends_on: null,
    enabled: true,
    last_generated_on: null,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function fakeTransaction({
  project = activeProject,
  definitions = [],
} = {}) {
  const occurrences = [];
  const watermarks = [];
  let counter = 0;

  const tx = {
    getOwnedProject: async () => project,
    listEnabledDefinitions: async () => definitions,
    createRecurringOccurrence: async (data) => {
      counter += 1;
      occurrences.push(data);
      return {
        id: `generated-${counter}`,
        recurrenceDate: data.recurrenceDate,
      };
    },
    advanceWatermark: async (definitionId, isoDate) => {
      watermarks.push([definitionId, isoDate]);
    },
  };

  return { tx, occurrences, watermarks };
}

async function routeHarness(t, user = { id: OWNER_ID }) {
  t.mock.method(db, 'query', async () => {
    throw new Error('Route must not query the database directly');
  });
  t.mock.method(db, 'connect', async () => {
    throw new Error('Route must not acquire a connection');
  });
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use('/api/projects', recurringRoutes);
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
  const port = server.address().port;
  return {
    request(method, path, body) {
      return new Promise((resolve, reject) => {
        const data = body === undefined ? null : JSON.stringify(body);
        const request = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path,
            method,
            agent: false,
            headers:
              data === null
                ? {}
                : {
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
          request.destroy(new Error('Recurring route request timed out')),
        );
        request.end(data ?? undefined);
      });
    },
  };
}

test('POST creates a recurring definition with V1 defaults applied', async (t) => {
  const { request } = await routeHarness(t);
  const getOwnedProject = t.mock.method(repository, 'getOwnedProject', async () => activeProject);
  const createDefinition = t.mock.method(repository, 'createDefinition', async () => definition());

  const response = await request('POST', `/api/projects/${PROJECT_ID}/recurring-entries`, {
    name: 'Morning journal',
    tags: ['Journal'],
    checklist: [{ text: 'Write three lines' }],
    frequency: 'daily',
    startsOn: '2026-09-01',
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(getOwnedProject.mock.calls[0].arguments[0], PROJECT_ID);
  assert.equal(getOwnedProject.mock.calls[0].arguments[1], OWNER_ID);
  assert.deepEqual(createDefinition.mock.calls[0].arguments[0], {
    projectId: PROJECT_ID,
    createdById: OWNER_ID,
    name: 'Morning journal',
    durationMinutes: 0,
    tags: ['journal'],
    checklist: [{ text: 'Write three lines' }],
    frequency: 'daily',
    intervalCount: 1,
    startsOn: '2026-09-01',
    endsOn: null,
    enabled: true,
  });
  assert.equal(response.body.data.name, 'Morning journal');
  assert.deepEqual(response.body.data.tags, ['journal']);
  assert.equal(response.body.data.endsOn, null);
  assert.equal(response.body.data.enabled, true);
  assert.ok(!('createdById' in response.body.data));
});

test('POST rejects an invalid body before touching the repository', async (t) => {
  const { request } = await routeHarness(t);
  const createDefinition = t.mock.method(repository, 'createDefinition', async () => definition());

  const response = await request('POST', `/api/projects/${PROJECT_ID}/recurring-entries`, {
    name: '',
    frequency: 'yearly',
    startsOn: '2026-09-01',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Invalid recurring entry data');
  assert.equal(createDefinition.mock.callCount(), 0);
});

test('POST rejects a project the user does not own', async (t) => {
  const { request } = await routeHarness(t);
  t.mock.method(repository, 'getOwnedProject', async () => null);
  const createDefinition = t.mock.method(repository, 'createDefinition', async () => definition());

  const response = await request('POST', `/api/projects/${uuid(9)}/recurring-entries`, {
    name: 'Morning journal',
    frequency: 'daily',
    startsOn: '2026-09-01',
  });

  assert.equal(response.status, 404);
  assert.equal(response.body.message, 'Project not found');
  assert.equal(createDefinition.mock.callCount(), 0);
});

test('POST rejects an archived project', async (t) => {
  const { request } = await routeHarness(t);
  t.mock.method(repository, 'getOwnedProject', async () => ({
    ...activeProject,
    archivedAt: '2026-09-27T10:00:00.000Z',
  }));
  const createDefinition = t.mock.method(repository, 'createDefinition', async () => definition());

  const response = await request('POST', `/api/projects/${PROJECT_ID}/recurring-entries`, {
    name: 'Morning journal',
    frequency: 'daily',
    startsOn: '2026-09-01',
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.message, 'Archived projects cannot be edited');
  assert.equal(createDefinition.mock.callCount(), 0);
});

test('GET lists serialized definitions for the owning user', async (t) => {
  const { request } = await routeHarness(t);
  t.mock.method(repository, 'getOwnedProject', async () => activeProject);
  t.mock.method(repository, 'listDefinitions', async () => [definition()]);

  const response = await request('GET', `/api/projects/${PROJECT_ID}/recurring-entries`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.data[0].id, DEFINITION_ID);
  assert.equal(response.body.data[0].frequency, 'daily');
  assert.equal(response.body.data[0].lastGeneratedOn, null);
  assert.ok(!('createdById' in response.body.data[0]));
});

test('PATCH updates the enabled flag through the owning user', async (t) => {
  const { request } = await routeHarness(t);
  t.mock.method(repository, 'getDefinitionWithOwner', async () => ({
    ...definition(),
    projectOwnerId: OWNER_ID,
    projectArchivedAt: null,
  }));
  const updateDefinition = t.mock.method(repository, 'updateDefinition', async () =>
    definition({ enabled: false }),
  );

  const response = await request(
    'PATCH',
    `/api/projects/recurring-entries/${DEFINITION_ID}`,
    { enabled: false },
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.enabled, false);
  assert.equal(updateDefinition.mock.callCount(), 1);
  assert.deepEqual(updateDefinition.mock.calls[0].arguments, [
    DEFINITION_ID,
    { enabled: false },
  ]);
});

test('PATCH rejects an empty update body', async (t) => {
  const { request } = await routeHarness(t);
  const updateDefinition = t.mock.method(repository, 'updateDefinition', async () => definition());

  const response = await request(
    'PATCH',
    `/api/projects/recurring-entries/${DEFINITION_ID}`,
    {},
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Invalid recurring entry data');
  assert.equal(updateDefinition.mock.callCount(), 0);
});

test('PATCH rejects a start date after the stored end date', async (t) => {
  const { request } = await routeHarness(t);
  t.mock.method(repository, 'getDefinitionWithOwner', async () => ({
    ...definition({ endsOn: '2026-09-20' }),
    projectOwnerId: OWNER_ID,
    projectArchivedAt: null,
  }));
  const updateDefinition = t.mock.method(repository, 'updateDefinition', async () => definition());

  const response = await request(
    'PATCH',
    `/api/projects/recurring-entries/${DEFINITION_ID}`,
    { startsOn: '2026-09-25' },
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'End date cannot be earlier than start date');
  assert.equal(updateDefinition.mock.callCount(), 0);
});

test('DELETE removes the definition and returns its id', async (t) => {
  const { request } = await routeHarness(t);
  t.mock.method(repository, 'getDefinitionWithOwner', async () => ({
    ...definition(),
    projectOwnerId: OWNER_ID,
    projectArchivedAt: null,
  }));
  const deleteDefinition = t.mock.method(repository, 'deleteDefinition', async () => DEFINITION_ID);

  const response = await request(
    'DELETE',
    `/api/projects/recurring-entries/${DEFINITION_ID}`,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, { id: DEFINITION_ID });
  assert.deepEqual(deleteDefinition.mock.calls[0].arguments, [DEFINITION_ID]);
});

test('POST generate-due creates one entry per due occurrence and advances the watermark', async (t) => {
  const { request } = await routeHarness(t);
  const { tx, occurrences, watermarks } = fakeTransaction({
    definitions: [definition({ endsOn: '2026-09-03' })],
  });
  t.mock.method(repository, 'withTransaction', async (work) => work(tx));

  const response = await request(
    'POST',
    `/api/projects/${PROJECT_ID}/recurring-entries/generate-due`,
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.generatedCount, 3);
  assert.deepEqual(
    response.body.data.generatedEntries.map((entry) => entry.recurrenceDate),
    ['2026-09-01', '2026-09-02', '2026-09-03'],
  );
  assert.deepEqual(occurrences[0], {
    definitionId: DEFINITION_ID,
    projectId: PROJECT_ID,
    createdById: OWNER_ID,
    name: 'Morning journal',
    durationMinutes: 20,
    tags: ['journal'],
    checklist: [{ text: 'Write three lines' }],
    recurrenceDate: '2026-09-01',
  });
  assert.deepEqual(watermarks, [[DEFINITION_ID, '2026-09-03']]);
});

test('POST generate-due advances the watermark even when every insert conflicts', async (t) => {
  const { request } = await routeHarness(t);
  const { tx, watermarks } = fakeTransaction({
    definitions: [definition({ endsOn: '2026-09-03' })],
  });
  const attempts = [];
  tx.createRecurringOccurrence = async (data) => {
    attempts.push(data.recurrenceDate);
    return null;
  };
  t.mock.method(repository, 'withTransaction', async (work) => work(tx));

  const response = await request(
    'POST',
    `/api/projects/${PROJECT_ID}/recurring-entries/generate-due`,
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.data.generatedCount, 0);
  assert.deepEqual(response.body.data.generatedEntries, []);
  assert.deepEqual(attempts, ['2026-09-01', '2026-09-02', '2026-09-03']);
  assert.deepEqual(watermarks, [[DEFINITION_ID, '2026-09-03']]);
});

test('POST generate-due requires an authenticated user', async (t) => {
  const { request } = await routeHarness(t, null);
  const startTransaction = t.mock.method(repository, 'withTransaction', async () => {
    throw new Error('Must not start a transaction');
  });

  const response = await request(
    'POST',
    `/api/projects/${PROJECT_ID}/recurring-entries/generate-due`,
  );

  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Authentication required');
  assert.equal(startTransaction.mock.callCount(), 0);
});

test('createRecurringOccurrence returns null when the occurrence already exists', async (t) => {
  const query = t.mock.method(db, 'query', async () => ({ rows: [] }));

  const result = await repository.createRecurringOccurrence({
    projectId: PROJECT_ID,
    createdById: OWNER_ID,
    name: 'Morning journal',
    durationMinutes: 20,
    tags: ['journal'],
    checklist: [{ text: 'Write three lines' }],
    definitionId: DEFINITION_ID,
    recurrenceDate: '2026-09-28',
  });

  assert.equal(result, null);
  assert.equal(query.mock.callCount(), 1);
  assert.match(
    query.mock.calls[0].arguments[0],
    /ON CONFLICT \(recurring_definition_id, recurrence_date\)[\s\S]*DO NOTHING/,
  );
  assert.deepEqual(query.mock.calls[0].arguments[1], [
    PROJECT_ID,
    OWNER_ID,
    'Morning journal',
    20,
    '2026-09-28T00:00:00.000Z',
    ['journal'],
    DEFINITION_ID,
    '2026-09-28',
  ]);
});

test('createRecurringOccurrence returns the new row and inserts checklist items in order', async (t) => {
  const responses = [
    { rows: [{ id: ENTRY_ID, recurrence_date: '2026-09-28' }] },
    { rows: [] },
    { rows: [] },
  ];
  const query = t.mock.method(db, 'query', async () => responses.shift());

  const result = await repository.createRecurringOccurrence({
    projectId: PROJECT_ID,
    createdById: OWNER_ID,
    name: 'Morning journal',
    durationMinutes: 20,
    tags: ['journal'],
    checklist: [{ text: 'First' }, { text: 'Second' }],
    definitionId: DEFINITION_ID,
    recurrenceDate: '2026-09-28',
  });

  assert.deepEqual(result, { id: ENTRY_ID, recurrenceDate: '2026-09-28' });
  assert.equal(query.mock.callCount(), 3);
  assert.match(query.mock.calls[1].arguments[0], /INSERT INTO entry_checklist_items/);
  assert.deepEqual(query.mock.calls[1].arguments[1], [ENTRY_ID, 'First', 0]);
  assert.deepEqual(query.mock.calls[2].arguments[1], [ENTRY_ID, 'Second', 1]);
});

test('advanceWatermark never moves the watermark backwards', async (t) => {
  const query = t.mock.method(db, 'query', async () => ({ rows: [] }));

  await repository.advanceWatermark(DEFINITION_ID, '2026-09-28');

  assert.match(query.mock.calls[0].arguments[0], /GREATEST\(/);
  assert.match(query.mock.calls[0].arguments[0], /COALESCE\(last_generated_on, \$2::date\)/);
  assert.deepEqual(query.mock.calls[0].arguments[1], [DEFINITION_ID, '2026-09-28']);
});

test('getOwnedProject maps the owning project', async (t) => {
  t.mock.method(db, 'query', async () => ({
    rows: [
      {
        id: PROJECT_ID,
        owner_id: OWNER_ID,
        name: 'Project One',
        archived_at: null,
      },
    ],
  }));

  const project = await repository.getOwnedProject(PROJECT_ID, OWNER_ID);

  assert.deepEqual(project, {
    id: PROJECT_ID,
    ownerId: OWNER_ID,
    name: 'Project One',
    archivedAt: null,
  });
});

test('getOwnedProject returns null when the project is not owned', async (t) => {
  const query = t.mock.method(db, 'query', async () => ({ rows: [] }));

  const project = await repository.getOwnedProject(PROJECT_ID, uuid(9));

  assert.equal(project, null);
  assert.match(query.mock.calls[0].arguments[0], /owner_id = \$2/);
  assert.deepEqual(query.mock.calls[0].arguments[1], [PROJECT_ID, uuid(9)]);
});

test('listDefinitions maps stored definitions to camelCase', async (t) => {
  const query = t.mock.method(db, 'query', async () => ({ rows: [definitionRow()] }));

  const definitions = await repository.listDefinitions(PROJECT_ID);

  assert.match(query.mock.calls[0].arguments[0], /ORDER BY d\.created_at DESC/);
  assert.deepEqual(definitions, [definition()]);
});

test('listEnabledDefinitions only asks for enabled definitions and tolerates missing arrays', async (t) => {
  const query = t.mock.method(db, 'query', async () => ({
    rows: [definitionRow({ tags: null, checklist: null })],
  }));

  const definitions = await repository.listEnabledDefinitions(PROJECT_ID);

  assert.match(query.mock.calls[0].arguments[0], /AND d\.enabled = TRUE/);
  assert.deepEqual(definitions, [definition({ tags: [], checklist: [] })]);
});

test('getDefinitionWithOwner joins the owning project', async (t) => {
  t.mock.method(db, 'query', async () => ({
    rows: [
      {
        ...definitionRow(),
        project_owner_id: OWNER_ID,
        project_archived_at: null,
      },
    ],
  }));

  const found = await repository.getDefinitionWithOwner(DEFINITION_ID);

  assert.deepEqual(found, {
    ...definition(),
    projectOwnerId: OWNER_ID,
    projectArchivedAt: null,
  });
});

test('getDefinitionWithOwner returns null when the definition is missing', async (t) => {
  t.mock.method(db, 'query', async () => ({ rows: [] }));

  assert.equal(await repository.getDefinitionWithOwner(DEFINITION_ID), null);
});

test('createDefinition inserts the definition and reads it back', async (t) => {
  const responses = [{ rows: [{ id: DEFINITION_ID }] }, { rows: [definitionRow()] }];
  const query = t.mock.method(db, 'query', async () => responses.shift());

  const created = await repository.createDefinition({
    projectId: PROJECT_ID,
    createdById: OWNER_ID,
    name: 'Morning journal',
    durationMinutes: 20,
    tags: ['journal'],
    checklist: [{ text: 'Write three lines' }],
    frequency: 'daily',
    intervalCount: 1,
    startsOn: '2026-09-01',
    endsOn: null,
  });

  assert.match(query.mock.calls[0].arguments[0], /\$6::jsonb/);
  assert.deepEqual(query.mock.calls[0].arguments[1], [
    PROJECT_ID,
    OWNER_ID,
    'Morning journal',
    20,
    ['journal'],
    '[{"text":"Write three lines"}]',
    'daily',
    1,
    '2026-09-01',
    null,
    true,
  ]);
  assert.deepEqual(created, definition());
});

test('updateDefinition only writes provided columns', async (t) => {
  const responses = [
    { rows: [{ id: DEFINITION_ID }] },
    { rows: [definitionRow({ enabled: false })] },
  ];
  const query = t.mock.method(db, 'query', async () => responses.shift());

  const updated = await repository.updateDefinition(DEFINITION_ID, { enabled: false });

  assert.match(query.mock.calls[0].arguments[0], /SET enabled = \$1/);
  assert.ok(!query.mock.calls[0].arguments[0].includes('name ='));
  assert.deepEqual(query.mock.calls[0].arguments[1], [false, DEFINITION_ID]);
  assert.equal(updated.enabled, false);
});

test('deleteDefinition returns the removed id or null', async (t) => {
  const query = t.mock.method(db, 'query', async () => ({ rows: [{ id: DEFINITION_ID }] }));

  assert.equal(await repository.deleteDefinition(DEFINITION_ID), DEFINITION_ID);

  query.mock.mockImplementation(async () => ({ rows: [] }));
  assert.equal(await repository.deleteDefinition(DEFINITION_ID), null);
});

test('withTransaction commits and releases the dedicated client', async (t) => {
  const queries = [];
  let releases = 0;
  t.mock.method(db, 'connect', async () => ({
    query: async (sql) => {
      queries.push(sql);
    },
    release: () => {
      releases += 1;
    },
  }));

  const result = await repository.withTransaction(async () => 'done');

  assert.equal(result, 'done');
  assert.deepEqual(queries, ['BEGIN', 'COMMIT']);
  assert.equal(releases, 1);
});

test('withTransaction rolls back and releases when the work throws', async (t) => {
  const queries = [];
  let releases = 0;
  t.mock.method(db, 'connect', async () => ({
    query: async (sql) => {
      queries.push(sql);
    },
    release: () => {
      releases += 1;
    },
  }));

  await assert.rejects(
    repository.withTransaction(async () => {
      throw new Error('Occurrence insert failed');
    }),
    /Occurrence insert failed/,
  );

  assert.deepEqual(queries, ['BEGIN', 'ROLLBACK']);
  assert.equal(releases, 1);
});

test('generate-due scales to 100 definitions within the global 100-occurrence cap', async (t) => {
  const definitions = Array.from({ length: 100 }, (_, index) =>
    definition({
      id: uuid(200 + index),
      name: `Habit ${index + 1}`,
      startsOn: '2026-09-27',
    }),
  );
  const { tx, occurrences, watermarks } = fakeTransaction({ definitions });
  t.mock.method(repository, 'withTransaction', async (work) => work(tx));

  const startedAt = process.hrtime.bigint();
  const first = await generateDueRecurringEntriesService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    now: new Date('2026-09-28T12:00:00.000Z'),
  });
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

  // 200 due occurrences across 100 definitions, but one request
  // generates at most 100 in total - not 100 per definition.
  assert.equal(first.generatedCount, 100);
  assert.equal(first.generatedEntries.length, 100);
  assert.equal(occurrences.length, 100);
  assert.ok(
    first.generatedEntries.every((entry) => entry.recurrenceDate === '2026-09-27'),
  );
  assert.equal(watermarks.length, 100);
  assert.ok(watermarks.every(([, isoDate]) => isoDate === '2026-09-27'));

  // Each definition contributed at most one occurrence.
  const counts = new Map();
  for (const entry of first.generatedEntries) {
    counts.set(entry.definitionId, (counts.get(entry.definitionId) ?? 0) + 1);
  }
  assert.equal(counts.size, 100);
  assert.ok([...counts.values()].every((count) => count === 1));

  // The second request continues the backlog without duplicates.
  for (const row of definitions) {
    row.lastGeneratedOn = '2026-09-27';
  }

  const second = await generateDueRecurringEntriesService({
    projectId: PROJECT_ID,
    userId: OWNER_ID,
    now: new Date('2026-09-28T12:00:00.000Z'),
  });

  assert.equal(second.generatedCount, 100);
  assert.ok(
    second.generatedEntries.every((entry) => entry.recurrenceDate === '2026-09-28'),
  );
  assert.equal(occurrences.length, 200);

  const seen = new Set(
    occurrences.map((data) => `${data.definitionId}:${data.recurrenceDate}`),
  );
  assert.equal(seen.size, 200);
  t.diagnostic(
    `100 definitions -> 100 occurrence writes + 100 watermark writes per request in ${elapsedMs.toFixed(1)} ms`,
  );
});
