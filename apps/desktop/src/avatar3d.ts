// Realistic 3D exercise avatar.
// The people are Microsoft Rocketbox avatars (MIT licence, see public/avatars/ROCKETBOX-LICENSE.txt),
// converted to glTF with their ARKit-style face shapes. They are driven by the same Pose values as the
// 2D illustrations (exerciseMotion.ts), so timing, holds and steps stay identical.
// Schematic only: every movement awaits clinician verification.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Muscle, Pose, Device } from './exerciseMotion';

export type AvatarId = 'woman' | 'man';
export type AvatarView = 'front' | 'side' | 'inside';
type Frame = { pos: THREE.Vector3; look: THREE.Vector3 };

export interface Avatar {
  root: THREE.Group;
  apply(pose: Pose, time: number, holding: boolean): void;
  setCutaway(on: boolean): void;
  setDevice(device: Device | null): void;
  setMuscles(muscles: Muscle[]): void;
  setSupine(on: boolean): void;
  frame: Record<AvatarView, Frame>;
  dispose(): void;
}

const ANAT = { mucosa: 0xd77a7a, bone: 0xeee3cc, cartilage: 0xe6c3ae, airway: 0x8fb8d8, bolus: 0xe9b43a, glow: 0xff6b4a };
const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...extra });
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const X = v(1, 0, 0), Y = v(0, 1, 0), Z = v(0, 0, 1);

const cache = new Map<AvatarId, Promise<ArrayBuffer>>();
/** Downloads the avatar file once per session (woman 3.8 MB, man 2.2 MB). */
function fetchAvatar(id: AvatarId): Promise<ArrayBuffer> {
  if (!cache.has(id)) {
    const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
    const p = fetch(`${base}avatars/avatar-${id}.glb`).then(r => { if (!r.ok) throw new Error(`Avatar download failed (${r.status})`); return r.arrayBuffer(); });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return cache.get(id)!;
}

export async function loadAvatar(id: AvatarId): Promise<Avatar> {
  const data = await fetchAvatar(id);
  const gltf = await new GLTFLoader().parseAsync(data.slice(0), '');
  return setup(gltf.scene);
}

function rotWorld(bone: THREE.Object3D, axis: THREE.Vector3, angle: number) {
  const pq = new THREE.Quaternion();
  bone.parent!.getWorldQuaternion(pq);
  const local = axis.clone().applyQuaternion(pq.invert());
  bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(local, angle));
  bone.updateMatrixWorld(true);
}

function setup(model: THREE.Group): Avatar {
  const root = new THREE.Group();
  root.add(model);
  const meshes: THREE.Mesh[] = [];
  const bones: Record<string, THREE.Bone> = {};
  model.traverse(o => {
    o.frustumCulled = false;
    if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
    if ((o as THREE.Mesh).morphTargetInfluences) meshes.push(o as THREE.Mesh);
  });
  const need = ['Bip01_Head', 'Bip01_Neck', 'Bip01_MJaw', 'Bip01_MUpperLip', 'Bip01_LEye', 'Bip01_L_UpperArm', 'Bip01_R_UpperArm', 'Bip01_L_Forearm', 'Bip01_R_Forearm', 'Bip01_L_Clavicle', 'Bip01_R_Clavicle'];
  for (const n of need) if (!bones[n]) throw new Error(`Avatar rig is missing ${n}`);
  const skinMats: THREE.Material[] = [];
  meshes.forEach(m => (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => { if (!skinMats.includes(mt)) skinMats.push(mt); }));
  const original = new Map(skinMats.map(mt => [mt, { transparent: mt.transparent, alphaTest: mt.alphaTest }]));
  model.updateMatrixWorld(true);

  // Arms down from the T-pose; this rest pose is restored before every frame.
  rotWorld(bones.Bip01_L_UpperArm, Z, -1.2); rotWorld(bones.Bip01_R_UpperArm, Z, 1.2);
  rotWorld(bones.Bip01_L_UpperArm, X, 0.12); rotWorld(bones.Bip01_R_UpperArm, X, 0.12);
  rotWorld(bones.Bip01_L_Forearm, X, 0.35); rotWorld(bones.Bip01_R_Forearm, X, 0.35);
  const animated = ['Bip01_Head', 'Bip01_Neck', 'Bip01_L_Clavicle', 'Bip01_R_Clavicle', 'Bip01_MJaw'];
  const rest = Object.fromEntries(animated.map(n => [n, bones[n].quaternion.clone()]));

  // Landmarks from the face rig; anatomy is built in metres around the jaw joint.
  const wp = (n: string) => bones[n].getWorldPosition(new THREE.Vector3());
  const J = wp('Bip01_MJaw'), lip = wp('Bip01_MUpperLip'), eye = wp('Bip01_LEye');
  const s = (lip.z - J.z) / 0.1;
  const center = v(0, (eye.y + J.y) / 2 - 0.01 * s, J.z - 0.01);
  const ray = new THREE.Raycaster(v(0, J.y - 0.09 * s, J.z + 1), v(0, 0, -1));
  const hit = ray.intersectObjects(meshes, true)[0];
  const dz = hit ? hit.point.z - J.z - 0.025 * s : 0; // sit the larynx just inside the front of the neck

  const inside = new THREE.Group(); inside.position.copy(J); inside.position.z += dz; inside.scale.setScalar(s); inside.visible = false;
  const mucosa = mat(ANAT.mucosa, { transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const add = <T extends THREE.Object3D>(parent: THREE.Object3D, o: T, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); parent.add(o); return o; };
  add(inside, new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.004, 0.065), mat(ANAT.bone)), 0, 0.012, 0.04); // hard palate
  const velum = add(inside, new THREE.Group(), 0, 0.012, 0.006);
  const velumFlap = add(velum, new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.004, 0.024), mat(ANAT.mucosa)), 0, 0, -0.012);
  const pharynx = add(inside, new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v(0, 0.032, -0.02), v(0, 0, -0.032), v(0, -0.04, -0.033), v(0, -0.08, -0.03), v(0, -0.11, -0.035), v(0, -0.185, -0.038)]), 48, 0.0105, 16, false), mucosa));
  const hyoid = add(inside, new THREE.Group());
  const hyoidBone = add(hyoid, new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0032, 10, 24, Math.PI), mat(ANAT.bone)));
  hyoidBone.rotation.set(Math.PI / 2, 0, Math.PI);
  const larynx = add(inside, new THREE.Group());
  const thyroid = add(larynx, new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.013, 0.03, 20, 1, true), mat(ANAT.cartilage, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 })));
  const folds = [-1, 1].map(k => add(larynx, new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.003, 0.02), mat(0xf2e6e0)), k * 0.007, -0.002, 0));
  add(larynx, new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.08, 18, 1, true), mat(ANAT.airway, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })), 0, -0.055, -0.004);
  const epiglottis = add(inside, new THREE.Group());
  const leaf = add(epiglottis, new THREE.Mesh(new THREE.SphereGeometry(0.011, 20, 14), mat(ANAT.cartilage)), 0, 0.015, 0); leaf.scale.set(0.9, 1.5, 0.25);
  const ues = add(inside, new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0035, 10, 28), mat(0xb4534f)), 0, -0.112, -0.035); ues.rotation.x = Math.PI / 2;
  const suprahyoid = add(inside, new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.005, 0.042), mat(0xc85d4d, { transparent: true, opacity: 0.75 })));
  const bolusPath = new THREE.CatmullRomCurve3([v(0, -0.004, 0.07), v(0, -0.002, 0.03), v(0, -0.01, -0.012), v(0, -0.04, -0.031), v(0, -0.08, -0.03), v(0, -0.11, -0.035), v(0, -0.19, -0.038)]);
  const bolus = add(inside, new THREE.Mesh(new THREE.SphereGeometry(0.009, 20, 14), mat(ANAT.bolus, { roughness: 0.3 })));
  bones.Bip01_Head.attach(inside);

  // External muscle glow, breath puffs and devices follow the head.
  const glowMat = mat(ANAT.glow, { transparent: true, opacity: 0, depthWrite: false, emissive: ANAT.glow, emissiveIntensity: 0.6 });
  const ext = new THREE.Group(); ext.position.copy(J); ext.scale.setScalar(s); bones.Bip01_Head.attach(ext);
  const masseters = [-1, 1].map(k => { const m = add(ext, new THREE.Mesh(new THREE.SphereGeometry(0.022, 20, 14), glowMat), k * 0.062, 0, 0); m.scale.set(0.4, 1.3, 0.9); return m; });
  const neckGlow = new THREE.Group(); neckGlow.position.copy(wp('Bip01_Neck')); model.add(neckGlow);
  const scm = [-1, 1].map(k => { const m = add(neckGlow, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.12, 12), glowMat), k * 0.03, -0.02, 0.03); m.rotation.set(-0.35, 0, k * 0.3); return m; });
  const traps = [-1, 1].map(k => { const m = add(neckGlow, new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), glowMat), k * 0.1, -0.03, -0.03); m.scale.set(1.4, 0.4, 0.8); return m; });
  const puffs = [0, 1, 2].map(() => add(ext, new THREE.Mesh(new THREE.SphereGeometry(0.007, 16, 12), mat(0xdfeef5, { transparent: true, opacity: 0, depthWrite: false }))));
  const wood = mat(0xd9b98a, { roughness: 0.8 });
  const devices: Partial<Record<Device, THREE.Object3D>> = {};
  devices.depressor = add(ext, new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.002, 0.15), wood), 0, -0.006, 0.16);
  const stack = add(ext, new THREE.Group()); [0, 1, 2, 3].forEach(i => add(stack, new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.0022, 0.13), wood), 0, -0.012 + i * 0.0026, 0.14)); devices.stack = stack;
  devices.ball = add(ext, new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 18), mat(0x3d7fbf, { roughness: 0.4 })), 0, -0.08, 0.085);
  const emst = add(ext, new THREE.Group());
  add(emst, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 16), mat(0xe8eef2, { roughness: 0.3 })), 0, -0.004, 0.14).rotation.x = Math.PI / 2;
  add(emst, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.025, 20), mat(0x2f6b57)), 0, -0.004, 0.185).rotation.x = Math.PI / 2;
  devices.emst = emst;
  Object.values(devices).forEach(d => { d!.visible = false; });

  const state = { cutaway: false, device: null as Device | null, muscles: [] as Muscle[] };
  const W: Record<string, number> = {};
  const setW = () => meshes.forEach(m => { for (const k of Object.keys(W)) { const i = m.morphTargetDictionary?.[k]; if (i !== undefined) m.morphTargetInfluences![i] = W[k]; } });
  const tmp = new THREE.Vector3();

  function apply(p: Pose, time: number, holding: boolean) {
    for (const n of animated) bones[n].quaternion.copy(rest[n]);
    model.updateMatrixWorld(true);
    // posture: neck and head share flexion, rotation and tilt
    const flex = clamp(p.headFlex, -0.5, 1) * 0.55, turn = clamp(p.headTurn, -1, 1) * 0.75, tilt = -clamp(p.headTilt, -1, 1) * 0.42;
    for (const [n, k] of [['Bip01_Neck', 0.45], ['Bip01_Head', 0.55]] as const) { rotWorld(bones[n], X, flex * k); rotWorld(bones[n], Y, turn * k); rotWorld(bones[n], Z, tilt * k); }
    const sh = clamp(p.shrug, 0, 1) * 0.22 + clamp(p.chest, 0, 1) * 0.04;
    rotWorld(bones.Bip01_L_Clavicle, Z, sh); rotWorld(bones.Bip01_R_Clavicle, Z, -sh);
    // face shapes (gains compensate for small shapes on these rigs)
    const jaw = clamp(p.jawOpen, 0, 1), lat = clamp(p.jawLateral, -1, 1), pro = clamp(p.tongueProtrude, 0, 1);
    rotWorld(bones.Bip01_MJaw, X, jaw * 0.16);
    W.AK_25_JawOpen = jaw * 0.95 + pro * 0.15; W.AU_27_MouthStretch = jaw * 0.6;
    W.AK_24_JawLeft = Math.max(0, lat) * 1.4; W.AK_26_JawRight = Math.max(0, -lat) * 1.4;
    W.AK_23_JawForward = clamp(p.jawProtrude, 0, 1) * 1.4;
    const press = clamp(p.lipPress, 0, 1); W.AK_36_MouthPressLeft = press * 1.3; W.AK_37_MouthPressRight = press * 1.3;
    const pucker = clamp(p.pucker, 0, 1), air = clamp(p.airOut, 0, 1);
    W.AK_38_MouthPucker = pucker * 1.9; W.AK_32_MouthFunnel = pucker * 0.35 + air * 0.5;
    const spread = clamp(p.spread, 0, 1);
    W.AK_44_MouthSmileLeft = spread * 1.3; W.AK_45_MouthSmileRight = spread * 1.3; W.AK_46_MouthStretchLeft = spread * 0.5; W.AK_47_MouthStretchRight = spread * 0.5;
    W.AK_06_CheekPuff = clamp(p.cheekPuff, 0, 1) * 2.2;
    W.HB_08_TongueOut = pro * 1.1; W.AK_52_TongueOut = pro * 0.25;
    W.HB_12_TongueUp = clamp(p.tongueTipUp, 0, 1) + clamp(p.tonguePress, 0, 1) * 0.5;
    const tl = clamp(p.tongueLateral, -1, 1); W.HB_10_L_Tongue = Math.max(0, tl) * 1.2; W.HB_10_R_Tongue = Math.max(0, -tl) * 1.2;
    W.HB_09_TongueIn = clamp(p.tongueRetract, 0, 1);
    W.HB_11_TongueDown = clamp(p.tongueBackUp, 0, 1) * 0.6;
    const effort = clamp(p.effort, 0, 1); W.AU_04_BrowLowerer = effort * 0.8; W.AU_07_LidTightener = effort * 0.5;
    W.AU_17_ChinRaiser = clamp(p.swallow, 0, 1) * 0.5;
    W.AU_25_LipsPart = air * 0.3;
    let blink = 0;
    if (!holding) { const ph = time % 4.2; blink = ph > 4 ? Math.sin(((ph - 4) / 0.2) * Math.PI) : 0; }
    W.AK_09_EyeBlinkLeft = blink; W.AK_10_EyeBlinkRight = blink;
    setW();
    // swallow mechanics inside the throat
    const sw = clamp(p.swallow, 0, 1), hy = clamp(p.hyoidLift, -0.5, 1);
    velum.rotation.x = 0.85 - clamp(p.velumLift, 0, 1) * 0.9;
    hyoid.position.set(0, -0.05 + hy * 0.02, 0.02 + Math.max(0, hy) * 0.01);
    larynx.position.set(0, -0.085 + hy * 0.02, 0.005 + Math.max(0, hy) * 0.006);
    epiglottis.position.set(0, -0.062 + hy * 0.02, -0.012);
    epiglottis.rotation.x = -0.15 + sw * 1.25;
    suprahyoid.position.set(0, -0.043 + hy * 0.01, 0.04); suprahyoid.rotation.x = 0.35 - hy * 0.2;
    const squeeze = 1 - sw * 0.32 * (0.6 + 0.4 * Math.sin(time * 9)); pharynx.scale.set(squeeze, 1, squeeze);
    const g = clamp(p.glottisClose, 0, 1);
    folds.forEach((f, i) => { f.position.x = (i ? 1 : -1) * (0.007 - g * 0.005); (f.material as THREE.MeshStandardMaterial).color.setHex(g > 0.5 ? 0xf08a6b : 0xf2e6e0); });
    const open = Math.max(sw * 0.6, Math.max(0, hy) * sw > 0.2 ? 0.8 : 0); ues.scale.set(1 + open * 0.6, 1 + open * 0.6, 1);
    const b = clamp(p.bolus, 0, 1);
    bolus.visible = b > 0.001 && b < 0.999;
    if (bolus.visible) bolus.position.copy(bolusPath.getPoint(b, tmp));
    puffs.forEach((pf, i) => {
      const u = (time * 1.6 + i / 3) % 1;
      pf.position.set(0, -0.004, 0.11 + u * 0.09 + (state.device === 'emst' ? 0.09 : 0));
      pf.scale.setScalar(0.6 + u * 1.6);
      (pf.material as THREE.MeshStandardMaterial).opacity = air * (1 - u) * 0.7;
    });
    // targeted muscles pulse
    const pulse = 0.35 + 0.35 * Math.sin(time * 4), on = (m: Muscle) => state.muscles.includes(m);
    glowMat.opacity = on('jawMuscles') || on('neck') || on('shoulder') ? pulse * 0.75 : 0;
    masseters.forEach(m => { m.visible = on('jawMuscles'); }); scm.forEach(m => { m.visible = on('neck'); }); traps.forEach(m => { m.visible = on('shoulder'); });
    const hl = (mesh: THREE.Mesh, m: Muscle) => { const mt = mesh.material as THREE.MeshStandardMaterial; mt.emissive.setHex(on(m) && state.cutaway ? ANAT.glow : 0); mt.emissiveIntensity = on(m) ? pulse : 0; };
    hl(pharynx, 'constrictors'); hl(hyoidBone, 'suprahyoid'); hl(suprahyoid, 'suprahyoid'); hl(thyroid, 'larynx'); hl(ues, 'ues'); hl(velumFlap, 'velum');
  }

  function setCutaway(on: boolean) {
    state.cutaway = on; inside.visible = on;
    for (const mt of skinMats) {
      const o = original.get(mt)!;
      mt.transparent = on ? true : o.transparent; mt.opacity = on ? 0.2 : 1; mt.depthWrite = !on; mt.alphaTest = on ? 0 : o.alphaTest; mt.needsUpdate = true;
    }
  }
  function setSupine(on: boolean) {
    // Lie the body face-up while keeping the head where the camera expects it.
    root.rotation.x = on ? -Math.PI / 2 : 0;
    const rc = J.clone().applyAxisAngle(X, on ? -Math.PI / 2 : 0);
    root.position.copy(J.clone().sub(rc));
  }
  const frame: Record<AvatarView, Frame> = {
    front: { pos: v(center.x, center.y, center.z + 1.1 * s), look: v(center.x, center.y - 0.02, center.z) },
    side: { pos: v(center.x + 1.1 * s, center.y, center.z - 0.03), look: v(center.x, center.y - 0.02, center.z - 0.03) },
    inside: { pos: v(center.x + 0.7 * s, J.y - 0.045 * s, J.z), look: v(center.x, J.y - 0.05 * s, J.z) },
  };
  function dispose() {
    root.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      mats.forEach(mt => { Object.values(mt).forEach(val => { if (val instanceof THREE.Texture) val.dispose(); }); mt.dispose(); });
    });
  }
  return {
    root, apply, setCutaway, frame, setSupine, dispose,
    setDevice(d) { state.device = d; (Object.keys(devices) as Device[]).forEach(k => { devices[k]!.visible = k === d; }); },
    setMuscles(list) { state.muscles = list; },
  };
}
