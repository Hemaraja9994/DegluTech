import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { RecommendationDashboard } from './src/components/RecommendationDashboard';
import { AdvancedOncologicalHistory } from '../../packages/core/src/types/oncologyTypes';
import { OPMEAssessment, SpeechSwallowingAssessment } from '../../packages/core/src/types/interfaces';

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
    maxJawOpeningInterincisalDistanceMm: 30,
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

export default function App() {
  const [viewMode, setViewMode] = useState<'patient_exercises' | 'clinician_portal'>('patient_exercises');
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({
    ex_masako: true,
    ex_shaker: false,
    ex_speech: false,
  });

  const toggleExercise = (id: string) => {
    setCompletedExercises((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => setViewMode('patient_exercises')}
          style={[styles.navBtn, viewMode === 'patient_exercises' && styles.navBtnActive]}
        >
          <Text style={styles.navText}>🏠 Daily Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('clinician_portal')}
          style={[styles.navBtn, viewMode === 'clinician_portal' && styles.navBtnActive]}
        >
          <Text style={styles.navText}>⚕️ Clinician CDSS</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'patient_exercises' ? (
        <ScrollView style={styles.scrollArea}>
          <Text style={styles.sectionHeader}>Today's Target Therapy Protocols</Text>

          {/* Exercise 1 */}
          <TouchableOpacity
            onPress={() => toggleExercise('ex_masako')}
            style={[styles.exerciseCard, completedExercises.ex_masako && styles.exerciseCardDone]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.exerciseName}>Masako Maneuver (Tongue Hold)</Text>
              <Text style={styles.doneIndicator}>
                {completedExercises.ex_masako ? '✅ Done' : '⏳ Pending'}
              </Text>
            </View>
            <Text style={styles.exerciseDetails}>
              Hold tongue between teeth and swallow saliva. Reps: 3 sets of 10.
            </Text>
          </TouchableOpacity>

          {/* Exercise 2 */}
          <TouchableOpacity
            onPress={() => toggleExercise('ex_shaker')}
            style={[styles.exerciseCard, completedExercises.ex_shaker && styles.exerciseCardDone]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.exerciseName}>Shaker Head Lift</Text>
              <Text style={styles.doneIndicator}>
                {completedExercises.ex_shaker ? '✅ Done' : '⏳ Pending'}
              </Text>
            </View>
            <Text style={styles.exerciseDetails}>
              Raise head off flat bed to view toes. Reps: 3 holds x 60s.
            </Text>
          </TouchableOpacity>

          {/* Exercise 3 */}
          <TouchableOpacity
            onPress={() => toggleExercise('ex_speech')}
            style={[styles.exerciseCard, completedExercises.ex_speech && styles.exerciseCardDone]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.exerciseName}>Glossectomy Speech Drills</Text>
              <Text style={styles.doneIndicator}>
                {completedExercises.ex_speech ? '✅ Done' : '⏳ Pending'}
              </Text>
            </View>
            <Text style={styles.exerciseDetails}>
              Exaggerate posterior velar consonant closures: /ka/, /ga/, /nga/.
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <RecommendationDashboard
          oncologyHistory={INITIAL_ONCOLOGY}
          opme={INITIAL_OPME}
          swallowSpeech={INITIAL_SWALLOW}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: 40,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  navBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  navBtnActive: {
    backgroundColor: '#0d9488',
  },
  navText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scrollArea: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 16,
    color: '#38bdf8',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  exerciseCardDone: {
    borderColor: '#0d9488',
    backgroundColor: '#064e3b',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exerciseName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  },
  doneIndicator: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  exerciseDetails: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
});
