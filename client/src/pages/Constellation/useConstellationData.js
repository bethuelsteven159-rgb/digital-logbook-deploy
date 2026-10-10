import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { fetchProjects } from '../../api/projectsApi';
import { fetchProjectDetails } from '../../api/projectDetailsApi';

const empty = () => ({ projects: [], detailsByProject: {}, projectErrors: {}, loadingProjectId: null, error: '', status: 'loading' });

export function useConstellationData() {
  const { user, loading: authLoading } = useUser();
  const userId = user?.id;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState(() => ({ ...empty(), userId: null }));
  const session = useRef(null);
  // Existing API helpers have no AbortSignal argument. Serialize requests and
  // invalidate results instead of changing their public interface.
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    const current = { userId, cancelled: false, projects: new Set(), details: new Map() };
    session.current = current;
    setState({ ...empty(), userId });
    if (authLoading || !userId) return () => { current.cancelled = true; };
    queue.current = queue.current.then(async () => {
      if (current.cancelled) return;
      try {
        const result = await fetchProjects('all');
        if (current.cancelled) return;
        const projects = Array.isArray(result) ? result : [];
        current.projects = new Set(projects.map((project) => project.id));
        setState({ ...empty(), userId, projects, status: 'ready' });
      } catch (error) {
        if (!current.cancelled) setState({ ...empty(), userId, status: 'error', error: error.message || 'Unable to load projects.' });
      }
    });
    return () => { current.cancelled = true; };
  }, [userId, authLoading, revision]);

  const loadProject = useCallback((projectId) => {
    const current = session.current;
    if (authLoading || !userId || current?.userId !== userId || current.cancelled || !current.projects.has(projectId)) return Promise.resolve();
    queue.current = queue.current.then(async () => {
      if (current.cancelled || current.details.has(projectId)) return;
      setState((previous) => ({ ...previous, loadingProjectId: projectId, projectErrors: { ...previous.projectErrors, [projectId]: '' } }));
      try {
        const details = await fetchProjectDetails(projectId);
        if (current.cancelled) return;
        if (details?.project?.id !== projectId) throw new Error('Project response did not match the requested project.');
        current.details.set(projectId, details);
        setState((previous) => ({ ...previous, detailsByProject: { ...previous.detailsByProject, [projectId]: details } }));
      } catch (error) {
        if (current.cancelled) return;
        if (error.status === 401) {
          current.cancelled = true;
          current.details.clear();
          setState({ ...empty(), userId, status: 'error', error: 'Your session expired. Please sign in again.' });
        } else {
          setState((previous) => ({ ...previous, projectErrors: { ...previous.projectErrors, [projectId]: error.message || 'Unable to load this project.' } }));
        }
      } finally {
        if (!current.cancelled) setState((previous) => ({ ...previous, loadingProjectId: null }));
      }
    });
    return queue.current;
  }, [userId, authLoading]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const visible = state.userId === userId && !authLoading && userId ? state : empty();
  return { ...visible, status: authLoading ? 'auth-loading' : !userId ? 'signed-out' : visible.status, userId, loadProject, refresh };
}
