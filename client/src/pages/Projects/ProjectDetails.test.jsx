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
  default: () => null,
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

vi.mock('./EditEntryModal', () => ({
  default: ({
    onClose,
    onSave,
  }) => (
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
          })
        }
      >
        Save mocked edit
      </button>

      <button
        type="button"
        onClick={onClose}
      >
        Close edit
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
        }),
      ),
    );

    expect(
      apiMocks.updateEntryProjectReferences,
    ).toHaveBeenCalledWith(
      'project-1',
      'entry-1',
      ['project-2'],
    );

    expect(
      apiMocks.updateEntryReferences,
    ).toHaveBeenCalledWith(
      'project-1',
      'entry-1',
      ['entry-2'],
    );
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
});