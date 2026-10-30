/**
 * Shared layout for every printed output (diagnostic report, instrument reports, patient handouts).
 * A4, Carlito 11 pt (metric-compatible with Calibri), black-and-white safe: navy headings and thin rules,
 * no tinted boxes. Chrome and Edge print the patient ID at the top and "Page x of y" at the foot of every page.
 */
import type { ClinicSettings, Clinician } from './clinicStore.ts';

export const esc = (input: unknown): string => String(input ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** CSS string literal; < > & and quotes are written as CSS escapes so text can never close the style block. */
const cssString = (s: string) => `"${s.replace(/[\\"<>&\n\r]/g, ch => (ch === '\n' || ch === '\r' ? ' ' : `\\${ch.charCodeAt(0).toString(16)} `))}"`;
/** "Demo patient A · Study ID DEMO-01": the name without its label, other identifiers labelled. */
export const idText = (identity: { label: string; value: string }[], sep = ' · ') => identity.map(r => (r.label === 'Patient' ? r.value : `${r.label} ${r.value}`)).join(sep);
export const safeImage = (src?: string) => (src && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src) ? src : '');

export type Letterhead = { name: string; department: string; address?: string; contact?: string; logo?: string };
export type Signer = { name: string; title: string; registration: string; signature?: string };
export type PrintDoc = {
  title: string;                 // document title, e.g. "Speech-Language Pathology Evaluation Report"
  subtitle?: string;
  letterhead: Letterhead;
  runningId: string;             // shown at the top of every page
  meta?: [string, string][];     // right-hand block under the title (report no., dates)
  body: string;                  // HTML
  signer?: Signer | null;        // omit for patient handouts
  footerNote?: string;
  patientFacing?: boolean;       // larger type for handouts
  lang?: string;
};

export function letterheadFromSettings(settings: ClinicSettings): Letterhead {
  return {
    name: settings.instituteName || '[Institute name: add it in Settings]',
    department: settings.department || 'Department of Speech-Language Pathology',
    address: settings.address,
    contact: [settings.phone, settings.email].filter(Boolean).join('  ·  '),
    logo: settings.logo,
  };
}
export function signerFrom(clinician: Clinician | null): Signer {
  return {
    name: clinician?.name || '[Clinician name: add in Settings]',
    title: [clinician?.qualification, clinician?.designation].filter(Boolean).join(', '),
    registration: clinician?.registration ? `RCI Reg. No. ${clinician.registration}` : 'RCI Reg. No. ____________',
    signature: clinician?.signature,
  };
}

/** Absolute URL of the app's self-hosted fonts (the print document is written into a blank window). */
const fontBase = () => { try { return new URL('fonts/', document.baseURI).href; } catch { return '/fonts/'; } };

export const PRINT_CSS = (doc: PrintDoc) => `
@font-face { font-family: 'Carlito'; src: url('${fontBase()}Carlito-Regular.ttf') format('truetype'); font-weight: 400; }
@font-face { font-family: 'Carlito'; src: url('${fontBase()}Carlito-Bold.ttf') format('truetype'); font-weight: 700; }
@page {
  size: A4; margin: 18mm 16mm 18mm 18mm;
  @top-left { content: ${cssString(doc.letterhead.name)}; font: 8pt 'Carlito', 'Calibri', sans-serif; color: #444; }
  @top-right { content: ${cssString(doc.runningId)}; font: 700 8pt 'Carlito', 'Calibri', sans-serif; color: #173451; }
  @bottom-left { content: ${cssString(`${doc.title} · Confidential clinical record`)}; font: 8pt 'Carlito', 'Calibri', sans-serif; color: #555; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt 'Carlito', 'Calibri', sans-serif; color: #555; }
}
@page :first { @top-left { content: none; } @top-right { content: none; } }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; background: #e9edf1; color: #111; font-family: 'Carlito', 'Calibri', 'Nirmala UI', 'Noto Sans', 'Segoe UI', sans-serif;
  font-size: ${doc.patientFacing ? '13pt' : '11pt'}; line-height: ${doc.patientFacing ? 1.5 : 1.38}; }
.sheet { width: 210mm; min-height: 297mm; margin: 12px auto; padding: 18mm 16mm 18mm 18mm; background: #fff; box-shadow: 0 2px 14px rgba(0,0,0,.12); }
@media print { body { background: #fff; } .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; } .screen-only { display: none !important; } }
header.lh { display: flex; gap: 12px; align-items: center; padding-bottom: 8px; border-bottom: 1.5pt solid #173451; }
header.lh img { height: 14mm; width: auto; max-width: 30mm; object-fit: contain; }
header.lh .org { flex: 1; min-width: 0; }
header.lh .org .name { font-size: 15pt; font-weight: 700; color: #173451; line-height: 1.15; }
header.lh .org .dept { font-size: 10.5pt; color: #222; }
header.lh .org .addr { font-size: 9pt; color: #444; }
.titlebar { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin: 10px 0 8px; }
.titlebar h1 { margin: 0; font-size: ${doc.patientFacing ? '19pt' : '14pt'}; font-weight: 700; color: #111; text-transform: ${doc.patientFacing ? 'none' : 'uppercase'}; letter-spacing: ${doc.patientFacing ? '0' : '.03em'}; }
.titlebar .sub { font-size: 10pt; color: #333; margin-top: 2px; }
.titlebar .meta { font-size: 9pt; color: #333; text-align: right; white-space: nowrap; }
.titlebar .meta b { color: #111; }
table { width: 100%; border-collapse: collapse; }
table.id { margin: 4px 0 10px; border-top: .75pt solid #173451; border-bottom: .75pt solid #173451; }
table.id td { padding: 3px 6px 3px 0; font-size: 10pt; vertical-align: top; }
table.id td.k { width: 17%; color: #444; white-space: nowrap; }
table.id td.v { width: 33%; font-weight: 700; color: #111; }
h2 { font-size: ${doc.patientFacing ? '14pt' : '11.5pt'}; font-weight: 700; color: #173451; margin: 12px 0 4px; padding-bottom: 2px; border-bottom: .5pt solid #9aa9b6;
  text-transform: ${doc.patientFacing ? 'none' : 'uppercase'}; letter-spacing: ${doc.patientFacing ? '0' : '.04em'}; break-after: avoid; }
h3 { font-size: ${doc.patientFacing ? '13pt' : '11pt'}; font-weight: 700; color: #111; margin: 9px 0 3px; break-after: avoid; }
p { margin: 0 0 5px; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 6px; padding-left: 18px; } li { margin: 0 0 2px; }
table.grid { margin: 2px 0 8px; font-size: 10pt; }
table.grid th { text-align: left; font-weight: 700; color: #111; border-bottom: .75pt solid #333; padding: 3px 6px 3px 0; font-size: 9.5pt; }
table.grid td { border-bottom: .4pt solid #c3ccd4; padding: 2.4px 6px 2.4px 0; vertical-align: top; }
table.grid td.k { width: 36%; color: #222; }
table.grid td.num, table.grid th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
table.grid td.ref { color: #444; font-size: 9pt; }
table.grid tr { break-inside: avoid; }
.muted { color: #555; } .small { font-size: 9pt; }
.nr { color: #666; font-style: italic; }
.box { border: .75pt solid #333; padding: 6px 9px; margin: 4px 0 8px; break-inside: avoid; }
.box.strong { border-width: 1.25pt; }
.box .label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #173451; }
.impression { font-size: 12pt; font-weight: 700; margin: 2px 0 4px; }
.signoff { display: flex; justify-content: space-between; gap: 24px; margin-top: 12px; break-inside: avoid; break-before: avoid; }
.signoff .sig { min-width: 70mm; }
.signoff .sig img { max-height: 13mm; max-width: 60mm; display: block; margin-bottom: 2px; }
.signoff .line { border-top: .75pt solid #111; padding-top: 3px; font-size: 10pt; }
.signoff .line b { font-size: 10.5pt; }
.endnote { break-before: avoid; margin-top: 8px; padding-top: 5px; border-top: .4pt solid #9aa9b6; font-size: 8.5pt; color: #444; }
.toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: center; gap: 10px; padding: 10px; background: #173451; }
.toolbar button { font: 700 15px 'Carlito', 'Calibri', sans-serif; min-height: 40px; padding: 0 18px; border-radius: 8px; border: 1px solid #fff; background: #fff; color: #173451; cursor: pointer; }
.toolbar button.primary { background: #be4916; border-color: #be4916; color: #fff; }
.toolbar span { color: #dbe6ef; font: 14px 'Carlito', 'Calibri', sans-serif; align-self: center; }
`;

export function renderPrintDocument(doc: PrintDoc, opts: { toolbar?: boolean } = {}): string {
  const lh = doc.letterhead, logo = safeImage(lh.logo), sig = doc.signer ? safeImage(doc.signer.signature) : '';
  const meta = (doc.meta ?? []).map(([k, v]) => `<b>${esc(k)}:</b> ${esc(v)}`).join('<br>');
  return `<!doctype html><html lang="${esc(doc.lang || 'en')}"><head><meta charset="utf-8"><title>${esc(doc.title)} — ${esc(doc.runningId)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><style>${PRINT_CSS(doc)}</style></head><body>
${opts.toolbar ? `<div class="toolbar screen-only"><button class="primary" onclick="window.print()">Print / Save as PDF</button><button onclick="window.close()">Close</button><span>A4 · choose “Save as PDF” as the printer to keep a file</span></div>` : ''}
<main class="sheet">
<header class="lh">${logo ? `<img src="${logo}" alt="">` : ''}<div class="org"><div class="name">${esc(lh.name)}</div><div class="dept">${esc(lh.department)}</div>
${lh.address || lh.contact ? `<div class="addr">${esc([lh.address, lh.contact].filter(Boolean).join('  ·  '))}</div>` : ''}</div></header>
<div class="titlebar"><div><h1>${esc(doc.title)}</h1>${doc.subtitle ? `<div class="sub">${esc(doc.subtitle)}</div>` : ''}</div>${meta ? `<div class="meta">${meta}</div>` : ''}</div>
${doc.body}
${doc.signer ? `<section class="signoff"><div class="sig">${sig ? `<img src="${sig}" alt="">` : '<div style="height:12mm"></div>'}<div class="line"><b>${esc(doc.signer.name)}</b><br>${esc(doc.signer.title)}${doc.signer.title ? '<br>' : ''}${esc(doc.signer.registration)}</div></div>
<div class="sig" style="min-width:45mm"><div style="height:12mm"></div><div class="line">Date</div></div></section>` : ''}
${doc.footerNote ? `<p class="endnote">${esc(doc.footerNote)}</p>` : ''}
</main></body></html>`;
}

/** Opens the document in a new window and starts printing; falls back to a hidden frame when pop-ups are blocked. */
export function openPrintWindow(html: string): 'window' | 'frame' {
  const w = window.open('', '_blank', 'width=960,height=1200');
  if (w) {
    w.opener = null;
    w.document.open(); w.document.write(html); w.document.close();
    const go = () => { try { w.focus(); w.print(); } catch { /* the toolbar has a Print button */ } };
    if (w.document.readyState === 'complete') window.setTimeout(go, 400); else w.addEventListener('load', () => window.setTimeout(go, 400));
    return 'window';
  }
  printInFrame(html);
  return 'frame';
}

/** Prints HTML through an invisible iframe (no pop-up needed). */
export function printInFrame(html: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const d = frame.contentDocument!;
  d.open(); d.write(html); d.close();
  const go = () => { try { frame.contentWindow!.focus(); frame.contentWindow!.print(); } finally { window.setTimeout(() => frame.remove(), 60000); } };
  if (d.readyState === 'complete') window.setTimeout(go, 400); else frame.addEventListener('load', () => window.setTimeout(go, 400));
}

/** Label / value rows; unrecorded values print as "Not recorded". */
export const rowsTable = (rows: [string, string | undefined | null][], cls = 'grid') =>
  `<table class="${cls}"><tbody>${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${v && String(v).trim() ? esc(v) : '<span class="nr">Not recorded</span>'}</td></tr>`).join('')}</tbody></table>`;
