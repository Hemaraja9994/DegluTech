import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import * as THREE from 'three';

type Motion = 'jaw-stretch' | 'neck-shoulder-rom';

export function ExerciseMotion({ exerciseId }: { exerciseId: Motion }) {
  const host = useRef<HTMLDivElement>(null);
  const running = useRef(false);
  const reset = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => { running.current = playing; }, [playing]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setUnavailable(true);
      return;
    }
    element.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0.8, 8.5);
    camera.lookAt(0, 0.65, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8299a4, 2.2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(3, 5, 6);
    scene.add(light);
    const skin = new THREE.MeshStandardMaterial({ color: 0xc69d86, roughness: 0.8 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x327c7b, roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x35454b });
    const sphere = (parent: THREE.Object3D, material: THREE.Material, position: [number, number, number], scale: [number, number, number]) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material);
      mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
    };
    const body = new THREE.Group(); scene.add(body);
    sphere(body, shirt, [0, -0.75, 0], [1.15, 0.65, 0.45]);
    sphere(body, skin, [0, -0.05, 0], [0.28, 0.55, 0.27]);
    const head = new THREE.Group(); head.position.set(0, 0.25, 0); body.add(head);
    sphere(head, skin, [0, 0.67, 0], [0.55, 0.76, 0.47]);
    sphere(head, skin, [0, 0.56, 0.46], [0.10, 0.16, 0.13]);
    for (const x of [-0.22, 0.22]) sphere(head, dark, [x, 0.78, 0.43], [0.04, 0.04, 0.025]);
    const jaw = new THREE.Group(); jaw.position.set(0, 0.36, 0.16); head.add(jaw);
    sphere(jaw, skin, [0, -0.02, 0.24], [0.39, 0.2, 0.24]);
    const shoulders = new THREE.Group(); body.add(shoulders);
    for (const x of [-0.84, 0.84]) sphere(shoulders, shirt, [x, -0.58, 0], [0.43, 0.34, 0.37]);
    const resize = () => { const w = element.clientWidth; const h = element.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    let frame = 0; let elapsed = 0; let last = performance.now();
    const draw = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.05); last = now;
      if (reset.current) { elapsed = 0; reset.current = false; }
      if (running.current) elapsed += delta;
      const phase = (1 - Math.cos(elapsed * 1.2)) / 2;
      if (exerciseId === 'jaw-stretch') jaw.rotation.x = phase * 0.28;
      else { head.rotation.y = Math.sin(elapsed * 0.65) * 0.22; shoulders.position.y = phase * 0.1; }
      renderer.render(scene, camera); frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); scene.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); }); skin.dispose(); shirt.dispose(); dark.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [exerciseId]);

  return <section className="motion-demo" aria-label="3D movement preview">
    <div className="motion-heading"><strong>3D movement preview</strong><span>Prototype · clinician review required</span></div>
    {unavailable ? <p className="motion-fallback">3D preview is unavailable on this device. Use the written steps below.</p> : <div className="motion-canvas" ref={host} />}
    <div className="motion-controls">
      <button type="button" disabled={unavailable} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Play'}</button>
      <button type="button" disabled={unavailable} onClick={() => { setPlaying(false); reset.current = true; }}><RotateCcw size={16} /> Reset</button>
    </div>
  </section>;
}
