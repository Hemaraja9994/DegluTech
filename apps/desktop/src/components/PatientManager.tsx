import { useMemo, useState } from 'react';
import { Download, FolderOpen, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
  addPatient, buildBackup, createPatient, patientLabel, removePatient, updateIdentity, validatePatient,
  type NewPatientInput, type PatientRecord, type PatientStore,
} from '../clinicStore';
import type { HncSectionId } from '../../../../packages/core/src/hncClinicalModel';
import { downloadJson, fileStamp } from './download';
import { deletePatientFiles } from '../fileStore';
import { APP_VERSION } from './WorkspaceNotice';

type Props = {
  store: PatientStore;
  setStore: (update: (prev: PatientStore) => PatientStore) => void;
  onOpen: (id: string, section?: HncSectionId) => void;
  onSettings: () => void;
};
const BLANK: NewPatientInput = { name: '', hospitalId: '', studyId: '', age: '', gender: '', phase: '' };
const PHASES = ['Prehab', 'Post-op', 'During RT', 'Post-CRT', 'Survivorship'];
const fmt = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };

export function PatientManager({ store, setStore, onOpen, onSettings }: Props) {
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<NewPatientInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...store.patients]
      .filter(p => !q || [p.name, p.hospitalId, p.studyId, p.workspace.fieldState.tumorSite].some(v => typeof v === 'string' && v.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [store.patients, query]);

  const startAdd = () => { setForm({ ...BLANK }); setEditingId(null); setError(''); setStatus(''); };
  const startEdit = (p: PatientRecord) => {
    const fs = p.workspace.fieldState;
    setForm({ name: p.name, hospitalId: p.hospitalId, studyId: p.studyId, age: String(fs.age || ''), gender: String(fs.gender || ''), phase: String(fs.phase || '') });
    setEditingId(p.id); setError(''); setStatus('');
  };
  const save = () => {
    if (!form) return;
    const problem = validatePatient(form, store.patients, editingId ?? undefined);
    if (problem) { setError(problem); return; }
    if (editingId) {
      const id = editingId;
      setStore(prev => {
        const next = updateIdentity(prev, id, form);
        return { ...next, patients: next.patients.map(p => p.id !== id ? p : { ...p, workspace: { ...p.workspace, fieldState: { ...p.workspace.fieldState, ...(form.age ? { age: form.age.trim() } : {}), ...(form.gender ? { gender: form.gender } : {}), ...(form.phase ? { phase: form.phase } : {}) } } }) };
      });
      setStatus('Patient details updated.');
      setForm(null); setEditingId(null);
    } else {
      const p = createPatient(form);
      setStore(prev => addPatient(prev, p));
      setForm(null);
      onOpen(p.id, 'demographics');
    }
  };
  const remove = (p: PatientRecord) => {
    setStore(prev => removePatient(prev, p.id));
    deletePatientFiles(p.id).catch(() => undefined);
    setConfirmDelete(null);
    setStatus(`${patientLabel(p)} and all their records and files were deleted from this device.`);
  };
  const exportOne = (p: PatientRecord) => {
    downloadJson(`deglutech-patient-${(p.studyId || p.hospitalId || 'record').replace(/[^\w-]+/g, '_')}-${fileStamp()}.json`, buildBackup(store, null, APP_VERSION, p.id));
    setStatus('Patient file downloaded. It is not encrypted: keep it on a protected drive.');
  };
  const set = (k: keyof NewPatientInput) => (e: { target: { value: string } }) => setForm(f => f && { ...f, [k]: e.target.value });

  return <section className="pm" aria-labelledby="pm-title">
    <div className="pm-head">
      <div>
        <h2 id="pm-title">Patients <span>{store.patients.length}</span></h2>
        <p>Records are stored only in this browser on this device. Back them up from Settings.</p>
      </div>
      <div className="pm-tools">
        <label className="pm-search"><Search size={16} aria-hidden="true" /><span className="sr-only">Search patients</span>
          <input id="pm-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, hospital ID, study ID or site" /></label>
        <button type="button" className="pm-primary" onClick={startAdd}><Plus size={17} /> Add patient</button>
      </div>
    </div>

    {form && <form className="pm-form" onSubmit={e => { e.preventDefault(); save(); }} aria-labelledby="pm-form-title">
      <div className="pm-form-head"><h3 id="pm-form-title">{editingId ? 'Edit patient details' : 'New patient'}</h3>
        <button type="button" className="pm-icon" aria-label="Close form" onClick={() => { setForm(null); setEditingId(null); }}><X size={18} /></button></div>
      <div className="pm-grid">
        <label>Full name<input id="pm-name" value={form.name} onChange={set('name')} autoComplete="off" /></label>
        <label>Hospital ID / UHID<input id="pm-hos" value={form.hospitalId} onChange={set('hospitalId')} autoComplete="off" /></label>
        <label>Study ID<input id="pm-study" value={form.studyId} onChange={set('studyId')} placeholder="e.g. DT-HNC-001" autoComplete="off" /></label>
        <label>Age (years)<input id="pm-age" value={form.age} onChange={set('age')} inputMode="numeric" /></label>
        <label>Sex<select id="pm-sex" value={form.gender} onChange={set('gender')}><option value="">Not recorded</option><option>Female</option><option>Male</option><option>Other</option></select></label>
        <label>Care phase<select id="pm-phase" value={form.phase} onChange={set('phase')}><option value="">Not recorded</option>{PHASES.map(ph => <option key={ph}>{ph}</option>)}</select></label>
      </div>
      <p className="pm-hint">At least one of name, hospital ID or study ID is needed. Names can be hidden on printouts in Settings.</p>
      {error && <p className="pm-error" role="alert">{error}</p>}
      <div className="pm-actions"><button type="submit" className="pm-primary">{editingId ? 'Save changes' : 'Add and open chart'}</button><button type="button" onClick={() => { setForm(null); setEditingId(null); }}>Cancel</button></div>
    </form>}

    {status && <p className="pm-status" role="status">{status}</p>}

    {store.patients.length === 0 && !form && <div className="pm-empty">
      <h3>No patients yet</h3>
      <p>Add your first patient to start an assessment. Each patient keeps their own chart, scores, exercise plan and session logs.</p>
      <button type="button" className="pm-primary" onClick={startAdd}><Plus size={17} /> Add patient</button>
      <p className="pm-hint">Teaching a class? <button type="button" className="pm-link" onClick={onSettings}>Load demo patients in Settings</button>.</p>
    </div>}

    {list.length > 0 && <ul className="pm-list">
      {list.map(p => {
        const fs = p.workspace.fieldState, isOpen = p.id === store.activeId;
        return <li key={p.id} className={isOpen ? 'pm-row is-open' : 'pm-row'}>
          <div className="pm-who">
            <strong>{patientLabel(p)}{p.demo && <span className="pm-chip">Demo</span>}{isOpen && <span className="pm-chip pm-chip-open">Open</span>}</strong>
            <span>{[p.hospitalId && `Hospital ID ${p.hospitalId}`, p.studyId && `Study ID ${p.studyId}`].filter(Boolean).join(' · ') || 'No ID recorded'}</span>
            <span>{[fs.age && `${fs.age} y`, fs.gender, fs.phase, fs.tumorSite].filter(Boolean).join(' · ') || 'Details not recorded yet'} · updated {fmt(p.updatedAt)}</span>
          </div>
          {confirmDelete === p.id
            ? <div className="pm-confirm" role="group" aria-label="Confirm delete">
                <span>Delete {patientLabel(p)} and all their records and files from this device? This cannot be undone.</span>
                <button type="button" className="pm-danger" onClick={() => remove(p)}>Delete permanently</button>
                <button type="button" onClick={() => setConfirmDelete(null)}>Keep patient</button>
              </div>
            : <div className="pm-row-actions">
                <button type="button" className="pm-primary" onClick={() => onOpen(p.id)}><FolderOpen size={16} /> Open</button>
                <button type="button" onClick={() => startEdit(p)}><Pencil size={15} /> Details</button>
                <button type="button" onClick={() => exportOne(p)}><Download size={15} /> Export</button>
                <button type="button" className="pm-danger-ghost" onClick={() => setConfirmDelete(p.id)} aria-label={`Delete ${patientLabel(p)}`}><Trash2 size={15} /> Delete</button>
              </div>}
        </li>;
      })}
    </ul>}
    {store.patients.length > 0 && list.length === 0 && <p className="pm-hint">No patient matches “{query}”.</p>}
  </section>;
}
