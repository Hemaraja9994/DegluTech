import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Filter,
  HeartPulse,
  LineChart,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  CASELOAD_PATIENTS,
  computeCaseloadKpis,
  syncActivePatientFromFieldState,
  type PatientCaseloadEntry,
  type RiskLevel,
} from '../caseloadData';
import type { FieldState } from '../reportEngine';
import type { HncSectionId } from '../../../../packages/core/src/hncClinicalModel';

interface ClinicianDashboardProps {
  fieldState: FieldState;
  completion: number;
  savedAt: string;
  onJump: (section: HncSectionId) => void;
}

type SortKey = 'risk' | 'review' | 'adherence' | 'severity';
type RiskFilter = 'all' | RiskLevel;

const RISK_PALETTE: Record<RiskLevel, { bg: string; fg: string; border: string }> = {
  high: { bg: '#fef2f2', fg: '#991b1b', border: '#dc2626' },
  moderate: { bg: '#fffbeb', fg: '#92400e', border: '#f59e0b' },
  low: { bg: '#ecfdf5', fg: '#065f46', border: '#10b981' },
};

const SEVERITY_ORDER: Record<string, number> = {
  None: 0,
  Mild: 1,
  Moderate: 2,
  Severe: 3,
  Profound: 4,
};

export const ClinicianDashboard: React.FC<ClinicianDashboardProps> = ({
  fieldState,
  completion,
  savedAt,
  onJump,
}) => {
  const [selectedId, setSelectedId] = useState<string>('HNC-2026-001');
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('risk');

  const patients = useMemo<PatientCaseloadEntry[]>(() => {
    return CASELOAD_PATIENTS.map((patient) =>
      patient.isActive ? syncActivePatientFromFieldState(patient, fieldState) : patient
    );
  }, [fieldState]);

  const filteredPatients = useMemo(() => {
    const lower = search.trim().toLowerCase();
    let result = patients.filter((patient) => {
      if (riskFilter !== 'all' && patient.riskLevel !== riskFilter) return false;
      if (lower.length === 0) return true;
      return (
        patient.displayName.toLowerCase().includes(lower) ||
        patient.id.toLowerCase().includes(lower) ||
        patient.diagnosis.toLowerCase().includes(lower) ||
        patient.tumorSite.toLowerCase().includes(lower)
      );
    });

    const riskWeight: Record<RiskLevel, number> = { high: 0, moderate: 1, low: 2 };
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'risk':
          return riskWeight[a.riskLevel] - riskWeight[b.riskLevel];
        case 'review':
          return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime();
        case 'adherence':
          return a.adherence - b.adherence;
        case 'severity':
          return (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [patients, search, riskFilter, sortBy]);

  const kpis = useMemo(() => computeCaseloadKpis(patients), [patients]);

  const selectedPatient =
    patients.find((p) => p.id === selectedId) ??
    patients.find((p) => p.isActive) ??
    patients[0];

  return (
    <div style={styles.workspaceGrid}>
      <section style={styles.heroPanel}>
        <div style={styles.heroCopy}>
          <p style={styles.overline}>Clinician dashboard</p>
          <h3 style={styles.heroTitle}>HNC SLP caseload — live overview</h3>
          <p style={styles.heroText}>
            Triage your full panel, monitor progress trends, and drill into any patient for an ICF-aligned
            analytics view. The active workspace patient updates live as you edit upstream sections.
          </p>
        </div>
        <div style={styles.statusPanel}>
          <div style={styles.largeNumber}>{completion}%</div>
          <div style={styles.statusLabel}>active-patient data quality</div>
          <div style={styles.savedLine}>Saved: {savedAt}</div>
        </div>
      </section>

      <KpiBar kpis={kpis} />

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <p style={styles.overline}>Caseload</p>
            <h3 style={styles.panelTitle}>
              {filteredPatients.length} of {patients.length} patients shown
            </h3>
          </div>
          <CaseloadFilters
            search={search}
            setSearch={setSearch}
            riskFilter={riskFilter}
            setRiskFilter={setRiskFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </div>

        <div style={styles.caseloadGrid}>
          {filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              isSelected={patient.id === selectedPatient?.id}
              onSelect={() => setSelectedId(patient.id)}
            />
          ))}
          {filteredPatients.length === 0 && (
            <div style={styles.emptyState}>
              <Search size={20} color="#94a3b8" />
              <span>No patients match the current filters.</span>
            </div>
          )}
        </div>
      </section>

      {selectedPatient && (
        <PatientAnalytics patient={selectedPatient} onJump={onJump} />
      )}
    </div>
  );
};

function KpiBar({ kpis }: { kpis: ReturnType<typeof computeCaseloadKpis> }) {
  const tiles = [
    { label: 'Active patients', value: kpis.total, icon: <Users size={16} />, accent: '#1d4ed8' },
    { label: 'High risk', value: kpis.highRisk, icon: <AlertTriangle size={16} />, accent: '#dc2626' },
    { label: 'Review within 7d', value: kpis.reviewDue, icon: <CalendarClock size={16} />, accent: '#0f766e' },
    { label: 'Mean adherence', value: `${kpis.adherenceMean}%`, icon: <Activity size={16} />, accent: '#7c3aed' },
    { label: 'Severe / profound', value: kpis.severeOrProfound, icon: <HeartPulse size={16} />, accent: '#b45309' },
    { label: 'PEG / NGT', value: kpis.pegOrNgtDependent, icon: <ClipboardList size={16} />, accent: '#0891b2' },
  ];

  return (
    <section style={styles.kpiGrid}>
      {tiles.map((tile) => (
        <div key={tile.label} style={styles.kpiCard}>
          <div style={{ ...styles.kpiIcon, color: tile.accent, background: `${tile.accent}15` }}>
            {tile.icon}
          </div>
          <div style={styles.kpiBody}>
            <div style={styles.kpiLabel}>{tile.label}</div>
            <div style={styles.kpiValue}>{tile.value}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function CaseloadFilters({
  search,
  setSearch,
  riskFilter,
  setRiskFilter,
  sortBy,
  setSortBy,
}: {
  search: string;
  setSearch: (value: string) => void;
  riskFilter: RiskFilter;
  setRiskFilter: (value: RiskFilter) => void;
  sortBy: SortKey;
  setSortBy: (value: SortKey) => void;
}) {
  return (
    <div style={styles.filterRow}>
      <label style={styles.searchWrap}>
        <Search size={14} color="#64748b" />
        <input
          type="search"
          placeholder="Search patient, ID, diagnosis…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={styles.searchInput}
        />
      </label>
      <div style={styles.filterChips}>
        <Filter size={14} color="#64748b" />
        {(['all', 'high', 'moderate', 'low'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRiskFilter(option)}
            style={riskFilter === option ? styles.filterChipActive : styles.filterChip}
          >
            {option === 'all' ? 'All risk' : option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
      <select
        value={sortBy}
        onChange={(event) => setSortBy(event.target.value as SortKey)}
        style={styles.sortSelect}
        aria-label="Sort caseload"
      >
        <option value="risk">Sort: Risk (high → low)</option>
        <option value="review">Sort: Next review (soonest)</option>
        <option value="adherence">Sort: Adherence (lowest)</option>
        <option value="severity">Sort: Severity (highest)</option>
      </select>
    </div>
  );
}

function PatientCard({
  patient,
  isSelected,
  onSelect,
}: {
  patient: PatientCaseloadEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const palette = RISK_PALETTE[patient.riskLevel];
  const trend = patient.trends[patient.trends.length - 1]?.eat10 ?? 0;
  const previous = patient.trends[patient.trends.length - 2]?.eat10 ?? trend;
  const delta = trend - previous;
  const improving = delta < 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        ...styles.patientCard,
        borderColor: isSelected ? '#1d4ed8' : '#dbe4ef',
        boxShadow: isSelected ? '0 0 0 3px rgba(29, 78, 216, 0.12)' : 'none',
        background: isSelected ? '#f8fafc' : '#ffffff',
      }}
      aria-pressed={isSelected}
    >
      <div style={styles.patientCardHeader}>
        <div>
          <div style={styles.patientName}>{patient.displayName}</div>
          <div style={styles.patientId}>
            {patient.id} · {patient.age} y · {patient.gender}
          </div>
        </div>
        <span
          style={{
            ...styles.riskBadge,
            background: palette.bg,
            color: palette.fg,
            border: `1px solid ${palette.border}`,
          }}
        >
          {patient.riskLevel.toUpperCase()}
        </span>
      </div>

      <div style={styles.diagnosisLine}>{patient.diagnosis}</div>
      <div style={styles.metaRow}>
        <span>{patient.stage}</span>
        <span>·</span>
        <span>{patient.phase}</span>
      </div>

      <div style={styles.patientStats}>
        <Stat label="Severity" value={patient.severity} />
        <Stat label="PAS" value={patient.pas} />
        <Stat label="FOIS" value={patient.fois} />
        <Stat label="Jaw" value={`${patient.jawOpening} mm`} />
      </div>

      <Sparkline points={patient.trends.map((t) => t.eat10)} accent={palette.border} />

      <div style={styles.cardFooter}>
        <span style={styles.footerLabel}>
          EAT-10 {trend} {delta !== 0 && (
            <span style={{ color: improving ? '#065f46' : '#991b1b', fontWeight: 800 }}>
              {improving ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </span>
        <span style={styles.footerReview}>
          <CalendarClock size={12} /> {patient.nextReview}
        </span>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.statCell}>
      <span style={styles.statLabel}>{label}</span>
      <strong style={styles.statValue}>{value}</strong>
    </div>
  );
}

function Sparkline({ points, accent }: { points: number[]; accent: string }) {
  if (points.length < 2) {
    return <div style={styles.sparkPlaceholder}>Single visit recorded — no trend yet.</div>;
  }

  const width = 220;
  const height = 36;
  const padding = 4;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (points.length - 1);

  const coords = points.map((value, index) => {
    const x = padding + index * stepX;
    const y = padding + (1 - (value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padding} L ${coords[0].x.toFixed(1)} ${height - padding} Z`;

  return (
    <svg width={width} height={height} style={styles.sparkSvg} aria-label="EAT-10 trend">
      <path d={areaPath} fill={`${accent}25`} stroke="none" />
      <path d={path} stroke={accent} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={1.8} fill={accent} />
      ))}
    </svg>
  );
}

function PatientAnalytics({
  patient,
  onJump,
}: {
  patient: PatientCaseloadEntry;
  onJump: (section: HncSectionId) => void;
}) {
  return (
    <section style={styles.analyticsPanel}>
      <header style={styles.analyticsHeader}>
        <div>
          <p style={styles.overline}>Patient analytics</p>
          <h3 style={styles.analyticsTitle}>{patient.displayName}</h3>
          <p style={styles.analyticsSub}>
            {patient.diagnosis} · {patient.stage} · {patient.phase} · Route: {patient.currentRoute}
          </p>
        </div>
        <div style={styles.analyticsActions}>
          {patient.isActive && (
            <button type="button" style={styles.actionPrimary} onClick={() => onJump('report')}>
              <Sparkles size={14} /> Open report
            </button>
          )}
          <button type="button" style={styles.actionGhost} onClick={() => onJump('swallow')}>
            Swallow workspace <ChevronRight size={14} />
          </button>
        </div>
      </header>

      <div style={styles.analyticsGrid}>
        <RiskHeatmap patient={patient} />
        <IcfRadar patient={patient} />
        <ScoreTrendChart patient={patient} />
        <AdherenceDonut patient={patient} />
        <MilestoneTimeline patient={patient} />
        <AlertsAndConcerns patient={patient} />
      </div>
    </section>
  );
}

function RiskHeatmap({ patient }: { patient: PatientCaseloadEntry }) {
  const rows = [
    { label: 'Aspiration', value: patient.aspirationRisk },
    { label: 'Airway', value: patient.airwayRisk },
    { label: 'Nutrition', value: patient.nutritionRisk },
    { label: 'PAS', value: Math.min(4, Math.ceil(patient.pas / 2)) },
    { label: 'FOIS (inverted)', value: Math.max(0, 4 - Math.floor(patient.fois / 2)) },
  ];

  const cellColor = (value: number): string => {
    if (value >= 4) return '#dc2626';
    if (value >= 3) return '#ea580c';
    if (value >= 2) return '#ca8a04';
    if (value >= 1) return '#65a30d';
    return '#10b981';
  };

  return (
    <div style={styles.analyticsCard}>
      <h4 style={styles.analyticsCardTitle}>Risk heatmap</h4>
      <div style={styles.heatGrid}>
        {rows.map((row) => (
          <div key={row.label} style={styles.heatRow}>
            <span style={styles.heatLabel}>{row.label}</span>
            <div style={styles.heatCells}>
              {[0, 1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  style={{
                    ...styles.heatCell,
                    background: level <= row.value ? cellColor(row.value) : '#e2e8f0',
                  }}
                />
              ))}
            </div>
            <span style={{ ...styles.heatValue, color: cellColor(row.value) }}>{row.value}</span>
          </div>
        ))}
      </div>
      <p style={styles.cardFootnote}>0 = none · 4 = severe. Cells fill cumulatively with intensity.</p>
    </div>
  );
}

function IcfRadar({ patient }: { patient: PatientCaseloadEntry }) {
  const axes: Array<keyof typeof patient.icfQualifiers> = [
    'b5105',
    'b310',
    'b320',
    's320',
    'd550',
    'd560',
    'd330',
    'e310',
  ];

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;
  const maxValue = 4;

  const angleFor = (index: number) => (Math.PI * 2 * index) / axes.length - Math.PI / 2;

  const points = axes.map((axis, index) => {
    const angle = angleFor(index);
    const value = patient.icfQualifiers[axis];
    const r = (value / maxValue) * radius;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      angle,
      label: axis,
      value,
    };
  });

  const polygon = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const ringValues = [1, 2, 3, 4];

  return (
    <div style={styles.analyticsCard}>
      <h4 style={styles.analyticsCardTitle}>WHO-ICF profile (radar)</h4>
      <svg width={size} height={size} role="img" aria-label="ICF qualifiers radar chart">
        {ringValues.map((value) => (
          <polygon
            key={value}
            points={axes
              .map((_, index) => {
                const angle = angleFor(index);
                const r = (value / maxValue) * radius;
                return `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}
        {axes.map((axis, index) => {
          const angle = angleFor(index);
          const lx = cx + Math.cos(angle) * (radius + 14);
          const ly = cy + Math.sin(angle) * (radius + 14);
          return (
            <g key={axis}>
              <line
                x1={cx}
                y1={cy}
                x2={cx + Math.cos(angle) * radius}
                y2={cy + Math.sin(angle) * radius}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={lx}
                y={ly}
                fontSize="10"
                fontWeight={700}
                fill="#475569"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {axis}
              </text>
            </g>
          );
        })}
        <polygon points={polygon} fill="#1d4ed833" stroke="#1d4ed8" strokeWidth={1.8} />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={3.2} fill="#1d4ed8" />
        ))}
      </svg>
      <div style={styles.radarLegend}>
        {axes.map((axis) => (
          <span key={axis} style={styles.radarLegendItem}>
            <strong>{axis}</strong>
            <span>{patient.icfQualifiers[axis]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ScoreTrendChart({ patient }: { patient: PatientCaseloadEntry }) {
  const series: Array<{ key: keyof typeof patient.trends[0]; label: string; color: string; invert?: boolean }> = [
    { key: 'eat10', label: 'EAT-10 (lower better)', color: '#dc2626' },
    { key: 'fois', label: 'FOIS (higher better)', color: '#0f766e', invert: true },
    { key: 'jawOpening', label: 'Jaw opening (mm)', color: '#7c3aed', invert: true },
  ];

  const width = 360;
  const height = 180;
  const padding = { top: 16, right: 10, bottom: 26, left: 30 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const labels = patient.trends.map((t) => t.label);

  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : innerW;

  const renderSeries = (s: typeof series[number]) => {
    const values = patient.trends.map((t) => Number(t[s.key]));
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const coords = values.map((value, index) => {
      const x = padding.left + index * stepX;
      const normalized = (value - min) / range;
      const y = padding.top + (s.invert ? 1 - normalized : normalized) * innerH;
      return { x, y, value };
    });
    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
    return (
      <g key={s.key}>
        <path d={path} fill="none" stroke={s.color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={2.5} fill={s.color} />
        ))}
      </g>
    );
  };

  return (
    <div style={{ ...styles.analyticsCard, gridColumn: 'span 2' }}>
      <div style={styles.cardHeaderRow}>
        <h4 style={styles.analyticsCardTitle}>Score trends</h4>
        <LineChart size={16} color="#64748b" />
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Score trends">
        <rect
          x={padding.left}
          y={padding.top}
          width={innerW}
          height={innerH}
          fill="#f8fafc"
          stroke="#e2e8f0"
        />
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={padding.left}
            y1={padding.top + innerH * fraction}
            x2={padding.left + innerW}
            y2={padding.top + innerH * fraction}
            stroke="#e2e8f0"
            strokeDasharray="3 3"
          />
        ))}
        {labels.map((label, index) => (
          <text
            key={label}
            x={padding.left + index * stepX}
            y={height - 8}
            fontSize="10"
            fill="#64748b"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}
        {series.map(renderSeries)}
      </svg>
      <div style={styles.legendRow}>
        {series.map((s) => (
          <span key={s.key} style={styles.legendItem}>
            <span style={{ ...styles.legendSwatch, background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function AdherenceDonut({ patient }: { patient: PatientCaseloadEntry }) {
  const size = 140;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (patient.adherence / 100) * circumference;

  const color =
    patient.adherence >= 80 ? '#10b981' : patient.adherence >= 60 ? '#f59e0b' : '#dc2626';

  return (
    <div style={styles.analyticsCard}>
      <div style={styles.cardHeaderRow}>
        <h4 style={styles.analyticsCardTitle}>Home program adherence</h4>
        <Activity size={16} color="#64748b" />
      </div>
      <div style={styles.donutLayout}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
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
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="22"
            fontWeight={900}
            fill="#0f172a"
          >
            {patient.adherence}%
          </text>
        </svg>
        <div style={styles.donutMeta}>
          <div>
            <strong style={{ color }}>{adherenceLabel(patient.adherence)}</strong>
            <div style={styles.donutMetaSub}>Weekly prescribed reps</div>
          </div>
          <div style={styles.donutMetaItem}>
            <span>Last visit</span>
            <strong>{patient.lastVisit}</strong>
          </div>
          <div style={styles.donutMetaItem}>
            <span>Next review</span>
            <strong>{patient.nextReview}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function adherenceLabel(value: number): string {
  if (value >= 90) return 'Excellent';
  if (value >= 80) return 'On target';
  if (value >= 60) return 'At risk';
  return 'Below threshold';
}

function MilestoneTimeline({ patient }: { patient: PatientCaseloadEntry }) {
  return (
    <div style={{ ...styles.analyticsCard, gridColumn: 'span 2' }}>
      <div style={styles.cardHeaderRow}>
        <h4 style={styles.analyticsCardTitle}>Treatment milestones</h4>
        <CalendarClock size={16} color="#64748b" />
      </div>
      <ol style={styles.timeline}>
        {patient.milestones.map((milestone, index) => {
          const colors =
            milestone.status === 'done'
              ? { bg: '#dcfce7', fg: '#065f46', border: '#10b981' }
              : milestone.status === 'current'
              ? { bg: '#dbeafe', fg: '#1d4ed8', border: '#1d4ed8' }
              : { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1' };

          return (
            <li key={`${milestone.label}-${index}`} style={styles.timelineItem}>
              <span
                style={{
                  ...styles.timelineDot,
                  background: colors.border,
                  outline: milestone.status === 'current' ? '4px solid #bfdbfe' : 'none',
                }}
              />
              <div
                style={{
                  ...styles.timelineCard,
                  background: colors.bg,
                  borderColor: colors.border,
                  color: colors.fg,
                }}
              >
                <strong>{milestone.label}</strong>
                <span>{milestone.date}</span>
                {milestone.note && <span style={styles.timelineNote}>{milestone.note}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function AlertsAndConcerns({ patient }: { patient: PatientCaseloadEntry }) {
  return (
    <div style={styles.analyticsCard}>
      <div style={styles.cardHeaderRow}>
        <h4 style={styles.analyticsCardTitle}>Active alerts &amp; concerns</h4>
        <AlertTriangle size={16} color="#dc2626" />
      </div>
      {patient.alerts.length === 0 ? (
        <div style={styles.noAlerts}>No active alerts — patient is stable.</div>
      ) : (
        <ul style={styles.alertList}>
          {patient.alerts.map((alert) => (
            <li key={alert} style={styles.alertItem}>
              <span style={styles.alertDot} />
              <span>{alert}</span>
            </li>
          ))}
        </ul>
      )}
      <div style={styles.concernsBlock}>
        <span style={styles.concernsLabel}>Primary concerns</span>
        <div style={styles.concernsChips}>
          {patient.primaryConcerns.map((concern) => (
            <span key={concern} style={styles.concernChip}>
              {concern}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, any> = {
  workspaceGrid: {
    display: 'grid',
    gap: '16px',
  },
  heroPanel: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '10px',
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
    fontSize: '22px',
    lineHeight: 1.25,
    color: '#0f172a',
  },
  heroText: {
    margin: '8px 0 0',
    color: '#475569',
    fontSize: '13.5px',
    lineHeight: 1.5,
    maxWidth: '720px',
  },
  statusPanel: {
    borderRadius: '8px',
    background: '#f1f5f9',
    padding: '16px',
    display: 'grid',
    alignContent: 'center',
  },
  largeNumber: {
    fontSize: '40px',
    fontWeight: 900,
    color: '#0f766e',
    lineHeight: 1,
  },
  statusLabel: {
    color: '#475569',
    fontSize: '12px',
    fontWeight: 700,
    marginTop: '4px',
  },
  savedLine: {
    color: '#64748b',
    fontSize: '12px',
    marginTop: '10px',
  },
  overline: {
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 800,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
  },
  kpiCard: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'grid',
    gridTemplateColumns: '36px minmax(0, 1fr)',
    gap: '10px',
    alignItems: 'center',
  },
  kpiIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'grid',
    placeItems: 'center',
  },
  kpiBody: {
    display: 'grid',
    gap: '2px',
  },
  kpiLabel: {
    color: '#64748b',
    fontSize: '11.5px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  kpiValue: {
    color: '#0f172a',
    fontSize: '22px',
    fontWeight: 900,
    lineHeight: 1.1,
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
    marginBottom: '14px',
    flexWrap: 'wrap',
  },
  panelTitle: {
    margin: '4px 0 0',
    fontSize: '17px',
    color: '#0f172a',
  },
  filterRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    borderRadius: '8px',
    padding: '0 10px',
    minHeight: '36px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    padding: '7px 4px',
    minWidth: '220px',
    fontSize: '13px',
    color: '#0f172a',
    background: 'transparent',
  },
  filterChips: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  filterChip: {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#334155',
    fontSize: '12px',
    fontWeight: 700,
    padding: '6px 10px',
    borderRadius: '999px',
    cursor: 'pointer',
  },
  filterChipActive: {
    border: '1px solid #1d4ed8',
    background: '#1d4ed8',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 800,
    padding: '6px 10px',
    borderRadius: '999px',
    cursor: 'pointer',
  },
  sortSelect: {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: '8px',
    fontSize: '12.5px',
    padding: '7px 10px',
    minHeight: '36px',
  },
  caseloadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  patientCard: {
    border: '1px solid',
    borderRadius: '10px',
    padding: '14px',
    background: '#ffffff',
    display: 'grid',
    gap: '10px',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  patientCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
  },
  patientName: {
    fontWeight: 800,
    color: '#0f172a',
    fontSize: '14px',
  },
  patientId: {
    fontSize: '11.5px',
    color: '#64748b',
    marginTop: '2px',
  },
  riskBadge: {
    fontSize: '10.5px',
    padding: '4px 8px',
    borderRadius: '999px',
    fontWeight: 900,
    letterSpacing: '0.06em',
  },
  diagnosisLine: {
    fontSize: '12.5px',
    color: '#334155',
    lineHeight: 1.4,
  },
  metaRow: {
    display: 'flex',
    gap: '6px',
    color: '#64748b',
    fontSize: '11.5px',
    fontWeight: 600,
  },
  patientStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '6px',
  },
  statCell: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '6px 8px',
    display: 'grid',
    gap: '2px',
  },
  statLabel: {
    fontSize: '10px',
    color: '#64748b',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  statValue: {
    fontSize: '13px',
    color: '#0f172a',
    fontWeight: 800,
  },
  sparkSvg: {
    display: 'block',
    width: '100%',
    height: '36px',
  },
  sparkPlaceholder: {
    background: '#f8fafc',
    border: '1px dashed #e2e8f0',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '11px',
    color: '#64748b',
    textAlign: 'center',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '11.5px',
    color: '#475569',
  },
  footerLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: 700,
  },
  footerReview: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  emptyState: {
    gridColumn: '1 / -1',
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    color: '#475569',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
  },
  analyticsPanel: {
    background: '#ffffff',
    border: '1px solid #dbe4ef',
    borderRadius: '10px',
    padding: '18px',
    display: 'grid',
    gap: '16px',
  },
  analyticsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
  },
  analyticsTitle: {
    margin: '4px 0 4px',
    fontSize: '20px',
    color: '#0f172a',
  },
  analyticsSub: {
    margin: 0,
    color: '#475569',
    fontSize: '13px',
    maxWidth: '760px',
  },
  analyticsActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  actionPrimary: {
    minHeight: '36px',
    border: '1px solid #1d4ed8',
    background: '#1d4ed8',
    color: '#ffffff',
    padding: '0 12px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 800,
    fontSize: '12.5px',
    cursor: 'pointer',
  },
  actionGhost: {
    minHeight: '36px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    padding: '0 12px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: 700,
    fontSize: '12.5px',
    cursor: 'pointer',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
  },
  analyticsCard: {
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    borderRadius: '10px',
    padding: '14px 16px',
    display: 'grid',
    gap: '10px',
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analyticsCardTitle: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 900,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  heatGrid: {
    display: 'grid',
    gap: '6px',
  },
  heatRow: {
    display: 'grid',
    gridTemplateColumns: '120px minmax(0, 1fr) 28px',
    gap: '10px',
    alignItems: 'center',
  },
  heatLabel: {
    fontSize: '12px',
    color: '#334155',
    fontWeight: 700,
  },
  heatCells: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: '3px',
  },
  heatCell: {
    height: '14px',
    borderRadius: '3px',
  },
  heatValue: {
    fontWeight: 900,
    textAlign: 'right',
    fontSize: '12.5px',
  },
  cardFootnote: {
    margin: 0,
    fontSize: '11px',
    color: '#64748b',
  },
  radarLegend: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '6px',
  },
  radarLegendItem: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '4px 6px',
    fontSize: '11px',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 700,
    color: '#334155',
  },
  legendRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    fontSize: '11.5px',
    color: '#475569',
  },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendSwatch: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
  },
  donutLayout: {
    display: 'grid',
    gridTemplateColumns: '140px minmax(0, 1fr)',
    gap: '14px',
    alignItems: 'center',
  },
  donutMeta: {
    display: 'grid',
    gap: '8px',
    fontSize: '12px',
    color: '#475569',
  },
  donutMetaSub: {
    fontSize: '11px',
    color: '#64748b',
  },
  donutMetaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#0f172a',
    fontWeight: 700,
    fontSize: '12px',
  },
  timeline: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '10px',
  },
  timelineItem: {
    display: 'grid',
    gap: '6px',
    alignItems: 'start',
  },
  timelineDot: {
    width: '12px',
    height: '12px',
    borderRadius: '999px',
    marginLeft: '4px',
  },
  timelineCard: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '8px 10px',
    fontSize: '12px',
    display: 'grid',
    gap: '2px',
  },
  timelineNote: {
    fontSize: '11px',
    fontWeight: 700,
  },
  alertList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gap: '8px',
  },
  alertItem: {
    display: 'grid',
    gridTemplateColumns: '10px minmax(0, 1fr)',
    gap: '10px',
    alignItems: 'center',
    color: '#0f172a',
    fontSize: '12.5px',
  },
  alertDot: {
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    background: '#dc2626',
  },
  noAlerts: {
    background: '#ecfdf5',
    border: '1px solid #10b981',
    color: '#065f46',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '12px',
  },
  concernsBlock: {
    display: 'grid',
    gap: '6px',
    paddingTop: '8px',
    borderTop: '1px dashed #e2e8f0',
  },
  concernsLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  concernsChips: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  concernChip: {
    background: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    fontSize: '11.5px',
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: '999px',
  },
};
