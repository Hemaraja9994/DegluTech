import { useState } from 'react';
import { Download, ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import {
  buildBackup, mergeStores, newId, parseBackup, removeDemoPatients, signingClinician,
  type ClinicSettings, type Clinician, type PatientStore,
} from '../clinicStore';
import { buildDemoPatients } from '../demoData';
import { downloadJson, fileStamp } from './download';
import { readImage } from './imageUpload';
import { allFiles, backupToFile, fileToBackup, putFile } from '../fileStore';
import { APP_VERSION } from './WorkspaceNotice';

type Props = {
  settings: ClinicSettings;
  setSettings: (s: ClinicSettings) => void;
  store: PatientStore;
  setStore: (update: (prev: PatientStore) => PatientStore) => void;
};
const BLANK_CLINICIAN: Clinician = { id: '', name: '', qualification: '', designation: '', registration: '', signature: '' };

export function ClinicSettingsPanel({ settings, setSettings, store, setStore }: Props) {
  const [draft, setDraft] = useState<Clinician | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{ store: PatientStore; settings: ClinicSettings | null; name: string; files: unknown[] } | null>(null);
  const [withFiles, setWithFiles] = useState(false);
  const [working, setWorking] = useState(false);
  const [confirmClinician, setConfirmClinician] = useState<string | null>(null);
  const demoCount = store.patients.filter(p => p.demo).length;
  const signer = signingClinician(settings);
  const set = <K extends keyof ClinicSettings>(k: K, v: ClinicSettings[K]) => setSettings({ ...settings, [k]: v });
  const say = (m: string) => { setMessage(m); setError(''); };
  const fail = (m: string) => { setError(m); setMessage(''); };

  const uploadLogo = async (file?: File) => { if (!file) return; try { set('logo', await readImage(file, 480, 200)); say('Logo updated.'); } catch (e) { fail((e as Error).message); } };
  const uploadSignature = async (file?: File) => { if (!file || !draft) return; try { const sig = await readImage(file, 600, 200); setDraft({ ...draft, signature: sig }); } catch (e) { fail((e as Error).message); } };
  const saveClinician = () => {
    if (!draft) return;
    if (!draft.name.trim()) { fail('Enter the clinician’s name.'); return; }
    const c = { ...draft, id: draft.id || newId('slp'), name: draft.name.trim() };
    const exists = settings.clinicians.some(x => x.id === c.id);
    const clinicians = exists ? settings.clinicians.map(x => x.id === c.id ? c : x) : [...settings.clinicians, c];
    setSettings({ ...settings, clinicians, signingClinicianId: settings.signingClinicianId ?? c.id });
    setDraft(null); say(exists ? 'Clinician updated.' : 'Clinician added.');
  };
  const removeClinician = (id: string) => {
    const clinicians = settings.clinicians.filter(c => c.id !== id);
    setSettings({ ...settings, clinicians, signingClinicianId: settings.signingClinicianId === id ? clinicians[0]?.id ?? null : settings.signingClinicianId });
    setConfirmClinician(null); say('Clinician removed.');
  };
  const exportAll = async () => {
    setWorking(true);
    try {
      const backup: Record<string, unknown> = { ...buildBackup(store, settings, APP_VERSION) };
      let count = 0;
      if (withFiles) {
        const ids = new Set(store.patients.map(p => p.id));
        const files = (await allFiles()).filter(f => ids.has(f.patientId));
        backup.files = await Promise.all(files.map(fileToBackup));
        count = files.length;
      }
      downloadJson(`deglutech-backup-${fileStamp()}.json`, backup);
      say(`Backup of ${store.patients.length} patient(s)${withFiles ? `, ${count} file(s)` : ''} and settings downloaded. It is not encrypted: keep it on a protected drive.`);
    } catch (e) { fail(`Backup failed: ${(e as Error).message}`); } finally { setWorking(false); }
  };
  const chooseBackup = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const result = parseBackup(text);
    if (typeof result === 'string') { fail(result); return; }
    let files: unknown[] = [];
    try { const raw = JSON.parse(text) as { files?: unknown }; if (Array.isArray(raw.files)) files = raw.files; } catch { /* already validated */ }
    setPending({ ...result, name: file.name, files }); setMessage(''); setError('');
  };
  const applyBackup = async (mode: 'merge' | 'replace') => {
    if (!pending) return;
    setStore(prev => mode === 'replace' ? pending.store : mergeStores(prev, pending.store));
    if (pending.settings && (mode === 'replace' || !settings.instituteName)) setSettings(pending.settings);
    const ids = new Set(pending.store.patients.map(p => p.id));
    let restored = 0;
    for (const raw of pending.files) { const f = backupToFile(raw); if (f && ids.has(f.patientId)) { try { await putFile(f); restored++; } catch { /* storage full */ } } }
    say(`${pending.store.patients.length} patient(s)${restored ? ` and ${restored} file(s)` : ''} ${mode === 'replace' ? 'restored; earlier records on this device were replaced' : 'merged into this device'}.`);
    setPending(null);
  };

  return <section className="cs" aria-labelledby="cs-title">
    <div className="dt-page-heading"><span className="dt-eyebrow">PRACTICE CONFIGURATION</span><h2 id="cs-title">Clinic settings</h2><p>Your clinic identity, clinicians and records on this device.</p></div>
    <nav className="dt-settings-index" aria-label="Settings categories"><a href="#cs-inst">Clinic identity</a><a href="#cs-slp">Clinicians</a><a href="#cs-print">Print & privacy</a><a href="#cs-data">Backup & data</a></nav>
    {message && <p className="pm-status" role="status">{message}</p>}
    {error && <p className="pm-error" role="alert">{error}</p>}

    <div className="cs-grid">
      <section className="cs-card" aria-labelledby="cs-inst">
        <h3 id="cs-inst">Clinic or institute</h3>
        <p className="pm-hint">Printed at the top of reports, EMR notes and patient handouts.</p>
        <label>Institute or clinic name<input id="cs-name" value={settings.instituteName} onChange={e => set('instituteName', e.target.value)} placeholder="e.g. Yenepoya Medical College Hospital" /></label>
        <label>Department<input id="cs-dept" value={settings.department} onChange={e => set('department', e.target.value)} /></label>
        <label>Address<textarea id="cs-addr" rows={3} value={settings.address} onChange={e => set('address', e.target.value)} /></label>
        <div className="cs-two">
          <label>Phone<input id="cs-phone" value={settings.phone} onChange={e => set('phone', e.target.value)} inputMode="tel" /></label>
          <label>Email<input id="cs-email" value={settings.email} onChange={e => set('email', e.target.value)} inputMode="email" /></label>
        </div>
        <div className="cs-logo">
          {settings.logo ? <img src={settings.logo} alt="Institute logo" /> : <span className="cs-logo-empty">No logo</span>}
          <label className="cs-file"><ImagePlus size={16} /> {settings.logo ? 'Change logo' : 'Add logo'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { uploadLogo(e.target.files?.[0]); e.target.value = ''; }} /></label>
          {settings.logo && <button type="button" onClick={() => set('logo', '')}>Remove logo</button>}
        </div>
      </section>

      <section className="cs-card" aria-labelledby="cs-slp">
        <div className="cs-card-head"><h3 id="cs-slp">Speech-language pathologists</h3>
          <button type="button" className="pm-primary" onClick={() => setDraft({ ...BLANK_CLINICIAN })}><Plus size={16} /> Add clinician</button></div>
        <p className="pm-hint">Choose who signs reports by default. The signing clinician can be changed on each report.</p>
        {settings.clinicians.length === 0 && !draft && <p className="cs-empty">No clinicians yet. Reports will show a blank signature block.</p>}
        <ul className="cs-list">
          {settings.clinicians.map(c => <li key={c.id}>
            <label className="cs-radio"><input type="radio" name="cs-signer" checked={settings.signingClinicianId === c.id} onChange={() => set('signingClinicianId', c.id)} />
              <span><strong>{c.name}</strong><small>{[c.qualification, c.designation, c.registration && `RCI ${c.registration}`].filter(Boolean).join(' · ')}</small></span></label>
            {c.signature && <img className="cs-sig" src={c.signature} alt={`Signature of ${c.name}`} />}
            {confirmClinician === c.id
              ? <span className="cs-inline"><button type="button" className="pm-danger" onClick={() => removeClinician(c.id)}>Remove</button><button type="button" onClick={() => setConfirmClinician(null)}>Keep</button></span>
              : <span className="cs-inline"><button type="button" onClick={() => setDraft({ ...c })}>Edit</button><button type="button" className="pm-danger-ghost" aria-label={`Remove ${c.name}`} onClick={() => setConfirmClinician(c.id)}><Trash2 size={15} /></button></span>}
          </li>)}
        </ul>
        {draft && <form className="cs-form" onSubmit={e => { e.preventDefault(); saveClinician(); }}>
          <label>Full name<input id="cs-c-name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Mr. Hemaraja Nayaka S" /></label>
          <label>Qualification<input id="cs-c-qual" value={draft.qualification} onChange={e => setDraft({ ...draft, qualification: e.target.value })} placeholder="e.g. M.Sc. (Speech-Language Pathology)" /></label>
          <label>Designation<input id="cs-c-des" value={draft.designation} onChange={e => setDraft({ ...draft, designation: e.target.value })} placeholder="e.g. Associate Professor" /></label>
          <label>RCI registration number<input id="cs-c-rci" value={draft.registration} onChange={e => setDraft({ ...draft, registration: e.target.value })} placeholder="e.g. A12345" /></label>
          <div className="cs-logo">
            {draft.signature ? <img src={draft.signature} alt="Signature preview" /> : <span className="cs-logo-empty">No signature image</span>}
            <label className="cs-file"><ImagePlus size={16} /> Signature image (optional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { uploadSignature(e.target.files?.[0]); e.target.value = ''; }} /></label>
            {draft.signature && <button type="button" onClick={() => setDraft({ ...draft, signature: '' })}>Remove</button>}
          </div>
          <div className="pm-actions"><button type="submit" className="pm-primary">Save clinician</button><button type="button" onClick={() => setDraft(null)}>Cancel</button></div>
        </form>}
      </section>

      <section className="cs-card" aria-labelledby="cs-print">
        <h3 id="cs-print">Printing and privacy</h3>
        <label className="cs-check"><input type="checkbox" checked={settings.hideNamesInPrint} onChange={e => set('hideNamesInPrint', e.target.checked)} />
          <span><strong>Hide patient names and hospital IDs on printouts and exports</strong><small>Reports show the study ID only. Use this for research records.</small></span></label>
        <div className="cs-preview" aria-label="Letterhead preview">
          <div className="cs-preview-head">
            {settings.logo && <img src={settings.logo} alt="" />}
            <div><strong>{settings.instituteName || '[Institute name]'}</strong><span>{settings.department}</span><span>{[settings.address, settings.phone, settings.email].filter(Boolean).join(' · ')}</span></div>
          </div>
          <div className="cs-preview-sign">
            {signer?.signature && <img src={signer.signature} alt="" />}
            <strong>{signer?.name || '[Clinician name]'}</strong>
            <span>{[signer?.qualification, signer?.designation].filter(Boolean).join(', ')}</span>
            <span>{signer?.registration ? `RCI Reg. No. ${signer.registration}` : 'RCI Reg. No. ______'}</span>
          </div>
        </div>
      </section>

      <section className="cs-card" aria-labelledby="cs-data">
        <h3 id="cs-data">Backup and data</h3>
        <p className="pm-hint">Everything is stored only in this browser. Export a backup at least weekly and before clearing the browser or changing device.</p>
        <div className="pm-actions">
          <button type="button" className="pm-primary" disabled={working} onClick={exportAll}><Download size={16} /> {working ? 'Preparing backup…' : 'Export backup'}</button>
          <label className="cs-file"><Upload size={16} /> Import backup<input type="file" accept="application/json,.json" onChange={e => { chooseBackup(e.target.files?.[0]); e.target.value = ''; }} /></label>
        </div>
        <label className="cs-check"><input type="checkbox" checked={withFiles} onChange={e => setWithFiles(e.target.checked)} />
          <span><strong>Include patient files (reports, photos, videos)</strong><small>Makes the backup much larger.</small></span></label>
        {pending && <div className="pm-confirm" role="group" aria-label="Import backup">
          <span>{pending.name}: {pending.store.patients.length} patient(s){pending.files.length ? `, ${pending.files.length} file(s)` : ''}{pending.settings ? ' and clinic settings' : ''}. How should it be imported?</span>
          <button type="button" className="pm-primary" onClick={() => applyBackup('merge')}>Merge with this device</button>
          <button type="button" className="pm-danger" onClick={() => applyBackup('replace')}>Replace everything</button>
          <button type="button" onClick={() => setPending(null)}>Cancel</button>
        </div>}
        <h4>Demo patients for teaching</h4>
        <p className="pm-hint">Eight fictitious patients with example charts, clearly marked “Demo”. They never mix with real patient files and can be removed at any time.</p>
        <div className="pm-actions">
          <button type="button" disabled={demoCount > 0} onClick={() => { setStore(prev => { const demos = buildDemoPatients(); return { ...prev, patients: [...prev.patients, ...demos], activeId: prev.activeId ?? demos[0].id }; }); say('Demo patients added.'); }}>Load demo patients</button>
          <button type="button" disabled={demoCount === 0} className="pm-danger-ghost" onClick={() => { setStore(removeDemoPatients); say('Demo patients removed.'); }}>Remove demo patients ({demoCount})</button>
        </div>
      </section>
    </div>
  </section>;
}
