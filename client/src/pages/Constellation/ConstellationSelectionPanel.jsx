import { Link } from 'react-router-dom';
import { EDGE_LABELS, projectColor } from './constellationSceneModel';

function dateLabel(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Not recorded';
}

export default function ConstellationSelectionPanel({ graph, selectedId, onSelect, onFocus, loadingProjectId, projectErrors }) {
  const selected = graph.nodes.find((node) => node.id === selectedId);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const relations = graph.edges.filter((edge) => edge.type !== 'membership' && (edge.source === selectedId || edge.target === selectedId));
  return <aside className="constellation-inspector" aria-label="Selected record" aria-live="polite">
    <p className="constellation-eyebrow">RECORD INSPECTOR</p>
    {!selected ? <div className="constellation-inspector-empty">
      <span className="constellation-inspector-orb" aria-hidden="true" />
      <h2>A new perspective<br />on your work.</h2>
      <p>Select a project to reveal its entries. Follow a connection to explore how your work fits together.</p>
      <p className="constellation-hint">Your original records stay exactly where they belong.</p>
    </div> : <>
      <span className="constellation-record-kind" style={{ '--node-color': selected.type === 'hub' ? '#cdd9ff' : projectColor(selected.projectId) }}>{selected.type === 'hub' ? 'LOGBOOK HUB' : selected.type === 'project' ? 'PROJECT' : 'LOGBOOK ENTRY'}{selected.archived ? ' · ARCHIVED' : ''}</span>
      <h2>{selected.label}</h2>
      {selected.type === 'hub' ? <>
        <p>My Logbook is a visual hub that groups every project in this view. It is not a stored record, and its grouping lines are not explicit references between projects.</p>
        <dl className="constellation-record-stats">
          <div><dt>Projects grouped</dt><dd>{graph.nodes.filter((node) => node.type === 'project').length}</dd></div>
          <div><dt>Loaded entries</dt><dd>{graph.nodes.filter((node) => node.type === 'entry').length}</dd></div>
        </dl>
        <p className="constellation-hint">Select a grouped project to load and explore its entries.</p>
      </> : selected.type === 'project' ? <>
        {selected.record.description && <p>{selected.record.description}</p>}
        <dl className="constellation-record-stats"><div><dt>Recorded entries</dt><dd>{selected.record.totalEntries ?? '—'}</dd></div><div><dt>Minutes logged</dt><dd>{selected.record.loggedMinutes ?? '—'}</dd></div></dl>
        <p className="constellation-hint">Project totals may include archived work. The scene shows loaded active entries.</p>
        <button type="button" onClick={() => onFocus(selected.id)}>Focus project</button>
        <Link className="constellation-open-record" to={`/projects/${selected.entityId}`}>Open project <span aria-hidden="true">↗</span></Link>
        {loadingProjectId === selected.entityId && <p role="status">Loading project entries…</p>}
        {projectErrors[selected.entityId] && <p role="alert">{projectErrors[selected.entityId]} Use Focus project to retry.</p>}
      </> : <>
        <p className="constellation-parent-name">{byId.get(`project:${selected.projectId}`)?.label}</p>
        <dl className="constellation-record-stats"><div><dt>Minutes logged</dt><dd>{selected.record.durationMinutes ?? 0}</dd></div><div><dt>Recorded</dt><dd>{dateLabel(selected.record.occurredAt || selected.record.createdAt)}</dd></div></dl>
        <dl className="constellation-field-values">{(selected.record.values || []).map((value, index) => <div key={value.fieldId || index}><dt>{value.name || 'Field'}{value.archived ? ' (archived)' : ''}</dt><dd>{String(value.value ?? 'Not recorded')}</dd></div>)}</dl>
        {selected.record.tags?.length > 0 && <p className="constellation-tags">{selected.record.tags.join(' · ')}</p>}
        <Link className="constellation-open-record" to={`/projects/${selected.projectId}#entry-${selected.entityId}`}>Open entry in project <span aria-hidden="true">↗</span></Link>
      </>}
      <div className="constellation-connections"><h3>Connections <span>{relations.length}</span></h3>
        {relations.length === 0 ? <p>No explicit connections among loaded records.</p> : <ul>{relations.map((edge) => {
          const outgoing = edge.source === selectedId;
          const target = byId.get(outgoing ? edge.target : edge.source);
          return <li key={edge.id}><span>{EDGE_LABELS[edge.type]} · {edge.directed ? outgoing ? 'outgoing →' : 'incoming ←' : 'undirected ↔'}</span><button type="button" onClick={() => onSelect(target.id)}>Inspect {target.label}</button></li>;
        })}</ul>}
      </div>
    </>}
  </aside>;
}
