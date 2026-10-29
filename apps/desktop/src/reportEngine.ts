import { HNC_CLINICAL_SECTIONS, HNC_ICF_ITEMS, type HncSectionId } from '../../../packages/core/src/hncClinicalModel.ts';

export type FieldState = Record<string, string | string[]>;
export type SeverityTier = 'None' | 'Mild' | 'Moderate' | 'Severe' | 'Profound' | 'Unknown';
export const MAPPED_ICF_CODES = ['b5105', 'b310', 'b320', 's320', 'd550', 'd560', 'd330', 'e310'] as const;
export type MappedIcfCode = (typeof MAPPED_ICF_CODES)[number];
export interface SectionCompletion {
  id: HncSectionId; order: number; label: string; shortLabel: string; accent: string;
  filled: number; total: number; percent: number; status: 'complete' | 'partial' | 'empty';
  missingFields: { id: string; label: string }[];
}
export interface SeverityCorrelation {
  severity: SeverityTier; expectedRange: { min: number; max: number };
  averageQualifier: number; primaryQualifier: number; isMismatch: boolean;
  mismatchReason: string; recommendedSeverity: SeverityTier;
}
export interface IcfTableRow {
  code: string; domain: 'Body Function' | 'Body Structure' | 'Activity & Participation' | 'Environment';
  domainAccent: string; name: string; qualifier: number; severityLabel: string; manifestation: string;
}
export interface ReportDraft {
  slpDiagnosis: string; severity: SeverityTier | string; recommendations: string; followUp: string;
  source: Record<'slpDiagnosis' | 'severity' | 'recommendations' | 'followUp', 'clinician' | 'auto'>;
}
export interface StructuredRecommendations {
  forceRangeOfMotion: string[]; compensatoryAndDiet: string[]; redFlags: string[]; followUpTimeline: string[];
}
export interface ExecutiveSummary {
  diagnosis: string; severity: SeverityTier | string; aspirationRiskLabel: string;
  aspirationRiskTone: 'green' | 'amber' | 'red'; dietRoute: string; textureGuidance: string; primaryConcerns: string[];
}
export const recordedNumber = (value: unknown): number | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
};
const text = (state: FieldState, key: string) => typeof state[key] === 'string' ? state[key].trim() : '';
const filled = (value: unknown) => Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;
export function computeSectionCompletion(state: FieldState): SectionCompletion[] {
  return HNC_CLINICAL_SECTIONS.filter(s => s.id !== 'report').map(section => {
    const fields = section.blocks.flatMap(b => b.fields);
    const missingFields = fields.filter(f => !filled(state[f.id])).map(({ id, label }) => ({ id, label }));
    const count = fields.length - missingFields.length;
    return { id: section.id, order: section.order, label: section.label, shortLabel: section.shortLabel, accent: section.accent,
      filled: count, total: fields.length, percent: fields.length ? Math.round(count / fields.length * 100) : 0,
      status: count === fields.length && count > 0 ? 'complete' : count > 0 ? 'partial' : 'empty', missingFields };
  });
}
// Independent instruments do not establish a validated cross-instrument severity algorithm.
export function deriveSeverityFromInstrumentals(state: FieldState): SeverityTier {
  const severity = text(state, 'severity');
  return ['None', 'Mild', 'Moderate', 'Severe', 'Profound'].includes(severity) ? severity as SeverityTier : 'Unknown';
}
export function checkSeverityIcfCorrelation(state: FieldState): SeverityCorrelation {
  const values = ['b5105', 'b310', 'b320', 's320'].map(k => recordedNumber(state[k])).filter((n): n is number => n !== null && Number.isInteger(n) && n >= 0 && n <= 4);
  return { severity: deriveSeverityFromInstrumentals(state), expectedRange: { min: 0, max: 4 },
    averageQualifier: values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : NaN,
    primaryQualifier: recordedNumber(state.b5105) ?? NaN, isMismatch: true,
    mismatchReason: 'ICF qualifiers and clinical severity are independent clinical judgements. No automatic severity correlation is applied.',
    recommendedSeverity: deriveSeverityFromInstrumentals(state) };
}
export function generateSmartDefaults(state: FieldState): ReportDraft {
  return { slpDiagnosis: text(state, 'slpDiagnosis'), severity: deriveSeverityFromInstrumentals(state),
    recommendations: text(state, 'recommendations'), followUp: text(state, 'followUp'),
    source: { slpDiagnosis: filled(state.slpDiagnosis) ? 'clinician' : 'auto', severity: filled(state.severity) ? 'clinician' : 'auto',
      recommendations: filled(state.recommendations) ? 'clinician' : 'auto', followUp: filled(state.followUp) ? 'clinician' : 'auto' } };
}
export function buildIcfTable(state: FieldState): IcfTableRow[] {
  const domains = { bodyFunction: 'Body Function', bodyStructure: 'Body Structure', activityParticipation: 'Activity & Participation', environment: 'Environment' } as const;
  return MAPPED_ICF_CODES.map(code => {
    const meta = HNC_ICF_ITEMS.find(item => item.code === code);
    const value = recordedNumber(state[code]);
    const qualifier = value !== null && Number.isInteger(value) && value >= 0 && value <= 4 ? value : -1;
    return { code, domain: meta ? domains[meta.domain] : 'Body Function', domainAccent: '#0f8ea8',
      name: meta?.name ?? code, qualifier,
      severityLabel: qualifier < 0 ? 'Not recorded' : code === 'e310' ? 'Legacy rating; document barrier/facilitator separately' : ['No impairment', 'Mild', 'Moderate', 'Severe', 'Complete'][qualifier],
      manifestation: meta?.hncRelevance ?? '' };
  });
}
export function buildExecutiveSummary(state: FieldState, draft: ReportDraft): ExecutiveSummary {
  const risk = recordedNumber(state.aspirationRisk);
  const valid = risk !== null && Number.isInteger(risk) && risk >= 0 && risk <= 4;
  const jaw = recordedNumber(state.jawOpening);
  const concerns: string[] = [];
  if (Array.isArray(state.bolusIssue)) concerns.push(...state.bolusIssue);
  if (jaw !== null && jaw >= 0 && jaw <= 35) concerns.push('Recorded jaw opening at or below 35 mm; review clinically.');
  return { diagnosis: draft.slpDiagnosis || 'Not recorded', severity: draft.severity,
    aspirationRiskLabel: valid ? ['None recorded', 'Low (clinician rated)', 'Moderate (clinician rated)', 'High (clinician rated)', 'High (clinician rated)'][risk!] : 'Not recorded',
    aspirationRiskTone: valid && risk! >= 3 ? 'red' : valid && risk! <= 1 ? 'green' : 'amber',
    dietRoute: text(state, 'route') || 'Not recorded',
    textureGuidance: text(state, 'dietPlan') || 'No clinician-entered diet plan recorded.',
    primaryConcerns: concerns.length ? concerns : ['No concerns documented; this is not a negative clinical finding.'] };
}
export function buildStructuredRecommendations(state: FieldState): StructuredRecommendations {
  return {
    forceRangeOfMotion: [text(state, 'recommendations') || 'No clinician-authored recommendations recorded.'],
    compensatoryAndDiet: [text(state, 'dietPlan') || 'No clinician-authored diet or posture plan recorded.'],
    redFlags: [text(state, 'painLimit') || 'No individual stop/contact plan recorded.'],
    followUpTimeline: [text(state, 'followUp') || 'No follow-up plan recorded.'],
  };
}

