/**
 * Speech-language pathology evaluation report for head and neck cancer, in a standard clinical layout:
 * identification → referral and history → oncology and treatment → assessment findings by domain
 * (with reference cut-offs) → WHO-ICF profile → impression → recommendations and plan → sign-off.
 * Every value is clinician-entered; nothing is inferred. Calculated values (mean jaw opening, BMI) are labelled.
 */
import { HNC_CLINICAL_SECTIONS, HNC_EXERCISE_LIBRARY } from '../../../packages/core/src/hncClinicalModel.ts';
import { buildIcfTable, type FieldState } from './reportEngine.ts';
import { isReleased, readDoses } from './prescriptionRules.ts';
import type { Clinician, ClinicSettings } from './clinicStore.ts';
import { esc, idText, openPrintWindow, renderPrintDocument, rowsTable, type Letterhead, type Signer } from './printDoc.ts';

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
    departmentName: settings.department || 'Department of Speech-Language Pathology',
    address: settings.address,
    contact: [settings.phone, settings.email].filter(Boolean).join('  ·  '),
    logo: settings.logo,
    clinicianName: clinician?.name || '[Clinician name: add in Settings]',
    clinicianTitle: [clinician?.qualification, clinician?.designation].filter(Boolean).join(', '),
    registrationNumber: clinician?.registration ? `RCI Reg. No. ${clinician.registration}` : 'RCI Reg. No. ____________',
    signature: clinician?.signature,
    identity,
  };
}

export const DEFAULT_FACILITY: ReportFacility = {
  facilityName: '[Institute name: add it in Settings]',
  departmentName: 'Department of Speech-Language Pathology',
  clinicianName: '[Clinician name]',
  clinicianTitle: '',
  registrationNumber: 'RCI Reg. No. ____________',
  contact: '',
};

export const APP_LABEL = 'DegluTech 0.4.0-review';

// ---------- value helpers ----------
const raw = (s: FieldState, id: string) => { const v = s[id]; return Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v.trim() : ''; };
const has = (s: FieldState, id: string) => raw(s, id).length > 0;
const num = (s: FieldState, id: string) => { const n = Number(raw(s, id)); return has(s, id) && Number.isFinite(n) ? n : null; };
export const fmtDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const withUnit = (s: FieldState, id: string, unit: string) => (has(s, id) ? `${raw(s, id)}${unit ? ` ${unit}` : ''}` : '');
const NR = '<span class="nr">Not recorded</span>';
const cell = (v: string) => (v ? esc(v) : NR);

const FOIS = ['', 'Nothing by mouth', 'Tube dependent with minimal attempts of food or liquid', 'Tube dependent with consistent oral intake of food or liquid',
  'Total oral intake of a single consistency', 'Total oral intake of multiple consistencies requiring special preparation or compensations',
  'Total oral intake of multiple consistencies without special preparation, with specific food limitations', 'Total oral intake with no restrictions'];
const pasBand = (n: number) => (n <= 1 ? 'no airway entry' : n <= 5 ? 'penetration' : n === 8 ? 'aspiration, no response (silent)' : 'aspiration');

type MeasureRow = { label: string; value: string; ref?: string };
const measures = (rows: MeasureRow[]) => {
  const shown = rows.filter(r => r.value);
  if (!shown.length) return '';
  return `<table class="grid"><thead><tr><th>Measure</th><th class="num">Result</th><th>Reference / interpretation</th></tr></thead><tbody>${
    shown.map(r => `<tr><td class="k">${esc(r.label)}</td><td class="num"><b>${esc(r.value)}</b></td><td class="ref">${esc(r.ref ?? '')}</td></tr>`).join('')}</tbody></table>`;
};
/** Label/value rows for recorded fields only (narrative and categorical findings). */
const findings = (s: FieldState, ids: [string, string][]) => {
  const rows = ids.filter(([id]) => has(s, id));
  return rows.length ? `<table class="grid"><tbody>${rows.map(([id, label]) => `<tr><td class="k">${esc(label)}</td><td>${esc(raw(s, id))}</td></tr>`).join('')}</tbody></table>` : '';
};
const para = (s: FieldState, id: string, label?: string) => (has(s, id) ? `<p>${label ? `<b>${esc(label)}:</b> ` : ''}${esc(raw(s, id)).replace(/\n/g, '<br>')}</p>` : '');
const notAssessed = '<p class="nr">Not assessed at this evaluation.</p>';
const sectionBlock = (title: string, html: string) => `<h3>${esc(title)}</h3>${html.trim() ? html : notAssessed}`;

export function buildReportHtml(fieldState: FieldState, facility: ReportFacility = DEFAULT_FACILITY, opts: { toolbar?: boolean; generatedAt?: Date } = {}): string {
  const s = fieldState;
  const generatedAt = opts.generatedAt ?? new Date();
  const identity = facility.identity && facility.identity.length ? facility.identity : [{ label: 'Study ID', value: raw(s, 'studyId') || 'Not recorded' }];
  const runningId = idText(identity);
  const reportNo = `DTR-${generatedAt.getTime().toString(36).toUpperCase()}`;

  // ---- identification
  const idPairs: [string, string][] = [
    ...identity.map(r => [r.label, r.value] as [string, string]),
    ['Age / Sex', [raw(s, 'age') && `${raw(s, 'age')} years`, raw(s, 'gender')].filter(Boolean).join(' / ')],
    ['Evaluation date', fmtDate(raw(s, 'evaluationDate') || raw(s, 'encounterDate'))],
    ['Referred by', raw(s, 'referredBy')],
    ['Preferred language', raw(s, 'language')],
    ['Caregiver', raw(s, 'caregiver')],
    ['Care phase', raw(s, 'phase')],
    ['Feeding route', raw(s, 'route')],
  ];
  if (idPairs.length % 2) idPairs.push(['', '']);
  const idTable = `<table class="id"><tbody>${Array.from({ length: idPairs.length / 2 }, (_, i) => {
    const [a, b] = [idPairs[2 * i], idPairs[2 * i + 1]];
    const td = ([k, v]: [string, string]) => k ? `<td class="k">${esc(k)}</td><td class="v">${v ? esc(v) : NR}</td>` : '<td></td><td></td>';
    return `<tr>${td(a)}${td(b)}</tr>`;
  }).join('')}</tbody></table>`;

  // ---- 1 referral and history
  const referral = [para(s, 'chiefConcern', 'Presenting concern'), para(s, 'patientGoals', 'Patient priorities and goals')].join('');

  // ---- 2 oncology and treatment
  const tnm = ['tCategory', 'nCategory', 'mCategory'].map(id => raw(s, id)).filter(Boolean).join(' ');
  const rt = has(s, 'rtDose') ? `${raw(s, 'rtDose')} Gy${has(s, 'fractions') ? ` in ${raw(s, 'fractions')} fractions` : ''}` : '';
  const onco = rowsTable([
    ['Primary site', raw(s, 'tumorSite')],
    ['Stage (AJCC TNM)', tnm],
    ['Date of diagnosis', fmtDate(raw(s, 'diagnosisDate'))],
    ['Disease status', raw(s, 'recurrence')],
    ['Surgery', [raw(s, 'surgeryType'), has(s, 'flapType') && raw(s, 'flapType') !== 'None' ? `reconstruction: ${raw(s, 'flapType')}` : '', has(s, 'neckDissection') && raw(s, 'neckDissection') !== 'None' ? `neck dissection: ${raw(s, 'neckDissection')}` : ''].filter(Boolean).join('; ')],
    ['Radiotherapy', rt],
    ['Systemic therapy', raw(s, 'chemoAgent')],
    ['Current toxicity', raw(s, 'toxicity')],
    ['CTCAE dysphagia grade', has(s, 'ctcaeDysphagia') ? `Grade ${raw(s, 'ctcaeDysphagia')} (clinician assigned${has(s, 'ctcaeVersion') ? `, CTCAE ${raw(s, 'ctcaeVersion')}` : ''})` : ''],
    ['Cancer-related pain', has(s, 'painScore') ? `${raw(s, 'painScore')} / 10` : ''],
  ]);
  const healing = findings(s, [['fistula', 'Unhealed fistula'], ['freshFlap', 'Fresh or unhealed flap / wound'], ['exerciseClearance', 'Exercise clearance'], ['clearanceDetails', 'Clearing clinician, date and restrictions']]);

  // ---- 3 assessment findings
  const trials = ['jawTrial1', 'jawTrial2', 'jawTrial3'].map(id => num(s, id)).filter((n): n is number => n !== null);
  const jawMean = trials.length ? (trials.reduce((a, b) => a + b, 0) / trials.length).toFixed(1) : '';
  const opme = measures([
    { label: 'Maximal inter-incisal opening', value: withUnit(s, 'jawOpening', 'mm'), ref: '≤ 35 mm: trismus (Dijkstra et al., 2006)' },
    { label: 'Inter-incisal opening, trials 1–3', value: trials.length ? `${trials.join(' / ')} mm` : '', ref: jawMean ? `Mean ${jawMean} mm (calculated)` : '' },
  ]) + findings(s, [['tongueRom', 'Tongue range of motion'], ['lipSeal', 'Lip seal'], ['palatalElevation', 'Palatal elevation'], ['cnV', 'CN V (jaw strength, sensation)'], ['cnVII', 'CN VII (facial and lip closure)'], ['cnIX X', 'CN IX/X (palate, voice, cough)'], ['cnXII', 'CN XII (tongue)'], ['cnXI', 'CN XI (shoulder)']]);

  const fois = num(s, 'fois');
  const swallowMeasures = measures([
    { label: 'EAT-10 total', value: has(s, 'eat10') ? `${raw(s, 'eat10')} / 40` : '', ref: '≥ 3 abnormal (Belafsky et al., 2008); > 15 higher likelihood of aspiration (Cheney et al., 2015)' },
    { label: 'MASA-HNC (clinician estimate)', value: raw(s, 'masa'), ref: 'Bedside examination; see instrument source below' },
    { label: 'FOIS', value: fois ? `Level ${fois}` : '', ref: fois ? `${FOIS[fois]} (Crary et al., 2005)` : '' },
    { label: 'MDADI global', value: raw(s, 'mdadiGlobal'), ref: '20–100; higher = better swallowing-related quality of life (Chen et al., 2001)' },
    { label: 'MDADI composite', value: raw(s, 'mdadiComposite'), ref: '20–100' },
    { label: 'MDADI emotional / functional / physical', value: ['mdadiEmotional', 'mdadiFunctional', 'mdadiPhysical'].some(id => has(s, id)) ? ['mdadiEmotional', 'mdadiFunctional', 'mdadiPhysical'].map(id => raw(s, id) || '—').join(' / ') : '', ref: '20–100 each' },
    { label: 'PSS-HN normalcy of diet', value: raw(s, 'pssDiet'), ref: '0–100; higher = better (List et al., 1990)' },
    { label: 'PSS-HN eating in public', value: raw(s, 'pssPublic'), ref: '0–100' },
    { label: 'PSS-HN understandability of speech', value: raw(s, 'pssSpeech'), ref: '0–100' },
  ]);
  const swallow = findings(s, [['wetVoice', 'Wet voice after swallow'], ['cough', 'Cough efficiency'], ['multipleSwallows', 'Multiple swallows per bolus'], ['bolusIssue', 'Primary bolus issue']]) + swallowMeasures + para(s, 'outcomeSource', 'Instrument version, language and assessor');

  const pas = num(s, 'pas');
  const instrumental = findings(s, [['vfss', 'VFSS'], ['fees', 'FEES'], ['residue', 'Residue location']]) + measures([
    { label: 'Penetration-Aspiration Scale (worst)', value: pas !== null ? String(pas) : '', ref: pas !== null ? `1–8; ${pasBand(pas)}; ≥ 6 aspiration (Rosenbek et al., 1996)` : '' },
    { label: 'DIGEST safety / efficiency', value: has(s, 'digestSafety') || has(s, 'digestEfficiency') ? `${raw(s, 'digestSafety') || '—'} / ${raw(s, 'digestEfficiency') || '—'}` : '', ref: '0–4 (Hutcheson et al., 2017)' },
    { label: 'DIGEST overall grade', value: raw(s, 'digestOverall'), ref: '0 none – 4 life-threatening; clinician assigned' },
    { label: 'Yale residue: vallecula / pyriform', value: has(s, 'yaleVallecula') || has(s, 'yalePyriform') ? `${raw(s, 'yaleVallecula') || '—'} / ${raw(s, 'yalePyriform') || '—'}` : '', ref: 'I none – V severe (Neubauer et al., 2015)' },
  ]) + para(s, 'summary', 'Study summary') + para(s, 'studyProtocol', 'Study details') + para(s, 'upload', 'Report reference');

  const grbas = ['grbasGrade', 'grbasRoughness', 'grbasBreathiness', 'grbasAsthenia', 'grbasStrain'];
  const voice = findings(s, [['dysarthria', 'Dysarthria pattern'], ['resonance', 'Resonance']]) + measures([
    { label: 'Speech intelligibility', value: withUnit(s, 'intelligibility', '%') },
    { label: 'Maximum phonation time', value: withUnit(s, 'mpt', 's') },
    { label: 'Jitter', value: withUnit(s, 'jitter', '%') },
    { label: 'Shimmer', value: withUnit(s, 'shimmer', 'dB') },
    { label: 'Harmonics-to-noise ratio', value: withUnit(s, 'hnr', 'dB') },
    { label: 'GRBAS (G R B A S)', value: grbas.some(id => has(s, id)) ? grbas.map((id, i) => `${'GRBAS'[i]}${raw(s, id) || '–'}`).join(' ') : '', ref: '0 normal – 3 severe (Hirano, 1981)' },
    { label: 'VHI-10 total', value: has(s, 'vhi10') ? `${raw(s, 'vhi10')} / 40` : '', ref: '> 11 above normal limits (Arffa et al., 2012)' },
  ]) + para(s, 'voiceProtocol', 'Recording conditions and rating source') + findings(s, [['laryngectomyType', 'Laryngectomy'], ['communicationMethod', 'Primary communication'], ['tepLeak', 'TEP leakage'], ['tepReview', 'Prosthesis / stoma review']]);

  const w = num(s, 'weight'), h = num(s, 'heightCm');
  const bmi = w && h && h > 50 ? (w / ((h / 100) ** 2)).toFixed(1) : '';
  const nutrition = measures([
    { label: 'Weight', value: withUnit(s, 'weight', 'kg'), ref: has(s, 'weightDate') ? `Measured ${fmtDate(raw(s, 'weightDate'))}` : '' },
    { label: 'Height', value: withUnit(s, 'heightCm', 'cm') },
    { label: 'Body mass index', value: bmi ? `${bmi} kg/m²` : '', ref: 'Calculated from weight and height' },
    { label: 'Previous weight', value: withUnit(s, 'previousWeight', 'kg'), ref: has(s, 'previousWeightDate') ? `Measured ${fmtDate(raw(s, 'previousWeightDate'))}` : '' },
    { label: 'Weight change in one month', value: withUnit(s, 'weightChange', '%'), ref: '≥ 5% flagged for dietitian review' },
  ]) + findings(s, [['appetite', 'Appetite'], ['hydration', 'Hydration risk'], ['tracheostomy', 'Tracheostomy'], ['secretion', 'Secretion burden'], ['oralCare', 'Oral care support']]) + para(s, 'nutritionPlan', 'Dietitian and nutrition plan');

  // ---- 4 ICF
  const icf = buildIcfTable(s);
  const icfRecorded = icf.some(r => r.qualifier >= 0);
  const icfTable = icfRecorded ? `<table class="grid"><thead><tr><th style="width:12%">Code</th><th>Category</th><th class="num" style="width:12%">Qualifier</th><th style="width:30%">Descriptor</th></tr></thead><tbody>${
    icf.map(r => `<tr><td><b>${esc(r.code)}</b></td><td>${esc(r.name)} <span class="muted small">(${esc(r.domain)})</span></td><td class="num">${r.qualifier < 0 ? '–' : r.qualifier}</td><td class="ref">${esc(r.severityLabel)}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">Qualifiers 0 no impairment, 1 mild, 2 moderate, 3 severe, 4 complete (WHO, 2001). Assigned by the clinician; not derived from test scores.</p>` : '';
  const icfBlock = icfTable + findings(s, [['familyFactor', 'Family support context'], ['participationGoals', 'Communication, eating and community participation'], ['icfMappingSource', 'ICF mapping rationale and source']]);

  // ---- 5 impression
  const risk = (id: string) => (has(s, id) ? `${raw(s, id)} / 4 (clinician rated)` : '');
  const impression = `<div class="box strong"><div class="label">SLP diagnosis</div><div class="impression">${has(s, 'slpDiagnosis') ? esc(raw(s, 'slpDiagnosis')).replace(/\n/g, '<br>') : NR}</div></div>` +
    rowsTable([['Severity (clinician rated)', raw(s, 'severity')], ['Aspiration risk', risk('aspirationRisk')], ['Airway risk', risk('airwayRisk')], ['Nutrition risk', risk('nutritionRisk')]]);

  // ---- 6 recommendations and plan
  const doses = readDoses(s);
  const rx = Object.entries(doses).map(([id, d]) => ({ name: HNC_EXERCISE_LIBRARY.find(e => e.id === id)?.name ?? id, dose: d }));
  const released = rx.length > 0 && isReleased(s, Object.keys(doses));
  const programme = rx.length ? `<table class="grid"><thead><tr><th>Exercise</th><th class="num">Sessions / day</th><th>Dose and instructions</th></tr></thead><tbody>${
    rx.map(r => `<tr><td class="k">${esc(r.name)}</td><td class="num">${r.dose.sessionsPerDay}</td><td>${cell(r.dose.instructions)}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">${released ? 'Released to the patient home programme after documented clearance.' : 'Not yet released to the patient; clearance or dose review pending.'}</p>` : '';
  const recommendations = [
    has(s, 'recommendations') ? `<p>${esc(raw(s, 'recommendations')).replace(/\n/g, '<br>')}</p>` : '',
    has(s, 'dietPlan') ? `<h3>Diet, posture and bolus plan</h3><p>${esc(raw(s, 'dietPlan')).replace(/\n/g, '<br>')}</p>` : '',
    programme ? `<h3>Home exercise programme</h3>${programme}` : '',
    has(s, 'painLimit') ? `<h3>Safety and stop plan</h3><p>${esc(raw(s, 'painLimit')).replace(/\n/g, '<br>')}</p>` : '',
  ].join('');
  const followUp = has(s, 'followUp') ? `<p>${esc(raw(s, 'followUp')).replace(/\n/g, '<br>')}</p>` : '<p class="nr">Not recorded.</p>';

  const anyAssessment = HNC_CLINICAL_SECTIONS.filter(sec => !['command', 'demographics', 'exercise', 'patient', 'report'].includes(sec.id))
    .some(sec => sec.blocks.some(b => b.fields.some(f => has(s, f.id))));

  const body = `${idTable}
<h2>1. Reason for referral and history</h2>${referral || '<p class="nr">Not recorded.</p>'}
<h2>2. Oncological and treatment history</h2>${onco}${healing ? `<h3>Healing and exercise clearance</h3>${healing}` : ''}
<h2>3. Assessment findings</h2>${anyAssessment ? '' : '<p class="nr">No assessment fields recorded.</p>'}
${sectionBlock('3.1 Oral peripheral mechanism and cranial nerves', opme)}
${sectionBlock('3.2 Clinical swallowing evaluation', swallow)}
${sectionBlock('3.3 Instrumental swallowing assessment', instrumental)}
${sectionBlock('3.4 Voice and speech', voice)}
${sectionBlock('3.5 Nutrition and airway', nutrition)}
<h2>4. Functional profile (WHO-ICF)</h2>${icfBlock || notAssessed}
<h2>5. Clinical impression</h2>${impression}
<h2>6. Recommendations</h2>${recommendations || '<p class="nr">No recommendations recorded.</p>'}
<h2>7. Follow-up plan</h2>${followUp}
<p class="endnote"><b>References for cut-offs.</b> Arffa RE et al. J Voice 2012;26:462–5. Belafsky PC et al. Ann Otol Rhinol Laryngol 2008;117:919–24. Chen AY et al. Arch Otolaryngol Head Neck Surg 2001;127:870–6. Cheney DM et al. Ann Otol Rhinol Laryngol 2015;124:351–4. Crary MA et al. Arch Phys Med Rehabil 2005;86:1516–20. Dijkstra PU et al. Int J Oral Maxillofac Surg 2006;35:337–42. Hirano M. Clinical Examination of Voice. Springer; 1981. Hutcheson KA et al. Cancer 2017;123:62–70. List MA et al. Cancer 1990;66:564–9. Neubauer PD et al. Dysphagia 2015;30:521–8. Rosenbek JC et al. Dysphagia 1996;11:93–8. World Health Organization. ICF. 2001.</p>
<p class="endnote" style="margin-top:4px;border:0;padding:0">Prepared from clinician-entered findings in ${APP_LABEL}. Values are entered or confirmed by the treating clinician; ICF qualifiers and severity are independent clinical judgements and are not calculated from test scores. Sign according to your institution's procedure; no electronic signature or EHR submission is performed.</p>`;

  const letterhead: Letterhead = { name: facility.facilityName, department: facility.departmentName, address: facility.address, contact: facility.contact, logo: facility.logo };
  const signer: Signer = { name: facility.clinicianName, title: facility.clinicianTitle, registration: facility.registrationNumber, signature: facility.signature };
  return renderPrintDocument({
    title: 'Speech-Language Pathology Evaluation Report',
    subtitle: 'Head and neck cancer: swallowing, voice and speech',
    letterhead, runningId, signer,
    meta: [['Report no.', reportNo], ['Report date', generatedAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })]],
    body,
  }, { toolbar: opts.toolbar });
}

export function exportDiagnosticReport(fieldState: FieldState, facility: ReportFacility = DEFAULT_FACILITY): boolean {
  openPrintWindow(buildReportHtml(fieldState, facility, { toolbar: true }));
  return true;
}

/** Plain-text evaluation summary in SOAP order, for pasting into the hospital record. */
export function buildEvaluationEmrNote(fieldState: FieldState, facility: ReportFacility = DEFAULT_FACILITY, date = new Date()): string {
  const s = fieldState, r = (id: string) => raw(s, id);
  const idLine = idText(facility.identity ?? [], ', ') || `Study ID ${r('studyId') || 'not recorded'}`;
  const tnm = ['tCategory', 'nCategory', 'mCategory'].map(r).filter(Boolean).join('');
  const line = (label: string, value: string) => (value ? `  ${label}: ${value}` : '');
  const fois = num(s, 'fois');
  const o = [
    line('Jaw opening', withUnit(s, 'jawOpening', 'mm')),
    line('EAT-10', has(s, 'eat10') ? `${r('eat10')}/40` : ''),
    line('FOIS', fois ? `level ${fois} (${FOIS[fois]})` : ''),
    line('MASA-HNC', r('masa')),
    line('MDADI composite', r('mdadiComposite')),
    line('Clinical signs', [r('wetVoice') && `wet voice ${r('wetVoice').toLowerCase()}`, r('cough') && `cough ${r('cough').toLowerCase()}`, r('bolusIssue')].filter(Boolean).join('; ')),
    line('Instrumental', [r('vfss') && `VFSS ${r('vfss').toLowerCase()}`, r('fees') && `FEES ${r('fees').toLowerCase()}`, has(s, 'pas') && `worst PAS ${r('pas')}`, r('residue') && `residue ${r('residue').toLowerCase()}`].filter(Boolean).join('; ')),
    line('Voice', [has(s, 'mpt') && `MPT ${r('mpt')} s`, has(s, 'hnr') && `HNR ${r('hnr')} dB`, has(s, 'vhi10') && `VHI-10 ${r('vhi10')}/40`, r('communicationMethod')].filter(Boolean).join('; ')),
    line('Nutrition/airway', [has(s, 'weight') && `weight ${r('weight')} kg`, has(s, 'weightChange') && `change ${r('weightChange')}%/month`, r('route') && `route ${r('route')}`, r('tracheostomy') && `tracheostomy ${r('tracheostomy').toLowerCase()}`].filter(Boolean).join('; ')),
  ].filter(Boolean);
  return [
    'SPEECH-LANGUAGE PATHOLOGY – EVALUATION NOTE (HEAD AND NECK CANCER)',
    `Date: ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}   Patient: ${idLine}${r('age') ? `, ${r('age')} y` : ''}${r('gender') ? ` ${r('gender').slice(0, 1)}` : ''}`,
    `Diagnosis: ${[r('tumorSite'), tnm, r('phase'), has(s, 'rtDose') ? `RT ${r('rtDose')} Gy${has(s, 'fractions') ? `/${r('fractions')} fx` : ''}` : '', r('chemoAgent')].filter(Boolean).join(', ') || 'not recorded'}`,
    '',
    `S: ${r('chiefConcern') || 'Presenting concern not recorded.'}`,
    'O:',
    ...(o.length ? o : ['  No objective findings recorded.']),
    `A: ${r('slpDiagnosis') || 'Impression not recorded.'}${r('severity') ? ` Severity: ${r('severity')} (clinician rated).` : ''}${has(s, 'aspirationRisk') ? ` Aspiration risk ${r('aspirationRisk')}/4 (clinician rated).` : ''}`,
    `P: ${[r('recommendations'), r('dietPlan') && `Diet/posture: ${r('dietPlan')}`, r('followUp') && `Follow-up: ${r('followUp')}`].filter(Boolean).join(' ') || 'Plan not recorded.'}`,
    '',
    `SLP: ${[facility.clinicianName, facility.clinicianTitle, facility.registrationNumber].filter(Boolean).join(', ')}${facility.facilityName ? ` | ${facility.facilityName}` : ''}`,
  ].join('\n');
}
