import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { Eye, FileText, Film, Image as ImageIcon, Paperclip, ScanText, Search, Trash2, Upload, X } from 'lucide-react';
import { HNC_CLINICAL_SECTIONS, type HncSectionId } from '../../../../packages/core/src/hncClinicalModel';
import type { FieldState } from '../reportEngine';
import type { PatientRecord } from '../clinicStore';
import { compareWithChart, extractSuggestions, mergedValue, type Suggestion } from '../extractFields';
import { MAX_FILE_BYTES, deleteFile, getFile, kindOf, listFiles, newFileId, putFile, requestPersistence, storageEstimate, updateFile, type FileMeta, type StoredFile } from '../fileStore';
import type { OcrLanguage } from '../fileReader';

type Props = {
  patient: PatientRecord;
  fieldState: FieldState;
  setFieldState: Dispatch<SetStateAction<FieldState>>;
  onHospitalId: (id: string) => void;
  /** Inside a section: show that section's values first and keep the panel compact. */
  focusSection?: HncSectionId;
};
type Review = { file: FileMeta; suggestions: Suggestion[]; selected: Set<string>; showText: boolean; text: string };

const SECTION_LABEL = Object.fromEntries(HNC_CLINICAL_SECTIONS.map(s => [s.id, s.label])) as Record<string, string>;
const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,image/heic,text/plain,.txt,.csv,video/mp4,video/webm,video/quicktime';
const LANG_KEY = 'deglutech-ocr-language';
const size = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const show = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : v ?? '');
const readLang = (): OcrLanguage => { try { const v = window.localStorage.getItem(LANG_KEY); return v === 'eng+kan' || v === 'eng+hin' ? v : 'eng'; } catch { return 'eng'; } };

export function PatientFiles({ patient, fieldState, setFieldState, onHospitalId, focusSection }: Props) {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Review | null>(null);
  const [viewer, setViewer] = useState<StoredFile | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [lang, setLang] = useState<OcrLanguage>(readLang);
  const [dragging, setDragging] = useState(false);
  const [space, setSpace] = useState<{ usedMb: number; quotaMb: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const fieldRef = useRef(fieldState); fieldRef.current = fieldState;

  const refresh = useCallback(async () => {
    try { setFiles(await listFiles(patient.id)); setSpace(await storageEstimate()); }
    catch (e) { setError((e as Error).message); }
  }, [patient.id]);
  useEffect(() => { setReview(null); setMessage(''); setError(''); refresh(); }, [refresh]);

  const openReview = (file: FileMeta, text: string) => {
    const all = extractSuggestions(text);
    const order = (s: Suggestion) => (focusSection && s.section === focusSection ? 0 : 1);
    const suggestions = [...all].sort((a, b) => order(a) - order(b));
    const selected = new Set<string>();
    for (const s of suggestions) {
      if (s.value === '' || (Array.isArray(s.value) && !s.value.length)) continue;
      const current = s.field === '__hospitalId' ? patient.hospitalId : fieldRef.current[s.field];
      const cmp = compareWithChart(s, current);
      if (cmp === 'new' || cmp === 'adds') selected.add(s.field);
    }
    setReview({ file, suggestions, selected, showText: false, text });
  };

  const read = async (meta: FileMeta, again = false) => {
    setError('');
    if (!again && meta.text !== undefined) { openReview(meta, meta.text); return; }
    if (!['pdf', 'image', 'text'].includes(meta.kind)) { setMessage('Videos and other files are kept for viewing; no values are read from them.'); return; }
    setBusy(b => ({ ...b, [meta.id]: 'Starting…' }));
    try {
      const stored = await getFile(meta.id);
      if (!stored) throw new Error('This file is no longer on the device.');
      const { readFileText } = await import('../fileReader');
      const result = await readFileText(stored.blob, stored.kind, lang, m => setBusy(b => ({ ...b, [meta.id]: m })));
      await updateFile(meta.id, { text: result.text, readMethod: result.method });
      const next = { ...meta, text: result.text, readMethod: result.method };
      await refresh();
      if (!result.text.trim()) setMessage(`No text could be read from ${meta.name}. If it is a photo, retake it flat, in good light, filling the frame.`);
      else openReview(next, result.text);
    } catch (e) {
      setError(`Could not read ${meta.name}: ${(e as Error).message}`);
    } finally {
      setBusy(b => { const n = { ...b }; delete n[meta.id]; return n; });
    }
  };

  const add = async (list: FileList | File[] | null) => {
    if (!list || !list.length) return;
    setError(''); setMessage('');
    void requestPersistence(); // may wait on a browser prompt; never block adding files
    let last: FileMeta | null = null;
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE_BYTES) { setError(`${f.name} is larger than ${MAX_FILE_BYTES / 1e6} MB. Trim the video or compress the file.`); continue; }
      const kind = kindOf(f.type, f.name);
      const stored: StoredFile = { id: newFileId(), patientId: patient.id, name: f.name.slice(0, 200), type: f.type || 'application/octet-stream', size: f.size, kind, addedAt: new Date().toISOString(), blob: f };
      try { await putFile(stored); } catch (e) { setError((e as Error).message); continue; }
      const { blob: _b, ...meta } = stored;
      last = meta;
    }
    await refresh();
    if (last && ['pdf', 'image', 'text'].includes(last.kind)) await read(last);
    else if (last) setMessage(`${last.name} attached to ${patient.name || patient.studyId || 'this patient'}.`);
  };

  const apply = async () => {
    if (!review) return;
    const chosen = review.suggestions.filter(s => review.selected.has(s.field));
    const patch: FieldState = {};
    for (const s of chosen) {
      if (s.field === '__hospitalId') { onHospitalId(String(s.value)); continue; }
      patch[s.field] = mergedValue(s, fieldRef.current[s.field]);
    }
    if (Object.keys(patch).length) setFieldState(prev => ({ ...prev, ...patch }));
    const applied = [...new Set([...(review.file.appliedFields ?? []), ...chosen.map(s => s.field)])];
    await updateFile(review.file.id, { appliedFields: applied });
    setMessage(`${chosen.length} value${chosen.length === 1 ? '' : 's'} from ${review.file.name} added to the chart. Check them in each section.`);
    setReview(null); refresh();
  };

  const remove = async (id: string) => { await deleteFile(id); setConfirmDelete(null); if (review?.file.id === id) setReview(null); refresh(); setMessage('File deleted from this device.'); };
  const view = async (id: string) => { const f = await getFile(id); if (f) setViewer(f); };
  const toggle = (field: string) => setReview(r => { if (!r) return r; const sel = new Set(r.selected); if (sel.has(field)) sel.delete(field); else sel.add(field); return { ...r, selected: sel }; });

  const groups = useMemo(() => {
    if (!review) return [];
    const map = new Map<string, Suggestion[]>();
    for (const s of review.suggestions) { const k = s.section; map.set(k, [...(map.get(k) ?? []), s]); }
    return [...map.entries()];
  }, [review]);
  const icon = (k: FileMeta['kind']) => (k === 'image' ? <ImageIcon size={18} /> : k === 'video' ? <Film size={18} /> : <FileText size={18} />);

  const body = <div className="pf">
    <div className={dragging ? 'pf-drop is-drag' : 'pf-drop'}
      onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); add(e.dataTransfer.files); }}>
      <Upload size={22} aria-hidden="true" />
      <div><strong>Drop reports, photos, scans or videos here</strong>
        <span>PDF, JPG/PNG photos of reports, Praat or other text exports, VFSS/FEES clips. Read on this device; nothing is uploaded.</span></div>
      <div className="pf-drop-actions">
        <button type="button" className="pm-primary" onClick={() => input.current?.click()}><Paperclip size={16} /> Choose files</button>
        <label className="pf-lang">Text in photos
          <select value={lang} onChange={e => { const v = e.target.value as OcrLanguage; setLang(v); try { window.localStorage.setItem(LANG_KEY, v); } catch { /* storage unavailable */ } }}>
            <option value="eng">English</option><option value="eng+kan">English + ಕನ್ನಡ</option><option value="eng+hin">English + हिन्दी</option>
          </select></label>
      </div>
      <input ref={input} type="file" multiple accept={ACCEPT} hidden onChange={e => { add(e.target.files); e.target.value = ''; }} />
    </div>
    {message && <p className="pm-status" role="status">{message}</p>}
    {error && <p className="pm-error" role="alert">{error}</p>}

    {review && <section className="pf-review" aria-labelledby={`pf-rev-${review.file.id}`}>
      <div className="pf-review-head">
        <div><h3 id={`pf-rev-${review.file.id}`}>Values found in {review.file.name}</h3>
          <p className="pm-hint">Ticked values go into the chart. Values that would replace something you entered are not ticked; tick them only if the report is newer. Check every value against the source line.</p></div>
        <button type="button" className="pm-icon" aria-label="Close review" onClick={() => setReview(null)}><X size={18} /></button>
      </div>
      {review.suggestions.length === 0 && <p className="pf-none">No recognised values in this file. You can still read the text below and copy what you need.</p>}
      {groups.map(([section, list]) => <div key={section} className={focusSection === section ? 'pf-group is-focus' : 'pf-group'}>
        <h4>{section === 'patient-record' ? 'Patient record' : SECTION_LABEL[section]}{focusSection === section && <span className="pm-chip pm-chip-open">This section</span>}</h4>
        <ul>
          {list.map(s => {
            const current = s.field === '__hospitalId' ? patient.hospitalId : fieldState[s.field];
            const info = s.value === '' || (Array.isArray(s.value) && !s.value.length);
            const cmp = info ? 'same' : compareWithChart(s, current);
            const checked = review.selected.has(s.field);
            return <li key={s.field} className={`pf-row pf-${info ? 'note' : cmp}`}>
              <label>
                <input type="checkbox" checked={checked} disabled={info || cmp === 'same'} onChange={() => toggle(s.field)} />
                <span className="pf-what"><strong>{s.label}</strong>
                  {info ? <em>{s.note}</em> : <span>
                    {cmp === 'new' && <>New: <b>{show(s.value)}</b></>}
                    {cmp === 'same' && <>Already in chart: <b>{show(s.value)}</b></>}
                    {cmp === 'different' && <>Chart has <b>{show(current)}</b>, report says <b>{show(s.value)}</b></>}
                    {cmp === 'adds' && <>Adds <b>{show((s.value as string[]).filter(v => !(Array.isArray(current) ? current : [current]).includes(v)))}</b> to {show(current)}</>}
                  </span>}
                  {!info && s.note && <em>{s.note}</em>}
                </span>
              </label>
              <q>{s.snippet}</q>
            </li>;
          })}
        </ul>
      </div>)}
      <div className="pm-actions">
        <button type="button" className="pm-primary" disabled={!review.selected.size} onClick={apply}>Add {review.selected.size} ticked value{review.selected.size === 1 ? '' : 's'} to the chart</button>
        <button type="button" onClick={() => setReview(r => r && { ...r, showText: !r.showText })}>{review.showText ? 'Hide' : 'Show'} text read from file</button>
        <button type="button" onClick={() => setReview(null)}>Cancel</button>
      </div>
      {review.showText && <textarea className="pf-text" readOnly value={review.text} rows={12} aria-label="Text read from the file" />}
    </section>}

    {files.length > 0 && <ul className="pf-list" aria-label="Files for this patient">
      {(focusSection ? files.slice(0, 4) : files).map(f => <li key={f.id}>
        <span className="pf-icon" aria-hidden="true">{icon(f.kind)}</span>
        <span className="pf-meta"><strong>{f.name}</strong>
          <span>{size(f.size)} · added {when(f.addedAt)}
            {f.readMethod === 'pdf-text' && ' · text read'}{f.readMethod === 'ocr' && ' · read with text recognition'}{f.readMethod === 'text' && ' · text file'}
            {f.appliedFields?.length ? ` · ${f.appliedFields.length} value${f.appliedFields.length === 1 ? '' : 's'} used` : ''}</span>
          {busy[f.id] && <span className="pf-busy" role="status">{busy[f.id]}</span>}</span>
        {confirmDelete === f.id
          ? <span className="pm-confirm"><span>Delete this file from the device?</span><button type="button" className="pm-danger" onClick={() => remove(f.id)}>Delete</button><button type="button" onClick={() => setConfirmDelete(null)}>Keep</button></span>
          : <span className="pm-row-actions">
              <button type="button" onClick={() => view(f.id)}><Eye size={15} /> View</button>
              {['pdf', 'image', 'text'].includes(f.kind) && <button type="button" disabled={!!busy[f.id]} onClick={() => read(f)}><Search size={15} /> Find values</button>}
              {(f.kind === 'pdf' || f.kind === 'image') && f.text !== undefined && <button type="button" disabled={!!busy[f.id]} onClick={() => read(f, true)}><ScanText size={15} /> Read again</button>}
              <button type="button" className="pm-danger-ghost" aria-label={`Delete ${f.name}`} onClick={() => setConfirmDelete(f.id)}><Trash2 size={15} /></button>
            </span>}
      </li>)}
    </ul>}
    {focusSection && files.length > 4 && <p className="pm-hint">{files.length - 4} more file(s) in Files and reports.</p>}
    {!focusSection && space && <p className="pm-hint">Browser storage used: {space.usedMb} MB of about {space.quotaMb} MB available on this device.</p>}

    {viewer && <FileViewer file={viewer} onClose={() => setViewer(null)} />}
  </div>;

  if (focusSection) return <details className="pf-inline"><summary><Paperclip size={16} aria-hidden="true" /> Fill this section from a report, photo or file{files.length ? ` · ${files.length} on file` : ''}</summary>{body}</details>;
  return body;
}

function FileViewer({ file, onClose }: { file: StoredFile; onClose: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file.blob), [file]);
  const [text, setText] = useState('');
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => { if (file.kind === 'text') file.blob.text().then(setText).catch(() => setText('')); }, [file]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return createPortal(<div className="pf-viewer" role="dialog" aria-modal="true" aria-label={`Viewing ${file.name}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="pf-viewer-box">
      <div className="pf-viewer-head"><strong>{file.name}</strong><button type="button" className="pm-icon" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
      <div className="pf-viewer-body">
        {file.kind === 'pdf' && <iframe title={file.name} src={url} />}
        {file.kind === 'image' && <img src={url} alt={file.name} />}
        {file.kind === 'video' && <video src={url} controls playsInline />}
        {file.kind === 'text' && <pre>{text}</pre>}
        {file.kind === 'other' && <p>This file type cannot be shown here. <a href={url} download={file.name}>Save a copy</a> to open it in another app.</p>}
      </div>
    </div>
  </div>, document.body);
}
