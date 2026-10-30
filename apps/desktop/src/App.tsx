import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Command,
  Search,
  X,
  Apple,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Download,
  Dumbbell,
  FileText,
  Home,
  LayoutDashboard,
  Languages,
  Map,
  Mic,
  MonitorUp,
  Save,
  ShieldAlert,
  Syringe,
  UserRound,
  Users,
  Settings as SettingsIcon,
  Paperclip,
  type LucideIcon,
} from 'lucide-react';
import {
  HNC_CLINICAL_SECTIONS,
  HNC_EXERCISE_LIBRARY,
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
import { ReportErrorBoundary, ReportWorkspace } from './components/ReportWorkspace';
import { ClinicianDashboard } from './components/ClinicianDashboard';
import { DegluTechLogo } from './components/DegluTechLogo';
import { ClinicalMeasures } from './components/ClinicalMeasures';
import { WorkspaceNotice } from './components/WorkspaceNotice';
import { ExerciseCatalogue } from './components/ExerciseCatalogue';
import { PrescriptionRelease, PatientSessionLog, isReleased, readDoses } from './components/PrescriptionRelease';
import { ExerciseVisual } from './components/ExerciseVisual';
import { ClinicalToolSuite } from './components/ClinicalToolSuite';
import { PatientManager } from './components/PatientManager';
import { PatientFiles } from './components/PatientFiles';
import { ClinicSettingsPanel } from './components/ClinicSettingsPanel';
import { ClinicContext, useClinic } from './components/ClinicContext';
import {
  DEFAULT_SETTINGS, EMPTY_STORE, EMPTY_WORKSPACE, LEGACY_WORKSPACE_KEY, PATIENTS_KEY, SETTINGS_KEY,
  addPatient, cleanSettings, cleanStore, migrateLegacy, patientCode, patientLabel, riskFor, toCaseloadEntry, updateWorkspace,
  type ClinicSettings, type PatientStore, type Workspace,
} from './clinicStore';
import { FloatingBadge, SectionHeader } from './components/ui/ClinicalPrimitives';
import { T } from './theme';
import { computeSectionCompletion } from './reportEngine';

type FieldState = Record<string, string | string[]>;


const isExerciseLanguageCode = (value: string): value is ExerciseLanguageCode =>
  Object.prototype.hasOwnProperty.call(exerciseTranslations, value);

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

const sectionGroupFor = (sectionId: HncSectionId): string => {
  if (sectionId === 'command') return 'Triage';
  if (['demographics', 'oncology', 'treatment'].includes(sectionId)) return 'Intake';
  if (['opme', 'swallow', 'voice', 'nutrition', 'instrumental'].includes(sectionId)) return 'Assessment';
  if (sectionId === 'icf') return 'Synthesis';
  return 'Plan';
};



export const App: React.FC = () => {
  const [activeSectionId, setActiveSectionId] = useState<HncSectionId>('command');
  // The tool suite is a separate view, not a 14th section (the protocol fixes 13 sections).
  const [toolSuiteOpen, setToolSuiteOpen] = useState(false);
  const commandDialog = useRef<HTMLDialogElement>(null);
  const [sectionQuery, setSectionQuery] = useState('');
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSectionQuery('');
        if (!commandDialog.current?.open) commandDialog.current?.showModal();
        commandDialog.current?.querySelector('input')?.focus();
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Triage']);
  // Patients and clinic settings live in this browser (see clinicStore.ts). The open chart is the active patient's.
  const [store, setStore] = useState<PatientStore>(EMPTY_STORE);
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);
  const [mainView, setMainView] = useState<'workspace' | 'patients' | 'settings' | 'files'>('workspace');
  const [storageReady, setStorageReady] = useState(false);
  const [storedAt, setStoredAt] = useState('Opening saved patients');
  const active = store.patients.find((p) => p.id === store.activeId) ?? null;
  const ws = active?.workspace ?? EMPTY_WORKSPACE;
  const fieldState = ws.fieldState;
  const selectedExerciseId = ws.selectedExerciseId;
  const patientLanguage: ExerciseLanguageCode = isExerciseLanguageCode(ws.patientLanguage) ? ws.patientLanguage : 'en';
  const prescribedExerciseIds = ws.prescribedExerciseIds;
  const savedAt = ws.savedAt;
  const activeIdRef = useRef(store.activeId);
  activeIdRef.current = store.activeId;
  const changeWorkspace = useCallback((change: (w: Workspace) => Workspace) => {
    const id = activeIdRef.current;
    if (id) setStore((prev) => updateWorkspace(prev, id, change));
  }, []);
  const setFieldState: React.Dispatch<React.SetStateAction<FieldState>> = useCallback((action) => changeWorkspace((w) => {
    const next = typeof action === 'function' ? action(w.fieldState) : action;
    return next === w.fieldState ? w : { ...w, fieldState: next };
  }), [changeWorkspace]);
  const setSelectedExerciseId = useCallback((id: string) => changeWorkspace((w) => (w.selectedExerciseId === id ? w : { ...w, selectedExerciseId: id })), [changeWorkspace]);
  const setPatientLanguage = useCallback((language: ExerciseLanguageCode) => changeWorkspace((w) => (w.patientLanguage === language ? w : { ...w, patientLanguage: language })), [changeWorkspace]);
  const setPrescribedExerciseIds: React.Dispatch<React.SetStateAction<string[]>> = useCallback((action) => changeWorkspace((w) => ({ ...w, prescribedExerciseIds: typeof action === 'function' ? action(w.prescribedExerciseIds) : action })), [changeWorkspace]);
  const setSavedAt = (value: string) => changeWorkspace((w) => ({ ...w, savedAt: value }));

  useEffect(() => {
    if (storageReady && fieldState.releaseLanguage !== patientLanguage) {
      setFieldState(previous => ({ ...previous, releaseLanguage: patientLanguage }));
    }
  }, [storageReady, patientLanguage, fieldState.releaseLanguage]);

  const sectionReadiness = useMemo(() => computeSectionCompletion(fieldState), [fieldState]);
  useEffect(() => {
    const group = toolSuiteOpen ? 'Assessment' : sectionGroupFor(activeSectionId);
    setExpandedGroups(previous => previous.includes(group) ? previous : [...previous, group]);
  }, [activeSectionId, toolSuiteOpen]);

  const activeSection = HNC_CLINICAL_SECTIONS.find((section) => section.id === activeSectionId) ?? HNC_CLINICAL_SECTIONS[0];
  const activeSectionIndex = Math.max(0, HNC_CLINICAL_SECTIONS.findIndex((section) => section.id === activeSection.id));
  const previousSection = activeSectionIndex > 0 ? HNC_CLINICAL_SECTIONS[activeSectionIndex - 1] : undefined;
  const nextSection = activeSectionIndex < HNC_CLINICAL_SECTIONS.length - 1 ? HNC_CLINICAL_SECTIONS[activeSectionIndex + 1] : undefined;
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

  useEffect(() => {
    let next: PatientStore = EMPTY_STORE;
    try {
      const raw = window.localStorage.getItem(PATIENTS_KEY);
      if (raw) next = cleanStore(JSON.parse(raw));
      else {
        const legacy = migrateLegacy(window.localStorage.getItem(LEGACY_WORKSPACE_KEY));
        if (legacy) next = addPatient(EMPTY_STORE, legacy);
      }
      const rawSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) setSettings(cleanSettings(JSON.parse(rawSettings)));
      setStoredAt(next.patients.length ? 'Patients restored on this device' : 'No patients yet');
    } catch {
      setStoredAt('Saved patients could not be read on this device');
    }
    setStore(next);
    if (!next.activeId) setMainView('patients');
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(PATIENTS_KEY, JSON.stringify(store));
      setStoredAt(`Saved on this device ${new Date().toLocaleTimeString()}`);
    } catch {
      setStoredAt('Not saved: this device is out of browser storage. Export a backup from Settings.');
    }
  }, [store, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { setStoredAt('Settings not saved: browser storage is full or blocked.'); }
  }, [settings, storageReady]);

  const openPatient = (id: string, section: HncSectionId = 'command') => {
    setStore((prev) => (prev.patients.some((p) => p.id === id) ? { ...prev, activeId: id } : prev));
    setMainView('workspace');
    setToolSuiteOpen(false);
    setActiveSectionId(section);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };
  const showView = (view: 'patients' | 'settings' | 'files') => {
    setMainView(view);
    setToolSuiteOpen(false);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };

  const saveSession = () => {
    setSavedAt(new Date().toLocaleTimeString());
  };

  const navigateToSection = (sectionId: HncSectionId) => {
    setToolSuiteOpen(false);
    setMainView('workspace');
    setActiveSectionId(sectionId);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };

  const openToolSuite = () => {
    setMainView('workspace');
    setToolSuiteOpen(true);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };
  const view: 'workspace' | 'patients' | 'settings' | 'files' = !active && (mainView === 'workspace' || mainView === 'files') ? 'patients' : mainView;
  const shownId: HncSectionId | 'tools' = toolSuiteOpen ? 'tools' : activeSection.id;
  const caseload = useMemo(() => {
    const seen = new Set<string>();
    return store.patients.map((p) => {
      let code = patientCode(p);
      while (seen.has(code)) code = `${code}*`;
      seen.add(code);
      return toCaseloadEntry(p, code);
    });
  }, [store.patients]);
  const activeRisk = active ? riskFor(fieldState) : null;
  const setHospitalId = useCallback((hospitalId: string) => {
    const id = activeIdRef.current; if (!id) return;
    setStore((prev) => ({ ...prev, patients: prev.patients.map((p) => (p.id === id ? { ...p, hospitalId, updatedAt: new Date().toISOString() } : p)) }));
  }, []);
  const clinic = useMemo(() => ({ settings, active, setHospitalId }), [settings, active, setHospitalId]);

  const togglePrescribedExercise = (exerciseId: string) => {
    setPrescribedExerciseIds((current) => {
      if (current.includes(exerciseId)) {
        const next = current.filter((id) => id !== exerciseId);
        if (selectedExerciseId === exerciseId && next.length) setSelectedExerciseId(next[0]);
        return next;
      }

      return [...current, exerciseId];
    });
  };

  return (
    <ClinicContext.Provider value={clinic}>
    <div className="deglutech-shell" style={styles.appShell}>
      <aside className="deglutech-sidebar" style={styles.sidebar}>
        <div style={styles.brandBlock}>
          <DegluTechLogo size={46} />
          <div>
            <h1 style={styles.brandTitle}>DegluTech</h1>
            <p style={styles.brandSub}>HNC SLP Rehabilitation</p>
          </div>
        </div>

        <div style={styles.patientMini}>
          {active ? <>
            <div style={styles.patientName}>{patientLabel(active)}{active.demo ? ' (demo)' : ''}</div>
            <div style={styles.patientMeta}>{[active.hospitalId, active.studyId].filter(Boolean).join(' · ') || 'No ID recorded'}</div>
            {activeRisk && fieldState.aspirationRisk && <FloatingBadge tone={activeRisk} style={{ marginTop: 10 }}>
              {activeRisk.toUpperCase()} RISK
            </FloatingBadge>}
          </> : <div style={styles.patientName}>No patient open</div>}
          <button type="button" className="sidebar-switch" onClick={() => showView('patients')}>{active ? 'Switch or add patient' : 'Add or open a patient'}</button>
        </div>

        <nav className="deglutech-nav-list" style={styles.navList}>
          <button type="button" aria-current={view === 'patients' ? 'page' : undefined} onClick={() => showView('patients')}
            style={{ ...styles.navButton, ...(view === 'patients' ? styles.navButtonActive : {}), borderLeftColor: view === 'patients' ? '#f4b8a6' : 'transparent' }}>
            <Users size={16} /><span style={styles.navLabel}>Patients</span><span style={styles.navIndex}>{store.patients.length}</span>
          </button>
          {active && <button type="button" aria-current={view === 'files' ? 'page' : undefined} onClick={() => showView('files')}
            style={{ ...styles.navButton, ...(view === 'files' ? styles.navButtonActive : {}), borderLeftColor: view === 'files' ? '#f4b8a6' : 'transparent' }}>
            <Paperclip size={16} /><span style={styles.navLabel}>Files and reports</span><span style={styles.navIndex} />
          </button>}
          {['Triage', 'Intake', 'Assessment', 'Synthesis', 'Plan'].map(group => {
            const members = HNC_CLINICAL_SECTIONS.filter(section => sectionGroupFor(section.id) === group);
            const expanded = expandedGroups.includes(group);
            const filled = members.filter(section => sectionReadiness.find(item => item.id === section.id)?.status === 'complete').length;
            return <div className="nav-accordion" key={group}>
              <button type="button" className="nav-accordion-trigger" aria-expanded={expanded} aria-controls={`nav-${group}`}
                onClick={() => setExpandedGroups(previous => expanded ? previous.filter(item => item !== group) : [...previous, group])}>
                <span>{group}</span><small>{filled}/{members.length} filled</small><ChevronDown size={15} className={expanded ? 'is-expanded' : ''} />
              </button>
              <div id={`nav-${group}`} hidden={!expanded}>
                {members.map(section => {
                  const Icon = sectionIcons[section.id];
                  const isActive = view === 'workspace' && !toolSuiteOpen && activeSectionId === section.id;
                  const readiness = sectionReadiness.find(item => item.id === section.id);
                  return <button key={section.id} type="button" aria-current={isActive ? 'page' : undefined}
                    onClick={() => navigateToSection(section.id)}
                    style={{ ...styles.navButton, ...(isActive ? styles.navButtonActive : {}), borderLeftColor: isActive ? '#79e0c7' : 'transparent' }}>
                    <Icon size={16} /><span style={styles.navLabel}>{section.label}</span>
                    {readiness?.status === 'complete' ? <CheckCircle2 className="nav-complete-icon" size={15} color="#8ce5c6" aria-label="All fields filled" /> : <span style={styles.navIndex}>{section.order}</span>}
                  </button>;
                })}
                {group === 'Assessment' && <button type="button" onClick={openToolSuite} aria-current={toolSuiteOpen && view === 'workspace' ? 'page' : undefined}
                  style={{ ...styles.navButton, ...(toolSuiteOpen && view === 'workspace' ? styles.navButtonActive : {}) }}>
                  <ClipboardList size={16} /><span style={styles.navLabel}>Clinical tool suite</span><span style={styles.navIndex}>T</span>
                </button>}
              </div>
            </div>;
          })}
          <div style={styles.navGroup}>Clinic</div>
          <button type="button" aria-current={view === 'settings' ? 'page' : undefined} onClick={() => showView('settings')}
            style={{ ...styles.navButton, ...(view === 'settings' ? styles.navButtonActive : {}), borderLeftColor: view === 'settings' ? '#f4b8a6' : 'transparent' }}>
            <SettingsIcon size={16} /><span style={styles.navLabel}>Settings</span><span style={styles.navIndex} />
          </button>
        </nav>
      </aside>

      <main className="deglutech-main" data-view={view} data-section={shownId} style={styles.main}>
        {view === 'workspace' && active?.demo && <div className="demo-notice">Demo patient: example data for teaching. Remove demo patients in Settings.</div>}
        <label className="mobile-section-select">
          <span>Clinical section</span>
          <select value={view !== 'workspace' ? `__${view}` : toolSuiteOpen ? '__tools' : activeSectionId} onChange={(event) => { const v = event.target.value; if (v === '__tools') openToolSuite(); else if (v === '__patients' || v === '__settings' || v === '__files') showView(v.slice(2) as 'patients' | 'settings' | 'files'); else navigateToSection(v as HncSectionId); }}>
            <option value="__patients">Patients ({store.patients.length})</option>
            {active && <option value="__files">Files and reports</option>}
            {HNC_CLINICAL_SECTIONS.map((section) => <React.Fragment key={section.id}><option value={section.id}>{section.order}. {section.label}</option>{section.id === 'instrumental' && <option value="__tools">Clinical tool suite</option>}</React.Fragment>)}
            <option value="__settings">Settings</option>
          </select>
        </label>
        <header className="workspace-hero">
          <div className="hero-masthead">
            <span className="hero-product"><Activity size={16} /> DEGLUTECH <span>CLINICAL WORKSPACE</span></span>
            <button className="hero-command" type="button" onClick={() => { setSectionQuery(''); commandDialog.current?.showModal(); commandDialog.current?.querySelector('input')?.focus(); }}><Search size={16} /><span>Jump to a section</span><kbd>Ctrl K</kbd></button>
          </div>
          <div className="hero-content">
            <div className="hero-copy">
              <p className="hero-breadcrumb">HEAD & NECK REHABILITATION <span>/</span> {view === 'workspace' ? toolSuiteOpen ? 'CLINICAL TOOLS' : sectionGroupFor(activeSectionId).toUpperCase() : 'CLINIC'}</p>
              <h2><ThemeHeading text={view === 'patients' ? 'Care starts with connection.' : view === 'files' ? 'Every report, in one place.' : view === 'settings' ? 'Your practice. Your workspace.' : toolSuiteOpen ? 'Precision at the point of care.' : activeSectionId === 'command' ? 'A clearer view of care.' : activeSectionId === 'report' ? 'From clinical insight to care.' : activeSection.label} /></h2>
              <p className="hero-description">{view === 'patients' ? 'Open a patient chart and bring every stage of rehabilitation together.' : view === 'files' ? 'Attach discharge summaries, swallow study reports and photos, then review the values DegluTech finds before they enter the chart.' : view === 'settings' ? 'Manage your clinic identity, clinician profiles and device backups.' : toolSuiteOpen ? 'Clinical assessment tools, recorded findings and longitudinal measures in one place.' : activeSectionId === 'report' ? 'Review the complete picture. Document your judgement. Prepare the next step.' : activeSectionId === 'command' ? 'Assessment, rehabilitation and meaningful progress. One connected clinical workflow.' : activeSection.purpose}</p>
              <div className="hero-context">
                <span><UserRound size={15} />{active ? patientLabel(active) : 'No patient selected'}</span>
                {view === 'workspace' && <span><ClipboardCheck size={15} />{toolSuiteOpen ? 'Clinical tool suite' : `Section ${activeSectionIndex + 1} / 13 · ${activeSection.shortLabel}`}</span>}
                <span className="hero-local"><span /> Device workspace</span>
              </div>
            </div>
            {view === 'workspace' && <div className="hero-progress-card">
              <div className="hero-progress-ring" style={{ background: `conic-gradient(#ffad73 ${completion}%, #45637c 0)` }} role="progressbar" aria-label="Recorded field completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}><span>{completion}<small>%</small></span></div>
              <div><strong>Chart completion</strong><p>{sectionReadiness.filter(item => item.status === 'complete').length} of {sectionReadiness.length} sections filled</p><small>Clinician review required</small></div>
            </div>}
          </div>
          <div className="hero-toolbar">
            <span className="hero-save-status" role="status"><span className={storedAt.startsWith('Not saved') ? 'save-dot-error' : 'save-dot'} />{storedAt}</span>
            <div className="hero-toolbar-actions">
              {view === 'workspace' && <><button type="button" className="hero-secondary" onClick={saveSession}><Save size={15} /> Save session</button><button type="button" className="hero-primary" onClick={() => activeSectionId === 'report' && !toolSuiteOpen ? document.getElementById('export-diagnostic-report')?.click() : navigateToSection('report')}>{activeSectionId === 'report' && !toolSuiteOpen ? <Download size={16} /> : <ArrowUpRight size={16} />}{activeSectionId === 'report' && !toolSuiteOpen ? 'Export diagnostic report' : 'Review report'}</button></>}
              {view !== 'workspace' && <button type="button" className="hero-primary" onClick={() => active ? navigateToSection('command') : showView('patients')}>{active ? 'Open active chart' : 'Patient workspace'}<ArrowUpRight size={16} /></button>}
            </div>
          </div>
        </header>
        <dialog className="section-command-dialog" ref={commandDialog} aria-labelledby="command-title">
          <div className="command-dialog-heading"><h2 id="command-title"><Command size={20} /> Navigate workspace</h2><button type="button" aria-label="Close section search" onClick={() => commandDialog.current?.close()}><X size={20} /></button></div>
          <label className="command-search"><Search size={19} /><input autoFocus placeholder="Find a section or clinical tool…" aria-label="Find a clinical section" value={sectionQuery} onChange={event => setSectionQuery(event.target.value)} /></label>
          <div className="command-results">
            {HNC_CLINICAL_SECTIONS.filter(section => `${section.label} ${section.purpose}`.toLowerCase().includes(sectionQuery.toLowerCase())).map(section => {
              const Icon = sectionIcons[section.id];
              return <button type="button" key={section.id} onClick={() => { navigateToSection(section.id); commandDialog.current?.close(); }}><Icon size={19} /><span><strong>{section.label}</strong><small>{sectionGroupFor(section.id)} · Section {section.order}</small></span><ArrowUpRight size={16} /></button>;
            })}
            {'clinical tools tool suite assessment measures'.includes(sectionQuery.toLowerCase()) && <button type="button" onClick={() => { openToolSuite(); commandDialog.current?.close(); }}><ClipboardList size={19} /><span><strong>Clinical tool suite</strong><small>Assessment tools and outcome measures</small></span><ArrowUpRight size={16} /></button>}
            {sectionQuery && !HNC_CLINICAL_SECTIONS.some(section => `${section.label} ${section.purpose}`.toLowerCase().includes(sectionQuery.toLowerCase())) && !'clinical tools tool suite assessment measures'.includes(sectionQuery.toLowerCase()) && <p className="command-empty">No matching sections. Try “swallow”, “report” or “tools”.</p>}
          </div><p className="command-hint">Tab to move · Enter to open · Esc to close</p>
        </dialog>

        <WorkspaceNotice />

        {view === 'patients' && (
          <PatientManager store={store} setStore={setStore} onOpen={openPatient} onSettings={() => showView('settings')} />
        )}
        {view === 'files' && active && (
          <section className="pf-page" aria-label="Files and reports">
            <p className="pm-hint">Add discharge summaries, oncology and radiotherapy notes, VFSS/FEES reports, Praat voice reports, photos of case sheets, images and swallow videos for {patientLabel(active)}. DegluTech reads typed text and photos on this device and suggests values for the chart; you choose what is added.</p>
            <PatientFiles patient={active} fieldState={fieldState} setFieldState={setFieldState} onHospitalId={setHospitalId} />
          </section>
        )}
        {view === 'settings' && (
          <ClinicSettingsPanel settings={settings} setSettings={setSettings} store={store} setStore={setStore} />
        )}

        {view === 'workspace' && active && <>
        {shownId !== 'command' && shownId !== 'tools' && (
          <SectionNavigator
            activeSection={activeSection}
            activeSectionIndex={activeSectionIndex}
            previousSection={previousSection}
            nextSection={nextSection}
            onJump={navigateToSection}
          />
        )}

        {shownId === 'command' && (
          <>
          <section className="workspace-overview" aria-labelledby="overview-title">
            <div className="overview-heading">
              <div><p className="overview-eyebrow">HEAD AND NECK REHABILITATION</p><h3 id="overview-title">Clinical workspace</h3><p>Move from assessment to rehabilitation planning and reporting.</p></div>
              <span className="overview-local">Local draft</span>
            </div>
            <div className="overview-actions">
              {([
                ['demographics', 'Referral and patient details'],
                ['swallow', 'Clinical swallowing assessment'],
                ['exercise', 'Prescribe and review exercises'],
                ['report', 'Review and export the clinical report'],
              ] as [HncSectionId, string][]).map(([id, description]) => {
                const section = HNC_CLINICAL_SECTIONS.find((item) => item.id === id)!;
                const Icon = sectionIcons[id];
                return <button key={id} type="button" onClick={() => navigateToSection(id)}><span className="overview-action-icon"><Icon size={19} /></span><span><strong>{section.shortLabel}</strong><small>{description}</small></span><ChevronRight size={17} /></button>;
              })}
            </div>
          </section>
          <ClinicianDashboard
            completion={completion}
            patients={caseload}
            activeRecordId={active.id}
            savedAt={savedAt}
            onJump={navigateToSection}
            onOpenPatient={openPatient}
            onAddPatient={() => showView('patients')}
          />
          </>
        )}

        {shownId !== 'command' && shownId !== 'exercise' && shownId !== 'patient' && shownId !== 'report' && shownId !== 'tools' && (
          <SectionWorkspace
            section={activeSection}
            fieldState={fieldState}
            setFieldState={setFieldState}
          />
        )}

        {shownId === 'exercise' && (
          <><PrescriptionRelease state={fieldState} ids={prescribedExerciseIds} update={patch => setFieldState(prev => ({ ...prev, ...patch }))} /><ExerciseCatalogue /><ExercisePrescription
            selectedExercise={selectedExercise}
            selectedExerciseId={selectedExerciseId}
            setSelectedExerciseId={setSelectedExerciseId}
            patientLanguage={patientLanguage}
            setPatientLanguage={setPatientLanguage}
            prescribedExerciseIds={prescribedExerciseIds}
            onTogglePrescribedExercise={togglePrescribedExercise}
            storageReady={storageReady}
            storedAt={storedAt}
          /></>
        )}

        {shownId === 'patient' && (
          <PatientPortalPreview
            fieldState={fieldState}
            update={patch => setFieldState(prev => ({ ...prev, ...patch }))}
            selectedExercise={selectedExercise}
            setSelectedExerciseId={setSelectedExerciseId}
            prescribedExerciseIds={prescribedExerciseIds}
            patientLanguage={patientLanguage}
            setActiveSectionId={navigateToSection}
          />
        )}

        {shownId === 'tools' && (
          <ClinicalToolSuite
            fieldState={fieldState}
            update={patch => setFieldState(prev => ({ ...prev, ...patch }))}
            onOpenSection={navigateToSection}
            patientFallbackId={patientCode(active)}
          />
        )}

        {shownId === 'report' && (
          <ReportErrorBoundary>
            <ReportWorkspace
              fieldState={fieldState}
              setFieldState={setFieldState}
              completion={completion}
              onJump={navigateToSection}
            />
          </ReportErrorBoundary>
        )}

        {shownId !== 'command' && shownId !== 'tools' && (
          <SectionPager
            previousSection={previousSection}
            nextSection={nextSection}
            onJump={navigateToSection}
          />
        )}
        </>}

        <footer style={styles.footer}>
          Team: Mr. Prasanna Hegde, Ms. Priyanka Nayak, Mr. Hemaraja Nayaka.S, Mr. Sumanth A V, Mr. Joju Joseph
          <span className="footer-docs"> · <a href="downloads/deglutech-user-manual.pdf" target="_blank" rel="noopener">User manual</a> · <a href="downloads/deglutech-quick-start.pdf" target="_blank" rel="noopener">Quick start</a></span>
        </footer>
      </main>
    </div>
    </ClinicContext.Provider>
  );
};

function ThemeHeading({ text }: { text: string }) {
  const space = text.indexOf(' ');
  return space < 0 ? <span>{text}</span> : <><span>{text.slice(0, space)}</span>{text.slice(space)}</>;
}

function SectionNavigator({
  activeSection,
  activeSectionIndex,
  previousSection,
  nextSection,
  onJump,
}: {
  activeSection: ClinicalSection;
  activeSectionIndex: number;
  previousSection?: ClinicalSection;
  nextSection?: ClinicalSection;
  onJump: (section: HncSectionId) => void;
}) {
  const ActiveIcon = sectionIcons[activeSection.id];

  return (
    <section className="deglutech-workflow-nav" style={styles.workflowNav} aria-label="Clinical section navigation">
      <div className="deglutech-workflow-header" style={styles.workflowNavHeader}>
        <div className="deglutech-workflow-current" style={styles.workflowCurrent}>
          <div style={{ ...styles.workflowCurrentIcon, background: activeSection.accent }}>
            <ActiveIcon size={19} />
          </div>
          <div>
            <p style={styles.overline}>
              Section {activeSectionIndex + 1} of {HNC_CLINICAL_SECTIONS.length}
            </p>
            <h3 style={styles.workflowCurrentTitle}>{activeSection.shortLabel}</h3>
            <p style={styles.workflowCurrentText}>{activeSection.purpose}</p>
          </div>
        </div>

        <div className="deglutech-workflow-controls" style={styles.workflowControls}>
          <button
            type="button"
            onClick={() => previousSection && onJump(previousSection.id)}
            disabled={!previousSection}
            style={previousSection ? styles.workflowButton : styles.workflowButtonDisabled}
          >
            <ChevronLeft size={17} />
            <span style={styles.workflowButtonText}>
              <span>Previous</span>
              <strong>{previousSection?.shortLabel ?? 'Start'}</strong>
            </span>
          </button>
          <button
            type="button"
            onClick={() => nextSection && onJump(nextSection.id)}
            disabled={!nextSection}
            style={nextSection ? styles.workflowButtonPrimary : styles.workflowButtonDisabled}
          >
            <span style={styles.workflowButtonText}>
              <span>Next</span>
              <strong>{nextSection?.shortLabel ?? 'Complete'}</strong>
            </span>
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <details className="workflow-map"><summary><Map size={15} /> Clinical workflow map</summary>
      <div style={styles.workflowRail}>
        {HNC_CLINICAL_SECTIONS.map((section) => {
          const isActive = section.id === activeSection.id;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onJump(section.id)}
              aria-current={isActive ? 'step' : undefined}
              style={{
                ...styles.workflowStep,
                ...(isActive ? styles.workflowStepActive : {}),
                borderColor: isActive ? section.accent : '#dce5df',
                background: isActive ? `${section.accent}12` : '#ffffff',
              }}
            >
              <span
                style={{
                  ...styles.workflowStepNumber,
                  background: isActive ? section.accent : '#dce5df',
                  color: isActive ? '#ffffff' : '#475d70',
                }}
              >
                {section.order}
              </span>
              <span style={styles.workflowStepLabel}>{section.shortLabel}</span>
            </button>
          );
        })}
      </div>
      </details>
    </section>
  );
}

function SectionPager({
  previousSection,
  nextSection,
  onJump,
}: {
  previousSection?: ClinicalSection;
  nextSection?: ClinicalSection;
  onJump: (section: HncSectionId) => void;
}) {
  return (
    <section className="deglutech-section-pager" style={styles.sectionPager} aria-label="Move between clinical sections">
      <button
        type="button"
        disabled={!previousSection}
        onClick={() => previousSection && onJump(previousSection.id)}
        style={previousSection ? styles.pagerButton : styles.pagerButtonDisabled}
      >
        <ChevronLeft size={18} />
        <span style={styles.workflowButtonText}>
          <span>Back</span>
          <strong>{previousSection?.label ?? 'First section'}</strong>
        </span>
      </button>

      <button
        type="button"
        disabled={!nextSection}
        onClick={() => nextSection && onJump(nextSection.id)}
        style={nextSection ? styles.pagerButtonPrimary : styles.pagerButtonDisabled}
      >
        <span style={styles.workflowButtonText}>
          <span>Continue</span>
          <strong>{nextSection?.label ?? 'Workflow complete'}</strong>
        </span>
        <ChevronRight size={18} />
      </button>
    </section>
  );
}

/** "Fill this section from a report" panel, using the open patient from context. */
function SectionFiles({ sectionId, fieldState, setFieldState }: { sectionId: HncSectionId; fieldState: FieldState; setFieldState: React.Dispatch<React.SetStateAction<FieldState>> }) {
  const { active, setHospitalId } = useClinic();
  if (!active || sectionId === 'command') return null;
  return <PatientFiles patient={active} fieldState={fieldState} setFieldState={setFieldState} onHospitalId={setHospitalId ?? (() => undefined)} focusSection={sectionId} />;
}

function SectionWorkspace({ section, fieldState, setFieldState }: {
  section: ClinicalSection;
  fieldState: FieldState;
  setFieldState: React.Dispatch<React.SetStateAction<FieldState>>;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const isRecorded = (id: string) => {
    const value = fieldState[id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
  };
  const total = section.blocks.reduce((n, block) => n + block.fields.length, 0);
  const recorded = section.blocks.reduce((n, block) => n + block.fields.filter(field => isRecorded(field.id)).length, 0);
  return <div className="dt-section-workspace" style={styles.workspaceGrid}>
    <div className="dt-section-status"><span><ClipboardCheck size={18} /> Clinical documentation</span><strong>{recorded} / {total} fields recorded</strong><small>Recording progress · clinician review required</small></div>
    <nav className="dt-block-index" aria-label={`${section.shortLabel} subsections`}>
      <span className="dt-index-label">IN THIS SECTION</span>
      {section.blocks.map((block, index) => <button key={block.title} type="button" onClick={() => {
        setCollapsed(previous => previous.filter(title => title !== block.title));
        document.getElementById(`block-${section.id}-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}><span>{String(index + 1).padStart(2, '0')}</span>{block.title}</button>)}
    </nav>
    <SectionFiles sectionId={section.id} fieldState={fieldState} setFieldState={setFieldState} />
    <div className="deglutech-block-grid" style={styles.blockGrid}>
      <ClinicalMeasures section={section.id} values={fieldState} />
      {section.blocks.map((block, index) => {
        const filled = block.fields.filter(field => isRecorded(field.id)).length;
        const isCollapsed = collapsed.includes(block.title);
        return <section key={block.title} id={`block-${section.id}-${index}`} className="dt-panel dt-form-panel">
          <div className="dt-panel-heading">
            <span className="dt-block-number">{String(index + 1).padStart(2, '0')}</span>
            <div><h3>{block.title}</h3><p>{block.description}</p></div>
            <div className="dt-block-actions"><span className={filled === block.fields.length ? 'dt-count is-filled' : 'dt-count'}>{filled}/{block.fields.length} recorded</span>
              <button type="button" className="dt-collapse" aria-expanded={!isCollapsed} aria-controls={`fields-${section.id}-${index}`} aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${block.title}`}
                onClick={() => setCollapsed(previous => isCollapsed ? previous.filter(title => title !== block.title) : [...previous, block.title])}><ChevronDown size={18} className={isCollapsed ? '' : 'is-expanded'} /></button></div>
          </div>
          <div className="deglutech-form-grid" id={`fields-${section.id}-${index}`} hidden={isCollapsed} style={styles.formGrid}>
            {block.fields.map(field => <FieldControl key={field.id} field={field} value={fieldState[field.id]}
              onChange={value => setFieldState(previous => ({ ...previous, [field.id]: value }))} />)}
          </div>
        </section>;
      })}
    </div>
    <section className="dt-panel dt-outputs"><div className="dt-panel-heading"><ClipboardCheck size={19} /><div><h3>Documentation checklist</h3><p>Expected outputs for this section. Review clinically before completing the report.</p></div></div>
      <div style={styles.outputGrid}>{section.outputs.map(output => <span className="dt-output-item" key={output}><ClipboardCheck size={15} />{output}</span>)}</div>
    </section>
  </div>;
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
      <div className="dt-field dt-field-wide" style={styles.fieldWide} role="group" aria-label={field.label}>
        <span className="dt-field-label" style={styles.fieldLabel}>{field.label}</span>
        <div className="dt-choice-group" style={styles.chipGroup}>
          {(field.options ?? []).map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={isSelected}
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
        {field.helper && <span className="dt-field-helper" style={styles.fieldHelper}>{field.helper}</span>}
      </div>
    );
  }

  if (field.kind === 'textarea') {
    return (
      <label className="dt-field dt-field-wide" style={styles.fieldWide}>
        <span className="dt-field-label" style={styles.fieldLabel}>{field.label}</span>
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          style={styles.textarea}
        />
        {field.helper && <span className="dt-field-helper" style={styles.fieldHelper}>{field.helper}</span>}
      </label>
    );
  }

  if (field.kind === 'select') {
    return (
      <label className="dt-field" style={styles.field}>
        <span className="dt-field-label" style={styles.fieldLabel}>{field.label}</span>
        <select
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          style={styles.input}
        >
          <option value="">Select an option</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {field.helper && <span className="dt-field-helper" style={styles.fieldHelper}>{field.helper}</span>}
      </label>
    );
  }

  if (field.kind === 'scale') {
    return (
      <div className="dt-field" style={styles.field} role="group" aria-label={field.label}>
        <span className="dt-field-label" style={styles.fieldLabel}>{field.label}</span>
        <div className="dt-scale-group" style={styles.scaleRow}>
          {(field.id === 'painScore' ? Array.from({ length: 11 }, (_, i) => String(i)) : ['0', '1', '2', '3', '4']).map((score) => (
            <button
              key={score}
              type="button"
              aria-pressed={value === score}
              onClick={() => onChange(score)}
              style={value === score ? styles.scaleButtonActive : styles.scaleButton}
            >
              {score}
            </button>
          ))}
        </div>
        {field.helper && <span className="dt-field-helper" style={styles.fieldHelper}>{field.helper}</span>}
      </div>
    );
  }

  const bounds: Record<string, { min: number; max: number }> = {
    eat10: { min: 0, max: 40 }, pas: { min: 1, max: 8 },
    intelligibility: { min: 0, max: 100 },
  };
  const range = field.min !== undefined && field.max !== undefined ? { min: field.min, max: field.max } : bounds[field.id];
  const numberValue = typeof value === 'string' && value !== '' ? Number(value) : undefined;
  const invalid = range && numberValue !== undefined && (numberValue < range.min || numberValue > range.max);
  return (
    <label className="dt-field" style={styles.field}>
      <span className="dt-field-label" style={styles.fieldLabel}>{field.label}</span>
      <input
        type={field.kind === 'number' || field.kind === 'metric' ? 'number' : field.kind === 'date' ? 'date' : 'text'}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
        min={range?.min}
        max={range?.max}
        step={field.step ?? (field.kind === 'metric' ? 'any' : undefined)}
        aria-invalid={invalid || undefined}
      />
      {invalid && <span role="alert" style={{ color: '#a12622', fontSize: 12 }}>Enter a value from {range.min} to {range.max}.</span>}
      {field.unit && <span className="dt-field-helper" style={styles.fieldHelper}>Unit: {field.unit}</span>}
      {field.helper && <span className="dt-field-helper" style={styles.fieldHelper}>{field.helper}</span>}
    </label>
  );
}

function ExercisePrescription({
  selectedExercise,
  selectedExerciseId,
  setSelectedExerciseId,
  patientLanguage,
  setPatientLanguage,
  prescribedExerciseIds,
  onTogglePrescribedExercise,
  storageReady,
  storedAt,
}: {
  selectedExercise: ExerciseProtocol;
  selectedExerciseId: string;
  setSelectedExerciseId: (id: string) => void;
  patientLanguage: ExerciseLanguageCode;
  setPatientLanguage: (language: ExerciseLanguageCode) => void;
  prescribedExerciseIds: string[];
  onTogglePrescribedExercise: (id: string) => void;
  storageReady: boolean;
  storedAt: string;
}) {
  const localizedBundle = exerciseTranslations[patientLanguage];
  const localizedExercise = localizedBundle.exercises[selectedExercise.id] ?? exerciseTranslations.en.exercises[selectedExercise.id];
  const prescribedExercises = HNC_EXERCISE_LIBRARY.filter((exercise) => prescribedExerciseIds.includes(exercise.id));

  return (
    <div className="dt-workspace-grid" style={styles.workspaceGrid}>
      <SectionHeader
        eyebrow="Exercise prescription"
        title="Illustrated home program with clinical dosage and safety stop rules."
        icon={<Dumbbell size={20} />}
        accent="#2f7a5c"
        action={<FloatingBadge tone="neutral">Clinician review required</FloatingBadge>}
      />

      <LanguageSelector selectedLanguage={patientLanguage} onSelect={setPatientLanguage} />

      <ClinicianPlanControl
        prescribedExerciseIds={prescribedExerciseIds}
        prescribedExercises={prescribedExercises}
        selectedExerciseId={selectedExerciseId}
        onSelectExercise={setSelectedExerciseId}
        onToggleExercise={onTogglePrescribedExercise}
        storageReady={storageReady}
        storedAt={storedAt}
      />

      <div className="deglutech-exercise-layout" style={styles.exerciseLayout}>
        <section className="dt-exercise-menu" aria-label="Exercise library" style={styles.exerciseMenu}>
          {HNC_EXERCISE_LIBRARY.map((exercise) => {
            const isPatientVisible = prescribedExerciseIds.includes(exercise.id);

            return (
              <button
                key={exercise.id}
                type="button"
                onClick={() => setSelectedExerciseId(exercise.id)}
                aria-pressed={selectedExerciseId === exercise.id}
                style={selectedExerciseId === exercise.id ? styles.exerciseMenuItemActive : styles.exerciseMenuItem}
              >
                <span style={styles.exerciseName}>{exercise.name}</span>
                <span style={styles.exerciseMeta}>{exercise.phase} / {exercise.category}</span>
                <span style={isPatientVisible ? styles.patientVisiblePill : styles.clinicianOnlyPill}>
                  {isPatientVisible ? 'Patient phone' : 'Clinician library'}
                </span>
              </button>
            );
          })}
        </section>

        <section className="dt-panel" style={styles.panel}>
          <div className="deglutech-exercise-header" style={styles.exerciseHeaderBlock}>
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

          <RegimenSopCard exercise={selectedExercise} />

          <ExerciseVisual exerciseId={selectedExercise.id} language={patientLanguage} label={localizedExercise.title} />

          <ExercisePanels
            key={`${selectedExercise.id}-${patientLanguage}`}
            exercise={selectedExercise}
            steps={localizedExercise.steps}
            stepLabel={localizedBundle.stepLabel}
          />

          <div className="deglutech-prescription-grid" style={styles.prescriptionGrid}>
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

function RegimenSopCard({ exercise }: { exercise: ExerciseProtocol }) {
  const regimenRows = [
    ['Frequency', exercise.regimen.frequency],
    ['Sets and reps', exercise.regimen.setsAndReps],
    ['Hold time', exercise.regimen.holdTime],
    ['Rest period', exercise.regimen.restPeriod],
    ['Session length', exercise.regimen.sessionDuration],
    ['Program duration', exercise.regimen.programDuration],
    ['Clinical review', exercise.regimen.reviewCadence],
    ['Supervision', exercise.regimen.supervision],
  ];

  return (
    <section className="dt-regimen-panel" style={styles.regimenPanel}>
      <div style={styles.regimenHeader}>
        <div>
          <p style={styles.overline}>Standard operating protocol</p>
          <h4 style={styles.regimenTitle}>Therapy duration, frequency, progression, and stop rules</h4>
        </div>
        <div style={styles.adherenceBadge}>{exercise.regimen.adherenceTarget}</div>
      </div>

      <div className="deglutech-regimen-grid" style={styles.regimenGrid}>
        {regimenRows.map(([label, value]) => (
          <div key={label} style={styles.regimenItem}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="deglutech-regimen-two-column" style={styles.regimenTwoColumn}>
        <div style={styles.regimenCallout}>
          <span>Progression rule</span>
          <strong>{exercise.regimen.progressionRule}</strong>
        </div>
        <div style={styles.stopRuleBox}>
          <span>Stop and contact clinician if</span>
          <div style={styles.stopRuleList}>
            {exercise.regimen.stopRules.map((rule) => (
              <strong key={rule}>{rule}</strong>
            ))}
          </div>
        </div>
      </div>

      <p style={styles.protocolBasis}>{exercise.regimen.protocolBasis}</p>
    </section>
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

function ClinicianPlanControl({
  prescribedExerciseIds,
  prescribedExercises,
  selectedExerciseId,
  onSelectExercise,
  onToggleExercise,
  storageReady,
  storedAt,
}: {
  prescribedExerciseIds: string[];
  prescribedExercises: ExerciseProtocol[];
  selectedExerciseId: string;
  onSelectExercise: (id: string) => void;
  onToggleExercise: (id: string) => void;
  storageReady: boolean;
  storedAt: string;
}) {
  return (
    <section style={styles.clinicianPlanPanel}>
      <div className="deglutech-clinician-plan-header" style={styles.clinicianPlanHeader}>
        <div>
          <p style={styles.overline}>Clinician controlled prescription</p>
          <h3 style={styles.clinicianPlanTitle}>Choose what appears in the patient phone exercise module.</h3>
          <p style={styles.workflowCurrentText}>
            Only selected exercises are visible to the patient. Keep the clinical library available here for review, but publish a small, safe daily queue.
          </p>
        </div>
        <div style={styles.storageStatusCard}>
          <span style={styles.storageLabel}>Data storage</span>
          <strong>{storageReady ? 'Local draft active' : 'Restoring draft'}</strong>
          <p style={styles.storageText}>{storedAt}</p>
          <p style={styles.storageText}>This prototype stores the working plan on this device. No cloud patient database is enabled yet.</p>
        </div>
      </div>

      <div className="deglutech-prescribed-summary" style={styles.prescribedSummary}>
        <div style={styles.prescribedCount}>
          <strong>{prescribedExercises.length}</strong>
          <span>patient-visible exercises</span>
        </div>
        <div style={styles.prescribedQueue}>
          {prescribedExercises.map((exercise) => (
            <button
              key={exercise.id}
              type="button"
              onClick={() => onSelectExercise(exercise.id)}
              style={selectedExerciseId === exercise.id ? styles.queueChipActive : styles.queueChip}
            >
              {exercise.name}
            </button>
          ))}
        </div>
      </div>

      <div className="deglutech-exercise-toggle-grid" style={styles.exerciseToggleGrid}>
        {HNC_EXERCISE_LIBRARY.map((exercise) => {
          const isChecked = prescribedExerciseIds.includes(exercise.id);

          return (
            <label key={exercise.id} style={isChecked ? styles.exerciseToggleActive : styles.exerciseToggle}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleExercise(exercise.id)}
                style={styles.exerciseToggleInput}
              />
              <span style={styles.exerciseToggleText}>
                <strong>{exercise.name}</strong>
                <span>{exercise.category} / {exercise.phase}</span>
              </span>
              <span style={isChecked ? styles.patientVisiblePill : styles.clinicianOnlyPill}>
                {isChecked ? 'Phone on' : 'Hidden'}
              </span>
            </label>
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
  const [activeStep, setActiveStep] = useState(0);
  return (
    <section className="exercise-guide" aria-label={`${exercise.name} instructions`}>
      <div className="exercise-guide-heading"><strong>{exercise.name}</strong><span>{stepLabel} {activeStep + 1} / {steps.length}</span></div>
      <div className="exercise-guide-progress" role="group" aria-label="Exercise steps">
        {steps.map((step, index) => (
          <button key={index} type="button" className={index === activeStep ? 'exercise-guide-tab active' : 'exercise-guide-tab'} onClick={() => setActiveStep(index)} aria-current={index === activeStep ? 'step' : undefined}>
            <span>{index + 1}</span><strong>{step.cue}</strong>
          </button>
        ))}
      </div>
      <div className="exercise-guide-content" key={activeStep} aria-live="polite">
        <span className="exercise-guide-number">{String(activeStep + 1).padStart(2, '0')}</span>
        <div><h4>{steps[activeStep].cue}</h4><p>{steps[activeStep].instruction}</p></div>
      </div>
      <div className="exercise-guide-actions">
        <button type="button" onClick={() => setActiveStep(activeStep - 1)} disabled={activeStep === 0}><ChevronLeft size={16} /> Previous</button>
        <button type="button" onClick={() => setActiveStep(activeStep + 1)} disabled={activeStep === steps.length - 1}>Next <ChevronRight size={16} /></button>
      </div>
    </section>
  );
}

function PatientPortalPreview({
  fieldState,
  update,
  selectedExercise,
  setSelectedExerciseId,
  prescribedExerciseIds,
  patientLanguage,
  setActiveSectionId,
}: {
  fieldState: FieldState;
  update: (patch: FieldState) => void;
  selectedExercise: ExerciseProtocol;
  setSelectedExerciseId: (id: string) => void;
  prescribedExerciseIds: string[];
  patientLanguage: ExerciseLanguageCode;
  setActiveSectionId: (id: HncSectionId) => void;
}) {
  const symptoms = Array.isArray(fieldState.symptoms) ? fieldState.symptoms : [];
  const localizedBundle = exerciseTranslations[patientLanguage];
  const prescribedExercises = HNC_EXERCISE_LIBRARY.filter((exercise) => prescribedExerciseIds.includes(exercise.id));
  const patientExercise = prescribedExercises.find((exercise) => exercise.id === selectedExercise.id) ?? prescribedExercises[0];
  const selectedLocalizedExercise = patientExercise && (localizedBundle.exercises[patientExercise.id] ?? exerciseTranslations.en.exercises[patientExercise.id]);

  if (!isReleased(fieldState, prescribedExerciseIds)) return <section className="suite-panel"><h3>No current released prescription</h3><p>The clinician must review healing findings, document clearance and set the individual dose before releasing this plan.</p><button type="button" onClick={() => setActiveSectionId('exercise')}>Review prescription</button></section>;

  return (
    <div className="dt-workspace-grid" style={styles.workspaceGrid}>
      <PatientSessionLog state={fieldState} ids={prescribedExerciseIds} update={update} />
      <SectionHeader
        eyebrow="Patient app surface"
        title="Daily exercise queue, symptom check-in, and caregiver-safe education."
        icon={<Home size={20} />}
        accent="#1f5c4a"
        action={<button type="button" onClick={() => setActiveSectionId('exercise')} style={styles.primaryButton}>
          <Dumbbell size={17} />
          Edit exercises
        </button>}
      />

      <div className="deglutech-patient-portal-grid" style={styles.patientPortalGrid}>
        <section className="deglutech-patient-phone" style={styles.patientPhone}>
          <div style={styles.phoneTop} />
          <h3 style={styles.phoneTitle}>Today&apos;s exercises</h3>
          <p style={styles.phoneSub}>{localizedBundle.nativeName} / {String(fieldState.route || 'Route not recorded')}</p>
          {prescribedExercises.map((exercise) => {
            const localizedExercise = localizedBundle.exercises[exercise.id] ?? exerciseTranslations.en.exercises[exercise.id];

            return (
              <button key={exercise.id} type="button" onClick={() => setSelectedExerciseId(exercise.id)} aria-pressed={patientExercise?.id === exercise.id} style={{ ...styles.homeTask, width: '100%', textAlign: 'left', cursor: 'pointer', border: patientExercise?.id === exercise.id ? '2px solid #1f5c4a' : '1px solid #dce5df' }}>
                <span style={styles.homeCheck} />
                <span>
                  <strong>{localizedExercise.title}</strong>
                  <small style={styles.phoneTaskDose}>{readDoses(fieldState)[exercise.id]?.instructions}</small>
                  <small style={styles.phoneTaskDose}>{readDoses(fieldState)[exercise.id]?.sessionsPerDay} sessions/day</small>
                </span>
              </button>
            );
          })}
          {prescribedExercises.length === 0 && (
            <div style={styles.homeTask}>
              <span style={styles.homeCheck} />
              <span>No phone exercises have been released by the clinician.</span>
            </div>
          )}
          <div style={styles.symptomStrip}>
            {symptoms.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        {patientExercise && selectedLocalizedExercise && <section className="dt-panel" style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <p style={styles.overline}>Patient phone module</p>
              <h3 style={styles.panelTitle}>Clinician-controlled exercise view</h3>
            </div>
            <div style={styles.moduleBadge}>patient-facing</div>
          </div>
          <p style={styles.exerciseText}>{selectedLocalizedExercise.description}</p>
          <div className="patient-safety"><strong>{localizedBundle.safetyTitle}</strong><p>{selectedLocalizedExercise.safety}</p></div>
          <div style={styles.phoneRegimenGrid}>
            <div style={styles.phoneRegimenGridItem}>
              <span>Frequency</span>
              <strong>{readDoses(fieldState)[patientExercise.id]?.sessionsPerDay} sessions/day</strong>
            </div>
            <div style={styles.phoneRegimenGridItem}>
              <span>How much</span>
              <strong>{readDoses(fieldState)[patientExercise.id]?.instructions}</strong>
            </div>
            <div style={styles.phoneRegimenGridItem}>
              <span>Stop and contact plan</span>
              <strong>{String(fieldState.painLimit || '')}</strong>
            </div>
            <div style={styles.phoneRegimenGridItem}>
              <span>Review</span>
              <strong>{String(fieldState.followUp || 'Ask your clinician')}</strong>
            </div>
          </div>
          <ExerciseVisual exerciseId={patientExercise.id} language={patientLanguage} label={selectedLocalizedExercise.title} />
          <ExercisePanels
            key={`${patientExercise.id}-${patientLanguage}`}
            exercise={patientExercise}
            steps={selectedLocalizedExercise.steps}
            stepLabel={localizedBundle.stepLabel}
          />
        </section>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appShell: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '244px minmax(0, 1fr)',
    background: '#f3f6f3',
    color: T.ink1,
    fontFamily: 'var(--sans)',
  },
  sidebar: {
    background: '#173451',
    borderRight: '1px solid #22413a',
    minHeight: '100vh',
    padding: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    boxShadow: 'none',
  },
  brandBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minHeight: '54px',
    marginBottom: 0,
    padding: '10px 12px',
    borderBottom: '1px solid #2b4a41',
  },
  logoMark: {
    width: '42px',
    height: '42px',
    borderRadius: '8px',
    background: '#edf2f7',
    color: '#204a6b',
    display: 'grid',
    placeItems: 'center',
  },
  brandTitle: {
    margin: 0,
    fontSize: '15px',
    lineHeight: 1.1,
    fontWeight: 850,
    letterSpacing: 0,
    color: '#ffffff',
  },
  brandSub: {
    margin: '2px 0 0',
    color: '#a9c0b6',
    fontSize: '10.5px',
    fontWeight: 700,
  },
  patientMini: {
    border: '1px solid #2b4a41',
    borderRadius: '8px',
    padding: '12px',
    margin: '12px',
    background: '#1c3a33',
    boxShadow: 'none',
  },
  patientName: {
    fontWeight: 800,
    fontSize: '14px',
    color: '#ffffff',
  },
  patientMeta: {
    color: '#bfd1c8',
    fontSize: '12px',
    marginTop: '2px',
  },
  riskPill: {
    display: 'inline-flex',
    marginTop: '10px',
    padding: '4px 8px',
    borderRadius: '999px',
    background: '#fbe4dd',
    color: '#b91c1c',
    fontSize: '11px',
    fontWeight: 800,
  },
  navList: {
    display: 'grid',
    gap: '3px',
    padding: '0 8px 12px',
  },
  navGroup: {
    margin: '10px 6px 3px',
    color: '#a3bab0',
    fontSize: '10px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  navButton: {
    width: '100%',
    border: '0',
    borderLeft: '3px solid transparent',
    background: 'transparent',
    display: 'grid',
    gridTemplateColumns: '20px minmax(0, 1fr) 20px',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 9px',
    borderRadius: '7px',
    color: '#c9dad1',
    cursor: 'pointer',
    textAlign: 'left',
    minHeight: '34px',
  },
  navButtonActive: {
    background: '#2b4a41',
    color: '#ffffff',
    fontWeight: 800,
    boxShadow: 'inset 0 0 0 1px rgba(31, 92, 74, 0.12)',
  },
  navLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '12px',
  },
  navIndex: {
    color: '#8fa79d',
    fontSize: '11px',
    textAlign: 'right',
  },
  main: {
    minWidth: 0,
    padding: '16px 18px 22px',
  },
  topbar: {
    minHeight: '54px',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    padding: '10px 14px',
    background: '#ffffff',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    boxShadow: 'none',
  },
  overline: {
    margin: '0 0 4px',
    textTransform: 'uppercase',
    letterSpacing: '0',
    fontSize: '11px',
    color: T.ink3,
    fontWeight: 800,
  },
  pageTitle: {
    margin: 0,
    fontSize: '18px',
    lineHeight: 1.1,
    fontWeight: 850,
  },
  topbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  workflowNav: {
    background: '#ffffff',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '18px',
    display: 'grid',
    gap: '12px',
    boxShadow: 'none',
  },
  workflowNavHeader: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: '16px',
    alignItems: 'center',
  },
  workflowCurrent: {
    display: 'grid',
    gridTemplateColumns: '44px minmax(0, 1fr)',
    gap: '12px',
    alignItems: 'center',
  },
  workflowCurrentIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    color: '#ffffff',
    display: 'grid',
    placeItems: 'center',
    boxShadow: 'none',
  },
  workflowCurrentTitle: {
    margin: 0,
    fontSize: '18px',
    lineHeight: 1.2,
  },
  workflowCurrentText: {
    margin: '5px 0 0',
    color: T.ink2,
    fontSize: '13px',
    lineHeight: 1.45,
    maxWidth: '760px',
  },
  workflowControls: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  workflowButton: {
    minHeight: '44px',
    border: '1px solid #c9d7ce',
    borderRadius: '8px',
    background: '#ffffff',
    color: T.ink1,
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  workflowButtonPrimary: {
    minHeight: '44px',
    border: '1px solid #1f5c4a',
    borderRadius: '8px',
    background: '#204a6b',
    color: '#ffffff',
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  workflowButtonDisabled: {
    minHeight: '44px',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    background: '#f5f8f5',
    color: '#8fa79d',
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'not-allowed',
    textAlign: 'left',
  },
  workflowButtonText: {
    display: 'grid',
    gap: '2px',
    fontSize: '11px',
    fontWeight: 800,
    lineHeight: 1.15,
  },
  workflowRailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    color: T.ink2,
    fontSize: '12px',
    fontWeight: 900,
    textTransform: 'uppercase',
  },
  workflowRail: {
    display: 'grid',
    gridTemplateColumns: 'repeat(13, minmax(86px, 1fr))',
    gap: '7px',
    overflowX: 'auto',
    paddingBottom: '2px',
  },
  workflowStep: {
    minHeight: '64px',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    padding: '8px',
    display: 'grid',
    justifyItems: 'start',
    alignContent: 'center',
    gap: '6px',
    color: '#475d70',
    cursor: 'pointer',
    textAlign: 'left',
  },
  workflowStepActive: {
    boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.04)',
    color: '#173451',
    fontWeight: 900,
  },
  workflowStepNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    fontSize: '11px',
    fontWeight: 900,
  },
  workflowStepLabel: {
    fontSize: '11px',
    lineHeight: 1.2,
    fontWeight: 800,
  },
  sectionPager: {
    marginTop: '18px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
  },
  pagerButton: {
    minHeight: '58px',
    border: '1px solid #c9d7ce',
    borderRadius: '8px',
    background: '#ffffff',
    color: '#173451',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  pagerButtonPrimary: {
    minHeight: '58px',
    border: '1px solid #2f7a5c',
    borderRadius: '8px',
    background: '#2f7a5c',
    color: '#ffffff',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  pagerButtonDisabled: {
    minHeight: '58px',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    background: '#f5f8f5',
    color: '#8fa79d',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'not-allowed',
    textAlign: 'left',
  },
  progressWrap: {
    display: 'grid',
    gap: '5px',
    width: '150px',
  },
  progressText: {
    fontSize: '12px',
    color: '#475d70',
    textAlign: 'right',
  },
  progressTrack: {
    width: '100%',
    height: '7px',
    background: '#dce5df',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#204a6b',
  },
  iconButton: {
    width: '38px',
    height: '38px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: '10px',
    border: '1px solid #c9d7ce',
    background: '#ffffff',
    color: T.ink1,
    cursor: 'pointer',
  },
  workspaceGrid: {
    display: 'grid',
    gap: '16px',
  },
  heroPanel: {
    background: '#ffffff',
    border: '1px solid #dce5df',
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
    color: '#475d70',
  },
  goalList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '14px',
  },
  goalChip: {
    border: '1px solid #c9ddd0',
    background: '#edf2f7',
    color: '#174a3c',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },
  statusPanel: {
    borderRadius: '8px',
    background: '#eef2ef',
    padding: '16px',
    display: 'grid',
    alignContent: 'center',
  },
  largeNumber: {
    fontSize: '42px',
    fontWeight: 900,
    color: '#2f7a5c',
  },
  statusLabel: {
    color: '#475d70',
    fontSize: '13px',
    fontWeight: 700,
  },
  savedLine: {
    color: '#5b6d7c',
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
    border: '1px solid #dce5df',
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
    color: '#5b6d7c',
    fontSize: '12px',
    fontWeight: 700,
  },
  metricValue: {
    color: '#173451',
    fontSize: '24px',
    fontWeight: 900,
    marginTop: '4px',
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    padding: '18px',
    boxShadow: 'none',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  panelTitle: {
    margin: 0,
    fontSize: '18px',
    lineHeight: 1.25,
    fontWeight: 850,
    color: T.ink1,
  },
  alertList: {
    display: 'grid',
    gap: '10px',
  },
  alertRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#475d70',
    fontSize: '14px',
  },
  alertMark: {
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    background: '#a8402b',
  },
  queueList: {
    display: 'grid',
    gap: '8px',
  },
  queueItem: {
    border: '1px solid #dce5df',
    background: '#f5f8f5',
    borderRadius: '12px',
    padding: '11px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    color: '#173451',
    fontWeight: 700,
  },
  platformHub: {
    background: '#ffffff',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    padding: '16px',
    display: 'grid',
    gap: '12px',
  },
  platformGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '10px',
  },
  platformCard: {
    border: '1px solid #dce5df',
    background: '#ffffff',
    borderRadius: '8px',
    padding: '12px',
    minHeight: '154px',
    display: 'grid',
    gridTemplateRows: 'auto 1fr auto',
    gap: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    color: '#173451',
  },
  platformIcon: {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    background: '#edf2f7',
    color: '#204a6b',
    display: 'grid',
    placeItems: 'center',
  },
  platformCopy: {
    display: 'grid',
    gap: '6px',
    color: '#475d70',
    fontSize: '13px',
    lineHeight: 1.35,
  },
  platformFooter: {
    borderTop: '1px solid #dce5df',
    paddingTop: '9px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    color: '#5b6d7c',
    fontSize: '11px',
    fontWeight: 800,
  },
  sectionIntro: {
    background: '#ffffff',
    border: '1px solid #dce5df',
    borderRadius: '12px',
    padding: '18px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
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
    background: '#204a6b',
    padding: '7px 11px',
    fontWeight: 800,
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  blockGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))',
    gap: '16px',
  },
  blockHeaderLine: {
    marginBottom: '12px',
    paddingLeft: '12px',
    borderLeft: '3px solid #1f5c4a',
  },
  blockDescription: {
    margin: '5px 0 0',
    color: '#5b6d7c',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
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
    color: '#475d70',
    fontSize: '12px',
    fontWeight: 800,
  },
  input: {
    width: '100%',
    minHeight: '38px',
    boxSizing: 'border-box',
    border: '1px solid #dce5df',
    borderRadius: '12px',
    padding: '8px 10px',
    fontSize: '14px',
    color: '#173451',
    background: '#f9fbf9',
  },
  textarea: {
    width: '100%',
    minHeight: '86px',
    boxSizing: 'border-box',
    border: '1px solid #dce5df',
    borderRadius: '12px',
    padding: '9px 10px',
    fontSize: '14px',
    color: '#173451',
    background: '#f9fbf9',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  fieldHelper: {
    color: '#5b6d7c',
    fontSize: '11px',
  },
  chipGroup: {
    display: 'flex',
    gap: '7px',
    flexWrap: 'wrap',
  },
  choiceChip: {
    border: '1px solid #dce5df',
    borderRadius: '999px',
    background: '#ffffff',
    color: '#475d70',
    padding: '7px 10px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '12px',
  },
  choiceChipActive: {
    border: '1px solid #1f5c4a',
    borderRadius: '999px',
    background: '#e8f1eb',
    color: '#123b30',
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
    border: '1px solid #c9d7ce',
    borderRadius: '7px',
    background: '#ffffff',
    cursor: 'pointer',
    fontWeight: 800,
  },
  scaleButtonActive: {
    height: '34px',
    border: '1px solid #1f5c4a',
    borderRadius: '7px',
    background: '#204a6b',
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
    background: '#eef2ef',
    color: '#475d70',
    border: '1px solid #dce5df',
    borderRadius: '999px',
    padding: '7px 10px',
    fontSize: '12px',
    fontWeight: 700,
  },
  clinicianPlanPanel: {
    background: '#ffffff',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    padding: '16px',
    display: 'grid',
    gap: '14px',
    boxShadow: 'none',
  },
  clinicianPlanHeader: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(240px, 300px)',
    gap: '16px',
    alignItems: 'start',
  },
  clinicianPlanTitle: {
    margin: 0,
    color: '#173451',
    fontSize: '19px',
    lineHeight: 1.25,
  },
  storageStatusCard: {
    border: '1px solid #c9ddd0',
    background: '#edf2f7',
    borderRadius: '8px',
    padding: '12px',
    display: 'grid',
    gap: '5px',
  },
  storageLabel: {
    color: '#174a3c',
    fontSize: '11px',
    fontWeight: 900,
    textTransform: 'uppercase',
  },
  storageText: {
    margin: 0,
    color: '#475d70',
    fontSize: '12px',
    lineHeight: 1.35,
  },
  prescribedSummary: {
    border: '1px solid #ddefe5',
    background: '#eef5f0',
    borderRadius: '8px',
    padding: '12px',
    display: 'grid',
    gridTemplateColumns: 'minmax(120px, 150px) minmax(0, 1fr)',
    gap: '12px',
    alignItems: 'center',
  },
  prescribedCount: {
    display: 'grid',
    gap: '2px',
    color: '#123b30',
  },
  prescribedQueue: {
    display: 'flex',
    gap: '7px',
    flexWrap: 'wrap',
  },
  queueChip: {
    border: '1px solid #c9ddd0',
    background: '#ffffff',
    color: '#123b30',
    borderRadius: '999px',
    padding: '7px 10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 800,
  },
  queueChipActive: {
    border: '1px solid #2f7a5c',
    background: '#2f7a5c',
    color: '#ffffff',
    borderRadius: '999px',
    padding: '7px 10px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 900,
  },
  exerciseToggleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
    gap: '8px',
  },
  exerciseToggle: {
    minHeight: '58px',
    border: '1px solid #dce5df',
    background: '#ffffff',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gridTemplateColumns: '18px minmax(0, 1fr) auto',
    gap: '9px',
    alignItems: 'center',
    cursor: 'pointer',
  },
  exerciseToggleActive: {
    minHeight: '58px',
    border: '1px solid #2f7a5c',
    background: '#eef5f0',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gridTemplateColumns: '18px minmax(0, 1fr) auto',
    gap: '9px',
    alignItems: 'center',
    cursor: 'pointer',
  },
  exerciseToggleInput: {
    width: '16px',
    height: '16px',
  },
  exerciseToggleText: {
    display: 'grid',
    gap: '3px',
    fontSize: '12px',
    color: '#475d70',
  },
  patientVisiblePill: {
    border: '1px solid #c9ddd0',
    background: '#ddefe5',
    color: '#123b30',
    borderRadius: '999px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 900,
    width: 'fit-content',
  },
  clinicianOnlyPill: {
    border: '1px solid #dce5df',
    background: '#f5f8f5',
    color: '#5b6d7c',
    borderRadius: '999px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: 800,
    width: 'fit-content',
  },
  exerciseLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)',
    gap: '16px',
  },
  exerciseMenu: {
    background: '#ffffff',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gap: '8px',
    alignSelf: 'start',
  },
  exerciseMenuItem: {
    border: '1px solid #dce5df',
    borderRadius: '13px',
    background: '#ffffff',
    padding: '11px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'grid',
    gap: '4px',
  },
  exerciseMenuItemActive: {
    border: '1px solid #1f5c4a',
    borderRadius: '13px',
    background: '#e8f1eb',
    padding: '11px',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'grid',
    gap: '4px',
  },
  exerciseName: {
    fontWeight: 800,
    color: '#173451',
    fontSize: '13px',
  },
  exerciseMeta: {
    color: '#5b6d7c',
    fontSize: '11px',
    textTransform: 'capitalize',
  },
  exerciseHeaderBlock: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(190px, 240px)',
    gap: '16px',
    alignItems: 'start',
    marginBottom: '16px',
  },
  exerciseText: {
    margin: '7px 0 0',
    color: '#475d70',
    lineHeight: 1.5,
  },
  languageNote: {
    margin: '8px 0 0',
    color: '#174a3c',
    fontSize: '12px',
    fontWeight: 800,
  },
  regimenPanel: {
    border: '1px solid #c9ddd0',
    background: '#f7faf7',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '16px',
    display: 'grid',
    gap: '12px',
  },
  regimenHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    gap: '12px',
  },
  regimenTitle: {
    margin: 0,
    color: '#173451',
    fontSize: '16px',
    lineHeight: 1.25,
  },
  adherenceBadge: {
    border: '1px solid #c9ddd0',
    background: '#eef5f0',
    color: '#123b30',
    borderRadius: '999px',
    padding: '7px 10px',
    fontSize: '12px',
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },
  regimenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
    gap: '8px',
  },
  regimenItem: {
    border: '1px solid #dce5df',
    background: '#ffffff',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gap: '5px',
  },
  regimenTwoColumn: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: '8px',
  },
  regimenCallout: {
    border: '1px solid #fed7aa',
    background: '#fff7ed',
    color: '#7c2d12',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gap: '5px',
  },
  stopRuleBox: {
    border: '1px solid #fecdd3',
    background: '#fff1f2',
    color: '#881337',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gap: '8px',
  },
  stopRuleList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  protocolBasis: {
    margin: 0,
    color: '#475d70',
    fontSize: '12px',
    lineHeight: 1.45,
  },
  dosageBox: {
    background: '#eef5f0',
    color: '#123b30',
    border: '1px solid #c9ddd0',
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
    border: '1px solid #dce5df',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
    gap: '12px',
    marginTop: '8px',
  },
  infographicPanel: {
    minHeight: '238px',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    background: '#ffffff',
    padding: '12px',
    display: 'grid',
    gridTemplateRows: 'auto 112px auto minmax(36px, auto)',
    gap: '8px',
  },
  stepLabel: {
    color: '#204a6b',
    fontSize: '12px',
    fontWeight: 900,
  },
  patientFigure: {
    position: 'relative',
    borderRadius: '8px',
    background: '#f5f8f5',
    border: '1px solid #dce5df',
  },
  headCircle: {
    position: 'absolute',
    top: '18px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    border: '3px solid #4d6660',
    background: '#ffffff',
  },
  tongueMark: {
    position: 'absolute',
    bottom: '7px',
    left: '18px',
    width: '18px',
    height: '7px',
    borderRadius: '999px',
    background: '#8fd3b0',
  },
  neckLine: {
    position: 'absolute',
    top: '62px',
    left: '50%',
    width: '3px',
    height: '22px',
    background: '#8fa79d',
    transform: 'translateX(-50%)',
  },
  bodyLine: {
    position: 'absolute',
    top: '82px',
    left: '50%',
    width: '62px',
    height: '34px',
    border: '3px solid #8fa79d',
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
    background: '#8fd3b0',
  },
  motionArrow: {
    position: 'absolute',
    right: '24%',
    top: '40px',
    color: '#204a6b',
    fontSize: '30px',
    fontWeight: 900,
  },
  stepCue: {
    color: '#2f7a5c',
    background: '#ddefe5',
    border: '1px solid #c9ddd0',
    borderRadius: '999px',
    padding: '5px 9px',
    display: 'inline-flex',
    justifySelf: 'start',
    fontSize: '12px',
    fontWeight: 900,
  },
  stepInstruction: {
    margin: 0,
    color: '#475d70',
    fontSize: '13px',
    lineHeight: 1.35,
  },
  prescriptionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  prescriptionBand: {
    background: '#f9fbf9',
    border: '1px solid #dce5df',
    borderRadius: '8px',
    padding: '12px',
  },
  smallTitle: {
    margin: '0 0 7px',
    fontSize: '13px',
    color: '#173451',
  },
  smallText: {
    margin: 0,
    color: '#475d70',
    fontSize: '13px',
    lineHeight: 1.45,
  },
  primaryButton: {
    border: '0',
    background: '#204a6b',
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
    gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)',
    gap: '16px',
  },
  patientPhone: {
    border: '1px solid #c9d7ce',
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
    background: '#c9d7ce',
    margin: '0 auto 20px',
  },
  phoneTitle: {
    margin: 0,
    fontSize: '24px',
  },
  phoneSub: {
    color: '#5b6d7c',
    margin: '4px 0 16px',
  },
  homeTask: {
    border: '1px solid #dce5df',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '11px 12px',
    marginBottom: '10px',
    fontWeight: 800,
  },
  homeCheck: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: '2px solid #2f7a5c',
    background: '#ddefe5',
    flex: '0 0 auto',
    marginTop: '2px',
  },
  phoneTaskDose: {
    display: 'block',
    color: '#5b6d7c',
    fontSize: '11px',
    fontWeight: 700,
    lineHeight: 1.35,
    marginTop: '4px',
  },
  phoneRegimenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
    margin: '12px 0 16px',
  },
  phoneRegimenGridItem: {
    border: '1px solid #dce5df',
    background: '#f5f8f5',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gap: '4px',
  },
  symptomStrip: {
    display: 'flex',
    gap: '7px',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  reportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
    gap: '16px',
  },
  reportLine: {
    borderTop: '1px solid #dce5df',
    padding: '12px 0',
    display: 'grid',
    gridTemplateColumns: '160px minmax(0, 1fr)',
    gap: '14px',
    color: '#475d70',
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
    color: '#174a3c',
    background: '#edf2f7',
    borderRadius: '6px',
    padding: '3px 6px',
    fontSize: '12px',
    fontWeight: 900,
  },
  icfTrack: {
    height: '11px',
    background: '#dce5df',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  icfFill: {
    height: '100%',
    background: '#2f7a5c',
  },
  icfValue: {
    fontSize: '12px',
    fontWeight: 900,
    color: '#475d70',
  },
  icfGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
    gap: '10px',
  },
  icfItem: {
    border: '1px solid #dce5df',
    borderRadius: '8px',
    padding: '10px',
    display: 'grid',
    gap: '6px',
  },
  footer: {
    marginTop: '22px',
    padding: '16px 8px 4px',
    color: T.ink2,
    fontSize: '13px',
    fontWeight: 700,
    textAlign: 'center',
    borderTop: '1px solid #dce5df',
  },
};
