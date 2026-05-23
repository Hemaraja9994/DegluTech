/**
 * Dysphagia & Speech Recovery Suite (DSRS)
 * Advanced Oncological History & Staging Schemas
 * 
 * Compliant with AJCC/UICC 8th Edition Staging Manual guidelines.
 */

// ==========================================
// AJCC 8th Edition TNM Categories
// ==========================================

export type TCategoryOralLip = 'Tx' | 'Tis' | 'T1' | 'T2' | 'T3' | 'T4a' | 'T4b';
export type TCategoryOropharynxP16Neg = 'Tx' | 'Tis' | 'T1' | 'T2' | 'T3' | 'T4a' | 'T4b';
export type TCategoryOropharynxP16Pos = 'Tx' | 'T0' | 'T1' | 'T2' | 'T3' | 'T4';
export type TCategoryHypopharynx = 'Tx' | 'Tis' | 'T1' | 'T2' | 'T3' | 'T4a' | 'T4b';
export type TCategoryLarynx = 'Tx' | 'Tis' | 'T1' | 'T2' | 'T3' | 'T4a' | 'T4b';
export type TCategoryNasopharynx = 'Tx' | 'T0' | 'T1' | 'T2' | 'T3' | 'T4';

export type NCategoryP16Neg = 'Nx' | 'N0' | 'N1' | 'N2a' | 'N2b' | 'N2c' | 'N3a' | 'N3b';
export type NCategoryP16Pos = 'Nx' | 'N0' | 'N1' | 'N2';
export type NCategoryNasopharynx = 'Nx' | 'N0' | 'N1' | 'N2' | 'N3';

export type MCategory = 'M0' | 'M1';

export type StageOralLip = 'Stage I' | 'Stage II' | 'Stage III' | 'Stage IVA' | 'Stage IVB' | 'Stage IVC';
export type StageOropharynxP16Neg = 'Stage I' | 'Stage II' | 'Stage III' | 'Stage IVA' | 'Stage IVB' | 'Stage IVC';
export type StageOropharynxP16Pos = 'Stage I' | 'Stage II' | 'Stage III' | 'Stage IV';
export type StageNasopharynx = 'Stage I' | 'Stage II' | 'Stage III' | 'Stage IVA' | 'Stage IVB';

export type TumorSite = 'lip_oral_cavity' | 'oropharynx_p16_neg' | 'oropharynx_p16_pos' | 'hypopharynx' | 'larynx' | 'nasopharynx';

export interface TNMStagingAJCC8 {
  site: TumorSite;
  t: string; // TCategory
  n: string; // NCategory
  m: MCategory;
  derivedStage: string; // Calculated staging output
}

// ==========================================
// Surgical Registry
// ==========================================

export type SurgicalMargin = 'clear' | 'close' | 'positive';
export type NeckDissectionType = 'none' | 'radical' | 'modified_radical' | 'selective';
export type SelectiveDissectionLevel = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export interface ReconstructionFlap {
  isReconstructed: boolean;
  flapType: 'free' | 'pedicled' | 'none';
  donorSite?: 
    | 'radial_forearm' 
    | 'anterolateral_thigh' 
    | 'pectoralis_major' 
    | 'fibula_osteocutaneous' 
    | 'rectus_abdominis' 
    | 'other';
  microvascularStatus: 'patent' | 'compromised' | 'failed' | 'not_applicable';
  surgicalNotes?: string;
}

export interface SurgicalRegistry {
  hasHadSurgery: boolean;
  surgeryDate?: string;
  margins: SurgicalMargin;
  closestMarginMm?: number;
  neckDissection: {
    type: NeckDissectionType;
    side: 'ipsilateral' | 'contralateral' | 'bilateral' | 'none';
    levelsRemoved: SelectiveDissectionLevel[];
  };
  reconstruction: ReconstructionFlap;
}

// ==========================================
// Adjuvant Therapy Logging
// ==========================================

export type RadiotherapyDelivery = 'IMRT' | 'VMAT' | '3D-CRT' | 'Proton' | 'other';

export interface RadiotherapyLog {
  hasHadRT: boolean;
  startDate?: string;
  endDate?: string;
  totalDoseGy: number; // e.g. 60-70 Gy
  fractionsCount: number; // e.g. 30-35 fractions
  deliveryMethod: RadiotherapyDelivery;
  targetFields: string[]; // e.g. ["Primary Tumor Bed", "Bilateral Neck Levels II-IV"]
  toxicities: {
    trismusOnset: boolean;
    trismusOnsetWeeksPostRT?: number;
    radiationInducedFibrosisGrade: 0 | 1 | 2 | 3 | 4; // RTOG/LENT-SOMA scale
    xerostomiaSeverity: 'none' | 'mild' | 'moderate' | 'severe';
  };
}

export type ChemoAgent = 'Cisplatin' | 'Carboplatin' | 'Cetuximab' | '5-FU' | 'Paclitaxel' | 'other';
export type ChemoTiming = 'neoadjuvant' | 'concurrent' | 'adjuvant';

export interface ChemotherapyLog {
  hasHadCT: boolean;
  agents: ChemoAgent[];
  cycleCount: number;
  timing: ChemoTiming;
  activeToxicities: {
    ototoxicity: boolean;
    peripheralNeuropathy: boolean;
    nephrotoxicity: boolean;
    hematologicSuppression: boolean;
  };
}

// ==========================================
// Comprehensive Patient Profile Model
// ==========================================

export interface AdvancedOncologicalHistory {
  patientHash: string;
  diagnosisDate: string;
  staging: TNMStagingAJCC8;
  surgery: SurgicalRegistry;
  radiotherapy: RadiotherapyLog;
  chemotherapy: ChemotherapyLog;
  updatedAt: string;
}
