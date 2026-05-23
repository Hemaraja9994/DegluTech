import React, { useState } from 'react';
import { OPMEChecklist } from './components/OPMEChecklist';
import { SpectrogramVisualizer } from './components/SpectrogramVisualizer';
import { ReportIngestionZone } from './components/ReportIngestionZone';
import { RecommendationDashboard } from './components/RecommendationDashboard';
import { AdvancedOncologicalHistory } from '../../../packages/core/src/types/oncologyTypes';
import { OPMEAssessment, SpeechSwallowingAssessment } from '../../../packages/core/src/types/interfaces';

// Mocked profiles to run the initial CDSS recommendation engine visually
const PATIENT_HASH = '5e883e81b37e1273b4b455b5d198ee6a3782b6e1e21b7c3cf374fa04e22e845c';

const INITIAL_ONCOLOGY: AdvancedOncologicalHistory = {
  patientHash: PATIENT_HASH,
  diagnosisDate: '2026-01-15',
  staging: {
    site: 'lip_oral_cavity',
    t: 'T2',
    n: 'N1',
    m: 'M0',
    derivedStage: 'Stage III',
  },
  surgery: {
    hasHadSurgery: true,
    surgeryDate: '2026-02-10',
    margins: 'clear',
    closestMarginMm: 8,
    neckDissection: {
      type: 'selective',
      side: 'ipsilateral',
      levelsRemoved: ['I', 'II', 'III'],
    },
    reconstruction: {
      isReconstructed: true,
      flapType: 'free',
      donorSite: 'radial_forearm',
      microvascularStatus: 'patent',
    },
  },
  radiotherapy: {
    hasHadRT: true,
    totalDoseGy: 60,
    fractionsCount: 30,
    deliveryMethod: 'VMAT',
    targetFields: ['Primary Bed', 'Ipsilateral Neck'],
    toxicities: {
      trismusOnset: true,
      trismusOnsetWeeksPostRT: 4,
      radiationInducedFibrosisGrade: 2,
      xerostomiaSeverity: 'moderate',
    },
  },
  chemotherapy: {
    hasHadCT: true,
    agents: ['Cisplatin'],
    cycleCount: 3,
    timing: 'concurrent',
    activeToxicities: {
      ototoxicity: true,
      peripheralNeuropathy: false,
      nephrotoxicity: false,
      hematologicSuppression: true,
    },
  },
  updatedAt: new Date().toISOString(),
};

const INITIAL_OPME: OPMEAssessment = {
  patientHash: PATIENT_HASH,
  matrix: {
    labial: { retraction: 'normal', protrusion: 'normal', pucker: 'normal', resistance: 'normal' },
    lingual: { protrusion: 'normal', lateralization: 'normal', elevation: 'normal', retraction: 'normal', resistance: 'normal' },
    mandibular: { depression: 'normal', elevation: 'normal', lateralization: 'normal' },
    velopharyngeal: { elevation: 'normal', symmetry: 'normal' },
  },
  cranialNerves: {
    cnV_trigeminal: { sensoryFace: 'intact', motorJawDeviation: 'none', jawStrength: 'normal' },
    cnVII_facial: { asymmetryAtRest: false, smileSymmetry: 'symmetric', lipClosureStrength: 'normal' },
    cnIX_X_glossopharyngeal_vagus: { palatalElevation: 'symmetric', gagReflex: 'present', vocalQuality: 'normal' },
    cnXI_accessory: { shoulderShrugStrength: 'normal', headTurnStrength: 'normal' },
    cnXII_hypoglossal: { tongueAtrophy: false, fasciculations: false, deviationOnProtrusion: 'none' },
  },
  tissueQualities: {
    mucosalStatusPostRT: {
      rtogEortcScore: 2,
    },
    rangeOfMotion: {
      restrictedLabial: false,
      restrictedLingual: true,
      restrictedMandibular: false,
    },
    symmetry: {
      facialAtRest: 'symmetric',
      tongueProtruded: 'symmetric',
    },
    manualStrengthTesting: {
      tongueResistanceScore: 2,
      lipResistanceScore: 3,
    },
  },
  specializedMetrics: {
    maxJawOpeningInterincisalDistanceMm: 30, // trismus flagged (<35)
  },
  recordedAt: new Date().toISOString(),
};

const INITIAL_SWALLOW: SpeechSwallowingAssessment = {
  patientHash: PATIENT_HASH,
  perceptualSpeech: {
    speechIntelligibilityPercent: 75,
    syllablesPerMinute: 115,
    dysarthriaSubtype: 'mixed_post_surgical',
  },
  dysphagiaClinical: {
    masaScore: {
      alertness: 10,
      cooperation: 10,
      auditoryComprehension: 10,
      lipSeal: 10,
      lingualAction: 8,
      jawMovement: 8,
      velopharyngealCompetence: 10,
      coughReflex: 10,
      voluntaryCough: 8,
      gagReflex: 10,
      swallowTrigger: 8,
      laryngealElevation: 8,
      respirationRate: 10,
      respirationSwallowCoord: 10,
      dysphagiaSeverityScore: 168,
      aspirationRiskScore: 172,
    },
    eat10: {
      responses: [3, 2, 4, 3, 2, 1, 3, 2, 2, 3],
      totalScore: 25,
    },
  },
  clinicalMarkers: {
    oralPreparatoryTimeSeconds: 4.5,
    oralTransitTimeSeconds: 2.8,
    delayedPharyngealSwallowInitiation: true,
    laryngealElevation: 'reduced',
    postSwallowIndicators: {
      wetVoiceQuality: true,
      reflexiveCoughEfficiency: 'weak',
      multipleSwallowsPerBolus: true,
      penetrationAspirationRiskSigns: ['Coughing on thin liquids', 'Wet voice post-swallow'],
    },
  },
  recordedAt: new Date().toISOString(),
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assess' | 'spectrogram' | 'cdss' | 'ingest'>('cdss');
  const [opme, setOpme] = useState<OPMEAssessment>(INITIAL_OPME);

  return (
    <div style={styles.appContainer}>
      <header style={styles.appHeader}>
        <div style={styles.headerTitleRow}>
          <span style={styles.appLogo}>⚕️</span>
          <div>
            <h1 style={styles.appTitle}>Dysphagia & Speech Recovery Suite</h1>
            <span style={styles.appSubtitle}>Clinician Workspace Console</span>
          </div>
        </div>
        <nav style={styles.tabsRow}>
          <button
            onClick={() => setActiveTab('cdss')}
            style={activeTab === 'cdss' ? styles.tabBtnActive : styles.tabBtn}
          >
            📋 CDSS Intervention Recommendations
          </button>
          <button
            onClick={() => setActiveTab('assess')}
            style={activeTab === 'assess' ? styles.tabBtnActive : styles.tabBtn}
          >
            👄 OPME Mechanism Checklist
          </button>
          <button
            onClick={() => setActiveTab('spectrogram')}
            style={activeTab === 'spectrogram' ? styles.tabBtnActive : styles.tabBtn}
          >
            🎤 Voice Spectrogram Engine
          </button>
          <button
            onClick={() => setActiveTab('ingest')}
            style={activeTab === 'ingest' ? styles.tabBtnActive : styles.tabBtn}
          >
            📂 Document Ingestion Pipeline
          </button>
        </nav>
      </header>

      <main style={styles.mainArea}>
        {activeTab === 'cdss' && (
          <RecommendationDashboard
            oncologyHistory={INITIAL_ONCOLOGY}
            opme={opme}
            swallowSpeech={INITIAL_SWALLOW}
          />
        )}
        {activeTab === 'assess' && (
          <OPMEChecklist
            patientHash={PATIENT_HASH}
            onSave={(updatedOpme) => setOpme(updatedOpme)}
          />
        )}
        {activeTab === 'spectrogram' && <SpectrogramVisualizer patientHash={PATIENT_HASH} />}
        {activeTab === 'ingest' && <ReportIngestionZone patientHash={PATIENT_HASH} />}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    backgroundColor: '#020617',
    minHeight: '100vh',
    color: '#f8fafc',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  appHeader: {
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #1e293b',
    padding: '16px 24px',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  appLogo: {
    fontSize: '28px',
    backgroundColor: '#022c22',
    color: '#0d9488',
    padding: '8px 12px',
    borderRadius: '10px',
  },
  appTitle: {
    fontSize: '20px',
    margin: 0,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  appSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  tabsRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  tabBtn: {
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    border: '1px solid #0d9488',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  mainArea: {
    flex: 1,
    padding: '24px',
  },
};
