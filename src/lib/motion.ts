// Spring presets canonicos (ADR-010). Todo movimento usa springs;
// timing linear so em fade_out (180ms) e toast_in. Tipos vem de moti.
import type { MotiTransitionProp } from 'moti';

export const springs = {
  subtle: { type: 'spring', damping: 22, stiffness: 220 },
  default: { type: 'spring', damping: 18, stiffness: 200 },
  bouncy: { type: 'spring', damping: 12, stiffness: 180 },
  snappy: { type: 'spring', damping: 26, stiffness: 320 },
  // Q3 (Onda Q): curva drawer/sheet pra superficies grandes. Sem
  // overshoot perceptivel, sente premium. Usar quando "subtle" parece
  // poing demais (drawers de 280dp+).
  smooth: { type: 'spring', damping: 32, stiffness: 170, mass: 1 },
} as const satisfies Record<string, MotiTransitionProp>;

export const timings = {
  fadeOut: { type: 'timing', duration: 180 },
  toastIn: { type: 'spring', damping: 20, stiffness: 250 },
} as const satisfies Record<string, MotiTransitionProp>;

export type SpringPreset = keyof typeof springs;
export type TimingPreset = keyof typeof timings;
