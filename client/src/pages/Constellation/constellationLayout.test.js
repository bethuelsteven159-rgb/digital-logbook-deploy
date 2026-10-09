import { expect, it } from 'vitest';
import { buildConstellationGraph } from './constellationGraph';
import { layoutConstellation } from './constellationLayout';

function fixture(count = 25) {
  const projects = [{ id: 'b' }, { id: 'a' }];
  return buildConstellationGraph({ projects, detailsByProject: Object.fromEntries(projects.map((project) => [project.id, {
    project, entries: Array.from({ length: count }, (_, index) => ({ id: `${project.id}-${index}`, projectId: project.id, occurredAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString() })),
  }])) });
}

it('assigns finite deterministic positions independent of API order without mutation', () => {
  const graph = fixture();
  const before = JSON.stringify(graph);
  const result = layoutConstellation(graph);
  expect(result).toEqual(layoutConstellation({ ...graph, nodes: [...graph.nodes].reverse() }));
  expect(result.nodes.every((node) => Object.values(node.position).every(Number.isFinite))).toBe(true);
  expect(JSON.stringify(graph)).toBe(before);
  expect(layoutConstellation({ nodes: [], edges: [] }).nodes).toEqual([]);
});

it('keeps clusters apart and places earlier records on inner rings', () => {
  const nodes = layoutConstellation(fixture()).nodes;
  const find = (id) => nodes.find((node) => node.id === id).position;
  expect(find('entry:a-0')).toEqual({ x: 4, y: 0, z: 0 });
  expect(find('entry:a-12')).toEqual({ x: 7, y: 0, z: 0.5 });
  const first = nodes.filter((node) => node.projectId === 'a');
  const second = nodes.filter((node) => node.projectId === 'b');
  expect(Math.max(...first.map((node) => node.position.x))).toBeLessThan(Math.min(...second.map((node) => node.position.x)));
});

it('sorts invalid dates last and resolves equal dates by stable ID', () => {
  const graph = fixture(3);
  graph.nodes.find((node) => node.id === 'entry:a-0').record.occurredAt = 'invalid';
  graph.nodes.find((node) => node.id === 'entry:a-2').record.occurredAt = '2026-01-02';
  const nodes = layoutConstellation(graph).nodes;
  expect(nodes.find((node) => node.id === 'entry:a-1').position).toEqual({ x: 4, y: 0, z: 0 });
  expect(nodes.find((node) => node.id === 'entry:a-0').position.y).toBeGreaterThan(0);
});
