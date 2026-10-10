import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProjectConstellation from './ProjectConstellation';
import { fetchProjects } from '../../api/projectsApi';
import { fetchProjectDetails } from '../../api/projectDetailsApi';

const auth = vi.hoisted(() => ({ user: { id: 'owner' }, loading: false }));
vi.mock('../../context/UserContext', () => ({ useUser: () => auth }));
vi.mock('../../components/Sidebar', () => ({ default: () => null }));
vi.mock('../../api/projectsApi', () => ({ fetchProjects: vi.fn() }));
vi.mock('../../api/projectDetailsApi', () => ({ fetchProjectDetails: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks(); auth.user = { id: 'owner' };
  fetchProjects.mockResolvedValue([{ id: 'p1', name: 'Research' }, { id: 'p2', name: 'Archive', archivedAt: '2026-10-01' }]);
  fetchProjectDetails.mockResolvedValue({ project: { id: 'p1' }, entries: [{ id: 'e1', projectId: 'p1', name: 'Paper notes', values: [] }] });
});
afterEach(cleanup);

it('progressively loads real records and exposes archived projects only on request', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><ProjectConstellation /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: 'Research' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Archive' })).not.toBeInTheDocument();
  expect(fetchProjectDetails).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Load entries for Research' }));
  await user.click(await screen.findByRole('button', { name: 'Paper notes' }));
  expect(screen.getByRole('link', { name: 'Open entry in project' })).toHaveAttribute('href', '/projects/p1#entry-e1');
  await user.click(screen.getByRole('checkbox', { name: 'Include archived projects' }));
  expect(screen.getByRole('link', { name: 'Archive' })).toBeInTheDocument();
  expect(fetchProjectDetails).toHaveBeenCalledTimes(1);
});

it('hides selected data on logout and offers sign-in without fetching', async () => {
  const { rerender } = render(<MemoryRouter><ProjectConstellation /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Research' });
  auth.user = null;
  rerender(<MemoryRouter><ProjectConstellation /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Sign in to explore your logbook' })).toHaveAttribute('href', '/login');
  expect(screen.queryByRole('link', { name: 'Research' })).not.toBeInTheDocument();
  await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1));
});

it('shows the selected entry in the inspector and links back to the real record', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><ProjectConstellation /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Load entries for Research' }));
  await user.click(await screen.findByRole('button', { name: 'Paper notes' }));
  const inspector = screen.getByRole('complementary', { name: 'Selected record' });
  expect(within(inspector).getByText('LOGBOOK ENTRY')).toBeInTheDocument();
  expect(within(inspector).getByRole('heading', { name: 'Paper notes' })).toBeInTheDocument();
  expect(within(inspector).getByRole('link', { name: /Open entry in project/ })).toHaveAttribute('href', '/projects/p1#entry-e1');
});

it('focuses a project cluster and gates connection filtering on the selection', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><ProjectConstellation /></MemoryRouter>);
  expect(await screen.findByRole('checkbox', { name: 'Focus connections' })).toBeDisabled();
  await user.click(await screen.findByRole('button', { name: 'Focus Research' }));
  expect(screen.getByRole('checkbox', { name: 'Focus connections' })).toBeEnabled();
  const inspector = screen.getByRole('complementary', { name: 'Selected record' });
  expect(within(inspector).getByRole('heading', { name: 'Research' })).toBeInTheDocument();
  expect(within(inspector).getByRole('link', { name: /Open project/ })).toHaveAttribute('href', '/projects/p1');
  await user.click(screen.getByRole('checkbox', { name: 'Focus connections' }));
  expect(screen.getByRole('checkbox', { name: 'Focus connections' })).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Reset view' }));
  expect(screen.getByRole('checkbox', { name: 'Focus connections' })).toBeDisabled();
  expect(within(inspector).getByRole('heading', { name: /A new perspective/ })).toBeInTheDocument();
});

it('toggles between the universe and the accessible list view', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><ProjectConstellation /></MemoryRouter>);
  await screen.findByRole('link', { name: 'Research' });
  expect(document.querySelector('.constellation-workspace')).not.toHaveClass('is-list');
  await user.click(screen.getByRole('button', { name: 'List view' }));
  expect(document.querySelector('.constellation-workspace')).toHaveClass('is-list');
  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Universe' })).toHaveAttribute('aria-pressed', 'false');
});

it('keeps the accessible view usable when WebGL is unavailable and reports scene limits', async () => {
  fetchProjects.mockResolvedValue(Array.from({ length: 25 }, (_, index) => ({ id: `p${index + 1}`, name: `Project ${index + 1}` })));
  render(<MemoryRouter><ProjectConstellation /></MemoryRouter>);
  expect(await screen.findByText('Your logbook, still connected')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
  expect(screen.getByText(/Scene limit: 5 additional nodes/)).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Logbook projects' })).toBeInTheDocument();
});

it('drops the selected record when the authenticated user changes', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<MemoryRouter><ProjectConstellation /></MemoryRouter>);
  await user.click(await screen.findByRole('button', { name: 'Load entries for Research' }));
  await user.click(await screen.findByRole('button', { name: 'Paper notes' }));
  expect(screen.getByRole('complementary', { name: 'Selected record' })).toHaveTextContent('Paper notes');

  auth.user = { id: 'other-user' };
  rerender(<MemoryRouter><ProjectConstellation /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('complementary', { name: 'Selected record' })).not.toHaveTextContent('Paper notes'));
});
