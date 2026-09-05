// Monomark E1 -- head-only (fiel a mount_E1, coreografias-extraidas.js:893-930).
// Recorte da cabeca: viewBox 90 30 140 55, so as contas 01/02 (pescoco) e
// 42/43 (vizinhas da cauda) + rosto. O olho pisca a cada ~5,2s (opacity
// 0.65 -> 0 -> 0.65 em ~140ms). Rosto sempre visivel por design (e' um
// favicon). Reduce-motion: sem blink, olho estatico em 0.65.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { useReduceMotion } from '@/lib/hooks/useReduceMotion';
import { OLHO } from '../glifo/geometria';
import { OuroborosGlifo } from '../glifo/OuroborosGlifo';

export interface E1HeadOnlyProps {
  tamanho?: number;
}

const CONTAS_CABECA = ['conta-01', 'conta-02', 'conta-20', 'conta-21'];

export function E1HeadOnly({ tamanho = 96 }: E1HeadOnlyProps) {
  const reduzir = useReduceMotion();
  const olho = useSharedValue(OLHO.opacity);

  useEffect(() => {
    if (reduzir) {
      olho.value = OLHO.opacity;
      return;
    }
    let baixo: ReturnType<typeof setTimeout> | undefined;
    const iv = setInterval(() => {
      olho.value = 0;
      baixo = setTimeout(() => {
        olho.value = OLHO.opacity;
      }, 140);
    }, 5200);
    return () => {
      clearInterval(iv);
      if (baixo) clearTimeout(baixo);
    };
  }, [reduzir, olho]);

  return (
    <OuroborosGlifo
      tamanho={tamanho}
      hideRing
      hideWordmark
      hideDisco
      contasVisiveis={CONTAS_CABECA}
      viewBox="90 30 140 55"
      driver={{ olho }}
    />
  );
}
