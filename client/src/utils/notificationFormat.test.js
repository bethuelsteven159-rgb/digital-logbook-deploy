import { getNotificationTarget } from './notificationFormat';

describe('getNotificationTarget', () => {
  it('deep-links entry notifications to the entry anchor', () => {
    expect(
      getNotificationTarget({
        type: 'entry_overdue',
        projectId: 'p1',
        entryId: 'e1',
      }),
    ).toBe('/projects/p1#entry-e1');
  });

  it('links project-level notifications to the project page', () => {
    expect(
      getNotificationTarget({
        type: 'recurring_pending',
        projectId: 'p2',
      }),
    ).toBe('/projects/p2');
  });

  it('returns null for the weekly summary, which has no destination', () => {
    expect(
      getNotificationTarget({
        type: 'weekly_summary',
        minutes: 270,
      }),
    ).toBeNull();
  });

  it('returns null for missing or malformed notifications', () => {
    expect(getNotificationTarget(null)).toBeNull();
    expect(getNotificationTarget(undefined)).toBeNull();
    expect(getNotificationTarget({})).toBeNull();
  });

  it('returns null when an entryId has no projectId to anchor to', () => {
    expect(getNotificationTarget({ entryId: 'e1' })).toBeNull();
  });
});
