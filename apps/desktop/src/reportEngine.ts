import {
  HNC_CLINICAL_SECTIONS,
  HNC_ICF_ITEMS,
  type HncSectionId,
  type IcfHncItem,
} from '../../../packages/core/src/hncClinicalModel';

export type FieldState = Record<string, string | string[]>;

export type SeverityTier = 'None' | 'Mild' | 'Moderate' | 'Severe' | 'Profound';

export const MAPPED_ICF_CODES = ['b5105', 'b310', 'b320', 's320', 'd550', 'd560', 'd330', 'e310'] as const;
export type MappedIcfCode = (typeof MAPPED_ICF_CODES)[number];

export interface SectionCompletion {
  id: HncSectionId;
  order: number;
  label: string;
  shortLabel: string;
  accent: string;
  filled: number;
  total: number;
  percent: number;
  status: 'complete' | 'partial' | 'empty';
  missingFields: { id: string; label: string }[];
}

export interface SeverityCorrelation {
  severity: SeverityTier | 'Unknown';
  expectedRange: { min: number; max: number };
  averageQualifier: number;
  primaryQualifier: number;
  isMismatch: boolean;
  mismatchReason: string;
  recommendedSeverity: SeverityTier;
}

export interface IcfTableRow {
  code: string;
  domain: 'Body Function' | 'Body Structure' | 'Activity & Participation' | 'Environment';
  domainAccent: string;
  name: string;
  qualifier: number;
  severityLabel: string;
  manifestation: string;
}

export interface ReportDraft {
  slpDiagnosis: string;
  severity: SeverityTier | string;
  recommendations: string;
  followUp: string;
  source: {
    slpDiagnosis: 'clinician' | 'auto';
    severity: 'clinician' | 'auto';
    recommendations: 'clinician' | 'auto';
    followUp: 'clinician' | 'auto';
  };
}

export interface StructuredRecommendations {
  forceRangeOfMotion: string[];
  compensatoryAndDiet: string[];
  redFlags: string[];
  followUpTimeline: string[];
}

export interface ExecutiveSummary {
  diagnosis: string;
  severity: SeverityTier | string;
  aspirationRiskLabel: string;
  aspirationRiskTone: 'green' | 'amber' | 'red';
  dietRoute: string;
  textureGuidance: string;
  primaryConcerns: string[];
}

const SEVERITY_RANGE: Record<SeverityTier, { min: number; max: number }> = {
  None: { min: 0, max: 0 },
  Mild: { min: 1, max: 1 },
  Moderate: { min: 2, max: 3 },
  Severe: { min: 3, max: 4 },
  Profound: { min: 4, max: 4 },
};

const TUMOR_SITE_LABEL: Record<string, string> = {
  'Lip/oral cavity': 'oral cavity',
  'Oropharynx p16 negative': 'oropharyngeal (p16-)',
  'Oropharynx p16 positive': 'oropharyngeal (p16+)',
  Larynx: 'laryngeal',
  Hypopharynx: 'hypopharyngeal',
  Nasopharynx: 'nasopharyngeal',
};

const PHASE_LABEL: Record<string, string> = {
  Prehab: 'prehabilitation',
  'Post-op': 'post-surgical',
  'During RT': 'mid-radiation',
  'Post-CRT': 'post-chemoradiation',
  Survivorship: 'survivorship',
};

const ICF_DOMAIN_LABEL: Record<IcfHncItem['domain'], IcfTableRow['domain']> = {
  bodyFunction: 'Body Function',
  bodyStructure: 'Body Structure',
  activityParticipation: 'Activity & Participation',
  environment: 'Environment',
};

const ICF_DOMAIN_ACCENT: Record<IcfHncItem['domain'], string> = {
  bodyFunction: '#1d4ed8',
  bodyStructure: '#7c3aed',
  activityParticipation: '#0f766e',
  environment: '#b45309',
};

const QUALIFIER_LABEL = ['No impairment', 'Mild', 'Moderate', 'Severe', 'Complete'];

const isFilled = (value: string | string[] | undefined): boolean => {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim().length > 0;
};

const toNumber = (value: string | string[] | undefined, fallback = 0): number => {
  if (typeof value !== 'string') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toArray = (value: string | string[] | undefined): string[] =>
  Array.isArray(value) ? value : typeof value === 'string' && value.length > 0 ? [value] : [];

export function computeSectionCompletion(fieldState: FieldState): SectionCompletion[] {
  return HNC_CLINICAL_SECTIONS.filter((section) => section.id !== 'report').map((section) => {
    const fields = section.blocks.flatMap((block) => block.fields);
    const filledFields = fields.filter((field) => isFilled(fieldState[field.id]));
    const filled = filledFields.length;
    const total = fields.length;
    const percent = total === 0 ? 100 : Math.round((filled / total) * 100);
    const missingFields = fields
      .filter((field) => !isFilled(fieldState[field.id]))
      .map((field) => ({ id: field.id, label: field.label }));

    const status: SectionCompletion['status'] =
      percent >= 80 ? 'complete' : percent >= 30 ? 'partial' : 'empty';

    return {
      id: section.id,
      order: section.order,
      label: section.label,
      shortLabel: section.shortLabel,
      accent: section.accent,
      filled,
      total,
      percent,
      status,
      missingFields,
    };
  });
}

export function deriveSeverityFromInstrumentals(fieldState: FieldState): SeverityTier {
  const pas = toNumber(fieldState.pas, 0);
  const fois = toNumber(fieldState.fois, 0);
  const eat10 = toNumber(fieldState.eat10, 0);
  const aspirationRisk = toNumber(fieldState.aspirationRisk, 0);

  if (pas >= 7 || fois === 1 || aspirationRisk >= 4) return 'Severe';
  if (pas >= 5 || fois <= 3 || eat10 >= 15 || aspirationRisk === 3) return 'Moderate';
  if (pas >= 3 || fois === 5 || eat10 >= 3) return 'Mild';
  if (pas <= 2 && eat10 < 3) return 'None';
  return 'Mild';
}

export function checkSeverityIcfCorrelation(fieldState: FieldState): SeverityCorrelation {
  const severityRaw = (fieldState.severity as string) || '';
  const isSeverity = (value: string): value is SeverityTier =>
    ['None', 'Mild', 'Moderate', 'Severe', 'Profound'].includes(value);
  const severity: SeverityTier | 'Unknown' = isSeverity(severityRaw) ? severityRaw : 'Unknown';

  const bodyCodes: MappedIcfCode[] = ['b5105', 'b310', 'b320', 's320'];
  const qualifiers = bodyCodes
    .map((code) => toNumber(fieldState[code], NaN))
    .filter((value) => Number.isFinite(value));

  const averageQualifier =
    qualifiers.length === 0 ? 0 : qualifiers.reduce((sum, value) => sum + value, 0) / qualifiers.length;
  const primaryQualifier = toNumber(fieldState.b5105, 0);

  const recommendedSeverity = deriveSeverityFromInstrumentals(fieldState);

  if (severity === 'Unknown') {
    return {
      severity,
      expectedRange: { min: 0, max: 4 },
      averageQualifier: Number(averageQualifier.toFixed(2)),
      primaryQualifier,
      isMismatch: true,
      mismatchReason: 'Clinical Severity has not been recorded yet.',
      recommendedSeverity,
    };
  }

  const expectedRange = SEVERITY_RANGE[severity];
  const roundedAvg = Math.round(averageQualifier);
  const isMismatch = roundedAvg < expectedRange.min - 1 || roundedAvg > expectedRange.max + 1;

  let mismatchReason = '';
  if (isMismatch) {
    mismatchReason =
      `Severity "${severity}" expects body-function qualifiers near ${expectedRange.min}-${expectedRange.max}, ` +
      `but the recorded average is ${averageQualifier.toFixed(1)} (b5105 = ${primaryQualifier}). ` +
      `Consider reviewing either the severity rating or the ICF qualifiers.`;
  }

  return {
    severity,
    expectedRange,
    averageQualifier: Number(averageQualifier.toFixed(2)),
    primaryQualifier,
    isMismatch,
    mismatchReason,
    recommendedSeverity,
  };
}

export function generateSmartDefaults(fieldState: FieldState): ReportDraft {
  const tumorSite = TUMOR_SITE_LABEL[String(fieldState.tumorSite || '')] || 'head and neck';
  const phase = PHASE_LABEL[String(fieldState.phase || '')] || 'post-treatment';
  const toxicity = toArray(fieldState.toxicity);
  const surgery = toArray(fieldState.surgeryType);
  const bolusIssue = toArray(fieldState.bolusIssue);
  const residue = toArray(fieldState.residue);
  const jawOpening = toNumber(fieldState.jawOpening, 35);
  const pas = toNumber(fieldState.pas, 0);
  const aspirationRisk = toNumber(fieldState.aspirationRisk, 0);

  const derivedSeverity = deriveSeverityFromInstrumentals(fieldState);
  const severity: SeverityTier =
    (['None', 'Mild', 'Moderate', 'Severe', 'Profound'] as SeverityTier[]).includes(
      fieldState.severity as SeverityTier
    )
      ? (fieldState.severity as SeverityTier)
      : derivedSeverity;

  const trismusFlag = toxicity.includes('Trismus') || jawOpening < 35;
  const fibrosisFlag = toxicity.includes('Fibrosis');
  const tongueBaseFlag = bolusIssue.includes('Delayed trigger') || residue.includes('Vallecular');
  const flapFlag = surgery.includes('Free flap') || surgery.includes('Glossectomy');

  const diagnosisModifiers: string[] = [];
  if (trismusFlag) diagnosisModifiers.push('post-treatment trismus');
  if (fibrosisFlag) diagnosisModifiers.push('cervical fibrosis');
  if (tongueBaseFlag) diagnosisModifiers.push('reduced tongue base drive');
  if (flapFlag) diagnosisModifiers.push('post-surgical oral cavity reconstruction');

  const modifierTail =
    diagnosisModifiers.length === 0
      ? 'with multifactorial swallow inefficiency'
      : 'with ' + diagnosisModifiers.join(', ');

  const slpDiagnosis = `${severity} ${tumorSite} dysphagia ${modifierTail}, ${phase} phase.`;

  const recommendationLines: string[] = [];
  if (trismusFlag) recommendationLines.push('Daily jaw range-of-motion program (TheraBite-style stretches, 5 reps x 3 sets).');
  if (tongueBaseFlag) recommendationLines.push('Tongue base strengthening (Masako, effortful swallow) per protocol.');
  if (pas >= 5 || aspirationRisk >= 3)
    recommendationLines.push('Compensatory swallow strategies: chin tuck, multiple swallows, alternating bites with sips.');
  recommendationLines.push('Continue texture-modified oral intake with caregiver supervision at meals.');
  recommendationLines.push('Reinforce oral hygiene protocol pre- and post-meal to mitigate aspiration pneumonia risk.');
  recommendationLines.push('Instrumental swallow re-evaluation if symptoms worsen or fail to improve in 4 weeks.');

  const followUp = 'Structured SLP review in 2 weeks. Earlier review if fever > 100.4°F, > 5% weight loss, wet voice, recurrent coughing, or worsening pain.';

  const draft: ReportDraft = {
    slpDiagnosis: typeof fieldState.slpDiagnosis === 'string' && fieldState.slpDiagnosis.trim().length > 0
      ? fieldState.slpDiagnosis
      : slpDiagnosis,
    severity,
    recommendations:
      typeof fieldState.recommendations === 'string' && fieldState.recommendations.trim().length > 0
        ? fieldState.recommendations
        : recommendationLines.join(' '),
    followUp:
      typeof fieldState.followUp === 'string' && fieldState.followUp.trim().length > 0
        ? fieldState.followUp
        : followUp,
    source: {
      slpDiagnosis: isFilled(fieldState.slpDiagnosis) ? 'clinician' : 'auto',
      severity: isFilled(fieldState.severity) ? 'clinician' : 'auto',
      recommendations: isFilled(fieldState.recommendations) ? 'clinician' : 'auto',
      followUp: isFilled(fieldState.followUp) ? 'clinician' : 'auto',
    },
  };

  return draft;
}

export function buildIcfTable(fieldState: FieldState): IcfTableRow[] {
  return MAPPED_ICF_CODES.map((code) => {
    const meta = HNC_ICF_ITEMS.find((item) => item.code === code);
    const qualifier = Math.max(0, Math.min(4, toNumber(fieldState[code], 0)));
    return {
      code,
      domain: meta ? ICF_DOMAIN_LABEL[meta.domain] : 'Body Function',
      domainAccent: meta ? ICF_DOMAIN_ACCENT[meta.domain] : '#1d4ed8',
      name: meta?.name ?? code,
      qualifier,
      severityLabel: QUALIFIER_LABEL[qualifier] ?? 'Unknown',
      manifestation: meta?.hncRelevance ?? '—',
    };
  });
}

export function buildExecutiveSummary(fieldState: FieldState, draft: ReportDraft): ExecutiveSummary {
  const aspirationRisk = toNumber(fieldState.aspirationRisk, 0);
  const aspirationRiskLabel =
    aspirationRisk >= 3 ? 'High' : aspirationRisk === 2 ? 'Moderate' : aspirationRisk === 1 ? 'Low' : 'Minimal';
  const aspirationRiskTone: ExecutiveSummary['aspirationRiskTone'] =
    aspirationRisk >= 3 ? 'red' : aspirationRisk === 2 ? 'amber' : 'green';

  const dietRoute = String(fieldState.route || 'Oral');
  const textureGuidance = aspirationRisk >= 3
    ? 'Texture-modified oral intake; consider thickened liquids and supervised meals.'
    : aspirationRisk === 2
    ? 'Texture-modified oral intake with compensatory strategies.'
    : 'Standard oral intake with safety education.';

  const concerns: string[] = [];
  const bolusIssue = toArray(fieldState.bolusIssue);
  const toxicity = toArray(fieldState.toxicity);
  if (bolusIssue.includes('Coughing')) concerns.push('Coughing with thin liquids');
  if (Number(fieldState.jawOpening) < 35) concerns.push('Trismus (interincisal opening < 35 mm)');
  if (toxicity.includes('Xerostomia')) concerns.push('Xerostomia affecting bolus formation');
  if (toxicity.includes('Fibrosis')) concerns.push('Cervical fibrosis limiting hyolaryngeal excursion');
  if (concerns.length === 0) concerns.push('No active red-flag symptoms recorded.');

  return {
    diagnosis: draft.slpDiagnosis,
    severity: draft.severity,
    aspirationRiskLabel,
    aspirationRiskTone,
    dietRoute,
    textureGuidance,
    primaryConcerns: concerns,
  };
}

export function buildStructuredRecommendations(
  fieldState: FieldState
): StructuredRecommendations {
  const toxicity = toArray(fieldState.toxicity);
  const target = toArray(fieldState.target);
  const bolusIssue = toArray(fieldState.bolusIssue);
  const jawOpening = toNumber(fieldState.jawOpening, 35);
  const pas = toNumber(fieldState.pas, 0);
  const aspirationRisk = toNumber(fieldState.aspirationRisk, 0);

  const forceRangeOfMotion: string[] = [];
  if (jawOpening < 35 || toxicity.includes('Trismus') || target.includes('Jaw opening')) {
    forceRangeOfMotion.push(
      'Jaw range-of-motion: passive/active opening stretches with mechanical device (e.g., TheraBite, tongue depressor stack); 5 reps x 3 sets, 5 days/week. Goal: ≥ 35 mm interincisal opening.'
    );
  }
  if (target.includes('Tongue base') || bolusIssue.includes('Delayed trigger')) {
    forceRangeOfMotion.push(
      'Tongue base retraction: Masako maneuver (5-10 reps) and effortful swallow (5-10 reps) per session, 2-3 sessions/day.'
    );
  }
  if (target.includes('Hyolaryngeal excursion')) {
    forceRangeOfMotion.push('Hyolaryngeal excursion: Mendelsohn maneuver and Shaker head-lift exercise per SLP protocol.');
  }
  if (target.includes('Speech articulation') || bolusIssue.includes('Oral residue')) {
    forceRangeOfMotion.push('Lingual resistance and articulation drills: 10 reps per phoneme target, 2 sessions/day.');
  }
  if (forceRangeOfMotion.length === 0) {
    forceRangeOfMotion.push('Maintain general swallow conditioning per discharge instructions; reassess at 2-week review.');
  }

  const compensatoryAndDiet: string[] = [];
  if (pas >= 5 || aspirationRisk >= 3) {
    compensatoryAndDiet.push('Chin tuck on every bolus, especially thin liquids.');
    compensatoryAndDiet.push('Multiple swallows per bolus (2-3 dry swallows) to clear pharyngeal residue.');
  }
  compensatoryAndDiet.push('Alternating bites with small sips to clear residue.');
  compensatoryAndDiet.push('Texture modification per IDDSI level appropriate to safety findings.');
  compensatoryAndDiet.push('Upright positioning (90°) during meals; remain upright 30 minutes post-meal.');
  compensatoryAndDiet.push('Caregiver-supervised meals; meal pacing — small, frequent meals.');
  compensatoryAndDiet.push('Rigorous oral care pre- and post-meal to reduce aspiration pneumonia risk.');

  const redFlags: string[] = [
    'Fever > 100.4 °F (38 °C) or new respiratory symptoms.',
    'Sudden weight loss > 5% in 4 weeks or > 10% in 6 months.',
    'New or increased wet/gurgly voice quality, especially after liquids.',
    'Recurrent coughing or choking during or immediately after meals.',
    'Acute reduction in jaw opening (> 5 mm worsening) or new mucosal bleeding.',
    'New hemoptysis, severe odynophagia, or stridor — refer to ENT/oncology urgently.',
  ];

  const followUpTimeline: string[] = [
    'SLP review: 2 weeks from this report (structured re-evaluation of swallow safety, jaw ROM, voice).',
    'Repeat instrumental swallow study (FEES/VFSS) if no improvement at 4 weeks or any red-flag symptom.',
    'Radiation oncology / surgical oncology surveillance per oncology protocol; share this report at the next visit.',
    'Dietitian follow-up: 4 weeks (or earlier if weight loss criterion is met).',
    'Caregiver coaching review: 2 weeks (technique, stop rules, red-flag triage).',
  ];

  return { forceRangeOfMotion, compensatoryAndDiet, redFlags, followUpTimeline };
}
