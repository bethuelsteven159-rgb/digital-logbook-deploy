import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
