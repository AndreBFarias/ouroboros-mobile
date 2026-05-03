// Aba Humor (Tela 21, M10). Substitui o stub-redirect introduzido
// em M00.5; a partir desta sprint a rota renderiza a tela completa
// com heatmap, stats e modo sobreposto. Cache lido via SAF a partir
// de .ouroboros/cache/humor-heatmap.json (gerado pelo backend, ADR
// 0012). Empty state cobre o caso sem cache.
import type { ReactNode } from 'react';
import { MiniHumorScreen } from '@/components/screens/MiniHumorScreen';

export default function HumorTab(): ReactNode {
  return <MiniHumorScreen />;
}
