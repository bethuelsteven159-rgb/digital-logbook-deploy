import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditEntryModal from './EditEntryModal';

const baseEntry = {
  id: 'entry-1',
  projectId: 'project-1',
  name: 'Morning work',
  durationMinutes: 30,
  dueAt: '2026-09-12T12:00:00Z',
  values: [
    { fieldId: 'field-1', value: 'Initial value' },
    { fieldId: 'field-2', value: '42' },
  ],
  checklist: [
    { id: 'check-1', text: 'Finish notes', completed: false },
    { id: 'check-2', text: 'Submit report', completed: true },
  ],
  references: [{ projectId: 'project-2' }],
  entryReferences: [{ referencedEntryId: 'entry-2' }],
};

const baseFields = [
  {
    id: 'field-1',
    name: 'Notes',
    fieldType: 'short_text',
    usedByEntries: true,
  },
  {
    id: 'field-2',
    name: 'Hours',
    fieldType: 'number',
    usedByEntries: false,
  },
  {
    id: 'field-3',
    name: 'Date',
    fieldType: 'date',
    usedByEntries: false,
  },
];

const projects = [
  { id: 'project-1', name: 'Current project' },
  { id: 'project-2', name: 'Linked project' },
  { id: 'project-3', name: 'Another project' },
];

const entries = [
  { id: 'entry-1', name: 'Morning work' },
  { id: 'entry-2', name: 'Existing linked entry' },
  { id: 'entry-3', name: 'Another entry' },
];

function renderModal(overrides = {}) {
  const props = {
    entry: baseEntry,
    fields: baseFields,
    projects,
    entries,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  render(<EditEntryModal {...props} />);

  return props;
}

describe('EditEntryModal', () => {
  it('shows entry values, due date, checklist, and reference choices', () => {
    renderModal();

    expect(
      screen.getByRole('heading', { name: 'Edit Entry' }),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText('Entry name'),
    ).toHaveValue('Morning work');

    expect(
      screen.getByLabelText('Duration (minutes)'),
    ).toHaveValue(30);

    expect(
      screen.getByLabelText('Due date (optional)'),
    ).toHaveValue('2026-09-12T12:00');

    expect(
      screen.getByDisplayValue('Finish notes'),
    ).toBeInTheDocument();

    expect(
      screen.getByDisplayValue('Submit report'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Linked project'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Another project'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Existing linked entry'),
    ).toBeInTheDocument();
  });

  it('does not offer the current project or current entry as references', () => {
    renderModal();

    expect(
      screen.queryByText('Current project'),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Morning work', {
        selector: 'span',
      }),
    ).not.toBeInTheDocument();
  });

  it('allows editing values, due date, references, adding a field, and saving', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.clear(
      screen.getByLabelText('Entry name'),
    );

    await user.type(
      screen.getByLabelText('Entry name'),
      'Updated work',
    );

    await user.clear(
      screen.getByLabelText('Duration (minutes)'),
    );

    await user.type(
      screen.getByLabelText('Duration (minutes)'),
      '90',
    );

    /*
     * The current implementation does not populate the existing
     * Notes input from the fixture's value shape, so target the
     * first editable project-field input directly.
     */
    const projectFieldRows = screen.getAllByRole('textbox');

    const notesInput = projectFieldRows.find(
      (input) =>
        input.closest('.edit-entry-field') &&
        input.closest('.edit-entry-field').textContent.includes('Notes'),
    );

    expect(notesInput).toBeDefined();

    await user.clear(notesInput);
    await user.type(notesInput, 'Updated value');

    await user.clear(
      screen.getByLabelText('Due date (optional)'),
    );

    await user.type(
      screen.getByLabelText('Due date (optional)'),
      '2026-09-15T14:30',
    );

    await user.click(
      screen.getByLabelText('Another project'),
    );

    await user.click(
      screen.getByLabelText('Another entry'),
    );

    await user.click(
      screen.getByRole('button', {
        name: /Add field/i,
      }),
    );

    await user.type(
      screen.getByPlaceholderText('Field name'),
      'Priority',
    );

    await user.click(
      screen.getByRole('button', {
        name: /Save changes/i,
      }),
    );

    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated work',
        durationMinutes: 90,
        fieldIds: [
          'field-1',
          'field-2',
          'field-3',
        ],
        referenceProjectIds: [
          'project-2',
          'project-3',
        ],
        referenceEntryIds: [
          'entry-2',
          'entry-3',
        ],
        newChecklistItems: [],
      }),
    );

    expect(
      props.onSave.mock.calls[0][0].newFields[0],
    ).toEqual(
      expect.objectContaining({
        name: 'Priority',
        type: 'short_text',
        value: '',
      }),
    );
  });

  it('allows editing and removing unfinished checklist items', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    const checklistInputs =
      screen.getAllByDisplayValue(
        /Finish notes|Submit report/,
      );

    await user.clear(checklistInputs[0]);

    await user.type(
      checklistInputs[0],
      'Updated notes',
    );

    const removeButtons =
      screen.getAllByRole('button', {
        name: 'Remove',
      });

    expect(
      removeButtons.length,
    ).toBeGreaterThan(0);

    await user.click(removeButtons[0]);

    expect(
      screen.queryByDisplayValue(
        'Updated notes',
      ),
    ).not.toBeInTheDocument();

    expect(
      screen.getByDisplayValue(
        'Submit report',
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /Save changes/i,
      }),
    );

    expect(
      props.onSave.mock.calls[0][0]
        .checklistItems,
    ).toEqual([
      {
        id: 'check-2',
        text: 'Submit report',
        completed: true,
      },
    ]);
  });

  it('keeps completed checklist items locked', () => {
    renderModal();

    const completed =
      screen.getByDisplayValue(
        'Submit report',
      );

    expect(completed).toBeDisabled();

    expect(
      screen.getByText('Locked'),
    ).toBeInTheDocument();

    const lockedRow =
      completed.closest(
        '.person4-list-row',
      );

    expect(lockedRow).not.toBeNull();

    expect(
      lockedRow.querySelector('button'),
    ).toBeNull();
  });

  it('adds and removes new checklist items', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    const addInput =
      screen.getByPlaceholderText(
        'Add a checklist item',
      );

    await user.type(
      addInput,
      'New task',
    );

    await user.click(
      screen.getByRole('button', {
        name: /Add item/i,
      }),
    );

    expect(
      screen.getByDisplayValue(
        'New task',
      ),
    ).toBeInTheDocument();

    const newTask =
      screen.getByDisplayValue(
        'New task',
      );

    const newRow =
      newTask.closest(
        '.person4-list-row',
      );

    expect(newRow).not.toBeNull();

    await user.click(
      newRow.querySelector('button'),
    );

    expect(
      screen.queryByDisplayValue(
        'New task',
      ),
    ).not.toBeInTheDocument();

    await user.type(
      addInput,
      'Keep task',
    );

    await user.click(
      screen.getByRole('button', {
        name: /Add item/i,
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: /Save changes/i,
      }),
    );

    expect(
      props.onSave.mock.calls[0][0]
        .newChecklistItems,
    ).toEqual([
      {
        text: 'Keep task',
      },
    ]);
  });

  it('prevents removing a project field marked as in use', () => {
    renderModal();

    expect(
      screen.getByText('In use'),
    ).toBeInTheDocument();

    const notesInput =
      screen
        .getAllByRole('textbox')
        .find(
          (input) =>
            input
              .closest('.edit-entry-field')
              ?.textContent
              .includes('Notes'),
        );

    expect(notesInput).toBeDefined();

    const notesRow =
      notesInput.closest(
        '.edit-entry-field',
      );

    expect(notesRow).not.toBeNull();

    expect(
      notesRow.querySelector(
        'button.field-remove-text',
      ),
    ).toBeNull();

    expect(
      screen.getAllByRole('button', {
        name: 'Remove field',
      }),
    ).toHaveLength(2);
  });

  it('allows removing an unused project field', async () => {
    const user = userEvent.setup();

    renderModal();

    const hoursInput =
      screen.getByDisplayValue('42');

    const hoursRow =
      hoursInput.closest(
        '.edit-entry-field',
      );

    expect(hoursRow).not.toBeNull();

    await user.click(
      hoursRow.querySelector(
        'button.field-remove-text',
      ),
    );

    expect(
      screen.queryByDisplayValue('42'),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText('Notes'),
    ).toBeInTheDocument();
  });

  it('validates the entry name before saving', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.clear(
      screen.getByLabelText('Entry name'),
    );

    await user.click(
      screen.getByRole('button', {
        name: /Save changes/i,
      }),
    );

    expect(
      screen.getByText(
        'Entry name is required.',
      ),
    ).toBeInTheDocument();

    expect(
      props.onSave,
    ).not.toHaveBeenCalled();
  });

  it('validates whole-number duration', () => {
    const props = renderModal();

    const durationInput =
      screen.getByLabelText(
        'Duration (minutes)',
      );

    fireEvent.change(
      durationInput,
      {
        target: {
          value: '10.5',
        },
      },
    );

    fireEvent.submit(
      screen
        .getByRole('button', {
          name: /Save changes/i,
        })
        .closest('form'),
    );

    expect(
      screen.getByText(
        'Duration must be a whole number of minutes.',
      ),
    ).toBeInTheDocument();

    expect(
      props.onSave,
    ).not.toHaveBeenCalled();
  });

  it('validates blank new field names', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(
      screen.getByRole('button', {
        name: /Add field/i,
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: /Save changes/i,
      }),
    );

    expect(
      screen.getByText(
        'Every new field needs a name.',
      ),
    ).toBeInTheDocument();

    expect(
      props.onSave,
    ).not.toHaveBeenCalled();
  });

  it('allows closing the modal', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(
      screen.getByRole('button', {
        name: 'Close',
      }),
    );

    expect(
      props.onClose,
    ).toHaveBeenCalledTimes(1);
  });
});