export function numeric(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const n = Number(value); return Number.isFinite(n) ? n : null;
}
export function bmi(weight: unknown, heightCm: unknown): number | null {
  const w = numeric(weight), h = numeric(heightCm);
  return w !== null && h !== null && w > 0 && h > 0 ? Number((w / ((h / 100) ** 2)).toFixed(1)) : null;
}
export function weightLoss(previous: unknown, current: unknown): number | null {
  const p = numeric(previous), c = numeric(current);
  return p !== null && c !== null && p > 0 && c > 0 ? Number(((p - c) / p * 100).toFixed(1)) : null;
}
export function bestJawOpening(trials: unknown[]): number | null {
  const numbers = trials.map(numeric);
  return numbers.length === 3 && numbers.every((n): n is number => n !== null && n >= 0 && n <= 150) ? Math.max(...numbers as number[]) : null;
}
export function weeklyAdherence(logged: number, prescribed: number): number | null {
  return Number.isInteger(logged) && logged >= 0 && Number.isInteger(prescribed) && prescribed > 0 ? Number((logged / prescribed * 100).toFixed(1)) : null;
}

