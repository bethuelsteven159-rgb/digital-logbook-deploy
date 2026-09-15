export const PREFERENCES_KEY = "digitalLogbookPreferences";
export const PREFERENCES_EVENT = "digitalLogbookPreferencesChanged";

export const DEFAULT_PREFERENCES = {
  theme: "system",
  entryOrder: "newest",
  projectOrder: "recent",
};

export function loadPreferences() {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY);

    if (!saved) {
      return { ...DEFAULT_PREFERENCES };
    }

    const parsed = JSON.parse(saved);

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences) {
  const next = {
    ...DEFAULT_PREFERENCES,
    ...preferences,
  };

  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));

  window.dispatchEvent(
    new CustomEvent(PREFERENCES_EVENT, {
      detail: next,
    }),
  );

  return next;
}

export function resolveTheme(theme) {
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme) {
  const resolved = resolveTheme(theme);

  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

function dateValue(value) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

export function sortProjects(projects, order) {
  const result = [...projects];

  if (order === "alphabetical") {
    return result.sort((a, b) =>
      String(a.name || "").localeCompare(
        String(b.name || ""),
        undefined,
        {
          sensitivity: "base",
        },
      ),
    );
  }

  if (order === "newest") {
    return result.sort(
      (a, b) =>
        dateValue(b.createdAt || b.created_at) -
        dateValue(a.createdAt || a.created_at),
    );
  }

  return result.sort(
    (a, b) =>
      dateValue(
        b.updatedAt ||
          b.updated_at ||
          b.lastActivity ||
          b.last_activity ||
          b.createdAt ||
          b.created_at,
      ) -
      dateValue(
        a.updatedAt ||
          a.updated_at ||
          a.lastActivity ||
          a.last_activity ||
          a.createdAt ||
          a.created_at,
      ),
  );
}

export function sortEntries(entries, order) {
  const result = [...entries];

  return result.sort((a, b) => {
    const aTime = dateValue(
      a.occurredAt ||
        a.occurred_at ||
        a.createdAt ||
        a.created_at,
    );

    const bTime = dateValue(
      b.occurredAt ||
        b.occurred_at ||
        b.createdAt ||
      b.created_at,
    );

    return order === "oldest"
      ? aTime - bTime
      : bTime - aTime;
  });
}