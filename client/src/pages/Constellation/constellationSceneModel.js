import { compareIds } from './constellationGraph';

export const SCENE_LIMITS = { projects: 20, entries: 300, edges: 600 };
const PALETTE = ['#8295ff', '#56cee9', '#ae91ff', '#669fff', '#7ce0d0'];
export const EDGE_LABELS = {
  grouping: 'Logbook grouping (visual only)',
  membership: 'Project membership',
  'project-reference': 'Project reference',
  'entry-project-reference': 'Entry-to-project reference',
  'entry-reference': 'Entry reference',
  'entry-link': 'Linked entries',
};

export function projectColor(id) {
  let hash = 0;
  for (const character of String(id)) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

// Four visual languages: the synthetic logbook grouping, real project-entry
// membership, explicit directed references and explicit undirected links.
export function edgeCategory(type) {
  if (type === 'grouping') return 'grouping';
  if (type === 'membership') return 'membership';
  if (type === 'entry-link') return 'link';
  return 'reference';
}

export function selectSceneGraph(graph, selectedId, connectionsOnly = false) {
  const selected = graph.nodes.find((node) => node.id === selectedId);
  const hub = graph.nodes.find((node) => node.type === 'hub');
  const priority = (a, b) => Number(b.id === selectedId) - Number(a.id === selectedId)
    || Number(b.projectId === selected?.projectId) - Number(a.projectId === selected?.projectId)
    || compareIds(a.id, b.id);
  const projects = graph.nodes.filter((node) => node.type === 'project').sort(priority).slice(0, SCENE_LIMITS.projects);
  const projectIds = new Set(projects.map((node) => node.entityId));
  const entries = graph.nodes.filter((node) => node.type === 'entry' && projectIds.has(node.projectId)).sort(priority).slice(0, SCENE_LIMITS.entries);
  const nodes = [...(hub ? [hub] : []), ...projects, ...entries];
  const ids = new Set(nodes.map((node) => node.id));
  const focusIds = new Set(selected?.type === 'project'
    ? nodes.filter((node) => node.projectId === selected.projectId).map((node) => node.id)
    : [selectedId]);
  const eligible = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)
    && (!connectionsOnly || !selected || focusIds.has(edge.source) || focusIds.has(edge.target)));
  // Preserve explicit relations first when a dense graph exceeds the edge budget.
  const rank = (type) => type === 'membership' ? 1 : type === 'grouping' ? 2 : 0;
  const edges = [...eligible].sort((a, b) => rank(a.type) - rank(b.type) || compareIds(a.id, b.id)).slice(0, SCENE_LIMITS.edges);
  return { nodes, edges, hiddenNodes: graph.nodes.length - nodes.length, hiddenEdges: eligible.length - edges.length };
}

export function cameraFrame(nodes, projectId, aspect = 1) {
  const focused = projectId ? nodes.filter((node) => node.projectId === projectId) : nodes;
  const points = focused.length ? focused : nodes;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const node of points) ['x', 'y', 'z'].forEach((axis, index) => {
    min[index] = Math.min(min[index], node.position[axis] - 2);
    max[index] = Math.max(max[index], node.position[axis] + 2);
  });
  const target = points.length ? min.map((value, index) => (value + max[index]) / 2) : [0, 0, 0];
  const halfFov = Math.atan(Math.tan(42 * Math.PI / 360) * Math.min(1, Math.max(0.1, aspect)));
  if (!points.length) {
    const distance = (8 / Math.sin(halfFov)) * 1.12;
    return { target, distance, position: [target[0], target[1] - distance * 0.22, target[2] + distance * 0.976] };
  }
  // The overview keeps the tilted +z viewpoint the shell is composed around.
  // A focused cluster is approached along its outward normal — the plane its
  // entry rings lie in — so the entries face the camera instead of collapsing
  // edge-on behind the project core. The normal is turned a quarter of a right
  // angle about y so the hub, which sits opposite the cluster, stays off the
  // view axis instead of landing on top of the focused core; the lift keeps a
  // little vertical depth in the composition.
  const hub = nodes.find((node) => node.type === 'hub');
  const outward = hub && projectId
    ? [target[0] - hub.position.x, target[1] - hub.position.y, target[2] - hub.position.z]
    : null;
  const reach = outward ? Math.hypot(...outward) : 0;
  let offset = [0, -0.22, 0.976];
  if (reach > 1e-6) {
    const turn = 0.44, cos = Math.cos(turn), sin = Math.sin(turn);
    const lift = [outward[0] * cos - outward[2] * sin, outward[1] + reach * 0.32, outward[0] * sin + outward[2] * cos];
    const length = Math.hypot(...lift) || 1;
    offset = [lift[0] / length, lift[1] / length, lift[2] / length];
  }
  // Solve the distance against the real projection from that viewpoint:
  // framing on the bounding-box diagonal leaves sparse shells floating tiny in
  // wide viewports, and hides edge-on entry rings inside the margins.
  const tanV = Math.tan(42 * Math.PI / 360), tanH = tanV * Math.max(0.1, aspect);
  const radius = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / 2;
  const viewLength = Math.hypot(...offset) || 1;
  const forward = [-offset[0] / viewLength, -offset[1] / viewLength, -offset[2] / viewLength];
  const right = [-forward[2], 0, forward[0]];
  const rightLength = Math.hypot(...right);
  if (rightLength > 1e-6) { right[0] /= rightLength; right[2] /= rightLength; } else { right[0] = 1; right[2] = 0; }
  const up = [forward[1] * right[2] - forward[2] * right[1], forward[2] * right[0] - forward[0] * right[2], forward[0] * right[1] - forward[1] * right[0]];
  let distance = Math.max(16, radius * 2.5);
  for (let pass = 0; pass < 6; pass += 1) {
    const origin = [target[0] + offset[0] * distance, target[1] + offset[1] * distance, target[2] + offset[2] * distance];
    let fill = 0;
    for (const node of points) {
      const rel = [node.position.x - origin[0], node.position.y - origin[1], node.position.z - origin[2]];
      const depth = rel[0] * forward[0] + rel[1] * forward[1] + rel[2] * forward[2];
      if (depth <= 0.001) { fill = Infinity; break; }
      const x = Math.abs(rel[0] * right[0] + rel[2] * right[2]) / (depth * tanH);
      const y = Math.abs(rel[0] * up[0] + rel[1] * up[1] + rel[2] * up[2]) / (depth * tanV);
      fill = Math.max(fill, x, y);
    }
    if (!Number.isFinite(fill)) break;
    if (fill <= 0.0001) { distance = 10; break; }
    distance = Math.max(10, Math.min(400, distance * fill / 0.8));
  }
  return { target, distance, position: [target[0] + offset[0] * distance, target[1] + offset[1] * distance, target[2] + offset[2] * distance] };
}

// Batched line segments per category. Arrowheads mark the public API direction
// of explicit directed references only; undirected links and the synthetic
// grouping lines never receive one. Grouping lines render dashed so they cannot
// be mistaken for stored relationships.
export function edgePositions(edges, nodes, category) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const values = [];
  for (const edge of edges) {
    if (edgeCategory(edge.type) !== category) continue;
    const source = byId.get(edge.source), target = byId.get(edge.target);
    if (!source || !target) continue;
    const a = [source.position.x, source.position.y, source.position.z];
    const b = [target.position.x, target.position.y, target.position.z];
    if (category === 'grouping') {
      const d = b.map((value, index) => value - a[index]);
      const length = Math.hypot(...d);
      if (length < 0.001) continue;
      const dashes = Math.max(4, Math.min(48, Math.round(length / 2)));
      for (let dash = 0; dash < dashes; dash += 1) {
        const from = (dash + 0.08) / dashes, to = (dash + 0.66) / dashes;
        values.push(...a.map((value, index) => value + d[index] * from), ...a.map((value, index) => value + d[index] * to));
      }
      continue;
    }
    values.push(...a, ...b);
    if (category === 'reference' && edge.directed) {
      const d = b.map((value, index) => value - a[index]), length = Math.hypot(...d);
      if (length < 0.001) continue;
      const u = d.map((value) => value / length);
      const side = Math.hypot(u[0], u[1]) > 0.001 ? [-u[1], u[0], 0] : [1, 0, 0];
      const scale = Math.hypot(...side);
      const inset = Math.min(length * 0.3, target.type === 'project' ? 1.8 : 0.55);
      const tip = b.map((value, index) => value - u[index] * inset);
      for (const sign of [-1, 1]) values.push(...tip, ...tip.map((value, index) => value - u[index] * 0.5 + side[index] / scale * sign * 0.22));
    }
  }
  return new Float32Array(values);
}
