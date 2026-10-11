// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const hookMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  dismiss: vi.fn(),
}));

let hookState;

vi.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => hookState,
}));

import NotificationsPanel from './NotificationsPanel';

const feed = {
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
      key: 'entry_due_today:e2',
      type: 'entry_due_today',
      severity: 'warning',
      title: 'Design review is due today',
      projectName: 'Thesis',
      projectId: 'p2',
      dueAt: '2026-10-07T15:00:00.000Z',
      readAt: '2026-10-07T06:00:00.000Z',
    },
    {
      key: 'weekly_summary:2026-W41',
      type: 'weekly_summary',
      severity: 'info',
      title: 'Your week so far',
      minutes: 270,
      entries: 5,
      completed: 2,
      projects: 2,
      readAt: null,
    },
  ],
  unreadCount: 2,
  counts: { overdue: 1, dueToday: 1, dueTomorrow: 0 },
  loading: false,
  error: '',
};

function ProjectDestination() {
  return <div>Project destination</div>;
}

function renderPanel() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<NotificationsPanel />} />
        <Route path="/projects/:id" element={<ProjectDestination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NotificationsPanel', () => {
  beforeEach(() => {
    hookState = {
      ...feed,
      ...hookMocks,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lists the feed with type labels and detail lines', () => {
    renderPanel();

    expect(
      screen.getByRole('heading', { name: 'Notifications' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Lab report is overdue')).toBeInTheDocument();
    expect(screen.getByText('Design review is due today')).toBeInTheDocument();
    expect(screen.getByText('Your week so far')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByText(/Cyber Security · Due/i)).toBeInTheDocument();
    expect(
      screen.getByText(/4h 30m across 5 entries · 2 completed/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Across 2 projects · 4h 30m logged/),
    ).toBeInTheDocument();
  });

  it('summarises the due buckets as pills', () => {
    renderPanel();

    expect(screen.getByText('1 overdue')).toBeInTheDocument();
    expect(screen.getByText('1 due today')).toBeInTheDocument();
    expect(
      screen.queryByText(/due tomorrow/i),
    ).not.toBeInTheDocument();
  });

  it('shows the unread count and marks everything read', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByText('2 unread')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark all read' }));

    expect(hookMocks.markAllRead).toHaveBeenCalled();
  });

  it('toggles the unread-only filter on and off', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole('button', { name: 'Show unread only' }),
    );

    expect(
      screen.getByRole('button', { name: 'Showing unread' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Design review is due today'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Lab report is overdue')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Showing unread' }));

    expect(screen.getByText('Design review is due today')).toBeInTheDocument();
  });

  it('marks unread items read and navigates to the project', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByText('Lab report is overdue'));

    expect(hookMocks.markRead).toHaveBeenCalledWith('entry_overdue:e1');
    expect(screen.getByText('Project destination')).toBeInTheDocument();
  });

  it('keeps read items read and still navigates', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByText('Design review is due today'));

    expect(hookMocks.markRead).not.toHaveBeenCalled();
    expect(screen.getByText('Project destination')).toBeInTheDocument();
  });

  it('dismisses an item through the shared hook', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole('button', { name: /dismiss your week so far/i }),
    );

    expect(hookMocks.dismiss).toHaveBeenCalledWith('weekly_summary:2026-W41');
  });

  it('refreshes the feed on demand', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole('button', { name: 'Refresh notifications' }),
    );

    expect(hookMocks.refresh).toHaveBeenCalled();
  });

  it('shows the error banner above the last-known feed', () => {
    hookState = {
      ...hookState,
      error: 'Could not load notifications.',
    };

    renderPanel();

    expect(screen.getByText('Could not load notifications.')).toBeInTheDocument();
    // the feed stays visible so transient errors do not blank the panel
    expect(screen.getByText('Lab report is overdue')).toBeInTheDocument();
    expect(
      screen.queryByText("You're all caught up — nothing needs your attention."),
    ).not.toBeInTheDocument();
  });

  it('shows a loading state before the first feed arrives', () => {
    hookState = {
      ...hookState,
      loading: true,
      notifications: [],
      unreadCount: 0,
      counts: { overdue: 0, dueToday: 0, dueTomorrow: 0 },
    };

    renderPanel();

    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

  it('shows the all-caught-up empty state', () => {
    hookState = {
      ...hookState,
      notifications: [],
      unreadCount: 0,
      counts: { overdue: 0, dueToday: 0, dueTomorrow: 0 },
    };

    renderPanel();

    expect(
      screen.getByText("You're all caught up — nothing needs your attention."),
    ).toBeInTheDocument();
  });

  it('shows a distinct empty state when the unread filter hides everything', async () => {
    const user = userEvent.setup();

    hookState = {
      ...hookState,
      notifications: feed.notifications.map((n) => ({
        ...n,
        readAt: '2026-10-07T06:00:00.000Z',
      })),
      unreadCount: 0,
      counts: { overdue: 0, dueToday: 0, dueTomorrow: 0 },
    };

    renderPanel();

    await user.click(
      screen.getByRole('button', { name: 'Show unread only' }),
    );

    expect(screen.getByText('No unread notifications.')).toBeInTheDocument();
  });
});
