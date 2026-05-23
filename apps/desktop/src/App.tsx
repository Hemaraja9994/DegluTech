import React, { useMemo, useState } from 'react';
import {
  Activity,
  Apple,
  BarChart3,
  BookOpen,
  Brain,
  ClipboardCheck,
  Download,
  Dumbbell,
  FileText,
  Home,
  LayoutDashboard,
  Languages,
  Mic,
  MonitorUp,
  Save,
  ShieldAlert,
  Stethoscope,
  Syringe,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {
  HNC_CLINICAL_SECTIONS,
  HNC_EXERCISE_LIBRARY,
  HNC_ICF_ITEMS,
  HNC_PATIENT_SNAPSHOT,
  type ClinicalField,
  type ClinicalSection,
  type ExerciseProtocol,
  type HncSectionId,
} from '../../../packages/core/src/hncClinicalModel';
import {
  exerciseTranslations,
  type ExerciseLanguageCode,
  type LocalizedExerciseStep,
} from './translationData';

type FieldState = Record<string, string | string[]>;

const exerciseIllustrationUrls: Record<string, string> = {
  masako: new URL('./assets/masako-maneuver.png', import.meta.url).href,
  'effortful-swallow': new URL('./assets/effortful-swallow.png', import.meta.url).href,
  mendelsohn: new URL('./assets/mendelsohn-maneuver.png', import.meta.url).href,
  supraglottic: new URL('./assets/supraglottic-swallow.png', import.meta.url).href,
  'jaw-stretch': new URL('./assets/jaw-stretch.png', import.meta.url).href,
  'lingual-resistance': new URL('./assets/lingual-resistance.png', import.meta.url).href,
  'velar-drills': new URL('./assets/velar-drills.png', import.meta.url).href,
  'neck-shoulder-rom': new URL('./assets/neck-shoulder-rom.png', import.meta.url).href,
};

const sectionIcons: Record<HncSectionId, LucideIcon> = {
  command: LayoutDashboard,
  demographics: UserRound,
  oncology: Brain,
  treatment: Syringe,
  opme: Activity,
  swallow: ShieldAlert,
  voice: Mic,
  nutrition: Apple,
  instrumental: MonitorUp,
  icf: BarChart3,
  exercise: Dumbbell,
  patient: Home,
  report: FileText,
};

const initialFieldState: FieldState = {
  patientHash: '5e883e81b37e1273b4b455b5d198ee6a3782b6e1e21b7c3cf374fa04e22e845c',
  phase: 'Post-CRT',
  route: 'Combined',
  aspirationRisk: '3',
  airwayRisk: '2',
  nutritionRisk: '3',
  age: '56',
  gender: 'Female',
  language: 'Kannada / English',
  caregiver: 'Spouse',
  referredBy: 'Radiation oncology',
  evaluationDate: new Date().toISOString().slice(0, 10),
  chiefConcern: 'Coughing with thin liquids, restricted jaw opening, and reduced speech clarity after CRT.',
  tumorSite: 'Lip/oral cavity',
  tCategory: 'T2',
  nCategory: 'N1',
  mCategory: 'M0',
  diagnosisDate: '2026-01-15',
  recurrence: 'Primary',
  painScore: '4',
  surgeryType: ['Glossectomy', 'Neck dissection', 'Free flap'],
  flapType: 'Radial forearm',
  neckDissection: 'Ipsilateral',
  rtDose: '60',
  fractions: '30',
  chemoAgent: ['Cisplatin'],
  toxicity: ['Xerostomia', 'Fibrosis', 'Trismus', 'Fatigue'],
  jawOpening: '30',
  tongueRom: '2',
  lipSeal: '1',
  palatalElevation: '1',
  cnV: 'Mild',
  cnVII: 'Mild',
  'cnIX X': 'Moderate',
  cnXII: 'Moderate',
  wetVoice: 'Intermittent',
  cough: 'Weak',
  multipleSwallows: 'Frequent',
  bolusIssue: ['Oral residue', 'Delayed trigger', 'Coughing'],
  eat10: '25',
  masa: '168',
  fois: '5',
  intelligibility: '75',
  dysarthria: 'Mixed post-surgical',
  resonance: 'Normal',
  mpt: '8',
  jitter: '1.2',
  shimmer: '0.6',
  hnr: '15.5',
  weight: '49',
  weightChange: '6',
  appetite: 'Reduced',
  hydration: '2',
  tracheostomy: 'None',
  secretion: '2',
  oralCare: 'Caregiver assisted',
  fees: 'Requested',
  vfss: 'Completed',
  pas: '5',
  residue: ['Vallecular', 'Pyriform'],
  upload: 'VFSS and discharge summary',
  summary: 'Delayed pharyngeal trigger, residue after puree, intermittent penetration with thin liquids.',
  b5105: '3',
  b310: '1',
  b320: '2',
  s320: '3',
  d550: '3',
  d560: '2',
  d330: '2',
  e310: '1',
  target: ['Tongue base', 'Jaw opening', 'Speech articulation'],
  dose: 'Two short home sessions daily plus meal-time strategies.',
  painLimit: 'Stop if sharp pain, bleeding, breathing discomfort, or persistent coughing occurs.',
  today: ['Masako', 'Effortful swallow', 'Jaw stretch', 'Speech drills'],
  symptoms: ['Dry mouth', 'Coughing', 'Fatigue'],
  confidence: '3',
  slpDiagnosis: 'Moderate oropharyngeal dysphagia with post-treatment trismus and reduced tongue base drive.',
  severity: 'Moderate',
  recommendations: 'Continue supervised swallow strengthening, jaw range program, oral care, and instrumental follow-up.',
  followUp: 'Review in 2 weeks or earlier if fever, weight loss, aspiration symptoms, or worsening pain occurs.',
};

export const App: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState<HncSectionId>('command');
  const [fieldState, setFieldState] = useState<FieldState>(initialFieldState);
  const [selectedExerciseId, setSelectedExerciseId] = useState('masako');
  const [patientLanguage, setPatientLanguage] = useState<ExerciseLanguageCode>('en');
  const [savedAt, setSavedAt] = useState<string>('Not saved this session');

  const activeSection = HNC_CLINICAL_SECTIONS.find((section) => section.id === activeSectionId) ?? HNC_CLINICAL_SECTIONS[0];
  const selectedExercise = HNC_EXERCISE_LIBRARY.find((exercise) => exercise.id === selectedExerciseId) ?? HNC_EXERCISE_LIBRARY[0];

  const completion = useMemo(() => {
    const allFieldIds = HNC_CLINICAL_SECTIONS.flatMap((section) =>
      section.blocks.flatMap((block) => block.fields.map((field) => field.id))
    );
    const completed = allFieldIds.filter((id) => {
      const value = fieldState[id];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    }).length;
    return Math.round((completed / allFieldIds.length) * 100);
  }, [fieldState]);

  const saveSession = () => {
    setSavedAt(new Date().toLocaleTimeString());
  };

  return (
    <div style={styles.appShell}>
      <aside style={styles.sidebar}>
        <div style={styles.brandBlock}>
          <div style={styles.logoMark}>
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 style={styles.brandTitle}>DegluTech</h1>
            <p style={styles.brandSub}>HNC SLP Rehabilitation</p>
          </div>
        </div>

        <div style={styles.patientMini}>
          <div style={styles.patientName}>{HNC_PATIENT_SNAPSHOT.name}</div>
          <div style={styles.patientMeta}>{HNC_PATIENT_SNAPSHOT.patientId}</div>
          <div style={styles.riskPill}>{HNC_PATIENT_SNAPSHOT.riskLevel.toUpperCase()} RISK</div>
        </div>

        <nav style={styles.navList}>
          {HNC_CLINICAL_SECTIONS.map((section) => {
            const Icon = sectionIcons[section.id];
            const isActive = activeSectionId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionId(section.id)}
                style={{
                  ...styles.navButton,
                  ...(isActive ? styles.navButtonActive : {}),
                  borderLeftColor: isActive ? section.accent : 'transparent',
                }}
              >
                <Icon size={17} />
                <span style={styles.navLabel}>{section.label}</span>
                <span style={styles.navIndex}>{section.order}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div>
            <p style={styles.overline}>Head and neck cancer clinical workspace</p>
            <h2 style={styles.pageTitle}>{activeSection.label}</h2>
          </div>
          <div style={styles.topbarActions}>
            <div style={styles.progressWrap}>
              <span style={styles.progressText}>{completion}% complete</span>
              <div style={styles.progressTrack}>
                <div style={{ ...styles.progressFill, width: `${completion}%` }} />
              </div>
            </div>
            <button type="button" onClick={saveSession} style={styles.iconButton} aria-label="Save session">
              <Save size={18} />
            </button>
            <button type="button" onClick={() => window.print()} style={styles.iconButton} aria-label="Export report">
              <Download size={18} />
            </button>
          </div>
        </header>

        {activeSection.id === 'command' && (
          <CommandCenter
            completion={completion}
            fieldState={fieldState}
            savedAt={savedAt}
            onJump={setActiveSectionId}
          />
        )}

        {activeSection.id !== 'command' && activeSection.id !== 'exercise' && activeSection.id !== 'patient' && activeSection.id !== 'report' && (
          <SectionWorkspace
            section={activeSection}
            fieldState={fieldState}
            setFieldState={setFieldState}
          />
        )}

        {activeSection.id === 'exercise' && (
          <ExercisePrescription
            selectedExercise={selectedExercise}
            selectedExerciseId={selectedExerciseId}
            setSelectedExerciseId={setSelectedExerciseId}
            patientLanguage={patientLanguage}
            setPatientLanguage={setPatientLanguage}
          />
        )}

        {activeSection.id === 'patient' && (
          <PatientPortalPreview
            fieldState={fieldState}
            selectedExercise={selectedExercise}
            setActiveSectionId={setActiveSectionId}
          />
        )}

        {activeSection.id === 'report' && (
          <ReportWorkspace fieldState={fieldState} completion={completion} />
        )}
      </main>
    </div>
  );
};

function CommandCenter({
  completion,
  fieldState,
  savedAt,
  onJump,
}: {
  completion: number;
  fieldState: FieldState;
  savedAt: string;
  onJump: (section: HncSectionId) => void;
}) {
  const metrics = [
    { label: 'Aspiration', value: fieldState.aspirationRisk || '0', accent: '#dc2626' },
    { label: 'Nutrition', value: fieldState.nutritionRisk || '0', accent: '#ea580c' },
    { label: 'Jaw opening', value: `${fieldState.jawOpening || 0} mm`, accent: '#d97706' },
    { label: 'EAT-10', value: fieldState.eat10 || '0', accent: '#0f766e' },
  ];

  return (
    <div style={styles.workspaceGrid}>
      <section style={styles.heroPanel}>
        <div style={styles.heroCopy}>
          <p style={styles.overline}>Active case</p>
          <h3 style={styles.heroTitle}>{HNC_PATIENT_SNAPSHOT.diagnosis}</h3>
          <p style={styles.heroText}>{HNC_PATIENT_SNAPSHOT.stage} / {HNC_PATIENT_SNAPSHOT.treatmentPhase}</p>
          <div style={styles.goalList}>
            {HNC_PATIENT_SNAPSHOT.primaryGoals.map((goal) => (
              <span key={goal} style={styles.goalChip}>{goal}</span>
            ))}
          </div>
        </div>
        <div style={styles.statusPanel}>
          <div style={styles.largeNumber}>{completion}%</div>
          <div style={styles.statusLabel}>clinical model complete</div>
          <div style={styles.savedLine}>Saved: {savedAt}</div>
        </div>
      </section>

      <div style={styles.metricGrid}>
        {metrics.map((metric) => (
          <section key={metric.label} style={styles.metricCard}>
            <span style={{ ...styles.metricDot, backgroundColor: metric.accent }} />
            <div style={styles.metricLabel}>{metric.label}</div>
            <div style={styles.metricValue}>{metric.value}</div>
          </section>
        ))}
      </div>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>Clinical alerts</h3>
          <ShieldAlert size={18} color="#dc2626" />
        </div>
        <div style={styles.alertList}>
          {HNC_PATIENT_SNAPSHOT.alerts.map((alert) => (
            <div key={alert} style={styles.alertRow}>
              <span style={styles.alertMark} />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>Workflow queue</h3>
          <ClipboardCheck size={18} color="#2563eb" />
        </div>
        <div style={styles.queueList}>
          {[
            ['opme', 'Confirm jaw opening and CN XII findings'],
            ['swallow', 'Update swallow safety and diet recommendation'],
            ['exercise', 'Prescribe illustrated home program'],
            ['report', 'Finalize SLP report and handoff'],
          ].map(([id, label]) => (
            <button key={id} type="button" style={styles.queueItem} onClick={() => onJump(id as HncSectionId)}>
              <span>{label}</span>
              <BookOpen size={16} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionWorkspace({
  section,
  fieldState,
  setFieldState,
}: {
  section: ClinicalSection;
  fieldState: FieldState;
  setFieldState: React.Dispatch<React.SetStateAction<FieldState>>;
}) {
  return (
    <div style={styles.workspaceGrid}>
      <section style={styles.sectionIntro}>
        <div>
          <p style={styles.overline}>{section.shortLabel} module</p>
          <h3 style={styles.introTitle}>{section.purpose}</h3>
        </div>
        <div style={{ ...styles.moduleBadge, backgroundColor: section.accent }}>{section.status}</div>
      </section>

      <div style={styles.blockGrid}>
        {section.blocks.map((block) => (
          <section key={block.title} style={styles.panel}>
            <div style={styles.blockHeaderLine}>
              <h3 style={styles.panelTitle}>{block.title}</h3>
              <p style={styles.blockDescription}>{block.description}</p>
            </div>
            <div style={styles.formGrid}>
              {block.fields.map((field) => (
                <FieldControl
                  key={field.id}
                  field={field}
                  value={fieldState[field.id]}
                  onChange={(value) =>
                    setFieldState((prev) => ({
                      ...prev,
                      [field.id]: value,
                    }))
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>Expected outputs</h3>
          <ClipboardCheck size={18} color={section.accent} />
        </div>
        <div style={styles.outputGrid}>
          {section.outputs.map((output) => (
            <span key={output} style={styles.outputChip}>{output}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: ClinicalField;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
}) {
  if (field.kind === 'multi') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <label style={styles.fieldWide}>
        <span style={styles.fieldLabel}>{field.label}</span>
        <div style={styles.chipGroup}>
          {(field.options ?? []).map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() =>
                  onChange(isSelected ? selected.filter((item) => item !== option) : [...selected, option])
                }
                style={isSelected ? styles.choiceChipActive : styles.choiceChip}
              >
                {option}
              </button>
            );
          })}
        </div>
        {field.helper && <span style={styles.fieldHelper}>{field.helper}</span>}
      </label>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <label style={styles.fieldWide}>
        <span style={styles.fieldLabel}>{field.label}</span>
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          style={styles.textarea}
        />
        {field.helper && <span style={styles.fieldHelper}>{field.helper}</span>}
      </label>
    );
  }

  if (field.kind === 'select') {
    return (
      <label style={styles.field}>
        <span style={styles.fieldLabel}>{field.label}</span>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          style={styles.input}
        >
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {field.helper && <span style={styles.fieldHelper}>{field.helper}</span>}
      </label>
    );
  }

  if (field.kind === 'scale') {
    return (
      <label style={styles.field}>
        <span style={styles.fieldLabel}>{field.label}</span>
        <div style={styles.scaleRow}>
          {['0', '1', '2', '3', '4'].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              style={value === score ? styles.scaleButtonActive : styles.scaleButton}
            >
              {score}
            </button>
          ))}
        </div>
        {field.helper && <span style={styles.fieldHelper}>{field.helper}</span>}
      </label>
    );
  }

  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{field.label}</span>
      <input
        type={field.kind === 'number' || field.kind === 'metric' ? 'number' : field.kind === 'date' ? 'date' : 'text'}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
      />
      {field.unit && <span style={styles.fieldHelper}>Unit: {field.unit}</span>}
      {field.helper && <span style={styles.fieldHelper}>{field.helper}</span>}
    </label>
  );
}

function ExercisePrescription({
  selectedExercise,
  selectedExerciseId,
  setSelectedExerciseId,
  patientLanguage,
  setPatientLanguage,
}: {
  selectedExercise: ExerciseProtocol;
  selectedExerciseId: string;
  setSelectedExerciseId: (id: string) => void;
  patientLanguage: ExerciseLanguageCode;
  setPatientLanguage: (language: ExerciseLanguageCode) => void;
}) {
  const illustrationUrl = exerciseIllustrationUrls[selectedExercise.id];
  const localizedBundle = exerciseTranslations[patientLanguage];
  const localizedExercise = localizedBundle.exercises[selectedExercise.id] ?? exerciseTranslations.en.exercises[selectedExercise.id];

  return (
    <div style={styles.workspaceGrid}>
      <section style={styles.sectionIntro}>
        <div>
          <p style={styles.overline}>Exercise prescription</p>
          <h3 style={styles.introTitle}>Illustrated home program with clinical dosage and safety stop rules.</h3>
        </div>
        <div style={styles.moduleBadge}>patient-ready</div>
      </section>

      <LanguageSelector selectedLanguage={patientLanguage} onSelect={setPatientLanguage} />

      <div style={styles.exerciseLayout}>
        <section style={styles.exerciseMenu}>
          {HNC_EXERCISE_LIBRARY.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => setSelectedExerciseId(exercise.id)}
              style={selectedExerciseId === exercise.id ? styles.exerciseMenuItemActive : styles.exerciseMenuItem}
            >
              <span style={styles.exerciseName}>{exercise.name}</span>
              <span style={styles.exerciseMeta}>{exercise.phase} / {exercise.category}</span>
            </button>
          ))}
        </section>

        <section style={styles.panel}>
          <div style={styles.exerciseHeaderBlock}>
            <div>
              <p style={styles.overline}>{selectedExercise.category} {localizedBundle.protocolLabel}</p>
              <h3 style={styles.panelTitle}>{localizedExercise.title}</h3>
              <p style={styles.exerciseText}>{localizedExercise.description}</p>
              <p style={styles.languageNote}>
                {localizedBundle.handoutLanguageLabel}: {localizedBundle.nativeName} ({localizedBundle.name})
              </p>
            </div>
            <div style={styles.dosageBox}>
              <span style={styles.dosageLabel}>{localizedBundle.dosageTitle}</span>
              <strong>{localizedExercise.dosage}</strong>
            </div>
          </div>

          {illustrationUrl && (
            <div style={styles.generatedImageFrame}>
              <img src={illustrationUrl} alt={`${selectedExercise.name} illustrated exercise steps`} style={styles.generatedImage} />
            </div>
          )}

          <ExercisePanels
            exercise={selectedExercise}
            steps={localizedExercise.steps}
            stepLabel={localizedBundle.stepLabel}
          />

          <div style={styles.prescriptionGrid}>
            <div style={styles.prescriptionBand}>
              <h4 style={styles.smallTitle}>{localizedBundle.indicationTitle}</h4>
              <p style={styles.smallText}>{localizedExercise.indication}</p>
            </div>
            <div style={styles.prescriptionBand}>
              <h4 style={styles.smallTitle}>{localizedBundle.safetyTitle}</h4>
              <p style={styles.smallText}>{localizedExercise.safety}</p>
            </div>
            <div style={styles.prescriptionBand}>
              <h4 style={styles.smallTitle}>{localizedBundle.targetsTitle}</h4>
              <div style={styles.outputGrid}>
                {selectedExercise.targetImpairments.map((target) => (
                  <span key={target} style={styles.outputChip}>{target}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LanguageSelector({
  selectedLanguage,
  onSelect,
}: {
  selectedLanguage: ExerciseLanguageCode;
  onSelect: (language: ExerciseLanguageCode) => void;
}) {
  const selectedBundle = exerciseTranslations[selectedLanguage];

  return (
    <section
      className="my-1 flex flex-col gap-3 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 shadow-sm"
      aria-labelledby="language-selector-title"
    >
      <div
        id="language-selector-title"
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900"
      >
        <Languages size={16} aria-hidden="true" />
        <span>{selectedBundle.selectorTitle}</span>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Patient handout language">
        {Object.entries(exerciseTranslations).map(([languageCode, language]) => {
          const code = languageCode as ExerciseLanguageCode;
          const isSelected = selectedLanguage === code;

          return (
            <button
              key={code}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(code)}
              className={`min-h-11 rounded-md px-3.5 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:ring-offset-2 ${
                isSelected
                  ? 'bg-blue-700 text-white'
                  : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              {language.nativeName} ({language.name})
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ExercisePanels({
  exercise,
  steps,
  stepLabel,
}: {
  exercise: ExerciseProtocol;
  steps: [LocalizedExerciseStep, LocalizedExerciseStep, LocalizedExerciseStep];
  stepLabel: string;
}) {
  return (
    <div style={styles.infographicGrid}>
      {steps.map((step, index) => (
        <div key={`${exercise.id}-${index}`} style={styles.infographicPanel}>
          <div style={styles.stepLabel}>{stepLabel} {index + 1}</div>
          <div style={styles.patientFigure}>
            <div style={styles.headCircle}>
              {exercise.id === 'masako' && index === 1 && <span style={styles.tongueMark} />}
            </div>
            <div style={styles.neckLine} />
            <div style={styles.bodyLine} />
            <div style={index === 0 ? styles.postureGuide : styles.motionArrow}>
              {index === 0 ? '' : 'v'}
            </div>
          </div>
          <div style={styles.stepCue}>{step.cue}</div>
          <p style={styles.stepInstruction}>{step.instruction}</p>
        </div>
      ))}
    </div>
  );
}

function PatientPortalPreview({
  fieldState,
  selectedExercise,
  setActiveSectionId,
}: {
  fieldState: FieldState;
  selectedExercise: ExerciseProtocol;
  setActiveSectionId: (id: HncSectionId) => void;
}) {
  const today = Array.isArray(fieldState.today) ? fieldState.today : [];
  const symptoms = Array.isArray(fieldState.symptoms) ? fieldState.symptoms : [];

  return (
    <div style={styles.workspaceGrid}>
      <section style={styles.sectionIntro}>
        <div>
          <p style={styles.overline}>Patient app surface</p>
          <h3 style={styles.introTitle}>Daily exercise queue, symptom check-in, and caregiver-safe education.</h3>
        </div>
        <button type="button" onClick={() => setActiveSectionId('exercise')} style={styles.primaryButton}>
          <Dumbbell size={17} />
          Edit exercises
        </button>
      </section>

      <div style={styles.patientPortalGrid}>
        <section style={styles.patientPhone}>
          <div style={styles.phoneTop} />
          <h3 style={styles.phoneTitle}>Today</h3>
          <p style={styles.phoneSub}>{HNC_PATIENT_SNAPSHOT.currentRoute}</p>
          {today.map((item) => (
            <div key={item} style={styles.homeTask}>
              <span style={styles.homeCheck} />
              <span>{item}</span>
            </div>
          ))}
          <div style={styles.symptomStrip}>
            {symptoms.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>Featured illustrated exercise</h3>
          <ExercisePanels
            exercise={selectedExercise}
            steps={exerciseTranslations.en.exercises[selectedExercise.id].steps}
            stepLabel={exerciseTranslations.en.stepLabel}
          />
        </section>
      </div>
    </div>
  );
}

function ReportWorkspace({ fieldState, completion }: { fieldState: FieldState; completion: number }) {
  const icfScores = ['b5105', 'b310', 'b320', 's320', 'd550', 'd560', 'd330', 'e310'].map((id) => ({
    id,
    value: Number(fieldState[id] || 0),
  }));

  return (
    <div style={styles.workspaceGrid}>
      <section style={styles.sectionIntro}>
        <div>
          <p style={styles.overline}>Summary and handoff</p>
          <h3 style={styles.introTitle}>{fieldState.slpDiagnosis}</h3>
        </div>
        <div style={styles.moduleBadge}>{completion}% complete</div>
      </section>

      <div style={styles.reportGrid}>
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>Clinical report</h3>
          <ReportLine label="Severity" value={fieldState.severity} />
          <ReportLine label="Recommendations" value={fieldState.recommendations} />
          <ReportLine label="Follow-up" value={fieldState.followUp} />
          <ReportLine label="Diet and route" value={HNC_PATIENT_SNAPSHOT.currentRoute} />
        </section>

        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>ICF-HNC profile</h3>
          <div style={styles.icfBars}>
            {icfScores.map((score) => (
              <div key={score.id} style={styles.icfRow}>
                <span style={styles.icfCode}>{score.id}</span>
                <div style={styles.icfTrack}>
                  <div style={{ ...styles.icfFill, width: `${Math.min(score.value, 4) * 25}%` }} />
                </div>
                <span style={styles.icfValue}>{score.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Mapped ICF codes</h3>
        <div style={styles.icfGrid}>
          {HNC_ICF_ITEMS.map((item) => (
            <div key={item.code} style={styles.icfItem}>
              <span style={styles.icfCode}>{item.code}</span>
              <strong>{item.name}</strong>
              <p>{item.hncRelevance}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportLine({ label, value }: { label: string; value: string | string[] | undefined }) {
  const display = Array.isArray(value) ? value.join(', ') : value || 'Not recorded';
  return (
    <div style={styles.reportLine}>
      <span>{label}</span>
      <strong>{display}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appShell: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '284px minmax(0, 1fr)',
    background: '#f8fafc',
    color: '#172033',
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
  },
  sidebar: {
    background: '#ffffff',
    borderRight: '1px solid #dbe4ef',
    minHeight: '100vh',
    padding: '18px 14px',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
  },
  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px',
  },
  logoMark: {
    width: '42px',
    height: '42px',
    borderRadius: '8px',
    background: '#e0f2fe',
    color: '#0369a1',
    display: 'grid',
    placeItems: 'center',
  },
  brandTitle: {
    margin: 0,
    fontSize: '19px',
    lineHeight: 1.1,
  },
  brandSub: {
    margin: '3px 0 0',
    color: '#64748b',
    fontSize: '12px',
  },
  patientMini: {
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '14px',
    background: '#f8fafc',
  },
  patientName: {
    fontWeight: 800,
    fontSize: '14px',
  },
  patientMeta: {
    color: '#64748b',
    fontSize: '12px',
    marginTop: '2px',
  },
  riskPill: {
    display: 'inline-flex',
    marginTop: '10px',
    padding: '4px 8px',
    borderRadius: '999px',
    background: '#fee2e2',
    color: '#b91c1c',
    fontSize: '11px',
    fontWeight: 800,
  },
  navList: {
    display: 'grid',
    gap: '4px',
  },
  navButton: {
    width: '100%',
    border: '0',
    borderLeft: '3px solid transparent',
    background: 'transparent',
    display: 'grid',
    gridTemplateColumns: '22px minmax(0, 1fr) 22px',
    alignItems: 'center',
    gap: '9px',
    padding: '9px 9px',
    borderRadius: '7px',
    color: '#475569',
    cursor: 'pointer',
    textAlign: 'left',
  },
  navButtonActive: {
    background: '#eff6ff',
    color: '#0f172a',
    fontWeight: 800,
  },
  navLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '13px',
  },
  navIndex: {
    color: '#94a3b8',
    fontSize: '11px',
    textAlign: 'right',
  },
  main: {
    minWidth: 0,
    padding: '20px',
  },
  topbar: {
    height: '72px',
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    padding: '12px 16px',
    background: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  overline: {
    margin: '0 0 4px',
    textTransform: 'uppercase',
    letterSpacing: '0',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 800,
  },
  pageTitle: {
    margin: 0,
    fontSize: '22px',
  },
  topbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  progressWrap: {
    display: 'grid',
    gap: '5px',
    width: '150px',
  },
  progressText: {
    fontSize: '12px',
    color: '#475569',
    textAlign: 'right',
  },
  progressTrack: {
    width: '100%',
    height: '7px',
    background: '#e2e8f0',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#2563eb',
  },
  iconButton: {
    width: '38px',
    height: '38px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    cursor: 'pointer',
  },
  workspaceGrid: {
    display: 'grid',
    gap: '16px',
  },
  heroPanel: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    padding: '18px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 220px',
    gap: '18px',
  },
  heroCopy: {
    minWidth: 0,
  },
  heroTitle: {
    margin: 0,
    fontSize: '24px',
    lineHeight: 1.2,
    maxWidth: '760px',
  },
  heroText: {
    margin: '8px 0 0',
    color: '#475569',
  },
  goalList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '14px',
  },
  goalChip: {
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    color: '#1d4ed8',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },
  statusPanel: {
    borderRadius: '8px',
    background: '#f1f5f9',
    padding: '16px',
    display: 'grid',
    alignContent: 'center',
  },
  largeNumber: {
    fontSize: '42px',
    fontWeight: 900,
    color: '#0f766e',
  },
  statusLabel: {
    color: '#475569',
    fontSize: '13px',
    fontWeight: 700,
  },
  savedLine: {
    color: '#64748b',
    fontSize: '12px',
    marginTop: '10px',
  },
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '12px',
  },
  metricCard: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    padding: '14px',
    minHeight: '88px',
  },
  metricDot: {
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    display: 'block',
    marginBottom: '12px',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 700,
  },
  metricValue: {
    color: '#0f172a',
    fontSize: '24px',
    fontWeight: 900,
    marginTop: '4px',
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    padding: '16px',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  panelTitle: {
    margin: 0,
    fontSize: '17px',
    lineHeight: 1.25,
  },
  alertList: {
    display: 'grid',
    gap: '10px',
  },
  alertRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#334155',
    fontSize: '14px',
  },
  alertMark: {
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    background: '#dc2626',
  },
  queueList: {
    display: 'grid',
    gap: '8px',
  },
  queueItem: {
    border: '1px solid #dbe4ef',
    background: '#f8fafc',
    borderRadius: '8px',
    padding: '11px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    color: '#172033',
    fontWeight: 700,
  },
  sectionIntro: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    padding: '18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  introTitle: {
    margin: 0,
    fontSize: '21px',
    lineHeight: 1.25,
    maxWidth: '860px',
  },
  moduleBadge: {
    borderRadius: '999px',
    color: '#ffffff',
    background: '#2563eb',
    padding: '7px 11px',
    fontWeight: 800,
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  blockGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
  },
  blockHeaderLine: {
    marginBottom: '12px',
  },
  blockDescription: {
    margin: '5px 0 0',
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
  },
  field: {
    display: 'grid',
    gap: '5px',
  },
  fieldWide: {
    gridColumn: '1 / -1',
    display: 'grid',
    gap: '6px',
  },
  fieldLabel: {
    color: '#334155',
    fontSize: '12px',
    fontWeight: 800,
  },
  input: {
    width: '100%',
    minHeight: '38px',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    padding: '8px 10px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#ffffff',
  },
  textarea: {
    width: '100%',
    minHeight: '86px',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    padding: '9px 10px',
    fontSize: '14px',
    color: '#0f172a',
    background: '#ffffff',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  fieldHelper: {
    color: '#64748b',
    fontSize: '11px',
  },
  chipGroup: {
    display: 'flex',
    gap: '7px',
    flexWrap: 'wrap',
  },
  choiceChip: {
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    background: '#ffffff',
    color: '#334155',
    padding: '7px 10px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '12px',
  },
  choiceChipActive: {
    border: '1px solid #2563eb',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    padding: '7px 10px',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '12px',
  },
  scaleRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '5px',
  },
  scaleButton: {
    height: '34px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    background: '#ffffff',
    cursor: 'pointer',
    fontWeight: 800,
  },
  scaleButtonActive: {
    height: '34px',
    border: '1px solid #2563eb',
    borderRadius: '7px',
    background: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 800,
  },
  outputGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  outputChip: {
    background: '#f1f5f9',
    color: '#334155',
    border: '1px solid #dbe4ef',
    borderRadius: '999px',
    padding: '7px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },
  exerciseLayout: {
    display: 'grid',
    gridTemplateColumns: '300px minmax(0, 1fr)',
    gap: '16px',
  },
  exerciseMenu: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gap: '8px',
    alignSelf: 'start',
  },
  exerciseMenuItem: {
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    background: '#ffffff',
    padding: '11px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'grid',
    gap: '4px',
  },
  exerciseMenuItemActive: {
    border: '1px solid #0d9488',
    borderRadius: '8px',
    background: '#ecfeff',
    padding: '11px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'grid',
    gap: '4px',
  },
  exerciseName: {
    fontWeight: 800,
    color: '#172033',
    fontSize: '13px',
  },
  exerciseMeta: {
    color: '#64748b',
    fontSize: '11px',
    textTransform: 'capitalize',
  },
  exerciseHeaderBlock: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 220px',
    gap: '16px',
    alignItems: 'start',
    marginBottom: '16px',
  },
  exerciseText: {
    margin: '7px 0 0',
    color: '#475569',
    lineHeight: 1.5,
  },
  languageNote: {
    margin: '8px 0 0',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: 800,
  },
  dosageBox: {
    background: '#f0fdfa',
    color: '#134e4a',
    border: '1px solid #99f6e4',
    borderRadius: '8px',
    padding: '12px',
    display: 'grid',
    gap: '6px',
  },
  dosageLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    fontWeight: 900,
  },
  generatedImageFrame: {
    border: '1px solid #dbe4ef',
    background: '#ffffff',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '16px',
  },
  generatedImage: {
    display: 'block',
    width: '100%',
    maxHeight: '360px',
    objectFit: 'contain',
  },
  infographicGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
    marginTop: '8px',
  },
  infographicPanel: {
    minHeight: '238px',
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    background: '#ffffff',
    padding: '12px',
    display: 'grid',
    gridTemplateRows: 'auto 112px auto minmax(36px, auto)',
    gap: '8px',
  },
  stepLabel: {
    color: '#2563eb',
    fontSize: '12px',
    fontWeight: 900,
  },
  patientFigure: {
    position: 'relative',
    borderRadius: '8px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  headCircle: {
    position: 'absolute',
    top: '18px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    border: '3px solid #64748b',
    background: '#ffffff',
  },
  tongueMark: {
    position: 'absolute',
    bottom: '7px',
    left: '18px',
    width: '18px',
    height: '7px',
    borderRadius: '999px',
    background: '#2dd4bf',
  },
  neckLine: {
    position: 'absolute',
    top: '62px',
    left: '50%',
    width: '3px',
    height: '22px',
    background: '#94a3b8',
    transform: 'translateX(-50%)',
  },
  bodyLine: {
    position: 'absolute',
    top: '82px',
    left: '50%',
    width: '62px',
    height: '34px',
    border: '3px solid #94a3b8',
    borderBottom: '0',
    borderRadius: '34px 34px 0 0',
    transform: 'translateX(-50%)',
  },
  postureGuide: {
    position: 'absolute',
    right: '25%',
    top: '18px',
    width: '2px',
    height: '86px',
    background: '#38bdf8',
  },
  motionArrow: {
    position: 'absolute',
    right: '24%',
    top: '40px',
    color: '#2563eb',
    fontSize: '30px',
    fontWeight: 900,
  },
  stepCue: {
    color: '#0f766e',
    background: '#ccfbf1',
    border: '1px solid #99f6e4',
    borderRadius: '999px',
    padding: '5px 9px',
    display: 'inline-flex',
    justifySelf: 'start',
    fontSize: '12px',
    fontWeight: 900,
  },
  stepInstruction: {
    margin: 0,
    color: '#475569',
    fontSize: '13px',
    lineHeight: 1.35,
  },
  prescriptionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  prescriptionBand: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px',
  },
  smallTitle: {
    margin: '0 0 7px',
    fontSize: '13px',
    color: '#0f172a',
  },
  smallText: {
    margin: 0,
    color: '#475569',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  primaryButton: {
    border: '0',
    background: '#2563eb',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '10px 13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontWeight: 800,
  },
  patientPortalGrid: {
    display: 'grid',
    gridTemplateColumns: '330px minmax(0, 1fr)',
    gap: '16px',
  },
  patientPhone: {
    border: '1px solid #cbd5e1',
    borderRadius: '26px',
    background: '#ffffff',
    padding: '20px',
    minHeight: '580px',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
  },
  phoneTop: {
    width: '88px',
    height: '7px',
    borderRadius: '999px',
    background: '#cbd5e1',
    margin: '0 auto 20px',
  },
  phoneTitle: {
    margin: 0,
    fontSize: '24px',
  },
  phoneSub: {
    color: '#64748b',
    margin: '4px 0 16px',
  },
  homeTask: {
    minHeight: '46px',
    border: '1px solid #dbe4ef',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0 12px',
    marginBottom: '10px',
    fontWeight: 800,
  },
  homeCheck: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '2px solid #0d9488',
    background: '#ccfbf1',
  },
  symptomStrip: {
    display: 'flex',
    gap: '7px',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  reportGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
    gap: '16px',
  },
  reportLine: {
    borderTop: '1px solid #e2e8f0',
    padding: '12px 0',
    display: 'grid',
    gridTemplateColumns: '160px minmax(0, 1fr)',
    gap: '14px',
    color: '#475569',
    lineHeight: 1.45,
  },
  icfBars: {
    display: 'grid',
    gap: '11px',
  },
  icfRow: {
    display: 'grid',
    gridTemplateColumns: '56px minmax(0, 1fr) 24px',
    gap: '8px',
    alignItems: 'center',
  },
  icfCode: {
    fontFamily: 'Consolas, monospace',
    color: '#1d4ed8',
    background: '#eff6ff',
    borderRadius: '6px',
    padding: '3px 6px',
    fontSize: '12px',
    fontWeight: 900,
  },
  icfTrack: {
    height: '11px',
    background: '#e2e8f0',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  icfFill: {
    height: '100%',
    background: '#0f766e',
  },
  icfValue: {
    fontSize: '12px',
    fontWeight: 900,
    color: '#334155',
  },
  icfGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
  },
  icfItem: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gap: '6px',
  },
};
