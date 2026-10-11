import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProjectDetails from './ProjectDetails';

const apiMocks = vi.hoisted(() => ({
  fetchProjectDetails: vi.fn(),
  createProjectEntry: vi.fn(),
  deleteProjectEntry: vi.fn(),
  fetchSavedFilters: vi.fn(),
  createSavedFilter: vi.fn(),
  applySavedFilter: vi.fn(),
  deleteSavedFilter: vi.fn(),
  updateSavedFilter: vi.fn(),
  completeProjectEntry: vi.fn(),
  markEntryComplete: vi.fn(),
  fetchOutstandingEntries: vi.fn(),
  fetchIncompleteEntries: vi.fn(),
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
  deleteProjectEntry: apiMocks.deleteProjectEntry,
  fetchProjectDetails: apiMocks.fetchProjectDetails,
  fetchSavedFilters: apiMocks.fetchSavedFilters,
  createSavedFilter: apiMocks.createSavedFilter,
  applySavedFilter: apiMocks.applySavedFilter,
  deleteSavedFilter: apiMocks.deleteSavedFilter,
  updateSavedFilter: apiMocks.updateSavedFilter,
  completeProjectEntry: apiMocks.completeProjectEntry,
  markEntryComplete: apiMocks.markEntryComplete,
  fetchOutstandingEntries: apiMocks.fetchOutstandingEntries,
  fetchIncompleteEntries: apiMocks.fetchIncompleteEntries,
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

vi.mock('../../api/recurringEntriesApi', () => ({
  fetchRecurringEntries: vi.fn().mockResolvedValue([]),
  createRecurringEntry: vi.fn(),
  updateRecurringEntry: vi.fn(),
  deleteRecurringEntry: vi.fn(),
  generateDueRecurringEntries: vi.fn().mockResolvedValue({ created: 0 }),
}));
vi.mock('../../components/Sidebar', () => ({ default: () => null }));
vi.mock('../../components/EditProjectModal', () => ({ default: () => null }));
vi.mock('./NewEntryModal', () => ({ default: () => null }));
vi.mock('./EditEntryModal', () => ({ default: () => null }));
vi.mock('./EntryDetailsModal', () => ({ default: () => null }));

const DAY = 24 * 60 * 60 * 1000;

const project = {
  id: 'project-1',
  name: 'Project One',
  description: 'Test project',
  archivedAt: null,
};

function makeEntry(overrides) {
  return {
    projectId: 'project-1',
    durationMinutes: 30,
    occurredAt: new Date(Date.now() - 5 * DAY).toISOString(),
    completedAt: null,
    tags: [],
    values: [],
    checklist: [],
    references: [],
    entryReferences: [],
    ...overrides,
  };
}

const overdueEntry = makeEntry({
  id: 'entry-overdue',
  name: 'Overdue report',
  dueAt: new Date(Date.now() - 3 * DAY).toISOString(),
});

const futureEntry = makeEntry({
  id: 'entry-future',
  name: 'Future report',
  dueAt: new Date(Date.now() + 7 * DAY).toISOString(),
});

function detailsResponse(entries) {
  return { project, fields: [], entries, references: [] };
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

describe('ProjectDetails reminders (US-A07 happy path)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    apiMocks.fetchSavedFilters.mockResolvedValue([]);
    apiMocks.fetchProjects.mockResolvedValue([]);
  });

  it('flags an overdue entry, and marking it complete clears the flag', async () => {
    const user = userEvent.setup();
    const completed = { ...overdueEntry, completedAt: new Date().toISOString() };

    apiMocks.fetchProjectDetails
      .mockResolvedValueOnce(detailsResponse([overdueEntry, futureEntry]))
      .mockResolvedValue(detailsResponse([completed, futureEntry]));
    apiMocks.markEntryComplete.mockResolvedValue({});

    renderPage();

    expect(await screen.findByText(/^Overdue . was due/)).toBeInTheDocument();
    expect(screen.getAllByText(/^Overdue . was due/)).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Mark as complete' })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Mark as complete' })[0]);

    await waitFor(() => {
      expect(apiMocks.markEntryComplete).toHaveBeenCalledWith('project-1', 'entry-overdue');
    });

    expect((await screen.findAllByText('Completed')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Overdue . was due/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Mark as complete' })).toHaveLength(1);
  });

  it('narrows the list to overdue entries and back again', async () => {
    const user = userEvent.setup();

    apiMocks.fetchProjectDetails.mockResolvedValue(
      detailsResponse([overdueEntry, futureEntry]),
    );
    apiMocks.fetchOutstandingEntries.mockResolvedValue([overdueEntry]);

    renderPage();

    expect((await screen.findAllByText('Future report')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Overdue' }));

    expect(
      await screen.findByRole('button', { name: 'Overdue', pressed: true }),
    ).toBeInTheDocument();
    expect(apiMocks.fetchOutstandingEntries).toHaveBeenCalledWith('project-1');
    expect(screen.queryAllByText('Future report')).toHaveLength(0);
    expect(screen.getAllByText('Overdue report').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Overdue' }));

    expect((await screen.findAllByText('Future report')).length).toBeGreaterThan(0);
  });
});

