const MAX_AVATAR_BYTES = 512 * 1024;
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_AVATAR_BYTES / 3);

function invalidAvatar(message) {
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}

function validateAvatarUrl(avatarUrl) {
  if (avatarUrl === null) {
    return null;
  }

  if (typeof avatarUrl !== 'string') {
    invalidAvatar('Profile picture must be a PNG, JPEG or WebP data URL, or null.');
  }

  // Bound input before inspecting or decoding the base64 payload.
  if (avatarUrl.length > MAX_BASE64_LENGTH + 23) {
    invalidAvatar('Profile picture cannot exceed 512 KiB.');
  }

  const prefix = /^data:(image\/(?:png|jpeg|webp));base64,/.exec(avatarUrl);
  if (!prefix) {
    invalidAvatar('Only uploaded PNG, JPEG and WebP profile pictures are allowed.');
  }

  const base64 = avatarUrl.slice(prefix[0].length);
  if (!base64 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    invalidAvatar('Profile picture contains invalid base64 data.');
  }

  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length > MAX_AVATAR_BYTES) {
    invalidAvatar('Profile picture cannot exceed 512 KiB.');
  }
  // Buffer.from is permissive; canonical round-tripping rejects bad padding bits too.
  if (bytes.toString('base64') !== base64) {
    invalidAvatar('Profile picture contains invalid base64 data.');
  }

  const matchesSignature = {
    'image/png':
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/jpeg': bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    'image/webp':
      bytes.length >= 16 &&
      bytes.toString('latin1', 0, 4) === 'RIFF' &&
      bytes.toString('latin1', 8, 12) === 'WEBP' &&
      ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('latin1', 12, 16)) &&
      bytes.readUInt32LE(4) + 8 === bytes.length,
  };

  if (!matchesSignature[prefix[1]]) {
    invalidAvatar('Profile picture contents do not match the declared image type.');
  }

  return avatarUrl;
}

module.exports = { MAX_AVATAR_BYTES, validateAvatarUrl };
