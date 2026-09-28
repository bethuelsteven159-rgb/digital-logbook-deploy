import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProfilePatch,
  MAX_PROFILE_PICTURE_BYTES,
  readProfilePicture,
} from './profilePicture.js';

const previousFileReader = globalThis.FileReader;
let readCalls;
let outcome;
let result;

beforeEach(() => {
  readCalls = [];
  outcome = 'load';
  result = undefined;
  globalThis.FileReader = class {
    readAsDataURL(file) {
      readCalls.push(file);
      this.result = result === undefined ? `data:${file.type};base64,AQID` : result;
      queueMicrotask(() => this[`on${outcome}`]());
    }
  };
});

afterEach(() => {
  if (previousFileReader === undefined) {
    delete globalThis.FileReader;
  } else {
    globalThis.FileReader = previousFileReader;
  }
});

for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
  test(`reads a local ${type} as a preview without persistence`, async () => {
    const file = { type, size: 32 };
    assert.equal(await readProfilePicture(file), `data:${type};base64,AQID`);
    assert.deepEqual(readCalls, [file]);
  });
}

test('allows the exact 512 KiB boundary', async () => {
  const file = { type: 'image/png', size: MAX_PROFILE_PICTURE_BYTES };
  assert.match(await readProfilePicture(file), /^data:image\/png;base64,/);
});

for (const type of ['image/svg+xml', 'text/html', 'image/gif', '', 'application/octet-stream']) {
  test(`rejects unsupported type ${type || '(empty)'} before reading`, async () => {
    await assert.rejects(
      readProfilePicture({ type, size: 32, name: 'pretend.png' }),
      /PNG, JPEG or WebP/,
    );
    assert.equal(readCalls.length, 0);
  });
}

test('rejects a missing file before reading', async () => {
  await assert.rejects(readProfilePicture(null), /PNG, JPEG or WebP/);
  assert.equal(readCalls.length, 0);
});

for (const size of [0, MAX_PROFILE_PICTURE_BYTES + 1]) {
  test(`rejects an empty or oversized file (${size} bytes) before reading`, async () => {
    await assert.rejects(readProfilePicture({ type: 'image/png', size }), /512 KiB/);
    assert.equal(readCalls.length, 0);
  });
}

test('FileReader errors produce visible-actionable failure messages', async () => {
  outcome = 'error';
  await assert.rejects(
    readProfilePicture({ type: 'image/png', size: 32 }),
    /Could not read this image/,
  );
});

test('FileReader aborts settle the read so the UI can re-enable controls', async () => {
  outcome = 'abort';
  await assert.rejects(readProfilePicture({ type: 'image/png', size: 32 }), /cancelled/);
});

for (const invalidResult of [
  null,
  '',
  'https://example.test/avatar.png',
  'data:text/html;base64,AQID',
]) {
  test(`rejects an unexpected reader result: ${invalidResult}`, async () => {
    result = invalidResult;
    await assert.rejects(readProfilePicture({ type: 'image/png', size: 32 }), /Could not read/);
  });
}

test('metadata-only saves omit avatarUrl, including existing Google URLs', () => {
  for (const avatar of [
    null,
    'https://lh3.googleusercontent.com/avatar',
    'data:image/png;base64,AQID',
  ]) {
    const patch = createProfilePatch({ name: '  Name  ', bio: '  Bio  ' }, avatar, false);
    assert.deepEqual(patch, { name: 'Name', bio: 'Bio' });
    assert.equal(Object.hasOwn(patch, 'avatarUrl'), false);
  }
});

test('dirty uploads send the preview and removal sends explicit null', () => {
  for (const avatarUrl of ['data:image/png;base64,AQID', null]) {
    const patch = createProfilePatch({ name: '  Name  ', bio: '  ' }, avatarUrl, true);
    assert.deepEqual(patch, { name: 'Name', bio: '', avatarUrl });
    assert.ok(JSON.stringify(patch).includes('"avatarUrl":'));
  }
});
