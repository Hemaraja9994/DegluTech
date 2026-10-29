import type { FieldState } from './reportEngine';
import { HNC_EXERCISE_LIBRARY } from '../../../packages/core/src/hncClinicalModel.ts';

export type Dose = { instructions: string; sessionsPerDay: number };
export function readDoses(state: FieldState): Record<string, Dose> {
  try {
    const raw = JSON.parse(String(state.prescriptionDoses || '{}'));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, Dose] => {
      const dose = entry[1] as Dose;
      return !!dose && typeof dose.instructions === 'string' && Number.isInteger(dose.sessionsPerDay) && dose.sessionsPerDay >= 1 && dose.sessionsPerDay <= 12;
    }));
  } catch { return {}; }
}
export const releaseKey = (state: FieldState, ids: string[]) => JSON.stringify({
  ids: [...ids].sort(), doses: readDoses(state), language: state.releaseLanguage,
  clearance: state.exerciseClearance, details: state.clearanceDetails, fistula: state.fistula, flap: state.freshFlap,
  stop: state.painLimit, studyId: state.studyId,
});
export const releaseBlock = (state: FieldState, ids: string[]) => {
  if (!ids.length) return 'Select at least one exercise.';
  if (ids.some(id => !HNC_EXERCISE_LIBRARY.some(exercise => exercise.id === id))) return 'Unknown exercise: clinician review is required.';
  if (state.fistula !== 'No' || state.freshFlap !== 'No') return 'Healing findings require review in Treatment and Toxicity. Patient release is blocked for positive or unknown findings.';
  if (state.exerciseClearance !== 'Cleared' || !String(state.clearanceDetails || '').trim()) return 'Document clinician clearance and restrictions in Treatment and Toxicity.';
  if (!String(state.painLimit || '').trim()) return 'Record an individual stop/contact plan.';
  if (!['en', 'kn', 'ml', 'te', 'hi', 'ta'].includes(String(state.releaseLanguage))) return 'Select the patient instruction language.';
  const doses = readDoses(state);
  if (ids.some(id => !doses[id]?.instructions.trim())) return 'Set a daily session count and individual dose for every selected exercise.';
  return '';
};
export const isReleased = (state: FieldState, ids: string[]) => !releaseBlock(state, ids) && state.planRelease === releaseKey(state, ids);
