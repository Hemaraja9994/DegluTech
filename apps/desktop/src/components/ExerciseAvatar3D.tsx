import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Gauge, Pause, Play, RotateCcw } from 'lucide-react';
import { motionSpecFor, phaseKeyTime, samplePose, REST_POSE, type Muscle } from '../exerciseMotion';
import { loadAvatar, type Avatar, type AvatarId, type AvatarView } from '../avatar3d';
import { VIEW_LABELS } from './ExerciseAnimation';

const INTERNAL: Muscle[] = ['constrictors', 'suprahyoid', 'larynx', 'glottis', 'velum', 'ues', 'tongueBase'];
const PEOPLE: Record<string, { woman: string; man: string; loading: string; failed: string }> = {
  en: { woman: 'Woman', man: 'Man', loading: 'Loading the 3D patient…', failed: '3D view unavailable on this device' },
  kn: { woman: 'ಮಹಿಳೆ', man: 'ಪುರುಷ', loading: 'Loading the 3D patient…', failed: '3D view unavailable on this device' },
  hi: { woman: 'महिला', man: 'पुरुष', loading: 'Loading the 3D patient…', failed: '3D view unavailable on this device' },
  ta: { woman: 'பெண்', man: 'ஆண்', loading: 'Loading the 3D patient…', failed: '3D view unavailable on this device' },
  te: { woman: 'స్త్రీ', man: 'పురుషుడు', loading: 'Loading the 3D patient…', failed: '3D view unavailable on this device' },
  ml: { woman: 'സ്ത്രീ', man: 'പുരുഷൻ', loading: 'Loading the 3D patient…', failed: '3D view unavailable on this device' },
};
const AVATAR_KEY = 'deglutech-avatar-person';
const readPerson = (): AvatarId => { try { return window.localStorage.getItem(AVATAR_KEY) === 'man' ? 'man' : 'woman'; } catch { return 'woman'; } };

type Props = { exerciseId: string; language?: string; label?: string; onFail?: () => void };

/** Realistic 3D patient performing the exercise. Loaded lazily; falls back to the drawing via onFail. */
export default function ExerciseAvatar3D({ exerciseId, language = 'en', label, onFail }: Props) {
  const spec = motionSpecFor(exerciseId);
  const reduced = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const internal = !!spec && spec.muscles.some(m => INTERNAL.includes(m));
  const defaultView: AvatarView = internal ? 'inside' : spec?.external === 'front' ? 'front' : 'side';
  const [person, setPerson] = useState<AvatarId>(readPerson);
  const [view, setView] = useState<AvatarView>(defaultView);
  const [playing, setPlaying] = useState(!reduced);
  const [slow, setSlow] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [ui, setUi] = useState<{ phase: 0 | 1 | 2; hold: number | null }>({ phase: 0, hold: null });

  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ playing, slow, view, clock: 0, yaw: 0, visible: true });
  live.current.playing = playing; live.current.slow = slow; live.current.view = view;
  const avatarRef = useRef<Avatar | null>(null);
  const sceneRef = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } | null>(null);
  const exerciseIdRef = useRef(exerciseId); exerciseIdRef.current = exerciseId;

  useEffect(() => { setView(defaultView); live.current.clock = 0; setPlaying(!reduced); }, [exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Renderer, scene and render loop (one per player)
  useEffect(() => {
    const canvas = canvasRef.current!, box = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setStatus('failed'); onFail?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.01, 50);
    scene.add(new THREE.HemisphereLight(0xfff6ea, 0x6b7f75, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xcfe6ff, 1.2); rim.position.set(-4, 2, -3); scene.add(rim);
    sceneRef.current = { renderer, scene, camera };
    const resize = () => { const w = box.clientWidth, h = Math.round(w * 0.75); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null; ro?.observe(box);
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(e => { live.current.visible = e.some(x => x.isIntersecting); }) : null; io?.observe(box);
    const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
    let first = true, raf = 0, last = performance.now(), lastUi = '';
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const L = live.current, a = avatarRef.current, spc = motionSpecFor(exerciseIdRef.current);
      if (!L.visible || document.hidden || !a) return;
      if (L.playing && spc) L.clock += dt * (L.slow ? 0.5 : 1);
      const smp = spc ? samplePose(spc, L.clock) : { pose: REST_POSE, phase: 0 as const, hold: null };
      a.apply(smp.pose, now / 1000, !!smp.hold);
      const f = a.frame[L.view];
      const target = f.pos.clone().sub(f.look).applyAxisAngle(new THREE.Vector3(0, 1, 0), L.yaw).add(f.look);
      const k = first || reduced ? 1 : 0.1; first = false;
      camPos.lerp(target, k); camLook.lerp(f.look, k);
      camera.position.copy(camPos); camera.lookAt(camLook);
      renderer.render(scene, camera);
      const hold = smp.hold ? Math.max(0, Math.ceil(smp.hold.total - smp.hold.elapsed)) : null;
      const key2 = `${smp.phase}|${hold}`;
      if (key2 !== lastUi) { lastUi = key2; setUi({ phase: smp.phase, hold }); }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); avatarRef.current?.dispose(); avatarRef.current = null; renderer.dispose(); sceneRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load the chosen person
  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    loadAvatar(person).then(a => {
      const ctx = sceneRef.current;
      if (cancelled || !ctx) { a.dispose(); return; }
      if (avatarRef.current) { ctx.scene.remove(avatarRef.current.root); avatarRef.current.dispose(); }
      avatarRef.current = a; ctx.scene.add(a.root); setStatus('ready');
      configure();
    }).catch(() => { if (!cancelled) { setStatus('failed'); onFail?.(); } });
    try { window.localStorage.setItem(AVATAR_KEY, person); } catch { /* storage unavailable */ }
    return () => { cancelled = true; };
  }, [person]); // eslint-disable-line react-hooks/exhaustive-deps

  const configure = () => {
    const a = avatarRef.current; if (!a) return;
    a.setMuscles(spec?.muscles ?? []);
    a.setDevice(spec?.device && spec.device !== 'jawDevice' ? spec.device : null);
    a.setSupine(spec?.posture === 'supine');
    a.setCutaway(live.current.view === 'inside');
  };
  useEffect(configure, [exerciseId, view, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag to turn the patient
  const drag = useRef<number | null>(null);
  const onDown = (e: React.PointerEvent) => { drag.current = e.clientX; (e.target as Element).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (drag.current === null) return; live.current.yaw = Math.max(-1.6, Math.min(1.6, live.current.yaw + (e.clientX - drag.current) * 0.01)); drag.current = e.clientX; };
  const onUp = () => { drag.current = null; };

  if (!spec) return null;
  const labels = VIEW_LABELS[language] ?? VIEW_LABELS.en;
  const people = PEOPLE[language] ?? PEOPLE.en;
  const jump = (phase: 0 | 1 | 2) => { setPlaying(false); live.current.clock = phaseKeyTime(spec, phase); };
  const pickView = (v: AvatarView) => { live.current.yaw = 0; setView(v); };

  return <section className="exavatar" aria-label={`3D patient${label ? `: ${label}` : ''}`}>
    <div className="exavatar-stage" ref={host}>
      <canvas ref={canvasRef} role="img" aria-label={`3D patient demonstrating ${label ?? 'the exercise'}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
      {status !== 'ready' && <div className="exavatar-status" role="status">{status === 'loading' ? people.loading : people.failed}</div>}
      <div className="exavatar-bar">
        <div className="exavatar-seg" role="group" aria-label="View">
          {(['front', 'side', 'inside'] as const).map(v => <button key={v} type="button" aria-pressed={view === v} onClick={() => pickView(v)}>{labels[v]}</button>)}
        </div>
        <div className="exavatar-seg" role="group" aria-label="Patient">
          {(['woman', 'man'] as const).map(p => <button key={p} type="button" aria-pressed={person === p} onClick={() => setPerson(p)}>{people[p]}</button>)}
        </div>
      </div>
      {ui.hold !== null && <div className="exavatar-hold" aria-live="polite"><strong>{ui.hold}</strong><span>s hold</span></div>}
    </div>
    <div className="exanim-controls">
      <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause animation' : 'Play animation'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
      <button type="button" onClick={() => { live.current.clock = 0; }} aria-label="Restart animation"><RotateCcw size={16} /></button>
      <button type="button" onClick={() => setSlow(!slow)} aria-pressed={slow} aria-label="Slow motion"><Gauge size={16} />{slow ? '0.5×' : '1×'}</button>
      <div className="exanim-phases" role="group" aria-label="Show step">
        {([0, 1, 2] as const).map(ph => <button key={ph} type="button" aria-pressed={ui.phase === ph} onClick={() => jump(ph)} aria-label={`Show step ${ph + 1}`}>{ph + 1}</button>)}
      </div>
    </div>
    <p className="exanim-note">Schematic 3D demonstration · drag to turn · highlighted areas show the muscles being worked · awaiting clinician verification · avatars: Microsoft Rocketbox (MIT)</p>
  </section>;
}
