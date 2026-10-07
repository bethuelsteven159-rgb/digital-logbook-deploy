const { after, before, mock, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

const USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const previousSecret = process.env.JWT_SECRET;
let server;
let baseUrl;
let token;

before(async () => {
  process.env.JWT_SECRET = 'server-tests-only-secret';
  token = jwt.sign({ sub: USER_ID }, process.env.JWT_SECRET, { expiresIn: '5m' });

  const mockedRoutes = new Map();

  const publicRouter = express.Router();
  publicRouter.get('/boom', (_req, _res, next) => {
    const error = new Error('Synthetic route failure');
    error.statusCode = 418;
    next(error);
  });
  mockedRoutes.set('external', publicRouter);

  const projectRouter = express.Router();
  projectRouter.get('/protected-probe', (req, res) => {
    res.status(200).json({ success: true, userId: req.user.id || req.user.sub });
  });
  mockedRoutes.set('projects', projectRouter);
  const notificationsRouter = express.Router();
  notificationsRouter.get('/', (req, res) => {
    res.status(200).json({ mounted: true, userId: req.user.id || req.user.sub });
  });
  mockedRoutes.set('notifications', notificationsRouter);

  const routeNames = [
    'authRoutes',
    'projects',
    'projectDetails',
    'recurringEntries',
    'savedFilters',
    'automationRules',
    'users',
    'stats',
    'external',
    'logbookTransfer',
    'dashboard',
    'notifications',
  ];

  const cachedRoutes = routeNames.map((name) => {
    const relative = name === 'authRoutes' ? '../routes/authRoutes' : `../routes/${name}`;
    const filename = require.resolve(relative);
    const cached = require.cache[filename];
    const router = mockedRoutes.get(name) || express.Router();
    require.cache[filename] = { id: filename, filename, loaded: true, exports: router };
    return { filename, cached };
  });

  let app;
  const listen = mock.method(express.application, 'listen', function () {
    app = this;
    return { on() {} };
  });

  const serverPath = require.resolve('../server');
  delete require.cache[serverPath];
  try {
    require('../server');
  } finally {
    listen.mock.restore();
    for (const { filename, cached } of cachedRoutes) {
      if (cached) require.cache[filename] = cached;
      else delete require.cache[filename];
    }
  }

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  mock.restoreAll();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { status: response.status, body: await response.json() };
}

test('GET /api/health reports that the API is running', async () => {
  const result = await request('/api/health');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    success: true,
    message: 'Digital Logbook API is running',
  });
});

test('unknown routes use the JSON 404 handler', async () => {
  const result = await request('/definitely-not-a-route');
  assert.equal(result.status, 404);
  assert.deepEqual(result.body, { success: false, message: 'Route not found' });
});

test('protected routes reject requests without authentication', async () => {
  const result = await request('/api/projects/protected-probe');
  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(result.body.message, 'Authentication required');
});

test('protected routes receive the authenticated user identity', async () => {
  const result = await request('/api/projects/protected-probe', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { success: true, userId: USER_ID });
});

test('global error handler preserves an explicit status code and message', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    const result = await request('/api/external/boom');
    assert.equal(result.status, 418);
    assert.deepEqual(result.body, { success: false, message: 'Synthetic route failure' });
  } finally {
    console.error = original;
  }
});

test('GET /api/notifications is mounted and requires authentication', async () => {
  const res = await fetch(`${baseUrl}/api/notifications`);
  assert.equal(res.status, 401);
});

test('GET /api/notifications is reachable with a valid token', async () => {
  const res = await fetch(`${baseUrl}/api/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { mounted: true, userId: USER_ID });
});
