import { act, cleanup, render, screen } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import { Color, Matrix4, Quaternion, Vector3 } from 'three';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ConstellationScene, { CameraRig, ContextLifecycle, EntryInstances, Universe } from './ConstellationScene';
import { cameraFrame, projectColor } from './constellationSceneModel';

const rig = vi.hoisted(() => ({ frames: [], three: null, controls: null, orbitProps: null, canvasProps: null }));

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, ...props }) => { rig.canvasProps = props; return <div data-testid="scene-canvas">{children}</div>; },
  useFrame: (callback, priority) => { rig.frames.push({ callback, priority }); },
  useThree: () => rig.three,
}));

vi.mock('@react-three/drei', () => ({
  Html: ({ children }) => <div data-testid="scene-label">{children}</div>,
  OrbitControls: forwardRef(function MockOrbitControls(props, ref) {
    rig.orbitProps = props;
    useImperativeHandle(ref, () => rig.controls);
    return null;
  }),
}));

const graphics = { matrices: [], colors: [], bounds: 0 };

beforeAll(() => {
  HTMLElement.prototype.setMatrixAt = function (index, matrix) { graphics.matrices[index] = matrix.clone(); };
  HTMLElement.prototype.setColorAt = function (index, color) { graphics.colors[index] = color.clone(); };
  HTMLElement.prototype.computeBoundingSphere = function () { graphics.bounds += 1; };
  Object.defineProperty(HTMLElement.prototype, 'instanceMatrix', { configurable: true, get() { return this.__instanceMatrix ??= { needsUpdate: false }; } });
  Object.defineProperty(HTMLElement.prototype, 'instanceColor', { configurable: true, get() { return this.__instanceColor ??= { needsUpdate: false }; } });
});

afterAll(() => {
  delete HTMLElement.prototype.setMatrixAt;
  delete HTMLElement.prototype.setColorAt;
  delete HTMLElement.prototype.computeBoundingSphere;
  delete HTMLElement.prototype.instanceMatrix;
  delete HTMLElement.prototype.instanceColor;
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// React DOM complains about the R3F props and element names (<mesh>, <instancedMesh>…)
// once the three renderer is mocked out; keep the test output quiet.
const DOM_NOISE = ['is using incorrect casing', 'is unrecognized in this browser', 'React does not recognize the', 'for a non-boolean attribute', 'Invalid value for prop'];
beforeEach(() => {
  const original = console.error;
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    if (typeof args[0] === 'string' && DOM_NOISE.some((message) => args[0].includes(message))) return;
    original(...args);
  });
  graphics.matrices.length = 0;
  graphics.colors.length = 0;
  graphics.bounds = 0;
  rig.frames.length = 0;
  rig.orbitProps = null;
  rig.canvasProps = null;
  rig.controls = { target: new Vector3(12, 4, 0), update: vi.fn() };
  rig.three = {
    camera: { position: new Vector3(0, -10, 45), far: 1000, updateProjectionMatrix: vi.fn() },
    size: { width: 1000, height: 600 },
    gl: { domElement: document.createElement('canvas') },
    invalidate: vi.fn(),
  };
});

const nodes = [
  { id: 'project:p1', type: 'project', entityId: 'p1', projectId: 'p1', label: 'Alpha', position: { x: 0, y: 0, z: 0 }, record: {} },
  { id: 'project:p2', type: 'project', entityId: 'p2', projectId: 'p2', label: 'Beta', position: { x: 12, y: 4, z: 0 }, record: {} },
  { id: 'entry:e1', type: 'entry', entityId: 'e1', projectId: 'p1', label: 'Read paper', position: { x: 1, y: 2, z: 1 }, record: {} },
  { id: 'entry:e2', type: 'entry', entityId: 'e2', projectId: 'p2', label: 'Draft chapter', position: { x: 13, y: 5, z: 1 }, record: {} },
];
const graph = { nodes, edges: [] };
const hubNode = { id: 'hub:logbook', type: 'hub', entityId: null, projectId: null, label: 'My Logbook', position: { x: 0, y: 24, z: 0 }, record: null };
const hubGraph = {
  nodes: [hubNode, ...nodes],
  edges: [
    { id: 'membership:e1', type: 'membership', source: 'project:p1', target: 'entry:e1', directed: false },
    { id: 'membership:e2', type: 'membership', source: 'project:p2', target: 'entry:e2', directed: false },
    { id: 'entry-reference:e1', type: 'entry-reference', source: 'entry:e1', target: 'entry:e2', directed: true },
    { id: 'entry-link:e1', type: 'entry-link', source: 'entry:e1', target: 'entry:e2', directed: false },
    { id: 'grouping:p1', type: 'grouping', source: 'hub:logbook', target: 'project:p1', directed: false },
    { id: 'grouping:p2', type: 'grouping', source: 'hub:logbook', target: 'project:p2', directed: false },
  ],
};
const aspect = 1000 / 600;

const reactProps = (element) => element[Object.keys(element).find((key) => key.startsWith('__reactProps'))];
const runFrames = (until, limit = 400) => {
  act(() => {
    for (let index = 0; index < limit && !until(); index += 1) rig.frames.at(-1).callback(null, 1);
  });
};
const batchesOf = (container) => [...container.querySelectorAll('linesegments')].map((element) => {
  const material = reactProps(element.querySelector('linebasicmaterial'));
  return { color: material.color, opacity: material.opacity, values: reactProps(element.querySelector('bufferattribute')).args[0] };
});
const groupAt = (container, position) => [...container.querySelectorAll('group')].find((element) => JSON.stringify(reactProps(element).position) === JSON.stringify(position));
const spriteOpacityAt = (container, position) => reactProps(groupAt(container, position).querySelector('spritematerial')).opacity;

describe('CameraRig', () => {
  it('jumps to the focused project on first commit, then flies to a new focus target', () => {
    const focusP1 = { projectId: 'p1' };
    const view = render(<CameraRig nodes={nodes} focusRequest={focusP1} command={null} reducedMotion={false} active />);
    const first = cameraFrame(nodes, 'p1', aspect);
    expect(rig.three.camera.position.toArray()).toEqual(first.position);
    expect(rig.controls.target.toArray()).toEqual(first.target);
    expect(rig.controls.update).toHaveBeenCalled();
    expect(rig.three.invalidate).toHaveBeenCalled();
    expect(rig.three.camera.far).toBeGreaterThanOrEqual(1000);
    expect(rig.orbitProps.enableDamping).toBe(true);

    view.rerender(<CameraRig nodes={nodes} focusRequest={{ projectId: 'p2' }} command={null} reducedMotion={false} active />);
    const second = cameraFrame(nodes, 'p2', aspect);
    expect(rig.three.camera.position.equals(new Vector3(...second.position))).toBe(false);
    act(() => rig.frames.at(-1).callback(null, 1));
    expect(rig.three.camera.position.equals(new Vector3(...second.position))).toBe(false);
    runFrames(() => rig.three.camera.position.equals(new Vector3(...second.position)));
    expect(rig.three.camera.position.toArray()).toEqual(second.position);
    expect(rig.controls.target.toArray()).toEqual(second.target);
  });

  it('applies toolbar commands relative to the current orbit target', () => {
    const focusP1 = { projectId: 'p1' };
    const view = render(<CameraRig nodes={nodes} focusRequest={focusP1} command={null} reducedMotion={false} active />);
    const frame = cameraFrame(nodes, 'p1', aspect);
    const target = new Vector3(...frame.target);

    view.rerender(<CameraRig nodes={nodes} focusRequest={focusP1} command={{ type: 'zoom-in', key: 1 }} reducedMotion={false} active />);
    const zoomedIn = target.clone().add(new Vector3(...frame.position).sub(target).multiplyScalar(0.8));
    expect(rig.three.camera.position.toArray()).toEqual(zoomedIn.toArray());

    view.rerender(<CameraRig nodes={nodes} focusRequest={focusP1} command={{ type: 'zoom-out', key: 2 }} reducedMotion={false} active />);
    const zoomedOut = target.clone().add(zoomedIn.clone().sub(target).multiplyScalar(1.25));
    expect(rig.three.camera.position.toArray()).toEqual(zoomedOut.toArray());

    view.rerender(<CameraRig nodes={nodes} focusRequest={focusP1} command={{ type: 'left', key: 3 }} reducedMotion={false} active />);
    const rotated = target.clone().add(zoomedOut.clone().sub(target).applyAxisAngle(new Vector3(0, 1, 0), -0.25));
    expect(rig.three.camera.position.toArray()).toEqual(rotated.toArray());

    const overview = cameraFrame(nodes, null, aspect);
    view.rerender(<CameraRig nodes={nodes} focusRequest={focusP1} command={{ type: 'reset', key: 4 }} reducedMotion={false} active />);
    runFrames(() => rig.three.camera.position.equals(new Vector3(...overview.position)));
    expect(rig.three.camera.position.toArray()).toEqual(overview.position);
    expect(rig.controls.target.toArray()).toEqual(overview.target);
  });

  it('snaps instantly and disables damping when reduced motion is preferred', () => {
    const focusP1 = { projectId: 'p1' };
    const view = render(<CameraRig nodes={nodes} focusRequest={focusP1} command={null} reducedMotion active />);
    expect(rig.orbitProps.enableDamping).toBe(false);

    view.rerender(<CameraRig nodes={nodes} focusRequest={{ projectId: 'p2' }} command={null} reducedMotion active />);
    const second = cameraFrame(nodes, 'p2', aspect);
    expect(rig.three.camera.position.toArray()).toEqual(second.position);
    expect(rig.controls.target.toArray()).toEqual(second.target);

    const overview = cameraFrame(nodes, null, aspect);
    view.rerender(<CameraRig nodes={nodes} focusRequest={{ projectId: 'p2' }} command={{ type: 'reset', key: 5 }} reducedMotion active />);
    expect(rig.three.camera.position.toArray()).toEqual(overview.position);
  });
});

describe('EntryInstances', () => {
  const entries = [nodes[2], nodes[3]];

  it('writes instance transforms and colours, highlighting the selected entry', () => {
    render(<EntryInstances entries={entries} selectedId="entry:e2" onSelect={vi.fn()} />);
    expect(graphics.bounds).toBeGreaterThan(0);
    const transformOf = (matrix) => {
      const translation = new Vector3(), scale = new Vector3();
      new Matrix4().copy(matrix).decompose(translation, new Quaternion(), scale);
      return { translation, scale };
    };
    const plain = transformOf(graphics.matrices[0]);
    expect(plain.translation.toArray()).toEqual([1, 2, 1]);
    expect(plain.scale.x).toBeCloseTo(0.24);
    expect(transformOf(graphics.matrices[1]).scale.x).toBeCloseTo(0.42);
    expect(graphics.colors[0].getHexString()).toBe(projectColor('p1').slice(1));
    expect(graphics.colors[1].getHexString()).toBe('ffffff');
  });

  it('selects entries on click but ignores drags and empty misses', () => {
    const onSelect = vi.fn();
    const { container } = render(<EntryInstances entries={entries} selectedId={null} onSelect={onSelect} />);
    const props = reactProps(container.querySelector('instancedmesh'));
    props.onClick({ delta: 0, instanceId: 1, stopPropagation: vi.fn() });
    expect(onSelect).toHaveBeenCalledWith('entry:e2');
    props.onClick({ delta: 8, instanceId: 0, stopPropagation: vi.fn() });
    props.onClick({ delta: 0, instanceId: undefined, stopPropagation: vi.fn() });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('mirrors hover state on the page cursor', () => {
    const { container } = render(<EntryInstances entries={entries} selectedId={null} onSelect={vi.fn()} />);
    const props = reactProps(container.querySelector('instancedmesh'));
    props.onPointerOver({ stopPropagation: vi.fn() });
    expect(document.body.style.cursor).toBe('pointer');
    props.onPointerOut();
    expect(document.body.style.cursor).toBe('');
  });

  it('dims entries outside the focused project while keeping the focused cluster at full strength', () => {
    render(<EntryInstances entries={entries} selectedId={null} focusProjectId="p2" onSelect={vi.fn()} />);
    expect(graphics.colors[0].equals(new Color(projectColor('p1')).multiplyScalar(0.35))).toBe(true);
    expect(graphics.colors[1].getHexString()).toBe(projectColor('p2').slice(1));
  });
});

describe('ContextLifecycle', () => {
  it('reports context loss and detaches the listener on unmount', () => {
    const canvas = rig.three.gl.domElement;
    const add = vi.spyOn(canvas, 'addEventListener');
    const remove = vi.spyOn(canvas, 'removeEventListener');
    const onFailure = vi.fn();
    const view = render(<ContextLifecycle active onFailure={onFailure} />);
    expect(add).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
    const handler = add.mock.calls.find(([type]) => type === 'webglcontextlost')[1];
    const event = { preventDefault: vi.fn() };
    handler(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(remove).toHaveBeenCalledWith('webglcontextlost', handler);
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it('invalidates the render loop only while active', () => {
    const view = render(<ContextLifecycle active={false} onFailure={vi.fn()} />);
    expect(rig.three.invalidate).not.toHaveBeenCalled();
    view.rerender(<ContextLifecycle active onFailure={vi.fn()} />);
    expect(rig.three.invalidate).toHaveBeenCalled();
  });
});

describe('Universe', () => {
  const renderUniverse = (overrides = {}) => render(<Universe graph={graph} selectedId={null} onSelect={vi.fn()} focusRequest={null} command={null} reducedMotion={false} active onFailure={vi.fn()} {...overrides} />);

  it('renders project labels plus a label for the selected entry only', () => {
    renderUniverse({ selectedId: 'entry:e1' });
    expect(screen.getByText('Alpha')).toHaveClass('constellation-node-label');
    expect(screen.getByText('Beta')).toHaveClass('constellation-node-label');
    expect(screen.getByText('Read paper')).toHaveClass('constellation-node-label', 'is-entry');
    expect(screen.queryByText('Draft chapter')).not.toBeInTheDocument();
  });

  it('highlights the selected project label', () => {
    renderUniverse({ selectedId: 'project:p1' });
    expect(screen.getByText('Alpha')).toHaveClass('is-selected');
    expect(screen.queryByText('Read paper')).not.toBeInTheDocument();
  });

  it('selects projects on click while ignoring drags', () => {
    const onSelect = vi.fn();
    const { container } = renderUniverse({ onSelect });
    const clickable = [...container.querySelectorAll('mesh')].map(reactProps).filter((props) => props?.onClick);
    expect(clickable).toHaveLength(2);
    clickable[0].onClick({ delta: 0, stopPropagation: vi.fn() });
    expect(onSelect).toHaveBeenCalledWith('project:p1');
    clickable[0].onClick({ delta: 9, stopPropagation: vi.fn() });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('restores the page cursor when the scene unmounts', () => {
    const { container, unmount } = renderUniverse();
    const props = [...container.querySelectorAll('mesh')].map(reactProps).find((value) => value?.onPointerOver);
    props.onPointerOver({ stopPropagation: vi.fn() });
    expect(document.body.style.cursor).toBe('pointer');
    unmount();
    expect(document.body.style.cursor).toBe('');
  });
});

describe('Universe relationship languages', () => {
  const renderHubUniverse = (overrides = {}) => render(<Universe graph={hubGraph} selectedId={null} onSelect={vi.fn()} focusRequest={null} command={null} reducedMotion={false} active onFailure={vi.fn()} {...overrides} />);

  it('renders the synthetic logbook hub and selects it on click', () => {
    const onSelect = vi.fn();
    const { container } = renderHubUniverse({ onSelect });
    expect(screen.getByText('My Logbook')).toHaveClass('constellation-node-label', 'is-hub');
    const clickable = reactProps(groupAt(container, [0, 24, 0]).querySelector('mesh'));
    clickable.onClick({ delta: 0, stopPropagation: vi.fn() });
    expect(onSelect).toHaveBeenCalledWith('hub:logbook');
    clickable.onClick({ delta: 9, stopPropagation: vi.fn() });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('draws one batch per relationship language with distinct colours and dashed grouping lines', () => {
    const { container } = renderHubUniverse();
    const batches = new Map(batchesOf(container).map((batch) => [batch.color, batch]));
    expect([...batches.keys()].sort()).toEqual(['#5976a5', '#7ce0d0', '#7d8fd8', '#acb1ff']);
    expect(batches.get('#7d8fd8')).toMatchObject({ opacity: 0.42 });
    expect(batches.get('#5976a5')).toMatchObject({ opacity: 0.2 });
    expect(batches.get('#acb1ff')).toMatchObject({ opacity: 0.62 });
    expect(batches.get('#7ce0d0')).toMatchObject({ opacity: 0.5 });
    // Grouping edges expand into short dashes, so each renders many segments rather than one line.
    expect(batches.get('#7d8fd8').values.length).toBeGreaterThan(2 * 6);
    expect(batches.get('#7d8fd8').values.length % 6).toBe(0);
  });

  it('emphasises the focused project membership and dims the rest of the scene', () => {
    const { container } = renderHubUniverse({ selectedId: 'project:p1' });
    const batches = new Map(batchesOf(container).map((batch) => [batch.color, batch]));
    expect(batches.get('#8fa9ff')).toMatchObject({ opacity: 0.6 });
    expect(batches.get('#5976a5')).toMatchObject({ opacity: 0.1 });
    expect(screen.getByText('Alpha')).toHaveClass('is-selected');
    expect(screen.getByText('Beta')).toHaveClass('is-dimmed');
    expect(spriteOpacityAt(container, [12, 4, 0])).toBe(0.16);
    expect(spriteOpacityAt(container, [0, 0, 0])).toBe(0.95);
  });
});

describe('ConstellationScene', () => {
  it('renders through the R3F canvas and pauses the frameloop when inactive', () => {
    const view = render(<ConstellationScene graph={graph} selectedId={null} onSelect={vi.fn()} focusRequest={null} command={null} reducedMotion={false} active onFailure={vi.fn()} />);
    expect(rig.canvasProps.frameloop).toBe('demand');
    expect(rig.canvasProps.dpr).toEqual([1, 1.5]);
    expect(rig.canvasProps.camera).toMatchObject({ fov: 42, near: 0.1, far: 10000 });
    expect(rig.canvasProps.fallback).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    view.rerender(<ConstellationScene graph={graph} selectedId={null} onSelect={vi.fn()} focusRequest={null} command={null} reducedMotion={false} active={false} onFailure={vi.fn()} />);
    expect(rig.canvasProps.frameloop).toBe('never');
  });
});
