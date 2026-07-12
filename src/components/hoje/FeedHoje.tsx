// Motor de feed adaptativo da Tela Hoje (R-HOME-4a). Registry ordenado
// de cards; cada card decide a propria presenca (self-hide) EXCETO o
// garantido (CardVoces), que nunca some.
//
// O empty state de cada card deixou de ser uma caixa "Nada ..." e virou
// a AUSENCIA do card: SecaoProximos, SecaoTodoHoje e BadgePassos retornam
// null quando nao ha substancia. O <View> abaixo aplica gap entre os
// filhos, e o gap do RN NAO cria espaco para filhos que renderizam null
// -- entao card ausente nao deixa buraco no feed.
//
// Ordem canonica (spec-mae §2): voces (garantido) -> proximos -> todo ->
// ainda-de-ontem -> passos -> na-sua-semana -> relembrando (garantido,
// fecho). Note a reordenacao vs pre-4a: Passos agora vem DEPOIS do To-do.
// R-HOME-4b inseriu ainda-de-ontem na posicao 4 (rollover de tarefas de
// dias anteriores, logo apos To-do hoje); R-HOME-4c inseriu na-sua-semana
// na posicao 6; R-HOME-4d fecha com relembrando na posicao 7 (rodape
// contemplativo garantido). Sub-sprints inserem seus cards editando
// FEED_CARDS na posicao da §2.
//
// Comentarios sem acento (convencao shell/CI).
import type { ComponentType } from 'react';
import { View } from 'react-native';
import { spacing } from '@/theme/tokens';
import { CardVoces } from '@/components/hoje/CardVoces';
import { SecaoProximos } from '@/components/screens/SecaoProximos';
import { SecaoTodoHoje } from '@/components/hoje/SecaoTodoHoje';
import { SecaoAindaDeOntem } from '@/components/hoje/SecaoAindaDeOntem';
import { BadgePassos } from '@/components/hoje/BadgePassos';
import { CardNaSuaSemana } from '@/components/hoje/CardNaSuaSemana';
import { CardRelembrando } from '@/components/hoje/CardRelembrando';

export type FeedCardId =
  | 'voces'
  | 'proximos'
  | 'todo'
  | 'ainda-de-ontem'
  | 'passos'
  | 'na-sua-semana'
  | 'relembrando';

interface FeedCard {
  id: FeedCardId;
  Component: ComponentType;
}

// Ordem canonica da spec-mae §2. voces e relembrando sao garantidos
// (sempre renderizam algo); os demais fazem self-hide quando sem
// conteudo. ainda-de-ontem (R-HOME-4b) e o rollover de tarefas de dias
// anteriores na posicao 4; na-sua-semana (R-HOME-4c) e o gancho semanal
// do Recap na posicao 6; relembrando (R-HOME-4d) e o fecho contemplativo
// na posicao 7.
export const FEED_CARDS: FeedCard[] = [
  { id: 'voces', Component: CardVoces },
  { id: 'proximos', Component: SecaoProximos },
  { id: 'todo', Component: SecaoTodoHoje },
  { id: 'ainda-de-ontem', Component: SecaoAindaDeOntem },
  { id: 'passos', Component: BadgePassos },
  { id: 'na-sua-semana', Component: CardNaSuaSemana },
  { id: 'relembrando', Component: CardRelembrando },
];

export function FeedHoje() {
  return (
    <View style={{ gap: spacing.lg }}>
      {FEED_CARDS.map(({ id, Component }) => (
        <Component key={id} />
      ))}
    </View>
  );
}

export default FeedHoje;
