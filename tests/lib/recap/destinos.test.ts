// R-RECAP-1: testes unitarios do helper de destinos do Recap.
// Cada item dentro de RecapSecao* deve resolver para a rota correta
// (mesmas rotas usadas por app/recap-lista.tsx).
import {
  destinoConquista,
  destinoCrise,
  destinoEvolucao,
  destinoReflexao,
  destinoTarefa,
} from '@/lib/recap/destinos';
import type {
  ConquistaItem,
  CriseItem,
  EvolucaoItem,
  ReflexaoItem,
  TarefaConcluidaItem,
} from '@/lib/hooks/useRecap';

describe('destinoConquista', () => {
  it('diario_vitoria -> /diario-emocional com slug', () => {
    const item: ConquistaItem = {
      id: 'diario_vitoria:2026-05-15:pessoa_a',
      origem: 'diario_vitoria',
      data: '2026-05-15',
      frase: 'Conquista de exemplo',
    };
    expect(destinoConquista(item)).toEqual({
      pathname: '/diario-emocional',
      params: { slug: 'diario_vitoria:2026-05-15:pessoa_a' },
    });
  });

  it('marco -> /galeria/detalhe/[slug] com slug', () => {
    const item: ConquistaItem = {
      id: 'marco:2026-05-14:pessoa_a',
      origem: 'marco',
      data: '2026-05-14',
      frase: 'Marco registrado',
    };
    expect(destinoConquista(item)).toEqual({
      pathname: '/galeria/detalhe/[slug]',
      params: { slug: 'marco:2026-05-14:pessoa_a' },
    });
  });

  it('tarefa_concluida -> /todo com focus', () => {
    const item: ConquistaItem = {
      id: 'tarefa:2026-05-13:Comprar pao',
      origem: 'tarefa_concluida',
      data: '2026-05-13',
      frase: 'Comprar pao — casa',
    };
    expect(destinoConquista(item)).toEqual({
      pathname: '/todo',
      params: { focus: 'tarefa:2026-05-13:Comprar pao' },
    });
  });

  it('contador_sequencia -> /contadores/[slug] extraindo slug do id', () => {
    const item: ConquistaItem = {
      id: 'contador:agua_diaria',
      origem: 'contador_sequencia',
      data: '2026-04-15',
      frase: 'Beber agua — 30 dias em sequência.',
    };
    expect(destinoConquista(item)).toEqual({
      pathname: '/contadores/[slug]',
      params: { slug: 'agua_diaria' },
    });
  });

  it('evento_positivo -> null (sem detalhe ainda)', () => {
    const item: ConquistaItem = {
      id: 'evento_positivo:2026-05-12:pessoa_a',
      origem: 'evento_positivo',
      data: '2026-05-12',
      frase: 'Evento de exemplo',
    };
    expect(destinoConquista(item)).toBeNull();
  });
});

describe('destinoCrise', () => {
  it('diario_trigger -> /diario-emocional com slug', () => {
    const item: CriseItem = {
      id: 'diario_trigger:2026-05-15:pessoa_a',
      origem: 'diario_trigger',
      data: '2026-05-15',
      intensidade: 4,
      frase: 'Momento dificil',
    };
    expect(destinoCrise(item)).toEqual({
      pathname: '/diario-emocional',
      params: { slug: 'diario_trigger:2026-05-15:pessoa_a' },
    });
  });

  it('evento_negativo -> null (sem detalhe ainda)', () => {
    const item: CriseItem = {
      id: 'evento_negativo:2026-05-12:pessoa_a',
      origem: 'evento_negativo',
      data: '2026-05-12',
      intensidade: 3,
      frase: 'Evento dificil',
    };
    expect(destinoCrise(item)).toBeNull();
  });
});

describe('destinoReflexao', () => {
  it('sempre -> /diario-emocional com slug', () => {
    const item: ReflexaoItem = {
      id: 'diario_reflexao:2026-05-15:pessoa_a',
      data: '2026-05-15',
      intensidade: 3,
      frase: 'Reflexao do dia',
    };
    expect(destinoReflexao(item)).toEqual({
      pathname: '/diario-emocional',
      params: { slug: 'diario_reflexao:2026-05-15:pessoa_a' },
    });
  });
});

describe('destinoTarefa', () => {
  it('sempre -> /todo com focus no id', () => {
    const item: TarefaConcluidaItem = {
      id: 'tarefa:2026-05-13:Comprar pao',
      titulo: 'Comprar pao',
      categoria: 'casa',
      feito_em: '2026-05-13T08:00:00-03:00',
    };
    expect(destinoTarefa(item)).toEqual({
      pathname: '/todo',
      params: { focus: 'tarefa:2026-05-13:Comprar pao' },
    });
  });
});

describe('destinoEvolucao', () => {
  it('humor_medio -> /humor', () => {
    const item: EvolucaoItem = {
      id: 'evolucao:humor_medio',
      rotulo: 'Humor medio no periodo',
      detalhe: '3.5 de 5',
    };
    expect(destinoEvolucao(item)).toEqual({ pathname: '/humor' });
  });

  it('treinos -> /treinos', () => {
    const item: EvolucaoItem = {
      id: 'evolucao:treinos',
      rotulo: 'Treinos concluidos',
      detalhe: '5 sessoes',
    };
    expect(destinoEvolucao(item)).toEqual({ pathname: '/treinos' });
  });

  it('contador -> /contadores/[slug] extraindo slug', () => {
    const item: EvolucaoItem = {
      id: 'evolucao:contador:agua_diaria',
      rotulo: 'Beber agua',
      detalhe: '30 dias em sequencia',
    };
    expect(destinoEvolucao(item)).toEqual({
      pathname: '/contadores/[slug]',
      params: { slug: 'agua_diaria' },
    });
  });

  it('id desconhecido -> null', () => {
    const item: EvolucaoItem = {
      id: 'evolucao:desconhecido',
      rotulo: 'Sem rota',
      detalhe: 'Sem destino',
    };
    expect(destinoEvolucao(item)).toBeNull();
  });
});
