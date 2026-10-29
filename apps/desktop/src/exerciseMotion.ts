// Motion specifications for the DegluTech exercise animations.
// Each exercise is a loop of keyframed poses. A pose is a set of articulator
// parameters (0 = rest). Frames carry the step phase (0, 1, 2) so the animation
// lines up with the three written steps, and `hold` marks sustained segments.
// Schematic illustrations only: every spec awaits clinician verification.

export type Pose = {
  jawOpen: number; jawLateral: number; jawProtrude: number;
  lipPress: number; pucker: number; spread: number; cheekPuff: number;
  tongueProtrude: number; tongueTipUp: number; tongueLateral: number; tongueRetract: number;
  tonguePress: number; tongueBackUp: number;
  velumLift: number; hyoidLift: number; swallow: number; glottisClose: number;
  airOut: number; bolus: number; chest: number;
  headFlex: number; headTurn: number; headTilt: number; shrug: number; effort: number;
};
export type Muscle = 'tongue' | 'tongueBase' | 'constrictors' | 'suprahyoid' | 'larynx' | 'glottis' | 'velum'
  | 'lips' | 'ues' | 'jawMuscles' | 'neck' | 'respiratory' | 'shoulder';
export type Device = 'stack' | 'jawDevice' | 'depressor' | 'ball' | 'emst';
export type Frame = { t: number; phase: 0 | 1 | 2; pose: Partial<Pose>; hold?: boolean };
export type MotionSpec = {
  id: string; external: 'profile' | 'front'; posture: 'sitting' | 'supine';
  device?: Device; bolus?: boolean; sound?: boolean; muscles: Muscle[]; frames: Frame[];
};

export const REST_POSE: Pose = {
  jawOpen: 0, jawLateral: 0, jawProtrude: 0, lipPress: 0, pucker: 0, spread: 0, cheekPuff: 0,
  tongueProtrude: 0, tongueTipUp: 0, tongueLateral: 0, tongueRetract: 0, tonguePress: 0, tongueBackUp: 0,
  velumLift: 0, hyoidLift: 0, swallow: 0, glottisClose: 0, airOut: 0, bolus: 0, chest: 0,
  headFlex: 0, headTurn: 0, headTilt: 0, shrug: 0, effort: 0,
};
/** Allowed range for each parameter; used by tests and to clamp rendering. */
export const POSE_RANGE: Record<keyof Pose, [number, number]> = {
  jawOpen: [0, 1], jawLateral: [-1, 1], jawProtrude: [0, 1], lipPress: [0, 1], pucker: [0, 1], spread: [0, 1], cheekPuff: [0, 1],
  tongueProtrude: [0, 1], tongueTipUp: [0, 1], tongueLateral: [-1, 1], tongueRetract: [0, 1], tonguePress: [0, 1], tongueBackUp: [0, 1],
  velumLift: [0, 1], hyoidLift: [-0.5, 1], swallow: [0, 1], glottisClose: [0, 1], airOut: [0, 1], bolus: [0, 1], chest: [0, 1],
  headFlex: [-0.5, 1], headTurn: [-1, 1], headTilt: [-1, 1], shrug: [0, 1], effort: [0, 1],
};

const f = (t: number, phase: 0 | 1 | 2, pose: Partial<Pose> = {}, hold = false): Frame => ({ t, phase, pose, ...(hold ? { hold: true } : {}) });
const SWALLOW: Partial<Pose> = { hyoidLift: 0.9, swallow: 1, velumLift: 1, tonguePress: 0.6, effort: 0.7 };

export const MOTION_SPECS: MotionSpec[] = [
  { id: 'masako', external: 'profile', posture: 'sitting', muscles: ['constrictors', 'tongueBase'], frames: [
    f(0, 0), f(1.2, 1, { jawOpen: 0.12, tongueProtrude: 0.32 }), f(2, 1, { jawOpen: 0.08, tongueProtrude: 0.32 }, true),
    f(3.2, 2, { jawOpen: 0.08, tongueProtrude: 0.32 }), f(4, 2, { jawOpen: 0.06, tongueProtrude: 0.3, hyoidLift: 0.8, swallow: 1, velumLift: 1, effort: 1 }),
    f(4.8, 2, { jawOpen: 0.06, tongueProtrude: 0.3, hyoidLift: 0.2, swallow: 0.2 }), f(5.8, 0), f(7, 0)] },
  { id: 'effortful-swallow', external: 'profile', posture: 'sitting', muscles: ['tongue', 'tongueBase', 'constrictors'], frames: [
    f(0, 0), f(1, 1), f(1.8, 1, { tonguePress: 1, effort: 0.6 }),
    f(2.6, 2, { tonguePress: 1, tongueRetract: 0.7, hyoidLift: 1, swallow: 1, velumLift: 1, effort: 1 }),
    f(3.4, 2, { tongueRetract: 0.5, hyoidLift: 0.6, swallow: 0.6, effort: 0.8 }), f(4.4, 0), f(6, 0)] },
  { id: 'mendelsohn', external: 'profile', posture: 'sitting', muscles: ['suprahyoid', 'larynx', 'ues'], frames: [
    f(0, 0), f(1, 1), f(1.8, 1, { ...SWALLOW, hyoidLift: 1 }), f(2.4, 2, { hyoidLift: 1, swallow: 0.3, tonguePress: 0.3, effort: 1 }, true),
    f(4.6, 2, { hyoidLift: 1, swallow: 0.3, tonguePress: 0.3, effort: 1 }), f(5.6, 2), f(7.2, 0)] },
  { id: 'supraglottic', external: 'profile', posture: 'sitting', bolus: true, muscles: ['glottis'], frames: [
    f(0, 0), f(0.6, 0, { bolus: 0.05, chest: 1 }), f(1.4, 0, { bolus: 0.05, chest: 1, glottisClose: 1, effort: 0.5 }, true),
    f(2.6, 1, { bolus: 0.05, chest: 1, glottisClose: 1, effort: 0.5 }), f(3.4, 1, { ...SWALLOW, bolus: 0.6, chest: 1, glottisClose: 1 }),
    f(4, 1, { bolus: 0.95, chest: 0.8, glottisClose: 1, hyoidLift: 0.3, swallow: 0.3 }), f(4.6, 2, { bolus: 1, airOut: 1, effort: 0.8 }),
    f(5.2, 2, { airOut: 0.2 }), f(5.8, 2, { hyoidLift: 0.7, swallow: 0.8, velumLift: 1 }), f(6.6, 0), f(7.6, 0)] },
  { id: 'super-supraglottic', external: 'profile', posture: 'sitting', bolus: true, muscles: ['glottis', 'larynx'], frames: [
    f(0, 0), f(0.6, 0, { bolus: 0.05, chest: 1 }), f(1.4, 0, { bolus: 0.05, chest: 1, glottisClose: 1, hyoidLift: 0.25, effort: 1 }, true),
    f(2.6, 1, { bolus: 0.05, chest: 1, glottisClose: 1, hyoidLift: 0.25, effort: 1 }), f(3.4, 1, { ...SWALLOW, bolus: 0.6, chest: 1, glottisClose: 1, effort: 1 }),
    f(4, 1, { bolus: 0.95, chest: 0.8, glottisClose: 1, hyoidLift: 0.3, swallow: 0.3, effort: 1 }), f(4.6, 2, { bolus: 1, airOut: 1, effort: 0.8 }),
    f(5.2, 2, { airOut: 0.2 }), f(5.8, 2, { hyoidLift: 0.7, swallow: 0.8, velumLift: 1 }), f(6.6, 0), f(7.6, 0)] },
  { id: 'jaw-stretch', external: 'profile', posture: 'sitting', muscles: ['jawMuscles'], frames: [
    f(0, 0), f(0.8, 1), f(2, 1, { jawOpen: 1, effort: 0.7 }, true), f(5, 2, { jawOpen: 1, effort: 0.7 }), f(6.4, 2), f(7.4, 0)] },
  { id: 'lingual-resistance', external: 'profile', posture: 'sitting', device: 'depressor', muscles: ['tongue'], frames: [
    f(0, 0), f(1, 0, { jawOpen: 0.3 }), f(1.8, 1, { jawOpen: 0.3, tongueProtrude: 0.6, effort: 1 }, true),
    f(3.8, 2, { jawOpen: 0.3, tongueProtrude: 0.6, effort: 1 }), f(4.6, 2, { jawOpen: 0.3 }), f(5.4, 0), f(6.2, 0)] },
  { id: 'velar-drills', external: 'profile', posture: 'sitting', sound: true, muscles: ['velum', 'tongue'], frames: [
    f(0, 0), f(0.8, 1, { tongueBackUp: 1, velumLift: 1, jawOpen: 0.15 }), f(1.2, 1, { jawOpen: 0.3, velumLift: 1, airOut: 0.6 }),
    f(1.6, 1, { tongueBackUp: 1, velumLift: 1, jawOpen: 0.15 }), f(2, 1, { jawOpen: 0.3, velumLift: 1, airOut: 0.6 }),
    f(2.4, 2, { tongueBackUp: 1, velumLift: 1, jawOpen: 0.12 }), f(3, 2, { jawOpen: 0.35, velumLift: 1, airOut: 0.7 }), f(3.8, 0), f(4.8, 0)] },
  { id: 'neck-shoulder-rom', external: 'front', posture: 'sitting', muscles: ['neck', 'shoulder'], frames: [
    f(0, 0), f(1.5, 0, { headTurn: -1 }), f(3, 0), f(4.5, 0, { headTurn: 1 }), f(6, 1),
    f(7.5, 1, { headTilt: -1 }), f(9, 1), f(10.5, 1, { headTilt: 1 }), f(12, 2),
    f(13, 2, { shrug: 1 }), f(14, 2), f(15, 2, { shrug: 1 }), f(16, 0)] },
  { id: 'jaw-lateral', external: 'front', posture: 'sitting', muscles: ['jawMuscles'], frames: [
    f(0, 0), f(0.8, 0, { jawOpen: 0.15 }), f(1.8, 1, { jawOpen: 0.15, jawLateral: -1 }, true), f(3, 1, { jawOpen: 0.15, jawLateral: -1 }),
    f(4, 2, { jawOpen: 0.15 }), f(5, 2, { jawOpen: 0.15, jawLateral: 1 }, true), f(6.2, 2, { jawOpen: 0.15, jawLateral: 1 }), f(7.2, 0, { jawOpen: 0.15 }), f(8, 0)] },
  { id: 'jaw-protrusion', external: 'profile', posture: 'sitting', muscles: ['jawMuscles'], frames: [
    f(0, 0), f(0.6, 0, { jawOpen: 0.1 }), f(1.4, 1, { jawOpen: 0.12, jawProtrude: 1 }, true), f(3.4, 2, { jawOpen: 0.12, jawProtrude: 1 }), f(4.6, 2), f(5.6, 0)] },
  { id: 'jaw-stack', external: 'profile', posture: 'sitting', device: 'stack', muscles: ['jawMuscles'], frames: [
    f(0, 0, { jawOpen: 0.35 }), f(1, 1, { jawOpen: 0.35 }), f(2.2, 1, { jawOpen: 0.62, effort: 0.6 }, true),
    f(5.4, 2, { jawOpen: 0.62, effort: 0.6 }), f(6.6, 2, { jawOpen: 0.35 }), f(7.6, 0, { jawOpen: 0.35 })] },
  { id: 'jaw-device', external: 'profile', posture: 'sitting', device: 'jawDevice', muscles: ['jawMuscles'], frames: [
    f(0, 0, { jawOpen: 0.3 }), f(1, 1, { jawOpen: 0.3 }), f(2.4, 1, { jawOpen: 0.75, effort: 0.6 }, true),
    f(5.4, 2, { jawOpen: 0.75, effort: 0.6 }), f(6.8, 2, { jawOpen: 0.3 }), f(7.8, 0, { jawOpen: 0.3 })] },
  { id: 'lip-seal', external: 'front', posture: 'sitting', muscles: ['lips'], frames: [
    f(0, 0), f(1, 1, { lipPress: 1, effort: 1 }, true), f(4, 2, { lipPress: 1, effort: 1 }), f(5, 2), f(6, 0)] },
  { id: 'pucker-smile', external: 'front', posture: 'sitting', muscles: ['lips'], frames: [
    f(0, 0), f(1, 1, { pucker: 1, effort: 0.8 }, true), f(2.6, 1, { pucker: 1, effort: 0.8 }),
    f(3.6, 2, { spread: 1, effort: 0.8 }, true), f(5.2, 2, { spread: 1, effort: 0.8 }), f(6.2, 0)] },
  { id: 'cheek-puff', external: 'front', posture: 'sitting', muscles: ['lips'], frames: [
    f(0, 0), f(1, 1, { lipPress: 0.7, cheekPuff: 1, effort: 0.6 }, true), f(4, 2, { lipPress: 0.7, cheekPuff: 1, effort: 0.6 }), f(5, 2), f(6, 0)] },
  { id: 'tongue-protrusion', external: 'profile', posture: 'sitting', muscles: ['tongue'], frames: [
    f(0, 0), f(0.6, 0, { jawOpen: 0.3 }), f(1.4, 1, { jawOpen: 0.35, tongueProtrude: 1, effort: 0.6 }, true),
    f(3.4, 2, { jawOpen: 0.35, tongueProtrude: 1, effort: 0.6 }), f(4.4, 2, { jawOpen: 0.15 }), f(5.4, 0)] },
  { id: 'tongue-elevation', external: 'profile', posture: 'sitting', muscles: ['tongue'], frames: [
    f(0, 0), f(0.6, 0, { jawOpen: 0.3 }), f(1.4, 1, { jawOpen: 0.3, tongueTipUp: 1, effort: 0.6 }, true),
    f(3.4, 2, { jawOpen: 0.3, tongueTipUp: 1, effort: 0.6 }), f(4.4, 2, { jawOpen: 0.1 }), f(5.4, 0)] },
  { id: 'tongue-lateral', external: 'front', posture: 'sitting', muscles: ['tongue'], frames: [
    f(0, 0), f(0.8, 0, { jawOpen: 0.4 }), f(1.8, 1, { jawOpen: 0.4, tongueLateral: -1, tongueProtrude: 0.5 }, true),
    f(3, 1, { jawOpen: 0.4, tongueLateral: -1, tongueProtrude: 0.5 }), f(3.8, 2, { jawOpen: 0.4, tongueProtrude: 0.3 }),
    f(4.8, 2, { jawOpen: 0.4, tongueLateral: 1, tongueProtrude: 0.5 }, true), f(6, 2, { jawOpen: 0.4, tongueLateral: 1, tongueProtrude: 0.5 }),
    f(6.8, 0, { jawOpen: 0.4 }), f(7.6, 0)] },
  { id: 'tongue-retraction', external: 'profile', posture: 'sitting', muscles: ['tongueBase'], frames: [
    f(0, 0), f(0.6, 1), f(1.6, 1, { tongueRetract: 1, effort: 0.8 }, true), f(3.6, 2, { tongueRetract: 1, effort: 0.8 }), f(4.6, 2), f(5.6, 0)] },
  { id: 'palate-press', external: 'profile', posture: 'sitting', muscles: ['tongue'], frames: [
    f(0, 0), f(0.6, 1), f(1.4, 1, { tonguePress: 1, effort: 1 }, true), f(4.4, 2, { tonguePress: 1, effort: 1 }), f(5.4, 2), f(6.4, 0)] },
  { id: 'shaker', external: 'profile', posture: 'supine', muscles: ['suprahyoid', 'neck'], frames: [
    f(0, 0), f(1, 1), f(2.4, 1, { headFlex: 0.9, effort: 0.8 }, true), f(5.4, 2, { headFlex: 0.9, effort: 0.8 }), f(6.8, 2), f(8, 0)] },
  { id: 'ctar', external: 'profile', posture: 'sitting', device: 'ball', muscles: ['suprahyoid'], frames: [
    f(0, 0, { headFlex: 0.15 }), f(1, 1, { headFlex: 0.15 }), f(2, 1, { headFlex: 0.55, effort: 1 }, true),
    f(4.6, 2, { headFlex: 0.55, effort: 1 }), f(5.6, 2, { headFlex: 0.15 }), f(6.6, 0, { headFlex: 0.15 })] },
  { id: 'pitch-glide', external: 'profile', posture: 'sitting', sound: true, muscles: ['larynx', 'suprahyoid'], frames: [
    f(0, 0), f(0.8, 0, { jawOpen: 0.2, airOut: 0.4 }), f(3, 1, { jawOpen: 0.2, hyoidLift: 1, airOut: 0.7, effort: 0.8 }, true),
    f(4.4, 2, { jawOpen: 0.2, hyoidLift: 1, airOut: 0.7, effort: 0.8 }), f(6.2, 2, { jawOpen: 0.2, airOut: 0.3 }), f(7.2, 0)] },
  { id: 'yawn', external: 'profile', posture: 'sitting', muscles: ['tongueBase', 'suprahyoid'], frames: [
    f(0, 0), f(0.6, 1), f(2, 1, { jawOpen: 1, hyoidLift: -0.5, tongueRetract: 0.3, effort: 0.6 }, true),
    f(4.4, 2, { jawOpen: 1, hyoidLift: -0.5, tongueRetract: 0.3, effort: 0.6 }), f(5.8, 2), f(6.8, 0)] },
  { id: 'gargle', external: 'profile', posture: 'sitting', muscles: ['tongueBase'], frames: [
    f(0, 0), f(1, 1, { headFlex: -0.3, tongueRetract: 0.8, jawOpen: 0.15, effort: 0.7 }),
    f(1.4, 1, { headFlex: -0.3, tongueRetract: 0.55, jawOpen: 0.15, effort: 0.7 }), f(1.8, 1, { headFlex: -0.3, tongueRetract: 0.85, jawOpen: 0.15, effort: 0.7 }),
    f(2.2, 1, { headFlex: -0.3, tongueRetract: 0.55, jawOpen: 0.15, effort: 0.7 }), f(2.6, 1, { headFlex: -0.3, tongueRetract: 0.85, jawOpen: 0.15, effort: 0.7 }),
    f(3, 2, { headFlex: -0.3, tongueRetract: 0.55, jawOpen: 0.15, effort: 0.7 }), f(4, 2), f(5, 0)] },
  { id: 'emst', external: 'profile', posture: 'sitting', device: 'emst', muscles: ['respiratory'], frames: [
    f(0, 0), f(0.8, 1), f(2, 1, { chest: 1 }), f(2.4, 2, { chest: 1, effort: 0.6 }), f(3, 2, { chest: 0.1, airOut: 1, effort: 1 }),
    f(3.8, 2, { airOut: 0.1, effort: 0.2 }), f(5, 0)] },
  { id: 'chin-tuck', external: 'profile', posture: 'sitting', muscles: ['neck'], frames: [
    f(0, 0), f(0.6, 1), f(1.6, 1, { headFlex: 0.5 }), f(2.2, 2, { headFlex: 0.5 }), f(3, 2, { headFlex: 0.5, ...SWALLOW }),
    f(3.8, 2, { headFlex: 0.5, hyoidLift: 0.2 }), f(5, 0), f(6, 0)] },
  { id: 'head-turn', external: 'front', posture: 'sitting', muscles: ['neck'], frames: [
    f(0, 0), f(0.6, 1), f(1.8, 1, { headTurn: -1 }), f(2.4, 2, { headTurn: -1 }), f(3.2, 2, { headTurn: -1, ...SWALLOW }),
    f(4, 2, { headTurn: -1, hyoidLift: 0.2 }), f(5.2, 0), f(6.2, 0)] },
  { id: 'head-tilt', external: 'front', posture: 'sitting', muscles: ['neck'], frames: [
    f(0, 0), f(0.6, 1), f(1.8, 1, { headTilt: -1 }), f(2.4, 2, { headTilt: -1 }), f(3.2, 2, { headTilt: -1, ...SWALLOW }),
    f(4, 2, { headTilt: -1, hyoidLift: 0.2 }), f(5.2, 0), f(6.2, 0)] },
];

export const motionSpecFor = (id: string): MotionSpec | undefined => MOTION_SPECS.find(spec => spec.id === id);
export const cycleLength = (spec: MotionSpec) => spec.frames[spec.frames.length - 1].t;

const full = (pose: Partial<Pose>): Pose => ({ ...REST_POSE, ...pose });
const ease = (u: number) => u * u * (3 - 2 * u);

export type MotionSample = { pose: Pose; phase: 0 | 1 | 2; hold: { elapsed: number; total: number } | null; time: number };

/** Pose at a time in seconds (looping). Linear-in-time with smoothstep easing between frames; hold segments stay still. */
export function samplePose(spec: MotionSpec, seconds: number): MotionSample {
  const length = cycleLength(spec);
  const time = ((seconds % length) + length) % length;
  const frames = spec.frames;
  let i = frames.length - 2;
  for (let k = 0; k < frames.length - 1; k += 1) if (time < frames[k + 1].t) { i = k; break; }
  const a = frames[i], b = frames[i + 1];
  const pa = full(a.pose), pb = full(b.pose);
  if (a.hold) return { pose: pa, phase: a.phase, hold: { elapsed: time - a.t, total: b.t - a.t }, time };
  const u = ease(Math.min(1, Math.max(0, (time - a.t) / (b.t - a.t))));
  const pose = { ...REST_POSE };
  for (const key of Object.keys(REST_POSE) as (keyof Pose)[]) pose[key] = pa[key] + (pb[key] - pa[key]) * u;
  // A bolus never travels backwards: once swallowed it stays out of view until the loop restarts.
  if (pb.bolus < pa.bolus) pose.bolus = pa.bolus >= 0.999 ? 1 : 0;
  return { pose, phase: a.phase, hold: null, time };
}

/** Representative time for each phase: the middle of its first hold, or of its first moving segment. */
export function phaseKeyTime(spec: MotionSpec, phase: 0 | 1 | 2): number {
  const frames = spec.frames;
  const hold = frames.findIndex((fr, k) => fr.phase === phase && fr.hold && k < frames.length - 1);
  if (hold >= 0) return (frames[hold].t + frames[hold + 1].t) / 2;
  const k = frames.findIndex((fr, idx) => fr.phase === phase && idx < frames.length - 1);
  return k < 0 ? 0 : frames[k].t + 0.001;
}
