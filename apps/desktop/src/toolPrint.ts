/** Printed EAT-10 report (clinician) and EAT-10 handout (patient), in the shared print layout. */
import type { ClinicSettings, Clinician } from './clinicStore.ts';
import { EAT10_ITEMS, eat10Band, eat10Score, handoutProgress, type Eat10Response, type Eat10Session, type PatientLine } from './toolSuite.ts';
import { esc, idText, letterheadFromSettings, renderPrintDocument, signerFrom } from './printDoc.ts';
import { exerciseTranslations, type ExerciseLanguageCode } from './translationData.ts';
import { HNC_EXERCISE_LIBRARY } from '../../../packages/core/src/hncClinicalModel.ts';
import { readDoses } from './prescriptionRules.ts';
import type { FieldState } from './reportEngine.ts';

export type Eat10PrintArgs = {
  settings: ClinicSettings; clinician: Clinician | null; identity: { label: string; value: string }[];
  patient: PatientLine; resp: Eat10Response[]; history: Eat10Session[]; today: string; followUp: string; toolbar?: boolean;
};
const longDate = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); };
const runningIdOf = (a: Eat10PrintArgs) => (a.identity.length ? idText(a.identity) : a.patient.id);

export function buildEat10ReportHtml(a: Eat10PrintArgs): string {
  const { total, missing } = eat10Score(a.resp), band = eat10Band(total);
  const ids = a.identity.length ? a.identity : [{ label: 'Patient', value: a.patient.id }];
  const idRows: [string, string][] = [...ids.map(r => [r.label, r.value] as [string, string]), ['Age / Sex', a.patient.ageSex], ['Session date', longDate(a.today)]];
  if (idRows.length % 2) idRows.push(['', '']);
  const td = ([k, v]: [string, string]) => (k ? `<td class="k">${esc(k)}</td><td class="v">${v ? esc(v) : '<span class="nr">Not recorded</span>'}</td>` : '<td></td><td></td>');
  const idTable = `<table class="id"><tbody>${Array.from({ length: idRows.length / 2 }, (_, i) => `<tr>${td(idRows[2 * i])}${td(idRows[2 * i + 1])}</tr>`).join('')}<tr><td class="k">Diagnosis</td><td class="v" colspan="3">${esc(a.patient.dx)}</td></tr></tbody></table>`;
  const sessions = [...a.history, { phaseLabel: 'Today', date: a.today, total }];
  const body = `
${idTable}
<div class="box strong" style="margin-top:8px"><div class="label">EAT-10 total</div><div class="impression">${total} / 40 — ${esc(band.label)}</div>
<p>${esc(band.text)}</p>${missing ? `<p><b>Provisional:</b> ${missing} item(s) unanswered.</p>` : ''}</div>
<h2>Item responses</h2>
<table class="grid"><thead><tr><th style="width:6%">#</th><th>Item</th><th class="num" style="width:26%">Score (0 none – 4 severe)</th></tr></thead><tbody>
${EAT10_ITEMS.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t)}</td><td class="num"><b>${a.resp[i] === null ? '–' : a.resp[i]}</b></td></tr>`).join('')}
<tr><td></td><td><b>Total</b></td><td class="num"><b>${total}</b></td></tr></tbody></table>
${a.history.length ? `<h2>Score history</h2>
<table class="grid"><thead><tr><th>Session</th><th>Date</th><th class="num">Total / 40</th></tr></thead><tbody>
${sessions.map(h => `<tr><td>${esc(h.phaseLabel)}</td><td>${esc(longDate(h.date))}</td><td class="num">${h.total}</td></tr>`).join('')}</tbody></table>` : ''}
<h2>Interpretation and plan</h2>
<table class="grid"><tbody>
${a.history.length ? '' : '<tr><td class="k">Score history</td><td>First recorded session.</td></tr>'}<tr><td class="k">Cut-offs</td><td>≥ 3 abnormal swallowing (Belafsky et al., 2008); &gt; 15 higher likelihood of aspiration on instrumental assessment (Cheney et al., 2015).</td></tr>
<tr><td class="k">Plan</td><td>${a.followUp.trim() ? esc(a.followUp) : '<span class="nr">Not recorded</span>'}</td></tr></tbody></table>
`;
  return renderPrintDocument({
    title: 'EAT-10 Screening Report', subtitle: 'Eating Assessment Tool (Belafsky et al., 2008)',
    letterhead: letterheadFromSettings(a.settings), runningId: runningIdOf(a), signer: signerFrom(a.clinician),
    meta: [['Session', longDate(a.today)]], body,
    footerNote: 'The EAT-10 screens patient-reported symptoms; it does not replace a clinical swallow examination or an instrumental study. Belafsky PC et al. Ann Otol Rhinol Laryngol 2008;117:919–24. Cheney DM et al. Ann Otol Rhinol Laryngol 2015;124:351–4.',
  }, { toolbar: a.toolbar });
}

export function buildEat10HandoutHtml(a: Eat10PrintArgs): string {
  const { total } = eat10Score(a.resp), band = eat10Band(total);
  const contact = [a.settings.instituteName, a.settings.phone].filter(Boolean).join(', ');
  const body = `
<p><b>Date:</b> ${esc(longDate(a.today))}</p>
<div class="box strong"><div class="label">Today's result</div><div class="impression">${total} out of 40</div><p>${esc(band.patient)}</p></div>
<h2>What this means</h2>
<p>You answered 10 questions about eating and swallowing. A lower number means fewer problems. A score of 3 or more tells us swallowing is harder than usual. We use this number to see whether your exercises are helping over time.</p>
<h2>Your progress</h2>
<p>${esc(handoutProgress(a.history, total))}</p>
<h2>Next steps</h2>
<p>${a.followUp.trim() ? esc(a.followUp) : 'Ask your therapist when your next review is due.'}</p>
<div class="box"><div class="label">Contact the clinic${contact ? `: ${esc(contact)}` : ''}</div>
<p>Contact us sooner if swallowing gets harder, if you cough or choke when eating or drinking, if you lose weight, or if you have a fever or chest infection.</p></div>`;
  return renderPrintDocument({
    title: 'Your swallowing check', subtitle: 'EAT-10 result explained',
    letterhead: letterheadFromSettings(a.settings), runningId: runningIdOf(a), body, patientFacing: true,
  }, { toolbar: a.toolbar });
}

// ---------------------------------------------------------------------------
// Home exercise programme handout: released exercises, the patient's language, the clinician's dose and stop plan.

export function buildHomeProgrammeHtml(a: { settings: ClinicSettings; clinician: Clinician | null; identity: { label: string; value: string }[]; state: FieldState; ids: string[]; toolbar?: boolean }): string {
  const lang = (['en', 'kn', 'ml', 'te', 'hi', 'ta'].includes(String(a.state.releaseLanguage)) ? String(a.state.releaseLanguage) : 'en') as ExerciseLanguageCode;
  const bundle = exerciseTranslations[lang], en = exerciseTranslations.en, doses = readDoses(a.state);
  const contact = [a.settings.instituteName, a.settings.phone].filter(Boolean).join(', ');
  const released = typeof a.state.planReleasedAt === 'string' && a.state.planReleasedAt ? new Date(a.state.planReleasedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const items = a.ids.map((id, n) => {
    const copy = bundle.exercises[id] ?? en.exercises[id], fallback = HNC_EXERCISE_LIBRARY.find(e => e.id === id)?.name ?? id, dose = doses[id];
    return `<section style="break-inside:avoid;margin-bottom:10px">
<h2>${n + 1}. ${esc(copy?.title ?? fallback)}${lang !== 'en' && en.exercises[id] ? ` <span class="muted" style="font-weight:400">(${esc(en.exercises[id].title)})</span>` : ''}</h2>
${copy ? `<p>${esc(copy.description)}</p><ol>${copy.steps.map(st => `<li><b>${esc(st.cue)}.</b> ${esc(st.instruction)}</li>`).join('')}</ol>` : ''}
<table class="grid"><tbody>
<tr><td class="k">Times per day</td><td><b>${dose ? dose.sessionsPerDay : '–'}</b></td></tr>
<tr><td class="k">Your dose (from your therapist)</td><td>${dose?.instructions ? esc(dose.instructions) : '<span class="nr">Ask your therapist</span>'}</td></tr>
${copy ? `<tr><td class="k">${esc(bundle.safetyTitle)}</td><td>${esc(copy.safety)}</td></tr>` : ''}
</tbody></table>
<p class="small">Done today: ☐ ☐ ☐ ☐ ☐ ☐ ☐</p></section>`;
  }).join('');
  const body = `<p><b>Language:</b> ${esc(bundle.nativeName)}${lang !== 'en' ? ' (draft translation, reviewed by your therapist)' : ''}${released ? ` · <b>Programme released:</b> ${esc(released)}` : ''}</p>
${items || '<p class="nr">No exercises released.</p>'}
<div class="box strong"><div class="label">Stop and contact the clinic${contact ? `: ${esc(contact)}` : ''}</div>
<p>${typeof a.state.painLimit === 'string' && a.state.painLimit.trim() ? esc(a.state.painLimit) : 'Stop if you have sharp pain, bleeding, breathing discomfort or persistent coughing, and call the clinic.'}</p></div>`;
  return renderPrintDocument({
    title: 'Your home exercise programme', subtitle: 'Swallowing, jaw and speech exercises',
    letterhead: letterheadFromSettings(a.settings), runningId: idText(a.identity) || 'Home programme',
    body, patientFacing: true, lang, signer: signerFrom(a.clinician),
  }, { toolbar: a.toolbar });
}
