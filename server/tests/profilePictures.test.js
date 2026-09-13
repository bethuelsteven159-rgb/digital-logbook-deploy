const { after, before, beforeEach, mock, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const { patchProfile, getProfile } = require('../controllers/profileController');
const { updateProfile, getProfileByUserId } = require('../repositories/profileRepository');
const { MAX_AVATAR_BYTES, validateAvatarUrl } = require('../validation/profileAvatar');

const USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const GOOGLE_AVATAR = 'https://lh3.googleusercontent.com/existing-picture';
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII=';
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2Q==';
const webpBytes = Buffer.alloc(22);
webpBytes.write('RIFF', 0);
webpBytes.writeUInt32LE(webpBytes.length - 8, 4);
webpBytes.write('WEBPVP8L', 8);
webpBytes.writeUInt32LE(2, 16);
webpBytes[20] = 47;
const WEBP = `data:image/webp;base64,${webpBytes.toString('base64')}`;
const disguisedWebpBytes = Buffer.from(webpBytes);
disguisedWebpBytes[0] |= 128;
const DISGUISED_WEBP = `data:image/webp;base64,${disguisedWebpBytes.toString('base64')}`;

let server;
let baseUrl;
let token;
let row;
let queries;
const previousSecret = process.env.JWT_SECRET;

function initialRow() {
  return {
    id: USER_ID,
    google_id: 'google-user',
    name: 'Original name',
    email: 'person@example.test',
    avatar_url: GOOGLE_AVATAR,
    bio: 'Original bio',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

function sizedJpeg(size) {
  const bytes = Buffer.alloc(size);
  bytes.set([255, 216, 255]);
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

before(async () => {
  process.env.JWT_SECRET = 'profile-picture-tests-only-secret';
  token = jwt.sign({ sub: USER_ID }, process.env.JWT_SECRET, { expiresIn: '5m' });
  mock.method(db, 'query', async (sql, values) => {
    queries.push({ sql, values });
    if (/UPDATE users/.test(sql)) {
      // Assert persistence intent as well as simulate its effect; no live DB is used.
      assert.match(sql, /name = \$1/);
      assert.match(sql, /bio = \$2/);
      assert.match(sql, /avatar_url = CASE WHEN \$4::boolean THEN \$5::text ELSE avatar_url END/);
      assert.match(sql, /WHERE id = \$3/);
      assert.match(sql, /updated_at = NOW\(\)/);
      assert.match(sql, /RETURNING[\s\S]*avatar_url/);
      assert.equal(values.length, 5);
      assert.equal(typeof values[3], 'boolean');
      if (!row || values[2] !== row.id) {
        return { rows: [] };
      }
      row = {
        ...row,
        name: values[0],
        bio: values[1],
        avatar_url: values[3] ? values[4] : row.avatar_url,
        updated_at: '2026-02-01T00:00:00.000Z',
      };
      return { rows: [{ ...row }] };
    }
    assert.match(
      sql,
      /SELECT[\s\S]*avatar_url[\s\S]*FROM users[\s\S]*WHERE (?:google_id|id) = \$1/,
    );
    const key = /WHERE google_id/.test(sql) ? 'google_id' : 'id';
    return { rows: row && values[0] === row[key] ? [{ ...row }] : [] };
  });
  mock.method(console, 'error', () => {});

  // Keep real auth/profile routing and parsers, isolating unrelated feature dependencies.
  const unrelatedRoutes = [
    'projects',
    'projectDetails',
    'savedFilters',
    'stats',
    'external',
    'dashboard',
  ];
  const cachedRoutes = unrelatedRoutes.map((name) => {
    const filename = require.resolve(`../routes/${name}`);
    const cached = require.cache[filename];
    require.cache[filename] = { id: filename, filename, loaded: true, exports: express.Router() };
    return { filename, cached };
  });
  // Capture the real app without starting the development server.
  let app;
  const listen = mock.method(express.application, 'listen', function () {
    app = this;
  });
  try {
    require('../server');
  } finally {
    listen.mock.restore();
    for (const { filename, cached } of cachedRoutes) {
      if (cached) {
        require.cache[filename] = cached;
      } else {
        delete require.cache[filename];
      }
    }
  }
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  row = initialRow();
  queries = [];
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  mock.restoreAll();
  if (previousSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousSecret;
  }
});

async function request({
  method = 'PATCH',
  path = '/api/users/me/profile',
  body,
  authorization = `Bearer ${token}`,
  raw,
  contentType = 'application/json',
} = {}) {
  const headers = { 'Content-Type': contentType };
  if (authorization) {
    headers.Authorization = authorization;
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  return { status: response.status, body: await response.json() };
}

const metadata = { name: 'Updated name', bio: 'Updated bio' };

test('GET preserves existing Google avatar and profile metadata', async () => {
  const result = await request({ method: 'GET' });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data, {
    id: USER_ID,
    googleId: 'google-user',
    name: row.name,
    email: row.email,
    avatarUrl: GOOGLE_AVATAR,
    bio: row.bio,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
});

for (const [type, avatarUrl] of [
  ['PNG', PNG],
  ['JPEG', JPEG],
  ['WebP', WEBP],
]) {
  test(`${type} uploads persist and are returned by profile and auth refresh`, async () => {
    const result = await request({ body: { ...metadata, avatarUrl } });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.avatarUrl, avatarUrl);
    assert.equal(row.avatar_url, avatarUrl);
    assert.deepEqual(queries[0].values, [metadata.name, metadata.bio, USER_ID, true, avatarUrl]);
    const profile = await request({ method: 'GET' });
    assert.equal(profile.body.data.avatarUrl, avatarUrl);
    const currentUser = await request({ method: 'GET', path: '/api/auth/me' });
    assert.equal(currentUser.body.user.avatarUrl, avatarUrl);
  });
}

test('replacement, removal and a later metadata save keep persisted avatar semantics', async () => {
  for (const avatarUrl of [PNG, WEBP, null]) {
    const result = await request({ body: { ...metadata, avatarUrl } });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.avatarUrl, avatarUrl);
    assert.equal(row.avatar_url, avatarUrl);
  }
  const result = await request({ body: metadata });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.avatarUrl, null);
  const refreshed = await request({ method: 'GET', path: '/api/auth/me' });
  assert.equal(refreshed.body.user.avatarUrl, null);
});

test('returning Google sign-in does not restore a removed avatar or overwrite an upload', async () => {
  const verify = mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => ({
      sub: 'google-user',
      name: 'Google name',
      email: row.email,
      picture: GOOGLE_AVATAR,
    }),
  }));
  try {
    for (const avatarUrl of [PNG, null]) {
      row.avatar_url = avatarUrl;
      const result = await request({
        method: 'POST',
        path: '/api/auth/google',
        authorization: null,
        body: { idToken: 'mock-google-id-token' },
      });
      assert.equal(result.status, 200);
      assert.equal(result.body.user.avatarUrl, avatarUrl);
      assert.equal(row.avatar_url, avatarUrl);
      assert.equal(jwt.verify(result.body.token, process.env.JWT_SECRET).sub, USER_ID);
    }
    assert.equal(queries.length, 2);
    assert.ok(queries.every(({ sql }) => !/UPDATE|INSERT/.test(sql)));
  } finally {
    verify.mock.restore();
  }
});

test('omitted avatar preserves Google URL while trimming metadata and clearing bio', async () => {
  const result = await request({ body: { name: '  New name  ', bio: '   ' } });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.name, 'New name');
  assert.equal(result.body.data.bio, '');
  assert.equal(result.body.data.avatarUrl, GOOGLE_AVATAR);
  assert.equal(result.body.data.email, 'person@example.test');
  assert.equal(result.body.data.googleId, 'google-user');
  assert.equal(result.body.data.createdAt, '2026-01-01T00:00:00.000Z');
  assert.deepEqual(queries[0].values, ['New name', '', USER_ID, false, null]);
});

test('repository preserves an omitted custom avatar and distinguishes explicit null', async () => {
  row.avatar_url = PNG;
  const preserved = await updateProfile(USER_ID, metadata);
  assert.equal(preserved.avatarUrl, PNG);
  assert.equal(queries[0].values[3], false);
  const removed = await updateProfile(USER_ID, { ...metadata, avatarUrl: null });
  assert.equal(removed.avatarUrl, null);
  assert.deepEqual(queries[1].values, [metadata.name, metadata.bio, USER_ID, true, null]);
  assert.equal((await getProfileByUserId(USER_ID)).avatarUrl, null);
});

test('exactly 512 KiB decoded avatar passes the real profile JSON parser', async () => {
  const avatarUrl = sizedJpeg(MAX_AVATAR_BYTES);
  const result = await request({
    body: { name: 'n'.repeat(100), bio: 'b'.repeat(500), avatarUrl },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.avatarUrl, avatarUrl);
});

const invalidAvatars = [
  ['remote URL', GOOGLE_AVATAR],
  ['HTML data URL', 'data:text/html;base64,PGgxPkhlbGxvPC9oMT4='],
  ['SVG data URL', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
  ['unsupported GIF', 'data:image/gif;base64,R0lGODlh'],
  ['wrong MIME signature', PNG.replace('image/png', 'image/jpeg')],
  ['HTML disguised as PNG', 'data:image/png;base64,PGgxPkhlbGxvPC9oMT4='],
  ['empty payload', 'data:image/png;base64,'],
  ['invalid alphabet', 'data:image/png;base64,@@@@'],
  ['embedded whitespace', PNG.replace('iVBOR', 'iV\nBOR')],
  ['missing padding', PNG.replace(/=+$/, '')],
  ['excess padding', `${PNG}=`],
  ['non-canonical padding bits', 'data:image/png;base64,iVBORw0KGgp='],
  ['URL-safe base64', 'data:image/jpeg;base64,_9j_'],
  ['extra MIME parameters', PNG.replace(';base64,', ';charset=utf-8;base64,')],
  ['truncated PNG signature', 'data:image/png;base64,iVBORw=='],
  ['truncated JPEG signature', 'data:image/jpeg;base64,/9g='],
  ['malformed WebP container', 'data:image/webp;base64,UklGRgAAAABXRUJQVlA4TA=='],
  ['disguised WebP signature', DISGUISED_WEBP],
  ['empty string', ''],
  ['number', 123],
  ['boolean', false],
  ['object', {}],
  ['array', []],
  ['one byte over decoded limit', sizedJpeg(MAX_AVATAR_BYTES + 1)],
];

for (const [label, avatarUrl] of invalidAvatars) {
  test(`PATCH rejects ${label} before persistence`, async () => {
    const result = await request({ body: { ...metadata, avatarUrl } });
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
    assert.ok(result.body.message);
    assert.equal(queries.length, 0);
    assert.deepEqual(row, initialRow());
  });
}

test('validator bounds enormous input before decoding and permits null only as removal', () => {
  assert.throws(() => validateAvatarUrl(sizedJpeg(MAX_AVATAR_BYTES + 100)), /512 KiB/);
  assert.throws(() => validateAvatarUrl(undefined), { statusCode: 400 });
  assert.equal(validateAvatarUrl(null), null);
});

test('missing or invalid authentication rejects even oversized profile bodies before parsing', async () => {
  const expiredToken = jwt.sign({ sub: USER_ID }, process.env.JWT_SECRET, { expiresIn: -1 });
  for (const authorization of [null, 'Bearer invalid', `Bearer ${expiredToken}`]) {
    const result = await request({ authorization, raw: '{'.repeat(800 * 1024) });
    assert.equal(result.status, 401);
    assert.equal(queries.length, 0);
  }
  assert.equal((await request({ method: 'GET', authorization: null })).status, 401);
});

test('controllers reject absent authenticated identity without touching the DB', async () => {
  for (const handler of [getProfile, patchProfile]) {
    let forwarded;
    await handler({ body: metadata }, {}, (error) => {
      forwarded = error;
    });
    assert.equal(forwarded.statusCode, 401);
  }
  const noIdentity = jwt.sign({ email: 'person@example.test' }, process.env.JWT_SECRET);
  assert.equal(
    (await request({ authorization: `Bearer ${noIdentity}`, body: metadata })).status,
    401,
  );
  assert.equal(queries.length, 0);
});

test('missing users return 404 for profile GET and PATCH', async () => {
  row = null;
  assert.equal((await request({ method: 'GET' })).status, 404);
  assert.equal((await request({ body: { ...metadata, avatarUrl: PNG } })).status, 404);
});

test('one user cannot target another profile through body properties', async () => {
  const result = await request({
    body: {
      ...metadata,
      id: 'another-user',
      userId: 'another-user',
      email: 'changed@example.test',
      avatarUrl: PNG,
    },
  });
  assert.equal(result.status, 200);
  assert.equal(queries[0].values[2], USER_ID);
  assert.equal(row.email, 'person@example.test');
});

for (const [label, body] of [
  ['missing name', { bio: 'bio' }],
  ['blank name', { name: '  ' }],
  ['non-string name', { name: 1 }],
  ['long name', { name: 'n'.repeat(101) }],
  ['long bio', { name: 'Name', bio: 'b'.repeat(501) }],
]) {
  test(`metadata validation still rejects ${label}`, async () => {
    assert.equal((await request({ body: { ...body, avatarUrl: PNG } })).status, 400);
    assert.equal(queries.length, 0);
  });
}

test('profile parser rejects requests above 750 KiB and malformed JSON', async () => {
  const oversized = await request({ body: { ...metadata, padding: 'a'.repeat(750 * 1024) } });
  assert.equal(oversized.status, 413);
  assert.equal((await request({ raw: '{broken' })).status, 400);
  assert.equal((await request({ body: metadata, contentType: 'text/plain' })).status, 400);
  assert.equal((await request()).status, 400);
  assert.equal(queries.length, 0);
});

test('non-profile routes and other profile methods retain their JSON body limits', async () => {
  const profileResult = await request({ method: 'PATCH', path: '/api/users/me/profile', body: { padding: 'a'.repeat(800 * 1024) } });
  assert.equal(profileResult.status, 413, 'PATCH /api/users/me/profile');
  const globalResult = await request({ method: 'POST', path: '/api/auth/google', body: { padding: 'a'.repeat(11 * 1024 * 1024) } });
  assert.equal(globalResult.status, 413, 'POST /api/auth/google');
  assert.equal(queries.length, 0);
});

test('database failures are reported without returning a successful save', async () => {
  const query = mock.method(db, 'query', async () => {
    throw new Error('Database unavailable');
  });
  try {
    const result = await request({ body: { ...metadata, avatarUrl: PNG } });
    assert.equal(result.status, 500);
    assert.equal(result.body.success, false);
    assert.equal(row.avatar_url, GOOGLE_AVATAR);
  } finally {
    query.mock.restore();
  }
});
