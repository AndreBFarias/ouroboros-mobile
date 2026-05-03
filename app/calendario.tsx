// Item opt-in Calendário (Tela 25, M11.5). M27 substituiu a bottom
// bar pelo MenuLateral; a visibilidade do item no menu é controlada
// pelo toggle `featureToggles.calendarioConquistas` em useSettings.
// Quando on (M15 expõe o switch), esta tela renderiza diretamente o
// CalendarioConquistasScreen.
//
// Comentários em PT-BR com acentuação correta.
import { CalendarioConquistasScreen } from '@/components/screens/CalendarioConquistasScreen';

export default function CalendarioRoute() {
  return <CalendarioConquistasScreen />;
}
