const list = (value) => Array.isArray(value) ? value : [];
export const compareIds = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const key = (type, id) => `${type}:${id}`;

// projects must come from the authenticated owned-project list. References
// never create nodes: an unloaded/hidden/unauthorized endpoint stays absent.
export function buildConstellationGraph({ projects = [], detailsByProject = {}, includeArchived = false } = {}) {
  const nodes = new Map();
  const edges = new Map();
  const acceptedDetails = [];
  let omittedEdges = 0;

  for (const project of [...list(projects)].sort((a, b) => compareIds(a.id, b.id))) {
    if (!project?.id || (!includeArchived && project.archivedAt)) continue;
    nodes.set(key('project', project.id), {
      id: key('project', project.id), type: 'project', entityId: project.id,
      projectId: project.id, label: project.name || 'Untitled project',
      archived: Boolean(project.archivedAt), record: project,
    });
    const details = detailsByProject[project.id];
    if (details?.project?.id !== project.id) continue;
    acceptedDetails.push(details);
    for (const entry of list(details.entries)) {
      if (!entry?.id || entry.projectId !== project.id || (!includeArchived && entry.archivedAt)) continue;
      nodes.set(key('entry', entry.id), {
        id: key('entry', entry.id), type: 'entry', entityId: entry.id,
        projectId: project.id, label: entry.name || 'Untitled entry',
        archived: Boolean(entry.archivedAt || project.archivedAt), record: entry,
      });
    }
  }

  function connect(type, source, target, directed = true) {
    if (!nodes.has(source) || !nodes.has(target)) { omittedEdges += 1; return; }
    if (source === target) return;
    if (!directed && compareIds(source, target) > 0) [source, target] = [target, source];
    const id = JSON.stringify([type, source, target]);
    edges.set(id, { id, type, source, target, directed });
  }

  for (const details of acceptedDetails) {
    const projectId = details.project.id;
    for (const ref of list(details.references)) {
      connect('project-reference', key('project', projectId), key('project', ref.projectId));
    }
    for (const entry of list(details.entries)) {
      const source = key('entry', entry.id);
      if (!nodes.has(source) || nodes.get(source).projectId !== projectId) continue;
      connect('membership', key('project', projectId), source);
      for (const ref of list(entry.references)) connect('entry-project-reference', source, key('project', ref.projectId));
      for (const ref of list(entry.entryReferences)) connect('entry-reference', source, key('entry', ref.entryId));
      for (const ref of list(entry.linkedEntries)) connect('entry-link', source, key('entry', ref.id), false);
    }
  }
  return {
    nodes: [...nodes.values()].sort((a, b) => compareIds(a.id, b.id)),
    edges: [...edges.values()].sort((a, b) => compareIds(a.id, b.id)),
    omittedEdges,
  };
}
