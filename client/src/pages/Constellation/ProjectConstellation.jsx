import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useConstellationData } from './useConstellationData';
import { buildConstellationGraph } from './constellationGraph';
import { layoutConstellation } from './constellationLayout';
import ConstellationFallback from './ConstellationFallback';

export default function ProjectConstellation() {
  const data = useConstellationData();
  const [collapsed, setCollapsed] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selection, setSelection] = useState(null);
  const graph = useMemo(() => layoutConstellation(buildConstellationGraph({
    projects: data.projects, detailsByProject: data.detailsByProject, includeArchived,
  })), [data.projects, data.detailsByProject, includeArchived]);
  return <div className="app-shell">
    <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
    <main className="app-main" style={{ padding: 'clamp(16px, 4vw, 40px)' }}>
      <h1>Project Constellation</h1>
      <p>Explore your recorded work. Load projects individually to reveal their entries.</p>
      <Link to="/projects">Back to projects</Link>
      {data.status === 'signed-out' ? <p><Link to="/login">Sign in to explore your logbook</Link></p> : <>
        <p role="status">{['loading', 'auth-loading'].includes(data.status) ? 'Loading your projects…' : `${graph.nodes.filter((node) => node.type === 'project').length} projects; ${graph.nodes.filter((node) => node.type === 'entry').length} loaded entries.`}</p>
        {data.error && <p role="alert">{data.error}</p>}
        <button type="button" onClick={data.refresh} disabled={['loading', 'auth-loading'].includes(data.status)}>Refresh projects</button>
        <label><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Include archived projects</label>
        <p>Only active entries are returned by project loading. Archived entries remain available in each project's archive view.</p>
        {graph.omittedEdges > 0 && <p>Some relationships have unloaded or hidden endpoints. Load their projects to reveal available connections.</p>}
        {data.status === 'ready' && <ConstellationFallback {...data} graph={graph} onLoadProject={data.loadProject} selectedEntryId={selection?.userId === data.userId ? selection.id : null} onSelectEntry={(id) => setSelection({ userId: data.userId, id })} />}
      </>}
    </main>
  </div>;
}
