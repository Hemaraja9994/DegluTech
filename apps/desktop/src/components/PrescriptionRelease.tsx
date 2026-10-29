import { useState } from 'react';
import { Check, Send, Download } from 'lucide-react';
import type { FieldState } from '../reportEngine';
import { HNC_EXERCISE_LIBRARY } from '../../../../packages/core/src/hncClinicalModel';
import { readDoses, releaseBlock, releaseKey, isReleased } from '../prescriptionRules';
export { readDoses, isReleased } from '../prescriptionRules';
const dateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
type Log = { date: string; exerciseId: string; planned: number; completed: number; dose: string; studyId: string; release: string };
const readLogs = (state: FieldState): Log[] => {
  try { const raw: unknown = JSON.parse(String(state.sessionLogs || '[]')); return Array.isArray(raw) ? raw.filter((l): l is Log => !!l && typeof l.date === 'string' && typeof l.exerciseId === 'string' && Number.isInteger(l.planned) && Number.isInteger(l.completed) && l.completed >= 0 && l.completed <= l.planned) : []; } catch { return []; }
};
export function PrescriptionRelease({ state, ids, update }: { state: FieldState; ids: string[]; update: (patch: FieldState) => void }) {
  const doses = readDoses(state), blocked = releaseBlock(state, ids);
  return <section className="suite-panel"><h3>Individual prescription and release</h3>
    <div className="suite-dose-grid">{ids.map(id => <div key={id}><strong>{HNC_EXERCISE_LIBRARY.find(e => e.id === id)?.name}</strong>
      <label>Sessions per day<select value={doses[id]?.sessionsPerDay ?? 1} onChange={e => update({ prescriptionDoses: JSON.stringify({ ...doses, [id]: { instructions: doses[id]?.instructions ?? '', sessionsPerDay: Number(e.target.value) } }) })}>{Array.from({length: 12}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
      <label>Clinician dose and instructions<textarea value={doses[id]?.instructions ?? ''} onChange={e => update({ prescriptionDoses: JSON.stringify({ ...doses, [id]: { sessionsPerDay: doses[id]?.sessionsPerDay ?? 1, instructions: e.target.value } }) })} /></label></div>)}</div>
    <label>Individual stop and contact plan<textarea value={String(state.painLimit || '')} onChange={e => update({ painLimit: e.target.value })} /></label>
    <p role="status">{blocked || (isReleased(state, ids) ? 'This prescription is released to the local patient preview.' : 'Ready for clinician review and release. Changes to dose or clearance require a new release.')}</p>
    <button type="button" disabled={!!blocked || isReleased(state, ids)} onClick={() => update({ planRelease: releaseKey(state, ids), planReleasedAt: new Date().toISOString() })}><Send size={16} /> Confirm review and release</button>
  </section>;
}
export function PatientSessionLog({ state, ids, update }: { state: FieldState; ids: string[]; update: (patch: FieldState) => void }) {
  const [message, setMessage] = useState('');
  const logs = readLogs(state), doses = readDoses(state), today = dateKey(), studyId = String(state.studyId || 'DEMO');
  const complete = (id: string) => {
    const current = logs.find(l => l.date === today && l.exerciseId === id && l.studyId === studyId);
    const planned = current?.planned ?? doses[id].sessionsPerDay;
    if ((current?.completed ?? 0) >= planned) return;
    const next: Log = { date: today, exerciseId: id, planned, completed: (current?.completed ?? 0) + 1, dose: current?.dose ?? doses[id].instructions, studyId, release: current?.release ?? String(state.planReleasedAt || '') };
    update({ sessionLogs: JSON.stringify([...logs.filter(l => !(l.date === today && l.exerciseId === id && l.studyId === studyId)), next]) });
    setMessage('Session recorded on this device.');
  };
  const exportCsv = () => {
    const safe = (v: unknown) => '"' + String(v).replace(/^[=+@-]/, "'$&").replace(/"/g, '""') + '"';
    const rows = [['date','study_id','exercise_id','sessions_prescribed_snapshot','sessions_logged','dose','released_at'], ...logs.map(l => [l.date,l.studyId,l.exerciseId,l.planned,l.completed,l.dose,l.release])];
    const url = URL.createObjectURL(new Blob([rows.map(r => r.map(safe).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'deglutech-session-log.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (!isReleased(state, ids)) return null;
  return <section className="suite-panel"><h3>Today's sessions</h3><div className="suite-session-grid">{ids.map(id => {
    const log = logs.find(l => l.date === today && l.exerciseId === id && l.studyId === studyId);
    return <div key={id}><strong>{HNC_EXERCISE_LIBRARY.find(e => e.id === id)?.name}</strong><p>{doses[id].instructions}</p><button type="button" disabled={(log?.completed ?? 0) >= (log?.planned ?? doses[id].sessionsPerDay)} onClick={() => complete(id)}><Check size={18} /> Done: {log?.completed ?? 0} / {log?.planned ?? doses[id].sessionsPerDay}</button></div>;
  })}</div><p role="status">{message}</p><p>Device-local demonstration log. Export covers logged days only, not a complete adherence denominator. No cross-device sync.</p><button type="button" onClick={exportCsv}><Download size={16} /> Export session log</button></section>;
}

