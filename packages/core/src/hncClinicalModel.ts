export type HncSectionId =
  | 'command'
  | 'demographics'
  | 'oncology'
  | 'treatment'
  | 'opme'
  | 'swallow'
  | 'voice'
  | 'nutrition'
  | 'instrumental'
  | 'icf'
  | 'exercise'
  | 'patient'
  | 'report';

export type FieldKind =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multi'
  | 'scale'
  | 'textarea'
  | 'metric';

export interface ClinicalField {
  id: string;
  label: string;
  kind: FieldKind;
  unit?: string;
  required?: boolean;
  options?: string[];
  helper?: string;
}

export interface ClinicalBlock {
  title: string;
  description: string;
  fields: ClinicalField[];
}

export interface ClinicalSection {
  id: HncSectionId;
  order: number;
  label: string;
  shortLabel: string;
  purpose: string;
  accent: string;
  status: 'ready' | 'needs-review' | 'in-progress';
  blocks: ClinicalBlock[];
  outputs: string[];
}

export interface IcfHncItem {
  code: string;
  domain: 'bodyFunction' | 'bodyStructure' | 'activityParticipation' | 'environment';
  name: string;
  hncRelevance: string;
}

export interface ExerciseStep {
  label: string;
  instruction: string;
  cue: string;
}

export interface ExerciseProtocol {
  id: string;
  name: string;
  category:
    | 'swallow'
    | 'airway'
    | 'jaw'
    | 'tongue'
    | 'voice'
    | 'speech'
    | 'shoulder-neck';
  phase: 'prehabilitation' | 'acute' | 'post-operative' | 'post-radiation' | 'maintenance';
  indication: string;
  safety: string;
  dosage: string;
  patientLanguage: string;
  targetImpairments: string[];
  steps: ExerciseStep[];
}

export interface HncPatientSnapshot {
  name: string;
  patientId: string;
  age: number;
  diagnosis: string;
  stage: string;
  treatmentPhase: string;
  riskLevel: 'low' | 'moderate' | 'high';
  currentRoute: string;
  primaryGoals: string[];
  alerts: string[];
}

export const HNC_PATIENT_SNAPSHOT: HncPatientSnapshot = {
  name: 'Demo Patient',
  patientId: 'HNC-2026-001',
  age: 56,
  diagnosis: 'Oral tongue carcinoma, post reconstruction with adjuvant CRT',
  stage: 'AJCC 8 Stage III, T2 N1 M0',
  treatmentPhase: 'Post-radiation rehabilitation',
  riskLevel: 'high',
  currentRoute: 'Oral intake with texture modification',
  primaryGoals: [
    'Improve safe saliva and puree swallow',
    'Maintain jaw opening and tongue mobility',
    'Restore functional speech intelligibility',
    'Track nutrition, pain, fatigue, and xerostomia',
  ],
  alerts: [
    'Trismus risk: interincisal opening below 35 mm',
    'Wet voice after thin liquids',
    'Radiation fibrosis and xerostomia monitoring required',
  ],
};

export const HNC_CLINICAL_SECTIONS: ClinicalSection[] = [
  {
    id: 'command',
    order: 1,
    label: 'Clinical Command Center',
    shortLabel: 'Command',
    purpose: 'One-screen snapshot for triage, active risk, care pathway, and daily clinical priorities.',
    accent: '#2563eb',
    status: 'ready',
    blocks: [
      {
        title: 'Patient Status',
        description: 'High-yield identifiers and rehabilitation phase.',
        fields: [
          { id: 'patientHash', label: 'Secure patient hash', kind: 'text', required: true },
          { id: 'phase', label: 'Care phase', kind: 'select', options: ['Prehab', 'Post-op', 'During RT', 'Post-CRT', 'Survivorship'] },
          { id: 'route', label: 'Current feeding route', kind: 'select', options: ['Oral', 'NGT', 'PEG', 'Combined'] },
        ],
      },
      {
        title: 'Risk Board',
        description: 'Safety flags visible to SLP, oncology, nutrition, and nursing teams.',
        fields: [
          { id: 'aspirationRisk', label: 'Aspiration risk', kind: 'scale', helper: '0 none, 4 severe' },
          { id: 'airwayRisk', label: 'Airway risk', kind: 'scale' },
          { id: 'nutritionRisk', label: 'Nutrition risk', kind: 'scale' },
        ],
      },
    ],
    outputs: ['Rehabilitation phase', 'Risk color band', 'Today priorities', 'Clinician handoff summary'],
  },
  {
    id: 'demographics',
    order: 2,
    label: 'Demographics and Referral',
    shortLabel: 'Patient',
    purpose: 'Clinical identity, referral source, language, caregiver, and communication access.',
    accent: '#0891b2',
    status: 'ready',
    blocks: [
      {
        title: 'Patient Details',
        description: 'Essential non-PII and care-team fields for local clinical workflow.',
        fields: [
          { id: 'age', label: 'Age', kind: 'number', unit: 'years' },
          { id: 'gender', label: 'Gender', kind: 'select', options: ['Male', 'Female', 'Other'] },
          { id: 'language', label: 'Preferred language', kind: 'text' },
          { id: 'caregiver', label: 'Caregiver contact role', kind: 'text' },
        ],
      },
      {
        title: 'Referral Context',
        description: 'Where the patient entered the SLP pathway.',
        fields: [
          { id: 'referredBy', label: 'Referred by', kind: 'select', options: ['Head and neck surgery', 'Radiation oncology', 'Medical oncology', 'ENT', 'Dietitian', 'Self'] },
          { id: 'evaluationDate', label: 'Evaluation date', kind: 'date' },
          { id: 'chiefConcern', label: 'Primary concern', kind: 'textarea' },
        ],
      },
    ],
    outputs: ['Patient card', 'Caregiver needs', 'Referral source', 'Preferred education language'],
  },
  {
    id: 'oncology',
    order: 3,
    label: 'Oncology and Staging',
    shortLabel: 'Oncology',
    purpose: 'Tumor site, AJCC staging, disease status, and red-flag oncology context.',
    accent: '#4f46e5',
    status: 'ready',
    blocks: [
      {
        title: 'Tumor Profile',
        description: 'Head and neck cancer site and staging elements.',
        fields: [
          { id: 'tumorSite', label: 'Primary site', kind: 'select', options: ['Lip/oral cavity', 'Oropharynx p16 negative', 'Oropharynx p16 positive', 'Larynx', 'Hypopharynx', 'Nasopharynx'] },
          { id: 'tCategory', label: 'T category', kind: 'select', options: ['Tis', 'T1', 'T2', 'T3', 'T4a', 'T4b'] },
          { id: 'nCategory', label: 'N category', kind: 'select', options: ['N0', 'N1', 'N2a', 'N2b', 'N2c', 'N3'] },
          { id: 'mCategory', label: 'M category', kind: 'select', options: ['M0', 'M1'] },
        ],
      },
      {
        title: 'Disease Context',
        description: 'Clinical history that shapes rehabilitation risk.',
        fields: [
          { id: 'diagnosisDate', label: 'Diagnosis date', kind: 'date' },
          { id: 'recurrence', label: 'Recurrence status', kind: 'select', options: ['Primary', 'Recurrent', 'Metastatic', 'Surveillance'] },
          { id: 'painScore', label: 'Cancer-related pain', kind: 'scale', helper: '0 no pain, 10 worst pain' },
        ],
      },
    ],
    outputs: ['TNM summary', 'Site-specific risk map', 'Treatment pathway context'],
  },
  {
    id: 'treatment',
    order: 4,
    label: 'Treatment and Toxicity',
    shortLabel: 'Treatment',
    purpose: 'Surgery, reconstruction, radiation, chemotherapy, and late effects that drive rehab decisions.',
    accent: '#7c3aed',
    status: 'ready',
    blocks: [
      {
        title: 'Surgery and Reconstruction',
        description: 'Anatomical changes and tissue constraints.',
        fields: [
          { id: 'surgeryType', label: 'Surgery type', kind: 'multi', options: ['Glossectomy', 'Mandibulectomy', 'Laryngectomy', 'Neck dissection', 'Free flap', 'Pedicled flap'] },
          { id: 'flapType', label: 'Flap or reconstruction', kind: 'select', options: ['None', 'Radial forearm', 'Anterolateral thigh', 'Fibula', 'Pectoralis major', 'Other'] },
          { id: 'neckDissection', label: 'Neck dissection side', kind: 'select', options: ['None', 'Ipsilateral', 'Contralateral', 'Bilateral'] },
        ],
      },
      {
        title: 'Radiation and Systemic Therapy',
        description: 'Dose, fields, and toxicities linked to swallowing, voice, and jaw function.',
        fields: [
          { id: 'rtDose', label: 'Radiation dose', kind: 'number', unit: 'Gy' },
          { id: 'fractions', label: 'Fractions', kind: 'number' },
          { id: 'chemoAgent', label: 'Systemic agent', kind: 'multi', options: ['Cisplatin', 'Carboplatin', 'Cetuximab', '5-FU', 'Paclitaxel', 'Immunotherapy'] },
          { id: 'toxicity', label: 'Current toxicity', kind: 'multi', options: ['Mucositis', 'Xerostomia', 'Fibrosis', 'Trismus', 'Neuropathy', 'Ototoxicity', 'Fatigue'] },
        ],
      },
    ],
    outputs: ['Treatment timeline', 'Late-effect risk score', 'Dose-to-function map'],
  },
  {
    id: 'opme',
    order: 5,
    label: 'OPME and Cranial Nerves',
    shortLabel: 'OPME',
    purpose: 'Oral peripheral mechanism exam focused on resection, fibrosis, trismus, and CN V, VII, IX, X, XI, XII.',
    accent: '#d97706',
    status: 'ready',
    blocks: [
      {
        title: 'Oral Structures',
        description: 'Structure, symmetry, range, resistance, and scar tethering.',
        fields: [
          { id: 'jawOpening', label: 'Max jaw opening', kind: 'metric', unit: 'mm', helper: 'Clinical trismus often flagged below 35 mm' },
          { id: 'tongueRom', label: 'Tongue ROM', kind: 'scale' },
          { id: 'lipSeal', label: 'Lip seal', kind: 'scale' },
          { id: 'palatalElevation', label: 'Palatal elevation', kind: 'scale' },
        ],
      },
      {
        title: 'Cranial Nerve Screen',
        description: 'Targeted cranial nerve signs that affect speech, swallow, shoulder, and airway protection.',
        fields: [
          { id: 'cnV', label: 'CN V jaw strength and sensation', kind: 'select', options: ['WNL', 'Mild', 'Moderate', 'Severe'] },
          { id: 'cnVII', label: 'CN VII facial and lip closure', kind: 'select', options: ['WNL', 'Mild', 'Moderate', 'Severe'] },
          { id: 'cnIX X', label: 'CN IX/X palate, voice, cough', kind: 'select', options: ['WNL', 'Mild', 'Moderate', 'Severe'] },
          { id: 'cnXII', label: 'CN XII tongue deviation/atrophy', kind: 'select', options: ['WNL', 'Mild', 'Moderate', 'Severe'] },
        ],
      },
    ],
    outputs: ['Mechanism impairment profile', 'Cranial nerve map', 'Exercise target list'],
  },
  {
    id: 'swallow',
    order: 6,
    label: 'Swallowing Assessment',
    shortLabel: 'Swallow',
    purpose: 'Clinical swallow evaluation, airway protection, residue risk, MASA-HNC, EAT-10, and diet decisions.',
    accent: '#16a34a',
    status: 'ready',
    blocks: [
      {
        title: 'Clinical Swallow Markers',
        description: 'Bolus control, swallow timing, cough, voice, and residue indicators.',
        fields: [
          { id: 'wetVoice', label: 'Wet voice after swallow', kind: 'select', options: ['Absent', 'Intermittent', 'Consistent'] },
          { id: 'cough', label: 'Cough efficiency', kind: 'select', options: ['Strong', 'Weak', 'Absent'] },
          { id: 'multipleSwallows', label: 'Multiple swallows per bolus', kind: 'select', options: ['No', 'Occasional', 'Frequent'] },
          { id: 'bolusIssue', label: 'Primary bolus issue', kind: 'multi', options: ['Oral residue', 'Delayed trigger', 'Nasal regurgitation', 'Coughing', 'Throat clearing', 'Fatigue'] },
        ],
      },
      {
        title: 'Screening Scores',
        description: 'Patient-reported and clinician-rated swallow burden.',
        fields: [
          { id: 'eat10', label: 'EAT-10 total', kind: 'number', helper: '0-40' },
          { id: 'masa', label: 'MASA-HNC estimate', kind: 'number' },
          { id: 'fois', label: 'FOIS level', kind: 'select', options: ['1', '2', '3', '4', '5', '6', '7'] },
        ],
      },
    ],
    outputs: ['Swallow safety grade', 'Diet texture recommendation', 'Compensatory strategy list'],
  },
  {
    id: 'voice',
    order: 7,
    label: 'Voice and Speech',
    shortLabel: 'Voice',
    purpose: 'Voice quality, resonance, intelligibility, articulation, alaryngeal speech, and acoustic tracking.',
    accent: '#0f766e',
    status: 'ready',
    blocks: [
      {
        title: 'Perceptual Speech',
        description: 'Functional speech and resonance profile.',
        fields: [
          { id: 'intelligibility', label: 'Speech intelligibility', kind: 'number', unit: '%' },
          { id: 'dysarthria', label: 'Dysarthria pattern', kind: 'select', options: ['None', 'Flaccid', 'Spastic', 'Ataxic', 'Mixed post-surgical'] },
          { id: 'resonance', label: 'Resonance', kind: 'select', options: ['Normal', 'Hypernasal', 'Hyponasal', 'Mixed'] },
        ],
      },
      {
        title: 'Voice Metrics',
        description: 'Digital voice tracking for treatment response.',
        fields: [
          { id: 'mpt', label: 'Maximum phonation time', kind: 'number', unit: 'sec' },
          { id: 'jitter', label: 'Jitter', kind: 'metric', unit: '%' },
          { id: 'shimmer', label: 'Shimmer', kind: 'metric', unit: 'dB' },
          { id: 'hnr', label: 'HNR', kind: 'metric', unit: 'dB' },
        ],
      },
    ],
    outputs: ['Speech intelligibility trend', 'Acoustic profile', 'Voice therapy targets'],
  },
  {
    id: 'nutrition',
    order: 8,
    label: 'Nutrition and Airway',
    shortLabel: 'Nutrition',
    purpose: 'Weight, hydration, oral intake, tube feeds, pain, secretion, and airway status.',
    accent: '#ea580c',
    status: 'ready',
    blocks: [
      {
        title: 'Nutrition Status',
        description: 'Functional intake and malnutrition risk.',
        fields: [
          { id: 'weight', label: 'Weight', kind: 'number', unit: 'kg' },
          { id: 'weightChange', label: 'Weight change in 1 month', kind: 'number', unit: '%' },
          { id: 'appetite', label: 'Appetite', kind: 'select', options: ['Good', 'Reduced', 'Poor'] },
          { id: 'hydration', label: 'Hydration risk', kind: 'scale' },
        ],
      },
      {
        title: 'Airway and Secretion',
        description: 'Tracheostomy, secretion burden, and airway clearance needs.',
        fields: [
          { id: 'tracheostomy', label: 'Tracheostomy status', kind: 'select', options: ['None', 'Cuffed', 'Cuffless', 'Speaking valve', 'Decannulated'] },
          { id: 'secretion', label: 'Secretion burden', kind: 'scale' },
          { id: 'oralCare', label: 'Oral care support', kind: 'select', options: ['Independent', 'Needs reminders', 'Caregiver assisted', 'Dependent'] },
        ],
      },
    ],
    outputs: ['Nutrition risk score', 'Airway precautions', 'Dietitian referral trigger'],
  },
  {
    id: 'instrumental',
    order: 9,
    label: 'Instrumental Studies',
    shortLabel: 'Studies',
    purpose: 'FEES, VFSS, endoscopy, imaging, acoustic recordings, and report ingestion.',
    accent: '#6366f1',
    status: 'in-progress',
    blocks: [
      {
        title: 'Swallow Instrumentals',
        description: 'Objective studies and actionable physiology findings.',
        fields: [
          { id: 'fees', label: 'FEES status', kind: 'select', options: ['Not done', 'Requested', 'Completed', 'Repeat required'] },
          { id: 'vfss', label: 'VFSS status', kind: 'select', options: ['Not done', 'Requested', 'Completed', 'Repeat required'] },
          { id: 'pas', label: 'PAS worst score', kind: 'number' },
          { id: 'residue', label: 'Residue pattern', kind: 'multi', options: ['Oral', 'Vallecular', 'Pyriform', 'Diffuse', 'UES'] },
        ],
      },
      {
        title: 'Document Ingestion',
        description: 'Reports, images, audio, and safety summaries.',
        fields: [
          { id: 'upload', label: 'Upload report or media', kind: 'text' },
          { id: 'summary', label: 'Parsed clinical summary', kind: 'textarea' },
        ],
      },
    ],
    outputs: ['Instrumental summary', 'PAS/residue profile', 'Evidence-linked recommendations'],
  },
  {
    id: 'icf',
    order: 10,
    label: 'WHO-ICF HNC Profile',
    shortLabel: 'ICF-HNC',
    purpose: 'Functioning profile using body functions, structures, activities, participation, and environment.',
    accent: '#0284c7',
    status: 'ready',
    blocks: [
      {
        title: 'Body Function and Structure',
        description: 'Rate HNC-specific impairment burden.',
        fields: [
          { id: 'b5105', label: 'b5105 Swallowing', kind: 'scale' },
          { id: 'b310', label: 'b310 Voice', kind: 'scale' },
          { id: 'b320', label: 'b320 Articulation', kind: 'scale' },
          { id: 's320', label: 's320 Mouth structure', kind: 'scale' },
        ],
      },
      {
        title: 'Activity, Participation, Environment',
        description: 'Map functional effect beyond impairment scores.',
        fields: [
          { id: 'd550', label: 'd550 Eating', kind: 'scale' },
          { id: 'd560', label: 'd560 Drinking', kind: 'scale' },
          { id: 'd330', label: 'd330 Speaking', kind: 'scale' },
          { id: 'e310', label: 'e310 Family support', kind: 'scale' },
        ],
      },
    ],
    outputs: ['ICF radar profile', 'Participation barriers', 'Family support needs'],
  },
  {
    id: 'exercise',
    order: 11,
    label: 'Exercise Prescription',
    shortLabel: 'Exercises',
    purpose: 'Patient-safe exercise plans with illustrated steps, dosage, contraindications, and adherence tracking.',
    accent: '#059669',
    status: 'ready',
    blocks: [
      {
        title: 'Prescription Builder',
        description: 'Select exercises from impairment targets and treatment phase.',
        fields: [
          { id: 'target', label: 'Target impairment', kind: 'multi', options: ['Tongue base', 'Airway closure', 'Jaw opening', 'Hyolaryngeal excursion', 'Speech articulation', 'Shoulder-neck ROM'] },
          { id: 'dose', label: 'Daily dosage', kind: 'text' },
          { id: 'painLimit', label: 'Pain stop rule', kind: 'textarea' },
        ],
      },
    ],
    outputs: ['Illustrated patient plan', 'Home schedule', 'Adherence log', 'Safety stop rules'],
  },
  {
    id: 'patient',
    order: 12,
    label: 'Patient Portal',
    shortLabel: 'Portal',
    purpose: 'Plain-language home program, symptom check-in, education, caregiver instructions, and reminders.',
    accent: '#0d9488',
    status: 'ready',
    blocks: [
      {
        title: 'Home Program',
        description: 'Daily schedule and patient-friendly therapy queue.',
        fields: [
          { id: 'today', label: 'Today exercises', kind: 'multi', options: ['Masako', 'Effortful swallow', 'Mendelsohn', 'Jaw stretch', 'Speech drills'] },
          { id: 'symptoms', label: 'Symptom check-in', kind: 'multi', options: ['Pain', 'Dry mouth', 'Coughing', 'Fatigue', 'Fever', 'Weight loss'] },
          { id: 'confidence', label: 'Confidence performing exercises', kind: 'scale' },
        ],
      },
    ],
    outputs: ['Daily checklist', 'Symptom alerts', 'Caregiver education card'],
  },
  {
    id: 'report',
    order: 13,
    label: 'Summary and Report',
    shortLabel: 'Report',
    purpose: 'Clinical impression, goals, recommendations, outcome tracking, and exportable report.',
    accent: '#334155',
    status: 'ready',
    blocks: [
      {
        title: 'Clinical Impression',
        description: 'SLP diagnosis and integrated care plan.',
        fields: [
          { id: 'slpDiagnosis', label: 'SLP diagnosis', kind: 'textarea' },
          { id: 'severity', label: 'Severity', kind: 'select', options: ['None', 'Mild', 'Moderate', 'Severe', 'Profound'] },
          { id: 'recommendations', label: 'Recommendations', kind: 'textarea' },
          { id: 'followUp', label: 'Follow-up plan', kind: 'textarea' },
        ],
      },
    ],
    outputs: ['SLP report', 'Patient handout', 'Team handoff', 'Outcome dashboard'],
  },
];

export const HNC_ICF_ITEMS: IcfHncItem[] = [
  { code: 'b250', domain: 'bodyFunction', name: 'Taste function', hncRelevance: 'Dysgeusia after radiation or chemotherapy affects intake.' },
  { code: 'b280', domain: 'bodyFunction', name: 'Sensation of pain', hncRelevance: 'Mucositis, surgical pain, neuropathic pain, and odynophagia.' },
  { code: 'b310', domain: 'bodyFunction', name: 'Voice functions', hncRelevance: 'Dysphonia, laryngeal edema, post-laryngectomy voice rehabilitation.' },
  { code: 'b320', domain: 'bodyFunction', name: 'Articulation functions', hncRelevance: 'Glossectomy, flap bulk, jaw restriction, and oral motor weakness.' },
  { code: 'b510', domain: 'bodyFunction', name: 'Ingestion functions', hncRelevance: 'Chewing, bolus manipulation, salivation, and swallowing.' },
  { code: 'b5105', domain: 'bodyFunction', name: 'Swallowing', hncRelevance: 'Oral, pharyngeal, and esophageal clearance plus airway protection.' },
  { code: 'b530', domain: 'bodyFunction', name: 'Weight maintenance', hncRelevance: 'Cancer cachexia, reduced intake, tube feeding dependence.' },
  { code: 's320', domain: 'bodyStructure', name: 'Structure of mouth', hncRelevance: 'Tongue, lips, palate, dentition, mandible, flap reconstruction.' },
  { code: 's330', domain: 'bodyStructure', name: 'Structure of pharynx', hncRelevance: 'Pharyngeal edema, residue, fibrosis, and surgical effects.' },
  { code: 's340', domain: 'bodyStructure', name: 'Structure of larynx', hncRelevance: 'Airway protection, voice, laryngectomy, edema, aspiration risk.' },
  { code: 'd330', domain: 'activityParticipation', name: 'Speaking', hncRelevance: 'Speech intelligibility and participation in conversation.' },
  { code: 'd350', domain: 'activityParticipation', name: 'Conversation', hncRelevance: 'Fatigue, voice, articulation, and social confidence.' },
  { code: 'd550', domain: 'activityParticipation', name: 'Eating', hncRelevance: 'Meal completion, diet texture, endurance, and pleasure eating.' },
  { code: 'd560', domain: 'activityParticipation', name: 'Drinking', hncRelevance: 'Liquid safety, cough, airway protection, hydration.' },
  { code: 'e110', domain: 'environment', name: 'Products for consumption', hncRelevance: 'Texture-modified foods, supplements, medications.' },
  { code: 'e310', domain: 'environment', name: 'Immediate family', hncRelevance: 'Caregiver support for exercises, tube feeding, and oral care.' },
  { code: 'e355', domain: 'environment', name: 'Health professionals', hncRelevance: 'SLP, oncology, dietitian, nursing, dental, and psychosocial team.' },
];

export const HNC_EXERCISE_LIBRARY: ExerciseProtocol[] = [
  {
    id: 'masako',
    name: 'Masako Maneuver / Tongue-Hold Swallow',
    category: 'swallow',
    phase: 'post-radiation',
    indication: 'Reduced tongue base retraction or pharyngeal drive, when clinically appropriate.',
    safety: 'Use saliva only unless cleared by the clinician. Stop if pain, choking, or distress occurs.',
    dosage: '5-10 repetitions, 1-3 sets daily as prescribed.',
    patientLanguage: 'Hold the tongue gently between the teeth and swallow saliva while keeping it forward.',
    targetImpairments: ['Tongue base retraction', 'Pharyngeal constriction', 'Swallow strength'],
    steps: [
      { label: 'Step 1', instruction: 'Sit upright with shoulders relaxed.', cue: 'Tall posture' },
      { label: 'Step 2', instruction: 'Place the tongue gently between the front teeth.', cue: 'Gentle hold' },
      { label: 'Step 3', instruction: 'Swallow saliva while the tongue stays forward.', cue: '5-10 reps' },
    ],
  },
  {
    id: 'effortful-swallow',
    name: 'Effortful Swallow',
    category: 'swallow',
    phase: 'maintenance',
    indication: 'Reduced pharyngeal clearance, residue, or need for stronger swallow pressure.',
    safety: 'Use prescribed bolus only. Stop if coughing persists or breathing changes.',
    dosage: '10 repetitions, 2-3 sets daily or during meals if prescribed.',
    patientLanguage: 'Swallow hard, like squeezing all the throat muscles together.',
    targetImpairments: ['Residue reduction', 'Base of tongue pressure', 'Pharyngeal clearance'],
    steps: [
      { label: 'Step 1', instruction: 'Sit upright and prepare saliva or prescribed bolus.', cue: 'Ready' },
      { label: 'Step 2', instruction: 'Squeeze the throat muscles and swallow hard.', cue: 'Strong swallow' },
      { label: 'Step 3', instruction: 'Relax and breathe normally before repeating.', cue: 'Reset' },
    ],
  },
  {
    id: 'mendelsohn',
    name: 'Mendelsohn Maneuver',
    category: 'swallow',
    phase: 'post-operative',
    indication: 'Reduced laryngeal elevation or shortened UES opening when patient can follow timing cues.',
    safety: 'Practice dry first. Avoid if breath holding causes discomfort.',
    dosage: '3 sets of 5 repetitions as prescribed.',
    patientLanguage: 'Swallow, feel the voice box lift, hold it up for 2-3 seconds, then release.',
    targetImpairments: ['Hyolaryngeal elevation', 'UES opening', 'Swallow timing'],
    steps: [
      { label: 'Step 1', instruction: 'Place fingers gently on the voice box.', cue: 'Find lift' },
      { label: 'Step 2', instruction: 'Start a swallow and feel the voice box rise.', cue: 'Lift' },
      { label: 'Step 3', instruction: 'Hold the lift briefly, then release.', cue: '2-3 sec' },
    ],
  },
  {
    id: 'supraglottic',
    name: 'Supraglottic Swallow',
    category: 'airway',
    phase: 'acute',
    indication: 'Reduced airway closure or aspiration risk when cleared by clinician.',
    safety: 'Not for patients with cardiac instability unless medically cleared.',
    dosage: 'Use during prescribed boluses only.',
    patientLanguage: 'Take a breath, hold it, swallow, cough, then breathe again.',
    targetImpairments: ['Airway closure', 'Cough clearance', 'Thin liquid safety'],
    steps: [
      { label: 'Step 1', instruction: 'Take a comfortable breath and hold it.', cue: 'Hold breath' },
      { label: 'Step 2', instruction: 'Swallow while holding the breath.', cue: 'Swallow' },
      { label: 'Step 3', instruction: 'Cough once, then breathe normally.', cue: 'Clear' },
    ],
  },
  {
    id: 'jaw-stretch',
    name: 'Active-Assisted Jaw Stretch',
    category: 'jaw',
    phase: 'post-radiation',
    indication: 'Trismus risk, reduced interincisal opening, or masseter/pterygoid tightness.',
    safety: 'Gentle stretch only. Stop with sharp pain, bleeding, or jaw locking.',
    dosage: '5 holds of 30 seconds, 3-5 times daily as prescribed.',
    patientLanguage: 'Open the mouth to a comfortable stretch and hold without forcing.',
    targetImpairments: ['Trismus', 'Jaw opening', 'Radiation fibrosis'],
    steps: [
      { label: 'Step 1', instruction: 'Sit upright and relax the jaw.', cue: 'Relax' },
      { label: 'Step 2', instruction: 'Open the mouth to a comfortable stretch.', cue: 'Gentle open' },
      { label: 'Step 3', instruction: 'Hold, then slowly return to rest.', cue: '30 sec' },
    ],
  },
  {
    id: 'lingual-resistance',
    name: 'Lingual Resistance Press',
    category: 'tongue',
    phase: 'post-operative',
    indication: 'Tongue weakness, deviation, reduced bolus control, or post-glossectomy compensation.',
    safety: 'Avoid excessive force on surgical areas. Use clinician-approved resistance only.',
    dosage: '3 sets of 10 pushes each side.',
    patientLanguage: 'Press the tongue into the cheek while the finger gently resists from outside.',
    targetImpairments: ['Tongue strength', 'Bolus control', 'Lateralization'],
    steps: [
      { label: 'Step 1', instruction: 'Place the tongue against the cheek.', cue: 'Side press' },
      { label: 'Step 2', instruction: 'Use a finger outside the cheek for gentle resistance.', cue: 'Resist' },
      { label: 'Step 3', instruction: 'Hold briefly, release, and repeat both sides.', cue: 'Both sides' },
    ],
  },
  {
    id: 'velar-drills',
    name: 'Back Tongue Speech Drills',
    category: 'speech',
    phase: 'maintenance',
    indication: 'Reduced posterior tongue contact after glossectomy or flap reconstruction.',
    safety: 'Stop if throat pain increases or fatigue becomes excessive.',
    dosage: '3 sets of 20 sound pairs, twice daily.',
    patientLanguage: 'Practice clear /ka/, /ga/, and /nga/ sounds slowly with strong back tongue contact.',
    targetImpairments: ['Velar consonants', 'Speech precision', 'Tongue-palate contact'],
    steps: [
      { label: 'Step 1', instruction: 'Sit tall and take a relaxed breath.', cue: 'Ready voice' },
      { label: 'Step 2', instruction: 'Say /ka/ and /ga/ slowly with clear release.', cue: 'Back tongue' },
      { label: 'Step 3', instruction: 'Repeat in syllables and short words.', cue: '20 reps' },
    ],
  },
  {
    id: 'neck-shoulder-rom',
    name: 'Neck and Shoulder Range Program',
    category: 'shoulder-neck',
    phase: 'post-operative',
    indication: 'Neck dissection, scar tightness, shoulder weakness, or postural guarding.',
    safety: 'Avoid pulling on drains, fresh wounds, or painful scar tissue.',
    dosage: '5 slow repetitions each direction, 2-3 times daily.',
    patientLanguage: 'Move the neck and shoulders slowly through a comfortable range.',
    targetImpairments: ['Scar mobility', 'Shoulder range', 'Posture'],
    steps: [
      { label: 'Step 1', instruction: 'Sit or stand tall with shoulders relaxed.', cue: 'Posture' },
      { label: 'Step 2', instruction: 'Turn, tilt, and lift shoulders slowly.', cue: 'Slow arrows' },
      { label: 'Step 3', instruction: 'Return to center and rest.', cue: '5 reps' },
    ],
  },
];
