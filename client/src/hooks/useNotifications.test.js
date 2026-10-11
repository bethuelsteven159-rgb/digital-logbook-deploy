// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  dismissNotification: vi.fn(),
}));

vi.mock('../api/notificationsApi', () => ({
  fetchNotifications: apiMocks.fetchNotifications,
  markNotificationRead: apiMocks.markNotificationRead,
  markAllNotificationsRead: apiMocks.markAllNotificationsRead,
  dismissNotification: apiMocks.dismissNotification,
}));

import {
  __resetNotificationsStore,
  useNotifications,
} from './useNotifications';

const feed = {
  notifications: [
    {
      key: 'entry_overdue:e1',
      type: 'entry_overdue',
      severity: 'high',
      title: 'Lab report is overdue',
      readAt: null,
    },
    {
      key: 'entry_due_today:e2',
      type: 'entry_due_today',
      severity: 'warning',
      title: 'Quiz is due today',
      readAt: '2026-10-07T06:00:00.000Z',
    },
  ],
  unreadCount: 1,
  counts: { overdue: 1, dueToday: 0, dueTomorrow: 0 },
  generatedAt: '2026-10-07T08:00:00.000Z',
};

describe('useNotifications', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('authToken', 'test-token');
    vi.clearAllMocks();
    __resetNotificationsStore();
    apiMocks.fetchNotifications.mockResolvedValue(feed);
    apiMocks.markNotificationRead.mockResolvedValue({});
    apiMocks.markAllNotificationsRead.mockResolvedValue({ updated: 1 });
    apiMocks.dismissNotification.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    __resetNotificationsStore();
  });

  it('loads the shared feed on mount', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    expect(apiMocks.fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it('shares one fetch across multiple consumers', async () => {
    // Mount both consumers before the first request settles so the
    // second one rides the same in-flight promise.
    const first = renderHook(() => useNotifications());
    const second = renderHook(() => useNotifications());

    await waitFor(() => expect(first.result.current.loading).toBe(false));

    expect(second.result.current.notifications).toHaveLength(2);
    expect(apiMocks.fetchNotifications).toHaveBeenCalledTimes(1);
  });

  it('keeps the last feed when the request fails', async () => {
    apiMocks.fetchNotifications.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('offline');
  });

  it('stays silent about 401s (no session yet)', async () => {
    apiMocks.fetchNotifications.mockRejectedValue(
      Object.assign(new Error('Authentication required'), { status: 401 }),
    );

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('');
  });

  it('optimistically marks a notification read and drops the unread count', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.markRead('entry_overdue:e1'));

    expect(result.current.unreadCount).toBe(0);
    expect(
      result.current.notifications.find((n) => n.key === 'entry_overdue:e1').readAt,
    ).toBeTruthy();
    expect(apiMocks.markNotificationRead).toHaveBeenCalledWith('entry_overdue:e1');
  });

  it('marks everything read and resets the unread count', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.markAllRead());

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.readAt)).toBe(true);
    expect(apiMocks.markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  it('dismiss removes the notification immediately', async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.dismiss('entry_overdue:e1'));

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].key).toBe('entry_due_today:e2');
    expect(apiMocks.dismissNotification).toHaveBeenCalledWith('entry_overdue:e1');
  });

  it('resyncs from the server when marking read fails', async () => {
    apiMocks.markNotificationRead.mockRejectedValue(new Error('write failed'));

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.markRead('entry_overdue:e1'));

    await waitFor(() =>
      expect(apiMocks.fetchNotifications.mock.calls.length).toBeGreaterThan(1),
    );
  });
});
