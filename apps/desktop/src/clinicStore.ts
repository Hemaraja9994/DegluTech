// Patients, clinic settings and backups. Everything stays in this browser on this device;
// backups are JSON files the clinician exports and imports. Pure functions only (unit-tested).
import type { FieldState } from './reportEngine';
import { syncActivePatientFromFieldState, type CarePhase, type PatientCaseloadEntry, type RiskLevel, type Severity } from './caseloadData.ts';
import { readEat10Sessions } from './toolSuite.ts';

export const PATIENTS_KEY = 'deglutech-patients-v2';
export const SETTINGS_KEY = 'deglutech-settings-v1';
export const LEGACY_WORKSPACE_KEY = 'deglutech-hnc-clinical-workspace-v1';
export const BACKUP_KIND = 'deglutech-backup';
const DEMO_PATIENT_HASH = '5e883e81b37e1273b4b455b5d198ee6a3782b6e1e21b7c3cf374fa04e22e845c';

export type Workspace = {
  fieldState: FieldState;
  selectedExerciseId: string;
  patientLanguage: string;
  prescribedExerciseIds: string[];
  savedAt: string;
};
export type PatientRecord = {
  id: string;
  name: string;
  hospitalId: string;
  studyId: string;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
  /** Demo patients keep their illustrative history so the dashboard charts have something to show. */
  demoProfile?: PatientCaseloadEntry;
  workspace: Workspace;
};
export type PatientStore = { version: 2; activeId: string | null; patients: PatientRecord[] };

export type Clinician = { id: string; name: string; qualification: string; designation: string; registration: string; signature: string };
export type ClinicSettings = {
  instituteName: string;
  department: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  clinicians: Clinician[];
  signingClinicianId: string | null;
  hideNamesInPrint: boolean;
};

export const EMPTY_WORKSPACE: Workspace = { fieldState: {}, selectedExerciseId: 'masako', patientLanguage: 'en', prescribedExerciseIds: [], savedAt: 'Not saved this session' };
export const EMPTY_STORE: PatientStore = { version: 2, activeId: null, patients: [] };
export const DEFAULT_SETTINGS: ClinicSettings = {
  instituteName: '', department: 'Speech-Language Pathology', address: '', phone: '', email: '', logo: '',
  clinicians: [], signingClinicianId: null, hideNamesInPrint: false,
};

const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : '');
export const newId = (prefix = 'p') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ---------- validation of anything read from storage or a backup file ----------
function cleanFieldState(raw: unknown): FieldState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string')))) as FieldState;
}
function cleanWorkspace(raw: unknown): Workspace {
  const w = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    fieldState: cleanFieldState(w.fieldState),
    selectedExerciseId: str(w.selectedExerciseId, 60) || 'masako',
    patientLanguage: str(w.patientLanguage, 5) || 'en',
    prescribedExerciseIds: Array.isArray(w.prescribedExerciseIds) ? w.prescribedExerciseIds.filter((x): x is string => typeof x === 'string').slice(0, 60) : [],
    savedAt: str(w.savedAt, 80) || 'Not saved this session',
  };
}
export function cleanPatient(raw: unknown): PatientRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 80);
  if (!id) return null;
  const name = str(r.name, 120), hospitalId = str(r.hospitalId, 60), studyId = str(r.studyId, 60);
  if (!name && !hospitalId && !studyId) return null;
  const now = new Date().toISOString();
  return {
    id, name, hospitalId, studyId,
    createdAt: str(r.createdAt, 40) || now, updatedAt: str(r.updatedAt, 40) || now,
    ...(r.demo === true ? { demo: true } : {}),
    ...(r.demo === true && r.demoProfile && typeof r.demoProfile === 'object' ? { demoProfile: r.demoProfile as PatientCaseloadEntry } : {}),
    workspace: cleanWorkspace(r.workspace),
  };
}
export function cleanStore(raw: unknown): PatientStore {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_STORE };
  const r = raw as Record<string, unknown>;
  const seen = new Set<string>();
  const patients = (Array.isArray(r.patients) ? r.patients : []).map(cleanPatient).filter((p): p is PatientRecord => !!p && !seen.has(p.id) && !!seen.add(p.id));
  const activeId = typeof r.activeId === 'string' && patients.some(p => p.id === r.activeId) ? r.activeId : patients[0]?.id ?? null;
  return { version: 2, activeId, patients };
}
const IMAGE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
export function cleanSettings(raw: unknown): ClinicSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const img = (v: unknown) => { const s = str(v, 700_000); return IMAGE.test(s) ? s : ''; };
  const clinicians = (Array.isArray(r.clinicians) ? r.clinicians : []).map((c): Clinician | null => {
    const o = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    const id = str(o.id, 80), name = str(o.name, 120);
    return id && name ? { id, name, qualification: str(o.qualification, 120), designation: str(o.designation, 120), registration: str(o.registration, 80), signature: img(o.signature) } : null;
  }).filter((c): c is Clinician => !!c).slice(0, 30);
  const signing = typeof r.signingClinicianId === 'string' && clinicians.some(c => c.id === r.signingClinicianId) ? r.signingClinicianId : clinicians[0]?.id ?? null;
  return {
    instituteName: str(r.instituteName, 160), department: typeof r.department === 'string' ? str(r.department, 160) : DEFAULT_SETTINGS.department,
    address: str(r.address, 400), phone: str(r.phone, 60), email: str(r.email, 120), logo: img(r.logo),
    clinicians, signingClinicianId: signing, hideNamesInPrint: r.hideNamesInPrint === true,
  };
}

// ---------- patients ----------
export type NewPatientInput = { name: string; hospitalId: string; studyId: string; age?: string; gender?: string; phase?: string };
/** Returns an error message, or null when the details can be saved. */
export function validatePatient(input: NewPatientInput, patients: PatientRecord[], editingId?: string): string | null {
  const name = input.name.trim(), hos = input.hospitalId.trim(), study = input.studyId.trim();
  if (!name && !hos && !study) return 'Enter at least a name, hospital ID or study ID.';
  const others = patients.filter(p => p.id !== editingId);
  if (hos && others.some(p => p.hospitalId.trim().toLowerCase() === hos.toLowerCase())) return `Hospital ID ${hos} is already used by another patient.`;
  if (study && others.some(p => p.studyId.trim().toLowerCase() === study.toLowerCase())) return `Study ID ${study} is already used by another patient.`;
  if (input.age && !/^\d{1,3}$/.test(input.age.trim())) return 'Age must be a whole number of years.';
  return null;
}
export function createPatient(input: NewPatientInput, now = new Date()): PatientRecord {
  const fs: FieldState = {};
  if (input.studyId.trim()) fs.studyId = input.studyId.trim();
  if (input.age?.trim()) fs.age = input.age.trim();
  if (input.gender?.trim()) fs.gender = input.gender.trim();
  if (input.phase?.trim()) fs.phase = input.phase.trim();
  fs.evaluationDate = now.toISOString().slice(0, 10);
  const iso = now.toISOString();
  return { id: newId(), name: input.name.trim(), hospitalId: input.hospitalId.trim(), studyId: input.studyId.trim(), createdAt: iso, updatedAt: iso, workspace: { ...EMPTY_WORKSPACE, fieldState: fs } };
}
export function addPatient(store: PatientStore, p: PatientRecord): PatientStore {
  return { ...store, patients: [...store.patients, p], activeId: p.id };
}
export function removePatient(store: PatientStore, id: string): PatientStore {
  const patients = store.patients.filter(p => p.id !== id);
  return { ...store, patients, activeId: store.activeId === id ? patients[0]?.id ?? null : store.activeId };
}
export function updateIdentity(store: PatientStore, id: string, input: NewPatientInput, now = new Date()): PatientStore {
  return {
    ...store, patients: store.patients.map(p => p.id !== id ? p : {
      ...p, name: input.name.trim(), hospitalId: input.hospitalId.trim(), studyId: input.studyId.trim(), updatedAt: now.toISOString(),
      workspace: { ...p.workspace, fieldState: { ...p.workspace.fieldState, studyId: input.studyId.trim() } },
    }),
  };
}
export function updateWorkspace(store: PatientStore, id: string, change: (w: Workspace) => Workspace, now = new Date()): PatientStore {
  let changed = false;
  const patients = store.patients.map(p => {
    if (p.id !== id) return p;
    const next = change(p.workspace);
    if (next === p.workspace) return p;
    changed = true;
    // keep the record's study ID in step with the Study ID field inside the chart
    const studyId = typeof next.fieldState.studyId === 'string' ? next.fieldState.studyId : p.studyId;
    return { ...p, studyId, workspace: next, updatedAt: now.toISOString() };
  });
  return changed ? { ...store, patients } : store;
}
export const removeDemoPatients = (store: PatientStore): PatientStore => {
  const patients = store.patients.filter(p => !p.demo);
  return { ...store, patients, activeId: patients.some(p => p.id === store.activeId) ? store.activeId : patients[0]?.id ?? null };
};

/** One-time move of the single-patient draft saved by versions before 0.4. The old built-in demo chart becomes a demo patient. */
export function migrateLegacy(raw: string | null): PatientRecord | null {
  if (!raw) return null;
  try {
    const old = JSON.parse(raw) as Record<string, unknown>;
    const ws = cleanWorkspace(old);
    if (!Object.keys(ws.fieldState).length) return null;
    const demo = ws.fieldState.patientHash === DEMO_PATIENT_HASH;
    const iso = str(old.storedAt, 40) || new Date().toISOString();
    return {
      id: newId(), name: demo ? 'Demo patient (earlier version)' : 'Patient from earlier draft', hospitalId: '',
      studyId: typeof ws.fieldState.studyId === 'string' ? ws.fieldState.studyId : '', createdAt: iso, updatedAt: iso,
      ...(demo ? { demo: true } : {}), workspace: ws,
    };
  } catch { return null; }
}

// ---------- backups ----------
export type Backup = { kind: typeof BACKUP_KIND; version: 1; exportedAt: string; appVersion: string; store: PatientStore; settings?: ClinicSettings };
export function buildBackup(store: PatientStore, settings: ClinicSettings | null, appVersion: string, onlyId?: string): Backup {
  const patients = onlyId ? store.patients.filter(p => p.id === onlyId) : store.patients;
  return { kind: BACKUP_KIND, version: 1, exportedAt: new Date().toISOString(), appVersion, store: { version: 2, activeId: onlyId ?? store.activeId, patients }, ...(settings ? { settings } : {}) };
}
export function parseBackup(text: string): { store: PatientStore; settings: ClinicSettings | null } | string {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return 'This file is not a DegluTech backup (it is not valid JSON).'; }
  const r = raw as Record<string, unknown>;
  if (!r || r.kind !== BACKUP_KIND) return 'This file is not a DegluTech backup.';
  const store = cleanStore(r.store);
  if (!store.patients.length && !r.settings) return 'The backup contains no patients or settings.';
  return { store, settings: r.settings ? cleanSettings(r.settings) : null };
}
/** Merge: patients from the backup replace those with the same internal ID; others are added. */
export function mergeStores(current: PatientStore, incoming: PatientStore): PatientStore {
  const byId = new Map(current.patients.map(p => [p.id, p]));
  for (const p of incoming.patients) byId.set(p.id, p);
  const patients = [...byId.values()];
  return { version: 2, activeId: current.activeId && byId.has(current.activeId) ? current.activeId : incoming.activeId ?? patients[0]?.id ?? null, patients };
}

// ---------- labels for screens and printouts ----------
export function patientLabel(p: Pick<PatientRecord, 'name' | 'hospitalId' | 'studyId'>, hideName = false): string {
  if (!hideName && p.name) return p.name;
  return p.studyId || p.hospitalId || (hideName ? 'Name hidden' : 'Unnamed patient');
}
export function patientCode(p: Pick<PatientRecord, 'hospitalId' | 'studyId' | 'id'>): string {
  return p.studyId || p.hospitalId || p.id.slice(-6).toUpperCase();
}
/** Identity lines for reports: names only when printing names is allowed. */
export function printIdentity(p: PatientRecord | null, settings: ClinicSettings): { label: string; value: string }[] {
  if (!p) return [];
  const rows: { label: string; value: string }[] = [];
  if (!settings.hideNamesInPrint && p.name) rows.push({ label: 'Patient', value: p.name });
  if (!settings.hideNamesInPrint && p.hospitalId) rows.push({ label: 'Hospital ID', value: p.hospitalId });
  if (p.studyId) rows.push({ label: 'Study ID', value: p.studyId });
  if (!rows.length) rows.push({ label: 'Patient', value: patientCode(p) });
  return rows;
}
export const signingClinician = (s: ClinicSettings, id?: string | null): Clinician | null =>
  s.clinicians.find(c => c.id === (id ?? s.signingClinicianId)) ?? s.clinicians[0] ?? null;

// ---------- dashboard row built from a real chart ----------
const num = (v: unknown): number | null => { if (typeof v !== 'string' || !v.trim()) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
export function riskFor(fs: FieldState): RiskLevel {
  const worst = Math.max(num(fs.aspirationRisk) ?? 0, num(fs.airwayRisk) ?? 0, num(fs.nutritionRisk) ?? 0);
  return worst >= 3 ? 'high' : worst >= 2 ? 'moderate' : 'low';
}
export function adherencePercent(fs: FieldState): number | null {
  try {
    const logs: unknown = JSON.parse(String(fs.sessionLogs || '[]'));
    if (!Array.isArray(logs) || !logs.length) return null;
    let planned = 0, done = 0;
    for (const l of logs as { planned?: unknown; completed?: unknown }[]) {
      if (Number.isInteger(l?.planned) && Number.isInteger(l?.completed)) { planned += Number(l.planned); done += Math.min(Number(l.completed), Number(l.planned)); }
    }
    return planned ? Math.round((done / planned) * 100) : null;
  } catch { return null; }
}
export function alertsFor(fs: FieldState): string[] {
  const a: string[] = [];
  const jaw = num(fs.jawOpening); if (jaw !== null && jaw <= 35) a.push(`Trismus risk (jaw ${jaw} mm)`);
  const eat = num(fs.eat10); if (eat !== null && eat > 15) a.push(`EAT-10 ${eat}: higher aspiration risk`);
  const pas = num(fs.pas); if (pas !== null && pas >= 6) a.push(`Aspiration on instrumental study (PAS ${pas})`);
  if (fs.wetVoice === 'Intermittent' || fs.wetVoice === 'Consistent') a.push(`${fs.wetVoice} wet voice after swallow`);
  const wt = num(fs.weightChange); if (wt !== null && wt >= 5) a.push(`Weight loss ${wt}%`);
  return a;
}
export function toCaseloadEntry(p: PatientRecord, code: string): PatientCaseloadEntry {
  const fs = p.workspace.fieldState;
  const n = (k: string, d = 0) => num(fs[k]) ?? d;
  const sessions = readEat10Sessions(fs);
  const base: PatientCaseloadEntry = p.demoProfile ? { ...p.demoProfile } : {
    id: code, displayName: '', age: 0, gender: 'Other', diagnosis: '', tumorSite: '', stage: '', phase: 'Prehab',
    riskLevel: 'low', severity: 'None', currentRoute: '', aspirationRisk: 0, airwayRisk: 0, nutritionRisk: 0, jawOpening: 0, eat10: 0, fois: 0, pas: 0,
    icfQualifiers: { b5105: 0, b310: 0, b320: 0, s320: 0, d550: 0, d560: 0, d330: 0, e310: 0 },
    trends: sessions.length ? sessions.map(s => ({ label: s.date.slice(5), eat10: s.total, fois: n('fois'), jawOpening: n('jawOpening'), weight: n('weight'), pas: n('pas') })) : [],
    milestones: [], lastVisit: str(fs.evaluationDate), nextReview: '', adherence: 0, alerts: [], primaryConcerns: [],
  };
  const gender = fs.gender === 'Male' || fs.gender === 'Female' ? fs.gender : base.gender;
  const site = str(fs.tumorSite) || base.tumorSite;
  const stage = [fs.tCategory, fs.nCategory, fs.mCategory].filter(x => typeof x === 'string' && x).join(' ') || base.stage;
  const adh = adherencePercent(fs);
  return {
    ...syncActivePatientFromFieldState(base, fs),
    id: code,
    recordId: p.id,
    displayName: patientLabel(p) + (p.demo ? ' (demo)' : ''),
    age: n('age', base.age), gender,
    tumorSite: site, stage,
    diagnosis: p.demoProfile ? base.diagnosis : [site, stage].filter(Boolean).join(', ') || 'Diagnosis not recorded',
    phase: ((typeof fs.phase === 'string' && fs.phase) || base.phase) as CarePhase,
    severity: ((typeof fs.severity === 'string' && fs.severity) || base.severity) as Severity,
    riskLevel: p.demoProfile && !fs.aspirationRisk ? base.riskLevel : riskFor(fs),
    adherence: adh ?? base.adherence,
    alerts: p.demoProfile ? base.alerts : alertsFor(fs),
    primaryConcerns: p.demoProfile ? base.primaryConcerns : (typeof fs.chiefConcern === 'string' && fs.chiefConcern ? [fs.chiefConcern] : []),
    isActive: false,
  };
}
