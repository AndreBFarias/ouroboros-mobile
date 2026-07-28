// Monomark E2 -- so-anel (fiel a mount_E2, coreografias-extraidas.js:932-951).
// Apenas o anel pontilhado, girando 40s/rev com origem em RING_CENTER (o
// centro REAL do anel -- evita o wobble de rotacionar pelo centro do corpo).
// Reduce-motion: anel parado (rotacao 0).
//
// Um unico worklet useFrameCallback escreve a rotacao na shared value; o
// glifo reflete via prop rotation (native) ou transform string (web, M25.2).
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect } from 'react';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { OuroborosGlifo } from '../glifo/OuroborosGlifo';

export interface E2RingOnlyProps {
  tamanho?: number;
}

// 40s por volta completa (mesmo tempo do mount_E2 / obSpin 40s).
const PERIODO_MS = 40000;

export function E2RingOnly({ tamanho = 96 }: E2RingOnlyProps) {
  const reduzir = useReduceMotion();
  const anelRotacao = useSharedValue(0);

  const frame = useFrameCallback((info) => {
    'worklet';
    anelRotacao.value = ((info.timeSinceFirstFrame / PERIODO_MS) * 360) % 360;
  }, false);

  useEffect(() => {
    if (reduzir) {
      frame.setActive(false);
      anelRotacao.value = 0;
      return;
    }
    frame.setActive(true);
    return () => frame.setActive(false);
  }, [reduzir, frame, anelRotacao]);

  return (
    <OuroborosGlifo
      tamanho={tamanho}
      hideBeads
      hideRosto
      hideWordmark
      driver={{ anelRotacao }}
    />
  );
}
