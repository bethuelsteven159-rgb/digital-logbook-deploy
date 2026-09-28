import {
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarView from './CalendarView';

const now = new Date();

const currentMonthStart = new Date(
  now.getFullYear(),
  now.getMonth(),
  1,
);

const nextMonthStart = new Date(
  now.getFullYear(),
  now.getMonth() + 1,
  1,
);

const previousMonthStart = new Date(
  now.getFullYear(),
  now.getMonth() - 1,
  1,
);

function monthLabel(date) {
  return new Intl.DateTimeFormat('en-ZA', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

// Built from local date parts so the calendar day cell is timezone-independent.
function entryOn(date, overrides = {}) {
  return {
    id: `entry-${date.getMonth()}-${date.getDate()}`,
    name: 'Logged entry',
    durationMinutes: 0,
    occurredAt: date.toISOString(),
    ...overrides,
  };
}

function dayInMonth(monthStart, day) {
  return new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    day,
    9,
    0,
    0,
  );
}

function cellForDay(day) {
  return screen
    .getByText(String(day), {
      selector: '.calendar-day-number',
    })
    .closest('.calendar-cell');
}

function formatLoggedTime(minutes = 0) {
  return `${minutes} min`;
}

describe('CalendarView', () => {
  it('renders the current month with weekday headers and full weeks', () => {
    const { container } = render(
      <CalendarView
        entries={[]}
        formatLoggedTime={formatLoggedTime}
      />,
    );

    expect(
      screen.getByText(monthLabel(currentMonthStart)),
    ).toBeInTheDocument();

    for (const weekday of [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ]) {
      expect(
        screen.getByText(weekday),
      ).toBeInTheDocument();
    }

    const cells = container.querySelectorAll(
      '.calendar-grid:not(.calendar-weekdays) .calendar-cell',
    );

    expect(cells.length % 7).toBe(0);
    expect(cells.length).toBeGreaterThanOrEqual(28);
  });

  it('places each entry in its own day cell', () => {
    const firstEntry = entryOn(dayInMonth(currentMonthStart, 5), {
      id: 'entry-5a',
      name: 'Morning practice',
      durationMinutes: 60,
    });

    const secondEntry = entryOn(dayInMonth(currentMonthStart, 5), {
      id: 'entry-5b',
      name: 'Evening review',
      durationMinutes: 30,
    });

    const thirdEntry = entryOn(dayInMonth(currentMonthStart, 20), {
      id: 'entry-20',
      name: 'Long session',
      durationMinutes: 125,
    });

    render(
      <CalendarView
        entries={[firstEntry, secondEntry, thirdEntry]}
        formatLoggedTime={formatLoggedTime}
      />,
    );

    const dayFive = cellForDay(5);

    expect(
      within(dayFive).getByText('Morning practice'),
    ).toBeInTheDocument();

    expect(
      within(dayFive).getByText('Evening review'),
    ).toBeInTheDocument();

    expect(
      within(dayFive).getByText('60 min'),
    ).toBeInTheDocument();

    expect(
      within(dayFive).queryByText('Long session'),
    ).not.toBeInTheDocument();

    const dayTwenty = cellForDay(20);

    expect(
      within(dayTwenty).getByText('Long session'),
    ).toBeInTheDocument();

    expect(
      within(dayTwenty).getByText('125 min'),
    ).toBeInTheDocument();
  });

  it('falls back to the created date and skips undated entries', () => {
    const createdOnly = {
      id: 'entry-created',
      name: 'Created today',
      durationMinutes: 15,
      createdAt: dayInMonth(
        currentMonthStart,
        now.getDate(),
      ).toISOString(),
    };

    const undated = {
      id: 'entry-undated',
      name: 'Undated entry',
      durationMinutes: 15,
    };

    render(
      <CalendarView
        entries={[createdOnly, undated]}
        formatLoggedTime={formatLoggedTime}
      />,
    );

    expect(
      within(cellForDay(now.getDate())).getByText(
        'Created today',
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Undated entry'),
    ).not.toBeInTheDocument();
  });

  it('keeps entries from other months out of the current grid', () => {
    const thisMonth = entryOn(
      dayInMonth(currentMonthStart, 10),
      {
        name: 'This month entry',
      },
    );

    const nextMonth = entryOn(
      dayInMonth(nextMonthStart, 10),
      {
        id: 'entry-next',
        name: 'Next month entry',
      },
    );

    const previousMonth = entryOn(
      dayInMonth(previousMonthStart, 10),
      {
        id: 'entry-previous',
        name: 'Previous month entry',
      },
    );

    render(
      <CalendarView
        entries={[thisMonth, nextMonth, previousMonth]}
        formatLoggedTime={formatLoggedTime}
      />,
    );

    expect(
      screen.getByText('This month entry'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Next month entry'),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Previous month entry'),
    ).not.toBeInTheDocument();
  });

  it('navigates to the next and previous months', async () => {
    const user = userEvent.setup();

    const thisMonth = entryOn(
      dayInMonth(currentMonthStart, 10),
      {
        name: 'This month entry',
      },
    );

    const nextMonth = entryOn(
      dayInMonth(nextMonthStart, 10),
      {
        id: 'entry-next',
        name: 'Next month entry',
      },
    );

    render(
      <CalendarView
        entries={[thisMonth, nextMonth]}
        formatLoggedTime={formatLoggedTime}
      />,
    );

    expect(
      screen.getByText(monthLabel(currentMonthStart)),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Next' }),
    );

    expect(
      screen.getByText(monthLabel(nextMonthStart)),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Next month entry'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('This month entry'),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Previous',
      }),
    );

    expect(
      screen.getByText(monthLabel(currentMonthStart)),
    ).toBeInTheDocument();

    expect(
      screen.getByText('This month entry'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Previous',
      }),
    );

    expect(
      screen.getByText(monthLabel(previousMonthStart)),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('This month entry'),
    ).not.toBeInTheDocument();
  });

  it('shows linked entries on the calendar card', () => {
    const linked = entryOn(dayInMonth(currentMonthStart, 12), {
      name: 'Follow-up session',
      linkedEntries: [
        { id: 'entry-1', name: 'Earlier session' },
      ],
    });

    render(
      <CalendarView
        entries={[linked]}
        formatLoggedTime={formatLoggedTime}
      />,
    );

    expect(
      screen.getByText('Linked: Earlier session'),
    ).toBeInTheDocument();
  });
});
