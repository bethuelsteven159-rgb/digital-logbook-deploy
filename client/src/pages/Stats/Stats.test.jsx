import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Stats from './Stats';

const apiMocks = vi.hoisted(() => ({
  fetchProjects: vi.fn(),
  fetchProjectDetails: vi.fn(),
  fetchStatistics: vi.fn(),
  fetchActivityStats: vi.fn(),
  fetchCustomStatistics: vi.fn(),
}));

vi.mock('../../api/projectsApi', () => ({
  fetchProjects: apiMocks.fetchProjects,
}));

vi.mock('../../api/projectDetailsApi', () => ({
  fetchProjectDetails:
    apiMocks.fetchProjectDetails,
}));

vi.mock('../../api/statsApi', () => ({
  fetchStatistics: apiMocks.fetchStatistics,
  fetchActivityStats:
    apiMocks.fetchActivityStats,
}));

vi.mock('../../api/customStatisticsApi', () => ({
  fetchCustomStatistics:
    apiMocks.fetchCustomStatistics,
}));

vi.mock('../../components/Sidebar', () => ({
  default: () => null,
}));

const project = {
  id: 'project-1',
  name: 'Cyber Security',
};

const projectFields = [
  {
    id: 'field-1',
    name: 'Category',
    fieldType: 'short_text',
  },
  {
    id: 'field-2',
    name: 'Hours planned',
    fieldType: 'number',
  },
  {
    id: 'field-3',
    name: 'Hours actual',
    fieldType: 'number',
  },
];

const activityFixture = {
  range: { days: 30, timezone: 'UTC' },
  daily: [
    { date: '2026-10-06', minutes: 90, entries: 1 },
  ],
  weekdays: [
    'Sun',
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
  ].map((label, index) => ({
    weekday: index,
    label,
    minutes: index === 3 ? 150 : 0,
    entries: index === 3 ? 2 : 0,
  })),
  projects: [
    {
      projectId: 'project-1',
      name: 'Cyber Security',
      minutes: 120,
      entries: 2,
    },
    {
      projectId: 'project-2',
      name: 'Thesis',
      minutes: 45,
      entries: 1,
    },
  ],
  totals: { minutes: 165, entries: 3 },
};

beforeEach(() => {
  vi.resetAllMocks();

  apiMocks.fetchProjects.mockResolvedValue([
    project,
  ]);

  apiMocks.fetchProjectDetails.mockResolvedValue({
    entries: [
      {
        id: 'entry-1',
        name: 'Lab session',
        durationMinutes: 60,
        occurredAt: '2026-10-06T10:00:00Z',
      },
    ],
    fields: projectFields,
  });

  apiMocks.fetchActivityStats.mockResolvedValue(
    activityFixture,
  );

  apiMocks.fetchCustomStatistics.mockResolvedValue({
    statistics: [],
  });
});

describe('Stats page activity charts', () => {
  it('renders the line, bar and donut charts from the activity endpoint', async () => {
    render(<Stats />);

    expect(
      await screen.findByRole('img', {
        name: 'Minutes logged per day over the last 30 days',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('img', {
        name: 'Minutes logged by weekday',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('img', {
        name: 'Minutes logged by project',
      }),
    ).toBeInTheDocument();

    // Donut legend shows both projects
    expect(
      screen.getAllByText('Cyber Security')
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText('Thesis'),
    ).toBeInTheDocument();

    // Totals strip: 165 minutes = 2h 45m; the donut centre shows the same total
    expect(
      screen.getAllByText('2h 45m'),
    ).toHaveLength(2);
  });

  it('refetches the activity data when the range changes', async () => {
    const user = userEvent.setup();

    render(<Stats />);

    await screen.findByRole('img', {
      name: 'Minutes logged by weekday',
    });

    await user.click(
      screen.getByRole('button', {
        name: '7d',
      }),
    );

    await waitFor(() => {
      expect(
        apiMocks.fetchActivityStats,
      ).toHaveBeenLastCalledWith({ days: 7 });
    });

    expect(
      await screen.findByRole('img', {
        name: 'Minutes logged per day over the last 7 days',
      }),
    ).toBeInTheDocument();
  });

  it('shows the empty message when there is no activity in range', async () => {
    apiMocks.fetchActivityStats.mockResolvedValue({
      ...activityFixture,
      daily: [],
      projects: [],
      totals: { minutes: 0, entries: 0 },
    });

    render(<Stats />);

    expect(
      await screen.findByText(
        /No activity in the last 30 days yet/,
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('img', {
        name: 'Minutes logged by project',
      }),
    ).not.toBeInTheDocument();
  });

  it('surfaces activity load errors', async () => {
    apiMocks.fetchActivityStats.mockRejectedValue(
      new Error('Network down'),
    );

    render(<Stats />);

    expect(
      await screen.findByText('Network down'),
    ).toBeInTheDocument();
  });
});

describe('Stats page field statistics', () => {
  it('charts grouped results with a donut and keeps the value rows', async () => {
    const user = userEvent.setup();

    apiMocks.fetchStatistics.mockResolvedValue({
      groups: [
        { value: 'Lecture', count: 5 },
        { value: 'Lab', count: 2 },
      ],
    });

    render(<Stats />);

    await screen.findByRole('img', {
      name: 'Minutes logged by weekday',
    });

    await user.selectOptions(
      screen.getByLabelText('Field'),
      'field-1',
    );

    await user.selectOptions(
      screen.getByLabelText('Operation'),
      'group',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Show Statistics',
      }),
    );

    expect(
      await screen.findByRole('img', {
        name: 'Entries grouped by field value',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText('Lecture').length,
    ).toBeGreaterThan(0);
  });

  it('charts plot results as bars and compare results as a scatter plot', async () => {
    const user = userEvent.setup();

    apiMocks.fetchStatistics.mockResolvedValue({
      data: [{ label: 'Mon', value: 30 }],
      fields: [
        { name: 'Hours planned' },
        { name: 'Hours actual' },
      ],
      first: { total: 6, average: 2 },
      second: { total: 9, average: 3 },
      entriesCompared: 3,
      points: [
        { x: 2, y: 3 },
        { x: 4, y: 6 },
      ],
    });

    render(<Stats />);

    await screen.findByRole('img', {
      name: 'Minutes logged by weekday',
    });

    await user.selectOptions(
      screen.getByLabelText('Field'),
      'field-2',
    );

    await user.selectOptions(
      screen.getByLabelText('Operation'),
      'plot',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Show Statistics',
      }),
    );

    expect(
      await screen.findByRole('img', {
        name: 'Field values per entry',
      }),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText('Operation'),
      'compare',
    );

    await user.selectOptions(
      screen.getByLabelText('Compare with'),
      'field-3',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Show Statistics',
      }),
    );

    expect(
      await screen.findByRole('img', {
        name: 'Compared field values per entry',
      }),
    ).toBeInTheDocument();
  });
});
