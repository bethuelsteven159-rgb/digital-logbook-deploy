import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BoardView from './BoardView';

const statusField = { id: 'field-status', name: 'Status' };
const priorityField = { id: 'field-priority', name: 'Priority' };
const formatLoggedTime = (minutes) => `${minutes} min`;

function entryWith(id, name, values) {
  return { id, name, durationMinutes: 30, values };
}

const entries = [
  entryWith('entry-1', 'Scales practice', [
    { fieldId: 'field-status', name: 'Status', type: 'short_text', value: 'To Do' },
    { fieldId: 'field-priority', name: 'Priority', type: 'short_text', value: 'High' },
  ]),
  entryWith('entry-2', 'Chord theory', [
    { fieldId: 'field-status', name: 'Status', type: 'short_text', value: 'Done' },
    { fieldId: 'field-priority', name: 'Priority', type: 'short_text', value: 'Low' },
  ]),
  entryWith('entry-3', 'Sight reading', [
    { fieldId: 'field-status', name: 'Status', type: 'short_text', value: 'To Do' },
    { fieldId: 'field-priority', name: 'Priority', type: 'short_text', value: 'High' },
  ]),
  entryWith('entry-4', 'Repertoire review', []),
];

function renderBoard(overrides = {}) {
  return render(
    <BoardView
      entries={entries}
      fields={[statusField, priorityField]}
      formatLoggedTime={formatLoggedTime}
      {...overrides}
    />,
  );
}

describe('BoardView', () => {
  it('groups entries by the default field with counts and no lost or duplicated entries', () => {
    const { container } = renderBoard();

    expect(screen.getByLabelText('Group entries by')).toHaveValue('field-status');

    const columns = container.querySelectorAll('.board-column');
    expect(columns).toHaveLength(3);
    expect(within(columns[0]).getByText('To Do')).toBeInTheDocument();
    expect(within(columns[0]).getByText('2')).toBeInTheDocument();
    expect(within(columns[1]).getByText('Done')).toBeInTheDocument();
    expect(within(columns[1]).getByText('1')).toBeInTheDocument();
    expect(within(columns[2]).getByText('Unassigned')).toBeInTheDocument();
    expect(within(columns[2]).getByText('1')).toBeInTheDocument();
    expect(container.querySelectorAll('.board-card')).toHaveLength(4);
  });

  it('recalculates the groups when the grouping field is switched', async () => {
    const user = userEvent.setup();
    const { container } = renderBoard();

    await user.selectOptions(
      screen.getByLabelText('Group entries by'),
      'field-priority',
    );

    const columns = container.querySelectorAll('.board-column');
    expect(columns).toHaveLength(3);
    expect(within(columns[0]).getByText('High')).toBeInTheDocument();
    expect(within(columns[0]).getByText('2')).toBeInTheDocument();
    expect(within(columns[1]).getByText('Low')).toBeInTheDocument();
    expect(within(columns[1]).getByText('1')).toBeInTheDocument();
    expect(within(columns[2]).getByText('Unassigned')).toBeInTheDocument();
    expect(container.querySelectorAll('.board-card')).toHaveLength(4);
  });

  it('reflects the latest grouped value after an entry update', () => {
    const { container, rerender } = renderBoard();

    const doneColumn = () =>
      Array.from(container.querySelectorAll('.board-column')).find((column) =>
        within(column).queryByText('Done'),
      );
    expect(within(doneColumn()).queryAllByText('Scales practice')).toHaveLength(0);

    const updated = entries.map((entry) =>
      entry.id === 'entry-1'
        ? entryWith('entry-1', 'Scales practice', [
            { fieldId: 'field-status', name: 'Status', type: 'short_text', value: 'Done' },
            { fieldId: 'field-priority', name: 'Priority', type: 'short_text', value: 'High' },
          ])
        : entry,
    );
    rerender(
      <BoardView
        entries={updated}
        fields={[statusField, priorityField]}
        formatLoggedTime={formatLoggedTime}
      />,
    );

    const columns = container.querySelectorAll('.board-column');
    expect(within(columns[0]).getByText('Done')).toBeInTheDocument();
    expect(within(columns[0]).getByText('2')).toBeInTheDocument();
    expect(within(columns[0]).getByText('Scales practice')).toBeInTheDocument();
    expect(within(columns[1]).getByText('To Do')).toBeInTheDocument();
    expect(within(columns[1]).getByText('1')).toBeInTheDocument();
    expect(within(columns[2]).getByText('Unassigned')).toBeInTheDocument();
    expect(container.querySelectorAll('.board-card')).toHaveLength(4);
  });

  it('falls back to the first remaining field when the selected field disappears', () => {
    const { rerender, container } = renderBoard();

    expect(screen.getByLabelText('Group entries by')).toHaveValue('field-status');

    rerender(
      <BoardView
        entries={entries}
        fields={[priorityField]}
        formatLoggedTime={formatLoggedTime}
      />,
    );

    expect(screen.getByLabelText('Group entries by')).toHaveValue('field-priority');
    expect(
      screen.queryByRole('option', { name: 'Status' }),
    ).not.toBeInTheDocument();
    const columns = container.querySelectorAll('.board-column');
    expect(columns).toHaveLength(3);
    expect(within(columns[0]).getByText('High')).toBeInTheDocument();
    expect(container.querySelectorAll('.board-card')).toHaveLength(4);
  });

  it('asks for a custom field before grouping when the project has none', () => {
    renderBoard({ fields: [] });

    expect(
      screen.getByText(
        'Add at least one custom project field before using Board view.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Group entries by')).not.toBeInTheDocument();
  });
});
