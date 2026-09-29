import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntryDetailsModal from './EntryDetailsModal';

const activeEntry = {
  id: 'entry-1',
  name: 'Active entry',
  archivedAt: null,
  values: [],
  checklist: [],
};

const archivedEntry = {
  ...activeEntry,
  id: 'entry-2',
  name: 'Archived entry',
  archivedAt: '2026-09-01T00:00:00Z',
};

describe('EntryDetailsModal archive actions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers Archive and Delete for an active entry, not Unarchive', () => {
    render(<EntryDetailsModal entry={activeEntry} onClose={() => {}} />);

    expect(screen.getByRole('button', { name: 'Archive entry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete entry/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unarchive entry' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit entry/i })).toBeEnabled();
  });

  it('archives after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onArchive = vi.fn();
    const user = userEvent.setup();

    render(
      <EntryDetailsModal entry={activeEntry} onClose={() => {}} onArchive={onArchive} />,
    );

    await user.click(screen.getByRole('button', { name: 'Archive entry' }));

    expect(onArchive).toHaveBeenCalledWith(activeEntry);
  });

  it('does not archive when the confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onArchive = vi.fn();
    const user = userEvent.setup();

    render(
      <EntryDetailsModal entry={activeEntry} onClose={() => {}} onArchive={onArchive} />,
    );

    await user.click(screen.getByRole('button', { name: 'Archive entry' }));

    expect(onArchive).not.toHaveBeenCalled();
  });

  it('offers Unarchive for an archived entry and disables editing', async () => {
    const onUnarchive = vi.fn();
    const user = userEvent.setup();

    render(
      <EntryDetailsModal entry={archivedEntry} onClose={() => {}} onUnarchive={onUnarchive} />,
    );

    expect(screen.queryByRole('button', { name: 'Archive entry' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit entry/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Unarchive entry' }));

    expect(onUnarchive).toHaveBeenCalledWith(archivedEntry);
  });

  it('hides archive, unarchive and delete when the whole project is archived', () => {
    render(<EntryDetailsModal entry={activeEntry} archived onClose={() => {}} />);

    expect(screen.queryByRole('button', { name: 'Archive entry' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unarchive entry' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete entry/i })).not.toBeInTheDocument();
  });
});
