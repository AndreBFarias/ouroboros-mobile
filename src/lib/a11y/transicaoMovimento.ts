// AUDIT-P4-4-REDUCE-MOTION-ROLLOUT: ponte entre o hook
// `useReduceMotion` e a prop `transition` do MotiView. Existe para que
// os primitivos de src/components/ui/ nao repitam o mesmo ternario
// doze vezes, e para que a decisao "o que e' ausencia de movimento"
// tenha um lugar so.
//
// Por que arquivo novo e nao `src/lib/motion.ts`: motion.ts guarda os
// presets canonicos do ADR-010 e e' NAO-objetivo declarado desta
// sprint. SEM_MOVIMENTO nao e' um preset de fisica -- e' a negacao de
// qualquer fisica -- entao mora aqui, junto do resto da acessibilidade.
//
// Nao e' um hook: funcao pura, sem estado, chamavel dentro do render.
// Quem le a preferencia continua sendo `useReduceMotion()`, chamado
// literalmente em cada componente.
//
// Comentarios sem acento (convencao shell/CI).
import type { MotiTransitionProp } from 'moti';

// Transicao de duracao zero: o valor animado salta direto para o
// destino, sem frame intermediario. Preferido a remover a prop, porque
// o MotiView sem `transition` cai no spring default do moti -- que e'
// justamente o movimento que se quer suprimir.
export const SEM_MOVIMENTO = {
  type: 'timing',
  duration: 0,
} as const satisfies MotiTransitionProp;

// Devolve SEM_MOVIMENTO quando a pessoa pediu reducao de movimento; do
// contrario devolve o proprio preset recebido, POR REFERENCIA. A
// identidade referencial importa: garante paridade exata com o
// comportamento atual quando a reducao esta desligada (NAO-objetivo 3
// do spec) e e' o que o teste unitario trava.
export function transicaoMovimento(
  reduzir: boolean,
  preset: MotiTransitionProp
): MotiTransitionProp {
  return reduzir ? SEM_MOVIMENTO : preset;
}
