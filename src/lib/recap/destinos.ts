// R-RECAP-1 (2026-05-16) -- Tabela canonica de destinos de detalhe
// para itens do Recap. Extensao do padrao Q24.a (cards Numeros
// clicaveis): cada item dentro de RecapSecao* (Conquistas, Crises,
// Reflexoes, Evolucoes, Tarefas) navega para a rota de detalhe que
// ja existe no app -- mesma rota usada por app/recap-lista.tsx no
// click dos numeros.
//
// Decisao herdada (recap-lista.tsx + spec R-RECAP-1):
//   diario_vitoria   -> /diario-emocional?slug=<id>
//   diario_trigger   -> /diario-emocional?slug=<id>
//   diario_reflexao  -> /diario-emocional?slug=<id>
//   marco            -> /galeria/detalhe/[slug]?slug=<id>
//   tarefa_concluida -> /todo?focus=<id>
//   evento_positivo  -> null (sem detalhe ainda; toast "Edicao em breve.")
//   evento_negativo  -> null (idem; achado R-CROSS-FLOW-AUDIT)
//   contador_seq     -> /contadores/<slug>
//
// Evolucoes:
//   evolucao:humor_medio        -> /humor (historico)
//   evolucao:treinos            -> /treinos
//   evolucao:contador:<slug>    -> /contadores/<slug>
//
// Itens sem destino retornam null e o caller mostra toast neutro
// "Edicao em breve." (padrao seguido por recap-lista).
//
// Comentarios sem acento (convencao shell/CI).
import type {
  ConquistaItem,
  CriseItem,
  EvolucaoItem,
  ReflexaoItem,
  TarefaConcluidaItem,
} from '@/lib/hooks/useRecap';

// Forma generica de destino navegavel. Mantemos pathname como string
// solta para evitar acoplamento ao tipo gerado pelo expo-router (que
// muda a cada nova rota).
export interface DestinoRecap {
  pathname: string;
  params?: Record<string, string>;
}

// Conquistas: 5 origens possiveis. Marco vai pra galeria de detalhe;
// vitoria e tarefa concluida vao pras rotas canonicas; contador vai
// pro detalhe do contador. Evento positivo nao tem detalhe ainda.
export function destinoConquista(item: ConquistaItem): DestinoRecap | null {
  switch (item.origem) {
    case 'diario_vitoria':
      return { pathname: '/diario-emocional', params: { slug: item.id } };
    case 'marco':
      return { pathname: '/galeria/detalhe/[slug]', params: { slug: item.id } };
    case 'tarefa_concluida':
      return { pathname: '/todo', params: { focus: item.id } };
    case 'contador_sequencia': {
      // id = "contador:<slug>"; extraimos o slug pra navegar pro detalhe.
      const slug = item.id.startsWith('contador:')
        ? item.id.slice('contador:'.length)
        : item.id;
      return { pathname: '/contadores/[slug]', params: { slug } };
    }
    case 'evento_positivo':
      return null;
    default:
      return null;
  }
}

// Crises: 2 origens. Trigger vai para diario; evento negativo ainda
// nao tem detalhe canonico (achado R-CROSS-FLOW-AUDIT pendente).
export function destinoCrise(item: CriseItem): DestinoRecap | null {
  switch (item.origem) {
    case 'diario_trigger':
      return { pathname: '/diario-emocional', params: { slug: item.id } };
    case 'evento_negativo':
      return null;
    default:
      return null;
  }
}

// Reflexoes: sempre vao para o diario emocional.
export function destinoReflexao(item: ReflexaoItem): DestinoRecap | null {
  return { pathname: '/diario-emocional', params: { slug: item.id } };
}

// Tarefas concluidas: rota canonica do todo com focus no id.
export function destinoTarefa(item: TarefaConcluidaItem): DestinoRecap | null {
  return { pathname: '/todo', params: { focus: item.id } };
}

// Evolucoes: id segue formato fixo (humor_medio / treinos /
// contador:<slug>). Map por prefixo.
export function destinoEvolucao(item: EvolucaoItem): DestinoRecap | null {
  if (item.id === 'evolucao:humor_medio') {
    return { pathname: '/humor' };
  }
  if (item.id === 'evolucao:treinos') {
    return { pathname: '/treinos' };
  }
  if (item.id.startsWith('evolucao:contador:')) {
    const slug = item.id.slice('evolucao:contador:'.length);
    return { pathname: '/contadores/[slug]', params: { slug } };
  }
  return null;
}
