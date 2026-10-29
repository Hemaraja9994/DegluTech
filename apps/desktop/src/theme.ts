// Token references mirror :root in index.css. Inline-style strings reference
// the same custom properties so light/dark theme swaps stay centralized.

export const T = {
  bg: 'var(--bg)',
  surface1: 'var(--surface-1)',
  surface2: 'var(--surface-2)',
  surface3: 'var(--surface-3)',

  ink1: 'var(--ink-1)',
  ink2: 'var(--ink-2)',
  ink3: 'var(--ink-3)',

  line: 'var(--line)',
  lineStrong: 'var(--line-strong)',

  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  accentInk: 'var(--accent-ink)',

  safe: 'var(--safe)',
  caution: 'var(--caution)',
  risk: 'var(--risk)',

  serif: 'var(--serif)',
  sans: 'var(--sans)',
  mono: 'var(--mono)',
} as const;

export const severityColor = (level: 'low' | 'moderate' | 'high'): string => {
  if (level === 'high') return T.risk;
  if (level === 'moderate') return T.caution;
  return T.safe;
};

export const severityToneFromScore = (
  value: number,
  scale: 'pas' | 'icf' | 'risk' = 'icf'
): 'safe' | 'caution' | 'risk' => {
  if (scale === 'pas') {
    if (value >= 6) return 'risk';
    if (value >= 3) return 'caution';
    return 'safe';
  }
  // icf or risk 0-4
  if (value >= 3) return 'risk';
  if (value >= 2) return 'caution';
  return 'safe';
};

export const toneFg: Record<'safe' | 'caution' | 'risk' | 'accent', string> = {
  safe: '#0f766e',
  caution: '#92400e',
  risk: '#991b1b',
  accent: T.accentInk,
};

export const toneBg: Record<'safe' | 'caution' | 'risk' | 'accent', string> = {
  safe: 'rgba(15, 118, 110, 0.12)',
  caution: 'rgba(183, 121, 31, 0.14)',
  risk: 'rgba(180, 35, 24, 0.14)',
  accent: T.accentSoft,
};

export const toneDot: Record<'safe' | 'caution' | 'risk' | 'accent', string> = {
  safe: T.safe,
  caution: T.caution,
  risk: T.risk,
  accent: T.accent,
};

// Standard card surface — applied via spread: { ...cardSurface }
export const cardSurface = {
  background: T.surface1,
  borderRadius: 10,
  boxShadow: `inset 0 0 0 0.5px ${T.line}`,
} as const;

// Hairline border helper for non-card elements
export const hairline = (color: string = T.line) => `inset 0 0 0 0.5px ${color}`;
