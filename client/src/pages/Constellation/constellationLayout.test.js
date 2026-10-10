import { expect, it } from 'vitest';
import { buildConstellationGraph } from './constellationGraph';
import { HUB_ID, layoutConstellation } from './constellationLayout';

function fixture(count = 25) {
  const projects = [{ id: 'b' }, { id: 'a' }];
  return buildConstellationGraph({ projects, detailsByProject: Object.fromEntries(projects.map((project) => [project.id, {
    project, entries: Array.from({ length: count }, (_, index) => ({ id: `${project.id}-${index}`, projectId: project.id, occurredAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString() })),
  }])) });
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const positionOf = (nodes, id) => nodes.find((node) => node.id === id).position;

it('assigns finite deterministic positions independent of API order without mutation', () => {
  const graph = fixture();
  const before = JSON.stringify(graph);
  const result = layoutConstellation(graph);
  expect(result).toEqual(layoutConstellation({ ...graph, nodes: [...graph.nodes].reverse() }));
  expect(result.nodes.every((node) => Object.values(node.position).every(Number.isFinite))).toBe(true);
  expect(JSON.stringify(graph)).toBe(before);
  expect(layoutConstellation({ nodes: [], edges: [] }).nodes).toEqual([]);
});

it('places a labelled My Logbook hub at the centre, linked to each project by a grouping edge only', () => {
  const source = fixture(3);
  const result = layoutConstellation(source);
  const hub = result.nodes.find((node) => node.id === HUB_ID);
  expect(hub).toMatchObject({ type: 'hub', label: 'My Logbook', entityId: null, record: null });
  expect(hub.position).toEqual({ x: 0, y: 0, z: 0 });
  const grouping = result.edges.filter((edge) => edge.type === 'grouping');
  expect(grouping).toHaveLength(2);
  for (const edge of grouping) {
    expect(edge.source).toBe(HUB_ID);
    expect(edge.directed).toBe(false);
    expect(result.nodes.some((node) => node.id === edge.target && node.type === 'project')).toBe(true);
  }
  // the synthetic hub adds grouping lines without dropping or inventing real edges
  expect(result.edges.length).toBe(source.edges.length + 2);
  expect(source.edges.every((edge) => result.edges.some((candidate) => candidate.id === edge.id))).toBe(true);
  expect(layoutConstellation({ nodes: [], edges: [] }).edges).toEqual([]);
});

it('composes projects and their entry rings in three dimensions without overlap', () => {
  const nodes = layoutConstellation(fixture(13)).nodes;
  const centers = new Map(nodes.filter((node) => node.type === 'project').map((node) => [node.entityId, node.position]));
  // not a flat grid: the shell varies in depth as well as x/y
  expect(new Set([...centers.values()].map((position) => Math.round(position.z))).size).toBeGreaterThan(1);
  // clusters stay apart: centre distance exceeds the largest ring radius plus margin
  expect(distance(centers.get('a'), centers.get('b'))).toBeGreaterThan(20);
  // entries ring their own project and never reach into the neighbouring cluster
  const own = positionOf(nodes, 'entry:a-0');
  expect(distance(own, centers.get('a'))).toBeCloseTo(4, 5);
  const outer = positionOf(nodes, 'entry:a-12');
  expect(distance(outer, centers.get('a'))).toBeGreaterThan(distance(own, centers.get('a')));
  for (const node of nodes.filter((candidate) => candidate.type === 'entry' && candidate.projectId === 'a')) {
    expect(distance(node.position, centers.get('b'))).toBeGreaterThan(12);
  }
});

it('rotates the shell about y so no project hides the hub in the opening view', () => {
  const projects = Array.from({ length: 6 }, (_, index) => ({ id: `p${index + 1}` }));
  const nodes = layoutConstellation(buildConstellationGraph({ projects })).nodes;
  // the opening camera looks down -z, so a project's visible offset from the hub is hypot(x, y)
  for (const node of nodes.filter((candidate) => candidate.type === 'project')) {
    expect(Math.hypot(node.position.x, node.position.y)).toBeGreaterThan(6);
  }
});

it('places a lone project away from the hub without a shell', () => {
  const graph = buildConstellationGraph({ projects: [{ id: 'solo' }] });
  const nodes = layoutConstellation(graph).nodes;
  const center = positionOf(nodes, 'project:solo');
  expect(distance(center, { x: 0, y: 0, z: 0 })).toBeGreaterThan(6);
  expect(Object.values(center).every(Number.isFinite)).toBe(true);
});

it('rings a lone project’s entries around the project instead of the hub', () => {
  const project = { id: 'solo' };
  const graph = buildConstellationGraph({ projects: [project], detailsByProject: { solo: {
    project, entries: [{ id: 'e1', projectId: 'solo' }, { id: 'e2', projectId: 'solo' }],
  } } });
  const nodes = layoutConstellation(graph).nodes;
  const center = positionOf(nodes, 'project:solo');
  const first = positionOf(nodes, 'entry:e1');
  for (const id of ['entry:e1', 'entry:e2']) {
    expect(distance(positionOf(nodes, id), center)).toBeCloseTo(4, 5);
    expect(distance(positionOf(nodes, id), { x: 0, y: 0, z: 0 })).toBeGreaterThan(6);
  }
  // a two-entry ring spreads evenly around the full circle, not into an arc
  expect(distance(first, positionOf(nodes, 'entry:e2'))).toBeCloseTo(8, 5);
});

it('sorts invalid dates last and orders equal timestamps by stable ID', () => {
  const graph = fixture(13);
  graph.nodes.find((node) => node.id === 'entry:a-0').record.occurredAt = 'invalid';
  const nodes = layoutConstellation(graph).nodes;
  const center = positionOf(nodes, 'project:a');
  const ring = (id) => distance(positionOf(nodes, id), center);
  expect(ring('entry:a-1')).toBeCloseTo(4, 5);
  expect(ring('entry:a-0')).toBeGreaterThan(6.5);
  const equalDates = { 'entry:a-0': '2026-02-01T00:00:00.000Z', 'entry:a-1': '2026-02-01T00:00:00.000Z' };
  const tied = fixture(2);
  for (const node of tied.nodes) if (node.type === 'entry') node.record.occurredAt = equalDates[node.id];
  const forward = layoutConstellation(tied).nodes;
  const reversed = layoutConstellation({ ...tied, nodes: [...tied.nodes].reverse() }).nodes;
  expect(positionOf(forward, 'entry:a-0')).toEqual(positionOf(reversed, 'entry:a-0'));
  expect(positionOf(forward, 'entry:a-0')).not.toEqual(positionOf(forward, 'entry:a-1'));
});
