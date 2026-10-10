import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { AdditiveBlending, Color, DataTexture, Object3D, RGBAFormat, Vector3 } from 'three';
import { cameraFrame, edgeCategory, edgePositions, projectColor } from './constellationSceneModel';

function glowTexture() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
    const offset = (y * size + x) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = 255;
    data[offset + 3] = Math.round(Math.pow(Math.max(0, 1 - radius), 3) * 190);
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

export function CameraRig({ nodes, focusRequest, command, reducedMotion, active }) {
  const controls = useRef();
  const flight = useRef(null);
  const first = useRef(true);
  const { camera, size, invalidate } = useThree();
  const overview = useMemo(() => cameraFrame(nodes, null, size.width / size.height), [nodes, size.width, size.height]);
  useEffect(() => {
    if (!controls.current) return;
    const frame = cameraFrame(nodes, focusRequest?.projectId, size.width / size.height);
    camera.far = Math.max(1000, overview.distance * 6);
    camera.updateProjectionMatrix();
    flight.current = { position: new Vector3(...frame.position), target: new Vector3(...frame.target) };
    if (first.current || reducedMotion) {
      camera.position.copy(flight.current.position);
      controls.current.target.copy(flight.current.target);
      controls.current.update();
      flight.current = null;
    }
    first.current = false;
    invalidate();
  }, [nodes, focusRequest, reducedMotion, size.width, size.height, overview.distance, camera, invalidate]);

  useEffect(() => {
    if (!command || !controls.current) return;
    if (command.type === 'reset') {
      flight.current = { position: new Vector3(...overview.position), target: new Vector3(...overview.target) };
      if (reducedMotion) {
        camera.position.copy(flight.current.position);
        controls.current.target.copy(flight.current.target);
        flight.current = null;
        controls.current.update();
      }
      invalidate();
      return;
    }
    const offset = camera.position.clone().sub(controls.current.target);
    if (command.type === 'zoom-in') offset.multiplyScalar(0.8);
    if (command.type === 'zoom-out') offset.multiplyScalar(1.25);
    if (command.type === 'left' || command.type === 'right') offset.applyAxisAngle(new Vector3(0, 1, 0), command.type === 'left' ? -0.25 : 0.25);
    camera.position.copy(controls.current.target).add(offset);
    flight.current = null;
    controls.current.update();
    invalidate();
  }, [command, camera, invalidate, overview, reducedMotion]);

  useFrame((_, delta) => {
    if (!flight.current || !controls.current || !active) return;
    const amount = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.05) * 7);
    camera.position.lerp(flight.current.position, amount);
    controls.current.target.lerp(flight.current.target, amount);
    if (camera.position.distanceTo(flight.current.position) < 0.01 && controls.current.target.distanceTo(flight.current.target) < 0.01) {
      camera.position.copy(flight.current.position);
      controls.current.target.copy(flight.current.target);
      flight.current = null;
    } else invalidate();
    controls.current.update();
  }, -2);
  return <OrbitControls ref={controls} makeDefault enabled={active} enableDamping={!reducedMotion} dampingFactor={0.09} minDistance={2} maxDistance={overview.distance * 3} onStart={() => { flight.current = null; }} />;
}

export function EntryInstances({ entries, selectedId, focusProjectId, onSelect }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const transform = new Object3D();
    entries.forEach((entry, index) => {
      transform.position.set(entry.position.x, entry.position.y, entry.position.z);
      transform.scale.setScalar(entry.id === selectedId ? 0.42 : 0.24);
      transform.updateMatrix();
      ref.current.setMatrixAt(index, transform.matrix);
      const color = new Color(entry.id === selectedId ? '#ffffff' : projectColor(entry.projectId));
      if (entry.id !== selectedId && focusProjectId && entry.projectId !== focusProjectId) color.multiplyScalar(0.35);
      ref.current.setColorAt(index, color);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [entries, selectedId, focusProjectId]);
  return <instancedMesh ref={ref} args={[undefined, undefined, entries.length]}
    onClick={(event) => {
      if (event.delta > 4 || event.instanceId === undefined) return;
      event.stopPropagation(); onSelect(entries[event.instanceId].id);
    }}
    onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
    onPointerOut={() => { document.body.style.cursor = ''; }}
  >
    <sphereGeometry args={[1, 12, 10]} />
    <meshBasicMaterial toneMapped={false} />
  </instancedMesh>;
}

function LineBatch({ edges, nodes, category, color, opacity }) {
  const positions = useMemo(() => edgePositions(edges, nodes, category), [edges, nodes, category]);
  if (positions.length === 0) return null;
  return <lineSegments raycast={() => null}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
  </lineSegments>;
}

export function ContextLifecycle({ onFailure, active }) {
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const lost = (event) => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => gl.domElement.removeEventListener('webglcontextlost', lost);
  }, [gl, onFailure]);
  useEffect(() => { if (active) invalidate(); }, [active, invalidate]);
  return null;
}

export function Universe({ graph, selectedId, onSelect, focusRequest, command, reducedMotion, active, onFailure }) {
  const texture = useMemo(glowTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  // drei Html binds its portal to R3F's event connection, which is wired up only after
  // the scene's first commit; mounting labels one commit later keeps that target stable.
  // Html renders label content through its own nested React root, and StrictMode's
  // dev-only remount sweep can leave the first such portal empty; re-keying every
  // label once after mount recreates them through a plain update, which renders reliably.
  const [labelsReady, setLabelsReady] = useState(false);
  const [labelEpoch, setLabelEpoch] = useState(0);
  useEffect(() => {
    setLabelsReady(true);
    const frame = requestAnimationFrame(() => setLabelEpoch((value) => (value ? value : 1)));
    return () => cancelAnimationFrame(frame);
  }, []);
  const hub = useMemo(() => graph.nodes.find((node) => node.type === 'hub'), [graph.nodes]);
  const projects = useMemo(() => graph.nodes.filter((node) => node.type === 'project'), [graph.nodes]);
  const entries = useMemo(() => graph.nodes.filter((node) => node.type === 'entry'), [graph.nodes]);
  const selected = graph.nodes.find((node) => node.id === selectedId);
  const focusProjectId = selected?.projectId || null;
  const batches = useMemo(() => {
    const grouping = [], membership = [], references = [], links = [];
    for (const edge of graph.edges) {
      const category = edgeCategory(edge.type);
      (category === 'grouping' ? grouping : category === 'membership' ? membership : category === 'link' ? links : references).push(edge);
    }
    const focusKey = focusProjectId ? `project:${focusProjectId}` : null;
    return {
      grouping,
      focusedMembership: focusKey ? membership.filter((edge) => edge.source === focusKey) : [],
      otherMembership: focusKey ? membership.filter((edge) => edge.source !== focusKey) : membership,
      references,
      links,
    };
  }, [graph.edges, focusProjectId]);
  return <>
    <ambientLight intensity={0.7} />
    <directionalLight position={[-10, 12, 20]} intensity={2.5} color="#c7d9ff" />
    <directionalLight position={[15, -5, -10]} intensity={1.5} color="#8760ff" />
    <LineBatch edges={batches.grouping} nodes={graph.nodes} category="grouping" color="#7d8fd8" opacity={0.42} />
    <LineBatch edges={batches.focusedMembership} nodes={graph.nodes} category="membership" color="#8fa9ff" opacity={0.6} />
    <LineBatch edges={batches.otherMembership} nodes={graph.nodes} category="membership" color="#5976a5" opacity={batches.focusedMembership.length ? 0.1 : 0.2} />
    <LineBatch edges={batches.references} nodes={graph.nodes} category="reference" color="#acb1ff" opacity={0.62} />
    <LineBatch edges={batches.links} nodes={graph.nodes} category="link" color="#7ce0d0" opacity={0.5} />
    {hub && (() => {
      const chosen = hub.id === selectedId;
      return <group position={[hub.position.x, hub.position.y, hub.position.z]}>
        <sprite scale={chosen ? [20, 20, 1] : [17, 17, 1]} raycast={() => null}>
          <spriteMaterial map={texture} color="#cdd9ff" blending={AdditiveBlending} transparent opacity={chosen ? 0.95 : 0.8} depthWrite={false} />
        </sprite>
        <mesh
          onClick={(event) => { if (event.delta > 4) return; event.stopPropagation(); onSelect(hub.id); }}
          onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
        >
          <sphereGeometry args={[2.15, 32, 24]} />
          <meshStandardMaterial color="#e9efff" emissive="#8fa4ff" emissiveIntensity={chosen ? 0.75 : 0.4} roughness={0.22} metalness={0.35} />
        </mesh>
        <mesh rotation={[Math.PI / 2.2, 0.4, 0.1]} raycast={() => null}>
          <torusGeometry args={[3.35, 0.02, 4, 96]} />
          <meshBasicMaterial color="#9fb6ff" transparent opacity={chosen ? 0.75 : 0.4} />
        </mesh>
        <mesh rotation={[Math.PI / 1.7, -0.5, 0.5]} raycast={() => null}>
          <torusGeometry args={[4.15, 0.012, 4, 96]} />
          <meshBasicMaterial color="#7d8fd8" transparent opacity={chosen ? 0.5 : 0.22} />
        </mesh>
        {labelsReady && <Html key={`hub-label-${labelEpoch}`} center position={[0, -4.6, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
          <span aria-hidden="true" className={`constellation-node-label is-hub${chosen ? ' is-selected' : ''}`}>{hub.label}</span>
        </Html>}
      </group>;
    })()}
    {projects.map((project) => {
      const color = projectColor(project.entityId), chosen = project.id === selectedId;
      const dimmed = Boolean(focusProjectId) && project.entityId !== focusProjectId;
      return <group key={project.id} position={[project.position.x, project.position.y, project.position.z]}>
        <sprite scale={chosen ? [11, 11, 1] : [8.5, 8.5, 1]} raycast={() => null}>
          <spriteMaterial map={texture} color={color} blending={AdditiveBlending} transparent opacity={chosen ? 0.95 : dimmed ? 0.16 : 0.72} depthWrite={false} />
        </sprite>
        <mesh
          onClick={(event) => { if (event.delta > 4) return; event.stopPropagation(); onSelect(project.id); }}
          onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = ''; }}
        >
          <sphereGeometry args={[chosen ? 1.55 : 1.35, 32, 24]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={chosen ? 0.5 : dimmed ? 0.05 : 0.24} roughness={0.29} metalness={0.45} />
        </mesh>
        <mesh rotation={[Math.PI / 2.5, 0.3, 0.2]} raycast={() => null}>
          <torusGeometry args={[1.95, 0.012, 4, 80]} />
          <meshBasicMaterial color={color} transparent opacity={chosen ? 0.85 : dimmed ? 0.07 : 0.34} />
        </mesh>
        {labelsReady && <Html key={`project-label-${project.id}-${labelEpoch}`} center position={[0, -2.35, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
          <span aria-hidden="true" className={`constellation-node-label${chosen ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}`}>{project.label}</span>
        </Html>}
      </group>;
    })}
    {entries.length > 0 && <EntryInstances entries={entries} selectedId={selectedId} focusProjectId={focusProjectId} onSelect={onSelect} />}
    {selected?.type === 'entry' && <group position={[selected.position.x, selected.position.y, selected.position.z]}>
      <sprite scale={[3, 3, 1]} raycast={() => null}>
        <spriteMaterial map={texture} color="#b6eaff" blending={AdditiveBlending} transparent depthWrite={false} />
      </sprite>
      {labelsReady && <Html key={`entry-label-${labelEpoch}`} center position={[0, -1.15, 0]} style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
        <span aria-hidden="true" className="constellation-node-label is-entry">{selected.label}</span>
      </Html>}
    </group>}
    <CameraRig nodes={graph.nodes} focusRequest={focusRequest} command={command} reducedMotion={reducedMotion} active={active} />
    <ContextLifecycle active={active} onFailure={onFailure} />
  </>;
}

export default function ConstellationScene(props) {
  return <Canvas frameloop={props.active ? 'demand' : 'never'} dpr={[1, 1.5]} camera={{ position: [0, -10, 45], fov: 42, near: 0.1, far: 10000 }} gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }} fallback={<p>3D is unavailable. Use the record explorer below.</p>}>
    <Universe {...props} />
  </Canvas>;
}
