// Demo patients for teaching. Loaded only from Settings > Load demo patients; never shown otherwise.
import type { FieldState } from './reportEngine';
import { CASELOAD_PATIENTS } from './caseloadData.ts';
import { EMPTY_WORKSPACE, newId, type PatientRecord } from './clinicStore.ts';

export const DEMO_FIELD_STATE: FieldState = {
  patientHash: '5e883e81b37e1273b4b455b5d198ee6a3782b6e1e21b7c3cf374fa04e22e845c',
  phase: 'Post-CRT',
  route: 'Combined',
  aspirationRisk: '3',
  airwayRisk: '2',
  nutritionRisk: '3',
  age: '56',
  gender: 'Female',
  language: 'Kannada / English',
  caregiver: 'Spouse',
  referredBy: 'Radiation oncology',
  evaluationDate: new Date().toISOString().slice(0, 10),
  chiefConcern: 'Coughing with thin liquids, restricted jaw opening, and reduced speech clarity after CRT.',
  tumorSite: 'Lip/oral cavity',
  tCategory: 'T2',
  nCategory: 'N1',
  mCategory: 'M0',
  diagnosisDate: '2026-01-15',
  recurrence: 'Primary',
  painScore: '4',
  surgeryType: ['Glossectomy', 'Neck dissection', 'Free flap'],
  flapType: 'Radial forearm',
  neckDissection: 'Ipsilateral',
  rtDose: '60',
  fractions: '30',
  chemoAgent: ['Cisplatin'],
  toxicity: ['Xerostomia', 'Fibrosis', 'Trismus', 'Fatigue'],
  jawOpening: '30',
  tongueRom: '2',
  lipSeal: '1',
  palatalElevation: '1',
  cnV: 'Mild',
  cnVII: 'Mild',
  'cnIX X': 'Moderate',
  cnXII: 'Moderate',
  wetVoice: 'Intermittent',
  cough: 'Weak',
  multipleSwallows: 'Frequent',
  bolusIssue: ['Oral residue', 'Delayed trigger', 'Coughing'],
  eat10: '25',
  masa: '168',
  fois: '5',
  intelligibility: '75',
  dysarthria: 'Mixed post-surgical',
  resonance: 'Normal',
  mpt: '8',
  jitter: '1.2',
  shimmer: '0.6',
  hnr: '15.5',
  weight: '49',
  weightChange: '6',
  appetite: 'Reduced',
  hydration: '2',
  tracheostomy: 'None',
  secretion: '2',
  oralCare: 'Caregiver assisted',
  fees: 'Requested',
  vfss: 'Completed',
  pas: '5',
  residue: ['Vallecular', 'Pyriform'],
  upload: 'VFSS and discharge summary',
  summary: 'Delayed pharyngeal trigger, residue after puree, intermittent penetration with thin liquids.',
  b5105: '3',
  b310: '1',
  b320: '2',
  s320: '3',
  d550: '3',
  d560: '2',
  d330: '2',
  e310: '1',
  target: ['Tongue base', 'Jaw opening', 'Speech articulation'],
  dose: 'Two short home sessions daily plus meal-time strategies.',
  painLimit: 'Stop if sharp pain, bleeding, breathing discomfort, or persistent coughing occurs.',
  today: ['Masako', 'Effortful swallow', 'Jaw stretch', 'Speech drills'],
  symptoms: ['Dry mouth', 'Coughing', 'Fatigue'],
  confidence: '3',
  slpDiagnosis: 'Moderate oropharyngeal dysphagia with post-treatment trismus and reduced tongue base drive.',
  severity: 'Moderate',
  recommendations: 'Continue supervised swallow strengthening, jaw range program, oral care, and instrumental follow-up.',
  followUp: 'Review in 2 weeks or earlier if fever, weight loss, aspiration symptoms, or worsening pain occurs.',
};

const DEMO_PRESCRIPTION = ['masako', 'effortful-swallow', 'jaw-stretch', 'velar-drills'];

export function buildDemoPatients(now = new Date()): PatientRecord[] {
  const iso = now.toISOString();
  return CASELOAD_PATIENTS.map((c, i) => {
    const studyId = `DEMO-${String(i + 1).padStart(2, '0')}`;
    const letter = String.fromCharCode(65 + i);
    const fieldState: FieldState = i === 0 ? { ...DEMO_FIELD_STATE, studyId } : {
      studyId, age: String(c.age), gender: c.gender, phase: c.phase, tumorSite: c.tumorSite, severity: c.severity,
      eat10: String(c.eat10), fois: String(c.fois), pas: String(c.pas), jawOpening: String(c.jawOpening),
      aspirationRisk: String(c.aspirationRisk), airwayRisk: String(c.airwayRisk), nutritionRisk: String(c.nutritionRisk),
      route: c.currentRoute, chiefConcern: c.primaryConcerns.join('; '), evaluationDate: c.lastVisit,
      ...Object.fromEntries(Object.entries(c.icfQualifiers).map(([k, v]) => [k, String(v)])),
    };
    return {
      id: newId('demo'), name: `Demo patient ${letter}`, hospitalId: '', studyId, createdAt: iso, updatedAt: iso, demo: true,
      demoProfile: { ...c, isActive: false },
      workspace: { ...EMPTY_WORKSPACE, fieldState, prescribedExerciseIds: i === 0 ? DEMO_PRESCRIPTION : [] },
    };
  });
}
