// Tokens visuais e de spacing. Fonte da verdade no codigo.
// Espelha tailwind.config.js e docs/BRIEFING.md secao 3.

export const colors = {
  bgPage: '#14151a',
  bg: '#282a36',
  bgAlt: '#1e1f29',
  bgElev: '#44475a',
  fg: '#f8f8f2',
  muted: '#c9c9cc',
  mutedDecor: '#6272a4',
  purple: '#bd93f9',
  pink: '#ff79c6',
  cyan: '#8be9fd',
  green: '#50fa7b',
  yellow: '#f1fa8c',
  orange: '#ffb86c',
  red: '#ff5555',
} as const;

export type ColorToken = keyof typeof colors;

// Escala 4dp. Padding lateral de tela = lg (20dp).
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  huge: 48,
  mega: 64,
} as const;

export type SpacingToken = keyof typeof spacing;

// Raios canonicos por familia de superficie.
export const radius = {
  input: 10,
  card: 12,
  modal: 16,
  toast: 24,
  chip: 20,
  fab: 28,
  sheet: 20,
} as const;

export type RadiusToken = keyof typeof radius;

// Pesos sempre 400 ou 500. Line-height >= 1,5 em corpo de texto.
export const typography = {
  heading1: { size: 24, lineHeight: 1.4, weight: '500' as const },
  heading2: { size: 18, lineHeight: 1.5, weight: '500' as const },
  body: { size: 14, lineHeight: 1.6, weight: '400' as const },
  caption: { size: 12, lineHeight: 1.5, weight: '400' as const },
  micro: { size: 11, lineHeight: 1.4, weight: '400' as const },
} as const;

export type TypographyToken = keyof typeof typography;

// Hit area minima padrao do Material 44dp; hitSlop expande area sem
// alterar layout visual.
export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minHitArea = 44;
