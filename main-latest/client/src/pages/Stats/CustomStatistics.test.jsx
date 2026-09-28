import {
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomStatistics from './CustomStatistics';

const apiMocks = vi.hoisted(() => ({
  fetchCustomStatistics: vi.fn(),
  createCustomStatistic: vi.fn(),
  updateCustomStatistic: vi.fn(),
  deleteCustomStatistic: vi.fn(),
}));

vi.mock('../../api/customStatisticsApi', () => ({
  fetchCustomStatistics:
    apiMocks.fetchCustomStatistics,
  createCustomStatistic:
    apiMocks.createCustomStatistic,
  updateCustomStatistic:
    apiMocks.updateCustomStatistic,
  deleteCustomStatistic:
    apiMocks.deleteCustomStatistic,
}));

const fields = [
  {
    id: 'field-1',
    name: 'Score',
    fieldType: 'number',
  },
  {
    id: 'field-2',
    name: 'Notes',
    fieldType: 'short_text',
  },
  {
    id: 'field-3',
    name: 'Total Duration',
    fieldType: 'number',
  },
];

function expectFormattedNumber(value) {
  // Locales can insert non-breaking spaces that testing-library normalizes.
  return String(
    Number(value).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    }),
  ).replace(/\s+/g, ' ');
}

beforeEach(() => {
  vi.resetAllMocks();

  apiMocks.fetchCustomStatistics.mockResolvedValue({
    statistics: [],
  });
});

describe('CustomStatistics', () => {
  it('asks the user to select a project first', () => {
    render(
      <CustomStatistics
        projectId=""
        fields={fields}
      />,
    );

    expect(
      screen.getByText(
        'Select a project to define custom statistics.',
      ),
    ).toBeInTheDocument();

    expect(
      apiMocks.fetchCustomStatistics,
    ).not.toHaveBeenCalled();

    expect(
      screen.queryByLabelText('Name'),
    ).not.toBeInTheDocument();
  });

  it('shows the empty message when no statistics are saved', async () => {
    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    expect(
      await screen.findByText(
        'No custom statistics saved for this project yet.',
      ),
    ).toBeInTheDocument();

    expect(
      apiMocks.fetchCustomStatistics,
    ).toHaveBeenCalledWith('project-1');
  });

  it('renders saved statistics with formatted values', async () => {
    apiMocks.fetchCustomStatistics.mockResolvedValue({
      statistics: [
        {
          id: 'stat-1',
          name: 'Total score',
          expression: 'sum(Score)',
          value: 1234.5678,
        },
        {
          id: 'stat-2',
          name: 'Average score',
          expression: 'avg(Score)',
          value: null,
        },
        {
          id: 'stat-3',
          name: 'Broken metric',
          expression: 'sum(Missing)',
          error: 'Unknown field "Missing"',
        },
      ],
    });

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    expect(
      await screen.findByText('Total score'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('sum(Score)'),
    ).toBeInTheDocument();

    expect(
      screen.getByText(expectFormattedNumber(1234.5678)),
    ).toBeInTheDocument();

    expect(
      screen.getByText('No value'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Unknown field "Missing"'),
    ).toBeInTheDocument();
  });

  it('accepts a bare array response from the API', async () => {
    apiMocks.fetchCustomStatistics.mockResolvedValue([
      {
        id: 'stat-1',
        name: 'Total score',
        expression: 'sum(Score)',
        value: 60,
      },
    ]);

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    expect(
      await screen.findByText('Total score'),
    ).toBeInTheDocument();
  });

  it('shows a panel error when loading fails', async () => {
    apiMocks.fetchCustomStatistics.mockRejectedValue(
      new Error('Statistics service unavailable'),
    );

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    expect(
      await screen.findByText(
        'Statistics service unavailable',
      ),
    ).toBeInTheDocument();
  });

  it('reloads statistics when the project changes and clears the form', async () => {
    const user = userEvent.setup();

    apiMocks.fetchCustomStatistics.mockResolvedValue({
      statistics: [
        {
          id: 'stat-1',
          name: 'Total score',
          expression: 'sum(Score)',
          value: 60,
        },
      ],
    });

    const { rerender } = render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    expect(
      await screen.findByText('Total score'),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText('Name'),
      'Draft metric',
    );

    apiMocks.fetchCustomStatistics.mockResolvedValue({
      statistics: [
        {
          id: 'stat-2',
          name: 'Other metric',
          expression: 'count(Notes)',
          value: 3,
        },
      ],
    });

    rerender(
      <CustomStatistics
        projectId="project-2"
        fields={fields}
      />,
    );

    expect(
      await screen.findByText('Other metric'),
    ).toBeInTheDocument();

    expect(
      apiMocks.fetchCustomStatistics,
    ).toHaveBeenLastCalledWith('project-2');

    expect(
      screen.queryByText('Total score'),
    ).not.toBeInTheDocument();

    expect(
      screen.getByLabelText('Name'),
    ).toHaveValue('');
  });

  it('creates a statistic and appends it to the list', async () => {
    const user = userEvent.setup();

    apiMocks.createCustomStatistic.mockResolvedValue({
      id: 'stat-9',
      name: 'Training load',
      expression: 'sum(Score)',
      value: 60,
    });

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    await screen.findByText(
      'No custom statistics saved for this project yet.',
    );

    await user.type(
      screen.getByLabelText('Name'),
      'Training load',
    );

    await user.type(
      screen.getByLabelText('Expression'),
      'sum(Score)',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Save statistic',
      }),
    );

    await waitFor(() => {
      expect(
        apiMocks.createCustomStatistic,
      ).toHaveBeenCalledWith('project-1', {
        name: 'Training load',
        expression: 'sum(Score)',
      });
    });

    expect(
      await screen.findByText('Training load'),
    ).toBeInTheDocument();

    expect(screen.getByText('60')).toBeInTheDocument();

    expect(
      screen.getByLabelText('Name'),
    ).toHaveValue('');

    expect(
      screen.getByLabelText('Expression'),
    ).toHaveValue('');
  });

  it('validates the name and expression before saving', async () => {
    const user = userEvent.setup();

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    await screen.findByText(
      'No custom statistics saved for this project yet.',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Save statistic',
      }),
    );

    expect(
      screen.getByText(
        'Give your statistic a name.',
      ),
    ).toBeInTheDocument();

    expect(
      apiMocks.createCustomStatistic,
    ).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText('Name'),
      'Training load',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Save statistic',
      }),
    );

    expect(
      screen.getByText(
        'Write an expression, for example sum(Score).',
      ),
    ).toBeInTheDocument();

    expect(
      apiMocks.createCustomStatistic,
    ).not.toHaveBeenCalled();
  });

  it('shows the server error when the expression is rejected', async () => {
    const user = userEvent.setup();

    apiMocks.createCustomStatistic.mockRejectedValue(
      new Error(
        'Unsupported function "sqrt()". Use sum, avg, min, max, or count.',
      ),
    );

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    await screen.findByText(
      'No custom statistics saved for this project yet.',
    );

    await user.type(
      screen.getByLabelText('Name'),
      'Bad metric',
    );

    await user.type(
      screen.getByLabelText('Expression'),
      'sqrt(Score)',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Save statistic',
      }),
    );

    expect(
      await screen.findByText(
        /Unsupported function "sqrt\(\)"/,
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Bad metric'),
    ).not.toBeInTheDocument();
  });

  it('inserts field snippets and honours the chosen function', async () => {
    const user = userEvent.setup();

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    await screen.findByText(
      'No custom statistics saved for this project yet.',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Score',
      }),
    );

    expect(
      screen.getByLabelText('Expression'),
    ).toHaveValue('sum(Score)');

    await user.click(
      screen.getByRole('button', {
        name: 'Notes',
      }),
    );

    expect(
      screen.getByLabelText('Expression'),
    ).toHaveValue('sum(Score) count(Notes)');

    await user.click(
      screen.getByRole('button', {
        name: 'Total Duration',
      }),
    );

    expect(
      screen.getByLabelText('Expression'),
    ).toHaveValue(
      'sum(Score) count(Notes) sum("Total Duration")',
    );

    await user.selectOptions(
      screen.getByLabelText('Function'),
      'avg',
    );

    await user.clear(
      screen.getByLabelText('Expression'),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Score',
      }),
    );

    expect(
      screen.getByLabelText('Expression'),
    ).toHaveValue('avg(Score)');
  });

  it('tells the user when the project has no fields', async () => {
    render(
      <CustomStatistics
        projectId="project-1"
        fields={[]}
      />,
    );

    expect(
      await screen.findByText(
        'This project has no fields yet.',
      ),
    ).toBeInTheDocument();
  });

  it('edits an existing statistic', async () => {
    const user = userEvent.setup();

    apiMocks.fetchCustomStatistics.mockResolvedValue({
      statistics: [
        {
          id: 'stat-1',
          name: 'Total score',
          expression: 'sum(Score)',
          value: 60,
        },
      ],
    });

    apiMocks.updateCustomStatistic.mockResolvedValue({
      id: 'stat-1',
      name: 'Average score',
      expression: 'sum(Score)',
      value: 20,
    });

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Edit',
      }),
    );

    expect(
      screen.getByLabelText('Name'),
    ).toHaveValue('Total score');

    expect(
      screen.getByLabelText('Expression'),
    ).toHaveValue('sum(Score)');

    await user.clear(
      screen.getByLabelText('Name'),
    );

    await user.type(
      screen.getByLabelText('Name'),
      'Average score',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Update statistic',
      }),
    );

    await waitFor(() => {
      expect(
        apiMocks.updateCustomStatistic,
      ).toHaveBeenCalledWith('project-1', 'stat-1', {
        name: 'Average score',
        expression: 'sum(Score)',
      });
    });

    expect(
      await screen.findByText('Average score'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Total score'),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Save statistic',
      }),
    ).toBeInTheDocument();
  });

  it('cancels an edit and restores the create form', async () => {
    const user = userEvent.setup();

    apiMocks.fetchCustomStatistics.mockResolvedValue({
      statistics: [
        {
          id: 'stat-1',
          name: 'Total score',
          expression: 'sum(Score)',
          value: 60,
        },
      ],
    });

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Edit',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Cancel',
      }),
    );

    expect(
      screen.getByLabelText('Name'),
    ).toHaveValue('');

    expect(
      screen.getByLabelText('Expression'),
    ).toHaveValue('');

    expect(
      screen.getByRole('button', {
        name: 'Save statistic',
      }),
    ).toBeInTheDocument();

    expect(
      apiMocks.updateCustomStatistic,
    ).not.toHaveBeenCalled();
  });

  it('deletes a statistic', async () => {
    const user = userEvent.setup();

    apiMocks.fetchCustomStatistics.mockResolvedValue({
      statistics: [
        {
          id: 'stat-1',
          name: 'Total score',
          expression: 'sum(Score)',
          value: 60,
        },
      ],
    });

    apiMocks.deleteCustomStatistic.mockResolvedValue({
      id: 'stat-1',
    });

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => {
      expect(
        apiMocks.deleteCustomStatistic,
      ).toHaveBeenCalledWith('project-1', 'stat-1');
    });

    expect(
      screen.queryByText('Total score'),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText(
        'No custom statistics saved for this project yet.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the statistic when deleting fails', async () => {
    const user = userEvent.setup();

    apiMocks.fetchCustomStatistics.mockResolvedValue({
      statistics: [
        {
          id: 'stat-1',
          name: 'Total score',
          expression: 'sum(Score)',
          value: 60,
        },
      ],
    });

    apiMocks.deleteCustomStatistic.mockRejectedValue(
      new Error('Unable to reach the server'),
    );

    render(
      <CustomStatistics
        projectId="project-1"
        fields={fields}
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Delete',
      }),
    );

    expect(
      await screen.findByText(
        'Unable to reach the server',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Total score'),
    ).toBeInTheDocument();
  });
});
