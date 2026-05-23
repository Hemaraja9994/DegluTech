import type { FieldState } from './reportEngine';

export type RiskLevel = 'low' | 'moderate' | 'high';
export type Severity = 'None' | 'Mild' | 'Moderate' | 'Severe' | 'Profound';
export type CarePhase = 'Prehab' | 'Post-op' | 'During RT' | 'Post-CRT' | 'Survivorship';

export interface IcfQualifiers {
  b5105: number;
  b310: number;
  b320: number;
  s320: number;
  d550: number;
  d560: number;
  d330: number;
  e310: number;
}

export interface TrendPoint {
  label: string;
  eat10: number;
  fois: number;
  jawOpening: number;
  weight: number;
  pas: number;
}

export interface MilestoneEvent {
  label: string;
  date: string;
  status: 'done' | 'current' | 'upcoming';
  note?: string;
}

export interface PatientCaseloadEntry {
  id: string;
  displayName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  diagnosis: string;
  tumorSite: string;
  stage: string;
  phase: CarePhase;
  riskLevel: RiskLevel;
  severity: Severity;
  currentRoute: string;

  aspirationRisk: number;
  airwayRisk: number;
  nutritionRisk: number;
  jawOpening: number;
  eat10: number;
  fois: number;
  pas: number;

  icfQualifiers: IcfQualifiers;
  trends: TrendPoint[];
  milestones: MilestoneEvent[];

  lastVisit: string;
  nextReview: string;
  adherence: number;

  alerts: string[];
  primaryConcerns: string[];
  isActive?: boolean;
}

export const CASELOAD_PATIENTS: PatientCaseloadEntry[] = [
  {
    id: 'HNC-2026-001',
    displayName: 'Patient A — Demo (Active)',
    age: 56,
    gender: 'Female',
    diagnosis: 'Oral tongue carcinoma, post reconstruction with adjuvant CRT',
    tumorSite: 'Lip/oral cavity',
    stage: 'T2 N1 M0',
    phase: 'Post-CRT',
    riskLevel: 'high',
    severity: 'Moderate',
    currentRoute: 'Oral, texture modified',
    aspirationRisk: 3,
    airwayRisk: 2,
    nutritionRisk: 3,
    jawOpening: 30,
    eat10: 25,
    fois: 5,
    pas: 5,
    icfQualifiers: { b5105: 3, b310: 1, b320: 2, s320: 3, d550: 3, d560: 2, d330: 2, e310: 1 },
    trends: [
      { label: 'Wk 0', eat10: 32, fois: 3, jawOpening: 22, weight: 51, pas: 7 },
      { label: 'Wk 2', eat10: 30, fois: 4, jawOpening: 24, weight: 50, pas: 6 },
      { label: 'Wk 4', eat10: 28, fois: 4, jawOpening: 27, weight: 49.5, pas: 6 },
      { label: 'Wk 6', eat10: 26, fois: 5, jawOpening: 29, weight: 49, pas: 5 },
      { label: 'Wk 8', eat10: 25, fois: 5, jawOpening: 30, weight: 49, pas: 5 },
    ],
    milestones: [
      { label: 'Diagnosis', date: '2026-01-15', status: 'done' },
      { label: 'Surgery + flap', date: '2026-01-28', status: 'done' },
      { label: 'CRT complete', date: '2026-04-02', status: 'done' },
      { label: 'SLP baseline', date: '2026-04-12', status: 'done' },
      { label: 'Re-evaluation', date: '2026-06-06', status: 'current', note: 'Today + 2 weeks' },
      { label: 'Onco follow-up', date: '2026-07-04', status: 'upcoming' },
    ],
    lastVisit: '2026-05-09',
    nextReview: '2026-06-06',
    adherence: 78,
    alerts: ['Trismus risk (jaw 30 mm)', 'Intermittent wet voice', 'Xerostomia / fibrosis'],
    primaryConcerns: ['Coughing with thin liquids', 'Restricted jaw opening', 'Reduced speech clarity'],
    isActive: true,
  },
  {
    id: 'HNC-2026-002',
    displayName: 'Patient B',
    age: 62,
    gender: 'Male',
    diagnosis: 'Laryngeal SCC, total laryngectomy with TEP',
    tumorSite: 'Larynx',
    stage: 'T4a N2b M0',
    phase: 'Post-op',
    riskLevel: 'high',
    severity: 'Severe',
    currentRoute: 'NGT supplementation',
    aspirationRisk: 4,
    airwayRisk: 4,
    nutritionRisk: 4,
    jawOpening: 38,
    eat10: 36,
    fois: 2,
    pas: 8,
    icfQualifiers: { b5105: 4, b310: 4, b320: 1, s320: 1, d550: 4, d560: 4, d330: 3, e310: 2 },
    trends: [
      { label: 'Wk 0', eat10: 40, fois: 1, jawOpening: 36, weight: 64, pas: 8 },
      { label: 'Wk 2', eat10: 38, fois: 1, jawOpening: 37, weight: 62, pas: 8 },
      { label: 'Wk 4', eat10: 37, fois: 2, jawOpening: 38, weight: 61, pas: 8 },
      { label: 'Wk 6', eat10: 36, fois: 2, jawOpening: 38, weight: 60.5, pas: 8 },
    ],
    milestones: [
      { label: 'Diagnosis', date: '2026-02-04', status: 'done' },
      { label: 'Total laryngectomy', date: '2026-03-10', status: 'done' },
      { label: 'TEP placement', date: '2026-04-22', status: 'done' },
      { label: 'Voice prosthesis fit', date: '2026-05-30', status: 'current' },
      { label: 'Adjuvant RT plan', date: '2026-06-20', status: 'upcoming' },
    ],
    lastVisit: '2026-05-18',
    nextReview: '2026-05-30',
    adherence: 64,
    alerts: ['Stoma care education needed', 'Weight loss > 5%', 'Alaryngeal voice training'],
    primaryConcerns: ['Stoma management', 'Esophageal voice acquisition', 'NGT weaning'],
  },
  {
    id: 'HNC-2026-003',
    displayName: 'Patient C',
    age: 48,
    gender: 'Male',
    diagnosis: 'Partial glossectomy, ALT flap reconstruction',
    tumorSite: 'Lip/oral cavity',
    stage: 'T2 N0 M0',
    phase: 'Post-op',
    riskLevel: 'moderate',
    severity: 'Mild',
    currentRoute: 'Oral, soft texture',
    aspirationRisk: 1,
    airwayRisk: 1,
    nutritionRisk: 2,
    jawOpening: 36,
    eat10: 12,
    fois: 6,
    pas: 3,
    icfQualifiers: { b5105: 1, b310: 0, b320: 2, s320: 2, d550: 2, d560: 1, d330: 2, e310: 0 },
    trends: [
      { label: 'Wk 0', eat10: 20, fois: 4, jawOpening: 30, weight: 70, pas: 5 },
      { label: 'Wk 2', eat10: 17, fois: 5, jawOpening: 32, weight: 69, pas: 4 },
      { label: 'Wk 4', eat10: 14, fois: 6, jawOpening: 34, weight: 69, pas: 3 },
      { label: 'Wk 6', eat10: 12, fois: 6, jawOpening: 36, weight: 69.5, pas: 3 },
    ],
    milestones: [
      { label: 'Diagnosis', date: '2026-02-12', status: 'done' },
      { label: 'Surgery + ALT flap', date: '2026-03-04', status: 'done' },
      { label: 'SLP baseline', date: '2026-03-22', status: 'done' },
      { label: 'Progress review', date: '2026-05-25', status: 'current' },
      { label: 'Adjuvant RT decision', date: '2026-06-15', status: 'upcoming' },
    ],
    lastVisit: '2026-05-08',
    nextReview: '2026-05-25',
    adherence: 91,
    alerts: ['Articulation rehab — phoneme drills'],
    primaryConcerns: ['Lingual mobility', 'Speech intelligibility'],
  },
  {
    id: 'HNC-2026-004',
    displayName: 'Patient D',
    age: 58,
    gender: 'Female',
    diagnosis: 'Oropharyngeal SCC (p16+), definitive CRT',
    tumorSite: 'Oropharynx p16 positive',
    stage: 'T3 N1 M0',
    phase: 'Post-CRT',
    riskLevel: 'moderate',
    severity: 'Moderate',
    currentRoute: 'Oral, texture modified',
    aspirationRisk: 2,
    airwayRisk: 2,
    nutritionRisk: 2,
    jawOpening: 33,
    eat10: 19,
    fois: 5,
    pas: 4,
    icfQualifiers: { b5105: 2, b310: 1, b320: 1, s320: 2, d550: 2, d560: 2, d330: 1, e310: 1 },
    trends: [
      { label: 'Wk 0', eat10: 28, fois: 3, jawOpening: 27, weight: 58, pas: 6 },
      { label: 'Wk 2', eat10: 25, fois: 4, jawOpening: 29, weight: 57, pas: 5 },
      { label: 'Wk 4', eat10: 22, fois: 4, jawOpening: 31, weight: 57, pas: 4 },
      { label: 'Wk 6', eat10: 19, fois: 5, jawOpening: 33, weight: 57.5, pas: 4 },
    ],
    milestones: [
      { label: 'Diagnosis', date: '2026-01-22', status: 'done' },
      { label: 'CRT complete', date: '2026-03-30', status: 'done' },
      { label: 'SLP baseline', date: '2026-04-08', status: 'done' },
      { label: '8-week review', date: '2026-06-01', status: 'current' },
      { label: 'PET-CT surveillance', date: '2026-07-15', status: 'upcoming' },
    ],
    lastVisit: '2026-05-11',
    nextReview: '2026-06-01',
    adherence: 82,
    alerts: ['Mild trismus', 'Xerostomia'],
    primaryConcerns: ['Bolus formation', 'Texture progression'],
  },
  {
    id: 'HNC-2026-005',
    displayName: 'Patient E',
    age: 45,
    gender: 'Male',
    diagnosis: 'Base of tongue lesion, prehab prior to CRT',
    tumorSite: 'Oropharynx p16 negative',
    stage: 'T2 N1 M0',
    phase: 'Prehab',
    riskLevel: 'low',
    severity: 'None',
    currentRoute: 'Oral, regular diet',
    aspirationRisk: 0,
    airwayRisk: 0,
    nutritionRisk: 1,
    jawOpening: 45,
    eat10: 4,
    fois: 7,
    pas: 1,
    icfQualifiers: { b5105: 0, b310: 0, b320: 0, s320: 1, d550: 0, d560: 0, d330: 0, e310: 0 },
    trends: [
      { label: 'Visit 1', eat10: 5, fois: 7, jawOpening: 44, weight: 74, pas: 1 },
      { label: 'Visit 2', eat10: 4, fois: 7, jawOpening: 45, weight: 74, pas: 1 },
    ],
    milestones: [
      { label: 'Diagnosis', date: '2026-04-18', status: 'done' },
      { label: 'SLP prehab baseline', date: '2026-05-02', status: 'done' },
      { label: 'Patient education', date: '2026-05-15', status: 'current' },
      { label: 'CRT start', date: '2026-06-10', status: 'upcoming' },
    ],
    lastVisit: '2026-05-15',
    nextReview: '2026-05-29',
    adherence: 96,
    alerts: [],
    primaryConcerns: ['Pre-CRT baseline maintenance', 'Education on toxicity warning signs'],
  },
  {
    id: 'HNC-2026-006',
    displayName: 'Patient F',
    age: 64,
    gender: 'Female',
    diagnosis: 'Hypopharyngeal carcinoma, long-term survivor with late effects',
    tumorSite: 'Hypopharynx',
    stage: 'T3 N2 M0',
    phase: 'Survivorship',
    riskLevel: 'high',
    severity: 'Severe',
    currentRoute: 'PEG + minimal oral',
    aspirationRisk: 4,
    airwayRisk: 3,
    nutritionRisk: 3,
    jawOpening: 26,
    eat10: 34,
    fois: 2,
    pas: 7,
    icfQualifiers: { b5105: 4, b310: 2, b320: 3, s320: 3, d550: 4, d560: 4, d330: 2, e310: 1 },
    trends: [
      { label: '6 mo', eat10: 30, fois: 3, jawOpening: 30, weight: 52, pas: 6 },
      { label: '1 yr', eat10: 31, fois: 3, jawOpening: 28, weight: 51, pas: 6 },
      { label: '2 yr', eat10: 33, fois: 2, jawOpening: 27, weight: 50, pas: 7 },
      { label: '3 yr', eat10: 34, fois: 2, jawOpening: 26, weight: 49.5, pas: 7 },
    ],
    milestones: [
      { label: 'CRT complete (2023)', date: '2023-08-12', status: 'done' },
      { label: 'PEG insertion', date: '2024-02-04', status: 'done' },
      { label: 'Late-effect review', date: '2026-04-30', status: 'done' },
      { label: 'Late dysphagia clinic', date: '2026-05-28', status: 'current' },
      { label: 'Repeat VFSS', date: '2026-06-18', status: 'upcoming' },
    ],
    lastVisit: '2026-04-30',
    nextReview: '2026-05-28',
    adherence: 58,
    alerts: ['PEG-dependent', 'Late radiation fibrosis', 'Recurrent aspiration pneumonia (2x in 12 mo)'],
    primaryConcerns: ['Late-effect dysphagia', 'Tube weaning unrealistic — quality-of-life focus'],
  },
  {
    id: 'HNC-2026-007',
    displayName: 'Patient G',
    age: 51,
    gender: 'Male',
    diagnosis: 'Nasopharyngeal carcinoma, undergoing definitive CRT',
    tumorSite: 'Nasopharynx',
    stage: 'T2 N2 M0',
    phase: 'During RT',
    riskLevel: 'moderate',
    severity: 'Moderate',
    currentRoute: 'Oral, soft + supplements',
    aspirationRisk: 2,
    airwayRisk: 1,
    nutritionRisk: 3,
    jawOpening: 35,
    eat10: 22,
    fois: 4,
    pas: 4,
    icfQualifiers: { b5105: 2, b310: 2, b320: 1, s320: 1, d550: 3, d560: 2, d330: 1, e310: 1 },
    trends: [
      { label: 'Wk 0', eat10: 8, fois: 6, jawOpening: 42, weight: 68, pas: 2 },
      { label: 'Wk 2', eat10: 15, fois: 5, jawOpening: 40, weight: 66, pas: 3 },
      { label: 'Wk 4', eat10: 20, fois: 4, jawOpening: 37, weight: 64, pas: 4 },
      { label: 'Wk 6', eat10: 22, fois: 4, jawOpening: 35, weight: 63, pas: 4 },
    ],
    milestones: [
      { label: 'Diagnosis', date: '2026-03-08', status: 'done' },
      { label: 'CRT started', date: '2026-04-04', status: 'done' },
      { label: 'Mid-RT review', date: '2026-05-12', status: 'done' },
      { label: 'Toxicity monitoring', date: '2026-05-26', status: 'current' },
      { label: 'CRT complete', date: '2026-06-14', status: 'upcoming' },
    ],
    lastVisit: '2026-05-19',
    nextReview: '2026-05-26',
    adherence: 73,
    alerts: ['Mucositis Gr 2-3', 'Acute weight loss', 'Pain 6/10'],
    primaryConcerns: ['Maintain intake during RT', 'Mucositis management', 'Prevent PEG'],
  },
  {
    id: 'HNC-2026-008',
    displayName: 'Patient H',
    age: 39,
    gender: 'Female',
    diagnosis: 'Buccal mucosa SCC, post wide excision',
    tumorSite: 'Lip/oral cavity',
    stage: 'T1 N0 M0',
    phase: 'Post-op',
    riskLevel: 'low',
    severity: 'Mild',
    currentRoute: 'Oral, soft texture',
    aspirationRisk: 0,
    airwayRisk: 0,
    nutritionRisk: 1,
    jawOpening: 32,
    eat10: 8,
    fois: 6,
    pas: 2,
    icfQualifiers: { b5105: 1, b310: 0, b320: 1, s320: 2, d550: 1, d560: 0, d330: 1, e310: 0 },
    trends: [
      { label: 'Wk 0', eat10: 12, fois: 5, jawOpening: 28, weight: 56, pas: 3 },
      { label: 'Wk 2', eat10: 10, fois: 6, jawOpening: 30, weight: 56, pas: 2 },
      { label: 'Wk 4', eat10: 8, fois: 6, jawOpening: 32, weight: 56.5, pas: 2 },
    ],
    milestones: [
      { label: 'Diagnosis', date: '2026-03-30', status: 'done' },
      { label: 'Wide excision', date: '2026-04-12', status: 'done' },
      { label: 'SLP baseline', date: '2026-04-25', status: 'done' },
      { label: '6-week review', date: '2026-05-30', status: 'current' },
    ],
    lastVisit: '2026-05-15',
    nextReview: '2026-05-30',
    adherence: 88,
    alerts: ['Mild jaw stiffness'],
    primaryConcerns: ['Texture progression', 'Speech consonant work'],
  },
];

export interface CaseloadKpis {
  total: number;
  highRisk: number;
  reviewDue: number;
  adherenceMean: number;
  severeOrProfound: number;
  pegOrNgtDependent: number;
}

const isReviewDue = (patient: PatientCaseloadEntry, referenceDate: Date): boolean => {
  const review = new Date(patient.nextReview);
  if (Number.isNaN(review.getTime())) return false;
  const diffDays = Math.ceil((review.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
};

export function computeCaseloadKpis(
  patients: PatientCaseloadEntry[],
  referenceDate: Date = new Date()
): CaseloadKpis {
  const total = patients.length;
  const highRisk = patients.filter((p) => p.riskLevel === 'high').length;
  const reviewDue = patients.filter((p) => isReviewDue(p, referenceDate)).length;
  const adherenceMean =
    total === 0 ? 0 : Math.round(patients.reduce((sum, p) => sum + p.adherence, 0) / total);
  const severeOrProfound = patients.filter((p) => p.severity === 'Severe' || p.severity === 'Profound').length;
  const pegOrNgtDependent = patients.filter((p) => /PEG|NGT/i.test(p.currentRoute)).length;
  return { total, highRisk, reviewDue, adherenceMean, severeOrProfound, pegOrNgtDependent };
}

export function syncActivePatientFromFieldState(
  base: PatientCaseloadEntry,
  fieldState: FieldState
): PatientCaseloadEntry {
  const toNumber = (value: string | string[] | undefined, fallback: number): number => {
    if (typeof value !== 'string') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const severity = (typeof fieldState.severity === 'string' ? fieldState.severity : base.severity) as Severity;
  const phase = (typeof fieldState.phase === 'string' ? fieldState.phase : base.phase) as CarePhase;
  const route = typeof fieldState.route === 'string' ? fieldState.route : base.currentRoute;

  const icfQualifiers: IcfQualifiers = {
    b5105: toNumber(fieldState.b5105, base.icfQualifiers.b5105),
    b310: toNumber(fieldState.b310, base.icfQualifiers.b310),
    b320: toNumber(fieldState.b320, base.icfQualifiers.b320),
    s320: toNumber(fieldState.s320, base.icfQualifiers.s320),
    d550: toNumber(fieldState.d550, base.icfQualifiers.d550),
    d560: toNumber(fieldState.d560, base.icfQualifiers.d560),
    d330: toNumber(fieldState.d330, base.icfQualifiers.d330),
    e310: toNumber(fieldState.e310, base.icfQualifiers.e310),
  };

  const aspirationRisk = toNumber(fieldState.aspirationRisk, base.aspirationRisk);
  const airwayRisk = toNumber(fieldState.airwayRisk, base.airwayRisk);
  const nutritionRisk = toNumber(fieldState.nutritionRisk, base.nutritionRisk);
  const jawOpening = toNumber(fieldState.jawOpening, base.jawOpening);
  const eat10 = toNumber(fieldState.eat10, base.eat10);
  const fois = toNumber(fieldState.fois, base.fois);
  const pas = toNumber(fieldState.pas, base.pas);

  // Update the most recent trend point with live values to make the chart feel live.
  const trends = base.trends.length === 0
    ? base.trends
    : [
        ...base.trends.slice(0, -1),
        {
          ...base.trends[base.trends.length - 1],
          eat10,
          fois,
          jawOpening,
          pas,
        },
      ];

  return {
    ...base,
    severity,
    phase,
    currentRoute: route,
    aspirationRisk,
    airwayRisk,
    nutritionRisk,
    jawOpening,
    eat10,
    fois,
    pas,
    icfQualifiers,
    trends,
  };
}
