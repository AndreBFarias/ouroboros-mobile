// Copy que muda conforme a companhia declarada no onboarding (P3).
//
// "Voces dois" serve a um casal e soa estranho entre amigos; "Para o
// casal" oferecido a quem respondeu amigos e' o app contradizendo a
// pergunta que acabou de fazer. Fonte unica para que a proxima tela
// nova nao invente um quarto jeito de dizer a mesma coisa.
//
// Vocabulario alinhado ao que useNomeDe('ambos') ja devolve desde
// I2-AMIGOS: casal -> "Casal", amigos -> "Todos".
//
// Comentarios sem acento (convencao shell/CI).
import type { TipoCompanhia } from '@/lib/schemas/companhia';

// Rotulo do chip de destino compartilhado em SeletorPara e
// SeletorPessoaDestino. Em sozinho o chip nao e' renderizado; o
// fallback existe para nao devolver string vazia se alguem chamar.
export function rotuloParaCompartilhado(tipo: TipoCompanhia): string {
  if (tipo === 'amigos') return 'Para todos';
  return 'Para o casal';
}

// Rodape de privacidade do diario emocional e dos eventos. A frase
// antiga afirmava "ninguem ve alem de voces dois" para quem esta
// sozinho -- afirmacao factualmente errada sobre quem ve o dado.
export function rodapePrivacidade(tipo: TipoCompanhia): string {
  if (tipo === 'sozinho') return 'Salvo localmente. Ninguém vê além de você.';
  if (tipo === 'amigos') return 'Salvo localmente. Ninguém vê além de vocês.';
  return 'Salvo localmente. Ninguém vê além de vocês dois.';
}
