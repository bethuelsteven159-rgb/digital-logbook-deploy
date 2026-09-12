import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditEntryModal from './EditEntryModal';

const baseEntry = {
  id: 'entry-1',
  projectId: 'project-1',
  name: 'Morning work',
  durationMinutes: 30,
  values: [
    { fieldId: 'field-1', value: 'Initial value' },
    { fieldId: 'field-2', value: '42' },
  ],
  references: [{ projectId: 'project-2' }],
  entryReferences: [{ entryId: 'entry-2' }],
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
  {
    id: 'project-1',
    name: 'Current project',
  },
  {
    id: 'project-2',
    name: 'Linked project',
  },
  {
    id: 'project-3',
    name: 'Another project',
  },
];

const entries = [
  {
    id: 'entry-1',
    name: 'Morning work',
  },
  {
    id: 'entry-2',
    name: 'Existing linked entry',
  },
  {
    id: 'entry-3',
    name: 'Another entry',
  },
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
  it('shows the existing entry values and available reference choices', () => {
    renderModal();

    expect(
      screen.getByRole('heading', { name: 'Edit Entry' }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Entry name')).toHaveValue(
      'Morning work',
    );

    expect(
      screen.getByLabelText('Duration (minutes)'),
    ).toHaveValue(30);

    expect(
      screen.getByDisplayValue('Initial value'),
    ).toBeInTheDocument();

    expect(
      screen.getByDisplayValue('42'),
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

  it('does not offer the current project or current entry as reference choices', () => {
    renderModal();

    expect(
      screen.queryByText('Current project'),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText('Morning work', { selector: 'span' }),
    ).not.toBeInTheDocument();
  });

  it('allows editing values, references, and adding a new field', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    const nameInput = screen.getByLabelText('Entry name');

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated work');

    const durationInput = screen.getByLabelText(
      'Duration (minutes)',
    );

    await user.clear(durationInput);
    await user.type(durationInput, '90');

    const notesInput = screen.getByDisplayValue('Initial value');

    await user.clear(notesInput);
    await user.type(notesInput, 'Updated value');

    await user.click(
      screen.getByLabelText('Another project'),
    );

    await user.click(
      screen.getByLabelText('Another entry'),
    );

    await user.click(
      screen.getByRole('button', { name: /Add field/i }),
    );

    const newFieldName =
      screen.getByPlaceholderText('Field name');

    await user.type(newFieldName, 'Priority');

    await user.click(
      screen.getByRole('button', { name: /Save changes/i }),
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
        values: [
          {
            fieldId: 'field-1',
            value: 'Updated value',
          },
          {
            fieldId: 'field-2',
            value: '42',
          },
          {
            fieldId: 'field-3',
            value: '',
          },
        ],
        referenceProjectIds: [
          'project-2',
          'project-3',
        ],
        referenceEntryIds: [
          'entry-2',
          'entry-3',
        ],
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

  it('prevents removing a field marked as in use', async () => {
    const user = userEvent.setup();

    renderModal();

    expect(
      screen.getByText('In use'),
    ).toBeInTheDocument();

    const buttons = screen.getAllByRole('button', {
      name: 'Remove field',
    });

    expect(buttons).toHaveLength(2);

    await user.click(buttons[0]);

    expect(
      screen.getByDisplayValue('Initial value'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('In use'),
    ).toBeInTheDocument();
  });

  it('allows removing an unused field', async () => {
    const user = userEvent.setup();

    renderModal();

    const removeButtons = screen.getAllByRole('button', {
      name: 'Remove field',
    });

    await user.click(removeButtons[0]);

    expect(
      screen.queryByDisplayValue('42'),
    ).not.toBeInTheDocument();

    expect(
      screen.getByDisplayValue('Initial value'),
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
      screen.getByText('Entry name is required.'),
    ).toBeInTheDocument();

    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('validates whole-number duration', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    const durationInput = screen.getByLabelText(
      'Duration (minutes)',
    );

    await user.clear(durationInput);
    await user.type(durationInput, '10.5');

    const form = screen.getByRole('button', {
      name: /Save changes/i,
    }).closest('form');

    fireEvent.submit(form);

    expect(
      screen.getByText(
        'Duration must be a whole number of minutes.',
      ),
    ).toBeInTheDocument();

    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('validates blank new field names', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(
      screen.getByRole('button', { name: /Add field/i }),
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

    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('allows closing the modal', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(
      screen.getByRole('button', { name: 'Close' }),
    );

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});