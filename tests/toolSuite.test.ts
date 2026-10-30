import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOOLS, TOOL_CATEGORIES, EAT10_ITEMS, eat10Band, eat10Score, readEat10Items, readEat10Sessions, saveEat10Session,
  eat10EmrNote, patientLine, handoutProgress, lastResultFor, type Eat10Response,
} from '../apps/desktop/src/toolSuite.ts';

const full = (v: Eat10Response): Eat10Response[] => Array(10).fill(v);

test('EAT-10 has ten items and every tool belongs to a known category', () => {
  assert.equal(EAT10_ITEMS.length, 10);
  const cats = new Set(TOOL_CATEGORIES.map(c => c.id));
  for (const t of TOOLS) assert.ok(cats.has(t.cat), t.id);
  assert.equal(new Set(TOOLS.map(t => t.id)).size, TOOLS.length);
});

test('EAT-10 cut-offs: 0-2 normal, 3-15 abnormal, above 15 aspiration risk', () => {
  assert.equal(eat10Band(0).tone, 'safe');
  assert.equal(eat10Band(2).tone, 'safe');
  assert.equal(eat10Band(3).tone, 'caution');
  assert.equal(eat10Band(15).tone, 'caution');
  assert.equal(eat10Band(16).tone, 'risk');
  assert.equal(eat10Band(40).tone, 'risk');
});

test('score counts answered items and reports missing ones', () => {
  const r: Eat10Response[] = [4, 3, null, 0, 1, null, 2, 2, 0, 1];
  assert.deepEqual(eat10Score(r), { total: 13, answered: 8, missing: 2 });
  assert.deepEqual(eat10Score(full(4)), { total: 40, answered: 10, missing: 0 });
  assert.deepEqual(eat10Score(full(null)), { total: 0, answered: 0, missing: 10 });
});

test('stored responses are parsed defensively', () => {
  assert.deepEqual(readEat10Items({}), full(null));
  assert.deepEqual(readEat10Items({ eat10Items: 'not json' }), full(null));
  assert.deepEqual(readEat10Items({ eat10Items: '{"a":1}' }), full(null));
  assert.deepEqual(readEat10Items({ eat10Items: JSON.stringify([1, 5, -1, '2', 4]) }), [1, null, null, null, 4, null, null, null, null, null]);
});

test('saving replaces a same-day session, keeps date order and mirrors eat10', () => {
  let state: Record<string, string | string[]> = { phase: 'Post-CRT' };
  state = { ...state, ...saveEat10Session(state, full(1), '2026-10-01') };
  state = { ...state, ...saveEat10Session(state, full(2), '2026-09-01') };
  state = { ...state, ...saveEat10Session(state, full(3), '2026-10-01') };
  const s = readEat10Sessions(state);
  assert.deepEqual(s.map(x => [x.date, x.total]), [['2026-09-01', 20], ['2026-10-01', 30]]);
  assert.equal(state.eat10, '30');
  assert.equal(s[1].phaseLabel, 'Post-CRT');
  const partial = saveEat10Session({}, [1, null, null, null, null, null, null, null, null, null], '2026-10-02');
  const p = readEat10Sessions(partial)[0];
  assert.equal(p.provisional, true);
  assert.equal(p.phaseLabel, 'Session');
});

test('invalid saved sessions are dropped', () => {
  const bad = JSON.stringify([{ date: '01/10/2026', total: 5, items: full(0) }, { date: '2026-10-01', total: 41, items: full(4) }, { date: '2026-10-02', total: 4, items: [1] }, null]);
  assert.deepEqual(readEat10Sessions({ eat10Sessions: bad }), []);
  assert.deepEqual(readEat10Sessions({ eat10Sessions: '[' }), []);
});

test('EMR note carries total, interpretation, items, trend and plan', () => {
  const patient = patientLine({ tumorSite: 'Oropharynx', tCategory: 'T2', nCategory: 'N1', mCategory: 'M0', age: '58', gender: 'Male' }, 'HNC-2026-001');
  assert.equal(patient.id, 'HNC-2026-001');
  assert.equal(patient.ageSex, '58 M');
  assert.equal(patient.dx, 'Oropharynx · T2N1M0');
  const resp: Eat10Response[] = [2, 2, 2, 2, 2, 2, 2, 2, 2, null];
  const history = readEat10Sessions(saveEat10Session({ phase: 'Prehab' }, full(1), '2026-08-01'));
  const note = eat10EmrNote({ dateLabel: '29 Oct 2026', patient, resp, history, followUp: 'Review in 2 weeks' });
  assert.match(note, /EAT-10 total: 18\/40 \(provisional, 1 item\(s\) unanswered\)/);
  assert.match(note, /A: Abnormal · aspiration risk\./);
  assert.match(note, /^S: /m); assert.match(note, /^O: /m);
  assert.match(note, /10=-/);
  assert.match(note, /Trend: Prehab 10 > Today 18/);
  assert.match(note, /P: Review in 2 weeks/);
  assert.equal(patientLine({}, 'X').dx, 'Diagnosis not recorded');
});

test('handout progress wording follows the saved history', () => {
  assert.match(handoutProgress([], 5), /compare it with your next check/);
  const h = readEat10Sessions(saveEat10Session({}, full(3), '2026-08-01'));
  assert.match(handoutProgress(h, 10), /lower than your highest/);
  assert.match(handoutProgress(h, 30), /Keep doing your exercises/);
});

test('hub results are read from recorded fields and never invented', () => {
  for (const t of TOOLS) assert.equal(lastResultFor(t.id, {}), null, t.id);
  assert.equal(lastResultFor('eat10', { eat10: '12' })?.label, 'Abnormal');
  assert.equal(lastResultFor('eat10', { eat10: '55' }), null);
  assert.equal(lastResultFor('masa', { masa: '170' })?.label, 'Mild dysphagia');
  assert.equal(lastResultFor('masa', { masa: '178' })?.tone, 'safe');
  assert.equal(lastResultFor('trismus', { jawTrial1: '30', jawTrial2: '33', jawTrial3: '31' })?.value, '33 mm');
  assert.equal(lastResultFor('trismus', { jawOpening: '40' })?.label, 'Within range');
  assert.equal(lastResultFor('pas', { pas: '1' })?.tone, 'safe');
  assert.equal(lastResultFor('pas', { pas: '5' })?.label, 'Penetration');
  assert.equal(lastResultFor('pas', { pas: '7' })?.label, 'Aspiration');
  assert.equal(lastResultFor('pas', { pas: '9' }), null);
  assert.equal(lastResultFor('fois', { fois: '3' })?.label, 'Tube dependent');
  assert.equal(lastResultFor('fois', { fois: '7' })?.tone, 'safe');
  assert.equal(lastResultFor('icf', { b5105: '3' })?.label, 'Severe');
  assert.equal(lastResultFor('residue', { residue: ['Vallecular', 'Pyriform'] })?.value, 'Vallecular, Pyriform');
  assert.equal(lastResultFor('acoustic', { mpt: '9' })?.value, 'MPT 9 s');
  assert.equal(lastResultFor('adherence', { sessionLogs: JSON.stringify([{ completed: 2 }, { completed: 1 }]) })?.value, '3 sessions');
  assert.equal(lastResultFor('mdadi', { eat10: '5' }), null);
});
