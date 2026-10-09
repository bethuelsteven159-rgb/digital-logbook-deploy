import { compareIds } from './constellationGraph';

function time(node) {
  const value = Date.parse(node.record.occurredAt || node.record.createdAt);
  return Number.isFinite(value) ? value : Infinity;
}

// Stable for the same records regardless of API ordering. Each cluster uses
// concentric chronological rings; unknown dates sort last, then stable ID.
export function layoutConstellation(graph) {
  const projects = graph.nodes.filter((node) => node.type === 'project').sort((a, b) => compareIds(a.id, b.id));
  const clusters = new Map(projects.map((node) => [node.entityId, []]));
  for (const node of graph.nodes) if (node.type === 'entry') clusters.get(node.projectId)?.push(node);
  const maxCount = Math.max(0, ...[...clusters.values()].map((entries) => entries.length));
  const ringCount = Math.ceil(maxCount / 12);
  const spacing = 2 * (4 + ringCount * 3) + 6;
  const columns = Math.max(1, Math.ceil(Math.sqrt(projects.length)));
  const positions = new Map();
  projects.forEach((project, index) => {
    const center = { x: (index % columns) * spacing, y: Math.floor(index / columns) * spacing, z: 0 };
    positions.set(project.id, center);
    clusters.get(project.entityId).sort((a, b) => {
      const first = time(a), second = time(b);
      return first === second ? compareIds(a.id, b.id) : first < second ? -1 : 1;
    }).forEach((entry, entryIndex) => {
      const ring = Math.floor(entryIndex / 12);
      const angle = (entryIndex % 12) * Math.PI / 6;
      const radius = 4 + ring * 3;
      positions.set(entry.id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
        z: ring * 0.5,
      });
    });
  });
  return {
    ...graph,
    nodes: [...graph.nodes].sort((a, b) => compareIds(a.id, b.id)).map((node) => ({
      ...node, position: positions.get(node.id) || { x: 0, y: 0, z: 0 },
    })),
  };
}
