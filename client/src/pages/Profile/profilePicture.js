export const MAX_PROFILE_PICTURE_BYTES = 512 * 1024;
export const PROFILE_PICTURE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function readProfilePicture(file) {
  if (!file || !PROFILE_PICTURE_TYPES.includes(file.type)) {
    return Promise.reject(new Error('Choose a PNG, JPEG or WebP image.'));
  }
  if (!file.size || file.size > MAX_PROFILE_PICTURE_BYTES) {
    return Promise.reject(new Error('Choose a non-empty image no larger than 512 KiB.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this image. Please try another file.'));
    reader.onabort = () => reject(new Error('Image reading was cancelled. Please try again.'));
    reader.onload = () => {
      if (
        typeof reader.result !== 'string' ||
        !reader.result.startsWith(`data:${file.type};base64,`)
      ) {
        reject(new Error('Could not read this image. Please try another file.'));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function createProfilePatch(formData, avatarUrl, avatarDirty) {
  return {
    name: formData.name.trim(),
    bio: formData.bio.trim(),
    ...(avatarDirty ? { avatarUrl } : {}),
  };
}
