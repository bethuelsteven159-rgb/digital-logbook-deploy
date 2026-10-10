import { compareIds } from './constellationGraph';

export const HUB_ID = 'hub:logbook';
export const HUB_LABEL = 'My Logbook';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function time(node) {
  const value = Date.parse(node.record.occurredAt || node.record.createdAt);
  return Number.isFinite(value) ? value : Infinity;
}

function unitHash(value) {
  let hash = 0;
  for (const character of String(value)) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return hash / 4294967296;
}

const clusterRadius = (count) => 4 + Math.max(0, Math.ceil(count / 12) - 1) * 3 + 2.2;

function clusterBasis(center) {
  const length = Math.hypot(center.x, center.y, center.z) || 1;
  const normal = [center.x / length, center.y / length, center.z / length];
  const up = Math.abs(normal[1]) > 0.98 ? [1, 0, 0] : [0, 1, 0];
  const u = [up[1] * normal[2] - up[2] * normal[1], up[2] * normal[0] - up[0] * normal[2], up[0] * normal[1] - up[1] * normal[0]];
  const uLength = Math.hypot(...u) || 1;
  u[0] /= uLength; u[1] /= uLength; u[2] /= uLength;
  const v = [normal[1] * u[2] - normal[2] * u[1], normal[2] * u[0] - normal[0] * u[2], normal[0] * u[1] - normal[1] * u[0]];
  return { normal, u, v };
}

function ringEntries(positions, center, entries) {
  const { normal, u, v } = clusterBasis(center);
  entries.forEach((entry, entryIndex) => {
    const ringIndex = Math.floor(entryIndex / 12);
    const ringStart = ringIndex * 12;
    // Spread each ring's chronological entries evenly around the full circle so
    // every cluster reads as a balanced ring instead of an off-centre arc.
    const ringCount = Math.min(12, entries.length - ringStart);
    const angle = ((entryIndex - ringStart) / ringCount) * Math.PI * 2;
    const radius = 4 + ringIndex * 3;
    positions.set(entry.id, {
      x: center.x + u[0] * Math.cos(angle) * radius + v[0] * Math.sin(angle) * radius + normal[0] * ringIndex * 0.5,
      y: center.y + u[1] * Math.cos(angle) * radius + v[1] * Math.sin(angle) * radius + normal[1] * ringIndex * 0.5,
      z: center.z + u[2] * Math.cos(angle) * radius + v[2] * Math.sin(angle) * radius + normal[2] * ringIndex * 0.5,
    });
  });
}

// Stable for the same records regardless of API ordering. Projects sit on a
// deterministically balanced shell around the presentation-only logbook hub;
// each cluster rings its entries chronologically in a plane facing outward,
// with ring spacing large enough that clusters never overlap. The shell is
// then rotated about y so that no project hides the hub in the opening view.
export function layoutConstellation(graph) {
  const projects = graph.nodes.filter((node) => node.type === 'project').sort((a, b) => compareIds(a.id, b.id));
  const clusters = new Map(projects.map((node) => [node.entityId, []]));
  for (const node of graph.nodes) if (node.type === 'entry') clusters.get(node.projectId)?.push(node);
  for (const entries of clusters.values()) entries.sort((a, b) => {
    const first = time(a), second = time(b);
    return first === second ? compareIds(a.id, b.id) : first < second ? -1 : 1;
  });
  const maxRadius = Math.max(4, ...projects.map((project) => clusterRadius(clusters.get(project.entityId).length)));
  const shell = projects.length < 2 ? 0
    : Math.max(12, ((maxRadius * 2 + 10) / 3.2) * Math.sqrt(projects.length), maxRadius + 6);
  const rawCenters = new Map();
  projects.forEach((project, index) => {
    if (projects.length === 1) return;
    const ratio = (index + 0.5) / projects.length;
    const shellY = 1 - 2 * ratio;
    const ring = Math.sqrt(Math.max(0, 1 - shellY * shellY));
    const theta = index * GOLDEN_ANGLE;
    const variance = 0.94 + 0.12 * unitHash(project.entityId);
    rawCenters.set(project.id, {
      x: Math.cos(theta) * ring * shell * variance,
      y: shellY * shell * 0.92 * variance,
      z: Math.sin(theta) * ring * shell * variance,
    });
  });
  // The opening camera looks down -z, so a project whose azimuth lands near
  // that axis would project on top of the hub at screen centre; the rotation
  // maximizing the nearest project's projected distance from the hub is
  // deterministic because it depends only on the sorted project set.
  const projectedGap = (angle) => {
    let nearest = Infinity;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    for (const center of rawCenters.values()) {
      const x = center.x * cos - center.z * sin;
      nearest = Math.min(nearest, Math.hypot(x, center.y));
    }
    return nearest;
  };
  let rotation = 0;
  if (rawCenters.size > 1) {
    let best = projectedGap(0);
    for (let step = 1; step < 72; step += 1) {
      const angle = (step / 72) * Math.PI * 2;
      const gap = projectedGap(angle);
      if (gap > best + 1e-6) { best = gap; rotation = angle; }
    }
  }
  const cosRotation = Math.cos(rotation), sinRotation = Math.sin(rotation);
  const positions = new Map();
  if (projects.length === 1) {
    // A lone project sits above the hub rather than dead ahead of it.
    const center = { x: 0, y: 8, z: Math.max(11, maxRadius + 5) };
    positions.set(projects[0].id, center);
    ringEntries(positions, center, clusters.get(projects[0].entityId));
  } else {
    for (const project of projects) {
      const raw = rawCenters.get(project.id);
      const center = {
        x: raw.x * cosRotation - raw.z * sinRotation,
        y: raw.y,
        z: raw.x * sinRotation + raw.z * cosRotation,
      };
      positions.set(project.id, center);
      ringEntries(positions, center, clusters.get(project.entityId));
    }
  }
  const hub = { id: HUB_ID, type: 'hub', entityId: null, projectId: null, label: HUB_LABEL, archived: false, record: null, position: { x: 0, y: 0, z: 0 } };
  const nodes = (projects.length ? [hub, ...graph.nodes] : [...graph.nodes]).sort((a, b) => compareIds(a.id, b.id))
    .map((node) => ({ ...node, position: positions.get(node.id) || { x: 0, y: 0, z: 0 } }));
  const edges = [...graph.edges, ...projects.map((project) => ({
    id: JSON.stringify(['grouping', HUB_ID, project.id]),
    type: 'grouping', source: HUB_ID, target: project.id, directed: false,
  }))].sort((a, b) => compareIds(a.id, b.id));
  return { ...graph, nodes, edges };
}
