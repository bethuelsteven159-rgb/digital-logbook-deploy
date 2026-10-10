// Pure helpers for the profile avatar creator.
// The avatar is described by a small config object, drawn as SVG, and
// rasterised to a PNG data URL so it passes the same validation and size
// limit as an uploaded picture (see profilePicture.js).

export const AVATAR_SIZE = 256;

export const AVATAR_OPTIONS = {
  background: ['#e0e7ff', '#fde68a', '#bbf7d0', '#fecaca', '#bae6fd', '#e9d5ff', '#fed7aa', '#e2e8f0'],
  skin: ['#fde2c8', '#f5c9a0', '#e0a878', '#bf8456', '#8d5a3b', '#5c3a26'],
  hairColor: ['#1f1a17', '#4a3020', '#8a5a2b', '#d9a441', '#c2410c', '#9ca3af', '#4f63d2', '#be185d'],
  hairStyle: ['short', 'sidepart', 'long', 'curly', 'afro', 'ponytail', 'bun', 'buzz', 'mohawk', 'bald'],
  facialHair: ['none', 'stubble', 'mustache', 'goatee', 'beard'],
  eyes: ['round', 'happy', 'sleepy', 'wink', 'surprised'],
  eyebrows: ['natural', 'raised', 'flat', 'angry', 'none'],
  mouth: ['smile', 'grin', 'smirk', 'neutral', 'open', 'tongue'],
  detail: ['none', 'freckles', 'blush'],
  clothing: ['crew', 'vneck', 'collar', 'hoodie'],
  clothingColor: ['#4f63d2', '#0f766e', '#be123c', '#334155', '#ca8a04', '#7c3aed', '#f1f5f9', '#16a34a'],
  accessory: ['none', 'glasses', 'sunglasses', 'earrings', 'headband', 'beanie'],
};

export const DEFAULT_AVATAR = {
  background: AVATAR_OPTIONS.background[0],
  skin: AVATAR_OPTIONS.skin[1],
  hairColor: AVATAR_OPTIONS.hairColor[1],
  hairStyle: 'short',
  facialHair: 'none',
  eyes: 'round',
  eyebrows: 'natural',
  mouth: 'smile',
  detail: 'none',
  clothing: 'crew',
  clothingColor: AVATAR_OPTIONS.clothingColor[0],
  accessory: 'none',
};

/** Human-readable labels for options that aren't just a capitalised id. */
export const OPTION_LABELS = {
  sidepart: 'Side part',
  vneck: 'V-neck',
  crew: 'Crew neck',
  ponytail: 'Ponytail',
};

export function optionLabel(value) {
  return OPTION_LABELS[value] || value.charAt(0).toUpperCase() + value.slice(1);
}

/** Return a config where every value is guaranteed to be an allowed option. */
export function normalizeAvatar(config = {}) {
  const result = {};
  for (const key of Object.keys(DEFAULT_AVATAR)) {
    result[key] = AVATAR_OPTIONS[key].includes(config?.[key]) ? config[key] : DEFAULT_AVATAR[key];
  }
  return result;
}

export function randomAvatar(random = Math.random) {
  const result = {};
  for (const key of Object.keys(DEFAULT_AVATAR)) {
    const options = AVATAR_OPTIONS[key];
    result[key] = options[Math.min(options.length - 1, Math.floor(random() * options.length))];
  }
  return result;
}

const INK = '#1f2937';
const BROW = '#3a2a20';

function hairBack(style, color) {
  switch (style) {
    case 'long':
      return `<path d="M52 118c-6-52 20-78 76-78s82 26 76 78l-4 100h-36v-78H92v78H56z" fill="${color}"/>`;
    case 'curly':
      return `<g fill="${color}"><circle cx="70" cy="86" r="26"/><circle cx="100" cy="62" r="28"/><circle cx="140" cy="60" r="28"/><circle cx="178" cy="84" r="27"/><circle cx="60" cy="118" r="20"/><circle cx="196" cy="118" r="20"/></g>`;
    case 'afro':
      return `<circle cx="128" cy="96" r="80" fill="${color}"/>`;
    case 'ponytail':
      return `<path d="M176 76c44 6 54 56 36 100-6 14-18 26-30 30 10-30 4-52-14-76z" fill="${color}"/>`;
    case 'bun':
      return `<circle cx="128" cy="38" r="22" fill="${color}"/>`;
    default:
      return '';
  }
}

function hairFront(style, color) {
  switch (style) {
    case 'short':
      return `<path d="M66 100c-4-42 22-62 62-62s66 20 62 62c-14-20-34-30-62-30s-48 10-62 30z" fill="${color}"/>`;
    case 'sidepart':
      return `<path d="M64 108c-4-48 24-72 66-72s64 24 62 72c-6-20-18-32-36-34-28 18-60 20-92 34z" fill="${color}"/>`;
    case 'long':
      return `<path d="M66 104c-2-44 22-64 62-64s64 20 62 64c-16-22-34-32-62-32S82 82 66 104z" fill="${color}"/>`;
    case 'curly':
      return `<g fill="${color}"><circle cx="86" cy="76" r="22"/><circle cx="112" cy="62" r="22"/><circle cx="144" cy="62" r="22"/><circle cx="170" cy="76" r="22"/></g>`;
    case 'afro':
      return `<path d="M68 104c-4-34 18-54 60-54s64 20 60 54c-12-16-32-24-60-24s-48 8-60 24z" fill="${color}"/>`;
    case 'ponytail':
      return `<path d="M66 100c-4-42 22-62 62-62s66 20 62 62c-14-20-34-30-62-30s-48 10-62 30z" fill="${color}"/>`;
    case 'bun':
      return `<path d="M68 100c-2-38 20-58 60-58s62 20 60 58c-14-18-32-26-60-26S82 82 68 100z" fill="${color}"/>`;
    case 'buzz':
      return `<path d="M68 98c-2-34 20-52 60-52s62 18 60 52c-12-14-32-22-60-22S80 84 68 98z" fill="${color}" opacity=".8"/>`;
    case 'mohawk':
      return `<path d="M108 74c-4-30 4-54 20-54s24 24 20 54z" fill="${color}"/>`;
    default:
      return '';
  }
}

function eyebrows(style) {
  const g = (d) => `<g fill="none" stroke="${BROW}" stroke-width="5" stroke-linecap="round">${d}</g>`;
  switch (style) {
    case 'natural':
      return g('<path d="M86 102q12-8 24-2"/><path d="M146 100q12-6 24 2"/>');
    case 'raised':
      return g('<path d="M86 98q12-12 24-4"/><path d="M146 94q12-8 24 4"/>');
    case 'flat':
      return g('<path d="M86 102h24"/><path d="M146 102h24"/>');
    case 'angry':
      return g('<path d="M86 98l24 7"/><path d="M170 98l-24 7"/>');
    default:
      return '';
  }
}

function eyes(style) {
  switch (style) {
    case 'happy':
      return `<g fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"><path d="M88 120q10-12 20 0"/><path d="M148 120q10-12 20 0"/></g>`;
    case 'sleepy':
      return `<g fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"><path d="M88 118h20"/><path d="M148 118h20"/></g>`;
    case 'wink':
      return `<circle cx="98" cy="118" r="7" fill="${INK}"/><path d="M148 118h20" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    case 'surprised':
      return `<g stroke="${INK}" stroke-width="3"><circle cx="98" cy="118" r="11" fill="#fff"/><circle cx="158" cy="118" r="11" fill="#fff"/></g><circle cx="98" cy="119" r="5" fill="${INK}"/><circle cx="158" cy="119" r="5" fill="${INK}"/>`;
    default:
      return `<circle cx="98" cy="118" r="7" fill="${INK}"/><circle cx="158" cy="118" r="7" fill="${INK}"/><circle cx="100" cy="116" r="2" fill="#fff"/><circle cx="160" cy="116" r="2" fill="#fff"/>`;
  }
}

function mouth(style) {
  switch (style) {
    case 'grin':
      return `<path d="M100 156q28 30 56 0z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'smirk':
      return `<path d="M106 162q24 6 44-8" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    case 'neutral':
      return `<path d="M108 164h40" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    case 'open':
      return `<ellipse cx="128" cy="166" rx="13" ry="10" fill="#7f1d1d"/>`;
    case 'tongue':
      return `<path d="M120 167q8 18 16 0z" fill="#f87171"/><path d="M104 158q24 20 48 0" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
    default:
      return `<path d="M104 158q24 20 48 0" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  }
}

const BEARD_PATH =
  'M68 140c0 46 26 66 60 66s60-20 60-66c-8 18-22 30-34 34-8-6-18-8-26-8s-18 2-26 8c-12-4-26-16-34-34z';

function facialHairBack(kind, color) {
  switch (kind) {
    case 'beard':
      return `<path d="${BEARD_PATH}" fill="${color}"/>`;
    case 'stubble':
      return `<path d="${BEARD_PATH}" fill="${color}" opacity=".16"/>`;
    case 'goatee':
      return `<path d="M110 172q18 34 36 0q-18-8-36 0z" fill="${color}"/>`;
    default:
      return '';
  }
}

function facialHairFront(kind, color) {
  if (kind === 'mustache' || kind === 'beard' || kind === 'goatee') {
    return `<path d="M98 152q15-9 30 0q15-9 30 0q-14 11-30 5q-16 6-30-5z" fill="${color}"/>`;
  }
  return '';
}

function detail(kind) {
  switch (kind) {
    case 'freckles':
      return `<g fill="#8d5a3b" opacity=".55"><circle cx="82" cy="140" r="2.5"/><circle cx="92" cy="146" r="2.5"/><circle cx="100" cy="140" r="2.5"/><circle cx="156" cy="140" r="2.5"/><circle cx="164" cy="146" r="2.5"/><circle cx="174" cy="140" r="2.5"/></g>`;
    case 'blush':
      return `<g fill="#f9a8a8" opacity=".5"><ellipse cx="84" cy="144" rx="11" ry="7"/><ellipse cx="172" cy="144" rx="11" ry="7"/></g>`;
    default:
      return '';
  }
}

function clothing(kind, color, skin) {
  const body = `<path d="M36 256c0-46 40-72 92-72s92 26 92 72z" fill="${color}"/>`;
  const shade = `<path d="M36 256c0-46 40-72 92-72s92 26 92 72z" fill="#000" opacity=".06"/>`;
  switch (kind) {
    case 'vneck':
      return `${body}${shade}<path d="M104 186l24 44 24-44z" fill="${skin}"/>`;
    case 'collar':
      return `${body}${shade}<path d="M104 186l24 36 24-36z" fill="${skin}"/><path d="M100 184l26 42-30 4zM156 184l-26 42 30 4z" fill="#fff" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round"/>`;
    case 'hoodie':
      return `${body}${shade}<path d="M96 186q32 38 64 0q-6 40-32 42-26-2-32-42z" fill="#000" opacity=".18"/><path d="M106 186q22 20 44 0z" fill="${skin}"/><path d="M116 212v22M140 212v22" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
    default:
      return `${body}${shade}<path d="M106 186q22 22 44 0z" fill="${skin}"/>`;
  }
}

function accessoryBack() {
  return '';
}

function accessoryFront(kind, hairColor) {
  switch (kind) {
    case 'glasses':
      return `<g fill="none" stroke="${INK}" stroke-width="4"><circle cx="98" cy="118" r="17"/><circle cx="158" cy="118" r="17"/><path d="M115 118h26"/></g>`;
    case 'sunglasses':
      return `<g fill="#111827"><rect x="78" y="104" width="40" height="26" rx="10"/><rect x="138" y="104" width="40" height="26" rx="10"/><rect x="116" y="112" width="24" height="5"/></g>`;
    case 'earrings':
      return `<g fill="#f59e0b"><circle cx="64" cy="152" r="6"/><circle cx="192" cy="152" r="6"/></g>`;
    case 'headband':
      return `<path d="M68 96q60-36 120 0" stroke="#ef4444" stroke-width="9" stroke-linecap="round" fill="none"/>`;
    case 'beanie':
      return `<path d="M64 98c0-46 28-64 64-64s64 18 64 64z" fill="#4f63d2"/><rect x="58" y="90" width="140" height="16" rx="8" fill="#3a4ab0"/><circle cx="128" cy="30" r="8" fill="#e0e7ff"/>`;
    default:
      return hairColor ? '' : '';
  }
}

/** Build the avatar as an SVG string (256x256 viewBox). */
export function buildAvatarSvg(config) {
  const a = normalizeAvatar(config);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" viewBox="0 0 256 256">` +
    `<rect width="256" height="256" fill="${a.background}"/>` +
    `<circle cx="128" cy="96" r="150" fill="#fff" opacity=".18"/>` +
    accessoryBack() +
    hairBack(a.hairStyle, a.hairColor) +
    `<rect x="110" y="166" width="36" height="34" rx="10" fill="${a.skin}"/>` +
    clothing(a.clothing, a.clothingColor, a.skin) +
    `<rect x="110" y="166" width="36" height="14" fill="#000" opacity=".08"/>` +
    `<ellipse cx="66" cy="128" rx="9" ry="14" fill="${a.skin}"/><ellipse cx="190" cy="128" rx="9" ry="14" fill="${a.skin}"/>` +
    `<ellipse cx="128" cy="128" rx="62" ry="68" fill="${a.skin}"/>` +
    detail(a.detail) +
    facialHairBack(a.facialHair, a.hairColor) +
    hairFront(a.hairStyle, a.hairColor) +
    eyebrows(a.eyebrows) +
    eyes(a.eyes) +
    mouth(a.mouth) +
    facialHairFront(a.facialHair, a.hairColor) +
    accessoryFront(a.accessory, a.hairColor) +
    `</svg>`
  );
}

/** Rasterise the avatar to a PNG data URL (browser only). */
export function avatarToPngDataUrl(config, size = AVATAR_SIZE) {
  return new Promise((resolve, reject) => {
    const svg = buildAvatarSvg(config);
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        canvas.getContext('2d').drawImage(image, 0, 0, size, size);
        const url = canvas.toDataURL('image/png');
        if (!url.startsWith('data:image/png;base64,')) {
          throw new Error('unsupported');
        }
        resolve(url);
      } catch {
        reject(new Error('Could not create the avatar image. Please try again.'));
      }
    };
    image.onerror = () => reject(new Error('Could not create the avatar image. Please try again.'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
