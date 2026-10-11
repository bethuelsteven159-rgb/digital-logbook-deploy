import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AVATAR_OPTIONS,
  DEFAULT_AVATAR,
  buildAvatarSvg,
  normalizeAvatar,
  randomAvatar,
} from './avatarBuilder.js';

test('normalizeAvatar falls back to defaults for unknown values', () => {
  assert.deepEqual(normalizeAvatar(), DEFAULT_AVATAR);
  assert.deepEqual(normalizeAvatar({ hairStyle: '<script>', skin: 'nope' }), DEFAULT_AVATAR);
  assert.equal(normalizeAvatar({ hairStyle: 'bun' }).hairStyle, 'bun');
});

test('buildAvatarSvg renders a valid svg for every option', () => {
  for (const [key, options] of Object.entries(AVATAR_OPTIONS)) {
    for (const option of options) {
      const svg = buildAvatarSvg({ [key]: option });
      assert.match(svg, /^<svg [^>]*viewBox="0 0 256 256"/);
      assert.ok(svg.endsWith('</svg>'));
    }
  }
});

test('buildAvatarSvg never embeds unvalidated input', () => {
  const svg = buildAvatarSvg({ background: '"><script>alert(1)</script>' });
  assert.ok(!svg.includes('<script'));
});

test('randomAvatar only produces allowed options', () => {
  for (const r of [() => 0, () => 0.5, () => 0.999999, () => 1]) {
    const avatar = randomAvatar(r);
    assert.deepEqual(normalizeAvatar(avatar), avatar);
  }
});
