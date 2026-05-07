// Rota Saude Fisica - registrada em app/saude-fisica.tsx (sprint L1
// renomeou de app/memoria.tsx; decisao durable dono 2026-05-06).
//
// Container <SaudeFisicaScreen> renderiza 3 tabs internas: Treinos
// (Tela 09), Evolucao Corporal (Tela 11 + secao M11.4), Exercicios
// (galeria reusada de app/exercicios). Aba Fotos foi removida — o
// FAB+ verde do MenuCapturaVerde absorve "Adicionar foto".
//
// Comentarios sem acento (convencao shell/CI).
import { SaudeFisicaScreen } from '@/components/screens/SaudeFisicaScreen';

export default function SaudeFisicaTab() {
  return <SaudeFisicaScreen />;
}
