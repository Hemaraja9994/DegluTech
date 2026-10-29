import test from 'node:test';
import assert from 'node:assert/strict';
import { bmi, weightLoss, bestJawOpening, numeric, weeklyAdherence } from '../packages/core/src/clinicalCalculations.ts';
import { generateSmartDefaults, deriveSeverityFromInstrumentals, buildIcfTable, buildExecutiveSummary, buildStructuredRecommendations, computeSectionCompletion, recordedNumber } from '../apps/desktop/src/reportEngine.ts';
import { readDoses, releaseKey, releaseBlock, isReleased } from '../apps/desktop/src/prescriptionRules.ts';
import { buildReportHtml } from '../apps/desktop/src/reportPdf.ts';
import { HNC_CLINICAL_SECTIONS } from '../packages/core/src/hncClinicalModel.ts';

test('numeric parsing never converts missing observations to zero', () => {
  for (const input of [undefined, null, '', ' ', [], 'NaN', 'Infinity']) {
    assert.equal(numeric(input), null); assert.equal(recordedNumber(input), null);
  }
  assert.equal(numeric('0'), 0);
});
test('BMI: 70 kg at 175 cm is 22.9', () => {
  assert.equal(bmi('70', '175'), 22.9);
  for (const [w, h] of [['', '175'], ['70', '0'], ['-1', '175'], ['70', '']]) assert.equal(bmi(w, h), null);
});
test('weight change: 60 to 54 kg is 10% loss; gain remains negative', () => {
  assert.equal(weightLoss('60', '54'), 10);
  assert.equal(weightLoss('50', '55'), -10);
  assert.equal(weightLoss('', '54'), null);
  assert.equal(weightLoss('0', '54'), null);
});
test('jaw measurement requires all three trials and uses the best', () => {
  assert.equal(bestJawOpening(['30', '35', '32']), 35);
  assert.equal(bestJawOpening(['36', '35', '32']), 36);
  assert.equal(bestJawOpening(['0', '0', '0']), 0);
  for (const values of [['30', '', '32'], ['30', '32'], ['-1', '35', '32'], ['151', '35', '32']]) assert.equal(bestJawOpening(values), null);
});
test('adherence arithmetic does not hide missing denominators', () => {
  assert.equal(weeklyAdherence(7, 14), 50);
  assert.equal(weeklyAdherence(0, 14), 0);
  assert.equal(weeklyAdherence(0, 0), null);
  assert.equal(weeklyAdherence(-1, 14), null);
});
test('no synthetic diagnosis, severity or diet is inferred from instrumental scores', () => {
  for (const state of [{}, { fois: '', pas: '' }, { fois: '1', pas: '8', eat10: '40' }]) {
    const draft = generateSmartDefaults(state);
    assert.equal(draft.slpDiagnosis, ''); assert.equal(draft.severity, 'Unknown');
    assert.equal(draft.recommendations, ''); assert.equal(draft.followUp, '');
    const summary = buildExecutiveSummary(state, draft);
    assert.equal(summary.dietRoute, 'Not recorded');
    assert.equal(summary.aspirationRiskLabel, 'Not recorded');
    assert.ok(summary.textureGuidance.includes('No clinician-entered'));
  }
  assert.equal(deriveSeverityFromInstrumentals({ severity: 'Mild', pas: '8' }), 'Mild');
});
test('clinician plans are preserved exactly, without invented strategies', () => {
  const result = buildStructuredRecommendations({ recommendations: 'Individual plan', dietPlan: 'Recorded plan', painLimit: 'Call clinician', followUp: 'Review date' });
  assert.deepEqual(result.compensatoryAndDiet, ['Recorded plan']);
  assert.deepEqual(result.forceRangeOfMotion, ['Individual plan']);
});
test('missing and out-of-range ICF qualifiers are unknown, not normal', () => {
  assert.ok(buildIcfTable({}).every(row => row.qualifier === -1));
  for (const value of ['-1', '5', '1.5', '']) assert.equal(buildIcfTable({ b5105: value })[0].qualifier, -1);
  assert.equal(buildIcfTable({ b5105: '0' })[0].qualifier, 0);
});
test('thirteen sections retained; completion requires every field', () => {
  assert.equal(HNC_CLINICAL_SECTIONS.length, 13);
  assert.ok(computeSectionCompletion({}).every(section => section.status === 'empty'));
  const section = HNC_CLINICAL_SECTIONS.find(s => s.id === 'demographics')!;
  const fields = section.blocks.flatMap(b => b.fields);
  const values = Object.fromEntries(fields.map(f => [f.id, 'Recorded']));
  assert.equal(computeSectionCompletion(values).find(s => s.id === section.id)?.status, 'complete');
  delete values[fields[0].id];
  assert.equal(computeSectionCompletion(values).find(s => s.id === section.id)?.status, 'partial');
});
const cleared = () => ({ fistula: 'No', freshFlap: 'No', exerciseClearance: 'Cleared', clearanceDetails: 'Reviewed for this fictional case', painLimit: 'Stop and call the clinician', releaseLanguage: 'en', prescriptionDoses: JSON.stringify({ masako: { instructions: 'Individually reviewed fictional dose', sessionsPerDay: 1 } }) });
test('release requires documented clearance, healing findings, language and dose', () => {
  assert.equal(releaseBlock(cleared(), ['masako']), '');
  assert.ok(releaseBlock({}, ['masako'])); assert.ok(releaseBlock(cleared(), []));
  assert.ok(releaseBlock(cleared(), ['unknown']));
  for (const [key, value] of [['fistula', 'Yes'], ['fistula', 'Unknown'], ['freshFlap', 'Yes'], ['exerciseClearance', 'Withheld'], ['clearanceDetails', ''], ['painLimit', ''], ['releaseLanguage', ''], ['prescriptionDoses', '{}']]) assert.ok(releaseBlock({ ...cleared(), [key]: value }, ['masako']));
});
test('changes to prescriptions or clearance invalidate release', () => {
  const state = { ...cleared(), planRelease: releaseKey(cleared(), ['masako']) };
  assert.equal(isReleased(state, ['masako']), true);
  for (const [key, value] of [['painLimit', 'Changed'], ['releaseLanguage', 'kn'], ['clearanceDetails', 'Changed'], ['studyId', 'DT-HNC-002'], ['prescriptionDoses', JSON.stringify({masako: {instructions: 'New dose', sessionsPerDay: 2}})]]) assert.equal(isReleased({ ...state, [key]: value }, ['masako']), false);
  assert.equal(isReleased(state, ['masako', 'effortful-swallow']), false);
});
test('malformed and invalid doses are rejected', () => {
  for (const raw of ['null', '[]', '{', '{"masako":{"instructions":"x","sessionsPerDay":0}}', '{"masako":{"instructions":"x","sessionsPerDay":1.5}}']) assert.deepEqual(readDoses({ prescriptionDoses: raw }), {});
});
test('print report escapes entered text, includes new measures and does not invent demographics', () => {
  const html = buildReportHtml({ studyId: '<script>alert(1)</script>', vhi10: '17', mdadiComposite: '65', jawTrial1: '30', slpDiagnosis: '<img src=x onerror=alert(1)>' });
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('>17<')); assert.ok(html.includes('>65<'));
  assert.ok(html.includes('Recorded Findings Appendix'));
  assert.ok(buildReportHtml({}).includes('No assessment fields recorded.'));
});
