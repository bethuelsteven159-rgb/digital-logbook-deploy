import { useState } from "react";
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProjectDetails from './ProjectDetails';

const apiMocks = vi.hoisted(() => ({
  fetchProjectDetails: vi.fn(),
  createProjectEntry: vi.fn(),
  fetchSavedFilters: vi.fn(),
  createSavedFilter: vi.fn(),
  applySavedFilter: vi.fn(),
  deleteSavedFilter: vi.fn(),
  fetchProjects: vi.fn(),
  setProjectArchived: vi.fn(),
  updateProject: vi.fn(),
  updateEntryProjectReferences: vi.fn(),
  updateEntryReferences: vi.fn(),
  updateEntry: vi.fn(),
  generateDueRecurringEntries: vi.fn(),
}));

vi.mock('../../api/projectDetailsApi', () => ({
  createProjectEntry: apiMocks.createProjectEntry,
  fetchProjectDetails: apiMocks.fetchProjectDetails,
  fetchSavedFilters: apiMocks.fetchSavedFilters,
  createSavedFilter: apiMocks.createSavedFilter,
  applySavedFilter: apiMocks.applySavedFilter,
  deleteSavedFilter: apiMocks.deleteSavedFilter,
}));

vi.mock('../../api/projectsApi', () => ({
  fetchProjects: apiMocks.fetchProjects,
  setProjectArchived: apiMocks.setProjectArchived,
  updateProject: apiMocks.updateProject,
}));

vi.mock('../../api/entryFeaturesApi', () => ({
  updateEntryProjectReferences:
    apiMocks.updateEntryProjectReferences,
  updateEntryReferences:
    apiMocks.updateEntryReferences,
  updateEntry: apiMocks.updateEntry,
}));

vi.mock('../../api/recurringEntriesApi', () => ({
  generateDueRecurringEntries:
    apiMocks.generateDueRecurringEntries,
}));

vi.mock('../../components/Sidebar', () => ({
  default: () => (
    <div data-testid="sidebar">
      Sidebar
    </div>
  ),
}));

vi.mock('../../components/EditProjectModal', () => ({
  default: () => null,
}));

vi.mock('./NewEntryModal', () => ({
  default: ({ onClose, onCreate }) => (
    <div
      role="dialog"
      aria-label="New Entry test modal"
    >
      <button
        type="button"
        onClick={() =>
          onCreate({
            name: 'Offline entry',
            durationMinutes: 45,
            occurredAt: '2026-09-12T08:00:00Z',
            values: [],
          }).catch(() => {})
        }
      >
        Create mocked entry
      </button>

      <button
        type="button"
        onClick={onClose}
      >
        Close new entry
      </button>
    </div>
  ),
}));

vi.mock('./EntryDetailsModal', () => ({
  default: ({
    entry,
    archived,
    onClose,
    onEdit,
  }) => (
    <div
      role="dialog"
      aria-label="Entry details test modal"
    >
      <h2>{entry.name}</h2>

      <div>
        {entry.values?.length || 0} fields
      </div>

      <div>
        {entry.checklist?.length || 0} checklist items
      </div>

      <button
        type="button"
        onClick={onEdit}
        disabled={archived}
      >
        Edit entry
      </button>

      <button
        type="button"
        onClick={onClose}
      >
        Close entry
      </button>
    </div>
  ),
}));

vi.mock('./AutomationRulesModal', () => ({
  default: ({ onClose }) => (
    <div
      role="dialog"
      aria-label="Automation rules test modal"
    >
      <button type="button" onClick={onClose}>
        Close automation
      </button>
    </div>
  ),
}));

vi.mock('./EditEntryModal', () => ({
  default: ({
    onClose,
    onSave,
  }) => {
    const [saveError, setSaveError] = useState('');
    return (
    <div
      role="dialog"
      aria-label="Edit Entry test modal"
    >
      <button
        type="button"
        onClick={() =>
          onSave({
            name: 'Updated entry',
            durationMinutes: 60,
            dueAt: null,
            fieldIds: [],
            values: [],
            newFields: [],
            checklistItems: [],
            newChecklistItems: [],
            referenceProjectIds: ['project-2'],
            referenceEntryIds: ['entry-2'],
          }).catch((error) => setSaveError(error.message))
        }
      >
        Save mocked edit
      </button>

      {saveError && <p role="alert">{saveError}</p>}
      <button
        type="button"
        onClick={onClose}
      >
        Close edit
      </button>
    </div>
  );
  },
}));

vi.mock('./RecurringEntriesModal', () => ({
  default: ({
    projectId,
    onClose,
    onChanged,
  }) => (
    <div
      role="dialog"
      aria-label="Recurring entries test modal"
      data-project-id={projectId}
    >
      <button
        type="button"
        onClick={() => onChanged?.()}
      >
        Make recurring change
      </button>

      <button
        type="button"
        onClick={onClose}
      >
        Close recurring
      </button>
    </div>
  ),
}));

const project = {
  id: 'project-1',
  name: 'Project One',
  description: 'Test project',
  archivedAt: null,
};

const entry = {
  id: 'entry-1',
  projectId: 'project-1',
  name: 'First entry',
  durationMinutes: 30,
  occurredAt: '2026-09-10T10:00:00Z',
  dueAt: '2026-09-12T12:00:00Z',
  values: [
    {
      fieldId: 'field-1',
      name: 'Notes',
      fieldType: 'short_text',
      value: 'Example',
    },
  ],
  checklist: [
    {
      id: 'check-1',
      text: 'Write report',
      completed: false,
    },
    {
      id: 'check-2',
      text: 'Review report',
      completed: true,
    },
  ],
  references: [],
  entryReferences: [],
};

function detailsResponse(overrides = {}) {
  return {
    project: {
      ...project,
      ...overrides,
    },
    fields: [],
    entries: [entry],
    references: [],
  };
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        '/projects/project-1',
      ]}
    >
      <Routes>
        <Route
          path="/projects/:id"
          element={<ProjectDetails />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectDetails entry flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMocks.fetchSavedFilters.mockResolvedValue(
      [],
    );

    apiMocks.fetchProjectDetails.mockResolvedValue(
      detailsResponse(),
    );

    apiMocks.fetchProjects.mockResolvedValue([
      project,
      {
        id: 'project-2',
        name: 'Second project',
        archivedAt: null,
      },
    ]);

    apiMocks.generateDueRecurringEntries.mockResolvedValue({
      generatedCount: 0,
      generatedEntries: [],
    });

    apiMocks.updateEntry.mockResolvedValue({});
    apiMocks.updateEntryProjectReferences.mockResolvedValue(
      [],
    );
    apiMocks.updateEntryReferences.mockResolvedValue(
      [],
    );
  });

  it('shows entries as clickable rows instead of inline edit buttons', async () => {
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText('First entry'),
      ).toBeInTheDocument(),
    );

    expect(
      screen.getByRole('button', {
        name: /Click entry to view full contents/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: /^Edit entry$/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('opens entry details first, then opens edit from the details view', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText('First entry'),
      ).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole('button', {
        name: /Click entry to view full contents/i,
      }),
    );

    expect(
      screen.getByRole('dialog', {
        name: 'Entry details test modal',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('2 checklist items'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /^Edit entry$/i,
      }),
    );

    expect(
      screen.getByRole('dialog', {
        name: 'Edit Entry test modal',
      }),
    ).toBeInTheDocument();
  });

  it('saves entry changes and updates both reference types', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText('First entry'),
      ).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole('button', {
        name: /Click entry to view full contents/i,
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: /^Edit entry$/i,
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Save mocked edit',
      }),
    );

    await waitFor(() =>
      expect(
        apiMocks.updateEntry,
      ).toHaveBeenCalledWith(
        'project-1',
        'entry-1',
        expect.objectContaining({
          name: 'Updated entry',
          durationMinutes: 60,
          checklistItems: [],
          newChecklistItems: [],
          referenceProjectIds: ['project-2'],
          referenceEntryIds: ['entry-2'],
        }),
      ),
    );

    expect(apiMocks.updateEntry).toHaveBeenCalledTimes(1);
    expect(apiMocks.updateEntryProjectReferences).not.toHaveBeenCalled();
    expect(apiMocks.updateEntryReferences).not.toHaveBeenCalled();
    await waitFor(() => expect(apiMocks.fetchProjectDetails).toHaveBeenCalledTimes(2));
  });

  it.each(['project references', 'entry references'])('keeps the persisted entry and editor available after atomic failure in %s', async (stage) => {
    const user = userEvent.setup();
    apiMocks.updateEntry.mockRejectedValueOnce(new Error(`${stage} could not be saved`));
    renderPage();
    await screen.findByText('First entry');
    await user.click(screen.getByRole('button', { name: /Click entry to view full contents/i }));
    await user.click(screen.getByRole('button', { name: /^Edit entry$/i }));
    await user.click(screen.getByRole('button', { name: 'Save mocked edit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`${stage} could not be saved`);
    expect(screen.getByText('First entry')).toBeInTheDocument();
    expect(apiMocks.fetchProjectDetails).toHaveBeenCalledTimes(1);
    expect(apiMocks.updateEntryProjectReferences).not.toHaveBeenCalled();
    expect(apiMocks.updateEntryReferences).not.toHaveBeenCalled();
    // The transaction failed without persisting changes; retry uses one request.
    await user.click(screen.getByRole('button', { name: 'Save mocked edit' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit Entry test modal' })).not.toBeInTheDocument());
    expect(apiMocks.updateEntry).toHaveBeenCalledTimes(2);
  });

  it('keeps archived entries viewable but disables editing', async () => {
    apiMocks.fetchProjectDetails.mockResolvedValue(
      detailsResponse({
        archivedAt:
          '2026-09-11T10:00:00Z',
      }),
    );

    const user = userEvent.setup();

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText('First entry'),
      ).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole('button', {
        name: /Click entry to view full contents/i,
      }),
    );

    expect(
      screen.getByRole('dialog', {
        name: 'Entry details test modal',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: /^Edit entry$/i,
      }),
    ).toBeDisabled();
  });

  it('opens the automation rules modal from the header button', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText('First entry'),
      ).toBeInTheDocument(),
    );

    expect(
      screen.queryByRole('dialog', {
        name: 'Automation rules test modal',
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Automation' }),
    );

    expect(
      screen.getByRole('dialog', {
        name: 'Automation rules test modal',
      }),
    ).toBeInTheDocument();
  });
});


describe('ProjectDetails structured entry search', () => {
  const secondEntry = {
    id: 'entry-2',
    projectId: 'project-1',
    name: 'Backend implementation',
    durationMinutes: 75,
    occurredAt: '2026-09-11T10:00:00Z',
    dueAt: null,
    tags: ['backend', 'api'],
    values: [
      {
        fieldId: 'field-1',
        name: 'Notes',
        fieldType: 'short_text',
        value: 'Implemented authentication',
      },
      {
        fieldId: 'field-2',
        name: 'Work type',
        fieldType: 'short_text',
        value: 'Development',
      },
    ],
    checklist: [],
    references: [],
    entryReferences: [],
  };

  const searchableFirstEntry = {
    ...entry,
    tags: ['report', 'documentation'],
    values: [
      {
        fieldId: 'field-1',
        name: 'Notes',
        fieldType: 'short_text',
        value: 'Research summary',
      },
      {
        fieldId: 'field-2',
        name: 'Work type',
        fieldType: 'short_text',
        value: 'Research',
      },
    ],
  };

  function searchDetailsResponse() {
    return {
      project,
      fields: [
        {
          id: 'field-1',
          name: 'Notes',
          fieldType: 'short_text',
        },
        {
          id: 'field-2',
          name: 'Work type',
          fieldType: 'short_text',
        },
      ],
      entries: [searchableFirstEntry, secondEntry],
      references: [],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    apiMocks.fetchSavedFilters.mockResolvedValue([]);
    apiMocks.fetchProjectDetails.mockResolvedValue(
      searchDetailsResponse(),
    );
    apiMocks.fetchProjects.mockResolvedValue([project]);
  });

  it('searches entry names', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First entry');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Search field' }),
      'name',
    );
    await user.type(
      screen.getByRole('searchbox', { name: 'Search entries' }),
      'backend',
    );

    expect(
      screen.getByText('Backend implementation'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('First entry'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('1 of 2 entries')).toBeInTheDocument();
  });

  it('searches tags', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First entry');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Search field' }),
      'tags',
    );
    await user.type(
      screen.getByRole('searchbox', { name: 'Search entries' }),
      'documentation',
    );

    expect(screen.getByText('First entry')).toBeInTheDocument();
    expect(
      screen.queryByText('Backend implementation'),
    ).not.toBeInTheDocument();
  });

  it('searches across all fields including custom field values', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First entry');

    await user.type(
      screen.getByRole('searchbox', { name: 'Search entries' }),
      'authentication',
    );

    expect(
      screen.getByText('Backend implementation'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('First entry'),
    ).not.toBeInTheDocument();
  });

  it('searches a selected custom field', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First entry');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Search field' }),
      'custom:field-2',
    );
    await user.type(
      screen.getByRole('searchbox', { name: 'Search entries' }),
      'development',
    );

    expect(
      screen.getByText('Backend implementation'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('First entry'),
    ).not.toBeInTheDocument();
  });

  it('does not match a value from the wrong custom field', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First entry');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Search field' }),
      'custom:field-1',
    );
    await user.type(
      screen.getByRole('searchbox', { name: 'Search entries' }),
      'development',
    );

    expect(
      screen.queryByText('Backend implementation'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('0 of 2 entries')).toBeInTheDocument();
  });

  it('searches case-insensitively', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First entry');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Search field' }),
      'name',
    );
    await user.type(
      screen.getByRole('searchbox', { name: 'Search entries' }),
      'BACKEND',
    );

    expect(
      screen.getByText('Backend implementation'),
    ).toBeInTheDocument();
  });

  it('shows a no-match state when a search returns no entries', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First entry');

    await user.type(
      screen.getByRole('searchbox', { name: 'Search entries' }),
      'xyz123-no-match',
    );

    expect(
      screen.getByText('No matching entries'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/No entries match "xyz123-no-match"/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('0 of 2 entries')).toBeInTheDocument();
    expect(
      screen.queryByText('No entries yet.'),
    ).not.toBeInTheDocument();
  });

  it('clears a search and restores all entries', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('First entry');

    const searchBox = screen.getByRole('searchbox', {
      name: 'Search entries',
    });

    await user.type(searchBox, 'backend');

    expect(
      screen.queryByText('First entry'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Backend implementation'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Clear' }),
    );

    expect(screen.getByText('First entry')).toBeInTheDocument();
    expect(
      screen.getByText('Backend implementation'),
    ).toBeInTheDocument();
    expect(searchBox).toHaveValue('');
  });
});

describe('ProjectDetails offline capture and sync', () => {
  const offlinePayload = {
    name: 'Offline entry',
    durationMinutes: 45,
    occurredAt: '2026-09-12T08:00:00Z',
    values: [],
  };

  function readQueue() {
    return JSON.parse(
      localStorage.getItem('offlineEntryQueue') || '[]',
    );
  }

  function setOnline(value) {
    Object.defineProperty(window.navigator, 'onLine', {
      value,
      configurable: true,
    });
  }

  function goOnline() {
    setOnline(true);
    window.dispatchEvent(new Event('online'));
  }

  function goOffline() {
    setOnline(false);
    window.dispatchEvent(new Event('offline'));
  }

  async function queueEntryWhileOffline(user) {
    await user.click(
      screen.getByRole('button', {
        name: /Add New Entry/i,
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Create mocked entry',
      }),
    );

    await waitFor(() =>
      expect(readQueue()).toHaveLength(1),
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setOnline(true);

    apiMocks.fetchSavedFilters.mockResolvedValue(
      [],
    );

    apiMocks.fetchProjectDetails.mockResolvedValue(
      detailsResponse(),
    );

    apiMocks.fetchProjects.mockResolvedValue([
      project,
    ]);

    apiMocks.generateDueRecurringEntries.mockResolvedValue({
      generatedCount: 0,
      generatedEntries: [],
    });
  });

  afterEach(() => {
    localStorage.clear();
    setOnline(true);
  });

  it('queues new entries locally while offline', async () => {
    const user = userEvent.setup();

    setOnline(false);

    renderPage();

    await screen.findByText('First entry');

    expect(
      screen.getByText(
        /new entries will be saved locally/i,
      ),
    ).toBeInTheDocument();

    await queueEntryWhileOffline(user);

    expect(
      apiMocks.createProjectEntry,
    ).not.toHaveBeenCalled();

    const [queued] = readQueue();

    expect(queued.projectId).toBe('project-1');
    expect(queued.payload).toEqual(offlinePayload);
    expect(queued.status).toBe('pending');
    expect(queued.lastError).toBeNull();
    expect(queued.localId).toBeTruthy();
  });

  it('syncs a queued entry once when the connection returns', async () => {
    const user = userEvent.setup();

    apiMocks.createProjectEntry.mockResolvedValue({
      id: 'entry-2',
    });

    setOnline(false);

    renderPage();

    await screen.findByText('First entry');

    await queueEntryWhileOffline(user);

    goOnline();

    await waitFor(() =>
      expect(
        apiMocks.createProjectEntry,
      ).toHaveBeenCalledTimes(1),
    );

    expect(
      apiMocks.createProjectEntry,
    ).toHaveBeenCalledWith('project-1', offlinePayload);

    await waitFor(() =>
      expect(readQueue()).toEqual([]),
    );

    expect(
      apiMocks.fetchProjectDetails.mock.calls.length,
    ).toBeGreaterThanOrEqual(2);

    await goOffline();

    await screen.findByText(
      /new entries will be saved locally/i,
    );

    goOnline();

    await waitFor(() =>
      expect(
        screen.queryByText(
          /new entries will be saved locally/i,
        ),
      ).not.toBeInTheDocument(),
    );

    expect(
      apiMocks.createProjectEntry,
    ).toHaveBeenCalledTimes(1);
  });

  it('keeps a failed sync queued so the entry is not lost', async () => {
    const user = userEvent.setup();

    apiMocks.createProjectEntry.mockRejectedValue(
      new Error('Server unreachable'),
    );

    renderPage();

    await screen.findByText('First entry');

    await queueEntryWhileOffline(user);

    goOffline();

    await screen.findByText(
      /new entries will be saved locally/i,
    );

    goOnline();

    await waitFor(() => {
      const [item] = readQueue();

      expect(item.status).toBe('failed');
      expect(item.lastError).toBe(
        'Server unreachable',
      );
    });

    expect(readQueue()[0].payload).toEqual(
      offlinePayload,
    );

    expect(
      screen.getByText(
        /1 entry waiting to sync/i,
      ),
    ).toBeInTheDocument();

    apiMocks.createProjectEntry.mockResolvedValue({
      id: 'entry-2',
    });

    goOffline();

    await screen.findByText(
      /new entries will be saved locally/i,
    );

    goOnline();

    await waitFor(() =>
      expect(readQueue()).toEqual([]),
    );

    // Direct attempt + failed sync + successful retry.
    expect(
      apiMocks.createProjectEntry,
    ).toHaveBeenCalledTimes(3);

    expect(
      apiMocks.createProjectEntry,
    ).toHaveBeenLastCalledWith(
      'project-1',
      offlinePayload,
    );
  });

  it('does not queue entries the server rejected', async () => {
    const user = userEvent.setup();
    const consoleError = console.error;

    console.error = vi.fn();

    const rejection = new Error(
      'Entry name is required',
    );

    rejection.status = 400;

    apiMocks.createProjectEntry.mockRejectedValue(
      rejection,
    );

    try {
      renderPage();

      await screen.findByText('First entry');

      await user.click(
        screen.getByRole('button', {
          name: /Add New Entry/i,
        }),
      );

      await user.click(
        screen.getByRole('button', {
          name: 'Create mocked entry',
        }),
      );

      await waitFor(() =>
        expect(
          apiMocks.createProjectEntry,
        ).toHaveBeenCalledTimes(1),
      );

      expect(readQueue()).toEqual([]);
    } finally {
      console.error = consoleError;
    }
  });
});

describe('ProjectDetails recurring entries', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    apiMocks.fetchSavedFilters.mockResolvedValue(
      [],
    );

    apiMocks.fetchProjectDetails.mockResolvedValue(
      detailsResponse(),
    );

    apiMocks.fetchProjects.mockResolvedValue([project]);

    apiMocks.generateDueRecurringEntries.mockResolvedValue({
      generatedCount: 0,
      generatedEntries: [],
    });
  });

  it('generates due recurring entries once and reports the count', async () => {
    apiMocks.generateDueRecurringEntries.mockResolvedValue({
      generatedCount: 2,
      generatedEntries: [
        {
          id: 'entry-8',
          definitionId: 'def-1',
          recurrenceDate: '2026-09-27',
        },
        {
          id: 'entry-9',
          definitionId: 'def-1',
          recurrenceDate: '2026-09-28',
        },
      ],
    });

    renderPage();

    await screen.findByText('First entry');

    expect(
      apiMocks.generateDueRecurringEntries,
    ).toHaveBeenCalledTimes(1);
    expect(
      apiMocks.generateDueRecurringEntries,
    ).toHaveBeenCalledWith('project-1');

    expect(
      screen.getByText(
        '2 recurring entries were generated.',
      ),
    ).toBeInTheDocument();
  });

  it('does not regenerate when the modal opens and closes without changes', async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findByText('First entry');

    await user.click(
      screen.getByRole('button', {
        name: /^Recurring$/,
      }),
    );

    expect(
      screen.getByRole('dialog', {
        name: 'Recurring entries test modal',
      }),
    ).toHaveAttribute(
      'data-project-id',
      'project-1',
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Close recurring',
      }),
    );

    expect(
      screen.queryByRole('dialog', {
        name: 'Recurring entries test modal',
      }),
    ).not.toBeInTheDocument();

    expect(
      apiMocks.generateDueRecurringEntries,
    ).toHaveBeenCalledTimes(1);
    expect(
      apiMocks.fetchProjectDetails,
    ).toHaveBeenCalledTimes(1);
  });

  it('regenerates exactly once after a recurring change and does not loop', async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findByText('First entry');

    await user.click(
      screen.getByRole('button', {
        name: /^Recurring$/,
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Make recurring change',
      }),
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Close recurring',
      }),
    );

    await waitFor(() =>
      expect(
        apiMocks.generateDueRecurringEntries,
      ).toHaveBeenCalledTimes(2),
    );

    await waitFor(() =>
      expect(
        apiMocks.fetchProjectDetails,
      ).toHaveBeenCalledTimes(2),
    );

    // A refresh loop would keep issuing generation and
    // detail requests; both counts must stay exact.
    expect(
      apiMocks.generateDueRecurringEntries,
    ).toHaveBeenCalledTimes(2);
    expect(
      apiMocks.fetchProjectDetails,
    ).toHaveBeenCalledTimes(2);
  });

  it('hides the recurring button for archived projects but still generates due entries', async () => {
    apiMocks.fetchProjectDetails.mockResolvedValue(
      detailsResponse({
        archivedAt: '2026-09-27T10:00:00Z',
      }),
    );

    renderPage();

    await screen.findByText('First entry');

    expect(
      screen.queryByRole('button', {
        name: /^Recurring$/,
      }),
    ).not.toBeInTheDocument();

    expect(
      apiMocks.generateDueRecurringEntries,
    ).toHaveBeenCalledTimes(1);
  });
});
