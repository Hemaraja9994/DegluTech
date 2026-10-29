import { bmi, weightLoss, bestJawOpening } from '../../../../packages/core/src/clinicalCalculations';
import type { FieldState } from '../reportEngine';
export function ClinicalMeasures({ section, values }: { section: string; values: FieldState }) {
  const jaw = bestJawOpening([values.jawTrial1, values.jawTrial2, values.jawTrial3]);
  const rows = section === 'opme' ? [['Best of three', jaw === null ? 'Three valid measurements required' : jaw+' mm'], ['Review flag', jaw === null ? 'Not assessed' : jaw <= 35 ? 'At or below 35 mm: review clinically' : 'Above 35 mm']]
    : section === 'nutrition' ? [['BMI', bmi(values.weight, values.heightCm) ?? 'Not calculable'], ['Weight loss', weightLoss(values.previousWeight, values.weight) === null ? 'Two valid weights required' : weightLoss(values.previousWeight, values.weight)+'%']] : [];
  if (!rows.length) return null;
  return <section className="suite-measures" aria-label="Calculated measurements">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>;
}

