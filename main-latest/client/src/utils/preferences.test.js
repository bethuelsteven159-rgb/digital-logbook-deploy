import {
  DEFAULT_PREFERENCES,
  PREFERENCES_EVENT,
  PREFERENCES_KEY,
  applyTheme,
  loadPreferences,
  resolveTheme,
  savePreferences,
  sortEntries,
  sortProjects,
} from './preferences';

describe('preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.style.colorScheme = '';
  });

  it('loads the default preferences when nothing is saved', () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('merges saved preferences with defaults', () => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ theme: 'dark' }));

    expect(loadPreferences()).toEqual({
      ...DEFAULT_PREFERENCES,
      theme: 'dark',
    });
  });

  it('falls back to defaults when saved preferences are invalid JSON', () => {
    localStorage.setItem(PREFERENCES_KEY, '{not-valid-json');

    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('saves preferences and emits the preferences event', () => {
    const listener = vi.fn();
    window.addEventListener(PREFERENCES_EVENT, listener);

    const result = savePreferences({ theme: 'dark', entryOrder: 'oldest' });

    expect(result).toEqual({
      ...DEFAULT_PREFERENCES,
      theme: 'dark',
      entryOrder: 'oldest',
    });
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY))).toEqual(result);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual(result);

    window.removeEventListener(PREFERENCES_EVENT, listener);
  });

  it('resolves explicit light and dark themes directly', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('resolves system theme from matchMedia', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));
    expect(resolveTheme('system')).toBe('dark');

    window.matchMedia = vi.fn(() => ({ matches: false }));
    expect(resolveTheme('system')).toBe('light');
  });

  it('applies the resolved theme to the document', () => {
    applyTheme('dark');

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('sorts entries newest first by default and oldest when requested', () => {
    const entries = [
      { id: 'old', occurredAt: '2026-01-01T10:00:00Z' },
      { id: 'new', occurredAt: '2026-02-01T10:00:00Z' },
      { id: 'middle', occurredAt: '2026-01-15T10:00:00Z' },
    ];

    expect(sortEntries(entries, 'newest').map((entry) => entry.id)).toEqual([
      'new',
      'middle',
      'old',
    ]);
    expect(sortEntries(entries, 'oldest').map((entry) => entry.id)).toEqual([
      'old',
      'middle',
      'new',
    ]);
  });

  it('sorts projects by newest or recent activity', () => {
    const projects = [
      { id: 'a', name: 'Zulu', createdAt: '2026-01-01', updatedAt: '2026-01-10' },
      { id: 'b', name: 'Alpha', createdAt: '2026-02-01', updatedAt: '2026-02-02' },
      { id: 'c', name: 'Bravo', createdAt: '2026-01-15', updatedAt: '2026-03-01' },
    ];

    expect(sortProjects(projects, 'newest').map((project) => project.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(sortProjects(projects, 'recent').map((project) => project.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });
});
