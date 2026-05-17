// Rota canonica /integracoes (R-INT-1, 2026-05-16) -- hub agregador.
// Componente real em IntegracoesScreen; este arquivo apenas registra
// a rota no expo-router.
//
// Retrocompat: /settings/integracoes continua existindo e expoe o
// detalhe completo de Health Connect (Q17). Tap no card "Saude
// Fisica" desta tela navega pra la.
//
// Comentarios sem acento (convencao shell/CI).
import { IntegracoesScreen } from '@/components/screens/IntegracoesScreen';

export default function IntegracoesRoute() {
  return <IntegracoesScreen />;
}
