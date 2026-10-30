// Finds clinical values in report text (PDF text or OCR) and proposes them for DegluTech fields.
// Rules only, on this device. Every suggestion carries the line it came from, is checked against the
// field's allowed answers, and is applied only after the clinician ticks it.
import { HNC_CLINICAL_SECTIONS, type ClinicalField, type HncSectionId } from '../../../packages/core/src/hncClinicalModel.ts';

export type Suggestion = {
  field: string;            // FieldState id, or '__hospitalId' for the patient record
  value: string | string[];
  label: string;
  section: HncSectionId | 'patient-record';
  snippet: string;
  note?: string;
};

type FieldInfo = { field: ClinicalField; section: HncSectionId };
const FIELDS = new Map<string, FieldInfo>();
for (const s of HNC_CLINICAL_SECTIONS) for (const b of s.blocks) for (const f of b.fields) if (!FIELDS.has(f.id)) FIELDS.set(f.id, { field: f, section: s.id });
export const fieldInfo = (id: string) => FIELDS.get(id);

export function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[   \t]/g, ' ')
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ {2,}/g, ' ');
}

const NEGATION = /\b(no|not|nil|without|absent|negative for|denies|denied|free of|r\/o|rule out|ruled out)\b[^.\n;]{0,25}$/i;
const negated = (text: string, index: number) => NEGATION.test(text.slice(Math.max(0, index - 40), index));
function snippetAt(text: string, index: number, length: number): string {
  const start = text.lastIndexOf('\n', index) + 1;
  let end = text.indexOf('\n', index + length); if (end < 0) end = text.length;
  let line = text.slice(start, end).trim();
  if (line.length > 140) { const rel = index - start; line = `${rel > 60 ? '…' : ''}${line.slice(Math.max(0, rel - 60), rel + length + 60).trim()}…`; }
  return line;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
/** Indian-style dates first (dd/mm/yyyy); returns yyyy-mm-dd or null. */
export function parseDate(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  let y: number, m: number, d: number;
  let r = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (r) { y = +r[1]; m = +r[2]; d = +r[3]; }
  else if ((r = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) { d = +r[1]; m = +r[2]; y = +r[3]; if (y < 100) y += 2000; }
  else if ((r = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]{3,9})[\s,-]+(\d{4})$/)) && MONTHS[r[2].slice(0, r[2] === 'sept' ? 4 : 3)]) { d = +r[1]; m = MONTHS[r[2].slice(0, 3)]; y = +r[3]; }
  else return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1950 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const DATE_RE = String.raw`(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?[\s-]+[A-Za-z]{3,9}[\s,-]+\d{4})`;

export function extractSuggestions(input: string): Suggestion[] {
  const text = normalise(input);
  const out = new Map<string, Suggestion>();
  const multi = new Map<string, { values: Set<string>; snippet: string }>();

  const allowed = (field: string, value: string): string | null => {
    const info = FIELDS.get(field);
    if (!info) return field === '__hospitalId' ? value : null;
    const opts = (info.field as ClinicalField & { options?: string[] }).options;
    if (opts) { const hit = opts.find(o => o.toLowerCase() === value.toLowerCase()); return hit ?? null; }
    if (['number', 'metric', 'scale'].includes(info.field.kind)) {
      const n = Number(value); if (!Number.isFinite(n)) return null;
      const f = info.field as ClinicalField & { min?: number; max?: number };
      if (f.min !== undefined && n < f.min) return null;
      if (f.max !== undefined && n > f.max) return null;
      if (info.field.kind === 'scale' && (n < 0 || n > 4)) return null;
    }
    return value;
  };
  const put = (field: string, value: string, index: number, length: number, note?: string) => {
    if (out.has(field)) return;
    const v = allowed(field, value); if (v === null) return;
    const info = FIELDS.get(field);
    out.set(field, { field, value: v, label: info?.field.label ?? 'Hospital ID / UHID', section: info?.section ?? 'patient-record', snippet: snippetAt(text, index, length), ...(note ? { note } : {}) });
  };
  const addMulti = (field: string, value: string, index: number, length: number) => {
    const v = allowed(field, value); if (v === null) return;
    const m = multi.get(field) ?? { values: new Set<string>(), snippet: snippetAt(text, index, length) };
    m.values.add(v); multi.set(field, m);
  };
  const first = (re: RegExp, fn: (m: RegExpExecArray) => void) => { const m = re.exec(text); if (m) fn(m); };
  const each = (re: RegExp, fn: (m: RegExpExecArray) => void) => { const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); let m; while ((m = g.exec(text))) fn(m); };

  // ---- identity and demographics
  first(/\b(?:UHID|MRD|MR\s*No|MRN|Hospital\s*(?:No|ID|Number)|IP\s*No|OP\s*No|Reg(?:istration)?\.?\s*No)\.?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/-]{3,19})\b/i, m => put('__hospitalId', m[1].toUpperCase(), m.index, m[0].length));
  first(/\b(?:age\s*\/\s*sex|age\s*\/\s*gender|age)\s*[:-]?\s*(\d{1,3})\s*(?:y(?:ea)?rs?|y)?\.?\s*(?:[/,|]\s*|\s+)?(male|female|m|f)?\b/i, m => {
    if (+m[1] >= 1 && +m[1] <= 110) put('age', m[1], m.index, m[0].length);
    if (m[2]) put('gender', /^f/i.test(m[2]) ? 'Female' : 'Male', m.index, m[0].length);
  });
  first(/\b(\d{1,3})\s*(?:y(?:ea)?rs?|y)\s*(?:old)?\s*[/,]?\s*(male|female)\b/i, m => { if (+m[1] <= 110) put('age', m[1], m.index, m[0].length); put('gender', /^f/i.test(m[2]) ? 'Female' : 'Male', m.index, m[0].length); });
  first(/\b(?:sex|gender)\s*[:-]\s*(male|female|m|f)\b/i, m => put('gender', /^f/i.test(m[1]) ? 'Female' : 'Male', m.index, m[0].length));
  first(/\b(?:chief|presenting)\s+complaints?\s*[:-]\s*([^\n]{6,200})/i, m => put('chiefConcern', m[1].trim().replace(/[.;,]\s*$/, ''), m.index, m[0].length));

  // ---- oncology
  first(new RegExp(String.raw`\b(?:date of (?:diagnosis|biopsy)|diagnosed on|biopsy (?:date|on|dated))\s*[:-]?\s*${DATE_RE}`, 'i'), m => { const d = parseDate(m[1]); if (d) put('diagnosisDate', d, m.index, m[0].length); });
  first(/\b[cpyr]{0,2}T(is|[0-4][ab]?|x)\s*,?\s*N([0-3][abc]?|x)\s*,?\s*M([01x])\b/, m => {
    const tnm: [string, string, string][] = [['tCategory', `T${m[1]}`, 'T category'], ['nCategory', `N${m[2]}`, 'N category'], ['mCategory', `M${m[3]}`, 'M category']];
    for (const [field, value, label] of tnm) {
      if (allowed(field, value) !== null) put(field, value, m.index, m[0].length);
      else if (!out.has(field)) out.set(field, { field, value: '', label, section: 'oncology', snippet: snippetAt(text, m.index, m[0].length), note: `${value} found; DegluTech records the sub-category (for example ${field === 'tCategory' ? 'T4a or T4b' : field === 'nCategory' ? 'N2a, N2b or N2c' : 'M0 or M1'}). Choose it manually.` });
    }
  });
  const p16pos = /\b(?:p16|hpv)\s*(?:status\s*)?[:-]?\s*(?:\+|positive|pos\b)/i.test(text);
  const p16neg = /\b(?:p16|hpv)\s*(?:status\s*)?[:-]?\s*(?:-(?!\w)|negative|neg\b)/i.test(text);
  const SITES: [RegExp, string | null][] = [
    [/\b(hypopharyn\w*|pyriform sinus|piriform sinus|post[- ]?cricoid)\b/i, 'Hypopharynx'],
    [/\b(nasopharyn\w*)\b/i, 'Nasopharynx'],
    [/\b(larynx|laryngeal|glottic|glottis|supraglottic|subglottic|vocal cords?)\b/i, 'Larynx'],
    [/\b(base of tongue|BOT|tonsil\w*|oropharyn\w*|soft palate|vallecula)\b/i, p16pos ? 'Oropharynx p16 positive' : p16neg ? 'Oropharynx p16 negative' : null],
    [/\b(oral tongue|tongue|buccal mucosa|floor of (?:the )?mouth|alveol\w*|gingivo[- ]?buccal|retromolar|lower lip|upper lip|hard palate|oral cavity)\b/i, 'Lip/oral cavity'],
  ];
  const cancerWords = /(carcinoma|\bscc\b|squamous|\bca\b|malignan\w*|tumou?r|growth|neoplasm|cancer)/i;
  for (const [re, site] of SITES) {
    let hit: RegExpExecArray | null = null;
    each(re, m => { if (!hit && cancerWords.test(text.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80)) && !negated(text, m.index)) hit = m; });
    if (hit) {
      const h = hit as RegExpExecArray;
      if (site) put('tumorSite', site, h.index, h[0].length);
      else if (!out.has('tumorSite')) out.set('tumorSite', { field: 'tumorSite', value: '', label: 'Primary site', section: 'oncology', snippet: snippetAt(text, h.index, h[0].length), note: 'Oropharyngeal site found, but no p16/HPV status: choose the site manually.' });
      break;
    }
  }
  first(/\b(recurren(?:t|ce))\b/i, m => { if (!negated(text, m.index)) put('recurrence', 'Recurrent', m.index, m[0].length); });

  // ---- treatment
  const SURG: [RegExp, string][] = [[/\b(?:hemi|partial|total|subtotal|near[- ]total)?\s*glossectomy\b/i, 'Glossectomy'], [/\b(?:marginal|segmental|hemi)?\s*mandibulectomy\b/i, 'Mandibulectomy'], [/\blaryngectomy\b/i, 'Laryngectomy'], [/\b(neck dissection|MRND|SOHND|SND|RND)\b/, 'Neck dissection'], [/\b(free flap|ALT flap|RFFF|radial forearm|fibula(?:r)? (?:free )?flap|FFF)\b/i, 'Free flap'], [/\b(PMMC|pectoralis major|pedicled flap|nasolabial flap|submental flap)\b/i, 'Pedicled flap']];
  for (const [re, v] of SURG) first(re, m => { if (!negated(text, m.index)) addMulti('surgeryType', v, m.index, m[0].length); });
  const FLAPS: [RegExp, string][] = [[/\b(radial forearm|RFFF)\b/i, 'Radial forearm'], [/\b(anterolateral thigh|ALT)\b/, 'Anterolateral thigh'], [/\bfibula/i, 'Fibula'], [/\b(pectoralis major|PMMC)\b/i, 'Pectoralis major']];
  for (const [re, v] of FLAPS) first(re, m => put('flapType', v, m.index, m[0].length));
  first(/\b(bilateral|ipsilateral|contralateral)\b[^.\n]{0,30}\bneck dissection|\bneck dissection\b[^.\n]{0,30}\b(bilateral|ipsilateral|contralateral)\b/i, m => { const side = (m[1] || m[2]).toLowerCase(); put('neckDissection', side[0].toUpperCase() + side.slice(1), m.index, m[0].length); });
  first(/(\d{2}(?:\.\d{1,2})?)\s*Gy\s*(?:in|\/|over|,|@)?\s*(\d{1,2})\s*(?:#|fr\b|fx\b|fractions?|sittings)/i, m => { put('rtDose', m[1], m.index, m[0].length); put('fractions', m[2], m.index, m[0].length); });
  first(/\b(?:total\s+)?dose\s*[:-]?\s*(\d{2}(?:\.\d{1,2})?)\s*Gy\b/i, m => put('rtDose', m[1], m.index, m[0].length));
  first(/\b(\d{1,2})\s*(?:fractions|#)\b/i, m => put('fractions', m[1], m.index, m[0].length));
  const CHEMO: [RegExp, string][] = [[/\b(cisplatin|CDDP)\b/i, 'Cisplatin'], [/\bcarboplatin\b/i, 'Carboplatin'], [/\bcetuximab\b/i, 'Cetuximab'], [/\b(5[- ]?FU|fluorouracil)\b/i, '5-FU'], [/\bpaclitaxel\b/i, 'Paclitaxel'], [/\b(nivolumab|pembrolizumab|immunotherapy)\b/i, 'Immunotherapy']];
  for (const [re, v] of CHEMO) first(re, m => { if (!negated(text, m.index)) addMulti('chemoAgent', v, m.index, m[0].length); });
  const TOX: [RegExp, string][] = [[/\bmucositis\b/i, 'Mucositis'], [/\b(xerostomia|dry mouth)\b/i, 'Xerostomia'], [/\bfibrosis\b/i, 'Fibrosis'], [/\btrismus\b/i, 'Trismus'], [/\bneuropathy\b/i, 'Neuropathy'], [/\b(ototoxicity|hearing loss)\b/i, 'Ototoxicity'], [/\bfatigue\b/i, 'Fatigue']];
  for (const [re, v] of TOX) first(re, m => { if (!negated(text, m.index)) addMulti('toxicity', v, m.index, m[0].length); });
  first(/\bCTCAE\b[^.\n]{0,60}?dysphagia[^.\n0-9]{0,20}grade\s*([1-5])|\bdysphagia[^.\n0-9]{0,15}grade\s*([1-5])[^.\n]{0,20}CTCAE/i, m => put('ctcaeDysphagia', m[1] || m[2], m.index, m[0].length));

  // ---- airway, feeding, nutrition
  first(/\bdecannulat\w*/i, m => put('tracheostomy', 'Decannulated', m.index, m[0].length));
  first(/\b(speaking valve|passy[- ]muir)\b/i, m => put('tracheostomy', 'Speaking valve', m.index, m[0].length));
  first(/\b(uncuffed|cuffless)\b[^.\n]{0,25}(trache\w*|tube)/i, m => put('tracheostomy', 'Cuffless', m.index, m[0].length));
  first(/\bcuffed\b[^.\n]{0,25}(trache\w*|tube)/i, m => { if (!/un$/i.test(text.slice(m.index - 2, m.index))) put('tracheostomy', 'Cuffed', m.index, m[0].length); });
  first(/\bno (?:tracheostomy|tracheostomy tube)\b/i, m => put('tracheostomy', 'None', m.index, m[0].length));
  let ngt: RegExpExecArray | null = null, peg: RegExpExecArray | null = null, oral: RegExpExecArray | null = null;
  first(/\b(ryle'?s? tube|nasogastric|NG tube|NGT|NG feeds?)\b/i, m => { if (!negated(text, m.index) && !/remov/i.test(text.slice(m.index, m.index + 40))) ngt = m; });
  first(/\b(PEG|gastrostomy|G[- ]tube)\b/, m => { if (!negated(text, m.index)) peg = m; });
  first(/\b(oral (?:feeds?|diet|intake)|orally)\b/i, m => { if (!negated(text, m.index)) oral = m; });
  const tube = (peg ?? ngt) as RegExpExecArray | null;
  if (tube) put('route', oral ? 'Combined' : peg ? 'PEG' : 'NGT', tube.index, tube[0].length);
  first(/\b(?:body\s*)?weight\s*[:-]?\s*(\d{2,3}(?:\.\d)?)\s*kg\b/i, m => put('weight', m[1], m.index, m[0].length));
  first(/\bheight\s*[:-]?\s*(\d{3}(?:\.\d)?)\s*cm\b/i, m => put('heightCm', m[1], m.index, m[0].length));

  // ---- swallowing scores and findings
  first(/\bEAT[\s-]?10\b[^0-9\n]{0,30}(\d{1,2})(?:\s*\/\s*40)?\b/i, m => { if (+m[1] <= 40) put('eat10', m[1], m.index, m[0].length); });
  first(/\bF[O0][I1l|]S\b[^0-9\n]{0,25}([1-7])\b/i, m => put('fois', m[1], m.index, m[0].length));
  first(/\b(?:PAS|penetration[\s-]*aspiration[\s-]*scale)\b[^0-9\n]{0,30}([1-8])\b/i, m => put('pas', m[1], m.index, m[0].length));
  first(/\bMASA(?:[\s-]*HNC)?\b[^0-9\n]{0,25}(\d{2,3})\b/i, m => { if (+m[1] <= 200) put('masa', m[1], m.index, m[0].length); });
  first(/\bDIGEST\b[^0-9\n]{0,30}(?:grade\s*)?([0-4])\b/i, m => put('digestOverall', m[1], m.index, m[0].length, 'Check this is the overall grade, not the safety or efficiency grade.'));
  first(/\bMDADI\b[^0-9\n]{0,30}composite[^0-9\n]{0,15}(\d{2,3}(?:\.\d+)?)|\bMDADI\s+composite\b[^0-9\n]{0,15}(\d{2,3}(?:\.\d+)?)/i, m => put('mdadiComposite', m[1] || m[2], m.index, m[0].length));
  first(/\bMDADI\b[^0-9\n]{0,30}global[^0-9\n]{0,15}(\d{2,3})/i, m => put('mdadiGlobal', m[1], m.index, m[0].length));
  first(/\b(mild|moderate|moderately severe|severe|profound)\s+(?:oro)?(?:pharyngeal\s+|oral\s+|oropharyngeal\s+)?dysphagia\b/i, m => { if (!negated(text, m.index)) put('severity', m[1].toLowerCase() === 'moderately severe' ? 'Severe' : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), m.index, m[0].length); });
  first(/\b(?:VFSS|videofluoro\w*|modified barium swallow|MBSS?)\b/i, m => { if (/\b(impression|findings|penetration|aspiration|residue|PAS)\b/i.test(text)) put('vfss', 'Completed', m.index, m[0].length); });
  first(/\b(?:FEES|fib(?:er|re)[- ]?optic endoscopic evaluation of swallowing)\b/i, m => { if (/\b(impression|findings|penetration|aspiration|residue|PAS)\b/i.test(text)) put('fees', 'Completed', m.index, m[0].length); });
  const RES: [RegExp, string][] = [[/\bvallecul\w*/i, 'Vallecular'], [/\b(pyriform|piriform)\b/i, 'Pyriform'], [/\bdiffuse (?:pharyngeal )?residue\b/i, 'Diffuse'], [/\boral (?:cavity )?residue\b/i, 'Oral']];
  if (/\bresidu\w*/i.test(text)) for (const [re, v] of RES) first(re, m => { const near = text.slice(Math.max(0, m.index - 60), m.index + 60); if (/residu|stasis|pooling/i.test(near) && !negated(text, m.index)) addMulti('residue', v, m.index, m[0].length); });
  first(/\b(?:impression|conclusion)\s*[:-]\s*([^\n]{10,400})/i, m => { if (/(vfss|fees|swallow|barium|endoscop)/i.test(text)) put('summary', m[1].trim(), m.index, m[0].length); });
  first(/\b(wet|gurgly)\s+voice\b/i, m => { if (!negated(text, m.index)) put('wetVoice', /consistent|always|every/i.test(text.slice(m.index, m.index + 60)) ? 'Consistent' : 'Intermittent', m.index, m[0].length); });

  // ---- oral motor and voice
  first(/\b(?:max(?:imum|imal)?\s+)?(?:mouth opening|inter[\s-]?incisal(?:\s+(?:opening|distance))?|MIO|jaw opening)\b[^0-9\n]{0,20}(\d{1,2}(?:\.\d)?)\s*mm\b/i, m => put('jawOpening', m[1], m.index, m[0].length));
  first(/\b(?:MPT|maximum phonation time)\b[^0-9\n]{0,25}(\d{1,2}(?:\.\d{1,2})?)\s*(?:s\b|sec\w*)?/i, m => { if (+m[1] <= 60) put('mpt', m[1], m.index, m[0].length); });
  first(/\bjitter\s*(?:\(local\))?\s*[:=-]?\s*(\d{1,2}(?:\.\d{1,4})?)\s*%/i, m => put('jitter', m[1], m.index, m[0].length));
  first(/\bshimmer\s*\(local,\s*dB\)\s*[:=-]?\s*(\d{1,2}(?:\.\d{1,4})?)\s*dB|\bshimmer\b[^%\n]{0,20}?(\d{1,2}(?:\.\d{1,4})?)\s*dB\b/i, m => put('shimmer', m[1] || m[2], m.index, m[0].length));
  if (!out.has('shimmer')) first(/\bshimmer\s*(?:\(local\))?\s*[:=-]?\s*(\d{1,2}(?:\.\d{1,4})?)\s*%/i, m => out.set('shimmer', { field: 'shimmer', value: '', label: 'Shimmer', section: 'voice', snippet: snippetAt(text, m.index, m[0].length), note: `Shimmer is reported as ${m[1]}%; DegluTech records shimmer in dB. Enter the dB value manually.` }));
  first(/\b(?:mean\s+)?(?:harmonics[\s-]*to[\s-]*noise ratio|HNR)\b[^0-9\n-]{0,20}(-?\d{1,2}(?:\.\d{1,3})?)\s*dB/i, m => put('hnr', m[1], m.index, m[0].length));
  first(/\bVHI[\s-]?10\b[^0-9\n]{0,25}(\d{1,2})\b/i, m => { if (+m[1] <= 40) put('vhi10', m[1], m.index, m[0].length); });
  first(/\b(hypernasal|hyponasal)\w*/i, m => { if (!negated(text, m.index)) put('resonance', m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), m.index, m[0].length); });
  first(/\b(total|partial|hemi|supracricoid|supraglottic)\s+laryngectomy\b/i, m => put('laryngectomyType', /total/i.test(m[1]) ? 'Total' : 'Partial', m.index, m[0].length));
  first(/\b(TEP|tracheo[- ]?(?:o)?esophageal puncture|voice prosthesis|provox|blom[- ]singer)\b/i, m => { if (!negated(text, m.index)) put('communicationMethod', 'TEP', m.index, m[0].length); });
  first(/\belectrolarynx\b/i, m => { if (!out.has('communicationMethod') && !negated(text, m.index)) put('communicationMethod', 'Electrolarynx', m.index, m[0].length); });

  for (const [field, m] of multi) {
    const info = FIELDS.get(field)!;
    out.set(field, { field, value: [...m.values], label: info.field.label, section: info.section, snippet: m.snippet });
  }
  return [...out.values()];
}

/** How a suggestion compares with what is already in the chart. */
export function compareWithChart(s: Suggestion, current: string | string[] | undefined): 'new' | 'same' | 'different' | 'adds' {
  const empty = current === undefined || current === '' || (Array.isArray(current) && current.length === 0);
  if (empty) return 'new';
  if (Array.isArray(s.value)) {
    const cur = Array.isArray(current) ? current : [current];
    return s.value.every(v => cur.includes(v)) ? 'same' : 'adds';
  }
  return String(current).trim().toLowerCase() === s.value.trim().toLowerCase() ? 'same' : 'different';
}
/** Applying a multi-choice suggestion adds to what is already ticked; single values replace. */
export function mergedValue(s: Suggestion, current: string | string[] | undefined): string | string[] {
  if (!Array.isArray(s.value)) return s.value;
  const cur = Array.isArray(current) ? current : current ? [current] : [];
  return [...new Set([...cur, ...s.value])];
}
