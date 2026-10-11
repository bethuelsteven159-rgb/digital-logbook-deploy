// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const hookMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  dismiss: vi.fn(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

let hookState;

vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => hookState,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

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
      entryId: 'e1',
      dueAt: '2026-10-05T09:00:00.000Z',
      readAt: null,
    },
    {
      key: 'recurring_pending:p2',
      type: 'recurring_pending',
      severity: 'info',
      title: 'Standup series needs the next entry',
      projectName: 'Cyber Security',
      projectId: 'p2',
      body: 'Next occurrence is ready to generate.',
      readAt: '2026-10-07T06:00:00.000Z',
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

  it('renders the dropdown in a portal attached to document.body', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });

    // The sidebar is a scroll container, so the dropdown must live outside it
    // to avoid being clipped.
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.closest('.notif-bell-wrap')).toBeNull();
    expect(document.querySelector('.notif-backdrop').parentElement).toBe(document.body);
  });

  it('positions the dropdown relative to the bell on open', async () => {
    const user = userEvent.setup();
    renderBell();

    const wrap = document.querySelector('.notif-bell-wrap');
    wrap.getBoundingClientRect = () => ({ right: 250, bottom: 450 });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });

    // left = rect.right + 14, bottom = viewport height - rect.bottom,
    // maxHeight keeps the panel between the viewport top and the bell.
    expect(dialog.style.left).toBe('264px');
    expect(dialog.style.bottom).toBe('318px');
    expect(dialog.style.maxHeight).toBe('434px');
  });

  it('clamps the dropdown inside the viewport near the right edge', async () => {
    const user = userEvent.setup();
    renderBell();

    const wrap = document.querySelector('.notif-bell-wrap');
    wrap.getBoundingClientRect = () => ({ right: 1000, bottom: 300 });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });

    expect(dialog.style.left).toBe('636px');
    expect(dialog.style.bottom).toBe('468px');
  });

  it('opens below the bell when there is no room above it', async () => {
    const user = userEvent.setup();
    renderBell();

    const wrap = document.querySelector('.notif-bell-wrap');
    wrap.getBoundingClientRect = () => ({ right: 250, top: 20, bottom: 70 });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });

    expect(dialog.style.top).toBe('78px');
    expect(dialog.style.bottom).toBe('');
    expect(dialog.style.maxHeight).toBe('480px');
  });

  it('repositions the dropdown on window resize and scroll', async () => {
    const user = userEvent.setup();
    renderBell();

    const wrap = document.querySelector('.notif-bell-wrap');
    wrap.getBoundingClientRect = () => ({ right: 250, bottom: 450 });

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const dialog = await screen.findByRole('dialog', { name: 'Notifications' });
    expect(dialog.style.left).toBe('264px');

    wrap.getBoundingClientRect = () => ({ right: 500, bottom: 450 });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(dialog.style.left).toBe('514px');

    wrap.getBoundingClientRect = () => ({ right: 700, bottom: 450 });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(dialog.style.left).toBe('636px');
  });

  it('marks a notification read and reports the dismissed state', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await user.click(await screen.findByText('Lab report is overdue'));

    expect(hookMocks.markRead).toHaveBeenCalledWith('entry_overdue:e1');
  });

  it('navigates entry notifications to the entry anchor', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const item = await screen.findByText('Lab report is overdue');
    expect(item.closest('button')).not.toBeNull();

    await user.click(item);

    expect(hookMocks.markRead).toHaveBeenCalledWith('entry_overdue:e1');
    expect(navigateMock).toHaveBeenCalledWith('/projects/p1#entry-e1');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    });
  });

  it('navigates project-level notifications without re-marking them read', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await user.click(await screen.findByText('Standup series needs the next entry'));

    expect(hookMocks.markRead).not.toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('/projects/p2');
  });

  it('renders informational notifications without a navigation affordance', async () => {
    hookState = {
      ...hookState,
      unreadCount: 2,
      notifications: hookState.notifications.map((n) =>
        n.type === 'weekly_summary' ? { ...n, readAt: null } : n,
      ),
    };

    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    const title = await screen.findByText('Your week so far');

    // No destination => static text, not a button, and clicking does nothing.
    expect(title.closest('button')).toBeNull();
    expect(
      screen.getByRole('button', { name: /dismiss your week so far/i }),
    ).toBeInTheDocument();

    await user.click(title);

    expect(hookMocks.markRead).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('opens from the keyboard, traps Tab and restores focus on Escape', async () => {
    const user = userEvent.setup();
    renderBell();

    const bell = screen.getByRole('button', { name: /notifications/i });
    bell.focus();
    await user.keyboard('{Enter}');

    await screen.findByRole('dialog', { name: 'Notifications' });
    expect(screen.getByRole('button', { name: 'Mark all read' })).toHaveFocus();

    await user.tab({ shift: true });
    expect(
      screen.getByRole('button', { name: /dismiss your week so far/i }),
    ).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Mark all read' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(bell).toHaveFocus();
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
