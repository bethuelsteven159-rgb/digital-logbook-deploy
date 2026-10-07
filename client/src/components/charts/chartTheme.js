// Shared palette + scale helpers for the SVG chart kit.
// Colours follow the app's indigo accent with a cool-toned series ramp.

export const CHART_SERIES = [
  "#4f63d2",
  "#7b8fe8",
  "#3fa796",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
  "#f472b6",
];

export const CHART_AXIS = "#cbd5e1";
export const CHART_GRID = "#eef2f7";
export const CHART_TEXT = "#64748b";

/**
 * Round an axis maximum up to a "nice" value (1/2/5 x 10^n) so gridlines
 * read as round numbers instead of arbitrary decimals.
 */
export function niceMax(value) {
  const safe = Math.max(0, Number(value) || 0);

  if (safe === 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(safe));
  const magnitude = 10 ** exponent;
  const scaled = safe / magnitude;

  let niceStep;

  if (scaled <= 1) niceStep = 1;
  else if (scaled <= 2) niceStep = 2;
  else if (scaled <= 5) niceStep = 5;
  else niceStep = 10;

  return niceStep * magnitude;
}

/** Short label for chart axes: 90 -> "1h 30m" style minute formatting. */
export function formatMinutesShort(minutes) {
  const value = Math.max(0, Number(minutes) || 0);

  if (value === 0) {
    return "0";
  }

  if (value < 60) {
    return `${value}m`;
  }

  const hours = Math.floor(value / 60);
  const remaining = value % 60;

  if (remaining === 0) {
    return `${hours}h`;
  }

  if (hours < 10 && remaining % 10 === 0) {
    return `${hours}h${remaining}`;
  }

  return `${hours}h ${remaining}m`;
}

/** Truncate long labels for axis ticks. */
export function truncateLabel(label, maxLength = 10) {
  const text = String(label ?? "");

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}
