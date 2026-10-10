import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { useConstellationData } from './useConstellationData';
import { buildConstellationGraph } from './constellationGraph';
import { layoutConstellation } from './constellationLayout';
import { selectSceneGraph } from './constellationSceneModel';
import ConstellationFallback from './ConstellationFallback';
import ConstellationViewport from './ConstellationViewport';
import ConstellationSelectionPanel from './ConstellationSelectionPanel';
import './constellation.css';

export default function ProjectConstellation() {
  const data = useConstellationData();
  const [collapsed, setCollapsed] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selection, setSelection] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);
  const [view, setView] = useState('3d');
  const [connectionsOnly, setConnectionsOnly] = useState(false);
  const graph = useMemo(() => layoutConstellation(buildConstellationGraph({
    projects: data.projects, detailsByProject: data.detailsByProject, includeArchived,
  })), [data.projects, data.detailsByProject, includeArchived]);
  const selectedId = selection?.userId === data.userId && graph.nodes.some((node) => node.id === selection.id) ? selection.id : null;
  const sceneGraph = useMemo(() => selectSceneGraph(graph, selectedId, connectionsOnly), [graph, selectedId, connectionsOnly]);
  const projects = graph.nodes.filter((node) => node.type === 'project');
  const entries = graph.nodes.filter((node) => node.type === 'entry');
  const loadingProject = data.loadingProjectId ? projects.find((node) => node.entityId === data.loadingProjectId) : null;
  const busy = ['loading', 'auth-loading'].includes(data.status);

  function selectNode(id) {
    const node = graph.nodes.find((candidate) => candidate.id === id);
    if (!node) return;
    setSelection({ userId: data.userId, id });
    setFocusRequest({ userId: data.userId, projectId: node.projectId });
    if (node.type === 'project') data.loadProject(node.entityId);
  }
  function resetView() { setSelection(null); setConnectionsOnly(false); setFocusRequest({ userId: data.userId, projectId: null }); }

  return <div className="app-shell">
    <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
    <main className="app-main constellation-page">
      <header className="constellation-header">
        <div><Link className="constellation-back" to="/projects">← Back to projects</Link><p className="constellation-eyebrow">DIGITAL LOGBOOK / EXPLORE</p><h1>Project <em>Constellation</em><span aria-hidden="true">✧</span></h1><p>A wider view of your work. Every record, connected.</p></div>
        <div className="constellation-view-switch" role="group" aria-label="Explorer view">
          <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>Universe</button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>List view</button>
        </div>
      </header>
      {data.status === 'signed-out' ? <p><Link to="/login">Sign in to explore your logbook</Link></p> : <>
        <div className="constellation-toolbar">
          <p role="status">{busy ? 'Loading your projects…' : <><strong>{projects.length}</strong> projects <span aria-hidden="true">/</span> <strong>{entries.length}</strong> loaded entries</>}</p>
          <div><button type="button" onClick={resetView}>Reset view</button><button type="button" onClick={data.refresh} disabled={busy}>Refresh projects</button><label><input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} /> Include archived projects</label></div>
        </div>
        {data.error && <p role="alert" className="constellation-error">{data.error}</p>}
        {busy && <p className="constellation-loading">Gathering your logbook…</p>}
        {data.status === 'ready' && <>
          <div className={`constellation-workspace${view === 'list' ? ' is-list' : ''}`}>
            <div className="constellation-universe">
              {view === '3d' && (projects.length > 0 ? <ConstellationViewport key={data.userId} graph={sceneGraph} selectedId={selectedId} onSelect={selectNode} focusRequest={focusRequest?.userId === data.userId ? focusRequest : null} loadingLabel={loadingProject?.label} /> : <div className="constellation-scene-message"><h2>Your universe starts with a project.</h2><p>Create a project and capture your first piece of work to see it here.</p><Link to="/projects">Go to projects →</Link></div>)}
              <div className="constellation-legend" role="group" aria-label="Connection legend"><span><i className="grouping" /> My Logbook grouping</span><span><i className="membership" /> Project membership</span><span><i className="reference" /> Reference →</span><span><i className="link" /> Linked entries ↔</span><label><input type="checkbox" checked={connectionsOnly} disabled={!selectedId} onChange={(event) => setConnectionsOnly(event.target.checked)} /> Focus connections</label></div>
              <p className="constellation-legend-note">Grouping lines fan out from the My Logbook hub so the overview stays readable — they are a visual aid, not stored relationships. Membership, references and links are drawn only from records you saved.</p>
              {(sceneGraph.hiddenNodes > 0 || sceneGraph.hiddenEdges > 0) && <p className="constellation-hint">Scene limit: {sceneGraph.hiddenNodes} additional nodes and {sceneGraph.hiddenEdges} additional eligible connections are not drawn. All loaded records remain in the explorer; select one to bring it into view.</p>}
              <section className="constellation-record-explorer" aria-label="Accessible record explorer">
                <div className="constellation-explorer-heading"><div><p className="constellation-eyebrow">YOUR RECORDS</p><h2>Explore the logbook</h2></div><span>Keyboard accessible</span></div>
                <ConstellationFallback {...data} graph={graph} onLoadProject={data.loadProject} selectedEntryId={selectedId} onSelectEntry={selectNode} onFocusProject={selectNode} showSelection={false} />
              </section>
            </div>
            <ConstellationSelectionPanel graph={graph} selectedId={selectedId} onSelect={selectNode} onFocus={selectNode} loadingProjectId={data.loadingProjectId} projectErrors={data.projectErrors} />
          </div>
          <footer className="constellation-footnote"><p>Only active entries are returned by project loading. Archived entries remain available in each project's archive view.</p>{graph.omittedEdges > 0 && <p>Some relationships have unloaded or hidden endpoints. Load their projects to reveal available connections.</p>}</footer>
        </>}
      </>}
    </main>
  </div>;
}
