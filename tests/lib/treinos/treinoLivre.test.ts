// EXE-2: contrato de identidade da sessao de treino livre. O slug do
// arquivo e a busca da sessao do dia moram aqui porque os dois callers
// (o toque em "Adicionar a treino livre" e a migracao dos drafts
// legados) precisam concordar sobre onde essa sessao mora. Se um
// derivar o nome de um jeito e o outro de outro, volta a duplicata.
//
// Comentarios sem acento (convencao shell/CI).
import {
  ROTINA_TREINO_LIVRE,
  sessaoTreinoLivreDoDia,
  slugTreinoLivre,
} from '@/lib/treinos/treinoLivre';
import type { TreinoListado } from '@/lib/vault/treinos';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

function listada(
  rel: string,
  meta: Partial<TreinoSessao> & Pick<TreinoSessao, 'data'>
): TreinoListado {
  return {
    rel,
    meta: {
      tipo: 'treino_sessao',
      autor: 'pessoa_a',
      rotina: ROTINA_TREINO_LIVRE,
      duracao_min: 30,
      exercicios: [{ nome: 'supino', series: 1, reps: 1 }],
      ...meta,
    },
  };
}

describe('slugTreinoLivre', () => {
  it('deriva de (rotina, autor) e nunca do conteudo', () => {
    expect(slugTreinoLivre('pessoa_a')).toBe('treino-livre-pessoa-a');
    expect(slugTreinoLivre('pessoa_b')).toBe('treino-livre-pessoa-b');
  });

  it('separa as duas pessoas do vault compartilhado', () => {
    expect(slugTreinoLivre('pessoa_a')).not.toBe(slugTreinoLivre('pessoa_b'));
  });
});

describe('sessaoTreinoLivreDoDia', () => {
  it('acha a sessao do dia pelo conteudo, nao pelo nome do arquivo', () => {
    const achada = sessaoTreinoLivreDoDia(
      [
        listada('treinos/2026-09-01-nome-qualquer.md', {
          data: '2026-09-01T18:03:00-03:00',
        }),
      ],
      '2026-09-01',
      'pessoa_a'
    );
    expect(achada?.rel).toBe('treinos/2026-09-01-nome-qualquer.md');
  });

  it('ignora outro dia, outro autor e outra rotina', () => {
    const lista = [
      listada('treinos/a.md', { data: '2026-08-31T18:00:00-03:00' }),
      listada('treinos/b.md', {
        data: '2026-09-01T18:00:00-03:00',
        autor: 'pessoa_b',
      }),
      listada('treinos/c.md', {
        data: '2026-09-01T18:00:00-03:00',
        rotina: 'Rotina A',
      }),
    ];
    expect(sessaoTreinoLivreDoDia(lista, '2026-09-01', 'pessoa_a')).toBeNull();
  });

  it('usa o dia LOCAL da sessao, nao o dia em UTC', () => {
    // 23h30 de 1/set em Sao Paulo e' 2/set em UTC. O arquivo pertence ao
    // dia local, que e' o que formatDateYmd usa para nomear.
    const lista = [
      listada('treinos/2026-09-01-2330-treino-livre-pessoa-a.md', {
        data: '2026-09-01T23:30:00-03:00',
      }),
    ];
    expect(
      sessaoTreinoLivreDoDia(lista, '2026-09-01', 'pessoa_a')
    ).not.toBeNull();
    expect(sessaoTreinoLivreDoDia(lista, '2026-09-02', 'pessoa_a')).toBeNull();
  });

  it('com duplicata pre-existente devolve a mais recente da listagem', () => {
    // listarTreinosComRel ordena desc por data; o filtro preserva a ordem.
    const lista = [
      listada('treinos/tarde.md', { data: '2026-09-01T19:00:00-03:00' }),
      listada('treinos/manha.md', { data: '2026-09-01T07:00:00-03:00' }),
    ];
    expect(sessaoTreinoLivreDoDia(lista, '2026-09-01', 'pessoa_a')?.rel).toBe(
      'treinos/tarde.md'
    );
  });
});
