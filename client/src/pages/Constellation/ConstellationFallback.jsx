import { Link } from 'react-router-dom';

export default function ConstellationFallback({ graph, detailsByProject, projectErrors, loadingProjectId, onLoadProject, selectedEntryId, onSelectEntry }) {
  const projects = graph.nodes.filter((node) => node.type === 'project');
  const selected = graph.nodes.find((node) => node.type === 'entry' && node.id === selectedEntryId);
  return (
    <>
      {projects.length === 0 && <p>No projects to show. Create a project or include archived projects.</p>}
      <ul aria-label="Logbook projects">
        {projects.map((project) => {
          const loaded = Boolean(detailsByProject[project.entityId]);
          const busy = loadingProjectId === project.entityId;
          const entries = graph.nodes.filter((node) => node.type === 'entry' && node.projectId === project.entityId);
          return <li key={project.id}>
            <h2><Link to={`/projects/${project.entityId}`}>{project.label}</Link>{project.archived && ' (archived)'}</h2>
            <button type="button" onClick={() => onLoadProject(project.entityId)} disabled={busy || loaded} aria-label={`Load entries for ${project.label}`}>
              {busy ? 'Loading entries…' : loaded ? 'Entries loaded' : 'Load entries'}
            </button>
            {projectErrors[project.entityId] && <p role="alert">{projectErrors[project.entityId]} Select Load entries to retry.</p>}
            {loaded && entries.length === 0 && <p>No active entries in this project.</p>}
            {loaded && <ul aria-label={`Entries in ${project.label}`}>
              {entries.map((entry) => <li key={entry.id}><button type="button" aria-pressed={entry.id === selectedEntryId} onClick={() => onSelectEntry(entry.id)}>{entry.label}</button></li>)}
            </ul>}
          </li>;
        })}
      </ul>
      <section aria-label="Selected entry" aria-live="polite">
        {selected ? <>
          <h2>{selected.label}</h2>
          <dl>
            <dt>Recorded</dt><dd>{selected.record.occurredAt || selected.record.createdAt || 'Not recorded'}</dd>
            <dt>Minutes logged</dt><dd>{selected.record.durationMinutes ?? 0}</dd>
            {(selected.record.values || []).map((value, index) => <div key={value.fieldId || index}><dt>{value.name || 'Field'}</dt><dd>{String(value.value ?? 'Not recorded')}</dd></div>)}
          </dl>
          <Link to={`/projects/${selected.projectId}#entry-${selected.entityId}`}>Open entry in project</Link>
        </> : <p>Select an entry to inspect its recorded work.</p>}
      </section>
    </>
  );
}
