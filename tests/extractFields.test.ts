import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSuggestions, parseDate, compareWithChart, mergedValue, type Suggestion } from '../apps/desktop/src/extractFields.ts';

const by = (list: Suggestion[]) => Object.fromEntries(list.map(s => [s.field, s]));
const val = (list: Suggestion[], f: string) => by(list)[f]?.value;

const DISCHARGE = `YENEPOYA MEDICAL COLLEGE HOSPITAL
DISCHARGE SUMMARY
Name: Mr. R. Kumar        UHID: YMC-2026-004512        Age/Sex: 58 Yrs / M
Date of Admission: 02/09/2026   Date of Discharge: 14/09/2026
Diagnosis: Carcinoma right lateral border of tongue (SCC), pT2 N1 M0
Date of biopsy: 12-08-2026
Chief complaints: Ulcer over tongue for 3 months, difficulty swallowing solids
Procedure: Right hemiglossectomy with right MRND and reconstruction with radial forearm free flap (RFFF) under GA.
Post-op: Tracheostomy done, decannulated on POD 7. Ryle's tube feeds; oral feeds started on POD 10.
Weight: 62 kg   Height: 168 cm
Advice: Adjuvant RT to be planned. No trismus at present.`;

const RT = `RADIOTHERAPY TREATMENT SUMMARY
Site: Oropharynx (base of tongue) carcinoma, p16 positive. cT3 N2b M0? see notes. Stage cT2N2bM0.
Technique: IMRT. Dose: 70 Gy in 35 fractions over 7 weeks with concurrent weekly Cisplatin 40 mg/m2.
Toxicities: Grade 2 mucositis, xerostomia, fatigue. CTCAE v5 dysphagia grade 2.
Mouth opening 32 mm at completion.`;

const VFSS = `VIDEOFLUOROSCOPIC SWALLOW STUDY (VFSS)
Findings: Delayed initiation of pharyngeal swallow. Moderate residue in valleculae and pyriform sinuses after puree.
Thin liquid: penetration to the level of the vocal folds, not ejected. PAS: 5 (worst).
FOIS level 5. EAT-10 score 25/40. MASA-HNC 168.
Impression: Moderate oropharyngeal dysphagia with reduced tongue base retraction and vallecular residue.`;

const PRAAT = `Voice report for 1. Sound aa
Pitch:
   Median pitch: 198.4 Hz
Jitter:
   Jitter (local): 1.237%
Shimmer:
   Shimmer (local): 5.611%
   Shimmer (local, dB): 0.512 dB
Harmonicity of the voiced parts only:
   Mean harmonics-to-noise ratio: 15.53 dB
MPT 9.2 sec`;

test('discharge summary: identity, staging, surgery, airway, feeding, weight', () => {
  const s = extractSuggestions(DISCHARGE);
  assert.equal(val(s, '__hospitalId'), 'YMC-2026-004512');
  assert.equal(val(s, 'age'), '58');
  assert.equal(val(s, 'gender'), 'Male');
  assert.equal(val(s, 'tumorSite'), 'Lip/oral cavity');
  assert.equal(val(s, 'tCategory'), 'T2');
  assert.equal(val(s, 'nCategory'), 'N1');
  assert.equal(val(s, 'mCategory'), 'M0');
  assert.equal(val(s, 'diagnosisDate'), '2026-08-12');
  assert.deepEqual([...(val(s, 'surgeryType') as string[])].sort(), ['Free flap', 'Glossectomy', 'Neck dissection']);
  assert.equal(val(s, 'flapType'), 'Radial forearm');
  assert.equal(val(s, 'tracheostomy'), 'Decannulated');
  assert.equal(val(s, 'route'), 'Combined');
  assert.equal(val(s, 'weight'), '62');
  assert.equal(val(s, 'heightCm'), '168');
  assert.match(val(s, 'chiefConcern') as string, /Ulcer over tongue/);
  assert.equal(by(s).toxicity, undefined, '"No trismus" must not be suggested');
  assert.match(by(s).tCategory.snippet, /pT2 N1 M0/);
});

test('radiotherapy summary: p16 oropharynx, dose/fractions, chemo, toxicity, CTCAE, trismus measure', () => {
  const s = extractSuggestions(RT);
  assert.equal(val(s, 'tumorSite'), 'Oropharynx p16 positive');
  assert.equal(val(s, 'nCategory'), 'N2b');
  assert.equal(val(s, 'rtDose'), '70');
  assert.equal(val(s, 'fractions'), '35');
  assert.deepEqual(val(s, 'chemoAgent'), ['Cisplatin']);
  assert.deepEqual([...(val(s, 'toxicity') as string[])].sort(), ['Fatigue', 'Mucositis', 'Xerostomia']);
  assert.equal(val(s, 'ctcaeDysphagia'), '2');
  assert.equal(val(s, 'jawOpening'), '32');
});

test('VFSS report: scores, residue, status, severity and impression', () => {
  const s = extractSuggestions(VFSS);
  assert.equal(val(s, 'pas'), '5');
  assert.equal(val(s, 'fois'), '5');
  assert.equal(val(s, 'eat10'), '25');
  assert.equal(val(s, 'masa'), '168');
  assert.equal(val(s, 'vfss'), 'Completed');
  assert.deepEqual([...(val(s, 'residue') as string[])].sort(), ['Pyriform', 'Vallecular']);
  assert.equal(val(s, 'severity'), 'Moderate');
  assert.match(val(s, 'summary') as string, /^Moderate oropharyngeal dysphagia/);
});

test('Praat voice report: jitter %, shimmer in dB (not %), HNR, MPT', () => {
  const s = extractSuggestions(PRAAT);
  assert.equal(val(s, 'jitter'), '1.237');
  assert.equal(val(s, 'shimmer'), '0.512');
  assert.equal(val(s, 'hnr'), '15.53');
  assert.equal(val(s, 'mpt'), '9.2');
});

test('shimmer only in % becomes a note, not a wrong value', () => {
  const s = extractSuggestions('Shimmer (local): 4.2%');
  assert.equal(val(s, 'shimmer'), '');
  assert.match(by(s).shimmer.note!, /dB/);
});

test('values outside a field’s allowed answers are never suggested', () => {
  const s = extractSuggestions('Staging T4 N2 M0. FOIS 9. PAS 12. EAT-10 55. Age 230. Tonsil carcinoma.');
  assert.equal(val(s, 'tCategory'), '', 'T4 without a/b becomes a note');
  assert.match(by(s).tCategory.note!, /T4a or T4b/);
  assert.equal(val(s, 'nCategory'), '');
  assert.equal(val(s, 'mCategory'), 'M0');
  for (const f of ['fois', 'pas', 'eat10', 'age']) assert.equal(by(s)[f], undefined, f);
  assert.equal(val(s, 'tumorSite'), '', 'oropharynx without p16 status is a note');
});

test('negation: no aspiration, no residue, no mucositis, no tube', () => {
  const s = extractSuggestions('No mucositis. Patient without nasogastric tube. No recurrence. Swallow study: no residue in valleculae.');
  assert.equal(by(s).toxicity, undefined);
  assert.equal(by(s).route, undefined);
  assert.equal(by(s).recurrence, undefined);
  assert.equal(by(s).residue, undefined);
});

test('laryngectomy and TEP', () => {
  const s = extractSuggestions('Total laryngectomy with primary TEP (Provox Vega). Carcinoma glottis T4a N0 M0.');
  assert.equal(val(s, 'laryngectomyType'), 'Total');
  assert.equal(val(s, 'communicationMethod'), 'TEP');
  assert.equal(val(s, 'tumorSite'), 'Larynx');
  assert.equal(val(s, 'tCategory'), 'T4a');
});

test('Indian date formats', () => {
  assert.equal(parseDate('12/08/2026'), '2026-08-12');
  assert.equal(parseDate('3-9-26'), '2026-09-03');
  assert.equal(parseDate('5th Oct 2026'), '2026-10-05');
  assert.equal(parseDate('2026-10-30'), '2026-10-30');
  assert.equal(parseDate('31/02/2026'), null);
  assert.equal(parseDate('nonsense'), null);
});

test('chart comparison and merging', () => {
  const single: Suggestion = { field: 'eat10', value: '25', label: '', section: 'swallow', snippet: '' };
  assert.equal(compareWithChart(single, undefined), 'new');
  assert.equal(compareWithChart(single, '25'), 'same');
  assert.equal(compareWithChart(single, '18'), 'different');
  const multi: Suggestion = { field: 'toxicity', value: ['Mucositis', 'Fatigue'], label: '', section: 'treatment', snippet: '' };
  assert.equal(compareWithChart(multi, ['Mucositis']), 'adds');
  assert.deepEqual(mergedValue(multi, ['Trismus', 'Mucositis']), ['Trismus', 'Mucositis', 'Fatigue']);
});
