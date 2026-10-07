import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationsApi';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function requestAt(fetchMock, index = 0) {
  const [url, options] = fetchMock.mock.calls[index];
  return { url, options };
}

describe('notificationsApi', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'test-token');
    vi.restoreAllMocks();
  });

  it('fetches the feed with the browser timezone and auth header', async () => {
    const feed = {
      notifications: [{ key: 'entry_overdue:e1', severity: 'high' }],
      unreadCount: 1,
      counts: { overdue: 1, dueToday: 0, dueTomorrow: 0 },
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(feed));

    const result = await fetchNotifications();
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/notifications\?timezone=/);
    expect(decodeURIComponent(url)).toMatch(/timezone=/);
    expect(options.headers.Authorization).toBe('Bearer test-token');
    expect(result).toEqual(feed);
  });

  it('marks a single notification as read', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ key: 'entry_overdue:e1' }));

    const result = await markNotificationRead('entry_overdue:e1');
    const { url, options } = requestAt(fetchMock);

    expect(decodeURIComponent(url)).toMatch(/\/api\/notifications\/entry_overdue:e1\/read$/);
    expect(options.method).toBe('POST');
    expect(result).toEqual({ key: 'entry_overdue:e1' });
  });

  it('encodes notification keys so slashes cannot escape the path', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ key: 'project_stale:p1:2026-10' }));

    await dismissNotification('project_stale:p1:2026-10');
    const { url, options } = requestAt(fetchMock);

    expect(decodeURIComponent(url)).toMatch(
      /\/api\/notifications\/project_stale:p1:2026-10\/dismiss$/,
    );
    expect(options.method).toBe('POST');
  });

  it('marks everything as read through read-all', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ updated: 4 }));

    const result = await markAllNotificationsRead();
    const { url, options } = requestAt(fetchMock);

    expect(url).toMatch(/\/api\/notifications\/read-all\?timezone=/);
    expect(options.method).toBe('POST');
    expect(result).toEqual({ updated: 4 });
  });

  it('throws a 401-shaped error when there is no token', async () => {
    localStorage.removeItem('authToken');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(fetchNotifications()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces the server error message on failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: 'Failed to load notifications' }, 500),
    );

    await expect(fetchNotifications()).rejects.toThrow(
      'Failed to load notifications',
    );
  });

  it('rejects calls that are missing a notification key', async () => {
    await expect(markNotificationRead('')).rejects.toThrow(
      'Notification key is required.',
    );
    await expect(dismissNotification(null)).rejects.toThrow(
      'Notification key is required.',
    );
  });
});
