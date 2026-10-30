import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_STORE, DEFAULT_SETTINGS, addPatient, buildBackup, cleanSettings, cleanStore, createPatient, mergeStores, migrateLegacy,
  parseBackup, patientCode, patientLabel, printIdentity, removeDemoPatients, removePatient, riskFor, alertsFor, adherencePercent,
  signingClinician, toCaseloadEntry, updateIdentity, updateWorkspace, validatePatient,
} from '../apps/desktop/src/clinicStore.ts';
import { buildDemoPatients, DEMO_FIELD_STATE } from '../apps/desktop/src/demoData.ts';

const ravi = () => createPatient({ name: 'Ravi Kumar', hospitalId: 'UHID-77', studyId: 'DT-HNC-001', age: '58', gender: 'Male', phase: 'Post-CRT' }, new Date('2026-10-30T09:00:00Z'));

test('the app starts with no patients and no demo data', () => {
  assert.deepEqual(EMPTY_STORE.patients, []);
  assert.equal(cleanStore(null).patients.length, 0);
  assert.equal(DEFAULT_SETTINGS.clinicians.length, 0);
});

test('a new patient carries identity into the chart fields', () => {
  const p = ravi();
  assert.equal(p.workspace.fieldState.studyId, 'DT-HNC-001');
  assert.equal(p.workspace.fieldState.age, '58');
  assert.equal(p.workspace.fieldState.phase, 'Post-CRT');
  assert.equal(p.workspace.fieldState.evaluationDate, '2026-10-30');
  assert.deepEqual(p.workspace.prescribedExerciseIds, []);
});

test('validation needs one identifier, unique IDs and a numeric age', () => {
  const s = addPatient(EMPTY_STORE, ravi());
  assert.match(validatePatient({ name: ' ', hospitalId: '', studyId: '' }, s.patients)!, /at least/);
  assert.match(validatePatient({ name: 'X', hospitalId: 'uhid-77', studyId: '' }, s.patients)!, /already used/);
  assert.match(validatePatient({ name: 'X', hospitalId: '', studyId: 'dt-hnc-001' }, s.patients)!, /already used/);
  assert.match(validatePatient({ name: 'X', hospitalId: '', studyId: '', age: '5y' }, s.patients)!, /whole number/);
  assert.equal(validatePatient({ name: 'Ravi Kumar', hospitalId: 'UHID-77', studyId: 'DT-HNC-001' }, s.patients, s.patients[0].id), null);
});

test('adding opens the patient; deleting removes all their records and moves to the next', () => {
  const a = ravi(), b = createPatient({ name: 'Lakshmi', hospitalId: '', studyId: 'DT-HNC-002' });
  let s = addPatient(addPatient(EMPTY_STORE, a), b);
  assert.equal(s.activeId, b.id);
  s = removePatient(s, b.id);
  assert.equal(s.patients.length, 1);
  assert.equal(s.activeId, a.id);
  s = removePatient(s, a.id);
  assert.equal(s.activeId, null);
});

test('chart edits go only to the open patient and keep the study ID in step', () => {
  const a = ravi(), b = createPatient({ name: 'Lakshmi', hospitalId: '', studyId: 'DT-HNC-002' });
  let s = addPatient(addPatient(EMPTY_STORE, a), b);
  s = updateWorkspace(s, a.id, w => ({ ...w, fieldState: { ...w.fieldState, eat10: '22', studyId: 'DT-HNC-009' } }));
  assert.equal(s.patients.find(p => p.id === a.id)!.workspace.fieldState.eat10, '22');
  assert.equal(s.patients.find(p => p.id === a.id)!.studyId, 'DT-HNC-009');
  assert.equal(s.patients.find(p => p.id === b.id)!.workspace.fieldState.eat10, undefined);
  const same = updateWorkspace(s, a.id, w => w);
  assert.equal(same, s, 'no change keeps the same object (no needless save)');
  s = updateIdentity(s, b.id, { name: 'Lakshmi Devi', hospitalId: 'UHID-88', studyId: 'DT-HNC-002' });
  assert.equal(s.patients.find(p => p.id === b.id)!.name, 'Lakshmi Devi');
});

test('the old single-patient demo draft migrates as a demo patient; real drafts as a patient', () => {
  const demo = migrateLegacy(JSON.stringify({ fieldState: DEMO_FIELD_STATE, storedAt: '2026-10-01T00:00:00Z' }));
  assert.equal(demo!.demo, true);
  const real = migrateLegacy(JSON.stringify({ fieldState: { studyId: 'DT-HNC-050', eat10: '12' } }));
  assert.equal(real!.demo, undefined);
  assert.equal(real!.studyId, 'DT-HNC-050');
  assert.equal(migrateLegacy(null), null);
  assert.equal(migrateLegacy('not json'), null);
  assert.equal(migrateLegacy(JSON.stringify({ fieldState: {} })), null);
});

test('backups round-trip, reject other files and merge by patient', () => {
  const a = ravi();
  const s = addPatient(EMPTY_STORE, a);
  const settings = cleanSettings({ instituteName: 'Yenepoya Medical College Hospital', clinicians: [{ id: 'c1', name: 'Mr. Hemaraja Nayaka S', registration: 'A30294' }] });
  const backup = buildBackup(s, settings, '0.4.0-review');
  const back = parseBackup(JSON.stringify(backup));
  assert.ok(typeof back !== 'string');
  assert.equal(back.store.patients[0].name, 'Ravi Kumar');
  assert.equal(back.settings!.instituteName, 'Yenepoya Medical College Hospital');
  assert.match(parseBackup('{"hello":1}') as string, /not a DegluTech backup/);
  assert.match(parseBackup('<<<') as string, /not valid JSON/);
  const other = addPatient(EMPTY_STORE, createPatient({ name: 'Lakshmi', hospitalId: '', studyId: 'DT-HNC-002' }));
  const merged = mergeStores(other, back.store);
  assert.equal(merged.patients.length, 2);
  assert.equal(mergeStores(merged, back.store).patients.length, 2, 'importing twice does not duplicate');
  const single = buildBackup(merged, null, 'x', a.id);
  assert.equal(single.store.patients.length, 1);
});

test('tampered backups are cleaned: bad fields, scripts in images, duplicate patients', () => {
  const store = cleanStore({ patients: [
    { id: 'x1', name: 'A', workspace: { fieldState: { eat10: '5', evil: { a: 1 }, list: ['ok', 3] } } },
    { id: 'x1', name: 'Duplicate' },
    { id: 'x2' },
  ], activeId: 'nope' });
  assert.equal(store.patients.length, 1);
  assert.deepEqual(store.patients[0].workspace.fieldState, { eat10: '5' });
  assert.equal(store.activeId, 'x1');
  const s = cleanSettings({ logo: 'javascript:alert(1)', clinicians: [{ id: 'c', name: 'N', signature: 'data:image/svg+xml;base64,PHN2Zz4=' }] });
  assert.equal(s.logo, '');
  assert.equal(s.clinicians[0].signature, '');
  assert.equal(s.signingClinicianId, 'c');
});

test('printouts hide names and hospital IDs when Settings asks, keeping the study ID', () => {
  const p = ravi();
  assert.deepEqual(printIdentity(p, DEFAULT_SETTINGS).map(r => r.label), ['Patient', 'Hospital ID', 'Study ID']);
  const hidden = printIdentity(p, { ...DEFAULT_SETTINGS, hideNamesInPrint: true });
  assert.deepEqual(hidden, [{ label: 'Study ID', value: 'DT-HNC-001' }]);
  assert.equal(patientLabel(p, true), 'DT-HNC-001');
  assert.equal(patientCode({ ...p, studyId: '', hospitalId: '' }).length, 6);
  const noStudy = { ...p, studyId: '' };
  assert.deepEqual(printIdentity(noStudy, { ...DEFAULT_SETTINGS, hideNamesInPrint: true })[0].label, 'Patient');
});

test('the signing clinician falls back to the first one listed', () => {
  const s = cleanSettings({ clinicians: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], signingClinicianId: 'b' });
  assert.equal(signingClinician(s)!.name, 'B');
  assert.equal(signingClinician(s, 'a')!.name, 'A');
  assert.equal(signingClinician({ ...s, signingClinicianId: 'gone' })!.name, 'A');
  assert.equal(signingClinician(DEFAULT_SETTINGS), null);
});

test('dashboard rows come from the real chart and invent nothing', () => {
  const p = ravi();
  const empty = toCaseloadEntry(p, 'DT-HNC-001');
  assert.equal(empty.riskLevel, 'low');
  assert.deepEqual(empty.alerts, []);
  assert.deepEqual(empty.trends, []);
  assert.equal(empty.nextReview, '');
  p.workspace.fieldState = { ...p.workspace.fieldState, aspirationRisk: '3', jawOpening: '28', eat10: '19', wetVoice: 'Intermittent',
    sessionLogs: JSON.stringify([{ planned: 3, completed: 2 }, { planned: 3, completed: 3 }]) };
  const row = toCaseloadEntry(p, 'DT-HNC-001');
  assert.equal(row.riskLevel, 'high');
  assert.equal(row.eat10, 19);
  assert.equal(row.adherence, 83);
  assert.equal(row.recordId, p.id);
  assert.ok(row.alerts.some(a => /Trismus/.test(a)) && row.alerts.some(a => /EAT-10 19/.test(a)) && row.alerts.some(a => /wet voice/.test(a)));
  assert.equal(riskFor({ nutritionRisk: '2' }), 'moderate');
  assert.equal(adherencePercent({}), null);
  assert.deepEqual(alertsFor({}), []);
});

test('demo patients load only on request, are labelled and removable', () => {
  const demos = buildDemoPatients();
  assert.equal(demos.length, 8);
  assert.ok(demos.every(d => d.demo && d.name.startsWith('Demo patient') && d.studyId.startsWith('DEMO-')));
  let s = addPatient(EMPTY_STORE, ravi());
  s = { ...s, patients: [...s.patients, ...demos] };
  const row = toCaseloadEntry(demos[0], demos[0].studyId);
  assert.match(row.displayName, /\(demo\)/);
  s = removeDemoPatients(s);
  assert.equal(s.patients.length, 1);
  assert.equal(s.patients[0].name, 'Ravi Kumar');
});
