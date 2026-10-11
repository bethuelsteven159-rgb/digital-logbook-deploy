// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const hookMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  dismiss: vi.fn(),
}));

let hookState;

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => hookState,
}));

import NotificationsBell from './NotificationsBell';

const unreadFeed = {
  notifications: [
    {
      key: 'entry_overdue:e1',
      type: 'entry_overdue',
      severity: 'high',
      title: 'Lab report is overdue',
      projectName: 'Cyber Security',
      projectId: 'p1',
      dueAt: '2026-10-05T09:00:00.000Z',
      readAt: null,
    },
    {
      key: 'weekly_summary:2026-W41',
      type: 'weekly_summary',
      severity: 'info',
      title: 'Your week so far',
      body: '',
      minutes: 270,
      entries: 5,
      completed: 2,
      readAt: '2026-10-07T06:00:00.000Z',
    },
  ],
  unreadCount: 1,
  counts: { overdue: 1, dueToday: 0, dueTomorrow: 0 },
  loading: false,
  error: '',
};

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationsBell collapsed={false} />
    </MemoryRouter>,
  );
}

describe('NotificationsBell', () => {
  beforeEach(() => {
    hookState = {
      ...unreadFeed,
      ...hookMocks,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the unread badge count', () => {
    renderBell();

    expect(screen.getByRole('button', { name: /1 unread/i })).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('hides the badge when everything is read', () => {
    hookState = {
      ...hookState,
      unreadCount: 0,
      notifications: unreadFeed.notifications.map((n) => ({
        ...n,
        readAt: '2026-10-07T06:00:00.000Z',
      })),
    };

    renderBell();

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('opens the dropdown and lists the feed with descriptions', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Lab report is overdue')).toBeInTheDocument();
    expect(screen.getByText(/Cyber Security · Due/i)).toBeInTheDocument();
    expect(screen.getByText(/4h 30m across 5 entries · 2 completed/)).toBeInTheDocument();
  });

  it('marks a notification read and reports the dismissed state', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await user.click(await screen.findByText('Lab report is overdue'));

    expect(hookMocks.markRead).toHaveBeenCalledWith('entry_overdue:e1');
  });

  it('dismiss removes the item through the shared hook', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await user.click(
      await screen.findByRole('button', { name: /dismiss lab report is overdue/i }),
    );

    expect(hookMocks.dismiss).toHaveBeenCalledWith('entry_overdue:e1');
  });

  it('mark all read fans out to the hook', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await user.click(await screen.findByRole('button', { name: 'Mark all read' }));

    expect(hookMocks.markAllRead).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state for a caught-up user', async () => {
    hookState = {
      ...hookState,
      notifications: [],
      unreadCount: 0,
    };

    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  });

  it('surfaces load errors inside the dropdown', async () => {
    hookState = {
      ...hookState,
      error: 'Could not load notifications.',
      notifications: [],
      unreadCount: 0,
    };

    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText('Could not load notifications.')).toBeInTheDocument();
  });

  it('closes the dropdown from the backdrop', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(await screen.findByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

    await waitFor(() => user.click(document.querySelector('.notif-backdrop')));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    });
  });
});
