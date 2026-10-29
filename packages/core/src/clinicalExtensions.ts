import type { ClinicalBlock, ClinicalField, HncSectionId } from './hncClinicalModel';
const score = (id: string, label: string, min: number, max: number, helper = ''): ClinicalField => ({ id, label, kind: 'number', min, max, step: 1, helper });
const note = (id: string, label: string): ClinicalField => ({ id, label, kind: 'textarea' });
const choice = (id: string, label: string, options: string[]): ClinicalField => ({ id, label, kind: 'select', options });
export const EXTENDED_BLOCKS: Partial<Record<HncSectionId, ClinicalBlock[]>> = {
  demographics: [{ title: 'Study record', description: 'Pseudonymous identifiers only for research exports.', fields: [
    { id: 'studyId', label: 'Study ID (DT-HNC-001)', kind: 'text' },
    { id: 'encounterDate', label: 'Encounter date', kind: 'date' },
    note('patientGoals', 'Patient priorities and participation goals'),
  ] }],
  treatment: [{ title: 'Clearance and healing', description: 'Recorded findings inform prescription review; unknown is not clearance.', fields: [
    choice('fistula', 'Unhealed fistula', ['Unknown', 'No', 'Yes']),
    choice('freshFlap', 'Fresh or unhealed flap / wound', ['Unknown', 'No', 'Yes']),
    choice('exerciseClearance', 'Exercise clearance documented', ['Not recorded', 'Cleared', 'Withheld']),
    note('clearanceDetails', 'Clearing clinician, date and restrictions'),
    score('ctcaeDysphagia', 'CTCAE dysphagia grade (clinician assigned)', 1, 5),
    { id: 'ctcaeVersion', label: 'CTCAE version used', kind: 'text' },
  ] }],
  opme: [{ title: 'Three-trial jaw measurement', description: 'Record all three trials; derived best opening is shown separately from the legacy single measure.', fields: [
    ...[1,2,3].map(n => ({ id: 'jawTrial'+n, label: 'Inter-incisal opening, trial '+n, kind: 'metric' as const, min: 0, max: 150, unit: 'mm' })),
    choice('cnXI', 'CN XI shoulder function', ['Not assessed', 'Within expected limits', 'Reduced', 'Absent']),
  ] }],
  swallow: [{ title: 'Patient-reported and functional outcomes', description: 'MDADI and EAT-10: insert licensed items. Record externally scored results only; no automatic cross-instrument severity conversion.', fields: [
    score('mdadiGlobal', 'MDADI global (20-100 convention)', 20, 100),
    score('mdadiComposite', 'MDADI composite', 20, 100),
    score('mdadiEmotional', 'MDADI emotional subscale', 20, 100),
    score('mdadiFunctional', 'MDADI functional subscale', 20, 100),
    score('mdadiPhysical', 'MDADI physical subscale', 20, 100),
    score('pssDiet', 'PSS-HN normalcy of diet', 0, 100),
    score('pssPublic', 'PSS-HN eating in public', 0, 100),
    score('pssSpeech', 'PSS-HN understandability of speech', 0, 100),
    note('outcomeSource', 'Instrument version, language, assessor and scoring source'),
    note('dietPlan', 'Clinician-tested diet / posture / bolus plan'),
  ] }],
  voice: [{ title: 'Perceptual and patient-reported voice outcomes', description: 'GRBAS dimensions are recorded independently (0-3); VHI-10: insert licensed items.', fields: [
    ...['Grade','Roughness','Breathiness','Asthenia','Strain'].map(label => score('grbas'+label, 'GRBAS '+label, 0, 3)),
    score('vhi10', 'VHI-10 externally scored total', 0, 40),
    note('voiceProtocol', 'Task, recording conditions and rating source'),
  ] }, { title: 'Laryngectomy and communication', description: 'Document the communication method and specialist review.', fields: [
    choice('laryngectomyType', 'Laryngectomy status', ['Not recorded', 'None', 'Partial', 'Total']),
    choice('communicationMethod', 'Primary communication', ['Natural voice', 'TEP', 'Electrolarynx', 'Oesophageal speech', 'AAC', 'Other']),
    choice('tepLeak', 'TEP leakage reported', ['Not assessed', 'No', 'Through prosthesis', 'Around prosthesis', 'Uncertain']),
    note('tepReview', 'Prosthesis / stoma review and referral plan'),
  ] }],
  nutrition: [{ title: 'Weight comparison', description: 'Use measured weights and dates. Negative loss indicates weight gain.', fields: [
    { id: 'heightCm', label: 'Height', kind: 'metric', min: 1, max: 300, unit: 'cm' },
    { id: 'previousWeight', label: 'Previous measured weight', kind: 'metric', min: 1, max: 500, unit: 'kg' },
    { id: 'previousWeightDate', label: 'Previous measurement date', kind: 'date' },
    { id: 'weightDate', label: 'Current measurement date', kind: 'date' },
    note('nutritionPlan', 'Dietitian and nutrition plan'),
  ] }],
  instrumental: [{ title: 'Instrumental ratings', description: 'Record ratings from trained assessment using the named instrument/version; the app does not infer these from PAS alone.', fields: [
    score('digestSafety', 'DIGEST safety grade', 0, 4), score('digestEfficiency', 'DIGEST efficiency grade', 0, 4),
    score('digestOverall', 'DIGEST overall grade (clinician assigned)', 0, 4),
    choice('yaleVallecula', 'Yale vallecular residue rating', ['I','II','III','IV','V']),
    choice('yalePyriform', 'Yale pyriform sinus residue rating', ['I','II','III','IV','V']),
    note('studyProtocol', 'Study date, bolus, task, instrument version and assessor'),
  ] }],
  icf: [{ title: 'Context and participation', description: 'Document barriers and facilitators explicitly; no instrument score is automatically converted into an ICF qualifier.', fields: [
    choice('familyFactor', 'Family support context', ['Not assessed', 'Facilitator', 'Barrier', 'Neither']),
    note('participationGoals', 'Communication, eating and community participation'),
    note('icfMappingSource', 'ICF mapping rationale and source'),
  ] }],
};

