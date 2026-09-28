import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EntryHistoryModal from './EntryHistoryModal';
import {
  fetchEntryRevisions,
  fetchEntryRevision,
  restoreEntryRevision,
} from '../../api/entryFeaturesApi';

vi.mock('../../api/entryFeaturesApi', () => ({
  fetchEntryRevisions: vi.fn(),
  fetchEntryRevision: vi.fn(),
  restoreEntryRevision: vi.fn(),
}));

const revisions = [
  {
    id: 'rev-1',
    createdAt: '2026-09-20T10:00:00Z',
    changedById: 'user-1',
    name: 'Morning session',
    durationMinutes: 90,
  },
];

function renderModal(props = {}) {
  const onClose = vi.fn();
  const onRestored = vi.fn();

  render(
    <EntryHistoryModal
      projectId="project-1"
      entryId="entry-1"
      entryName="Practice session"
      onClose={onClose}
      onRestored={onRestored}
      {...props}
    />,
  );

  return { onClose, onRestored };
}

describe('EntryHistoryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchEntryRevisions.mockResolvedValue(revisions);
  });

  it('loads and lists past versions for the entry', async () => {
    renderModal();

    expect(await screen.findByText(/Morning session/)).toBeInTheDocument();
    expect(fetchEntryRevisions).toHaveBeenCalledWith('project-1', 'entry-1');
  });

  it('shows an empty state when there are no previous versions', async () => {
    fetchEntryRevisions.mockResolvedValue([]);
    renderModal();

    expect(
      await screen.findByText('No previous versions yet.'),
    ).toBeInTheDocument();
  });

  it('shows an error message when history fails to load', async () => {
    fetchEntryRevisions.mockRejectedValue(new Error('Boom'));
    renderModal();

    expect(await screen.findByText('Boom')).toBeInTheDocument();
  });

  it('shows the full snapshot when View is clicked', async () => {
    const user = userEvent.setup();
    fetchEntryRevision.mockResolvedValue({
      name: 'Morning session',
      durationMinutes: 90,
      createdAt: '2026-09-20T10:00:00Z',
      values: [{ fieldId: 'field-1', name: 'Notes', value: 'Old notes' }],
    });
    renderModal();

    await screen.findByText(/Morning session/);
    await user.click(screen.getByRole('button', { name: 'View' }));

    expect(await screen.findByText('Old notes')).toBeInTheDocument();
    expect(fetchEntryRevision).toHaveBeenCalledWith(
      'project-1',
      'entry-1',
      'rev-1',
    );
  });

  it('restores a version after confirmation, then refreshes and closes', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    restoreEntryRevision.mockResolvedValue({});
    const { onClose, onRestored } = renderModal();

    await screen.findByText(/Morning session/);
    await user.click(screen.getByRole('button', { name: /Restore/ }));

    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
    expect(restoreEntryRevision).toHaveBeenCalledWith(
      'project-1',
      'entry-1',
      'rev-1',
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the restore confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { onClose, onRestored } = renderModal();

    await screen.findByText(/Morning session/);
    await user.click(screen.getByRole('button', { name: /Restore/ }));

    expect(restoreEntryRevision).not.toHaveBeenCalled();
    expect(onRestored).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows an error and stays open when restore fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    restoreEntryRevision.mockRejectedValue(new Error('Restore failed'));
    const { onClose, onRestored } = renderModal();

    await screen.findByText(/Morning session/);
    await user.click(screen.getByRole('button', { name: /Restore/ }));

    expect(await screen.findByText('Restore failed')).toBeInTheDocument();
    expect(onRestored).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
