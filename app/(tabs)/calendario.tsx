// Aba opt-in Calendário (Tela 25, M11.5). Substitui o stub de redirect
// criado em M00.5. A visibilidade na bottom bar é controlada pelo
// toggle `featureToggles.calendarioConquistas` em useSettings — quando
// off, o expo-router esconde a aba (href: null em (tabs)/_layout.tsx).
// Quando on (M15 expõe o switch), esta tela renderiza diretamente o
// CalendarioConquistasScreen. Sem mudança em _layout.tsx (decisão
// A6 do adendo M11.5).
//
// Comentários em PT-BR com acentuação correta.
import { CalendarioConquistasScreen } from '@/components/screens/CalendarioConquistasScreen';

export default function CalendarioRoute() {
  return <CalendarioConquistasScreen />;
}
