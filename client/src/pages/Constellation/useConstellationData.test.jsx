import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useConstellationData } from './useConstellationData';
import { fetchProjects } from '../../api/projectsApi';
import { fetchProjectDetails } from '../../api/projectDetailsApi';

const auth = vi.hoisted(() => ({ user: { id: 'user-a' }, loading: false }));
vi.mock('../../context/UserContext', () => ({ useUser: () => auth }));
vi.mock('../../api/projectsApi', () => ({ fetchProjects: vi.fn() }));
vi.mock('../../api/projectDetailsApi', () => ({ fetchProjectDetails: vi.fn() }));
const details = (id) => ({ project: { id }, entries: [] });
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => {
  vi.resetAllMocks();
  auth.user = { id: 'user-a' }; auth.loading = false;
  fetchProjects.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
  fetchProjectDetails.mockImplementation(async (id) => details(id));
});
afterEach(cleanup);

it('makes no API requests before authentication or while signed out', async () => {
  auth.loading = true;
  const { result, rerender } = renderHook(useConstellationData);
  expect(result.current.status).toBe('auth-loading');
  auth.loading = false; auth.user = null; rerender();
  expect(result.current.status).toBe('signed-out');
  expect(fetchProjects).not.toHaveBeenCalled();
  expect(fetchProjectDetails).not.toHaveBeenCalled();
});

it('loads only owned projects on demand, serializes requests and reuses cached details', async () => {
  const first = deferred();
  fetchProjectDetails.mockImplementation((id) => id === 'p1' ? first.promise : Promise.resolve(details(id)));
  const { result } = renderHook(useConstellationData);
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(fetchProjects).toHaveBeenCalledWith('all');
  expect(fetchProjectDetails).not.toHaveBeenCalled();
  let pending;
  act(() => { result.current.loadProject('foreign'); result.current.loadProject('p1'); result.current.loadProject('p1'); pending = result.current.loadProject('p2'); });
  await waitFor(() => expect(fetchProjectDetails).toHaveBeenCalledTimes(1));
  await act(async () => { first.resolve(details('p1')); await pending; });
  expect(fetchProjectDetails.mock.calls).toEqual([['p1'], ['p2']]);
  expect(Object.keys(result.current.detailsByProject)).toEqual(['p1', 'p2']);
});

it('drops old-user results and queued requests during account changes', async () => {
  const first = deferred();
  fetchProjectDetails.mockReturnValue(first.promise);
  const { result, rerender } = renderHook(useConstellationData);
  await waitFor(() => expect(result.current.status).toBe('ready'));
  act(() => { result.current.loadProject('p1'); result.current.loadProject('p2'); });
  await waitFor(() => expect(fetchProjectDetails).toHaveBeenCalledTimes(1));
  auth.user = { id: 'user-b' };
  fetchProjects.mockResolvedValue([{ id: 'other' }]);
  rerender();
  expect(result.current.projects).toEqual([]);
  await act(async () => { first.resolve(details('p1')); });
  await waitFor(() => expect(result.current.projects).toEqual([{ id: 'other' }]));
  expect(result.current.detailsByProject).toEqual({});
  expect(fetchProjectDetails).toHaveBeenCalledTimes(1);
});

it('ignores stale project lists and queued work after unmount', async () => {
  const request = deferred(); fetchProjects.mockReturnValue(request.promise);
  const { unmount } = renderHook(useConstellationData);
  await waitFor(() => expect(fetchProjects).toHaveBeenCalledTimes(1));
  unmount();
  await act(async () => request.resolve([{ id: 'old' }]));
  expect(fetchProjectDetails).not.toHaveBeenCalled();
});

it('exposes list errors and supports retry', async () => {
  fetchProjects.mockRejectedValueOnce(new Error('Unavailable'));
  const { result } = renderHook(useConstellationData);
  await waitFor(() => expect(result.current.error).toBe('Unavailable'));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.status).toBe('ready'));
});

it('retains successful projects after a detail failure and allows retry', async () => {
  fetchProjectDetails.mockRejectedValueOnce(Object.assign(new Error('Not found'), { status: 404 }));
  const { result } = renderHook(useConstellationData);
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => { await result.current.loadProject('p1'); await result.current.loadProject('p2'); });
  expect(result.current.projectErrors.p1).toBe('Not found');
  expect(result.current.detailsByProject.p2).toEqual(details('p2'));
  await act(async () => result.current.loadProject('p1'));
  expect(result.current.detailsByProject.p1).toEqual(details('p1'));
});

it('clears data and stops queued requests on an expired session', async () => {
  const { result } = renderHook(useConstellationData);
  await waitFor(() => expect(result.current.status).toBe('ready'));
  fetchProjectDetails.mockRejectedValue(Object.assign(new Error('Expired'), { status: 401 }));
  await act(async () => { result.current.loadProject('p1'); await result.current.loadProject('p2'); });
  expect(result.current.status).toBe('error');
  expect(result.current.projects).toEqual([]);
  expect(result.current.detailsByProject).toEqual({});
  expect(fetchProjectDetails).toHaveBeenCalledTimes(1);
});

it('rejects mismatched detail responses', async () => {
  fetchProjectDetails.mockResolvedValue(details('foreign'));
  const { result } = renderHook(useConstellationData);
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => result.current.loadProject('p1'));
  expect(result.current.detailsByProject).toEqual({});
  expect(result.current.projectErrors.p1).toMatch(/did not match/);
});

it('does not duplicate the initial request under StrictMode', async () => {
  const { result } = renderHook(useConstellationData, { wrapper: StrictMode });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  expect(fetchProjects).toHaveBeenCalledTimes(1);
});
