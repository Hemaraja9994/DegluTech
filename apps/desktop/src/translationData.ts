export type ExerciseLanguageCode = 'en' | 'kn' | 'ml' | 'te' | 'hi' | 'ta';

export type LocalizedExerciseStep = {
  cue: string;
  instruction: string;
};

export type LocalizedExerciseCopy = {
  title: string;
  description: string;
  dosage: string;
  indication: string;
  safety: string;
  steps: [LocalizedExerciseStep, LocalizedExerciseStep, LocalizedExerciseStep];
};

export type ExerciseTranslationBundle = {
  name: string;
  nativeName: string;
  selectorTitle: string;
  protocolLabel: string;
  dosageTitle: string;
  indicationTitle: string;
  safetyTitle: string;
  targetsTitle: string;
  stepLabel: string;
  handoutLanguageLabel: string;
  exercises: Record<string, LocalizedExerciseCopy>;
};

const enExercises: Record<string, LocalizedExerciseCopy> = {
  masako: {
    title: 'Masako Maneuver / Tongue-Hold Swallow',
    description: 'Hold the tongue gently between the teeth and swallow saliva while keeping it forward.',
    dosage: '5-10 repetitions, 1-3 sets daily as prescribed.',
    indication: 'Reduced tongue base retraction or pharyngeal drive, when clinically appropriate.',
    safety: 'Use saliva only unless cleared by the clinician. Stop if pain, choking, or distress occurs.',
    steps: [
      { cue: 'Tall posture', instruction: 'Sit upright with shoulders relaxed.' },
      { cue: 'Gentle hold', instruction: 'Place the tongue gently between the front teeth.' },
      { cue: '5-10 reps', instruction: 'Swallow saliva while the tongue stays forward.' },
    ],
  },
  'effortful-swallow': {
    title: 'Effortful Swallow',
    description: 'Swallow hard, like squeezing all the throat muscles together.',
    dosage: '10 repetitions, 2-3 sets daily or during meals if prescribed.',
    indication: 'Reduced pharyngeal clearance, residue, or need for stronger swallow pressure.',
    safety: 'Use prescribed bolus only. Stop if coughing persists or breathing changes.',
    steps: [
      { cue: 'Ready', instruction: 'Sit upright and prepare saliva or prescribed bolus.' },
      { cue: 'Strong swallow', instruction: 'Squeeze the throat muscles and swallow hard.' },
      { cue: 'Reset', instruction: 'Relax and breathe normally before repeating.' },
    ],
  },
  mendelsohn: {
    title: 'Mendelsohn Maneuver',
    description: 'Swallow, feel the voice box lift, hold it up for 2-3 seconds, then release.',
    dosage: '3 sets of 5 repetitions as prescribed.',
    indication: 'Reduced laryngeal elevation or shortened UES opening when patient can follow timing cues.',
    safety: 'Practice dry first. Avoid if breath holding causes discomfort.',
    steps: [
      { cue: 'Find lift', instruction: 'Place fingers gently on the voice box.' },
      { cue: 'Lift', instruction: 'Start a swallow and feel the voice box rise.' },
      { cue: '2-3 sec', instruction: 'Hold the lift briefly, then release.' },
    ],
  },
  supraglottic: {
    title: 'Supraglottic Swallow',
    description: 'Take a breath, hold it, swallow, cough, then breathe again.',
    dosage: 'Use during prescribed boluses only.',
    indication: 'Reduced airway closure or aspiration risk when cleared by clinician.',
    safety: 'Not for patients with cardiac instability unless medically cleared.',
    steps: [
      { cue: 'Hold breath', instruction: 'Take a comfortable breath and hold it.' },
      { cue: 'Swallow', instruction: 'Swallow while holding the breath.' },
      { cue: 'Clear', instruction: 'Cough once, then breathe normally.' },
    ],
  },
  'jaw-stretch': {
    title: 'Active-Assisted Jaw Stretch',
    description: 'Open the mouth to a comfortable stretch and hold without forcing.',
    dosage: '5 holds of 30 seconds, 3-5 times daily as prescribed.',
    indication: 'Trismus risk, reduced interincisal opening, or masseter/pterygoid tightness.',
    safety: 'Gentle stretch only. Stop with sharp pain, bleeding, or jaw locking.',
    steps: [
      { cue: 'Relax', instruction: 'Sit upright and relax the jaw.' },
      { cue: 'Gentle open', instruction: 'Open the mouth to a comfortable stretch.' },
      { cue: '30 sec', instruction: 'Hold, then slowly return to rest.' },
    ],
  },
  'lingual-resistance': {
    title: 'Lingual Resistance Press',
    description: 'Press the tongue into the cheek while the finger gently resists from outside.',
    dosage: '3 sets of 10 pushes each side.',
    indication: 'Tongue weakness, deviation, reduced bolus control, or post-glossectomy compensation.',
    safety: 'Avoid excessive force on surgical areas. Use clinician-approved resistance only.',
    steps: [
      { cue: 'Side press', instruction: 'Place the tongue against the cheek.' },
      { cue: 'Resist', instruction: 'Use a finger outside the cheek for gentle resistance.' },
      { cue: 'Both sides', instruction: 'Hold briefly, release, and repeat both sides.' },
    ],
  },
  'velar-drills': {
    title: 'Back Tongue Speech Drills',
    description: 'Practice clear /ka/, /ga/, and /nga/ sounds slowly with strong back tongue contact.',
    dosage: '3 sets of 20 sound pairs, twice daily.',
    indication: 'Reduced posterior tongue contact after glossectomy or flap reconstruction.',
    safety: 'Stop if throat pain increases or fatigue becomes excessive.',
    steps: [
      { cue: 'Ready voice', instruction: 'Sit tall and take a relaxed breath.' },
      { cue: 'Back tongue', instruction: 'Say /ka/ and /ga/ slowly with clear release.' },
      { cue: '20 reps', instruction: 'Repeat in syllables and short words.' },
    ],
  },
  'neck-shoulder-rom': {
    title: 'Neck and Shoulder Range Program',
    description: 'Move the neck and shoulders slowly through a comfortable range.',
    dosage: '5 slow repetitions each direction, 2-3 times daily.',
    indication: 'Neck dissection, scar tightness, shoulder weakness, or postural guarding.',
    safety: 'Avoid pulling on drains, fresh wounds, or painful scar tissue.',
    steps: [
      { cue: 'Posture', instruction: 'Sit or stand tall with shoulders relaxed.' },
      { cue: 'Slow arrows', instruction: 'Turn, tilt, and lift shoulders slowly.' },
      { cue: '5 reps', instruction: 'Return to center and rest.' },
    ],
  },
};

const knExercises: Record<string, LocalizedExerciseCopy> = {
  masako: {
    title: 'ಮಸಾಕೊ ವಿಧಾನ / ನಾಲಿಗೆ ಹಿಡಿದು ನುಂಗುವುದು',
    description: 'ನಾಲಿಗೆಯನ್ನು ಹಲ್ಲುಗಳ ನಡುವೆ ಮೃದುವಾಗಿ ಹಿಡಿದು, ಅದು ಮುಂದೆ ಇರುವಾಗ ಲಾಲೆಯನ್ನು ನುಂಗಿ.',
    dosage: 'ವೈದ್ಯರು ಸೂಚಿಸಿದಂತೆ 5-10 ಬಾರಿ, ದಿನಕ್ಕೆ 1-3 ಸೆಟ್.',
    indication: 'ನಾಲಿಗೆಯ ಬೇಸ್ ಹಿಂತೆಗೆದುಕೊಳ್ಳುವಿಕೆ ಅಥವಾ ಗಂಟಲಿನ ಸ್ವಾಲೋ ಶಕ್ತಿ ಕಡಿಮೆಯಿದ್ದರೆ.',
    safety: 'ವೈದ್ಯರು ಅನುಮತಿಸದಿದ್ದರೆ ಲಾಲೆ ಮಾತ್ರ ಬಳಸಿ. ನೋವು, ಉಸಿರುಗಟ್ಟಿಕೆ ಅಥವಾ ಅಸ್ವಸ್ಥತೆ ಇದ್ದರೆ ನಿಲ್ಲಿಸಿ.',
    steps: [
      { cue: 'ನೇರ ಕುಳಿತುಕೊಳ್ಳಿ', instruction: 'ಭುಜಗಳನ್ನು ಸಡಿಲವಾಗಿಟ್ಟು ನೇರವಾಗಿ ಕುಳಿತುಕೊಳ್ಳಿ.' },
      { cue: 'ಮೃದುವಾಗಿ ಹಿಡಿ', instruction: 'ನಾಲಿಗೆಯ ತುದಿಯನ್ನು ಮುಂಭಾಗದ ಹಲ್ಲುಗಳ ನಡುವೆ ಮೃದುವಾಗಿ ಇಡಿ.' },
      { cue: '5-10 ಬಾರಿ', instruction: 'ನಾಲಿಗೆ ಮುಂದೆ ಇದ್ದಂತೆಯೇ ಲಾಲೆಯನ್ನು ನುಂಗಿ.' },
    ],
  },
  'effortful-swallow': {
    title: 'ಪ್ರಯತ್ನಪೂರ್ಣ ನುಂಗುವಿಕೆ',
    description: 'ಗಂಟಲಿನ ಸ್ನಾಯುಗಳನ್ನು ಒಟ್ಟಾಗಿ ಬಿಗಿಯಾಗಿ ಒತ್ತುವಂತೆ ಬಲವಾಗಿ ನುಂಗಿ.',
    dosage: '10 ಬಾರಿ, ದಿನಕ್ಕೆ 2-3 ಸೆಟ್ ಅಥವಾ ಊಟದ ವೇಳೆ ವೈದ್ಯರು ಸೂಚಿಸಿದಂತೆ.',
    indication: 'ಗಂಟಲಿನಲ್ಲಿ ಅವಶೇಷ ಉಳಿಯುವುದು ಅಥವಾ ನುಂಗುವ ಒತ್ತಡ ಕಡಿಮೆಯಿರುವಾಗ.',
    safety: 'ಸೂಚಿಸಿದ ಆಹಾರ/ದ್ರವ ಮಾತ್ರ ಬಳಸಿ. ಕೆಮ್ಮು ಮುಂದುವರಿದರೆ ಅಥವಾ ಉಸಿರಾಟ ಬದಲಾದರೆ ನಿಲ್ಲಿಸಿ.',
    steps: [
      { cue: 'ಸಿದ್ಧತೆ', instruction: 'ನೇರವಾಗಿ ಕುಳಿತು ಲಾಲೆ ಅಥವಾ ಸೂಚಿಸಿದ ಆಹಾರವನ್ನು ಸಿದ್ಧಪಡಿಸಿ.' },
      { cue: 'ಬಲವಾದ ನುಂಗು', instruction: 'ಗಂಟಲಿನ ಸ್ನಾಯುಗಳನ್ನು ಬಿಗಿಯಾಗಿ ಒತ್ತಿ ಬಲವಾಗಿ ನುಂಗಿ.' },
      { cue: 'ವಿಶ್ರಾಂತಿ', instruction: 'ಮತ್ತೆ ಮಾಡುವ ಮೊದಲು ಸಡಿಲವಾಗಿ ಉಸಿರಾಡಿ.' },
    ],
  },
  mendelsohn: {
    title: 'ಮೆಂಡೆಲ್ಸೋನ್ ವಿಧಾನ',
    description: 'ನುಂಗುವಾಗ ಧ್ವನಿ ಪೆಟ್ಟಿಗೆ ಮೇಲಕ್ಕೆ ಏರಿದುದನ್ನು ಅನುಭವಿಸಿ, 2-3 ಸೆಕೆಂಡ್ ಹಿಡಿದು ನಂತರ ಬಿಡಿ.',
    dosage: 'ವೈದ್ಯರು ಸೂಚಿಸಿದಂತೆ 5 ಬಾರಿ 3 ಸೆಟ್.',
    indication: 'ಕಂಠ ಮೇಲೇರಿಕೆ ಅಥವಾ UES ತೆರೆಯುವ ಅವಧಿ ಕಡಿಮೆಯಿದ್ದರೆ.',
    safety: 'ಮೊದಲು ಒಣ ಅಭ್ಯಾಸ ಮಾಡಿ. ಉಸಿರು ಹಿಡಿಯುವುದರಿಂದ ತೊಂದರೆ ಇದ್ದರೆ ತಪ್ಪಿಸಿ.',
    steps: [
      { cue: 'ಏರಿಕೆ ಕಂಡುಹಿಡಿ', instruction: 'ಬೆರಳುಗಳನ್ನು ಧ್ವನಿ ಪೆಟ್ಟಿಗೆಯ ಮೇಲೆ ಮೃದುವಾಗಿ ಇಡಿ.' },
      { cue: 'ಮೇಲೆತ್ತಿ', instruction: 'ನುಂಗಲು ಆರಂಭಿಸಿ ಧ್ವನಿ ಪೆಟ್ಟಿಗೆ ಮೇಲಕ್ಕೆ ಏರಿದುದನ್ನು ಅನುಭವಿಸಿ.' },
      { cue: '2-3 ಸೆಕೆಂಡ್', instruction: 'ಸ್ವಲ್ಪ ಹೊತ್ತು ಹಿಡಿದು ನಂತರ ಬಿಡಿ.' },
    ],
  },
  supraglottic: {
    title: 'ಸುಪ್ರಾಗ್ಲಾಟಿಕ್ ನುಂಗುವಿಕೆ',
    description: 'ಉಸಿರೆಳೆದು ಹಿಡಿ, ನುಂಗಿ, ಒಮ್ಮೆ ಕೆಮ್ಮಿ, ನಂತರ ಮತ್ತೆ ಉಸಿರಾಡಿ.',
    dosage: 'ವೈದ್ಯರು ಸೂಚಿಸಿದ ಆಹಾರ/ದ್ರವದೊಂದಿಗೆ ಮಾತ್ರ ಬಳಸಿ.',
    indication: 'ಗಾಳಿನಾಳ ರಕ್ಷಣೆ ಕಡಿಮೆ ಅಥವಾ ಆಸ್ಪಿರೇಷನ್ ಅಪಾಯವಿದ್ದರೆ.',
    safety: 'ಹೃದಯದ ಅಸ್ಥಿರತೆ ಇರುವವರು ವೈದ್ಯಕೀಯ ಅನುಮತಿ ಇಲ್ಲದೆ ಮಾಡಬಾರದು.',
    steps: [
      { cue: 'ಉಸಿರು ಹಿಡಿ', instruction: 'ಆರಾಮವಾಗಿ ಉಸಿರೆಳೆದು ಹಿಡಿದುಕೊಳ್ಳಿ.' },
      { cue: 'ನುಂಗಿ', instruction: 'ಉಸಿರು ಹಿಡಿದಂತೆಯೇ ನುಂಗಿ.' },
      { cue: 'ತೆರವು', instruction: 'ಒಮ್ಮೆ ಕೆಮ್ಮಿ ನಂತರ ಸಾಮಾನ್ಯವಾಗಿ ಉಸಿರಾಡಿ.' },
    ],
  },
  'jaw-stretch': {
    title: 'ದವಡೆ ಮೃದುವಾದ ಸ್ಟ್ರೆಚ್',
    description: 'ಬಲವಂತ ಮಾಡದೆ ಬಾಯಿಯನ್ನು ಆರಾಮದಾಯಕ ಸ್ಟ್ರೆಚ್ ತನಕ ತೆರೆದು ಹಿಡಿಯಿರಿ.',
    dosage: '30 ಸೆಕೆಂಡ್ ಹಿಡಿದು 5 ಬಾರಿ, ದಿನಕ್ಕೆ 3-5 ಬಾರಿ.',
    indication: 'ಟ್ರಿಸ್ಮಸ್, ಬಾಯಿ ತೆರೆಯುವಿಕೆ ಕಡಿಮೆ, ಅಥವಾ ದವಡೆ ಸ್ನಾಯು ಬಿಗಿತ.',
    safety: 'ಮೃದುವಾಗಿ ಮಾತ್ರ ಸ್ಟ್ರೆಚ್ ಮಾಡಿ. ತೀವ್ರ ನೋವು, ರಕ್ತಸ್ರಾವ ಅಥವಾ ದವಡೆ ಲಾಕ್ ಆದರೆ ನಿಲ್ಲಿಸಿ.',
    steps: [
      { cue: 'ಸಡಿಲಿಸಿ', instruction: 'ನೇರವಾಗಿ ಕುಳಿತು ದವಡೆಯನ್ನು ಸಡಿಲಿಸಿ.' },
      { cue: 'ಮೃದುವಾಗಿ ತೆರೆ', instruction: 'ಆರಾಮದಾಯಕ ಮಟ್ಟದವರೆಗೆ ಬಾಯಿಯನ್ನು ತೆರೆ.' },
      { cue: '30 ಸೆಕೆಂಡ್', instruction: 'ಹಿಡಿದು ನಂತರ ನಿಧಾನವಾಗಿ ವಿಶ್ರಾಂತಿಗೆ ಬನ್ನಿ.' },
    ],
  },
  'lingual-resistance': {
    title: 'ನಾಲಿಗೆ ಪ್ರತಿರೋಧ ಒತ್ತಡ',
    description: 'ನಾಲಿಗೆಯನ್ನು ಗಲ್ಲದ ಒಳಭಾಗಕ್ಕೆ ಒತ್ತಿ, ಹೊರಗಿನಿಂದ ಬೆರಳಿನಿಂದ ಮೃದುವಾಗಿ ಪ್ರತಿರೋಧ ಕೊಡಿ.',
    dosage: 'ಪ್ರತಿ ಬದಿಗೆ 10 ಒತ್ತಡ, 3 ಸೆಟ್.',
    indication: 'ನಾಲಿಗೆಯ ದುರ್ಬಲತೆ, ಬೋಲಸ್ ನಿಯಂತ್ರಣ ಕಡಿಮೆ, ಅಥವಾ ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ ನಂತರದ ಪರಿಹಾರ.',
    safety: 'ಶಸ್ತ್ರಚಿಕಿತ್ಸಾ ಭಾಗದಲ್ಲಿ ಅತಿಯಾದ ಒತ್ತಡ ತಪ್ಪಿಸಿ. ವೈದ್ಯರು ಅನುಮತಿಸಿದ ಪ್ರತಿರೋಧ ಮಾತ್ರ ಬಳಸಿ.',
    steps: [
      { cue: 'ಬದಿ ಒತ್ತಡ', instruction: 'ನಾಲಿಗೆಯನ್ನು ಗಲ್ಲದ ಒಳಭಾಗಕ್ಕೆ ಇಡಿ.' },
      { cue: 'ಪ್ರತಿರೋಧ', instruction: 'ಹೊರಗಿನಿಂದ ಬೆರಳಿನಿಂದ ಮೃದುವಾಗಿ ಪ್ರತಿರೋಧ ಕೊಡಿ.' },
      { cue: 'ಎರಡು ಬದಿ', instruction: 'ಸ್ವಲ್ಪ ಹಿಡಿದು ಬಿಡಿ, ಎರಡೂ ಬದಿಯಲ್ಲಿ ಪುನರಾವರ್ತಿಸಿ.' },
    ],
  },
  'velar-drills': {
    title: 'ಹಿಂಭಾಗದ ನಾಲಿಗೆ ಮಾತಿನ ಅಭ್ಯಾಸ',
    description: '/ka/, /ga/, /nga/ ಧ್ವನಿಗಳನ್ನು ನಿಧಾನವಾಗಿ ಮತ್ತು ಸ್ಪಷ್ಟವಾಗಿ ಅಭ್ಯಾಸ ಮಾಡಿ.',
    dosage: '20 ಧ್ವನಿ ಜೋಡಿಗಳು 3 ಸೆಟ್, ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ.',
    indication: 'ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ ಅಥವಾ ಫ್ಲ್ಯಾಪ್ ನಂತರ ಹಿಂಭಾಗದ ನಾಲಿಗೆ ಸಂಪರ್ಕ ಕಡಿಮೆಯಿದ್ದರೆ.',
    safety: 'ಗಂಟಲು ನೋವು ಹೆಚ್ಚಾದರೆ ಅಥವಾ ಹೆಚ್ಚು ದಣಿವು ಬಂದರೆ ನಿಲ್ಲಿಸಿ.',
    steps: [
      { cue: 'ಧ್ವನಿ ಸಿದ್ಧತೆ', instruction: 'ನೇರವಾಗಿ ಕುಳಿತು ಆರಾಮವಾಗಿ ಉಸಿರೆಳಿ.' },
      { cue: 'ಹಿಂಭಾಗ ನಾಲಿಗೆ', instruction: '/ka/ ಮತ್ತು /ga/ ನಿಧಾನವಾಗಿ ಸ್ಪಷ್ಟವಾಗಿ ಹೇಳಿ.' },
      { cue: '20 ಬಾರಿ', instruction: 'ಅಕ್ಷರಸಮೂಹ ಮತ್ತು ಚಿಕ್ಕ ಪದಗಳಲ್ಲಿ ಪುನರಾವರ್ತಿಸಿ.' },
    ],
  },
  'neck-shoulder-rom': {
    title: 'ಕುತ್ತಿಗೆ ಮತ್ತು ಭುಜ ಚಲನೆ ಕಾರ್ಯಕ್ರಮ',
    description: 'ಕುತ್ತಿಗೆ ಮತ್ತು ಭುಜಗಳನ್ನು ಆರಾಮದಾಯಕ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ನಿಧಾನವಾಗಿ ಚಲಿಸಿ.',
    dosage: 'ಪ್ರತಿ ದಿಕ್ಕಿನಲ್ಲಿ 5 ನಿಧಾನ ಪುನರಾವರ್ತನೆ, ದಿನಕ್ಕೆ 2-3 ಬಾರಿ.',
    indication: 'ನೆಕ್ ಡಿಸೆಕ್ಷನ್, ಗಾಯದ ಬಿಗಿತ, ಭುಜ ದುರ್ಬಲತೆ ಅಥವಾ ಭಂಗಿ ರಕ್ಷಣೆ.',
    safety: 'ಡ್ರೇನ್, ಹೊಸ ಗಾಯ ಅಥವಾ ನೋವು ಇರುವ ಸ್ಕಾರ್ ಮೇಲೆ ಎಳೆಯಬೇಡಿ.',
    steps: [
      { cue: 'ಭಂಗಿ', instruction: 'ಭುಜಗಳನ್ನು ಸಡಿಲವಾಗಿಟ್ಟು ನೇರವಾಗಿ ಕುಳಿತು ಅಥವಾ ನಿಂತುಕೊಳ್ಳಿ.' },
      { cue: 'ನಿಧಾನ ಬಾಣಗಳು', instruction: 'ಕುತ್ತಿಗೆ ತಿರುಗಿಸಿ, ತಗ್ಗಿಸಿ, ಭುಜಗಳನ್ನು ನಿಧಾನವಾಗಿ ಎತ್ತಿ.' },
      { cue: '5 ಬಾರಿ', instruction: 'ಮಧ್ಯಕ್ಕೆ ಮರಳಿ ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ.' },
    ],
  },
};

const hiExercises: Record<string, LocalizedExerciseCopy> = {
  masako: {
    title: 'मसाको मैनूवर / जीभ पकड़कर निगलना',
    description: 'जीभ को दांतों के बीच हल्के से पकड़ें और जीभ आगे रखते हुए लार निगलें.',
    dosage: '5-10 बार, चिकित्सक के अनुसार रोज 1-3 सेट.',
    indication: 'जीभ के आधार की गति या गले की निगलने की शक्ति कम होने पर.',
    safety: 'चिकित्सक की अनुमति न हो तो केवल लार से करें. दर्द, घुटन या परेशानी हो तो रोकें.',
    steps: [
      { cue: 'सीधा बैठें', instruction: 'कंधे ढीले रखकर सीधा बैठें.' },
      { cue: 'हल्की पकड़', instruction: 'जीभ की नोक को आगे के दांतों के बीच हल्के से रखें.' },
      { cue: '5-10 बार', instruction: 'जीभ आगे रखते हुए लार निगलें.' },
    ],
  },
  'effortful-swallow': {
    title: 'जोर लगाकर निगलना',
    description: 'गले की सभी मांसपेशियों को साथ में दबाने जैसा महसूस करते हुए जोर से निगलें.',
    dosage: '10 बार, रोज 2-3 सेट या भोजन के समय यदि बताया गया हो.',
    indication: 'गले में अवशेष रहना या निगलने का दबाव कम होना.',
    safety: 'केवल निर्धारित भोजन/द्रव का उपयोग करें. खांसी जारी रहे या सांस बदले तो रोकें.',
    steps: [
      { cue: 'तैयार', instruction: 'सीधा बैठें और लार या निर्धारित बोलस तैयार रखें.' },
      { cue: 'मजबूत निगल', instruction: 'गले की मांसपेशियों को दबाकर जोर से निगलें.' },
      { cue: 'रीसेट', instruction: 'फिर दोहराने से पहले आराम से सांस लें.' },
    ],
  },
  mendelsohn: {
    title: 'मेंडलसोन मैनूवर',
    description: 'निगलते समय आवाज की पेटी ऊपर उठती महसूस करें, 2-3 सेकंड रोकें, फिर छोड़ें.',
    dosage: 'चिकित्सक के अनुसार 5 बार के 3 सेट.',
    indication: 'लैरिंजियल उठान या UES खुलने की अवधि कम होने पर.',
    safety: 'पहले सूखा अभ्यास करें. सांस रोकने से परेशानी हो तो न करें.',
    steps: [
      { cue: 'उठान पहचानें', instruction: 'उंगलियां आवाज की पेटी पर हल्के से रखें.' },
      { cue: 'ऊपर उठे', instruction: 'निगलना शुरू करें और आवाज की पेटी ऊपर उठती महसूस करें.' },
      { cue: '2-3 सेकंड', instruction: 'उठान को थोड़ी देर रोकें, फिर छोड़ें.' },
    ],
  },
  supraglottic: {
    title: 'सुप्राग्लॉटिक निगलना',
    description: 'सांस लें, रोकें, निगलें, खांसें, फिर सांस लें.',
    dosage: 'केवल निर्धारित बोलस के साथ उपयोग करें.',
    indication: 'वायुमार्ग बंद करने की क्षमता कम या aspiration risk होने पर.',
    safety: 'हृदय अस्थिरता वाले मरीज चिकित्सकीय अनुमति के बिना न करें.',
    steps: [
      { cue: 'सांस रोकें', instruction: 'आराम से सांस लें और रोकें.' },
      { cue: 'निगलें', instruction: 'सांस रोके रखते हुए निगलें.' },
      { cue: 'साफ करें', instruction: 'एक बार खांसें, फिर सामान्य सांस लें.' },
    ],
  },
  'jaw-stretch': {
    title: 'सहायता से जबड़ा स्ट्रेच',
    description: 'बिना जोर लगाए मुंह को आरामदायक खिंचाव तक खोलें और रोकें.',
    dosage: '30 सेकंड के 5 होल्ड, रोज 3-5 बार.',
    indication: 'ट्रिस्मस जोखिम, मुंह खुलना कम, या जबड़े की मांसपेशियों में जकड़न.',
    safety: 'केवल हल्का खिंचाव करें. तेज दर्द, खून या जबड़ा लॉक हो तो रोकें.',
    steps: [
      { cue: 'आराम', instruction: 'सीधा बैठें और जबड़ा ढीला रखें.' },
      { cue: 'हल्का खोलें', instruction: 'मुंह को आरामदायक खिंचाव तक खोलें.' },
      { cue: '30 सेकंड', instruction: 'रोकें, फिर धीरे से विश्राम पर लौटें.' },
    ],
  },
  'lingual-resistance': {
    title: 'जीभ प्रतिरोध प्रेस',
    description: 'जीभ को गाल के अंदर दबाएं और बाहर से उंगली से हल्का प्रतिरोध दें.',
    dosage: 'हर तरफ 10 प्रेस के 3 सेट.',
    indication: 'जीभ की कमजोरी, दिशा बदलना, बोलस नियंत्रण कम, या surgery के बाद compensation.',
    safety: 'surgical area पर ज्यादा बल न लगाएं. केवल clinician-approved resistance उपयोग करें.',
    steps: [
      { cue: 'साइड प्रेस', instruction: 'जीभ को गाल के अंदर रखें.' },
      { cue: 'प्रतिरोध', instruction: 'गाल के बाहर से उंगली से हल्का प्रतिरोध दें.' },
      { cue: 'दोनों तरफ', instruction: 'थोड़ी देर रोकें, छोड़ें, फिर दोनों तरफ दोहराएं.' },
    ],
  },
  'velar-drills': {
    title: 'पीछे की जीभ के स्पीच ड्रिल',
    description: '/ka/, /ga/ और /nga/ ध्वनियां धीरे और साफ बोलें.',
    dosage: '20 sound pairs के 3 सेट, दिन में दो बार.',
    indication: 'glossectomy या flap reconstruction के बाद posterior tongue contact कम होने पर.',
    safety: 'गले का दर्द बढ़े या बहुत थकान हो तो रोकें.',
    steps: [
      { cue: 'आवाज तैयार', instruction: 'सीधा बैठें और आराम से सांस लें.' },
      { cue: 'पीछे की जीभ', instruction: '/ka/ और /ga/ धीरे, स्पष्ट release के साथ बोलें.' },
      { cue: '20 बार', instruction: 'syllables और छोटे शब्दों में दोहराएं.' },
    ],
  },
  'neck-shoulder-rom': {
    title: 'गर्दन और कंधे की गति कार्यक्रम',
    description: 'गर्दन और कंधों को आरामदायक सीमा में धीरे-धीरे चलाएं.',
    dosage: 'हर दिशा में 5 धीमी repetitions, रोज 2-3 बार.',
    indication: 'neck dissection, scar tightness, shoulder weakness, या posture guarding.',
    safety: 'drains, fresh wounds या painful scar tissue पर खिंचाव न डालें.',
    steps: [
      { cue: 'पोश्चर', instruction: 'कंधे ढीले रखकर सीधे बैठें या खड़े हों.' },
      { cue: 'धीमे तीर', instruction: 'गर्दन घुमाएं, झुकाएं और कंधे धीरे उठाएं.' },
      { cue: '5 बार', instruction: 'बीच में लौटें और आराम करें.' },
    ],
  },
};

const mlExercises: Record<string, LocalizedExerciseCopy> = {
  ...enExercises,
  masako: {
    title: 'മസാക്കോ മാനുവർ / നാവ് പിടിച്ച് വിഴുങ്ങൽ',
    description: 'നാവ് പല്ലുകൾക്കിടയിൽ മൃദുവായി പിടിച്ച് മുന്നിൽ തന്നെ വെച്ച് തുപ്പൽ വിഴുങ്ങുക.',
    dosage: 'ഡോക്ടർ/SLP നിർദ്ദേശിച്ചതുപോലെ 5-10 ആവർത്തനം, ദിവസവും 1-3 സെറ്റ്.',
    indication: 'നാവിന്റെ അടിഭാഗ ചലനം അല്ലെങ്കിൽ തൊണ്ടയിലെ വിഴുങ്ങൽ ശക്തി കുറവാണെങ്കിൽ.',
    safety: 'അനുമതി ഇല്ലെങ്കിൽ തുപ്പൽ മാത്രം ഉപയോഗിക്കുക. വേദന, ശ്വാസതടസം, ചുമ കൂടുതലായാൽ നിർത്തുക.',
    steps: [
      { cue: 'നേരെ ഇരിക്കുക', instruction: 'തോൾ ശാന്തമായി വെച്ച് നേരെ ഇരിക്കുക.' },
      { cue: 'മൃദുവായി പിടിക്കുക', instruction: 'നാവിന്റെ അറ്റം മുൻ പല്ലുകൾക്കിടയിൽ മൃദുവായി വെക്കുക.' },
      { cue: '5-10 തവണ', instruction: 'നാവ് മുന്നിൽ തന്നെ വെച്ച് തുപ്പൽ വിഴുങ്ങുക.' },
    ],
  },
};

const teExercises: Record<string, LocalizedExerciseCopy> = {
  ...enExercises,
  masako: {
    title: 'మసాకో మానీవర్ / నాలుక పట్టుకుని మింగడం',
    description: 'నాలుకను పళ్ల మధ్య మృదువుగా ఉంచి, ముందుకు ఉంచినట్టే లాలాజలాన్ని మింగండి.',
    dosage: 'వైద్యుడు చెప్పినట్టు 5-10 సార్లు, రోజుకు 1-3 సెట్లు.',
    indication: 'నాలుక బేస్ కదలిక లేదా గొంతు మింగే బలం తగ్గినప్పుడు.',
    safety: 'అనుమతి లేకపోతే లాలాజలం మాత్రమే ఉపయోగించండి. నొప్పి, ఉక్కిరిబిక్కిరి, అసౌకర్యం ఉంటే ఆపండి.',
    steps: [
      { cue: 'నిటారుగా కూర్చోండి', instruction: 'భుజాలు సడలించి నిటారుగా కూర్చోండి.' },
      { cue: 'మృదువుగా పట్టండి', instruction: 'నాలుక చివరను ముందరి పళ్ల మధ్య మృదువుగా పెట్టండి.' },
      { cue: '5-10 సార్లు', instruction: 'నాలుక ముందుకు ఉంచి లాలాజలాన్ని మింగండి.' },
    ],
  },
};

const taExercises: Record<string, LocalizedExerciseCopy> = {
  ...enExercises,
  masako: {
    title: 'மசாகோ பயிற்சி / நாக்கைப் பிடித்து விழுங்குதல்',
    description: 'நாக்கை பற்களுக்கிடையில் மெதுவாக வைத்து, முன்னே வைத்தபடி உமிழ்நீரை விழுங்கவும்.',
    dosage: 'மருத்துவர்/SLP கூறியபடி 5-10 முறை, தினமும் 1-3 செட்.',
    indication: 'நாக்கின் அடிப்பகுதி இயக்கம் அல்லது தொண்டை விழுங்கும் வலிமை குறைந்திருக்கும்போது.',
    safety: 'அனுமதி இல்லையெனில் உமிழ்நீருடன் மட்டும் செய்யவும். வலி, மூச்சுத்திணறல், சிரமம் இருந்தால் நிறுத்தவும்.',
    steps: [
      { cue: 'நிமிர்ந்து உட்காரவும்', instruction: 'தோள்களை தளர்த்தி நிமிர்ந்து உட்காரவும்.' },
      { cue: 'மெதுவாக பிடிக்கவும்', instruction: 'நாக்கின் நுனியை முன் பற்களுக்கிடையில் மெதுவாக வைக்கவும்.' },
      { cue: '5-10 முறை', instruction: 'நாக்கு முன்னே இருக்கும்போது உமிழ்நீரை விழுங்கவும்.' },
    ],
  },
};

export const exerciseTranslations: Record<ExerciseLanguageCode, ExerciseTranslationBundle> = {
  en: {
    name: 'English',
    nativeName: 'English',
    selectorTitle: "Select Patient's Preferred Language / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ / भाषा चुनें",
    protocolLabel: 'Protocol',
    dosageTitle: 'Dosage',
    indicationTitle: 'Indication',
    safetyTitle: 'Safety Stop Rule',
    targetsTitle: 'Targets',
    stepLabel: 'Step',
    handoutLanguageLabel: 'Patient handout language',
    exercises: enExercises,
  },
  kn: {
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    selectorTitle: "Select Patient's Preferred Language / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ / भाषा चुनें",
    protocolLabel: 'ಪ್ರೋಟೋಕಾಲ್',
    dosageTitle: 'ಡೋಸೇಜ್',
    indicationTitle: 'ಸೂಚನೆ',
    safetyTitle: 'ಸುರಕ್ಷತಾ ನಿಲ್ಲಿಸುವ ನಿಯಮ',
    targetsTitle: 'ಗುರಿಗಳು',
    stepLabel: 'ಹಂತ',
    handoutLanguageLabel: 'ರೋಗಿಯ ಹ್ಯಾಂಡೌಟ್ ಭಾಷೆ',
    exercises: knExercises,
  },
  ml: {
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    selectorTitle: "Select Patient's Preferred Language / ഭാഷ തിരഞ്ഞെടുക്കുക / भाषा चुनें",
    protocolLabel: 'പ്രോട്ടോക്കോൾ',
    dosageTitle: 'ഡോസേജ്',
    indicationTitle: 'സൂചന',
    safetyTitle: 'സുരക്ഷാ നിർത്തൽ നിയമം',
    targetsTitle: 'ലക്ഷ്യങ്ങൾ',
    stepLabel: 'ഘട്ടം',
    handoutLanguageLabel: 'രോഗിയുടെ ഹാൻഡൗട്ട് ഭാഷ',
    exercises: mlExercises,
  },
  te: {
    name: 'Telugu',
    nativeName: 'తెలుగు',
    selectorTitle: "Select Patient's Preferred Language / భాషను ఎంచుకోండి / भाषा चुनें",
    protocolLabel: 'ప్రోటోకాల్',
    dosageTitle: 'మోతాదు',
    indicationTitle: 'సూచన',
    safetyTitle: 'సేఫ్టీ స్టాప్ రూల్',
    targetsTitle: 'లక్ష్యాలు',
    stepLabel: 'దశ',
    handoutLanguageLabel: 'రోగి హ్యాండౌట్ భాష',
    exercises: teExercises,
  },
  hi: {
    name: 'Hindi',
    nativeName: 'हिन्दी',
    selectorTitle: "Select Patient's Preferred Language / भाषा चुनें / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
    protocolLabel: 'प्रोटोकॉल',
    dosageTitle: 'डोज',
    indicationTitle: 'संकेत',
    safetyTitle: 'सुरक्षा रोक नियम',
    targetsTitle: 'लक्ष्य',
    stepLabel: 'चरण',
    handoutLanguageLabel: 'रोगी हैंडआउट भाषा',
    exercises: hiExercises,
  },
  ta: {
    name: 'Tamil',
    nativeName: 'தமிழ்',
    selectorTitle: "Select Patient's Preferred Language / மொழியைத் தேர்ந்தெடுக்கவும் / भाषा चुनें",
    protocolLabel: 'பிரோட்டோகால்',
    dosageTitle: 'அளவு',
    indicationTitle: 'சுட்டிக்கை',
    safetyTitle: 'பாதுகாப்பு நிறுத்த விதி',
    targetsTitle: 'இலக்குகள்',
    stepLabel: 'படி',
    handoutLanguageLabel: 'நோயாளி கையேடு மொழி',
    exercises: taExercises,
  },
};
