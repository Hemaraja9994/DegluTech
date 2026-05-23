import { AdvancedOncologicalHistory } from '../types/oncologyTypes';
import { OPMEAssessment, SpeechSwallowingAssessment } from '../types/interfaces';

export interface RehabilitationExercise {
  id: string;
  name: string;
  category: 'dysphagia_prophylactic' | 'dysphagia_compensatory' | 'neuromuscular' | 'articulation_drill';
  instruction: string;
  rationale: string;
  frequency: string; // e.g. "3 times daily"
  repsAndSets: string; // e.g. "3 sets x 10 repetitions"
  durationSeconds?: number;
}

export interface ClinicalRecommendation {
  patientHash: string;
  generatedAt: string;
  pathwayName: string; // e.g. "Post-CRT Fibrosis Prevention", "Partial Glossectomy Speech Rehabilitation"
  primaryRiskFactors: string[];
  exercises: RehabilitationExercise[];
  clinicalDirectives: string[]; // High level advice for SLPs
}

/**
 * Rule-Based Intervention Selection Engine (CDSS)
 * DSRS Clinical Decision Support Core
 */
export class InterventionEngine {
  /**
   * Processes combined patient parameters to generate a customized therapeutic strategy.
   * Aligned with Tata Memorial Hospital and Sheffield NHS clinical pathways.
   * Includes strict schema validations and error handling boundaries.
   */
  public static evaluateProfile(
    oncologyHistory: AdvancedOncologicalHistory,
    opme: OPMEAssessment,
    swallowSpeech: SpeechSwallowingAssessment
  ): ClinicalRecommendation {
    // 1. Input Schema Valdiation & Sanitization
    if (!oncologyHistory || !oncologyHistory.patientHash) {
      throw new Error('CDSS Error: Invalid oncology history profile or missing patient identification hash.');
    }
    if (!opme || !opme.cranialNerves || !opme.matrix) {
      throw new Error('CDSS Error: Incomplete Oral Peripheral Mechanism Exam (OPME) matrix input.');
    }
    if (!swallowSpeech || !swallowSpeech.clinicalMarkers || !swallowSpeech.dysphagiaClinical) {
      throw new Error('CDSS Error: Missing standardized swallow and speech evaluation parameters.');
    }
    if (
      oncologyHistory.patientHash !== opme.patientHash || 
      oncologyHistory.patientHash !== swallowSpeech.patientHash
    ) {
      throw new Error('CDSS Security Alert: Patient identifier hashes do not match across data modules.');
    }

    try {
      const recommendations: RehabilitationExercise[] = [];
      const riskFactors: string[] = [];
      const directives: string[] = [];
      let pathwayName = 'General Head & Neck Cancer Rehabilitation';

      const patientHash = oncologyHistory.patientHash;
      
      // Safe fallback variables for evaluation parameters
      const site = oncologyHistory.staging?.site || 'other';
      const rtDose = oncologyHistory.radiotherapy?.totalDoseGy || 0;
      const rtogScore = opme.tissueQualities?.mucosalStatusPostRT?.rtogEortcScore || 0;
      
      const isUnderactiveRT = 
        oncologyHistory.radiotherapy?.hasHadRT || 
        site === 'nasopharynx' || 
        rtDose > 45 ||
        rtogScore > 0;

      // ===================================================
      // 1. Dysphagia Protocols (Prophylactic vs. Compensatory)
      // ===================================================

      // Fibrosis prophylaxis triggered by active/recent RT or CRT
      if (isUnderactiveRT) {
        pathwayName = 'Post-CRT Fibrosis Prevention & Swallow Preservation';
        riskFactors.push('Radiotherapy/Chemoradiotherapy induced tissue fibrosis risk');
        
        recommendations.push({
          id: 'ex_masako',
          name: 'Masako Maneuver (Tongue-Hold Swallow)',
          category: 'dysphagia_prophylactic',
          instruction: 'Protrude your tongue slightly and hold it gently between your front teeth. Swallow your saliva while maintaining this tongue hold.',
          rationale: 'Strengthens the pharyngeal constrictor muscles to compensate for reduced base of tongue retraction caused by radiation.',
          frequency: '3 times daily',
          repsAndSets: '3 sets of 10 swallows',
        });

        recommendations.push({
          id: 'ex_shaker',
          name: 'Shaker Exercise (Head Lift)',
          category: 'dysphagia_prophylactic',
          instruction: 'Lie flat on your back without a pillow. Raise your head to look at your toes without lifting your shoulders. Hold for 60 seconds (isometric), then perform 30 rapid head lifts (isotonic).',
          rationale: 'Enhances anterior laryngeal excursion and expands the upper esophageal sphincter opening, mitigating dysphagia risk.',
          frequency: '2 times daily',
          repsAndSets: '3 sustained holds (60s) + 30 repetitions',
        });

        recommendations.push({
          id: 'ex_mendelsohn',
          name: 'Mendelsohn Maneuver',
          category: 'dysphagia_prophylactic',
          instruction: 'Swallow normally. As you feel your voice box (larynx) rise to its highest point, squeeze your throat muscles to hold it up for 2 to 3 seconds before finishing the swallow.',
          rationale: 'Improves laryngeal elevation and prolongs cricopharyngeal opening to avoid post-swallow residue.',
          frequency: '3 times daily',
          repsAndSets: '3 sets of 5 repetitions',
        });
      }

      // Compensatory triggers based on physiological swallow deficits
      if (swallowSpeech.clinicalMarkers.delayedPharyngealSwallowInitiation) {
        riskFactors.push('Delayed pharyngeal swallow response');
        directives.push('Utilize sensory enhancement techniques prior to oral intake.');
        
        recommendations.push({
          id: 'ex_chintuck',
          name: 'Chin-Tuck Compensatory Position',
          category: 'dysphagia_compensatory',
          instruction: 'Take a bolus in your mouth. Bring your chin down toward your chest before swallowing. Keep chin down throughout the swallow process.',
          rationale: 'Narrows the airway entrance and widens the vallecular space to prevent premature spillage and aspiration.',
          frequency: 'During all oral intake',
          repsAndSets: 'Every bolus swallow',
        });
      }

      if (
        swallowSpeech.clinicalMarkers.postSwallowIndicators?.wetVoiceQuality ||
        swallowSpeech.clinicalMarkers.postSwallowIndicators?.reflexiveCoughEfficiency === 'weak'
      ) {
        riskFactors.push('Reduced airway protection (Wet voice / Weak cough post-swallow)');
        
        recommendations.push({
          id: 'ex_supraglottic',
          name: 'Supraglottic Swallow',
          category: 'dysphagia_compensatory',
          instruction: 'Take a deep breath and hold it. Swallow the bolus while holding your breath. Cough immediately after swallowing, then breathe out.',
          rationale: 'Voluntarily closes the true vocal folds before and during the swallow to prevent aspiration.',
          frequency: 'During all thin liquids and puree intake',
          repsAndSets: 'Every bolus swallow',
        });
      }

      // ===================================================
      // 2. Neuromuscular Re-education (Cranial Nerves)
      // ===================================================
      if (
        opme.cranialNerves.cnVII_facial?.lipClosureStrength === 'reduced' ||
        opme.matrix.labial?.resistance === 'paresis'
      ) {
        riskFactors.push('CN VII (Facial Nerve) motor paresis leading to oral containment weakness');
        recommendations.push({
          id: 'ex_lip_pucker',
          name: 'Lip Pucker & Press',
          category: 'neuromuscular',
          instruction: 'Pucker your lips tightly (as if kissing). Hold for 5 seconds, then spread into a wide smile. Hold for 5 seconds. Press lips tightly around a tongue depressor to resist withdrawal.',
          rationale: 'Strengthens orbicularis oris to resolve anterior bolus loss.',
          frequency: '3 times daily',
          repsAndSets: '3 sets of 15 repetitions',
        });
      }

      if (
        opme.cranialNerves.cnIX_X_glossopharyngeal_vagus?.palatalElevation === 'asymmetric_left' ||
        opme.cranialNerves.cnIX_X_glossopharyngeal_vagus?.palatalElevation === 'asymmetric_right' ||
        opme.cranialNerves.cnIX_X_glossopharyngeal_vagus?.palatalElevation === 'absent'
      ) {
        riskFactors.push('CN IX/X (Vagopharyngeal) weakness causing nasal regurgitation risk');
        directives.push('Incorporate tactile-thermal stimulation to the anterior faucial arches.');
      }

      // ===================================================
      // 3. Speech Intelligibility & Resection Adaptations
      // ===================================================
      if (oncologyHistory.surgery?.reconstruction?.isReconstructed) {
        const flap = oncologyHistory.surgery.reconstruction;
        
        if (flap.donorSite === 'radial_forearm' || flap.donorSite === 'anterolateral_thigh') {
          pathwayName = 'Glossectomy Speech & Articulation Rehabilitation';
          riskFactors.push('Partial/Hemiglossectomy structural defect affecting lingual range of motion');

          // Segment target phoneme sets depending on surgical boundary
          if (opme.tissueQualities?.rangeOfMotion?.restrictedLingual) {
            recommendations.push({
              id: 'ex_lingual_k_g',
              name: 'Back Lingual Articulation Drills (Velars)',
              category: 'articulation_drill',
              instruction: 'Practice sustained repetition of target syllables focusing on back tongue contact: /ka/, /ga/, /nga/. Exaggerate the release burst.',
              rationale: 'Recruits remaining posterior fibers and flap bulk to establish pharyngeal-palatal approximation necessary for intelligibility.',
              frequency: '2 times daily',
              repsAndSets: '3 sets of 20 sound pairs',
            });

            recommendations.push({
              id: 'ex_pacing',
              name: 'Over-Articulation & Speech Pacing',
              category: 'articulation_drill',
              instruction: 'Slow down speech using a pacing board. Over-articulate every consonant, widening jaw opening to enhance acoustic space.',
              rationale: 'Compensates for limited lingual agility by maximizing jaw and labial acoustic transitions.',
              frequency: 'During all conversational speech',
              repsAndSets: '15 minutes of structured reading aloud',
            });
          }
        }
      }

      // CN XII specific motor weakness drills
      if (opme.cranialNerves.cnXII_hypoglossal?.deviationOnProtrusion !== 'none') {
        riskFactors.push('CN XII (Hypoglossal) unilateral deviation and weakness');
        recommendations.push({
          id: 'ex_lingual_resistance',
          name: 'Isometric Tongue Resistance',
          category: 'neuromuscular',
          instruction: 'Push your tongue outward into your cheek. Place your index finger on the outside of your cheek to resist the push. Hold for 5 seconds. Repeat on both sides.',
          rationale: 'Builds cross-lateral lingual strength to restore midline tongue force during bolus transport.',
          frequency: '3 times daily',
          repsAndSets: '3 sets of 10 pushes per side',
        });
      }

      // Trismus warning & jaw stretching directives
      if (opme.specializedMetrics?.maxJawOpeningInterincisalDistanceMm < 35) {
        riskFactors.push('Radiation-induced Trismus (Interincisal space < 35mm)');
        recommendations.push({
          id: 'ex_jaw_stretch',
          name: 'Active-Assisted Jaw Stretching',
          category: 'neuromuscular',
          instruction: 'Place your thumbs on your upper teeth and index fingers on your lower teeth. Gently push your mouth open to the point of comfortable resistance. Hold for 30 seconds.',
          rationale: 'Maintains interincisal distance and prevents progressive masseter and pterygoid contracture post-RT.',
          frequency: '4 times daily',
          repsAndSets: '5 holds of 30 seconds',
        });
      }

      return {
        patientHash,
        generatedAt: new Date().toISOString(),
        pathwayName,
        primaryRiskFactors: riskFactors,
        exercises: recommendations,
        clinicalDirectives: directives,
      };
    } catch (err: any) {
      console.error('CDSS Execution Failure:', err);
      throw new Error(`CDSS Core Execution Failure: ${err.message || err}`);
    }
  }
}
