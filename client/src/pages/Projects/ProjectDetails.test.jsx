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
  updateChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
  updateProjectReferences: vi.fn(),
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
  updateChecklistItem: apiMocks.updateChecklistItem,
  deleteChecklistItem: apiMocks.deleteChecklistItem,
  updateProjectReferences: apiMocks.updateProjectReferences,
  updateEntryProjectReferences: apiMocks.updateEntryProjectReferences,
  updateEntryReferences: apiMocks.updateEntryReferences,
  updateEntry: apiMocks.updateEntry,
}));

vi.mock('../../components/Sidebar', () => ({
  default: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('../../components/EditProjectModal', () => ({
  default: () => null,
}));

vi.mock('./NewEntryModal', () => ({
  default: () => null,
}));

vi.mock('./EditEntryModal', () => ({
  default: ({ onClose, onSave }) => (
    <div role="dialog" aria-label="Edit Entry test modal">
      <button
        type="button"
        onClick={() =>
          onSave({
            name: 'Updated entry',
            durationMinutes: 60,
            fieldIds: [],
            values: [],
            newFields: [],
            referenceProjectIds: ['project-2'],
            referenceEntryIds: ['entry-2'],
          })
        }
      >
        Save mocked edit
      </button>

      <button type="button" onClick={onClose}>
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
  values: [],
  checklist: [
    { id: 'check-1', text: 'Write report', completed: false },
    { id: 'check-2', text: 'Review report', completed: true },
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
    <MemoryRouter initialEntries={['/projects/project-1']}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectDetails />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectDetails client entry changes', () => {
  beforeEach(() => {
  apiMocks.fetchSavedFilters.mockResolvedValue([]);
    vi.clearAllMocks();

    apiMocks.fetchProjectDetails.mockResolvedValue(detailsResponse());

    apiMocks.fetchProjects.mockResolvedValue([
      project,
      {
        id: 'project-2',
        name: 'Second project',
        archivedAt: null,
      },
    ]);

    apiMocks.updateChecklistItem.mockResolvedValue({
      id: 'check-1',
      text: 'Updated task',
      completed: false,
    });

    apiMocks.deleteChecklistItem.mockResolvedValue({
      success: true,
    });

    apiMocks.updateEntry.mockResolvedValue({});
    apiMocks.updateEntryProjectReferences.mockResolvedValue([]);
    apiMocks.updateEntryReferences.mockResolvedValue([]);
  });

  it('shows the edit entry button for an active project', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByText('First entry')).toBeInTheDocument(),
    );

    expect(
      screen.getByRole('button', { name: /Edit entry/i }),
    ).toBeInTheDocument();
  });

  it('opens the edit entry modal from the existing entry list', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Edit entry/i }),
      ).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole('button', { name: /Edit entry/i }),
    );

    expect(
      screen.getByRole('dialog', { name: 'Edit Entry test modal' }),
    ).toBeInTheDocument();
  });

  it('saves entry changes and updates both reference types', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Edit entry/i }),
      ).toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole('button', { name: /Edit entry/i }),
    );

    await user.click(
      screen.getByRole('button', { name: 'Save mocked edit' }),
    );

    await waitFor(() =>
      expect(apiMocks.updateEntry).toHaveBeenCalledWith(
        'project-1',
        'entry-1',
        expect.objectContaining({
          name: 'Updated entry',
          durationMinutes: 60,
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

  it('toggles a checklist item', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Write report')).toBeInTheDocument(),
    );

    const checkbox = screen.getAllByRole('checkbox')[0];

    await user.click(checkbox);

    expect(apiMocks.updateChecklistItem).toHaveBeenCalledWith(
      'project-1',
      'entry-1',
      'check-1',
      true,
    );
  });

  it('edits checklist text inline and saves it', async () => {
    const user = userEvent.setup();

    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Write report')).toBeInTheDocument(),
    );

    await user.click(
      screen.getAllByRole('button', { name: 'Edit' })[0],
    );

    const input = screen.getByDisplayValue('Write report');

    await user.clear(input);
    await user.type(input, 'Updated task');

    await user.click(
      screen.getByRole('button', { name: 'Save' }),
    );

    expect(apiMocks.updateChecklistItem).toHaveBeenCalledWith(
      'project-1',
      'entry-1',
      'check-1',
      { text: 'Updated task' },
    );
  });

  it('deletes a checklist item after confirmation', async () => {
    const user = userEvent.setup();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Write report')).toBeInTheDocument(),
    );

    await user.click(
      screen.getAllByRole('button', { name: 'Remove' })[0],
    );

    expect(window.confirm).toHaveBeenCalledWith(
      'Remove this checklist item?',
    );

    expect(apiMocks.deleteChecklistItem).toHaveBeenCalledWith(
      'project-1',
      'entry-1',
      'check-1',
    );
  });

  it('does not delete a checklist item when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderPage();

    await waitFor(() =>
      expect(screen.getByText('Write report')).toBeInTheDocument(),
    );

    await user.click(
      screen.getAllByRole('button', { name: 'Remove' })[0],
    );

    expect(apiMocks.deleteChecklistItem).not.toHaveBeenCalled();
  });

  it('hides entry editing and disables checklist editing for archived projects', async () => {
    apiMocks.fetchProjectDetails.mockResolvedValue(
      detailsResponse({
        archivedAt: '2026-09-11T10:00:00Z',
      }),
    );

    renderPage();

    await waitFor(() =>
      expect(screen.getByText('First entry')).toBeInTheDocument(),
    );

    expect(
      screen.queryByRole('button', { name: /Edit entry/i }),
    ).not.toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');

    expect(checkboxes[0]).toBeDisabled();

    expect(
      screen.queryByRole('button', { name: 'Edit' }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole('button', { name: 'Remove' }),
    ).not.toBeInTheDocument();
  });
});