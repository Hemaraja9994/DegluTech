import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronLeft, X } from 'lucide-react';
import type { FieldState } from '../reportEngine';
import type { HncSectionId } from '../../../../packages/core/src/hncClinicalModel';
import {
  TOOLS, TOOL_CATEGORIES, TONE, EAT10_ITEMS, eat10Band, eat10Score, readEat10Items, readEat10Sessions, saveEat10Session,
  isoToday, shortDate, longDate, patientLine, eat10EmrNote, handoutProgress, lastResultFor, type CategoryId, type Eat10Response, type Tool,
} from '../toolSuite';

const SANS = "'Plus Jakarta Sans', 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace";
const INK = '#15302a', INK2 = '#3e5852', INK3 = '#4d6660', LINE = 'rgba(21,48,42,.10)', LINE2 = 'rgba(21,48,42,.18)';
const ACCENT = '#1f5c4a', ACCENT_INK = '#123b30', ACCENT_SOFT = '#e4eee7';

type Overlay = null | 'report' | 'emr' | 'handout';
type Props = { fieldState: FieldState; update: (patch: FieldState) => void; onOpenSection: (id: HncSectionId) => void; patientFallbackId: string };

const pill = (bg: string, fg: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: bg, color: fg, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' });
const segTrack: React.CSSProperties = { display: 'inline-flex', gap: 4, background: '#e1eae4', borderRadius: 10, padding: 4 };
const seg = (on: boolean, h = 40): React.CSSProperties => ({ minHeight: h, padding: '0 14px', border: 0, borderRadius: 7, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, fontFamily: SANS, background: on ? '#fff' : 'transparent', color: on ? ACCENT_INK : INK2, boxShadow: on ? '0 1px 3px rgba(21,48,42,.12)' : 'none' });
const secondaryBtn: React.CSSProperties = { minHeight: 44, border: `1px solid ${LINE2}`, borderRadius: 10, background: '#fff', color: ACCENT_INK, fontWeight: 600, fontSize: 13.5, fontFamily: SANS, cursor: 'pointer', padding: '0 10px' };
const eyebrow: React.CSSProperties = { font: `600 11.5px ${MONO}`, letterSpacing: '.06em', color: ACCENT_INK, textTransform: 'uppercase' };

export function ClinicalToolSuite({ fieldState, update, onOpenSection, patientFallbackId }: Props) {
  const [view, setView] = useState<'hub' | 'tool'>('hub');
  const [cat, setCat] = useState<'all' | CategoryId>('all');
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'Cards' | 'Index'>('Cards');
  const [density, setDensity] = useState<'Bedside' | 'Desk'>('Bedside');
  const [mode, setMode] = useState<'clinician' | 'patient'>('clinician');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (msg: string) => {
    setToast(msg); window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const today = isoToday();
  const resp = readEat10Items(fieldState);
  const sessions = readEat10Sessions(fieldState);
  const { total, answered, missing } = eat10Score(resp);
  const band = eat10Band(total);
  const todaySaved = sessions.find(s => s.date === today);
  const saved = !!todaySaved && JSON.stringify(todaySaved.items) === JSON.stringify(resp);
  const history = sessions.filter(s => s.date !== today).slice(-5);
  const patient = patientLine(fieldState, patientFallbackId);
  const followUp = String(fieldState.followUp || '');
  const setResp = (next: Eat10Response[]) => update({ eat10Items: JSON.stringify(next) });

  const q = query.trim().toLowerCase();
  const matches = (t: Tool) => !q || `${t.name} ${t.measures} ${t.code}`.toLowerCase().includes(q);
  const openTool = (t: Tool) => {
    if (t.target === 'eat10') { setView('tool'); setOverlay(null); window.scrollTo({ top: 0 }); return; }
    if (t.target) { onOpenSection(t.target); return; }
    showToast(`${t.name} is not built yet. It needs licensed item text before it can be added.`);
  };

  /* ------------------------------ Hub ------------------------------ */
  const hub = () => {
    const filters: { id: 'all' | CategoryId; label: string }[] = [{ id: 'all', label: 'All tools' }, ...TOOL_CATEGORIES.map(c => ({ id: c.id, label: c.name }))];
    const groups = TOOL_CATEGORIES.filter(c => cat === 'all' || cat === c.id).map(c => ({ ...c, tools: TOOLS.filter(t => t.cat === c.id && matches(t)) })).filter(g => g.tools.length);
    return <>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ maxWidth: 640 }}>
          <div style={eyebrow}>Clinical tool suite</div>
          <h1 style={{ margin: '6px 0 6px', fontSize: 'clamp(26px,3.2vw,34px)', lineHeight: 1.15, letterSpacing: '-0.01em', fontWeight: 700, color: INK }}>Assessment instruments</h1>
          <p style={{ margin: 0, fontSize: 15, color: INK2 }}>Validated swallowing, voice and function measures for head and neck cancer. Every score is saved to this patient's timeline and feeds the clinical report.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flex: '0 1 420px', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: `1px solid ${LINE2}`, borderRadius: 10, minHeight: 44, padding: '0 12px', flex: '1 1 320px', minWidth: 220 }}>
            <Search size={16} color={INK3} aria-hidden="true" />
            <input className="ts-input" aria-label="Search tools" placeholder="Search tools" value={query} onChange={e => setQuery(e.target.value)} style={{ border: 0, outline: 'none', flex: 1, minWidth: 0, fontSize: 14.5, fontFamily: SANS, background: 'transparent', color: INK }} />
          </label>
          <div style={segTrack} role="group" aria-label="Hub layout">
            {(['Cards', 'Index'] as const).map(l => <button key={l} type="button" aria-pressed={layout === l} onClick={() => setLayout(l)} style={seg(layout === l, 36)}>{l}</button>)}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-label="Filter by tool type">
        {filters.map(f => {
          const on = cat === f.id, count = TOOLS.filter(t => (f.id === 'all' || t.cat === f.id) && matches(t)).length;
          return <button key={f.id} type="button" aria-pressed={on} onClick={() => setCat(f.id)} style={{ minHeight: 40, padding: '0 14px', borderRadius: 999, fontSize: 13.5, fontWeight: 600, fontFamily: SANS, cursor: 'pointer', background: on ? INK : '#fff', color: on ? '#fff' : INK, border: `1px solid ${on ? INK : LINE2}`, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {f.label}<span style={{ font: `500 12px ${MONO}`, opacity: 0.75 }}>{count}</span></button>;
        })}
      </div>
      {groups.length === 0 && <p style={{ textAlign: 'center', color: INK2, margin: '24px 0' }}>No tools match “{query}”.</p>}
      {groups.map(g => <section key={g.id} aria-labelledby={`ts-cat-${g.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', paddingBottom: 8, borderBottom: `1px solid ${LINE}` }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: g.color, alignSelf: 'center' }} />
          <h2 id={`ts-cat-${g.id}`} style={{ margin: 0, fontSize: 18, fontWeight: 700, color: INK }}>{g.name}</h2>
          <span style={{ fontSize: 13.5, color: INK2 }}>{g.desc}</span>
        </div>
        {layout === 'Cards'
          ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%,280px),1fr))', gap: 12 }}>
            {g.tools.map(t => { const last = lastResultFor(t.id, fieldState), tone = TONE[last ? last.tone : 'none'];
              return <button key={t.id} type="button" className="ts-card" onClick={() => openTool(t)} style={{ textAlign: 'left', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '16px 16px 14px', minHeight: 184, display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', fontFamily: SANS, color: INK }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%' }}>
                  <span style={{ font: `500 11.5px ${MONO}`, color: INK3 }}>{t.code}</span><span style={pill('#eef2ef', INK2)}>{t.rater} · {t.time}</span></div>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{t.name}</span>
                <span style={{ fontSize: 13.5, color: INK2, flex: 1 }}>{t.measures}</span>
                <span style={{ borderTop: `1px dashed rgba(21,48,42,.14)`, paddingTop: 10, width: '100%', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {last ? <><span style={{ font: `600 15px ${MONO}` }}>{last.value}</span><span style={pill(tone.bg, tone.fg)}>{last.label}</span>{last.date && <span style={{ fontSize: 12, color: INK3, marginLeft: 'auto' }}>{last.date}</span>}</>
                    : <span style={{ fontSize: 13, color: INK3 }}>Not yet administered</span>}
                </span>
              </button>; })}
          </div>
          : <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden' }}>
            {g.tools.map(t => { const last = lastResultFor(t.id, fieldState), tone = TONE[last ? last.tone : 'none'];
              return <button key={t.id} type="button" className="ts-row" onClick={() => openTool(t)} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '12px 16px', border: 0, borderBottom: `1px solid ${LINE}`, background: '#fff', textAlign: 'left', cursor: 'pointer', fontFamily: SANS, color: INK }}>
                <span style={{ width: 56, font: `500 11.5px ${MONO}`, color: INK3 }}>{t.code}</span>
                <span style={{ flex: '1 1 260px', minWidth: 0 }}><strong style={{ fontSize: 15 }}>{t.name}</strong><span style={{ display: 'block', fontSize: 13, color: INK2 }}>{t.measures}</span></span>
                <span style={{ width: 130, fontSize: 12.5, color: INK2 }}>{t.rater} · {t.time}</span>
                <span style={{ width: 220, display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {last ? <><span style={{ font: `600 14px ${MONO}` }}>{last.value}</span><span style={pill(tone.bg, tone.fg)}>{last.label}</span></> : <span style={{ fontSize: 13, color: INK3 }}>Not yet administered</span>}</span>
              </button>; })}
          </div>}
      </section>)}
    </>;
  };

  /* --------------------------- EAT-10 tool --------------------------- */
  const tool = () => {
    const isPatient = mode === 'patient', desk = density === 'Desk' && !isPatient;
    const pad = isPatient ? '20px 24px' : desk ? '9px 20px' : '16px 20px', fs = isPatient ? 19 : desk ? 14 : 16, optH = isPatient ? 60 : desk ? 34 : 48;
    const bars = history.map(h => ({ label: h.phaseLabel, date: shortDate(h.date), value: h.total, current: false })).concat({ label: 'Today', date: shortDate(today), value: total, current: true });
    const prev = history[history.length - 1];
    const delta = prev ? total - prev.total : 0;
    const deltaText = !prev ? 'No earlier session saved' : delta === 0 ? `No change since ${shortDate(prev.date)}` : `${delta < 0 ? '↓' : '↑'} ${Math.abs(delta)} since ${shortDate(prev.date)}`;
    const deltaColor = !prev || delta === 0 ? INK2 : delta < 0 ? '#2f7a5c' : '#8e3420';
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'ts-in .25s ease-out' }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13.5, color: INK2, display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" onClick={() => setView('hub')} style={{ border: 0, background: 'transparent', color: ACCENT_INK, fontWeight: 600, cursor: 'pointer', padding: '6px 4px', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: SANS }}><ChevronLeft size={16} />Tool suite</button>
        <span aria-hidden="true">/</span><span aria-current="page">EAT-10</span>
      </nav>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <div style={eyebrow}>Screening · Patient-reported</div>
          <h1 style={{ margin: '6px 0 4px', fontSize: 'clamp(24px,3vw,30px)', fontWeight: 700, color: INK, lineHeight: 1.2 }}>Eating Assessment Tool <span style={{ whiteSpace: 'nowrap' }}>(EAT-10)</span></h1>
          <p style={{ margin: 0, fontSize: 14.5, color: INK2 }}>Ten items, each rated 0 (no problem) to 4 (severe problem). Total 0–40. Belafsky et al., 2008.</p>
        </div>
        <div style={segTrack} role="group" aria-label="Entry mode">
          <button type="button" aria-pressed={!isPatient} onClick={() => setMode('clinician')} style={seg(!isPatient)}>Clinician entry</button>
          <button type="button" aria-pressed={isPatient} onClick={() => setMode('patient')} style={seg(isPatient)}>Hand to patient</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <section aria-label="EAT-10 items" style={{ flex: '1 1 560px', minWidth: 0, background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, overflow: 'hidden' }}>
          {isPatient
            ? <div style={{ background: ACCENT_SOFT, color: ACCENT_INK, padding: '20px 24px' }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>How much is each of these a problem for you?</div>
              <div style={{ fontSize: 16, marginTop: 4 }}>Tap one number for every sentence. 0 means no problem, 4 means a severe problem.</div></div>
            : <div style={{ background: '#f5f8f5', borderBottom: `1px solid ${LINE}`, padding: '12px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, fontSize: 13.5, color: INK2 }}>
              <span>Session <strong style={{ color: INK, fontFamily: MONO }}>{longDate(today)}</strong></span><span>Language <strong style={{ color: INK }}>English</strong></span>
              <span>Completed <strong style={{ color: INK, fontFamily: MONO }}>{answered}/10</strong></span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={segTrack} role="group" aria-label="Row density">{(['Bedside', 'Desk'] as const).map(d => <button key={d} type="button" aria-pressed={density === d} onClick={() => setDensity(d)} style={seg(density === d, 32)}>{d}</button>)}</span>
                <button type="button" onClick={() => setResp(Array(10).fill(null))} style={{ minHeight: 36, padding: '0 12px', border: `1px solid ${LINE2}`, borderRadius: 8, background: '#fff', color: INK2, fontWeight: 600, cursor: 'pointer', fontFamily: SANS }}>Clear responses</button>
              </span></div>}
          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {EAT10_ITEMS.map((text, i) => <li key={i} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: pad, borderBottom: i < 9 ? `1px solid ${LINE}` : 0 }}>
              <span style={{ flex: '1 1 260px', display: 'flex', gap: 10, fontSize: fs, color: INK }} id={`ts-eat-${i}`}>
                <span style={{ font: `500 13px ${MONO}`, color: INK3, paddingTop: fs > 16 ? 5 : 3 }}>{String(i + 1).padStart(2, '0')}</span><span>{text}</span></span>
              <span role="radiogroup" aria-labelledby={`ts-eat-${i}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(44px,1fr))', gap: 6, flex: '1 1 300px' }}>
                {([0, 1, 2, 3, 4] as const).map(v => { const sel = resp[i] === v;
                  return <button key={v} type="button" role="radio" aria-checked={sel} aria-label={`${v}`} onClick={() => { const r = resp.slice(); r[i] = sel ? null : v; setResp(r); }}
                    style={{ minHeight: optH, borderRadius: 9, font: `600 16px ${MONO}`, cursor: 'pointer', background: sel ? ACCENT : '#fff', color: sel ? '#fff' : INK, border: `1px solid ${sel ? ACCENT : LINE2}`, transition: 'background .15s' }}>{v}</button>; })}
              </span></li>)}
          </ol>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', fontSize: 12.5, color: INK3, borderTop: `1px solid ${LINE}` }}><span>0 = No problem</span><span>4 = Severe problem</span></div>
          {isPatient && <div style={{ padding: '0 24px 24px' }}>
            <button type="button" onClick={() => { if (!missing) setMode('clinician'); }} aria-disabled={missing > 0} style={{ width: '100%', minHeight: 56, border: 0, borderRadius: 12, background: ACCENT, color: '#fff', fontSize: 18, fontWeight: 700, cursor: missing ? 'default' : 'pointer', opacity: missing ? 0.85 : 1, fontFamily: SANS }}>
              {missing ? `${missing} question${missing === 1 ? '' : 's'} left` : 'Done. Hand back to your therapist'}</button></div>}
        </section>

        {!isPatient && <aside style={{ flex: '1 1 340px', minWidth: 0, position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section aria-label="Total score" style={{ background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div><div style={{ fontSize: 12.5, fontWeight: 600, color: INK2 }}>Total score</div>
                <div style={{ font: `600 52px/1.05 ${MONO}`, color: band.fg }} aria-live="polite">{total}<span style={{ fontSize: 18, color: INK3 }}> / 40</span></div></div>
              <span style={pill(band.bg, band.fg)}>{band.label}</span></div>
            <div aria-hidden="true">
              <div style={{ position: 'relative', height: 10, borderRadius: 999, overflow: 'visible', display: 'flex' }}>
                <span style={{ width: `${3 / 40 * 100}%`, background: 'rgba(15,118,110,.35)', borderRadius: '999px 0 0 999px' }} />
                <span style={{ width: `${12 / 40 * 100}%`, background: 'rgba(183,121,31,.35)' }} />
                <span style={{ flex: 1, background: 'rgba(180,35,24,.28)', borderRadius: '0 999px 999px 0' }} />
                <span style={{ position: 'absolute', top: -3, left: `calc(${Math.min(100, total / 40 * 100)}% - 2px)`, width: 4, height: 16, background: INK, borderRadius: 2, transition: 'left .25s' }} />
              </div>
              <div style={{ position: 'relative', height: 16, font: `500 11px ${MONO}`, color: INK3, marginTop: 4 }}>
                {[0, 3, 15, 40].map(v => <span key={v} style={{ position: 'absolute', left: `${v / 40 * 100}%`, transform: v === 40 ? 'translateX(-100%)' : v === 0 ? 'none' : 'translateX(-50%)' }}>{v}</span>)}</div>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: INK }}>{band.text}</p>
            {missing > 0 && <p style={{ margin: 0, padding: '8px 12px', borderRadius: 8, background: '#fbefd6', color: '#7a4e00', fontSize: 13.5 }}>{missing} item{missing === 1 ? '' : 's'} unanswered. Total is provisional.</p>}
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12.5, color: INK2, display: 'grid', gap: 2 }}>
              <li><strong style={{ fontFamily: MONO }}>0–2</strong> Within normal limits</li><li><strong style={{ fontFamily: MONO }}>≥ 3</strong> Abnormal swallowing (Belafsky 2008)</li>
              <li><strong style={{ fontFamily: MONO }}>&gt; 15</strong> Associated with higher aspiration risk on instrumental exam (Cheney 2015)</li></ul>
          </section>
          <section aria-label="Trend across sessions" style={{ background: '#fff', borderRadius: 14, border: `1px solid ${LINE}`, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}><strong style={{ fontSize: 14.5 }}>Trend across sessions</strong><span style={{ fontSize: 13, fontWeight: 600, color: deltaColor }}>{deltaText}</span></div>
            <div style={{ position: 'relative', height: 150, display: 'grid', gridTemplateColumns: `repeat(${Math.max(bars.length, 6)}, 1fr)`, gap: 8, alignItems: 'end', marginTop: 18 }} role="img" aria-label={`EAT-10 totals: ${bars.map(b => `${b.label} ${b.value}`).join(', ')}`}>
              {[3, 15].map(v => <span key={v} aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: `${v / 40 * 100}%`, borderTop: `1px dashed ${v === 3 ? '#2f7a5c' : '#8e3420'}`, opacity: 0.6 }} />)}
              {bars.map((b, k) => <div key={k} style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
                <span style={{ font: `600 12px ${MONO}`, color: INK, marginBottom: 2 }}>{b.value}</span>
                <span style={{ width: '70%', maxWidth: 34, height: `${Math.max(2, b.value / 40 * 100)}%`, borderRadius: '4px 4px 0 0', transition: 'height .25s', background: b.current ? ACCENT : b.value > 15 ? 'rgba(180,35,24,.35)' : b.value >= 3 ? 'rgba(183,121,31,.4)' : 'rgba(15,118,110,.4)' }} /></div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(bars.length, 6)}, 1fr)`, gap: 8, marginTop: 6 }}>
              {bars.map((b, k) => <div key={k} style={{ textAlign: 'center', fontSize: 11, color: b.current ? ACCENT_INK : INK2, fontWeight: b.current ? 700 : 500, lineHeight: 1.25 }}>{b.label}<br /><span style={{ fontFamily: MONO, color: INK3 }}>{b.date}</span></div>)}
            </div>
          </section>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" className="ts-primary" disabled={answered === 0} onClick={() => { update(saveEat10Session(fieldState, resp, today)); showToast(`EAT-10 = ${total} saved to ${patient.id} timeline.`); }}
              style={{ minHeight: 46, border: 0, borderRadius: 10, background: ACCENT, color: '#fff', fontSize: 15, fontWeight: 700, cursor: answered ? 'pointer' : 'not-allowed', opacity: answered ? 1 : 0.5, fontFamily: SANS }}>{saved ? 'Saved to timeline' : 'Save to patient timeline'}</button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button type="button" style={secondaryBtn} onClick={() => setOverlay('report')}>Report / PDF</button>
              <button type="button" style={secondaryBtn} onClick={() => setOverlay('emr')}>EMR note</button>
              <button type="button" style={secondaryBtn} onClick={() => setOverlay('handout')}>Handout</button>
            </div>
          </div>
        </aside>}
      </div>
    </div>;
  };

  const emrText = useMemo(() => eat10EmrNote({ dateLabel: longDate(today), patient, resp, history, followUp }), [today, patient.id, patient.ageSex, patient.dx, JSON.stringify(resp), JSON.stringify(history), followUp]);

  return <div className="ts-root" style={{ fontFamily: SANS, color: INK, background: '#eef2ef', borderRadius: 14 }}>
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(18px,3vw,32px) clamp(14px,3vw,28px) 48px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {view === 'hub' ? hub() : tool()}
      <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: INK3 }}>Scores are saved to this browser's workspace draft for the current patient.</p>
    </div>
    {overlay && <OutputOverlay overlay={overlay} setOverlay={setOverlay} onClose={() => setOverlay(null)} emrText={emrText} onToast={showToast}
      total={total} band={band} resp={resp} history={history} patient={patient} today={today} followUp={followUp} />}
    {toast && createPortal(<div role="status" className="ts-noprint" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 1001, background: INK, color: '#fff', fontSize: 14, fontWeight: 500, padding: '12px 18px', borderRadius: 10, boxShadow: '0 12px 32px rgba(21,48,42,.3)', animation: 'ts-in .2s ease-out', maxWidth: 'calc(100% - 32px)', fontFamily: SANS }}>{toast}</div>, document.body)}
  </div>;
}

type OverlayProps = {
  overlay: Exclude<Overlay, null>; setOverlay: (o: Overlay) => void; onClose: () => void; emrText: string; onToast: (m: string) => void;
  total: number; band: ReturnType<typeof eat10Band>; resp: Eat10Response[]; history: ReturnType<typeof readEat10Sessions>;
  patient: ReturnType<typeof patientLine>; today: string; followUp: string;
};
function OutputOverlay({ overlay, setOverlay, onClose, emrText, onToast, total, band, resp, history, patient, today, followUp }: OverlayProps) {
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.body.classList.add('ts-print');
    sheet.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.classList.remove('ts-print'); window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const chips = history.map(h => ({ label: h.phaseLabel, date: shortDate(h.date), value: h.total })).concat({ label: 'Today', date: shortDate(today), value: total });
  const action = () => {
    if (overlay === 'emr') { void navigator.clipboard?.writeText(emrText).then(() => onToast('EMR note copied to clipboard.'), () => onToast('Copy failed. Select the text and copy it manually.')); }
    else window.print();
  };
  const th: React.CSSProperties = { padding: '6px 4px', borderBottom: `1px solid ${LINE2}`, textAlign: 'left', color: INK2, fontSize: 12 };
  const td: React.CSSProperties = { padding: '6px 4px', borderBottom: '1px solid rgba(21,48,42,.08)' };
  return createPortal(<div className="ts-overlay" role="dialog" aria-modal="true" aria-label="EAT-10 outputs" onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(21,48,42,.45)', overflow: 'auto', padding: 'clamp(10px,3vw,32px)', fontFamily: SANS, color: INK }}>
    <div ref={sheet} tabIndex={-1} className="ts-sheet" style={{ maxWidth: 820, margin: '0 auto', background: '#fff', borderRadius: 14, boxShadow: '0 24px 64px rgba(21,48,42,.24)', overflow: 'hidden', animation: 'ts-in .2s ease-out', outline: 'none' }}>
      <div className="ts-noprint" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: `1px solid ${LINE}`, background: '#f5f8f5' }}>
        <div style={segTrack} role="tablist">{([['report', 'Report'], ['emr', 'EMR note'], ['handout', 'Patient handout']] as const).map(([id, label]) =>
          <button key={id} type="button" role="tab" aria-selected={overlay === id} onClick={() => setOverlay(id)} style={{ ...seg(overlay === id, 36), fontSize: 13 }}>{label}</button>)}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={action} style={{ minHeight: 38, padding: '0 14px', border: 0, borderRadius: 8, background: ACCENT, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: SANS }}>{overlay === 'emr' ? 'Copy note' : 'Print / PDF'}</button>
          <button type="button" onClick={onClose} aria-label="Close" style={{ minHeight: 38, minWidth: 38, border: `1px solid ${LINE2}`, borderRadius: 8, background: '#fff', cursor: 'pointer', color: INK2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>
      </div>
      {overlay === 'report' && <div style={{ padding: 'clamp(20px,4vw,40px)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderBottom: `2px solid ${INK}`, paddingBottom: 14 }}>
          <div><div style={{ ...eyebrow, fontSize: 11 }}>DegluTech · Speech-language pathology</div><h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700 }}>EAT-10 screening report</h2></div>
          <div style={{ fontSize: 12.5, color: INK2, textAlign: 'right', lineHeight: 1.5 }}>{patient.id}{patient.ageSex ? ` · ${patient.ageSex}` : ''}<br />{patient.dx}<br />Session {longDate(today)}</div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ font: `600 44px/1 ${MONO}`, color: band.fg }}>{total}<span style={{ fontSize: 18, color: INK3 }}> / 40</span></div>
          <div style={{ flex: '1 1 300px' }}><div style={{ fontWeight: 700, color: band.fg }}>{band.label}</div><div style={{ fontSize: 14, marginTop: 2 }}>{band.text}</div>
            {eat10Score(resp).missing > 0 && <div style={{ fontSize: 13, color: '#7a4e00', marginTop: 4 }}>Provisional: {eat10Score(resp).missing} item(s) unanswered.</div>}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead><tr><th style={{ ...th, width: 36 }}>#</th><th style={th}>Item</th><th style={{ ...th, textAlign: 'right', width: 60 }}>Score</th></tr></thead>
          <tbody>{EAT10_ITEMS.map((t, i) => <tr key={i}><td style={{ ...td, fontFamily: MONO, color: INK3 }}>{String(i + 1).padStart(2, '0')}</td><td style={td}>{t}</td><td style={{ ...td, textAlign: 'right', fontFamily: MONO, fontWeight: 600 }}>{resp[i] === null ? '—' : resp[i]}</td></tr>)}</tbody>
        </table>
        <div><div style={{ fontSize: 12, fontWeight: 700, color: INK2, marginBottom: 6 }}>Score history</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{chips.map((c, k) => <div key={k} style={{ border: '1px solid rgba(21,48,42,.12)', borderRadius: 8, padding: '6px 10px', fontSize: 12, lineHeight: 1.3 }}><div style={{ color: INK2 }}>{c.label} · {c.date}</div><div style={{ font: `600 15px ${MONO}` }}>{c.value}</div></div>)}</div></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', paddingTop: 24, fontSize: 12.5, color: INK2 }}>
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 6, minWidth: 220 }}>Speech-language pathologist</div><div style={{ borderTop: `1px solid ${INK}`, paddingTop: 6, minWidth: 160 }}>Date</div></div>
      </div>}
      {overlay === 'emr' && <div style={{ padding: 'clamp(20px,4vw,32px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 13.5, color: INK2 }}>Structured note for pasting into the hospital EMR. Plain text, no formatting.</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', font: `400 13px/1.6 ${MONO}`, background: '#f5f8f5', border: `1px solid ${LINE}`, borderRadius: 10, padding: 16, color: INK }}>{emrText}</pre>
      </div>}
      {overlay === 'handout' && <div style={{ padding: 'clamp(20px,4vw,40px)', display: 'flex', flexDirection: 'column', gap: 18, fontSize: 17, lineHeight: 1.55 }}>
        <div><div style={{ ...eyebrow, fontSize: 11 }}>Your swallowing check</div><h2 style={{ margin: '4px 0 0', fontSize: 26, fontWeight: 700 }}>Today's result: {total} out of 40</h2></div>
        <p style={{ margin: 0, padding: '16px 18px', borderRadius: 12, background: band.bg, color: band.fg, fontWeight: 600 }}>{band.patient}</p>
        <div><h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>What this means</h3><p style={{ margin: 0 }}>You answered 10 questions about eating and swallowing. A lower number means fewer problems. A score of 3 or more tells us swallowing is harder than usual. We use this number to see whether your exercises are helping over time.</p></div>
        <div><h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>Your progress</h3><p style={{ margin: 0 }}>{handoutProgress(history, total)}</p></div>
        <div style={{ padding: '14px 16px', borderRadius: 10, background: '#fff9ee', border: '1px solid #f0dcb2', color: '#624318' }}><strong>Contact your clinic</strong><p style={{ margin: '4px 0 0' }}>{followUp.trim() || 'Ask your therapist when your next review is due, and contact the clinic sooner if swallowing gets harder.'}</p></div>
      </div>}
    </div>
  </div>, document.body);
}
