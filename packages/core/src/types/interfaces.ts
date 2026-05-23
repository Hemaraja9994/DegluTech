/**
 * Dysphagia & Speech Recovery Suite (DSRS)
 * Assessment Module TypeScript Interfaces
 * 
 * Aligned with clinical protocols from Tata Memorial Hospital,
 * Sheffield NHS Trust, and US University Medical Center standards.
 */

// ==========================================
// 1. Case History & Clinical Intake Structure
// ==========================================

export interface ClinicalIntake {
  /** Secure SHA-256 hash uniquely isolating clinical and PII data */
  patientHash: string;
  demographics: {
    onset: string; // ISO date or textual timeline
    durationDays: number;
    progression: 'acute' | 'gradual' | 'fluctuating';
    presentingComplaints: {
      dysphagia: boolean;
      dysphonia: boolean;
      dysarthria: boolean;
      trismus: boolean;
      additionalDetails?: string;
    };
  };
  oncologicalProfile: {
    tumorSite: 'oral_cavity' | 'oropharynx' | 'larynx' | 'hypopharynx' | 'other';
    specificSiteDetails?: string;
    tnmStaging: {
      t: 'Tx' | 'T0' | 'Tis' | 'T1' | 'T2' | 'T3' | 'T4a' | 'T4b';
      n: 'Nx' | 'N0' | 'N1' | 'N2a' | 'N2b' | 'N2c' | 'N3a' | 'N3b';
      m: 'M0' | 'M1';
    };
    treatmentStatus:
      | 'pre_treatment_baseline'
      | 'post_surgical'
      | 'active_rt'
      | 'concurrent_crt'
      | 'post_crt_followup';
    postSurgicalDayCount?: number;
  };
  medicalSurgicalInventory: {
    reconstructions: {
      type: 'none' | 'radial_forearm_free_flap' | 'anterolateral_thigh_flap' | 'pectoralis_major_myocutaneous_flap' | 'other';
      details?: string;
    };
    airwayStatus: {
      hasTracheostomy: boolean;
      tubeType?: string;
      size?: string;
      cuffStatus?: 'inflated' | 'deflated' | 'cuffless';
    };
  };
}

// ==========================================
// 2. Oral Peripheral Mechanism Exam (OPME)
// ==========================================

export type FunctionalGrade = 'normal' | 'paresis' | 'paralysis' | 'scarred_tethered';

export interface OPMEGrid {
  labial: {
    retraction: FunctionalGrade;
    protrusion: FunctionalGrade;
    pucker: FunctionalGrade;
    resistance: FunctionalGrade;
  };
  lingual: {
    protrusion: FunctionalGrade;
    lateralization: FunctionalGrade;
    elevation: FunctionalGrade;
    retraction: FunctionalGrade;
    resistance: FunctionalGrade;
  };
  mandibular: {
    depression: FunctionalGrade;
    elevation: FunctionalGrade;
    lateralization: FunctionalGrade;
  };
  velopharyngeal: {
    elevation: FunctionalGrade;
    symmetry: FunctionalGrade;
  };
}

export interface CranialNerveChecks {
  cnV_trigeminal: {
    sensoryFace: 'intact' | 'impaired';
    motorJawDeviation: 'none' | 'deviated_left' | 'deviated_right';
    jawStrength: 'normal' | 'weak';
  };
  cnVII_facial: {
    asymmetryAtRest: boolean;
    smileSymmetry: 'symmetric' | 'asymmetric_left' | 'asymmetric_right';
    lipClosureStrength: 'normal' | 'reduced';
  };
  cnIX_X_glossopharyngeal_vagus: {
    palatalElevation: 'symmetric' | 'asymmetric_left' | 'asymmetric_right' | 'absent';
    gagReflex: 'present' | 'absent' | 'hyperactive';
    vocalQuality: 'normal' | 'hoarse' | 'wet' | 'breathy';
  };
  cnXI_accessory: {
    shoulderShrugStrength: 'normal' | 'weak_left' | 'weak_right' | 'bilateral_weakness';
    headTurnStrength: 'normal' | 'weak_left' | 'weak_right' | 'bilateral_weakness';
  };
  cnXII_hypoglossal: {
    tongueAtrophy: boolean;
    fasciculations: boolean;
    deviationOnProtrusion: 'none' | 'left' | 'right';
  };
}

export interface OPMEAssessment {
  patientHash: string;
  matrix: OPMEGrid;
  cranialNerves: CranialNerveChecks;
  tissueQualities: {
    mucosalStatusPostRT: {
      rtogEortcScore: 0 | 1 | 2 | 3 | 4; // RTOG/EORTC Mucositis Scoring
      clinicalDescription?: string;
    };
    rangeOfMotion: {
      restrictedLabial: boolean;
      restrictedLingual: boolean;
      restrictedMandibular: boolean;
    };
    symmetry: {
      facialAtRest: 'symmetric' | 'asymmetric';
      tongueProtruded: 'symmetric' | 'asymmetric';
    };
    manualStrengthTesting: {
      tongueResistanceScore: 0 | 1 | 2 | 3; // 0=None, 3=Normal
      lipResistanceScore: 0 | 1 | 2 | 3;
    };
  };
  specializedMetrics: {
    /** Interincisal distance (mm) to track RT-induced trismus */
    maxJawOpeningInterincisalDistanceMm: number;
  };
  recordedAt: string;
}

// ==========================================
// 3. Speech & Swallowing Assessment Protocols
// ==========================================

export interface SpeechSwallowingAssessment {
  patientHash: string;
  perceptualSpeech: {
    speechIntelligibilityPercent: number; // 0 to 100
    syllablesPerMinute: number;
    dysarthriaSubtype:
      | 'none'
      | 'flaccid'
      | 'spastic'
      | 'ataxic'
      | 'hypokinetic'
      | 'hyperkinetic'
      | 'mixed_post_surgical';
    clinicalNotes?: string;
  };
  dysphagiaClinical: {
    /** Mann Assessment of Swallowing Ability scoring items */
    masaScore: {
      alertness: number; // 0-10
      cooperation: number; // 0-10
      auditoryComprehension: number; // 0-10
      lipSeal: number; // 0-10
      lingualAction: number; // 0-10
      jawMovement: number; // 0-10
      velopharyngealCompetence: number; // 0-10
      coughReflex: number; // 0-10
      voluntaryCough: number; // 0-10
      gagReflex: number; // 0-10
      swallowTrigger: number; // 0-10
      laryngealElevation: number; // 0-10
      respirationRate: number; // 0-10
      respirationSwallowCoord: number; // 0-10
      dysphagiaSeverityScore: number; // Sum score interpreted
      aspirationRiskScore: number;
    };
    /** EAT-10 clinical outcomes score (0-40) */
    eat10: {
      responses: number[]; // Array of 10 items, 0-4 each
      totalScore: number;
    };
  };
  clinicalMarkers: {
    oralPreparatoryTimeSeconds: number;
    oralTransitTimeSeconds: number;
    delayedPharyngealSwallowInitiation: boolean;
    laryngealElevation: 'adequate' | 'reduced' | 'absent';
    postSwallowIndicators: {
      wetVoiceQuality: boolean;
      reflexiveCoughEfficiency: 'normal' | 'weak' | 'absent';
      multipleSwallowsPerBolus: boolean;
      penetrationAspirationRiskSigns: string[];
    };
  };
  recordedAt: string;
}

// ==========================================
// 4. Acoustic & Digital Voice Analysis Engine
// ==========================================

export interface AcousticVoiceAnalysis {
  patientHash: string;
  aerodynamicMetrics: {
    maximumPhonationTimeSeconds: number;
    szRatio: number;
  };
  perceptualVoice: {
    grbas: {
      grade: number; // 0-3
      roughness: number; // 0-3
      breathiness: number; // 0-3
      asthenia: number; // 0-3
      strain: number; // 0-3
    };
    capeV?: {
      overallSeverity: number; // 0-100
      roughness: number;
      breathiness: number;
      strain: number;
      pitch: number;
      loudness: number;
      resonance: 'normal' | 'hypernasal' | 'hyponasal' | 'mixed';
    };
  };
  audioFileMetadata: {
    fileHash: string; // Patient isolating hash matching wav data
    vowelType: 'a' | 'i' | 'u' | 'rainbow_passage' | 'other';
    durationSeconds: number;
    sampleRateHz: 44100;
    bitDepth: 16;
    channels: 1; // Mono
    format: 'wav';
  };
}

// ==========================================
// 5. Visual Spectrogram & Formant Analysis Platform
// ==========================================

export interface SpectrogramConfig {
  stft: {
    windowSize: 1024 | 2048;
    overlapSize: number; // e.g. 512, 1024
    windowFunction: 'hann' | 'hamming';
  };
  display: {
    frequencyMaxHz: number;
    dynamicRangeDb: number;
  };
}

export interface AcousticFeatures {
  patientHash: string;
  f0ContoursHz: number[];
  formants: {
    f1Hz: number[]; // First Formant frequency curve
    f2Hz: number[]; // Second Formant frequency curve (critical for vowel space/post-glossectomy)
    f3Hz: number[]; // Third Formant frequency curve
  };
  perturbation: {
    jitterPercent: number;
    shimmerDb: number;
    hnrDb: number;
  };
  vowelSpaceAreaSqHz?: number; // Vowel triangular grid representation
}

// ==========================================
// 6. Local Persistence Models
// ==========================================

export interface Patient {
  id: string;
  medical_record_hash: string;
  created_at: string;
  status: 'active' | 'discharged';
}

export interface MasaAssessment {
  id: string;
  patient_id: string;
  assessor_id: string;
  alertness: number;
  cooperation: number;
  respiration_rate: number;
  lip_seal: number;
  tongue_strength: number;
  gag_reflex: number;
  swallow_trigger: number;
  cough_reflex: number;
  total_score: number;
  aspiration_risk_level: string;
  dysphagia_severity: string;
  structural_deficits: string[];
  notes?: string;
  created_at: string;
}

export interface Eat10Assessment {
  id: string;
  patient_id: string;
  q1_weight_loss: number;
  q2_eat_out: number;
  q3_swallow_effort: number;
  q4_sticking_throat: number;
  q5_pain_swallowing: number;
  q6_pleasure_eating: number;
  q7_cough_after_eating: number;
  q8_stressful: number;
  q9_social_limit: number;
  q10_choking_fear: number;
  total_score: number;
  created_at: string;
}

export interface SpeechAssessment {
  id: string;
  patient_id: string;
  speech_intelligibility_percent: number;
  syllables_per_minute: number;
  dysarthria_subtype: string;
  clinical_notes?: string;
  created_at: string;
}

export interface TherapyLog {
  id: string;
  patient_id: string;
  exercise_type: string;
  planned_sets: number;
  planned_reps: number;
  completed_reps: number;
  duration_seconds: number;
  vas_pain_score: number;
  vas_effort_score: number;
  compliance_status: string;
  created_at: string;
}
