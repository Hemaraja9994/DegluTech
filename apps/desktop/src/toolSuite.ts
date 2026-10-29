// Clinical Tool Suite: catalogue, EAT-10 scoring and session history.
// Pure functions only (no React) so the scoring rules are unit-tested.
import type { FieldState } from './reportEngine';
import { bestJawOpening, numeric } from '../../../packages/core/src/clinicalCalculations.ts';

export type Tone = 'safe' | 'caution' | 'risk' | 'none';
export const TONE: Record<Tone, { fg: string; bg: string }> = {
  safe: { fg: '#0f766e', bg: 'rgba(15,118,110,.12)' },
  caution: { fg: '#92400e', bg: 'rgba(183,121,31,.16)' },
  risk: { fg: '#991b1b', bg: 'rgba(180,35,24,.12)' },
  none: { fg: '#425466', bg: '#f1f5f9' },
};

export type CategoryId = 'screen' | 'prom' | 'instr' | 'func';
export const TOOL_CATEGORIES: { id: CategoryId; name: string; color: string; desc: string }[] = [
  { id: 'screen', name: 'Screening', color: '#118aa3', desc: 'Quick checks to decide who needs a full or instrumental assessment.' },
  { id: 'prom', name: 'Patient-reported outcomes', color: '#635bff', desc: 'Quality of life and symptom burden in the patient’s own words.' },
  { id: 'instr', name: 'Instrumental', color: '#2563eb', desc: 'Ratings from VFSS, FEES and acoustic recordings.' },
  { id: 'func', name: 'Function & therapy', color: '#0f766e', desc: 'Oral intake, participation and home-program tracking.' },
];

/** Section that currently holds each tool's fields (opened until the tool gets its own screen). */
export type ToolTarget = 'eat10' | 'swallow' | 'opme' | 'instrumental' | 'voice' | 'icf' | 'patient' | null;
export type Tool = { id: string; cat: CategoryId; code: string; name: string; measures: string; rater: string; time: string; target: ToolTarget };
export const TOOLS: Tool[] = [
  { id: 'eat10', cat: 'screen', code: 'SCR-01', name: 'EAT-10', measures: 'Self-reported dysphagia symptom severity across 10 items.', rater: 'Patient', time: '2 min', target: 'eat10' },
  { id: 'masa', cat: 'screen', code: 'SCR-02', name: 'MASA-HNC', measures: 'Bedside swallowing ability, adapted for head and neck cancer.', rater: 'Clinician', time: '15 min', target: 'swallow' },
  { id: 'trismus', cat: 'screen', code: 'SCR-03', name: 'Trismus screen', measures: 'Maximal interincisal opening. Flag at or below 35 mm.', rater: 'Clinician', time: '1 min', target: 'opme' },
  { id: 'mdadi', cat: 'prom', code: 'PRO-01', name: 'MDADI', measures: 'Swallowing-related quality of life: global, emotional, functional, physical.', rater: 'Patient', time: '10 min', target: null },
  { id: 'vhi10', cat: 'prom', code: 'PRO-02', name: 'VHI-10', measures: 'Perceived voice handicap after treatment.', rater: 'Patient', time: '3 min', target: null },
  { id: 'xq', cat: 'prom', code: 'PRO-03', name: 'Xerostomia Questionnaire', measures: 'Dry mouth severity while eating, speaking and at rest.', rater: 'Patient', time: '3 min', target: null },
  { id: 'pas', cat: 'instr', code: 'INS-01', name: 'Penetration-Aspiration Scale', measures: 'Depth of airway invasion and response, per bolus on VFSS or FEES.', rater: 'Clinician', time: 'Per study', target: 'instrumental' },
  { id: 'residue', cat: 'instr', code: 'INS-02', name: 'Pharyngeal residue rating', measures: 'Vallecular and pyriform sinus residue severity.', rater: 'Clinician', time: 'Per study', target: 'instrumental' },
  { id: 'acoustic', cat: 'instr', code: 'INS-03', name: 'Acoustic voice analysis', measures: 'MPT, jitter, shimmer and HNR from a sustained vowel recording.', rater: 'Clinician', time: '5 min', target: 'voice' },
  { id: 'fois', cat: 'func', code: 'FUN-01', name: 'FOIS', measures: 'Functional oral intake level, 1 (nil by mouth) to 7 (total oral, no restriction).', rater: 'Clinician', time: '1 min', target: 'swallow' },
  { id: 'icf', cat: 'func', code: 'FUN-02', name: 'ICF profile', measures: 'Body function, activity and participation qualifiers for swallowing and communication.', rater: 'Clinician', time: '5 min', target: 'icf' },
  { id: 'adherence', cat: 'func', code: 'FUN-03', name: 'Exercise adherence', measures: 'Logged home-program sessions against the prescribed dose.', rater: 'Patient app', time: 'Ongoing', target: 'patient' },
];

export const EAT10_ITEMS = [
  'My swallowing problem has caused me to lose weight.',
  'My swallowing problem interferes with my ability to go out for meals.',
  'Swallowing liquids takes extra effort.',
  'Swallowing solids takes extra effort.',
  'Swallowing pills takes extra effort.',
  'Swallowing is painful.',
  'The pleasure of eating is affected by my swallowing.',
  'When I swallow food sticks in my throat.',
  'I cough when I eat.',
  'Swallowing is stressful.',
];

export type Eat10Response = 0 | 1 | 2 | 3 | 4 | null;
export type Band = { tone: Tone; fg: string; bg: string; label: string; text: string; patient: string };

/** EAT-10 bands: 0-2 normal; 3-15 abnormal (Belafsky 2008); above 15 higher aspiration risk (Cheney 2015). */
export function eat10Band(total: number): Band {
  if (total <= 2) return { tone: 'safe', ...TONE.safe, label: 'Within normal limits', text: 'Score below the abnormal cut-off of 3. No self-reported swallowing difficulty.', patient: 'Your answers show little or no difficulty with swallowing.' };
  if (total <= 15) return { tone: 'caution', ...TONE.caution, label: 'Abnormal', text: 'Score at or above 3 indicates abnormal swallowing. Correlate with clinical swallow examination.', patient: 'Your answers show some difficulty with swallowing. Your therapist will go through this with you.' };
  return { tone: 'risk', ...TONE.risk, label: 'Abnormal · aspiration risk', text: 'Score above 15 is associated with a higher likelihood of aspiration on instrumental assessment. Consider VFSS or FEES if not recently completed.', patient: 'Your answers show that swallowing is quite hard for you right now. Your therapist may suggest a closer check of your swallow.' };
}

export function eat10Score(resp: Eat10Response[]) {
  const answered = resp.filter((v): v is 0 | 1 | 2 | 3 | 4 => v !== null);
  return { total: answered.reduce<number>((a, b) => a + b, 0), answered: answered.length, missing: EAT10_ITEMS.length - answered.length };
}

export function readEat10Items(state: FieldState): Eat10Response[] {
  try {
    const raw: unknown = JSON.parse(String(state.eat10Items || '[]'));
    if (!Array.isArray(raw)) return Array(10).fill(null);
    return Array.from({ length: 10 }, (_, i) => (raw[i] === 0 || raw[i] === 1 || raw[i] === 2 || raw[i] === 3 || raw[i] === 4 ? raw[i] : null));
  } catch { return Array(10).fill(null); }
}

export type Eat10Session = { date: string; phaseLabel: string; total: number; items: Eat10Response[]; provisional: boolean };
export function readEat10Sessions(state: FieldState): Eat10Session[] {
  try {
    const raw: unknown = JSON.parse(String(state.eat10Sessions || '[]'));
    if (!Array.isArray(raw)) return [];
    return raw.filter((s): s is Eat10Session => !!s && typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date)
      && Number.isInteger(s.total) && s.total >= 0 && s.total <= 40 && Array.isArray(s.items) && s.items.length === 10)
      .map(s => ({ ...s, phaseLabel: typeof s.phaseLabel === 'string' && s.phaseLabel.trim() ? s.phaseLabel : 'Session', provisional: !!s.provisional }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch { return []; }
}

/** Saves today's session (replacing an earlier save from the same day) and mirrors the total into fieldState.eat10. */
export function saveEat10Session(state: FieldState, resp: Eat10Response[], today: string): FieldState {
  const { total, missing } = eat10Score(resp);
  const session: Eat10Session = { date: today, phaseLabel: String(state.phase || '').trim() || 'Session', total, items: resp.slice(), provisional: missing > 0 };
  const sessions = readEat10Sessions(state).filter(s => s.date !== today).concat(session).sort((a, b) => a.date.localeCompare(b.date));
  return { eat10: String(total), eat10Items: JSON.stringify(resp), eat10Sessions: JSON.stringify(sessions) };
}

export const isoToday = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};
export const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export type PatientLine = { id: string; ageSex: string; dx: string };
export function patientLine(state: FieldState, fallbackId: string): PatientLine {
  const s = (k: string) => String(Array.isArray(state[k]) ? (state[k] as string[]).join(', ') : state[k] || '').trim();
  const tnm = [s('tCategory'), s('nCategory'), s('mCategory')].join('');
  const rt = s('rtDose') ? `RT ${s('rtDose')} Gy${s('fractions') ? `/${s('fractions')} fx` : ''}` : '';
  const dx = [s('tumorSite'), tnm, s('phase'), rt, s('chemoAgent')].filter(Boolean).join(' · ');
  return { id: s('studyId') || fallbackId, ageSex: [s('age'), s('gender').slice(0, 1)].filter(Boolean).join(' '), dx: dx || 'Diagnosis not recorded' };
}

export function eat10EmrNote(args: { dateLabel: string; patient: PatientLine; resp: Eat10Response[]; history: Eat10Session[]; followUp: string }): string {
  const { total, missing } = eat10Score(args.resp), band = eat10Band(total);
  const trend = args.history.map(h => `${h.phaseLabel} ${h.total}`).concat(`Today ${total}`).join(' > ');
  return [
    'SLP SCREENING – EAT-10',
    `Date: ${args.dateLabel}   Patient: ${args.patient.id}${args.patient.ageSex ? ` (${args.patient.ageSex})` : ''}`,
    `Dx: ${args.patient.dx}`,
    '',
    `EAT-10 total: ${total}/40${missing ? ` (provisional, ${missing} item(s) unanswered)` : ''}`,
    `Interpretation: ${band.label}. ${band.text}`,
    `Item scores: ${args.resp.map((v, i) => `${i + 1}=${v === null ? '-' : v}`).join(', ')}`,
    `Trend: ${trend}`,
    '',
    `Plan: ${args.followUp.trim() || 'Not recorded.'}`,
    'Cut-offs: >=3 abnormal (Belafsky 2008); >15 increased aspiration risk (Cheney 2015).',
  ].join('\n');
}

export function handoutProgress(history: Eat10Session[], total: number): string {
  if (!history.length) return `Today your score is ${total}. We will compare it with your next check to see how your swallowing is changing.`;
  const first = history[0].total, peak = Math.max(...history.map(h => h.total));
  return `Your first score was ${first}. Your highest score was ${peak}. Today it is ${total}. ` + (total < peak
    ? 'This is lower than your highest score, which is a good sign.'
    : 'Keep doing your exercises every day, and tell your therapist if things get harder.');
}

/** Latest recorded result for a hub card, read from the existing clinical fields. Never invents a value. */
export type LastResult = { value: string; label: string; tone: Tone; date: string } | null;
export function lastResultFor(toolId: string, state: FieldState): LastResult {
  const n = (k: string) => numeric(state[k]);
  const when = String(state.evaluationDate || '').match(/^\d{4}-\d{2}-\d{2}$/) ? shortDate(String(state.evaluationDate)) : '';
  switch (toolId) {
    case 'eat10': {
      const sessions = readEat10Sessions(state), last = sessions[sessions.length - 1];
      const total = last ? last.total : n('eat10');
      if (total === null || total < 0 || total > 40) return null;
      const b = eat10Band(total);
      return { value: `${total} / 40`, label: b.label.split(' ·')[0], tone: b.tone, date: last ? shortDate(last.date) : when };
    }
    case 'masa': {
      const v = n('masa'); if (v === null || v < 0 || v > 200) return null;
      const [label, tone]: [string, Tone] = v >= 178 ? ['No abnormality', 'safe'] : v >= 168 ? ['Mild dysphagia', 'caution'] : v >= 139 ? ['Moderate dysphagia', 'risk'] : ['Severe dysphagia', 'risk'];
      return { value: `${v} / 200`, label, tone, date: when };
    }
    case 'trismus': {
      const v = bestJawOpening([state.jawTrial1, state.jawTrial2, state.jawTrial3]) ?? n('jawOpening');
      if (v === null) return null;
      return { value: `${v} mm`, label: v <= 35 ? 'Trismus' : 'Within range', tone: v <= 35 ? 'risk' : 'safe', date: when };
    }
    case 'pas': {
      const v = n('pas'); if (v === null || !Number.isInteger(v) || v < 1 || v > 8) return null;
      return { value: `PAS ${v}`, label: v === 1 ? 'No airway invasion' : v <= 5 ? 'Penetration' : 'Aspiration', tone: v === 1 ? 'safe' : v <= 5 ? 'caution' : 'risk', date: when };
    }
    case 'residue': {
      const r = state.residue; const list = Array.isArray(r) ? r : r ? [String(r)] : [];
      return list.length ? { value: list.join(', '), label: 'Present', tone: 'caution', date: when } : null;
    }
    case 'acoustic': {
      const hnr = n('hnr'), mpt = n('mpt');
      if (hnr === null && mpt === null) return null;
      return { value: hnr !== null ? `HNR ${hnr} dB` : `MPT ${mpt} s`, label: 'Recorded', tone: 'none', date: when };
    }
    case 'fois': {
      const v = n('fois'); if (v === null || !Number.isInteger(v) || v < 1 || v > 7) return null;
      return { value: `Level ${v}`, label: v <= 3 ? 'Tube dependent' : v <= 6 ? 'Oral, with restrictions' : 'Total oral, no restriction', tone: v <= 3 ? 'risk' : v <= 6 ? 'caution' : 'safe', date: when };
    }
    case 'icf': {
      const v = n('b5105'); if (v === null || !Number.isInteger(v) || v < 0 || v > 4) return null;
      return { value: `b5105 = ${v}`, label: ['No problem', 'Mild', 'Moderate', 'Severe', 'Complete'][v], tone: v <= 1 ? 'safe' : v === 2 ? 'caution' : 'risk', date: when };
    }
    case 'adherence': {
      try {
        const logs: unknown = JSON.parse(String(state.sessionLogs || '[]'));
        if (!Array.isArray(logs) || !logs.length) return null;
        const done = logs.reduce((a: number, l: { completed?: unknown }) => a + (Number.isInteger(l?.completed) ? Number(l.completed) : 0), 0);
        return { value: `${done} session${done === 1 ? '' : 's'}`, label: 'Logged', tone: 'safe', date: '' };
      } catch { return null; }
    }
    default: return null;
  }
}
