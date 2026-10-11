import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

const Scene = lazy(() => import('./ConstellationScene'));

export function supportsWebGL() {
  if (!window.WebGL2RenderingContext) return false;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch { return false; }
}

export class SceneErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure?.(); }
  render() { return this.state.failed ? <p role="alert">3D could not start. Your records remain available below.</p> : this.props.children; }
}

export default function ConstellationViewport(props) {
  const container = useRef();
  const [supported, setSupported] = useState(null);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [visible, setVisible] = useState(!document.hidden);
  const [inView, setInView] = useState(true);
  const [command, setCommand] = useState(null);
  const fail = useCallback(() => setFailed(true), []);
  useEffect(() => {
    setSupported(supportsWebGL());
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => setReducedMotion(Boolean(media?.matches));
    const visibility = () => setVisible(!document.hidden);
    media?.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (container.current) observer?.observe(container.current);
    return () => { media?.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); observer?.disconnect(); };
  }, []);
  return <div className="constellation-viewport" ref={container}>
    {supported && !failed ? <>
      <div className="constellation-canvas" role="group" aria-label="Interactive project universe" aria-describedby="constellation-controls-help">
        <SceneErrorBoundary onFailure={fail}>
          <Suspense fallback={<p className="constellation-scene-message" role="status">Preparing your universe…</p>}>
            <Scene {...props} command={command} active={visible && inView} reducedMotion={reducedMotion} onFailure={fail} />
          </Suspense>
        </SceneErrorBoundary>
      </div>
      <div className="constellation-camera-tools" role="group" aria-label="Camera controls">
        {[['reset', '⟲', 'Frame all'], ['zoom-in', '+', 'Zoom in'], ['zoom-out', '−', 'Zoom out'], ['left', '↶', 'Rotate left'], ['right', '↷', 'Rotate right']].map(([type, text, label]) => <button key={type} type="button" aria-label={label} title={label} onClick={() => setCommand({ type, key: Date.now() })}>{text}</button>)}
      </div>
      {props.loadingLabel && <p className="constellation-viewport-status" role="status">Loading entries for {props.loadingLabel}…</p>}
      <p id="constellation-controls-help" className="constellation-controls-help">Drag to orbit · scroll to zoom · right-drag to pan<br />Touch: one finger to orbit, two to zoom/pan. Keyboard: use camera buttons or the record explorer.</p>
    </> : <div className="constellation-scene-message" role="status">
      <span className="constellation-orbit-mark" aria-hidden="true">◎</span>
      <h2>{supported === null ? 'Preparing your universe' : 'Your logbook, still connected'}</h2>
      <p>{supported === null ? 'Checking 3D availability…' : '3D is unavailable on this device or session. Every loaded record is accessible in the explorer below.'}</p>
    </div>}
    <div className="constellation-scene-caption" aria-hidden="true"><span>LOGBOOK / ORBITAL VIEW</span><span>REAL WORK. CONNECTED.</span></div>
  </div>;
}
