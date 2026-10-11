import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConstellationViewport, { SceneErrorBoundary, supportsWebGL } from './ConstellationViewport';

const rig = vi.hoisted(() => ({ sceneProps: null, observers: [], loseContext: null }));

vi.mock('./ConstellationScene', () => ({
  default: (props) => { rig.sceneProps = props; return <p data-testid="scene-stub">scene</p>; },
}));

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
    rig.observers.push(this);
  }
}

const graph = { nodes: [], edges: [], hiddenNodes: 0, hiddenEdges: 0 };
const baseProps = { graph, selectedId: null, onSelect: () => {}, focusRequest: null };
const defaultMatchMedia = window.matchMedia;

function enableWebGL() {
  vi.stubGlobal('WebGL2RenderingContext', class WebGL2RenderingContext {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type) => (
    type === 'webgl2' ? { getExtension: () => ({ loseContext: rig.loseContext }) } : null
  ));
}

beforeEach(() => {
  rig.sceneProps = null;
  rig.observers.length = 0;
  rig.loseContext = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.matchMedia = defaultMatchMedia;
  delete document.hidden;
});

describe('supportsWebGL', () => {
  it('reports unsupported when the browser exposes no WebGL2 implementation', () => {
    vi.stubGlobal('WebGL2RenderingContext', undefined);
    expect(supportsWebGL()).toBe(false);
  });

  it('probes a webgl2 context and releases it again', () => {
    enableWebGL();
    expect(supportsWebGL()).toBe(true);
    expect(rig.loseContext).toHaveBeenCalled();
  });

  it('treats a throwing context factory as unsupported', () => {
    vi.stubGlobal('WebGL2RenderingContext', class WebGL2RenderingContext {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => { throw new Error('no context'); });
    expect(supportsWebGL()).toBe(false);
  });
});

describe('ConstellationViewport', () => {
  it('suspends until the lazy scene loads, then forwards toolbar commands and activity', async () => {
    const user = userEvent.setup();
    enableWebGL();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    render(<ConstellationViewport {...baseProps} />);
    expect(screen.getByText('Preparing your universe…')).toBeInTheDocument();

    await screen.findByTestId('scene-stub');
    expect(rig.sceneProps.graph).toBe(graph);
    expect(rig.sceneProps.active).toBe(true);
    expect(rig.sceneProps.reducedMotion).toBe(false);
    expect(rig.sceneProps.command).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(rig.sceneProps.command).toMatchObject({ type: 'zoom-in' });
    await user.click(screen.getByRole('button', { name: 'Frame all' }));
    expect(rig.sceneProps.command).toMatchObject({ type: 'reset' });
  });

  it('explains the fallback when WebGL is unavailable and renders no scene', async () => {
    vi.stubGlobal('WebGL2RenderingContext', undefined);
    render(<ConstellationViewport {...baseProps} />);
    expect(await screen.findByText('Your logbook, still connected')).toBeInTheDocument();
    expect(screen.getByText(/3D is unavailable on this device or session\./)).toBeInTheDocument();
    expect(screen.queryByTestId('scene-stub')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zoom in' })).not.toBeInTheDocument();
  });

  it('replaces the scene with the fallback when the renderer reports failure', async () => {
    enableWebGL();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    render(<ConstellationViewport {...baseProps} />);
    await screen.findByTestId('scene-stub');
    act(() => rig.sceneProps.onFailure());
    expect(await screen.findByText('Your logbook, still connected')).toBeInTheDocument();
    expect(screen.queryByTestId('scene-stub')).not.toBeInTheDocument();
  });

  it('pauses activity when the scene leaves the viewport or the tab is hidden, and cleans up on unmount', async () => {
    enableWebGL();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    const removeListener = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<ConstellationViewport {...baseProps} />);
    await screen.findByTestId('scene-stub');
    const observer = rig.observers.at(-1);
    expect(observer.observe).toHaveBeenCalled();

    act(() => observer.callback([{ isIntersecting: false }]));
    expect(rig.sceneProps.active).toBe(false);
    act(() => observer.callback([{ isIntersecting: true }]));
    expect(rig.sceneProps.active).toBe(true);

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(rig.sceneProps.active).toBe(false);

    unmount();
    expect(observer.disconnect).toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('honours prefers-reduced-motion and detaches its media listener', async () => {
    enableWebGL();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    const removeEventListener = vi.fn();
    window.matchMedia = (query) => ({
      matches: query === '(prefers-reduced-motion: reduce)', media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener, dispatchEvent: vi.fn(),
    });
    const { unmount } = render(<ConstellationViewport {...baseProps} />);
    await screen.findByTestId('scene-stub');
    expect(rig.sceneProps.reducedMotion).toBe(true);
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('surfaces the project whose entries are loading, and clears it afterwards', async () => {
    enableWebGL();
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    const { rerender } = render(<ConstellationViewport {...baseProps} />);
    await screen.findByTestId('scene-stub');
    expect(screen.queryByText(/Loading entries for/)).not.toBeInTheDocument();
    rerender(<ConstellationViewport {...baseProps} loadingLabel="Research" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading entries for Research…');
    rerender(<ConstellationViewport {...baseProps} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the alert instead of crashing when the scene throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onFailure = vi.fn();
    function Broken() { throw new Error('renderer exploded'); }
    render(<SceneErrorBoundary onFailure={onFailure}><Broken /></SceneErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('3D could not start. Your records remain available below.');
    expect(onFailure).toHaveBeenCalled();
  });
});
