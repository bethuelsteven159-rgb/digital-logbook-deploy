import { describe, expect, it } from 'vitest';
import { buildConstellationGraph } from './constellationGraph';

const projects = [{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }, { id: 'empty', name: 'Empty' }];
const detailsByProject = {
  p1: { project: projects[0], references: [{ id: 'row-project', projectId: 'p2', projectName: 'Two' }], entries: [
    { id: 'e1', projectId: 'p1', references: [{ id: 'row-entry-project', projectId: 'p2' }], entryReferences: [{ id: 'row-entry', entryId: 'e2' }], linkedEntries: [{ id: 'e3' }, { id: 'e3' }] },
    { id: 'e3', projectId: 'p1', linkedEntries: [{ id: 'e1' }] },
  ] },
  p2: { project: projects[1], entries: [{ id: 'e2', projectId: 'p2' }] },
};

describe('constellation graph contract', () => {
  it('creates stable nodes and all five edge types using public entity IDs', () => {
    const graph = buildConstellationGraph({ projects, detailsByProject });
    expect(graph.nodes.map((node) => node.id)).toEqual(['entry:e1', 'entry:e2', 'entry:e3', 'project:empty', 'project:p1', 'project:p2']);
    expect(graph.edges.filter((edge) => edge.type === 'membership')).toHaveLength(3);
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'project-reference', source: 'project:p1', target: 'project:p2', directed: true }),
      expect.objectContaining({ type: 'entry-project-reference', source: 'entry:e1', target: 'project:p2' }),
      expect.objectContaining({ type: 'entry-reference', source: 'entry:e1', target: 'entry:e2' }),
      expect.objectContaining({ type: 'entry-link', source: 'entry:e1', target: 'entry:e3', directed: false }),
    ]));
    expect(graph.edges.filter((edge) => edge.type === 'entry-link')).toHaveLength(1);
    expect(JSON.stringify(graph.edges)).not.toContain('row-');
  });

  it('never creates nodes from missing targets or details outside the owned-project list', () => {
    const graph = buildConstellationGraph({ projects: [projects[0]], detailsByProject });
    expect(graph.nodes.some((node) => node.id === 'entry:e2' || node.id === 'project:p2')).toBe(false);
    expect(graph.omittedEdges).toBe(3);
    expect(graph.edges.every((edge) => graph.nodes.some((node) => node.id === edge.target))).toBe(true);
  });

  it('includes archived records only explicitly and excludes their incident edges by default', () => {
    const input = {
      projects: [{ id: 'p', archivedAt: '2026-10-01' }],
      detailsByProject: { p: { project: { id: 'p' }, entries: [{ id: 'e', projectId: 'p', archivedAt: '2026-10-01' }] } },
    };
    expect(buildConstellationGraph(input).nodes).toEqual([]);
    expect(buildConstellationGraph({ ...input, includeArchived: true }).nodes.every((node) => node.archived)).toBe(true);
    input.projects[0].archivedAt = null;
    expect(buildConstellationGraph(input).nodes.map((node) => node.id)).toEqual(['project:p']);
  });

  it('rejects mismatched project detail and entry project identities', () => {
    expect(buildConstellationGraph({ projects, detailsByProject: { p1: detailsByProject.p2 } }).nodes).toHaveLength(3);
    const graph = buildConstellationGraph({ projects, detailsByProject: { p1: { project: { id: 'p1' }, entries: [{ id: 'wrong', projectId: 'p2' }] } } });
    expect(graph.nodes).toHaveLength(3);
  });

  it('is deterministic under response reordering and does not mutate source records', () => {
    const snapshot = JSON.stringify(detailsByProject);
    const first = buildConstellationGraph({ projects, detailsByProject });
    const reordered = { ...detailsByProject, p1: { ...detailsByProject.p1, entries: [...detailsByProject.p1.entries].reverse() } };
    expect(buildConstellationGraph({ projects: [...projects].reverse(), detailsByProject: reordered })).toEqual(first);
    expect(JSON.stringify(detailsByProject)).toBe(snapshot);
    expect(buildConstellationGraph()).toEqual({ nodes: [], edges: [], omittedEdges: 0 });
  });
});
