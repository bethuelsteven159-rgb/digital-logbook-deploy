import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SavedFilterModal, { criterionFromCondition } from './SavedFilterModal.jsx';

const FIELD_ID = '8d3c5a4e-1b2f-4c6a-9d7e-0a1b2c3d4e5f';
const fields = [
  { id: FIELD_ID, name: 'Mark', fieldType: 'number' },
  { id: 'f2', name: 'Summary', fieldType: 'short_text' },
  { id: 'f3', name: 'Total', fieldType: 'computed' },
  { id: 'f4', name: 'Old', fieldType: 'short_text', archivedAt: '2026-01-01' },
];

describe('criterionFromCondition', () => {
  it('uses fieldName for built-in properties and numbers for comparisons', () => {
    expect(
      criterionFromCondition({ target: 'durationMinutes', operator: 'greater_than', value: '60' }),
    ).toEqual({ fieldName: 'durationMinutes', operator: 'greater_than', value: 60 });
  });

  it('uses fieldId for custom fields and trims text values', () => {
    expect(
      criterionFromCondition({ target: `custom:${FIELD_ID}`, operator: 'contains', value: ' lab ' }),
    ).toEqual({ fieldId: FIELD_ID, operator: 'contains', value: 'lab' });
  });
});

describe('SavedFilterModal', () => {
  it('offers built-in and custom fields, but not computed or archived ones', () => {
    render(<SavedFilterModal fields={fields} onSave={vi.fn()} onClose={() => {}} />);

    const options = Array.from(
      screen.getByLabelText('Condition 1 field').querySelectorAll('option'),
    ).map((option) => option.textContent);

    expect(options).toEqual(['Entry name', 'Duration (minutes)', 'Tags', 'Mark', 'Summary']);
  });

  it('saves a named filter with every condition', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue();
    render(<SavedFilterModal fields={fields} onSave={onSave} onClose={() => {}} />);

    await user.type(screen.getByLabelText('Filter name'), 'Low marks');
    await user.selectOptions(screen.getByLabelText('Condition 1 field'), 'Mark');
    await user.selectOptions(screen.getByLabelText('Condition 1 operator'), 'less_than');
    await user.type(screen.getByLabelText('Condition 1 value'), '50');

    await user.click(screen.getByRole('button', { name: '+ Add condition' }));
    await user.type(screen.getByLabelText('Condition 2 value'), 'lab');

    await user.click(screen.getByRole('button', { name: 'Save filter' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Low marks',
      criteria: [
        { fieldId: FIELD_ID, operator: 'less_than', value: 50 },
        { fieldName: 'name', operator: 'contains', value: 'lab' },
      ],
    });
  });

  it('requires a name and a value before saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SavedFilterModal fields={fields} onSave={onSave} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Save filter' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Give the filter a name.');

    await user.type(screen.getByLabelText('Filter name'), 'X');
    await user.click(screen.getByRole('button', { name: 'Save filter' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Every condition needs a value.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the server error and stays open when saving fails', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Invalid saved filter data'));
    render(<SavedFilterModal fields={fields} onSave={onSave} onClose={() => {}} />);

    await user.type(screen.getByLabelText('Filter name'), 'X');
    await user.type(screen.getByLabelText('Condition 1 value'), 'a');
    await user.click(screen.getByRole('button', { name: 'Save filter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid saved filter data');
    expect(screen.getByRole('button', { name: 'Save filter' })).toBeEnabled();
  });

  it('pre-fills an existing filter for editing', () => {
    const filter = {
      id: 'sf1',
      name: 'Low marks',
      criteria: [{ fieldId: FIELD_ID, operator: 'less_than', value: 50 }],
    };
    render(<SavedFilterModal fields={fields} filter={filter} onSave={vi.fn()} onClose={() => {}} />);

    expect(screen.getByLabelText('Filter name')).toHaveValue('Low marks');
    expect(screen.getByLabelText('Condition 1 field')).toHaveValue(`custom:${FIELD_ID}`);
    expect(screen.getByLabelText('Condition 1 operator')).toHaveValue('less_than');
    expect(screen.getByLabelText('Condition 1 value')).toHaveValue(50);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
