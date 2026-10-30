import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FileText,
  Filter,
  HeartPulse,
  LineChart,
  MessageSquare,
  MoreHorizontal,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  computeCaseloadKpis,
  type PatientCaseloadEntry,
  type RiskLevel,
} from '../caseloadData';
import type { HncSectionId } from '../../../../packages/core/src/hncClinicalModel';
import { FloatingBadge } from './ui/ClinicalPrimitives';

interface ClinicianDashboardProps {
  /** One row per patient saved on this device (built from their charts). */
  patients: PatientCaseloadEntry[];
  activeRecordId: string;
  completion: number;
  savedAt: string;
  onJump: (section: HncSectionId) => void;
  onOpenPatient: (recordId: string, section?: HncSectionId) => void;
  onAddPatient: () => void;
}

type SortKey = 'risk' | 'review' | 'adherence' | 'severity' | 'eat10' | 'jaw';
type SortDirection = 'asc' | 'desc';
type RiskFilter = 'all' | RiskLevel;
type PhaseFilter = 'all' | PatientCaseloadEntry['phase'];
type DrawerTab = 'overview' | 'icf' | 'trends' | 'plan';

const SEVERITY_ORDER: Record<string, number> = {
  None: 0,
  Mild: 1,
  Moderate: 2,
  Severe: 3,
  Profound: 4,
};

const RISK_PALETTE: Record<RiskLevel, { bg: string; fg: string; border: string; soft: string }> = {
  high: { bg: '#fbe4dd', fg: '#8e3420', border: '#a8402b', soft: 'rgba(220, 38, 38, 0.12)' },
  moderate: { bg: '#fbefd6', fg: '#7a4e00', border: '#c9822b', soft: 'rgba(245, 158, 11, 0.14)' },
  low: { bg: '#ddefe5', fg: '#1f5c43', border: '#2f7a5c', soft: 'rgba(16, 185, 129, 0.14)' },
};

const PHASES: PhaseFilter[] = ['all', 'Prehab', 'Post-op', 'During RT', 'Post-CRT', 'Survivorship'];

const cleanText = (value: string): string =>
  value
    .replace(/â€”/g, '-')
    .replace(/Â·/g, '/')
    .replace(/â€“/g, '-')
    .replace(/Ã—/g, 'x')
    .replace(/â‰¥/g, '>=')
    .replace(/â‰¤/g, '<=');

const todayAtStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const daysBetween = (date: string, reference: Date = todayAtStart()) => {
  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY; // no review date set
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - reference.getTime()) / 86400000);
};

const formatReviewDate = (date: string) => {
  const diff = daysBetween(date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parsed);
};

const initialsFor = (name: string) =>
  cleanText(name)
    .replace(/\([^)]*\)/g, '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'PT';

export const ClinicianDashboard: React.FC<ClinicianDashboardProps> = ({
  patients,
  activeRecordId,
  completion,
  savedAt,
  onJump: jumpInChart,
  onOpenPatient,
  onAddPatient,
}) => {
  const [selectedId, setSelectedId] = useState<string>(() => patients.find((p) => p.recordId === activeRecordId)?.id ?? patients[0]?.id ?? '');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('risk');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const kpis = useMemo(() => computeCaseloadKpis(patients), [patients]);
  const selectedPatient =
    patients.find((patient) => patient.id === selectedId) ??
    patients.find((patient) => patient.recordId === activeRecordId) ??
    patients[0];
  // Actions on the selected row open that patient's chart (switching patient when needed).
  const onJump = (section: HncSectionId) => {
    if (selectedPatient?.recordId && selectedPatient.recordId !== activeRecordId) onOpenPatient(selectedPatient.recordId, section);
    else jumpInChart(section);
  };

  const filteredPatients = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const riskWeight: Record<RiskLevel, number> = { low: 1, moderate: 2, high: 3 };

    const valueFor = (patient: PatientCaseloadEntry) => {
      switch (sortBy) {
        case 'risk':
          return riskWeight[patient.riskLevel];
        case 'review':
          return Number.isNaN(new Date(patient.nextReview).getTime()) ? Number.POSITIVE_INFINITY : new Date(patient.nextReview).getTime();
        case 'adherence':
          return patient.adherence;
        case 'severity':
          return SEVERITY_ORDER[patient.severity] ?? 0;
        case 'eat10':
          return patient.eat10;
        case 'jaw':
          return patient.jawOpening;
        default:
          return 0;
      }
    };

    return patients
      .filter((patient) => {
        if (riskFilter !== 'all' && patient.riskLevel !== riskFilter) return false;
        if (phaseFilter !== 'all' && patient.phase !== phaseFilter) return false;
        if (!lower) return true;

        return [
          patient.displayName,
          patient.id,
          patient.diagnosis,
          patient.tumorSite,
          patient.stage,
          patient.phase,
        ].some((item) => cleanText(String(item)).toLowerCase().includes(lower));
      })
      .sort((a, b) => {
        const av = valueFor(a);
        const bv = valueFor(b);
        if (av === bv) return cleanText(a.displayName).localeCompare(cleanText(b.displayName));
        return sortDirection === 'asc' ? av - bv : bv - av;
      });
  }, [patients, phaseFilter, riskFilter, search, sortBy, sortDirection]);

  const dueOrOverdue = patients.filter((patient) => daysBetween(patient.nextReview) <= 7).length;
  const overdue = patients.filter((patient) => daysBetween(patient.nextReview) < 0).length;
  const alertCount = patients.reduce((sum, patient) => sum + patient.alerts.length, 0);

  const selectSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDirection(key === 'review' || key === 'adherence' || key === 'jaw' ? 'asc' : 'desc');
    }
  };

  const openPatient = (patient: PatientCaseloadEntry) => {
    setSelectedId(patient.id);
    setDrawerOpen(true);
  };

  return (
    <div className="dt-dashboard" style={styles.dashboardShell}>
      <header style={styles.dashboardTopbar}>
        <div>
          <p style={styles.overline}>Clinician dashboard</p>
          <h2 style={styles.dashboardTitle}>Caseload command center</h2>
        </div>
        <div style={styles.topbarActions}>
          <span style={styles.topbarBadge}>{completion}% fields recorded</span>
          <span style={styles.topbarMeta}>Saved: {savedAt}</span>
          <button type="button" style={styles.primaryAction} onClick={onAddPatient}>Add or switch patient</button>
        </div>
      </header>

      <section className="deglutech-kpi-strip" style={styles.kpiStrip} aria-label="Caseload key performance indicators">
        <KpiCell label="Active caseload" value={kpis.total} sub="saved on this device" icon={<Users size={15} />} />
        <KpiCell label="High risk" value={kpis.highRisk} sub={`${Math.round((kpis.highRisk / Math.max(kpis.total, 1)) * 100)}% of panel`} icon={<AlertTriangle size={15} />} tone="high" />
        <KpiCell label="Due within 7d" value={dueOrOverdue} sub={overdue > 0 ? `${overdue} overdue` : 'on schedule'} icon={<CalendarClock size={15} />} tone="moderate" />
        <KpiCell label="Mean adherence" value={`${kpis.adherenceMean}%`} sub="home program" icon={<Activity size={15} />} tone="low" />
        <KpiCell label="Severe / profound" value={kpis.severeOrProfound} sub="requires close review" icon={<HeartPulse size={15} />} tone="high" />
        <KpiCell label="Alerts" value={alertCount} sub="clinical flags" icon={<Sparkles size={15} />} tone="info" />
      </section>

      <div className="deglutech-dashboard-columns" style={styles.dashboardColumns}>
        <section style={styles.queuePanel}>
          <CaseloadToolbar
            search={search}
            setSearch={setSearch}
            riskFilter={riskFilter}
            setRiskFilter={setRiskFilter}
            phaseFilter={phaseFilter}
            setPhaseFilter={setPhaseFilter}
            shown={filteredPatients.length}
            total={patients.length}
          />

          <CaseloadTable
            patients={filteredPatients}
            selectedId={selectedPatient?.id}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={selectSort}
            onOpenPatient={openPatient}
          />
        </section>

        <aside style={styles.sideRail} aria-label="Cohort insights">
          <CohortRiskPanel patients={patients} />
          <PhaseMixPanel patients={patients} />
          <PopulationTrendPanel patients={patients} />
          <InsightsPanel patients={patients} onOpenPatient={openPatient} />
          {selectedPatient && (
            <ActivePatientCard patient={selectedPatient} onOpen={() => setDrawerOpen(true)} onJump={onJump} />
          )}
        </aside>
      </div>

      {drawerOpen && selectedPatient && (
        <PatientDrawer
          patient={selectedPatient}
          onClose={() => setDrawerOpen(false)}
          onJump={onJump}
        />
      )}
    </div>
  );
};

function KpiCell({
  label,
  value,
  sub,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  tone?: 'neutral' | 'high' | 'moderate' | 'low' | 'info';
}) {
  const color =
    tone === 'high' ? '#a8402b' :
    tone === 'moderate' ? '#b7791f' :
    tone === 'low' ? '#2f7a5c' :
    tone === 'info' ? '#204a6b' :
    '#173451';

  return (
    <div style={styles.kpiCell}>
      <div style={styles.kpiLabelRow}>
        <span style={{ ...styles.kpiIcon, color, background: `${color}14` }}>{icon}</span>
        <span>{label}</span>
      </div>
      <div style={{ ...styles.kpiValue, color }}>{value}</div>
      <div style={styles.kpiSub}>{sub}</div>
    </div>
  );
}

function CaseloadToolbar({
  search,
  setSearch,
  riskFilter,
  setRiskFilter,
  phaseFilter,
  setPhaseFilter,
  shown,
  total,
}: {
  search: string;
  setSearch: (value: string) => void;
  riskFilter: RiskFilter;
  setRiskFilter: (value: RiskFilter) => void;
  phaseFilter: PhaseFilter;
  setPhaseFilter: (value: PhaseFilter) => void;
  shown: number;
  total: number;
}) {
  return (
    <div style={styles.queueToolbar}>
      <div style={styles.queueTitleBlock}>
        <div style={styles.queueTitle}>Caseload queue</div>
        <div style={styles.queueCount}>{shown} of {total} patients</div>
      </div>

      <div style={styles.filterGroup} aria-label="Risk filter">
        <Filter size={14} color="#4d6660" />
        {(['all', 'high', 'moderate', 'low'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRiskFilter(option)}
            style={riskFilter === option ? styles.segmentActive : styles.segment}
          >
            {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      <select
        value={phaseFilter}
        onChange={(event) => setPhaseFilter(event.target.value as PhaseFilter)}
        style={styles.phaseSelect}
        aria-label="Filter by treatment phase"
      >
        {PHASES.map((phase) => (
          <option key={phase} value={phase}>
            {phase === 'all' ? 'All phases' : phase}
          </option>
        ))}
      </select>

      <label style={styles.searchWrap}>
        <Search size={14} color="#4d6660" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, ID, diagnosis..."
          style={styles.searchInput}
        />
      </label>
    </div>
  );
}

function CaseloadTable({
  patients,
  selectedId,
  sortBy,
  sortDirection,
  onSort,
  onOpenPatient,
}: {
  patients: PatientCaseloadEntry[];
  selectedId?: string;
  sortBy: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onOpenPatient: (patient: PatientCaseloadEntry) => void;
}) {
  return (
    <div className="deglutech-caseload-table" style={styles.tableWrap}>
      <div className="deglutech-caseload-row-head" style={styles.tableHeader}>
        <span />
        <SortHeader label="Patient" sortKey="risk" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
        <span>Diagnosis / phase</span>
        <SortHeader label="Risk" sortKey="risk" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
        <SortHeader label="PAS" sortKey="severity" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} align="right" />
        <span style={styles.alignRight}>FOIS</span>
        <SortHeader label="EAT-10" sortKey="eat10" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} align="right" />
        <SortHeader label="Jaw" sortKey="jaw" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} align="right" />
        <SortHeader label="Adh" sortKey="adherence" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} align="right" />
        <span>Trend</span>
        <SortHeader label="Review" sortKey="review" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} />
        <span>Alerts</span>
        <span style={styles.alignRight}>Actions</span>
      </div>

      <div style={styles.tableBody}>
        {patients.map((patient) => (
          <PatientRow
            key={patient.id}
            patient={patient}
            selected={patient.id === selectedId}
            onOpen={() => onOpenPatient(patient)}
          />
        ))}
        {patients.length === 0 && (
          <div style={styles.emptyState}>
            <Search size={18} />
            No patients match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sortBy,
  sortDirection,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sortBy: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  align?: 'right';
}) {
  const active = sortKey === sortBy;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      style={{
        ...styles.sortButton,
        ...(align === 'right' ? styles.sortButtonRight : {}),
        color: active ? '#173451' : '#5b6d7c',
      }}
    >
      <span>{label}</span>
      {active && (sortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
    </button>
  );
}

function PatientRow({
  patient,
  selected,
  onOpen,
}: {
  patient: PatientCaseloadEntry;
  selected: boolean;
  onOpen: () => void;
}) {
  const palette = RISK_PALETTE[patient.riskLevel];
  const highConcern = patient.alerts.length > 0 || patient.riskLevel === 'high';
  const trendValues = patient.trends.slice(-8).map((point) => point.eat10);

  return (
    <button
      type="button"
      className="deglutech-caseload-row"
      onClick={onOpen}
      style={{
        ...styles.patientRow,
        ...(selected ? styles.patientRowSelected : {}),
      }}
    >
      <span style={{ ...styles.avatar, background: palette.border }}>{initialsFor(patient.displayName)}</span>
      <span style={styles.patientIdentity}>
        <strong>{cleanText(patient.displayName)}</strong>
        <span>{patient.id}</span>
      </span>
      <span style={styles.diagnosisCell}>
        <strong>{cleanText(patient.diagnosis)}</strong>
        <span>{cleanText(patient.phase)} / {cleanText(patient.stage)}</span>
      </span>
      <RiskPill risk={patient.riskLevel} />
      <ScoreCell value={patient.pas} bad={patient.pas >= 5} />
      <ScoreCell value={patient.fois} bad={patient.fois <= 3} />
      <ScoreCell value={patient.eat10} bad={patient.eat10 >= 20} />
      <ScoreCell value={patient.jawOpening} suffix="mm" bad={patient.jawOpening <= 30} />
      <AdherenceBar value={patient.adherence} />
      <Sparkline points={trendValues} accent={palette.border} width={76} height={22} />
      <span style={styles.reviewCell}>
        <strong>{formatReviewDate(patient.nextReview)}</strong>
        <span>{patient.nextReview}</span>
      </span>
      <span style={styles.alertCell}>
        {highConcern ? (
          <span style={{ ...styles.alertPill, color: palette.fg, background: palette.bg }}>
            <Sparkles size={11} /> {patient.alerts.length || 1}
          </span>
        ) : (
          <span style={styles.mutedText}>Stable</span>
        )}
      </span>
      <span style={styles.rowActions}>
        <span title="Open report" style={styles.rowActionButton}><FileText size={12} /></span>
        <span title="Message" style={styles.rowActionButton}><MessageSquare size={12} /></span>
        <span title="More" style={styles.rowActionButton}><MoreHorizontal size={12} /></span>
      </span>
    </button>
  );
}

function RiskPill({ risk }: { risk: RiskLevel }) {
  const palette = RISK_PALETTE[risk];
  return (
    <span style={{ ...styles.riskPill, background: palette.bg, color: palette.fg }}>
      <span style={{ ...styles.pulseDot, background: palette.border }} />
      {risk.toUpperCase()}
    </span>
  );
}

function ScoreCell({ value, suffix, bad }: { value: number; suffix?: string; bad?: boolean }) {
  return (
    <span style={{ ...styles.scoreCell, color: bad ? '#a8402b' : '#173451' }}>
      {Number.isInteger(value) ? value : value.toFixed(1)}
      {suffix && <small>{suffix}</small>}
    </span>
  );
}

function AdherenceBar({ value }: { value: number }) {
  const color = value >= 85 ? '#2f7a5c' : value >= 65 ? '#b7791f' : '#a8402b';
  return (
    <span style={styles.adherenceWrap}>
      <span style={styles.adherenceTrack}>
        <span style={{ ...styles.adherenceFill, width: `${value}%`, background: color }} />
      </span>
      <strong style={{ color }}>{value}</strong>
    </span>
  );
}

function CohortRiskPanel({ patients }: { patients: PatientCaseloadEntry[] }) {
  return (
    <RailPanel title="Cohort risk stratification" subtitle="Distribution across active HNC panel">
      <div style={styles.riskPanelBody}>
        <CohortRiskDonut patients={patients} />
        <div style={styles.riskLegend}>
          {(['high', 'moderate', 'low'] as const).map((risk) => {
            const count = patients.filter((patient) => patient.riskLevel === risk).length;
            const palette = RISK_PALETTE[risk];
            return (
              <div key={risk} style={styles.legendRow}>
                <span style={{ ...styles.legendSwatch, background: palette.border }} />
                <span>{risk}</span>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
      </div>
    </RailPanel>
  );
}

function CohortRiskDonut({ patients }: { patients: PatientCaseloadEntry[] }) {
  const total = Math.max(patients.length, 1);
  const radius = 45;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label="Cohort risk distribution">
      <circle cx="62" cy="62" r={radius} stroke="#dce5df" strokeWidth={stroke} fill="none" />
      {(['high', 'moderate', 'low'] as const).map((risk) => {
        const count = patients.filter((patient) => patient.riskLevel === risk).length;
        const length = (count / total) * circumference;
        const segmentOffset = offset;
        offset += length;
        return (
          <circle
            key={risk}
            cx="62"
            cy="62"
            r={radius}
            stroke={RISK_PALETTE[risk].border}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-segmentOffset}
            strokeLinecap="butt"
            transform="rotate(-90 62 62)"
          />
        );
      })}
      <text x="62" y="58" textAnchor="middle" fontSize="23" fontWeight="900" fill="#15302a">{patients.length}</text>
      <text x="62" y="76" textAnchor="middle" fontSize="10" fontWeight="700" fill="#4d6660">TOTAL</text>
    </svg>
  );
}

function PhaseMixPanel({ patients }: { patients: PatientCaseloadEntry[] }) {
  const phaseColors: Record<PatientCaseloadEntry['phase'], string> = {
    Prehab: '#204a6b',
    'Post-op': '#5b4bb7',
    'During RT': '#a8402b',
    'Post-CRT': '#b7791f',
    Survivorship: '#2f7a5c',
  };
  const total = Math.max(patients.length, 1);

  return (
    <RailPanel title="Treatment phase mix" subtitle="Patient position in the rehabilitation journey">
      <div style={styles.phaseStack}>
        {PHASES.filter((phase): phase is PatientCaseloadEntry['phase'] => phase !== 'all').map((phase) => {
          const count = patients.filter((patient) => patient.phase === phase).length;
          if (!count) return null;
          return (
            <span
              key={phase}
              title={`${phase}: ${count}`}
              style={{
                ...styles.phaseSegment,
                width: `${(count / total) * 100}%`,
                background: phaseColors[phase],
              }}
            />
          );
        })}
      </div>
      <div style={styles.phaseLegend}>
        {PHASES.filter((phase): phase is PatientCaseloadEntry['phase'] => phase !== 'all').map((phase) => {
          const count = patients.filter((patient) => patient.phase === phase).length;
          if (!count) return null;
          return (
            <div key={phase} style={styles.legendRow}>
              <span style={{ ...styles.legendSwatch, background: phaseColors[phase] }} />
              <span>{phase}</span>
              <strong>{count}</strong>
            </div>
          );
        })}
      </div>
    </RailPanel>
  );
}

function PopulationTrendPanel({ patients }: { patients: PatientCaseloadEntry[] }) {
  const points = useMemo(() => {
    const maxLength = Math.max(...patients.map((patient) => patient.trends.length), 0);
    return Array.from({ length: maxLength }, (_, index) => {
      const values = patients
        .map((patient) => patient.trends[Math.min(index, patient.trends.length - 1)]?.eat10)
        .filter((value): value is number => typeof value === 'number');
      return values.length === 0
        ? 0
        : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
    });
  }, [patients]);

  return (
    <RailPanel title="Population EAT-10 curve" subtitle="Mean trend across visible care episodes">
      <Sparkline points={points} accent="#1f5c4a" width={290} height={82} filled />
      <div style={styles.trendCaption}>
        <span>Lower is better</span>
        <strong>{points[points.length - 1] ?? 0}</strong>
      </div>
    </RailPanel>
  );
}

function InsightsPanel({
  patients,
  onOpenPatient,
}: {
  patients: PatientCaseloadEntry[];
  onOpenPatient: (patient: PatientCaseloadEntry) => void;
}) {
  const flagged = patients
    .filter((patient) => patient.alerts.length > 0)
    .sort((a, b) => b.alerts.length - a.alerts.length)
    .slice(0, 5);

  return (
    <RailPanel title="Today's flags" subtitle="Traceable clinical concerns">
      <div style={styles.insightList}>
        {flagged.map((patient) => (
          <button
            key={patient.id}
            type="button"
            onClick={() => onOpenPatient(patient)}
            style={styles.insightRow}
          >
            <span style={{ ...styles.insightIcon, color: RISK_PALETTE[patient.riskLevel].fg }}>
              <AlertTriangle size={14} />
            </span>
            <span style={styles.insightText}>
              <strong>{cleanText(patient.alerts[0])}</strong>
              <span>{cleanText(patient.displayName)} / {patient.id}</span>
            </span>
          </button>
        ))}
      </div>
    </RailPanel>
  );
}

function ActivePatientCard({
  patient,
  onOpen,
  onJump,
}: {
  patient: PatientCaseloadEntry;
  onOpen: () => void;
  onJump: (section: HncSectionId) => void;
}) {
  return (
    <div style={styles.activeCard}>
      <div style={styles.activeHeader}>
        <span style={{ ...styles.avatar, background: RISK_PALETTE[patient.riskLevel].border }}>
          {initialsFor(patient.displayName)}
        </span>
        <div>
          <p style={styles.overline}>Selected patient</p>
          <h3 style={styles.activeName}>{cleanText(patient.displayName)}</h3>
        </div>
      </div>
      <div style={styles.activeScores}>
        <MiniMetric label="PAS" value={patient.pas} />
        <MiniMetric label="FOIS" value={patient.fois} />
        <MiniMetric label="Jaw" value={`${patient.jawOpening} mm`} />
      </div>
      <div style={styles.activeActions}>
        <button type="button" style={styles.primaryAction} onClick={onOpen}>
          Open analytics <ChevronRight size={14} />
        </button>
        <button type="button" style={styles.secondaryAction} onClick={() => onJump('report')}>
          Report
        </button>
      </div>
    </div>
  );
}

function RailPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.railPanel}>
      <div style={styles.railHeader}>
        <div>
          <h3 style={styles.railTitle}>{title}</h3>
          <p style={styles.railSub}>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.miniMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PatientDrawer({
  patient,
  onClose,
  onJump,
}: {
  patient: PatientCaseloadEntry;
  onClose: () => void;
  onJump: (section: HncSectionId) => void;
}) {
  const [tab, setTab] = useState<DrawerTab>('overview');

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="dt-drawer-shell" style={styles.drawerShell}>
      <button type="button" aria-label="Close patient analytics" style={styles.drawerBackdrop} onClick={onClose} />
      <aside className="deglutech-patient-drawer" style={styles.drawerPanel}>
        <header style={styles.drawerHeader}>
          <span style={{ ...styles.drawerAvatar, background: RISK_PALETTE[patient.riskLevel].border }}>
            {initialsFor(patient.displayName)}
          </span>
          <div style={styles.drawerIdentity}>
            <div style={styles.drawerTitleLine}>
              <h2 style={styles.drawerTitle}>{cleanText(patient.displayName)}</h2>
              <span style={styles.drawerId}>{patient.id}</span>
              <RiskPill risk={patient.riskLevel} />
            </div>
            <p style={styles.drawerSubtitle}>
              {cleanText(patient.diagnosis)} / {cleanText(patient.stage)} / {cleanText(patient.phase)}
            </p>
          </div>
          <div style={styles.drawerActions}>
            <button type="button" style={styles.secondaryAction} onClick={() => onJump('swallow')}>
              Swallow
            </button>
            <button type="button" style={styles.primaryAction} onClick={() => onJump('report')}>
              Report <ChevronRight size={14} />
            </button>
            <button type="button" style={styles.iconAction} onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </header>

        <nav className="dt-drawer-tabs" style={styles.drawerTabs} aria-label="Patient analytics tabs">
          {([
            ['overview', 'Overview', Activity],
            ['icf', 'WHO-ICF', HeartPulse],
            ['trends', 'Score trends', LineChart],
            ['plan', 'Plan', Dumbbell],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              style={tab === key ? styles.drawerTabActive : styles.drawerTab}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </nav>

        <div className="dt-drawer-body" style={styles.drawerBody}>
          {tab === 'overview' && <PatientOverview patient={patient} />}
          {tab === 'icf' && <IcfTab patient={patient} />}
          {tab === 'trends' && <TrendsTab patient={patient} />}
          {tab === 'plan' && <PlanTab patient={patient} onJump={onJump} />}
        </div>
      </aside>
    </div>
  );
}

function PatientOverview({ patient }: { patient: PatientCaseloadEntry }) {
  return (
    <div style={styles.drawerGrid}>
      <section style={styles.drawerCardWide}>
        <div style={styles.drawerCardHeader}>
          <h3 style={styles.drawerCardTitle}>Predictive insights</h3>
          <Sparkles size={15} color="#1f5c4a" />
        </div>
        <div style={styles.insightList}>
          {patient.alerts.length > 0 ? patient.alerts.map((alert) => (
            <div key={alert} style={styles.alertInsight}>
              <AlertTriangle size={15} color="#a8402b" />
              <span>{cleanText(alert)}</span>
              <button type="button" style={styles.ackButton}><Check size={12} /> Ack</button>
            </div>
          )) : (
            <div style={styles.okBanner}>No active alerts recorded for this patient.</div>
          )}
        </div>
      </section>

      <section style={styles.drawerMetricGrid}>
        <ScoreTile label="PAS" value={patient.pas} max={8} bad={patient.pas >= 5} note="Penetration aspiration" />
        <ScoreTile label="FOIS" value={patient.fois} max={7} bad={patient.fois <= 3} note="Oral intake" />
        <ScoreTile label="EAT-10" value={patient.eat10} max={40} bad={patient.eat10 >= 20} note="Swallow burden" />
        <ScoreTile label="Jaw" value={patient.jawOpening} max={50} suffix="mm" bad={patient.jawOpening <= 30} note="Inter-incisal" />
      </section>

      <RiskHeatmap patient={patient} />
      <AdherenceDonut patient={patient} />
      <MilestoneTimeline patient={patient} />
      <AlertsAndConcerns patient={patient} />
    </div>
  );
}

function IcfTab({ patient }: { patient: PatientCaseloadEntry }) {
  return (
    <div style={styles.icfDrawerGrid}>
      <section style={styles.drawerCard}>
        <div style={styles.drawerCardHeader}>
          <h3 style={styles.drawerCardTitle}>WHO-ICF profile</h3>
          <HeartPulse size={15} color="#1f5c4a" />
        </div>
        <IcfRadar patient={patient} />
      </section>
      <section style={styles.drawerCard}>
        <div style={styles.drawerCardHeader}>
          <h3 style={styles.drawerCardTitle}>Qualifier dimensions</h3>
        </div>
        <div style={styles.icfDimensionList}>
          {Object.entries(patient.icfQualifiers).map(([code, value]) => (
            <div key={code} style={styles.icfDimensionRow}>
              <span style={styles.icfCode}>{code}</span>
              <span style={styles.icfBars}>
                {[0, 1, 2, 3].map((level) => (
                  <span
                    key={level}
                    style={{
                      ...styles.icfBar,
                      background: level < value ? qualifierColor(value) : '#dce5df',
                    }}
                  />
                ))}
              </span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TrendsTab({ patient }: { patient: PatientCaseloadEntry }) {
  return (
    <div style={styles.trendBlocks}>
      <TrendBlock patient={patient} dataKey="eat10" title="EAT-10" max={40} color="#a8402b" lowerBetter />
      <TrendBlock patient={patient} dataKey="fois" title="FOIS" max={7} min={1} color="#2f7a5c" />
      <TrendBlock patient={patient} dataKey="jawOpening" title="Jaw opening" max={55} min={15} color="#5b4bb7" />
      <TrendBlock patient={patient} dataKey="pas" title="PAS" max={8} color="#b7791f" lowerBetter />
    </div>
  );
}

function PlanTab({
  patient,
  onJump,
}: {
  patient: PatientCaseloadEntry;
  onJump: (section: HncSectionId) => void;
}) {
  const protocols = [
    ['Effortful swallow', 'Pharyngeal pressure', '3 x 10', patient.adherence],
    ['Masako maneuver', 'Tongue base drive', '3 x 10', Math.max(52, patient.adherence - 8)],
    ['Jaw range program', 'Trismus prevention', '5 x 5 sec', Math.max(45, patient.adherence - 14)],
    ['Speech articulation drills', 'Intelligibility', '15 min', Math.min(99, patient.adherence + 4)],
  ];

  return (
    <div style={styles.drawerGrid}>
      <section style={styles.drawerCardWide}>
        <div style={styles.drawerCardHeader}>
          <h3 style={styles.drawerCardTitle}>Active prescription</h3>
          <FloatingBadge tone={patient.adherence >= 80 ? 'success' : 'warning'}>
            {patient.adherence}% adherence
          </FloatingBadge>
        </div>
        <div style={styles.protocolTable}>
          {protocols.map(([name, goal, dose, adherence]) => (
            <div key={String(name)} style={styles.protocolRow}>
              <strong>{name}</strong>
              <span>{goal}</span>
              <span>{dose}</span>
              <AdherenceBar value={Number(adherence)} />
            </div>
          ))}
        </div>
      </section>

      <section style={styles.drawerCard}>
        <div style={styles.drawerCardHeader}>
          <h3 style={styles.drawerCardTitle}>Suggested adjustment</h3>
          <Sparkles size={15} color="#1f5c4a" />
        </div>
        <p style={styles.cardText}>
          Jaw opening is {patient.jawOpening} mm. Consider increasing low-pain range work and review trismus precautions at the next contact.
        </p>
        <button type="button" style={styles.primaryAction} onClick={() => onJump('exercise')}>
          Open exercise plan <ChevronRight size={14} />
        </button>
      </section>

      <section style={styles.drawerCard}>
        <div style={styles.drawerCardHeader}>
          <h3 style={styles.drawerCardTitle}>Primary concerns</h3>
        </div>
        <div style={styles.concernsChips}>
          {patient.primaryConcerns.map((concern) => (
            <span key={concern} style={styles.concernChip}>{cleanText(concern)}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  max,
  suffix,
  bad,
  note,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  bad?: boolean;
  note: string;
}) {
  const color = bad ? '#a8402b' : '#2f7a5c';
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={styles.scoreTile}>
      <div style={styles.scoreTileTop}>
        <span>{label}</span>
        <small>/{max}</small>
      </div>
      <div style={{ ...styles.scoreTileValue, color }}>
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
      <div style={styles.adherenceTrack}>
        <span style={{ ...styles.adherenceFill, width: `${percent}%`, background: color }} />
      </div>
      <p style={styles.scoreTileNote}>{note}</p>
    </div>
  );
}

function RiskHeatmap({ patient }: { patient: PatientCaseloadEntry }) {
  const rows = [
    { label: 'Aspiration', value: patient.aspirationRisk },
    { label: 'Airway', value: patient.airwayRisk },
    { label: 'Nutrition', value: patient.nutritionRisk },
    { label: 'PAS', value: Math.min(4, Math.ceil(patient.pas / 2)) },
    { label: 'FOIS inv.', value: Math.max(0, 4 - Math.floor(patient.fois / 2)) },
  ];

  return (
    <section style={styles.drawerCard}>
      <div style={styles.drawerCardHeader}>
        <h3 style={styles.drawerCardTitle}>Risk heatmap</h3>
        <AlertTriangle size={15} color="#a8402b" />
      </div>
      <div style={styles.heatGrid}>
        {rows.map((row) => (
          <div key={row.label} style={styles.heatRow}>
            <span>{row.label}</span>
            <span style={styles.heatCells}>
              {[0, 1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  style={{
                    ...styles.heatCell,
                    background: level < row.value ? qualifierColor(row.value) : '#dce5df',
                  }}
                />
              ))}
            </span>
            <strong style={{ color: qualifierColor(row.value) }}>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function IcfRadar({ patient }: { patient: PatientCaseloadEntry }) {
  const axes = Object.keys(patient.icfQualifiers) as Array<keyof typeof patient.icfQualifiers>;
  const size = 260;
  const center = size / 2;
  const radius = center - 36;
  const maxValue = 4;
  const angleFor = (index: number) => (Math.PI * 2 * index) / axes.length - Math.PI / 2;
  const pointFor = (index: number, value: number) => {
    const angle = angleFor(index);
    const r = (value / maxValue) * radius;
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
    };
  };
  const polygon = axes
    .map((axis, index) => {
      const point = pointFor(index, patient.icfQualifiers[axis]);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="WHO ICF radar chart">
      {[1, 2, 3, 4].map((level) => (
        <polygon
          key={level}
          points={axes
            .map((_, index) => {
              const point = pointFor(index, level);
              return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
            })
            .join(' ')}
          fill="none"
          stroke="#dce5df"
        />
      ))}
      {axes.map((axis, index) => {
        const edge = pointFor(index, maxValue);
        const label = pointFor(index, maxValue + 0.35);
        return (
          <g key={axis}>
            <line x1={center} y1={center} x2={edge.x} y2={edge.y} stroke="#dce5df" />
            <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="#3e5852">
              {axis}
            </text>
          </g>
        );
      })}
      <polygon points={polygon} fill="rgba(31, 92, 74, 0.18)" stroke="#1f5c4a" strokeWidth="2" />
    </svg>
  );
}

function AdherenceDonut({ patient }: { patient: PatientCaseloadEntry }) {
  const size = 128;
  const stroke = 13;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (patient.adherence / 100) * circumference;
  const color = patient.adherence >= 85 ? '#2f7a5c' : patient.adherence >= 65 ? '#b7791f' : '#a8402b';

  return (
    <section style={styles.drawerCard}>
      <div style={styles.drawerCardHeader}>
        <h3 style={styles.drawerCardTitle}>Home adherence</h3>
        <Activity size={15} color={color} />
      </div>
      <div style={styles.donutLayout}>
        <svg width={size} height={size} aria-label="Adherence donut">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#dce5df" strokeWidth={stroke} fill="none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="900" fill="#15302a">
            {patient.adherence}%
          </text>
        </svg>
        <div style={styles.donutMeta}>
          <MiniMetric label="Last visit" value={patient.lastVisit} />
          <MiniMetric label="Next review" value={formatReviewDate(patient.nextReview)} />
        </div>
      </div>
    </section>
  );
}

function MilestoneTimeline({ patient }: { patient: PatientCaseloadEntry }) {
  return (
    <section style={styles.drawerCardWide}>
      <div style={styles.drawerCardHeader}>
        <h3 style={styles.drawerCardTitle}>Treatment milestones</h3>
        <CalendarClock size={15} color="#4d6660" />
      </div>
      <ol style={styles.timeline}>
        {patient.milestones.map((milestone, index) => {
          const color =
            milestone.status === 'done' ? '#2f7a5c' :
            milestone.status === 'current' ? '#204a6b' :
            '#8fa79d';
          return (
            <li key={`${milestone.label}-${index}`} style={styles.timelineItem}>
              <span style={{ ...styles.timelineDot, background: color }} />
              <div style={styles.timelineCard}>
                <strong>{cleanText(milestone.label)}</strong>
                <span>{milestone.date}</span>
                {milestone.note && <small>{cleanText(milestone.note)}</small>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function AlertsAndConcerns({ patient }: { patient: PatientCaseloadEntry }) {
  return (
    <section style={styles.drawerCard}>
      <div style={styles.drawerCardHeader}>
        <h3 style={styles.drawerCardTitle}>Concerns</h3>
        <ClipboardList size={15} color="#4d6660" />
      </div>
      <div style={styles.concernsChips}>
        {patient.primaryConcerns.map((concern) => (
          <span key={concern} style={styles.concernChip}>{cleanText(concern)}</span>
        ))}
      </div>
    </section>
  );
}

function TrendBlock({
  patient,
  dataKey,
  title,
  max,
  min = 0,
  color,
  lowerBetter,
}: {
  patient: PatientCaseloadEntry;
  dataKey: keyof PatientCaseloadEntry['trends'][number];
  title: string;
  max: number;
  min?: number;
  color: string;
  lowerBetter?: boolean;
}) {
  const values = patient.trends.map((point) => Number(point[dataKey]));
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? first;
  const delta = Math.round((last - first) * 10) / 10;
  const good = lowerBetter ? delta <= 0 : delta >= 0;

  return (
    <section style={styles.drawerCardWide}>
      <div style={styles.drawerCardHeader}>
        <div>
          <h3 style={styles.drawerCardTitle}>{title}</h3>
          <p style={styles.railSub}>{lowerBetter ? 'Lower is better' : 'Higher is better'}</p>
        </div>
        <div style={styles.trendStats}>
          <MiniMetric label="Baseline" value={first} />
          <MiniMetric label="Current" value={last} />
          <span style={{ ...styles.deltaPill, color: good ? '#2f7a5c' : '#a8402b', background: good ? '#ddefe5' : '#fbe4dd' }}>
            {good ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {delta > 0 ? `+${delta}` : delta}
          </span>
        </div>
      </div>
      <LineChartSvg points={values} max={max} min={min} color={color} />
    </section>
  );
}

function LineChartSvg({
  points,
  color,
  min,
  max,
}: {
  points: number[];
  color: string;
  min: number;
  max: number;
}) {
  const width = 720;
  const height = 190;
  const padding = { top: 16, right: 18, bottom: 26, left: 34 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const range = max - min || 1;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const coords = points.map((value, index) => ({
    x: padding.left + index * stepX,
    y: padding.top + (1 - (value - min) / range) * innerH,
  }));
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${coords[coords.length - 1]?.x ?? padding.left} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Score trend chart">
      <rect x={padding.left} y={padding.top} width={innerW} height={innerH} fill="#f5f8f5" stroke="#dce5df" />
      {[0.25, 0.5, 0.75].map((fraction) => (
        <line
          key={fraction}
          x1={padding.left}
          y1={padding.top + innerH * fraction}
          x2={padding.left + innerW}
          y2={padding.top + innerH * fraction}
          stroke="#dce5df"
          strokeDasharray="3 3"
        />
      ))}
      <path d={areaPath} fill={`${color}18`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="3" fill={color} />
      ))}
    </svg>
  );
}

function Sparkline({
  points,
  accent,
  width,
  height,
  filled,
}: {
  points: number[];
  accent: string;
  width: number;
  height: number;
  filled?: boolean;
}) {
  if (points.length < 2) {
    return <span style={styles.mutedText}>No trend</span>;
  }
  const padding = 3;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (points.length - 1);
  const coords = points.map((value, index) => {
    const x = padding + index * stepX;
    const y = padding + (1 - (value - min) / range) * (height - padding * 2);
    return { x, y };
  });
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padding} L ${coords[0].x.toFixed(1)} ${height - padding} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={styles.sparkSvg} role="img" aria-label="Trend sparkline">
      {filled && <path d={areaPath} fill={`${accent}20`} />}
      <path d={path} stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const qualifierColor = (value: number): string => {
  if (value >= 4) return '#a8402b';
  if (value >= 3) return '#ea580c';
  if (value >= 2) return '#ca8a04';
  if (value >= 1) return '#65a30d';
  return '#2f7a5c';
};

const styles: Record<string, React.CSSProperties> = {
  dashboardShell: {
    display: 'grid',
    gap: '14px',
  },
  dashboardTopbar: {
    minHeight: '52px',
    border: '1px solid #dce5df',
    borderRadius: 8,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '10px 14px',
  },
  overline: {
    margin: 0,
    color: '#5b6d7c',
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  dashboardTitle: {
    margin: '2px 0 0',
    color: '#173451',
    fontSize: 18,
    lineHeight: 1.15,
    fontWeight: 850,
  },
  topbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  topbarBadge: {
    border: '1px solid #c9ddd0',
    background: '#edf2f7',
    color: '#174a3c',
    borderRadius: 999,
    padding: '5px 9px',
    fontSize: 11,
    fontWeight: 850,
    whiteSpace: 'nowrap',
  },
  topbarMeta: {
    color: '#5b6d7c',
    fontSize: 11,
    fontWeight: 700,
  },
  kpiStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(120px, 1fr))',
    border: '1px solid #dce5df',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#ffffff',
  },
  kpiCell: {
    minHeight: 92,
    padding: '12px 14px',
    borderRight: '1px solid #dce5df',
    display: 'grid',
    gap: 4,
    alignContent: 'start',
  },
  kpiLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    color: '#5b6d7c',
    fontSize: 10.5,
    fontWeight: 850,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  kpiIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
  },
  kpiValue: {
    fontSize: 26,
    lineHeight: 1.05,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  kpiSub: {
    color: '#5b6d7c',
    fontSize: 11,
    lineHeight: 1.25,
  },
  dashboardColumns: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 320px',
    gap: 14,
    alignItems: 'start',
  },
  queuePanel: {
    minWidth: 0,
    border: '1px solid #dce5df',
    background: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  queueToolbar: {
    minHeight: 48,
    borderBottom: '1px solid #dce5df',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  queueTitleBlock: {
    display: 'grid',
    gap: 1,
    minWidth: 140,
  },
  queueTitle: {
    color: '#173451',
    fontSize: 13,
    fontWeight: 850,
  },
  queueCount: {
    color: '#5b6d7c',
    fontSize: 11,
    fontWeight: 650,
  },
  filterGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    border: '1px solid #dce5df',
    background: '#f5f8f5',
    borderRadius: 8,
    padding: 3,
  },
  segment: {
    minHeight: 26,
    border: 0,
    background: 'transparent',
    color: '#475d70',
    borderRadius: 6,
    padding: '0 8px',
    fontSize: 11,
    fontWeight: 750,
    cursor: 'pointer',
  },
  segmentActive: {
    minHeight: 26,
    border: 0,
    background: '#ffffff',
    color: '#173451',
    borderRadius: 6,
    padding: '0 8px',
    fontSize: 11,
    fontWeight: 850,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
  },
  phaseSelect: {
    minHeight: 34,
    border: '1px solid #dce5df',
    borderRadius: 8,
    background: '#ffffff',
    color: '#173451',
    padding: '0 10px',
    fontSize: 12,
    fontWeight: 700,
  },
  searchWrap: {
    minHeight: 34,
    minWidth: 220,
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    border: '1px solid #dce5df',
    background: '#f9fbf9',
    borderRadius: 8,
    padding: '0 10px',
    flex: '1 1 220px',
    maxWidth: 340,
  },
  searchInput: {
    width: '100%',
    minWidth: 0,
    border: 0,
    outline: 0,
    background: 'transparent',
    color: '#173451',
    fontSize: 12,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  tableHeader: {
    minWidth: 1040,
    display: 'grid',
    gridTemplateColumns: '34px minmax(150px, 1.25fr) minmax(190px, 1.55fr) 82px 48px 52px 62px 62px 74px 86px 88px 64px 88px',
    gap: 8,
    alignItems: 'center',
    minHeight: 34,
    padding: '0 12px',
    borderBottom: '1px solid #dce5df',
    color: '#5b6d7c',
    fontSize: 10,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0,
    background: '#f5f8f5',
  },
  tableBody: {
    minWidth: 1040,
  },
  sortButton: {
    border: 0,
    padding: 0,
    background: 'transparent',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    cursor: 'pointer',
    font: 'inherit',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  sortButtonRight: {
    justifyContent: 'flex-end',
    textAlign: 'right',
  },
  alignRight: {
    textAlign: 'right',
  },
  patientRow: {
    width: '100%',
    minWidth: 1040,
    minHeight: 48,
    border: 0,
    borderBottom: '1px solid #eef2f7',
    background: '#ffffff',
    display: 'grid',
    gridTemplateColumns: '34px minmax(150px, 1.25fr) minmax(190px, 1.55fr) 82px 48px 52px 62px 62px 74px 86px 88px 64px 88px',
    gap: 8,
    alignItems: 'center',
    padding: '6px 12px',
    textAlign: 'left',
    cursor: 'pointer',
    color: '#173451',
  },
  patientRowSelected: {
    background: '#f5f8f5',
    boxShadow: 'inset 3px 0 0 #1f5c4a',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 900,
    display: 'grid',
    placeItems: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  patientIdentity: {
    display: 'grid',
    minWidth: 0,
    gap: 1,
    fontSize: 12,
  },
  diagnosisCell: {
    display: 'grid',
    minWidth: 0,
    gap: 1,
    fontSize: 11.5,
    color: '#475d70',
  },
  reviewCell: {
    display: 'grid',
    gap: 1,
    fontSize: 11,
    color: '#475d70',
  },
  riskPill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: 'fit-content',
    borderRadius: 6,
    padding: '4px 7px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    boxShadow: '0 0 0 3px currentColor',
    opacity: 0.72,
  },
  scoreCell: {
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  adherenceWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    width: '100%',
    fontSize: 11,
    fontVariantNumeric: 'tabular-nums',
  },
  adherenceTrack: {
    position: 'relative',
    display: 'block',
    height: 6,
    minWidth: 44,
    borderRadius: 999,
    background: '#dce5df',
    overflow: 'hidden',
  },
  adherenceFill: {
    position: 'absolute',
    inset: '0 auto 0 0',
    borderRadius: 999,
  },
  alertCell: {
    display: 'flex',
    alignItems: 'center',
  },
  alertPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    padding: '3px 6px',
    fontSize: 10,
    fontWeight: 900,
  },
  mutedText: {
    color: '#8fa79d',
    fontSize: 11,
    fontWeight: 700,
  },
  rowActions: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  rowActionButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    border: '1px solid #dce5df',
    background: '#f5f8f5',
    color: '#5b6d7c',
    display: 'grid',
    placeItems: 'center',
  },
  sparkSvg: {
    display: 'block',
    maxWidth: '100%',
  },
  emptyState: {
    padding: 28,
    color: '#5b6d7c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontSize: 13,
  },
  sideRail: {
    display: 'grid',
    gap: 12,
  },
  railPanel: {
    border: '1px solid #dce5df',
    borderRadius: 8,
    background: '#ffffff',
    padding: '12px',
    display: 'grid',
    gap: 10,
  },
  railHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  railTitle: {
    margin: 0,
    color: '#173451',
    fontSize: 13,
    lineHeight: 1.2,
    fontWeight: 850,
  },
  railSub: {
    margin: '3px 0 0',
    color: '#5b6d7c',
    fontSize: 11,
    lineHeight: 1.35,
  },
  riskPanelBody: {
    display: 'grid',
    gridTemplateColumns: '124px minmax(0, 1fr)',
    gap: 12,
    alignItems: 'center',
  },
  riskLegend: {
    display: 'grid',
    gap: 7,
  },
  legendRow: {
    display: 'grid',
    gridTemplateColumns: '10px minmax(0, 1fr) auto',
    gap: 7,
    alignItems: 'center',
    color: '#475d70',
    fontSize: 11,
    textTransform: 'capitalize',
  },
  legendSwatch: {
    width: 9,
    height: 9,
    borderRadius: 3,
  },
  phaseStack: {
    display: 'flex',
    width: '100%',
    height: 12,
    borderRadius: 8,
    overflow: 'hidden',
    background: '#dce5df',
  },
  phaseSegment: {
    display: 'block',
    height: '100%',
  },
  phaseLegend: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 7,
  },
  trendCaption: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#5b6d7c',
    fontSize: 11,
  },
  insightList: {
    display: 'grid',
    gap: 7,
  },
  insightRow: {
    width: '100%',
    border: 0,
    borderRadius: 8,
    background: '#f5f8f5',
    color: '#173451',
    padding: '8px 9px',
    display: 'grid',
    gridTemplateColumns: '22px minmax(0, 1fr)',
    gap: 8,
    alignItems: 'center',
    textAlign: 'left',
    cursor: 'pointer',
  },
  insightIcon: {
    display: 'grid',
    placeItems: 'center',
  },
  insightText: {
    display: 'grid',
    gap: 2,
    minWidth: 0,
    fontSize: 11.5,
    color: '#475d70',
  },
  activeCard: {
    border: '1px solid #c9ddd0',
    borderRadius: 8,
    background: '#edf2f7',
    padding: 12,
    display: 'grid',
    gap: 12,
  },
  activeHeader: {
    display: 'grid',
    gridTemplateColumns: '32px minmax(0, 1fr)',
    gap: 10,
    alignItems: 'center',
  },
  activeName: {
    margin: '3px 0 0',
    color: '#173451',
    fontSize: 14,
    lineHeight: 1.2,
    fontWeight: 850,
  },
  activeScores: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 7,
  },
  activeActions: {
    display: 'flex',
    gap: 7,
    flexWrap: 'wrap',
  },
  miniMetric: {
    border: '1px solid rgba(21, 48, 42, 0.10)',
    background: 'rgba(255, 255, 255, 0.72)',
    borderRadius: 8,
    padding: '8px 9px',
    display: 'grid',
    gap: 2,
    color: '#5b6d7c',
    fontSize: 10.5,
    fontWeight: 750,
  },
  primaryAction: {
    minHeight: 34,
    border: '1px solid #1f5c4a',
    borderRadius: 8,
    background: '#204a6b',
    color: '#ffffff',
    padding: '0 11px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 850,
  },
  secondaryAction: {
    minHeight: 34,
    border: '1px solid #c9d7ce',
    borderRadius: 8,
    background: '#ffffff',
    color: '#173451',
    padding: '0 11px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 800,
  },
  drawerShell: {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  drawerBackdrop: {
    position: 'absolute',
    inset: 0,
    border: 0,
    background: 'rgba(15, 23, 42, 0.28)',
    cursor: 'pointer',
  },
  drawerPanel: {
    position: 'relative',
    zIndex: 1,
    width: 'min(980px, 72vw)',
    minWidth: 760,
    height: '100%',
    background: '#ffffff',
    borderLeft: '1px solid #dce5df',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-24px 0 60px rgba(15, 23, 42, 0.18)',
  },
  drawerHeader: {
    borderBottom: '1px solid #dce5df',
    padding: '14px 18px',
    display: 'grid',
    gridTemplateColumns: '44px minmax(0, 1fr) auto',
    gap: 12,
    alignItems: 'center',
  },
  drawerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    color: '#ffffff',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 900,
    fontSize: 13,
  },
  drawerIdentity: {
    minWidth: 0,
    display: 'grid',
    gap: 3,
  },
  drawerTitleLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  drawerTitle: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.2,
    color: '#173451',
  },
  drawerId: {
    color: '#5b6d7c',
    fontSize: 11,
    fontWeight: 800,
    fontVariantNumeric: 'tabular-nums',
  },
  drawerSubtitle: {
    margin: 0,
    color: '#475d70',
    fontSize: 12,
    lineHeight: 1.35,
  },
  drawerActions: {
    display: 'flex',
    gap: 7,
    alignItems: 'center',
  },
  iconAction: {
    width: 34,
    height: 34,
    border: '1px solid #c9d7ce',
    borderRadius: 8,
    background: '#ffffff',
    color: '#173451',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },
  drawerTabs: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #dce5df',
    padding: '0 18px',
  },
  drawerTab: {
    height: 40,
    border: 0,
    borderBottom: '2px solid transparent',
    background: 'transparent',
    color: '#5b6d7c',
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 800,
  },
  drawerTabActive: {
    height: 40,
    border: 0,
    borderBottom: '2px solid #1f5c4a',
    background: 'transparent',
    color: '#204a6b',
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 900,
  },
  drawerBody: {
    flex: 1,
    overflowY: 'auto',
    padding: 18,
    background: '#f3f6f3',
  },
  drawerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
  },
  icfDrawerGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 320px',
    gap: 12,
  },
  drawerCard: {
    border: '1px solid #dce5df',
    borderRadius: 8,
    background: '#ffffff',
    padding: 14,
    display: 'grid',
    gap: 10,
  },
  drawerCardWide: {
    gridColumn: '1 / -1',
    border: '1px solid #dce5df',
    borderRadius: 8,
    background: '#ffffff',
    padding: 14,
    display: 'grid',
    gap: 10,
  },
  drawerCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  drawerCardTitle: {
    margin: 0,
    color: '#173451',
    fontSize: 13,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  drawerMetricGrid: {
    gridColumn: '1 / -1',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 10,
  },
  alertInsight: {
    display: 'grid',
    gridTemplateColumns: '20px minmax(0, 1fr) auto',
    gap: 8,
    alignItems: 'center',
    border: '1px solid #fbe4dd',
    background: '#fff7f7',
    color: '#7f1d1d',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 12,
  },
  ackButton: {
    minHeight: 26,
    border: '1px solid #f5cdbf',
    background: '#ffffff',
    color: '#8e3420',
    borderRadius: 7,
    padding: '0 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    fontWeight: 850,
    cursor: 'pointer',
  },
  okBanner: {
    border: '1px solid #c9ddd0',
    background: '#f0fdf4',
    color: '#1f5c43',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 12,
    fontWeight: 750,
  },
  scoreTile: {
    border: '1px solid #dce5df',
    background: '#ffffff',
    borderRadius: 8,
    padding: 12,
    display: 'grid',
    gap: 6,
  },
  scoreTileTop: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#5b6d7c',
    fontSize: 10.5,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  scoreTileValue: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 4,
    fontSize: 25,
    lineHeight: 1,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  scoreTileNote: {
    margin: 0,
    color: '#5b6d7c',
    fontSize: 11,
    lineHeight: 1.25,
  },
  heatGrid: {
    display: 'grid',
    gap: 8,
  },
  heatRow: {
    display: 'grid',
    gridTemplateColumns: '86px minmax(0, 1fr) 24px',
    gap: 8,
    alignItems: 'center',
    color: '#475d70',
    fontSize: 12,
    fontWeight: 750,
  },
  heatCells: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: 3,
  },
  heatCell: {
    height: 13,
    borderRadius: 3,
  },
  donutLayout: {
    display: 'grid',
    gridTemplateColumns: '132px minmax(0, 1fr)',
    gap: 12,
    alignItems: 'center',
  },
  donutMeta: {
    display: 'grid',
    gap: 8,
  },
  timeline: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 9,
  },
  timelineItem: {
    display: 'grid',
    gap: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  timelineCard: {
    border: '1px solid #dce5df',
    background: '#f5f8f5',
    borderRadius: 8,
    padding: '8px 9px',
    color: '#475d70',
    fontSize: 11,
    display: 'grid',
    gap: 2,
  },
  concernsChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 7,
  },
  concernChip: {
    border: '1px solid #c9ddd0',
    background: '#edf2f7',
    color: '#174a3c',
    borderRadius: 999,
    padding: '5px 9px',
    fontSize: 11,
    fontWeight: 850,
  },
  icfDimensionList: {
    display: 'grid',
    gap: 8,
  },
  icfDimensionRow: {
    display: 'grid',
    gridTemplateColumns: '58px minmax(0, 1fr) 22px',
    gap: 8,
    alignItems: 'center',
    color: '#475d70',
    fontSize: 12,
  },
  icfCode: {
    color: '#174a3c',
    background: '#edf2f7',
    borderRadius: 5,
    padding: '3px 6px',
    fontFamily: 'Consolas, monospace',
    fontSize: 11,
    fontWeight: 900,
  },
  icfBars: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 3,
  },
  icfBar: {
    height: 9,
    borderRadius: 3,
  },
  trendBlocks: {
    display: 'grid',
    gap: 12,
  },
  trendStats: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  deltaPill: {
    minHeight: 30,
    borderRadius: 999,
    padding: '0 9px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  protocolTable: {
    border: '1px solid #dce5df',
    borderRadius: 8,
    overflow: 'hidden',
  },
  protocolRow: {
    minHeight: 42,
    borderBottom: '1px solid #dce5df',
    padding: '8px 10px',
    display: 'grid',
    gridTemplateColumns: 'minmax(150px, 1.2fr) minmax(150px, 1fr) 90px 92px',
    gap: 10,
    alignItems: 'center',
    color: '#475d70',
    fontSize: 12,
  },
  cardText: {
    margin: 0,
    color: '#475d70',
    fontSize: 12,
    lineHeight: 1.5,
  },
};
