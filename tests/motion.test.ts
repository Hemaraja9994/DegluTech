import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTION_SPECS, POSE_RANGE, REST_POSE, samplePose, phaseKeyTime, cycleLength, motionSpecFor, type Pose } from '../apps/desktop/src/exerciseMotion.ts';
import { HNC_EXERCISE_LIBRARY } from '../packages/core/src/hncClinicalModel.ts';

const manifest = JSON.parse(readFileSync(new URL('../assets/exercises/exercises.json', import.meta.url), 'utf8'));
const keys = Object.keys(REST_POSE) as (keyof Pose)[];

test('every catalogue and prescribable exercise has an animation spec', () => {
  for (const e of manifest.exercises) assert.ok(motionSpecFor(e.id), `missing spec: ${e.id}`);
  for (const e of HNC_EXERCISE_LIBRARY) assert.ok(motionSpecFor(e.id), `missing spec: ${e.id}`);
  assert.equal(new Set(MOTION_SPECS.map(s => s.id)).size, MOTION_SPECS.length, 'duplicate spec ids');
});

test('timelines start at zero, increase strictly and loop within 4-16 seconds', () => {
  for (const s of MOTION_SPECS) {
    assert.equal(s.frames[0].t, 0, s.id);
    for (let i = 1; i < s.frames.length; i += 1) assert.ok(s.frames[i].t > s.frames[i - 1].t, `${s.id} frame ${i}`);
    const len = cycleLength(s);
    assert.ok(len >= 4 && len <= 16, `${s.id} cycle ${len}`);
  }
});

test('all pose values stay inside their anatomical parameter range', () => {
  for (const s of MOTION_SPECS) for (const fr of s.frames) for (const [k, v] of Object.entries(fr.pose)) {
    const [lo, hi] = POSE_RANGE[k as keyof Pose];
    assert.ok(v >= lo && v <= hi, `${s.id} ${k}=${v}`);
  }
});

test('each animation covers all three steps and starts and ends at rest', () => {
  for (const s of MOTION_SPECS) {
    assert.deepEqual([...new Set(s.frames.map(f => f.phase))].sort(), [0, 1, 2], s.id);
    const first = samplePose(s, 0).pose, last = samplePose(s, cycleLength(s) - 1e-6).pose;
    for (const k of keys) assert.ok(Math.abs(first[k] - last[k]) < 0.02, `${s.id} loop seam on ${k}`);
  }
});

test('holds last at least one second and keep the pose still', () => {
  for (const s of MOTION_SPECS) s.frames.forEach((fr, i) => {
    if (!fr.hold) return;
    const next = s.frames[i + 1];
    assert.ok(next && next.t - fr.t >= 1, `${s.id} hold ${i} too short`);
    const a = samplePose(s, fr.t + 0.05).pose, b = samplePose(s, next.t - 0.05).pose;
    for (const k of keys) assert.equal(a[k], b[k], `${s.id} moves during hold (${k})`);
  });
});

test('motion is continuous (no jumps between neighbouring instants)', () => {
  for (const s of MOTION_SPECS) {
    const len = cycleLength(s);
    for (let t = 0; t < len - 0.02; t += 0.02) {
      const a = samplePose(s, t).pose, b = samplePose(s, t + 0.02).pose;
      for (const k of keys) if (k !== 'bolus') assert.ok(Math.abs(a[k] - b[k]) < 0.2, `${s.id} jump on ${k} at ${t.toFixed(2)}s`);
    }
  }
});

test('step buttons land on the requested step', () => {
  for (const s of MOTION_SPECS) for (const ph of [0, 1, 2] as const) assert.equal(samplePose(s, phaseKeyTime(s, ph)).phase, ph, `${s.id} step ${ph + 1}`);
});

test('a swallowed bolus never moves backwards up the throat', () => {
  for (const s of MOTION_SPECS.filter(x => x.bolus)) {
    let prev = 0;
    for (let t = 0; t < cycleLength(s) - 1.2; t += 0.02) {
      const b = samplePose(s, t).pose.bolus;
      if (b > 0.001 && b < 0.999) assert.ok(b >= prev - 1e-9, `${s.id} bolus reverses at ${t.toFixed(2)}s`);
      if (b > 0.001 && b < 0.999) prev = b;
    }
  }
});

test('bolus appears only in exercises that use one; manifest has three English steps each', () => {
  for (const s of MOTION_SPECS) if (!s.bolus) assert.ok(s.frames.every(f => !f.pose.bolus), `${s.id} has bolus without flag`);
  for (const e of manifest.exercises) {
    assert.equal(e.steps.en.length, 3, e.id);
    for (const st of e.steps.en) assert.ok(st.cue.trim() && st.instruction.trim(), e.id);
    assert.equal(e.animation.engine, 'svg-motion');
  }
});
