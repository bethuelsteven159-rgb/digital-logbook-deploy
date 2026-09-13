import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntryDetailsModal from './EntryDetailsModal';

const entry = {
  id: 'entry-1',
  name: 'Practice session',
  durationMinutes: 125,
  occurredAt: '2026-09-11T10:00:00Z',
  dueAt: '2026-09-15T14:30:00Z',
  values: [
    {
      fieldId: 'field-1',
      name: 'Notes',
      fieldType: 'short_text',
      value: 'Worked on openings',
    },
    {
      fieldId: 'field-2',
      name: 'Date',
      fieldType: 'date',
      value: '2026-09-11',
    },
  ],
  checklist: [
    {
      id: 'check-1',
      text: 'Prep',
      completed: true,
    },
    {
      id: 'check-2',
      text: 'Review',
      completed: false,
    },
  ],
  references: [
    {
      id: 'ref-1',
      projectId: 'project-2',
      projectName: 'Other project',
    },
  ],
  entryReferences: [
    {
      id: 'ref-2',
      referencedEntryId: 'entry-2',
      referencedEntryName: 'Earlier entry',
    },
  ],
  linkedEntries: [
    {
      id: 'entry-3',
      name: 'Linked entry',
    },
  ],
};

describe('EntryDetailsModal', () => {
  it('shows the complete entry contents', () => {
    render(
      <EntryDetailsModal
        entry={entry}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Practice session',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Duration'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('2h 5m'),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Worked on openings',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        '11 Sept 2026, 12:00',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        '15 Sept 2026, 16:30',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Prep'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Review'),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Other project',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Earlier entry',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'Linked entry',
      ),
    ).toBeInTheDocument();
  });

  it('opens edit and close actions', async () => {
    const user = userEvent.setup();

    const onEdit = vi.fn();
    const onClose = vi.fn();

    render(
      <EntryDetailsModal
        entry={entry}
        onClose={onClose}
        onEdit={onEdit}
      />,
    );

    await user.click(
      screen.getByRole('button', {
        name: /Edit entry/i,
      }),
    );

    expect(
      onEdit,
    ).toHaveBeenCalledTimes(1);

    const closeButtons =
      screen.getAllByRole('button', {
        name: 'Close',
      });

    expect(closeButtons).toHaveLength(2);

    await user.click(
      closeButtons[closeButtons.length - 1],
    );

    expect(
      onClose,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not show editing for archived entries', () => {
    render(
      <EntryDetailsModal
        entry={entry}
        archived
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', {
        name: /Edit entry/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('handles missing optional content', () => {
    render(
      <EntryDetailsModal
        entry={{
          id: 'entry-2',
          name: 'Empty entry',
          durationMinutes: 0,
        }}
        onClose={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Empty entry',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText('—').length,
    ).toBeGreaterThan(0);

    expect(
      screen.getByText(
        'No field values were recorded.',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        'No checklist items.',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText('None').length,
    ).toBe(2);
  });
});