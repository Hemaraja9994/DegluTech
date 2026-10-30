import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { ExerciseAnimation } from './ExerciseAnimation';

// The 3D player (Three.js plus the avatar files) loads only when someone opens an exercise.
const ExerciseAvatar3D = lazy(() => import('./ExerciseAvatar3D'));
const MODE_KEY = 'deglutech-exercise-visual';

let webgl: boolean | null = null;
function canUse3D(): boolean {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { webgl = false; }
  return webgl;
}
function savesData(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return !!nav.connection?.saveData;
}
function initialMode(): '3d' | '2d' {
  if (!canUse3D()) return '2d';
  try { const saved = window.localStorage.getItem(MODE_KEY); if (saved === '3d' || saved === '2d') return saved; } catch { /* storage unavailable */ }
  return savesData() ? '2d' : '3d';
}

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

type Props = { exerciseId: string; language?: string; label?: string };

/** 3D patient by default, with the schematic drawing as an option and as the automatic fallback. */
export function ExerciseVisual(props: Props) {
  const [mode, setModeState] = useState<'3d' | '2d'>(initialMode);
  const can3d = canUse3D();
  const setMode = (m: '3d' | '2d') => { setModeState(m); try { window.localStorage.setItem(MODE_KEY, m); } catch { /* storage unavailable */ } };
  const drawing = <ExerciseAnimation {...props} />;
  // Start the 3D download only once the player is (nearly) on screen; a closed panel never loads it.
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !box.current) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(box.current);
    return () => io.disconnect();
  }, [seen]);
  return <div className="exvisual" ref={box}>
    <div className="exvisual-switch" role="group" aria-label="Illustration type">
      <button type="button" aria-pressed={mode === '3d'} disabled={!can3d} onClick={() => setMode('3d')}>3D patient</button>
      <button type="button" aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>Drawing</button>
      {!can3d && <span>3D needs WebGL, which this device does not offer.</span>}
    </div>
    {mode === '3d' && can3d && !seen
      ? <div className="exavatar-stage exavatar-pending" aria-hidden="true" />
      : mode === '3d' && can3d
      ? <Fallback fallback={drawing}>
          <Suspense fallback={<div className="exavatar-stage exavatar-pending" role="status">Loading the 3D patient…</div>}>
            <ExerciseAvatar3D {...props} onFail={() => setModeState('2d')} />
          </Suspense>
        </Fallback>
      : drawing}
  </div>;
}
