import { describe, expect, it } from 'vitest';
import { compareIds } from './constellationGraph';
import { EDGE_LABELS, SCENE_LIMITS, cameraFrame, edgeCategory, edgePositions, projectColor, selectSceneGraph } from './constellationSceneModel';

const node = (id, type, projectId, position = { x: 0, y: 0, z: 0 }) => ({ id, type, projectId, entityId: id.split(':')[1], label: id, position, record: {} });
const hub = () => node('hub:logbook', 'hub', null, { x: 0, y: 0, z: 0 });

function graphOf(projectCount, entryCount, edges = []) {
  const nodes = [
    ...Array.from({ length: projectCount }, (_, index) => node(`project:p${index + 1}`, 'project', `p${index + 1}`, { x: index, y: 0, z: 0 })),
    ...Array.from({ length: entryCount }, (_, index) => node(`entry:e${index + 1}`, 'entry', 'p1', { x: 0, y: index + 1, z: 0 })),
  ];
  return { nodes, edges, omittedEdges: 0 };
}

describe('projectColor', () => {
  it('is deterministic and returns a hex colour for every id', () => {
    expect(projectColor('p1')).toBe(projectColor('p1'));
    expect(projectColor('p1')).toMatch(/^#[0-9a-f]{6}$/);
    expect(projectColor(undefined)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('selectSceneGraph', () => {
  it('keeps the whole graph when it fits the scene budget', () => {
    const edges = [{ id: 'membership:e1', type: 'membership', source: 'project:p1', target: 'entry:e1', directed: false }];
    const scene = selectSceneGraph(graphOf(2, 2, edges), null);
    expect(scene.nodes).toHaveLength(4);
    expect(scene.edges).toEqual(edges);
    expect(scene.hiddenNodes).toBe(0);
    expect(scene.hiddenEdges).toBe(0);
  });

  it('orders the selected node and its project cluster first', () => {
    const scene = selectSceneGraph(graphOf(3, 2), 'entry:e2');
    expect(scene.nodes.map((candidate) => candidate.id)).toEqual(['project:p1', 'project:p2', 'project:p3', 'entry:e2', 'entry:e1']);
    const projectScene = selectSceneGraph(graphOf(3, 2), 'project:p3');
    expect(projectScene.nodes.map((candidate) => candidate.id)).toEqual(['project:p3', 'project:p1', 'project:p2', 'entry:e1', 'entry:e2']);
  });

  it('drops projects once the project budget is exceeded', () => {
    const graph = graphOf(SCENE_LIMITS.projects + 2, 0);
    const scene = selectSceneGraph(graph, null);
    const keptIds = [...graph.nodes].sort((a, b) => compareIds(a.id, b.id)).slice(0, SCENE_LIMITS.projects).map((candidate) => candidate.id);
    expect(scene.nodes.map((candidate) => candidate.id)).toEqual(keptIds);
    expect(scene.nodes).toHaveLength(SCENE_LIMITS.projects);
    expect(scene.hiddenNodes).toBe(2);
  });

  it('caps entries and reports hidden nodes', () => {
    const scene = selectSceneGraph(graphOf(1, SCENE_LIMITS.entries + 3), null);
    expect(scene.nodes.filter((candidate) => candidate.type === 'entry')).toHaveLength(SCENE_LIMITS.entries);
    expect(scene.hiddenNodes).toBe(3);
  });

  it('prefers explicit relations over membership when the edge budget is exceeded', () => {
    const edges = [
      ...Array.from({ length: SCENE_LIMITS.edges + 4 }, (_, index) => ({ id: `membership:e${index}`, type: 'membership', source: 'project:p1', target: `entry:e${(index % 4) + 1}`, directed: false })),
      { id: 'zzz-reference', type: 'project-reference', source: 'project:p1', target: 'project:p2', directed: true },
    ];
    const scene = selectSceneGraph(graphOf(2, 4, edges), null);
    expect(scene.edges).toHaveLength(SCENE_LIMITS.edges);
    expect(scene.edges[0].id).toBe('zzz-reference');
    expect(scene.hiddenEdges).toBe(5);
  });

  it('restricts connections to the focused cluster when asked', () => {
    const edges = [
      { id: 'membership:e1', type: 'membership', source: 'project:p1', target: 'entry:e1', directed: false },
      { id: 'between', type: 'project-reference', source: 'project:p1', target: 'project:p2', directed: true },
    ];
    const focused = selectSceneGraph(graphOf(2, 1, edges), 'project:p2', true);
    expect(focused.edges.map((edge) => edge.id)).toEqual(['between']);
    const unfiltered = selectSceneGraph(graphOf(2, 1, edges), null, true);
    expect(unfiltered.edges).toHaveLength(2);
  });

  it('drops edges whose endpoints are not part of the scene', () => {
    const edges = [{ id: 'orphan', type: 'entry-link', source: 'entry:missing', target: 'entry:e1', directed: false }];
    expect(selectSceneGraph(graphOf(1, 1, edges), null).edges).toEqual([]);
  });

  it('keeps the logbook hub and the grouping edges of drawn projects', () => {
    const grouping = [{ id: 'grouping:p1', type: 'grouping', source: 'hub:logbook', target: 'project:p1', directed: false }];
    const graph = graphOf(2, 1, grouping);
    graph.nodes = [hub(), ...graph.nodes];
    const scene = selectSceneGraph(graph, null);
    expect(scene.nodes.map((candidate) => candidate.id)).toContain('hub:logbook');
    expect(scene.edges).toEqual(grouping);
    expect(scene.hiddenNodes).toBe(0);
  });

  it('drops grouping edges whose project falls outside the project budget', () => {
    const projects = Array.from({ length: SCENE_LIMITS.projects + 2 }, (_, index) => node(`project:z${String(index + 1).padStart(2, '0')}`, 'project', `z${String(index + 1).padStart(2, '0')}`));
    const grouping = [{ id: 'grouping:last', type: 'grouping', source: 'hub:logbook', target: `project:z${SCENE_LIMITS.projects + 2}`, directed: false }];
    const graph = { nodes: [hub(), ...projects], edges: grouping, omittedEdges: 0 };
    const scene = selectSceneGraph(graph, null);
    expect(scene.edges).toEqual([]);
    expect(scene.hiddenNodes).toBe(2);
  });

  it('drops synthetic grouping lines before membership or explicit edges under budget pressure', () => {
    const edges = [
      { id: 'aaa-grouping', type: 'grouping', source: 'hub:logbook', target: 'project:p1', directed: false },
      ...Array.from({ length: SCENE_LIMITS.edges }, (_, index) => ({ id: `m${index}`, type: 'membership', source: 'project:p1', target: 'entry:e1', directed: false })),
    ];
    const graph = graphOf(1, 1, edges);
    graph.nodes = [hub(), ...graph.nodes];
    const scene = selectSceneGraph(graph, null);
    expect(scene.edges.some((edge) => edge.id === 'aaa-grouping')).toBe(false);
    expect(scene.hiddenEdges).toBe(1);
  });

  it('shows every grouping line when the hub itself is focused', () => {
    const edges = [
      { id: 'g1', type: 'grouping', source: 'hub:logbook', target: 'project:p1', directed: false },
      { id: 'g2', type: 'grouping', source: 'hub:logbook', target: 'project:p2', directed: false },
      { id: 'membership:e1', type: 'membership', source: 'project:p1', target: 'entry:e1', directed: false },
    ];
    const graph = graphOf(2, 1, edges);
    graph.nodes = [hub(), ...graph.nodes];
    const scene = selectSceneGraph(graph, 'hub:logbook', true);
    expect(scene.edges.map((edge) => edge.id).sort()).toEqual(['g1', 'g2']);
  });
});

describe('cameraFrame', () => {
  const nodes = [
    node('project:p1', 'project', 'p1', { x: 0, y: 0, z: 0 }),
    node('entry:e1', 'entry', 'p1', { x: 4, y: 6, z: 0 }),
  ];

  it('frames the cluster centroid with symmetric padding', () => {
    const frame = cameraFrame(nodes, 'p1', 1);
    expect(frame.target).toEqual([2, 3, 0]);
    expect(frame.position[0]).toBeCloseTo(frame.target[0]);
    expect(frame.position[1]).toBeCloseTo(frame.target[1] - frame.distance * 0.22);
    expect(frame.position[2]).toBeCloseTo(frame.target[2] + frame.distance * 0.976);
  });

  it('falls back to the whole scene and then to a neutral frame', () => {
    expect(cameraFrame(nodes, 'p9', 1).target).toEqual([2, 3, 0]);
    const empty = cameraFrame([], null, 1);
    expect(empty.target).toEqual([0, 0, 0]);
    const halfFov = Math.atan(Math.tan((42 * Math.PI) / 360));
    expect(empty.distance).toBeCloseTo((8 / Math.sin(halfFov)) * 1.12);
  });

  it('moves the camera further away in narrow viewports', () => {
    const wide = cameraFrame(nodes, null, 2);
    const narrow = cameraFrame(nodes, null, 0.2);
    expect(narrow.distance).toBeGreaterThan(wide.distance);
  });

  it('approaches a focused cluster from the outside so entry rings face the camera', () => {
    const ringNodes = [
      node('hub:logbook', 'hub', null, { x: 0, y: 0, z: 0 }),
      node('project:p1', 'project', 'p1', { x: 10, y: 0, z: 0 }),
      node('entry:e1', 'entry', 'p1', { x: 10, y: 4, z: 0 }),
      node('entry:e2', 'entry', 'p1', { x: 10, y: -4, z: 0 }),
    ];
    const frame = cameraFrame(ringNodes, 'p1', 1);
    const offset = frame.position.map((value, index) => value - frame.target[index]);
    // approached from the cluster's own side of the hub, not from the fixed +z viewpoint
    expect(offset[0]).toBeGreaterThan(Math.abs(offset[2]));
    expect(offset[1]).toBeGreaterThan(0);
    expect(Math.hypot(...offset)).toBeCloseTo(frame.distance, 5);
  });
});

describe('edgePositions', () => {
  const nodes = [
    node('hub:logbook', 'hub', null, { x: 0, y: 0, z: 0 }),
    node('project:p1', 'project', 'p1', { x: 0, y: 0, z: 0 }),
    node('project:p2', 'project', 'p2', { x: 10, y: 0, z: 0 }),
    node('entry:e1', 'entry', 'p1', { x: 0, y: 2, z: 0 }),
  ];
  const membership = { id: 'membership:e1', type: 'membership', source: 'project:p1', target: 'entry:e1', directed: false };
  const directed = { id: 'reference', type: 'project-reference', source: 'project:p1', target: 'project:p2', directed: true };
  const undirected = { id: 'link', type: 'entry-link', source: 'entry:e1', target: 'project:p2', directed: false };
  const grouping = { id: 'grouping:p2', type: 'grouping', source: 'hub:logbook', target: 'project:p2', directed: false };

  it('assigns every relationship type to one of the four visual languages', () => {
    expect(edgeCategory('membership')).toBe('membership');
    expect(edgeCategory('grouping')).toBe('grouping');
    expect(edgeCategory('entry-link')).toBe('link');
    expect(edgeCategory('project-reference')).toBe('reference');
    expect(edgeCategory('entry-reference')).toBe('reference');
    expect(edgeCategory('entry-project-reference')).toBe('reference');
    expect(EDGE_LABELS.grouping).toMatch(/visual/);
  });

  it('separates membership spokes from explicit connections', () => {
    expect(Array.from(edgePositions([membership, directed], nodes, 'membership'))).toEqual([0, 0, 0, 0, 2, 0]);
    expect(Array.from(edgePositions([membership], nodes, 'reference'))).toEqual([]);
  });

  it('places the base segment before the arrowhead geometry', () => {
    const explicit = edgePositions([membership, directed], nodes, 'reference');
    expect(Array.from(explicit.slice(0, 6))).toEqual([0, 0, 0, 10, 0, 0]);
  });

  it('adds arrowheads only for directed reference edges', () => {
    expect(edgePositions([directed], nodes, 'reference').length).toBe(6 * 3);
    expect(edgePositions([undirected], nodes, 'reference').length).toBe(0);
    expect(edgePositions([undirected], nodes, 'link').length).toBe(2 * 3);
  });

  it('renders grouping lines as dashes without arrowheads', () => {
    const dashed = edgePositions([{ ...grouping, directed: true }], nodes, 'grouping');
    expect(dashed.length).toBe(5 * 2 * 3);
    expect(dashed[3]).toBeGreaterThan(0);
    expect(dashed[3]).toBeLessThan(10);
    expect(edgePositions([grouping], nodes, 'membership').length).toBe(0);
    expect(edgePositions([grouping], nodes, 'reference').length).toBe(0);
  });

  it('skips edges with missing endpoints and zero-length segments', () => {
    const missing = { id: 'missing', type: 'project-reference', source: 'project:p1', target: 'entry:none', directed: true };
    expect(edgePositions([missing], nodes, 'reference').length).toBe(0);
    const samePlace = node('project:p3', 'project', 'p3', { x: 0, y: 0, z: 0 });
    const degenerate = { id: 'degenerate', type: 'project-reference', source: 'project:p1', target: 'project:p3', directed: true };
    expect(edgePositions([degenerate], [...nodes, samePlace], 'reference').length).toBe(2 * 3);
    const degenerateGrouping = { id: 'degenerate-grouping', type: 'grouping', source: 'project:p1', target: 'project:p3', directed: false };
    expect(edgePositions([degenerateGrouping], [...nodes, samePlace], 'grouping').length).toBe(0);
  });
});
