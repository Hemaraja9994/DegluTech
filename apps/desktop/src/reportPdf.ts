import {
  buildExecutiveSummary,
  buildIcfTable,
  buildStructuredRecommendations,
  checkSeverityIcfCorrelation,
  computeSectionCompletion,
  generateSmartDefaults,
  type FieldState,
  type IcfTableRow,
} from './reportEngine.ts';
import { HNC_CLINICAL_SECTIONS } from '../../../packages/core/src/hncClinicalModel.ts';
import type { Clinician, ClinicSettings } from './clinicStore.ts';

export interface ReportFacility {
  facilityName: string;
  departmentName: string;
  clinicianName: string;
  clinicianTitle: string;
  registrationNumber: string;
  contact: string;
  address?: string;
  /** PNG/JPEG data URLs from Settings (validated there). */
  logo?: string;
  signature?: string;
  /** Patient identity rows; names are left out when Settings hides them. */
  identity?: { label: string; value: string }[];
}

/** Letterhead and sign-off for printouts, from Settings and the chosen clinician. */
export function facilityFromSettings(settings: ClinicSettings, clinician: Clinician | null, identity: { label: string; value: string }[]): ReportFacility {
  return {
    facilityName: settings.instituteName || '[Institute name: add it in Settings]',
    departmentName: settings.department || 'Speech-Language Pathology',
    address: settings.address,
    contact: [settings.phone, settings.email].filter(Boolean).join('  •  '),
    logo: settings.logo,
    clinicianName: clinician?.name || '[Clinician name: add in Settings]',
    clinicianTitle: [clinician?.qualification, clinician?.designation].filter(Boolean).join(', '),
    registrationNumber: clinician?.registration ? `RCI Reg. No. ${clinician.registration}` : 'RCI Reg. No. ____________',
    signature: clinician?.signature,
    identity,
  };
}
const safeImage = (src?: string) => (src && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src) ? src : '');

export const DEFAULT_FACILITY: ReportFacility = {
  facilityName: 'DegluTech Clinical Workspace',
  departmentName: 'Speech-Language Pathology / Head & Neck Oncology Rehabilitation',
  clinicianName: '[Clinician name]',
  clinicianTitle: 'M.Sc. (SLP), Clinical Speech-Language Pathologist',
  registrationNumber: 'RCI / ISHA Registration No. [____________]',
  contact: '[clinic.email@hospital.org]  •  [+91-XXX-XXX-XXXX]',
};

const escapeHtml = (input: string): string =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderIcfRows = (rows: IcfTableRow[]): string =>
  rows
    .map(
      (row) => `
      <tr>
        <td class="icf-code"><span style="background:${row.domainAccent}1a;color:${row.domainAccent}">${row.code}</span></td>
        <td>
          <strong>${escapeHtml(row.name)}</strong>
          <div class="muted">${escapeHtml(row.domain)}</div>
        </td>
        <td class="center">
          <div class="qualifier-pill q-${row.qualifier}">${row.qualifier < 0 ? 'Not recorded' : row.qualifier}</div>
          <div class="muted small">${escapeHtml(row.severityLabel)}</div>
        </td>
        <td class="manifestation">${escapeHtml(row.manifestation)}</td>
      </tr>`
    )
    .join('');

const renderList = (items: string[]): string =>
  items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

const aspirationToneColor: Record<'green' | 'amber' | 'red', { bg: string; fg: string; border: string }> = {
  green: { bg: '#ecfdf5', fg: '#065f46', border: '#10b981' },
  amber: { bg: '#fffbeb', fg: '#92400e', border: '#f59e0b' },
  red: { bg: '#fef2f2', fg: '#991b1b', border: '#dc2626' },
};

export function buildReportHtml(
  fieldState: FieldState,
  facility: ReportFacility = DEFAULT_FACILITY
): string {
  const draft = generateSmartDefaults(fieldState);
  const summary = buildExecutiveSummary(fieldState, draft);
  const icfRows = buildIcfTable(fieldState);
  const recs = buildStructuredRecommendations(fieldState);
  const correlation = checkSeverityIcfCorrelation(fieldState);
  const completion = computeSectionCompletion(fieldState);
  const generatedAt = new Date();
  const tone = aspirationToneColor[summary.aspirationRiskTone];

  const overallComplete = Math.round(
    completion.reduce((sum, section) => sum + section.percent, 0) / Math.max(1, completion.length)
  );

  const identity = facility.identity && facility.identity.length ? facility.identity : [{ label: 'Study ID', value: String(fieldState.studyId || 'Not recorded') }];
  const patientId = identity.map((row) => row.value).join(' / ');
  const logo = safeImage(facility.logo), signature = safeImage(facility.signature);
  const evaluationDate = String(fieldState.evaluationDate || 'Not recorded');
  const findings = HNC_CLINICAL_SECTIONS.filter(section => !['command', 'exercise', 'patient', 'report'].includes(section.id)).map(section => {
    const rows = section.blocks.flatMap(block => block.fields).filter(field => {
      const value = fieldState[field.id];
      return Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;
    }).map(field => `<tr><td style="padding:6px;border-bottom:1px solid #ddd">${escapeHtml(field.label)}</td><td style="padding:6px;border-bottom:1px solid #ddd;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(Array.isArray(fieldState[field.id]) ? (fieldState[field.id] as string[]).join(', ') : String(fieldState[field.id]))}</td></tr>`).join('');
    return rows ? `<h3 class="section-title">${escapeHtml(section.label)}</h3><table style="width:100%;border-collapse:collapse">${rows}</table>` : '';
  }).join('');
  const tnm = `${fieldState.tCategory || '—'} ${fieldState.nCategory || '—'} ${fieldState.mCategory || '—'}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>DegluTech Review Report — ${escapeHtml(patientId)}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 18mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    color: #15302a;
    background: #ffffff;
    font-size: 11pt;
    line-height: 1.45;
  }
  .page {
    max-width: 800px;
    margin: 0 auto;
    padding: 18px 0 28px;
  }
  .header {
    display: grid;
    grid-template-columns: 64px 1fr auto;
    gap: 14px;
    padding-bottom: 12px;
    border-bottom: 2px solid #15302a;
    align-items: center;
  }
  .header .logo-img { width: 64px; height: 64px; object-fit: contain; }
  .header .logo {
    width: 64px;
    height: 64px;
    border-radius: 10px;
    background: linear-gradient(135deg, #2f7a5c, #1f5c4a);
    color: #ffffff;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 20pt;
    letter-spacing: 0.04em;
  }
  .header h1 {
    margin: 0;
    font-size: 18pt;
    line-height: 1.1;
    color: #15302a;
  }
  .header .subtitle {
    margin: 4px 0 0;
    font-size: 10.5pt;
    color: #3e5852;
  }
  .header .meta {
    text-align: right;
    font-size: 9pt;
    color: #3e5852;
    line-height: 1.4;
  }
  .header .meta strong { color: #15302a; font-size: 10pt; }
  .demographics {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    padding: 12px 14px;
    background: #f5f8f5;
    border: 1px solid #dce5df;
    border-radius: 8px;
  }
  .demographics .cell { display: grid; gap: 2px; min-width: 0; }
  .demographics .label { font-size: 8.5pt; color: #4d6660; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
  .demographics .value { font-size: 10.5pt; color: #15302a; font-weight: 600; }
  .section-title {
    margin: 22px 0 10px;
    font-size: 11.5pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #15302a;
    font-weight: 800;
    border-left: 4px solid #174a3c;
    padding: 4px 0 4px 10px;
  }
  .exec-summary {
    border: 2px solid ${tone.border};
    background: ${tone.bg};
    color: ${tone.fg};
    border-radius: 10px;
    padding: 14px 16px;
    display: grid;
    gap: 8px;
  }
  .exec-summary .impression {
    font-size: 13pt;
    font-weight: 800;
    color: #15302a;
    line-height: 1.3;
  }
  .exec-summary .row { display: grid; grid-template-columns: 130px 1fr; gap: 10px; font-size: 10.5pt; }
  .exec-summary .row .key { font-weight: 700; color: ${tone.fg}; }
  .exec-summary .badges { display: flex; gap: 6px; flex-wrap: wrap; }
  .exec-summary .badge {
    display: inline-flex;
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(15,23,42,0.06);
    color: #15302a;
    font-size: 9.5pt;
    font-weight: 700;
    border: 1px solid rgba(15,23,42,0.1);
  }
  .exec-summary .badge.risk { background: ${tone.border}; color: #ffffff; border-color: ${tone.border}; }
  table.icf {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    border: 1px solid #dce5df;
    border-radius: 8px;
    overflow: hidden;
  }
  table.icf th {
    background: #15302a;
    color: #ffffff;
    text-align: left;
    padding: 8px 10px;
    font-size: 9.5pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  table.icf td {
    padding: 8px 10px;
    border-top: 1px solid #dce5df;
    vertical-align: top;
  }
  table.icf tr:nth-child(odd) td { background: #f5f8f5; }
  table.icf .icf-code span {
    font-family: 'Consolas', monospace;
    padding: 3px 7px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 9.5pt;
  }
  table.icf .center { text-align: center; }
  table.icf .muted { color: #4d6660; font-size: 9pt; font-weight: 500; }
  table.icf .small { font-size: 8.5pt; }
  table.icf .manifestation { color: #3e5852; font-size: 9.5pt; max-width: 260px; }
  .qualifier-pill {
    display: inline-block;
    min-width: 24px;
    padding: 3px 8px;
    border-radius: 6px;
    font-weight: 900;
    font-size: 10pt;
    color: #ffffff;
  }
  .qualifier-pill.q-0 { background: #10b981; }
  .qualifier-pill.q-1 { background: #65a30d; }
  .qualifier-pill.q-2 { background: #ca8a04; }
  .qualifier-pill.q-3 { background: #ea580c; }
  .qualifier-pill.q-4 { background: #dc2626; }
  .qualifier-pill.q--1 { background: #eef2ef; color: #3e5852; width: auto; padding: 0 8px; font-size: 9pt; }
  .rec-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .rec-card {
    border: 1px solid #dce5df;
    border-radius: 8px;
    padding: 12px 14px;
    background: #ffffff;
    page-break-inside: avoid;
  }
  .rec-card.danger { border-color: #fecaca; background: #fef2f2; }
  .rec-card.timeline { border-color: #c9ddd0; background: #e4eee7; }
  .rec-card h4 {
    margin: 0 0 8px;
    font-size: 10.5pt;
    color: #15302a;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #dce5df;
    padding-bottom: 5px;
  }
  .rec-card.danger h4 { color: #991b1b; border-color: #fecaca; }
  .rec-card.timeline h4 { color: #174a3c; border-color: #c9ddd0; }
  .rec-card ul { margin: 0; padding-left: 18px; }
  .rec-card li { margin: 4px 0; font-size: 10pt; line-height: 1.4; color: #3e5852; }
  .signoff {
    margin-top: 20px;
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 16px;
    border-top: 2px solid #15302a;
    padding-top: 14px;
  }
  .signoff .signature-block {
    border: 1px dashed #c9d7ce;
    border-radius: 8px;
    padding: 16px;
    min-height: 90px;
    background: #f5f8f5;
    color: #3e5852;
    font-size: 9.5pt;
  }
  .signoff .signature-block .line {
    border-bottom: 1px solid #15302a;
    height: 28px;
    margin-bottom: 6px;
  }
  .signoff .signature-block strong { color: #15302a; }
  .footer {
    margin-top: 18px;
    font-size: 8.5pt;
    color: #4d6660;
    text-align: center;
    border-top: 1px solid #dce5df;
    padding-top: 8px;
  }
  .warn-banner {
    margin-top: 12px;
    background: #fffbeb;
    border: 1px solid #f59e0b;
    color: #92400e;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 10pt;
  }
  .completion-strip {
    margin-top: 10px;
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 4px;
  }
  .completion-strip .cell {
    height: 8px;
    border-radius: 3px;
    background: #dce5df;
  }
  .completion-strip .cell.complete { background: #10b981; }
  .completion-strip .cell.partial { background: #f59e0b; }
  .completion-strip .cell.empty { background: #ef4444; }
  .completion-text {
    margin-top: 6px;
    font-size: 9pt;
    color: #3e5852;
    display: flex;
    justify-content: space-between;
  }
  @media print {
    .no-print { display: none !important; }
    .rec-card, .exec-summary, .signoff, table.icf { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="page">
    <header class="header">
      ${logo ? `<img class="logo-img" src="${logo}" alt="" />` : '<div class="logo">SLP</div>'}
      <div>
        <h1>${escapeHtml(facility.facilityName)}</h1>
        <div class="subtitle">${escapeHtml(facility.departmentName)}</div>
        ${facility.address || facility.contact ? `<div class="subtitle">${escapeHtml([facility.address, facility.contact].filter(Boolean).join('  •  '))}</div>` : ''}
        <div class="subtitle" style="margin-top:6px;font-weight:700;color:#15302a">Speech-Language Pathology Diagnostic Report — Head &amp; Neck Cancer Rehabilitation</div>
      </div>
      <div class="meta">
        <strong>Report ID:</strong> DTR-${generatedAt.getTime().toString(36).toUpperCase()}<br />
        <strong>Generated:</strong> ${generatedAt.toLocaleString()}<br />
        <strong>Evaluation:</strong> ${escapeHtml(evaluationDate)}
      </div>
    </header>

    <section class="demographics">
      ${identity.map((row) => `<div class="cell"><span class="label">${escapeHtml(row.label)}</span><span class="value">${escapeHtml(row.value)}</span></div>`).join('')}
      <div class="cell"><span class="label">Age / Sex</span><span class="value">${escapeHtml(String(fieldState.age || 'Not recorded'))} / ${escapeHtml(String(fieldState.gender || 'Not recorded'))}</span></div>
      <div class="cell"><span class="label">Primary Site</span><span class="value">${escapeHtml(String(fieldState.tumorSite || '—'))}</span></div>
      <div class="cell"><span class="label">AJCC TNM</span><span class="value">${escapeHtml(tnm)}</span></div>
      <div class="cell"><span class="label">Care Phase</span><span class="value">${escapeHtml(String(fieldState.phase || '—'))}</span></div>
      <div class="cell"><span class="label">Referred By</span><span class="value">${escapeHtml(String(fieldState.referredBy || '—'))}</span></div>
      <div class="cell"><span class="label">Caregiver</span><span class="value">${escapeHtml(String(fieldState.caregiver || '—'))}</span></div>
      <div class="cell"><span class="label">Preferred Language</span><span class="value">${escapeHtml(String(fieldState.language || '—'))}</span></div>
    </section>

    ${
      correlation.isMismatch
        ? `<div class="warn-banner"><strong>Clinical correlation note:</strong> ${escapeHtml(correlation.mismatchReason)}</div>`
        : ''
    }

    <h2 class="section-title">Executive Summary</h2>
    <section class="exec-summary">
      <div class="impression">${escapeHtml(summary.diagnosis)}</div>
      <div class="badges">
        <span class="badge">Severity: ${escapeHtml(String(summary.severity))}</span>
        <span class="badge risk">Aspiration risk: ${escapeHtml(summary.aspirationRiskLabel)}</span>
        <span class="badge">Diet route: ${escapeHtml(summary.dietRoute)}</span>
      </div>
      <div class="row"><span class="key">Texture / route plan</span><span>${escapeHtml(summary.textureGuidance)}</span></div>
      <div class="row"><span class="key">Primary concerns</span><span>${escapeHtml(summary.primaryConcerns.join(' • '))}</span></div>
      <div class="row"><span class="key">Chief complaint</span><span>${escapeHtml(String(fieldState.chiefConcern || '—'))}</span></div>
    </section>

    <h2 class="section-title">WHO-ICF HNC Profile</h2>
    <table class="icf">
      <thead>
        <tr>
          <th style="width:80px">Code</th>
          <th>Domain &amp; Category</th>
          <th class="center" style="width:90px">Qualifier</th>
          <th>Clinical Manifestation</th>
        </tr>
      </thead>
      <tbody>${renderIcfRows(icfRows)}</tbody>
    </table>

    <h2 class="section-title">Structured Recommendations</h2>
    <div class="rec-grid">
      <div class="rec-card">
        <h4>Force / Range-of-Motion Exercises</h4>
        <ul>${renderList(recs.forceRangeOfMotion)}</ul>
      </div>
      <div class="rec-card">
        <h4>Compensatory Strategies &amp; Diet Modification</h4>
        <ul>${renderList(recs.compensatoryAndDiet)}</ul>
      </div>
      <div class="rec-card danger">
        <h4>Red Flags / Emergency Criteria</h4>
        <ul>${renderList(recs.redFlags)}</ul>
      </div>
      <div class="rec-card timeline">
        <h4>Follow-up Timeline</h4>
        <ul>${renderList(recs.followUpTimeline)}</ul>
      </div>
    </div>

    <h2 class="section-title">Clinical Documentation Status</h2>
    <div class="completion-strip">
      ${completion
        .map(
          (section) => `<div class="cell ${section.status}" title="${escapeHtml(section.label)} — ${section.percent}%"></div>`
        )
        .join('')}
    </div>
    <div class="completion-text">
      <span>Sections 1–12 captured: ${completion.filter((s) => s.status === 'complete').length} of ${completion.length} complete</span>
      <span>Field completion: ${overallComplete}% (not clinical validity)</span>
    </div>

    <h2 class="section-title">Recorded Findings Appendix</h2>
    ${findings || '<p>No assessment fields recorded.</p>'}
    <section class="signoff">
      <div>
        <p style="margin:0 0 6px;font-weight:800;color:#15302a">Clinician Sign-off</p>
        <p style="margin:0 0 4px;font-size:10pt;color:#3e5852">${escapeHtml(facility.clinicianName)}</p>
        <p style="margin:0 0 4px;font-size:10pt;color:#3e5852">${escapeHtml(facility.clinicianTitle)}</p>
        <p style="margin:0 0 4px;font-size:9.5pt;color:#3e5852">${escapeHtml(facility.registrationNumber)}</p>
      </div>
      <div class="signature-block">
        ${signature ? `<img src="${signature}" alt="" style="max-height:60px;max-width:220px;display:block;margin:0 0 4px auto" />` : ''}
        <div class="line"></div>
        <strong>Signature &amp; Date</strong>
        <div>Authorized SLP / Designation</div>
      </div>
    </section>

    <p class="footer">
      Prepared with DegluTech 0.4.0-review. Recorded findings require clinician verification. No electronic signature or EHR submission is performed.
    </p>
  </div>
</body>
</html>`;
}

export function exportDiagnosticReport(
  fieldState: FieldState,
  facility: ReportFacility = DEFAULT_FACILITY
): boolean {
  const html = buildReportHtml(fieldState, facility);
  const printWindow = window.open('', '_blank', 'width=900,height=1200');
  if (!printWindow) {
    return false;
  }
  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      // user can manually trigger print from the opened window
    }
  };

  if (printWindow.document.readyState === 'complete') {
    window.setTimeout(triggerPrint, 250);
  } else {
    printWindow.addEventListener('load', () => window.setTimeout(triggerPrint, 250));
  }

  return true;
}
