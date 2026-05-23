import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Dumbbell,
  FileDown,
  Heart,
  Info,
  Printer,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  TimerReset,
} from 'lucide-react';
import {
  HNC_PATIENT_SNAPSHOT,
  type HncSectionId,
} from '../../../../packages/core/src/hncClinicalModel';
import {
  buildExecutiveSummary,
  buildIcfTable,
  buildStructuredRecommendations,
  checkSeverityIcfCorrelation,
  computeSectionCompletion,
  generateSmartDefaults,
  type FieldState,
  type ReportDraft,
  type SeverityTier,
} from '../reportEngine';
import { exportDiagnosticReport } from '../reportPdf';

interface ReportWorkspaceProps {
  fieldState: FieldState;
  setFieldState: React.Dispatch<React.SetStateAction<FieldState>>;
  completion: number;
  onJump: (sectionId: HncSectionId) => void;
}

const SEVERITY_OPTIONS: SeverityTier[] = ['None', 'Mild', 'Moderate', 'Severe', 'Profound'];

const formatSourceLabel = (source: 'clinician' | 'auto'): string =>
  source === 'auto' ? 'AUTO' : 'CLINICIAN';

export const ReportWorkspace: React.FC<ReportWorkspaceProps> = ({
  fieldState,
  setFieldState,
  completion,
  onJump,
}) => {
  const sections = useMemo(() => computeSectionCompletion(fieldState), [fieldState]);
  const draft: ReportDraft = useMemo(() => generateSmartDefaults(fieldState), [fieldState]);
  const summary = useMemo(() => buildExecutiveSummary(fieldState, draft), [fieldState, draft]);
  const icfRows = useMemo(() => buildIcfTable(fieldState), [fieldState]);
  const recs = useMemo(() => buildStructuredRecommendations(fieldState), [fieldState]);
  const correlation = useMemo(() => checkSeverityIcfCorrelation(fieldState), [fieldState]);

  const sectionsIncomplete = sections.filter((section) => section.status !== 'complete');
  const sectionsReady = sections.length - sectionsIncomplete.length;

  const applyDefault = (field: keyof ReportDraft) => {
    if (field === 'source') return;
    setFieldState((prev) => ({ ...prev, [field]: draft[field] as string }));
  };

  const applyAllDefaults = () => {
    setFieldState((prev) => ({
      ...prev,
      slpDiagnosis: draft.slpDiagnosis,
      severity: draft.severity,
      recommendations: draft.recommendations,
      followUp: draft.followUp,
    }));
  };

  const handleExportPdf = () => {
    const opened = exportDiagnosticReport(fieldState);
    if (!opened) {
      window.alert('Pop-up blocked. Please allow pop-ups for DegluTech to export the diagnostic report.');
    }
  };

  const aspirationPalette: Record<typeof summary.aspirationRiskTone, { bg: string; border: string; fg: string }> = {
    green: { bg: '#ecfdf5', border: '#10b981', fg: '#065f46' },
    amber: { bg: '#fffbeb', border: '#f59e0b', fg: '#92400e' },
    red: { bg: '#fef2f2', border: '#dc2626', fg: '#991b1b' },
  };
  const tone = aspirationPalette[summary.aspirationRiskTone];

  return (
    <div style={styles.workspaceGrid}>
      <section style={styles.sectionIntro}>
        <div>
          <p style={styles.overline}>Summary, validation, and handoff</p>
          <h3 style={styles.introTitle}>{draft.slpDiagnosis}</h3>
          <p style={styles.introText}>
            Smart defaults pre-populate this section from oncology, OPME, and swallow data. Review and apply
            before exporting the diagnostic report for EHR deposit or onco-surgical referral.
          </p>
        </div>
        <div style={styles.introActions}>
          <button type="button" style={styles.iconPillSecondary} onClick={applyAllDefaults}>
            <Sparkles size={16} /> Apply all smart defaults
          </button>
          <button type="button" style={styles.iconPillPrimary} onClick={handleExportPdf}>
            <FileDown size={16} /> Export diagnostic report
          </button>
          <button type="button" style={styles.iconPillGhost} onClick={() => window.print()}>
            <Printer size={16} /> Print current view
          </button>
        </div>
      </section>

      <ValidationPanel
        sections={sections}
        sectionsReady={sectionsReady}
        sectionsTotal={sections.length}
        completion={completion}
        correlation={correlation}
        onJump={onJump}
      />

      <SmartDefaultsPanel
        draft={draft}
        fieldState={fieldState}
        setFieldState={setFieldState}
        onApplyDefault={applyDefault}
      />

      <section style={{ ...styles.execSummary, borderColor: tone.border, background: tone.bg }}>
        <div style={styles.execHeader}>
          <div>
            <p style={{ ...styles.overline, color: tone.fg }}>Executive summary</p>
            <h3 style={{ ...styles.execTitle, color: '#0f172a' }}>{summary.diagnosis}</h3>
          </div>
          <div style={{ ...styles.aspirationBadge, background: tone.border }}>
            <ShieldAlert size={16} />
            Aspiration risk: {summary.aspirationRiskLabel}
          </div>
        </div>
        <div style={styles.execGrid}>
          <ExecCell label="Severity" value={String(summary.severity)} />
          <ExecCell label="Diet route" value={summary.dietRoute} />
          <ExecCell label="Texture / route plan" value={summary.textureGuidance} wide />
          <ExecCell label="Primary concerns" value={summary.primaryConcerns.join(' • ')} wide />
          <ExecCell label="Patient ID" value={HNC_PATIENT_SNAPSHOT.patientId} />
          <ExecCell label="TNM" value={`${fieldState.tCategory ?? '—'} ${fieldState.nCategory ?? '—'} ${fieldState.mCategory ?? '—'}`} />
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h3 style={styles.panelTitle}>WHO-ICF HNC Profile (cross-referenced)</h3>
            <p style={styles.panelSubtitle}>
              Mapped ICF codes, domain, qualifier severity (0–4), and head-and-neck-specific manifestation.
            </p>
          </div>
          <Stethoscope size={18} color="#1d4ed8" />
        </div>
        <div style={styles.icfTableWrap}>
          <table style={styles.icfTable}>
            <thead>
              <tr>
                <th style={styles.icfTh}>Code</th>
                <th style={styles.icfTh}>Domain / Category</th>
                <th style={{ ...styles.icfTh, textAlign: 'center', width: 110 }}>Qualifier</th>
                <th style={styles.icfTh}>Clinical Manifestation</th>
              </tr>
            </thead>
            <tbody>
              {icfRows.map((row) => (
                <tr key={row.code}>
                  <td style={styles.icfTd}>
                    <span
                      style={{
                        ...styles.icfCodePill,
                        background: `${row.domainAccent}1a`,
                        color: row.domainAccent,
                      }}
                    >
                      {row.code}
                    </span>
                  </td>
                  <td style={styles.icfTd}>
                    <strong style={styles.icfName}>{row.name}</strong>
                    <span style={styles.icfMuted}>{row.domain}</span>
                  </td>
                  <td style={{ ...styles.icfTd, textAlign: 'center' }}>
                    <span style={{ ...styles.qualifierPill, background: qualifierColor(row.qualifier) }}>
                      {row.qualifier}
                    </span>
                    <div style={styles.icfMutedSmall}>{row.severityLabel}</div>
                  </td>
                  <td style={{ ...styles.icfTd, color: '#334155' }}>{row.manifestation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.recommendationGrid}>
        <RecommendationCard
          title="Force / Range-of-Motion Exercises"
          icon={<Dumbbell size={16} color="#0f766e" />}
          items={recs.forceRangeOfMotion}
          accent="#0f766e"
        />
        <RecommendationCard
          title="Compensatory Strategies & Diet"
          icon={<ClipboardCheck size={16} color="#1d4ed8" />}
          items={recs.compensatoryAndDiet}
          accent="#1d4ed8"
        />
        <RecommendationCard
          title="Red Flags / Emergency Criteria"
          icon={<AlertTriangle size={16} color="#dc2626" />}
          items={recs.redFlags}
          accent="#dc2626"
          tone="danger"
        />
        <RecommendationCard
          title="Follow-up Timeline"
          icon={<TimerReset size={16} color="#7c3aed" />}
          items={recs.followUpTimeline}
          accent="#7c3aed"
          tone="info"
        />
      </section>

      <section style={styles.signoffPanel}>
        <div>
          <p style={styles.overline}>Clinician sign-off (PDF deposit)</p>
          <h3 style={styles.panelTitle}>Authorize and deposit to EHR</h3>
          <p style={styles.introText}>
            The exported PDF includes a medical header, demographics, executive summary, ICF table, and
            structured recommendations. Sign before depositing to the patient chart or routing to oncology.
          </p>
        </div>
        <div style={styles.signoffBox}>
          <Heart size={20} color="#dc2626" />
          <div>
            <strong style={{ color: '#0f172a' }}>[Clinician Name]</strong>
            <div style={styles.signoffMeta}>M.Sc. (SLP) · RCI / ISHA No. ________</div>
            <div style={styles.signoffMeta}>Confirm electronic signature in the PDF preview window.</div>
          </div>
        </div>
      </section>
    </div>
  );
};

function ExecCell({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div style={wide ? styles.execCellWide : styles.execCell}>
      <span style={styles.execCellLabel}>{label}</span>
      <strong style={styles.execCellValue}>{value || 'Not recorded'}</strong>
    </div>
  );
}

function ValidationPanel({
  sections,
  sectionsReady,
  sectionsTotal,
  completion,
  correlation,
  onJump,
}: {
  sections: ReturnType<typeof computeSectionCompletion>;
  sectionsReady: number;
  sectionsTotal: number;
  completion: number;
  correlation: ReturnType<typeof checkSeverityIcfCorrelation>;
  onJump: (sectionId: HncSectionId) => void;
}) {
  return (
    <section style={styles.validationPanel}>
      <div style={styles.panelHeader}>
        <div>
          <p style={styles.overline}>Pre-publication validation</p>
          <h3 style={styles.panelTitle}>Sections 1–12 readiness</h3>
          <p style={styles.panelSubtitle}>
            {sectionsReady} of {sectionsTotal} sections complete. Overall data quality: <strong>{completion}%</strong>.
            Click any block to jump back and complete it.
          </p>
        </div>
        <div style={styles.readinessBadge(sectionsReady === sectionsTotal)}>
          {sectionsReady === sectionsTotal ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {sectionsReady === sectionsTotal ? 'Ready for sign-off' : `${sectionsTotal - sectionsReady} need review`}
        </div>
      </div>

      <div style={styles.sectionsGrid}>
        {sections.map((section) => {
          const tone =
            section.status === 'complete'
              ? { bg: '#ecfdf5', border: '#10b981', fg: '#065f46' }
              : section.status === 'partial'
              ? { bg: '#fffbeb', border: '#f59e0b', fg: '#92400e' }
              : { bg: '#fef2f2', border: '#dc2626', fg: '#991b1b' };

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onJump(section.id)}
              style={{
                ...styles.sectionChip,
                background: tone.bg,
                borderColor: tone.border,
                color: tone.fg,
              }}
              title={
                section.missingFields.length > 0
                  ? `Missing: ${section.missingFields.map((f) => f.label).join(', ')}`
                  : 'All fields recorded'
              }
            >
              <span style={styles.sectionChipNumber}>{section.order}</span>
              <span style={styles.sectionChipBody}>
                <strong>{section.shortLabel}</strong>
                <span style={styles.sectionChipPercent}>
                  {section.filled}/{section.total} · {section.percent}%
                </span>
              </span>
              <span style={{ ...styles.sectionChipDot, background: tone.border }} />
            </button>
          );
        })}
      </div>

      {correlation.isMismatch && (
        <div style={styles.warnBanner}>
          <AlertTriangle size={18} color="#b45309" />
          <div>
            <strong>Severity vs. ICF qualifier mismatch detected.</strong>
            <p style={styles.warnText}>{correlation.mismatchReason}</p>
            <p style={styles.warnSub}>
              Recommended severity based on instrumental assessment: <strong>{correlation.recommendedSeverity}</strong>
            </p>
          </div>
        </div>
      )}

      {!correlation.isMismatch && correlation.severity !== 'Unknown' && (
        <div style={styles.okBanner}>
          <CheckCircle2 size={18} color="#065f46" />
          <span>
            Clinical severity (<strong>{correlation.severity}</strong>) correlates with mapped ICF qualifiers (mean
            qualifier {correlation.averageQualifier}, b5105 = {correlation.primaryQualifier}).
          </span>
        </div>
      )}
    </section>
  );
}

function SmartDefaultsPanel({
  draft,
  fieldState,
  setFieldState,
  onApplyDefault,
}: {
  draft: ReportDraft;
  fieldState: FieldState;
  setFieldState: React.Dispatch<React.SetStateAction<FieldState>>;
  onApplyDefault: (field: keyof ReportDraft) => void;
}) {
  const fields: { key: keyof ReportDraft; label: string; kind: 'textarea' | 'select' | 'text' }[] = [
    { key: 'slpDiagnosis', label: 'SLP diagnosis', kind: 'textarea' },
    { key: 'severity', label: 'Clinical severity', kind: 'select' },
    { key: 'recommendations', label: 'Recommendations', kind: 'textarea' },
    { key: 'followUp', label: 'Follow-up plan', kind: 'textarea' },
  ];

  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <p style={styles.overline}>Smart defaults &amp; clinical authoring</p>
          <h3 style={styles.panelTitle}>Clinical impression</h3>
          <p style={styles.panelSubtitle}>
            Suggested values are derived from oncology staging, swallow safety, OPME, and ICF qualifiers.
            Override any field; clinician edits are preserved.
          </p>
        </div>
        <Info size={18} color="#1d4ed8" />
      </div>

      <div style={styles.draftGrid}>
        {fields.map(({ key, label, kind }) => {
          const source = draft.source[key as keyof ReportDraft['source']];
          const draftValue = String(draft[key] ?? '');
          const currentValue = String(fieldState[key as string] ?? '');

          return (
            <div key={String(key)} style={styles.draftRow}>
              <div style={styles.draftRowHeader}>
                <span style={styles.draftLabel}>{label}</span>
                <span style={source === 'auto' ? styles.sourceBadgeAuto : styles.sourceBadgeClin}>
                  {formatSourceLabel(source)}
                </span>
              </div>

              {kind === 'select' ? (
                <select
                  value={currentValue || draftValue}
                  onChange={(event) =>
                    setFieldState((prev) => ({ ...prev, [key as string]: event.target.value }))
                  }
                  style={styles.draftSelect}
                >
                  {SEVERITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <textarea
                  value={currentValue}
                  placeholder={draftValue}
                  onChange={(event) =>
                    setFieldState((prev) => ({ ...prev, [key as string]: event.target.value }))
                  }
                  style={styles.draftTextarea}
                />
              )}

              {source === 'auto' && currentValue !== draftValue && (
                <div style={styles.suggestionRow}>
                  <Sparkles size={13} color="#1d4ed8" />
                  <span style={styles.suggestionText}>Smart suggestion: {draftValue}</span>
                  <button
                    type="button"
                    style={styles.applyButton}
                    onClick={() => onApplyDefault(key)}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecommendationCard({
  title,
  icon,
  items,
  accent,
  tone = 'default',
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  accent: string;
  tone?: 'default' | 'danger' | 'info';
}) {
  const background = tone === 'danger' ? '#fef2f2' : tone === 'info' ? '#eff6ff' : '#ffffff';
  const borderColor = tone === 'danger' ? '#fecaca' : tone === 'info' ? '#bfdbfe' : '#e2e8f0';

  return (
    <div style={{ ...styles.recCard, background, borderColor }}>
      <div style={styles.recCardHeader}>
        {icon}
        <h4 style={{ ...styles.recCardTitle, color: accent }}>{title}</h4>
      </div>
      <ul style={styles.recList}>
        {items.map((item, index) => (
          <li key={`${title}-${index}`} style={styles.recListItem}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const qualifierColor = (value: number): string => {
  if (value >= 4) return '#dc2626';
  if (value >= 3) return '#ea580c';
  if (value >= 2) return '#ca8a04';
  if (value >= 1) return '#65a30d';
  return '#10b981';
};

interface ReportErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class ReportErrorBoundary extends React.Component<
  React.PropsWithChildren<unknown>,
  ReportErrorBoundaryState
> {
  state: ReportErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ReportErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Report module failed to render', error, info);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section style={styles.errorPanel}>
        <AlertTriangle size={24} color="#dc2626" />
        <div>
          <h3 style={styles.errorTitle}>The Summary &amp; Report module hit an unexpected error.</h3>
          <p style={styles.errorText}>
            {this.state.message ?? 'Please refresh the workspace. Locally saved field data is preserved.'}
          </p>
          <button type="button" style={styles.applyButton} onClick={this.reset}>
            Retry rendering
          </button>
        </div>
      </section>
    );
  }
}

const styles: Record<string, any> = {
  workspaceGrid: {
    display: 'grid',
    gap: '16px',
  },
  sectionIntro: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '10px',
    padding: '16px 18px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: '16px',
    alignItems: 'center',
  },
  introTitle: {
    margin: '4px 0 6px',
    fontSize: '20px',
    lineHeight: 1.3,
    color: '#0f172a',
  },
  introText: {
    margin: 0,
    color: '#475569',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  introActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  overline: {
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 800,
  },
  iconPillPrimary: {
    minHeight: '40px',
    border: '1px solid #1d4ed8',
    background: '#1d4ed8',
    color: '#ffffff',
    padding: '0 14px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '13px',
  },
  iconPillSecondary: {
    minHeight: '40px',
    border: '1px solid #0f766e',
    background: '#0f766e',
    color: '#ffffff',
    padding: '0 14px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '13px',
  },
  iconPillGhost: {
    minHeight: '40px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    padding: '0 14px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '13px',
  },
  validationPanel: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '10px',
    padding: '16px 18px',
    display: 'grid',
    gap: '14px',
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '10px',
    padding: '16px 18px',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '14px',
    marginBottom: '12px',
  },
  panelTitle: {
    margin: '4px 0 0',
    fontSize: '17px',
    color: '#0f172a',
  },
  panelSubtitle: {
    margin: '6px 0 0',
    color: '#64748b',
    fontSize: '12.5px',
    lineHeight: 1.5,
    maxWidth: '780px',
  },
  readinessBadge: (ready: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '999px',
    fontWeight: 800,
    fontSize: '12px',
    background: ready ? '#ecfdf5' : '#fef2f2',
    color: ready ? '#065f46' : '#991b1b',
    border: `1px solid ${ready ? '#10b981' : '#dc2626'}`,
  }),
  sectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '8px',
  },
  sectionChip: {
    display: 'grid',
    gridTemplateColumns: '28px minmax(0, 1fr) 10px',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid',
    borderRadius: '10px',
    padding: '10px 12px',
    cursor: 'pointer',
    textAlign: 'left',
    minHeight: '58px',
    background: '#ffffff',
  },
  sectionChipNumber: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    background: '#0f172a',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '12px',
    display: 'grid',
    placeItems: 'center',
  },
  sectionChipBody: {
    display: 'grid',
    gap: '2px',
    minWidth: 0,
    fontSize: '13px',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  sectionChipPercent: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
  },
  sectionChipDot: {
    width: '10px',
    height: '10px',
    borderRadius: '999px',
  },
  warnBanner: {
    border: '1px solid #f59e0b',
    background: '#fffbeb',
    color: '#92400e',
    borderRadius: '8px',
    padding: '12px 14px',
    display: 'grid',
    gridTemplateColumns: '20px minmax(0, 1fr)',
    gap: '10px',
  },
  warnText: {
    margin: '4px 0 0',
    fontSize: '12.5px',
    color: '#78350f',
    lineHeight: 1.5,
  },
  warnSub: {
    margin: '6px 0 0',
    fontSize: '12px',
    color: '#92400e',
  },
  okBanner: {
    border: '1px solid #10b981',
    background: '#ecfdf5',
    color: '#065f46',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12.5px',
  },
  execSummary: {
    border: '2px solid',
    borderRadius: '12px',
    padding: '18px',
    display: 'grid',
    gap: '14px',
  },
  execHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '14px',
    flexWrap: 'wrap',
  },
  execTitle: {
    margin: '4px 0 0',
    fontSize: '20px',
    lineHeight: 1.3,
  },
  aspirationBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#ffffff',
    padding: '6px 12px',
    borderRadius: '999px',
    fontWeight: 800,
    fontSize: '12px',
  },
  execGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '10px',
  },
  execCell: {
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '8px',
    padding: '8px 10px',
    display: 'grid',
    gap: '3px',
  },
  execCellWide: {
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '8px',
    padding: '8px 10px',
    display: 'grid',
    gap: '3px',
    gridColumn: 'span 2',
  },
  execCellLabel: {
    fontSize: '10.5px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#475569',
    fontWeight: 700,
  },
  execCellValue: {
    fontSize: '13px',
    color: '#0f172a',
    lineHeight: 1.4,
  },
  icfTableWrap: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  icfTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  icfTh: {
    background: '#0f172a',
    color: '#ffffff',
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  icfTd: {
    padding: '10px 12px',
    borderTop: '1px solid #e2e8f0',
    verticalAlign: 'top',
    background: '#ffffff',
  },
  icfCodePill: {
    fontFamily: 'Consolas, monospace',
    padding: '4px 8px',
    borderRadius: '6px',
    fontWeight: 800,
    fontSize: '12px',
  },
  icfName: {
    display: 'block',
    color: '#0f172a',
    fontSize: '13px',
  },
  icfMuted: {
    color: '#64748b',
    fontSize: '11.5px',
    fontWeight: 500,
  },
  icfMutedSmall: {
    color: '#64748b',
    fontSize: '11px',
    marginTop: '4px',
  },
  qualifierPill: {
    display: 'inline-block',
    minWidth: '28px',
    padding: '4px 10px',
    borderRadius: '6px',
    color: '#ffffff',
    fontWeight: 900,
    fontSize: '13px',
  },
  draftGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
  },
  draftRow: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '10px 12px',
    background: '#f8fafc',
    display: 'grid',
    gap: '8px',
  },
  draftRowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftLabel: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  sourceBadgeAuto: {
    background: '#dbeafe',
    color: '#1d4ed8',
    fontSize: '10px',
    padding: '3px 7px',
    borderRadius: '999px',
    fontWeight: 900,
    letterSpacing: '0.06em',
  },
  sourceBadgeClin: {
    background: '#dcfce7',
    color: '#166534',
    fontSize: '10px',
    padding: '3px 7px',
    borderRadius: '999px',
    fontWeight: 900,
    letterSpacing: '0.06em',
  },
  draftTextarea: {
    minHeight: '80px',
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '8px 10px',
    fontFamily: 'inherit',
    fontSize: '13px',
    lineHeight: 1.5,
    color: '#0f172a',
    resize: 'vertical',
    background: '#ffffff',
  },
  draftSelect: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '8px 10px',
    fontFamily: 'inherit',
    fontSize: '13px',
    color: '#0f172a',
    background: '#ffffff',
    minHeight: '40px',
  },
  suggestionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    padding: '6px 10px',
  },
  suggestionText: {
    flex: 1,
    fontSize: '12px',
    color: '#1d4ed8',
    lineHeight: 1.4,
  },
  applyButton: {
    border: '1px solid #1d4ed8',
    background: '#1d4ed8',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 800,
    padding: '4px 10px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  recommendationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
  },
  recCard: {
    border: '1px solid',
    borderRadius: '10px',
    padding: '14px 16px',
    display: 'grid',
    gap: '10px',
  },
  recCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingBottom: '6px',
    borderBottom: '1px solid #e2e8f0',
  },
  recCardTitle: {
    margin: 0,
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 900,
  },
  recList: {
    margin: 0,
    paddingLeft: '18px',
    display: 'grid',
    gap: '6px',
  },
  recListItem: {
    color: '#334155',
    fontSize: '12.5px',
    lineHeight: 1.5,
  },
  signoffPanel: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '10px',
    padding: '16px 18px',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 280px',
    gap: '18px',
    alignItems: 'center',
  },
  signoffBox: {
    border: '1px dashed #cbd5e1',
    background: '#f8fafc',
    borderRadius: '8px',
    padding: '14px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  signoffMeta: {
    color: '#64748b',
    fontSize: '11.5px',
    marginTop: '4px',
  },
  errorPanel: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#991b1b',
    borderRadius: '10px',
    padding: '16px 18px',
    display: 'grid',
    gridTemplateColumns: '28px minmax(0, 1fr)',
    gap: '12px',
    alignItems: 'flex-start',
  },
  errorTitle: {
    margin: '0 0 6px',
    fontSize: '16px',
    color: '#7f1d1d',
  },
  errorText: {
    margin: '0 0 8px',
    fontSize: '13px',
    color: '#991b1b',
    lineHeight: 1.5,
  },
};
