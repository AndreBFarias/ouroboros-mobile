// Hook centralizador da largura de layout dependente do frame mobile.
//
// Em web (Platform.OS === 'web'), retorna a constante FRAME_W (412dp).
// Esse valor casa com o FrameMobileGauntlet aplicado no app/_layout.tsx
// quando rodando em /_dev/* ou em qualquer rota web em modo dev. Sem
// isso, layouts que dependem de useWindowDimensions().width recebem a
// largura do viewport desktop (1280px+), produzindo grids e cards que
// "vazam" para fora do frame de 412dp.
//
// Em native (Android/iOS), retorna useWindowDimensions().width real,
// preservando o comportamento dinamico esperado de orientacao e
// split-screen.
//
// FRAME_W e exportada como token reaproveitavel para testes e para
// futuros consumidores que precisem comparar contra a largura
// canonica do frame.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform, useWindowDimensions } from 'react-native';

export const FRAME_W = 412;

export function useLarguraFrame(): number {
  const dim = useWindowDimensions();
  if (Platform.OS === 'web') {
    return FRAME_W;
  }
  return dim.width;
}
