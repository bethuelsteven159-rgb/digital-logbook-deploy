const { beforeEach, afterEach, mock, test } = require('node:test');
const assert = require('node:assert/strict');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const users = require('../data/userStore');
const authController = require('../controllers/authController');

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const storedUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test User',
  email: 'test@example.com',
  avatarUrl: 'https://example.com/avatar.png',
  createdAt: '2026-09-01T00:00:00.000Z',
};

beforeEach(() => {
  mock.method(console, 'error', () => {});
});

afterEach(() => {
  mock.restoreAll();
});

test('googleAuth rejects a missing Google ID token', async () => {
  const req = { body: {} };
  const res = createResponse();

  await authController.googleAuth(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    error: { code: 'MISSING_TOKEN', message: 'idToken is required' },
  });
});

test('googleAuth rejects an invalid Google token before reading users', async () => {
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => {
    throw new Error('invalid token');
  });
  const find = mock.method(users, 'findByGoogleId', async () => storedUser);
  const res = createResponse();

  await authController.googleAuth({ body: { idToken: 'bad-token' } }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, 'INVALID_TOKEN');
  assert.equal(find.mock.callCount(), 0);
});

test('googleAuth returns an existing user and signs a session token', async () => {
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => ({
      sub: 'google-123',
      email: storedUser.email,
      name: storedUser.name,
      picture: storedUser.avatarUrl,
    }),
  }));
  mock.method(users, 'findByGoogleId', async () => storedUser);
  const create = mock.method(users, 'createUser', async () => storedUser);
  const sign = mock.method(jwt, 'sign', () => 'session-token');
  const res = createResponse();

  await authController.googleAuth({ body: { idToken: 'valid-token' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.token, 'session-token');
  assert.deepEqual(res.body.user, storedUser);
  assert.equal(create.mock.callCount(), 0);
  assert.deepEqual(sign.mock.calls[0].arguments[0], {
    sub: storedUser.id,
    email: storedUser.email,
  });
  assert.equal(sign.mock.calls[0].arguments[2].expiresIn, '7d');
});

test('googleAuth creates a first-time user from the verified Google payload', async () => {
  const payload = {
    sub: 'google-new',
    email: 'new@example.com',
    name: 'New User',
    picture: 'https://example.com/new.png',
  };
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => payload,
  }));
  mock.method(users, 'findByGoogleId', async () => null);
  const create = mock.method(users, 'createUser', async () => storedUser);
  mock.method(jwt, 'sign', () => 'session-token');
  const res = createResponse();

  await authController.googleAuth({ body: { idToken: 'valid-token' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(create.mock.calls[0].arguments[0], {
    googleId: payload.sub,
    name: payload.name,
    email: payload.email,
    avatarUrl: payload.picture,
  });
});

test('googleAuth returns SERVER_ERROR when user persistence fails', async () => {
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => ({ sub: 'google-123' }),
  }));
  mock.method(users, 'findByGoogleId', async () => {
    throw new Error('database unavailable');
  });
  const res = createResponse();

  await authController.googleAuth({ body: { idToken: 'valid-token' } }, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    error: { code: 'SERVER_ERROR', message: 'Something went wrong' },
  });
});

test('getCurrentUser returns the public authenticated user', async () => {
  const find = mock.method(users, 'findById', async () => storedUser);
  const res = createResponse();

  await authController.getCurrentUser({ user: { sub: storedUser.id } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { user: storedUser });
  assert.equal(find.mock.calls[0].arguments[0], storedUser.id);
});

test('getCurrentUser returns 401 when the authenticated user no longer exists', async () => {
  mock.method(users, 'findById', async () => null);
  const res = createResponse();

  await authController.getCurrentUser({ user: { sub: storedUser.id } }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, 'UNAUTHORIZED');
});

test('getCurrentUser lets unexpected repository failures propagate to the API error handler', async () => {
  mock.method(users, 'findById', async () => {
    throw new Error('database timeout');
  });

  await assert.rejects(
    () => authController.getCurrentUser({ user: { sub: storedUser.id } }, createResponse()),
    /database timeout/,
  );
});
