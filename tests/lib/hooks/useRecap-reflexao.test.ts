// Testes do hook useRecap (G2.1) — modo 'reflexao' do diario emocional.
//
// Cobre:
//  - reflexoes sao filtradas em lista paralela a conquistas/crises.
//  - Mix 2 vitoria + 1 trigger + 3 reflexao no periodo: conquistas=2,
//    crises=1, reflexoes=3 (zero contaminacao cruzada).
//  - Reflexoes ordenadas por data desc.
//  - Reflexao com texto vazio recebe frase fallback "Reflexão sem
//    descrição.".
//  - Reflexao FORA do range de periodo e ignorada.
//
// Comentarios sem acento (convencao shell/CI).
import { agregarRecap, resolverPeriodo } from '@/lib/hooks/useRecap';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';

function diario(
  data: string,
  modo: 'trigger' | 'vitoria' | 'reflexao',
  intensidade = 3,
  texto = 'texto'
): DiarioEmocionalMeta {
  return {
    tipo: 'diario_emocional',
    data,
    autor: 'pessoa_a',
    modo,
    emocoes: [],
    intensidade,
    com: [],
    contexto_social: [],
    texto,
    midia:
      modo === 'vitoria' ? [{ tipo: 'foto', path: 'media/fotos/x.jpg' }] : [],
    para: { tipo: 'mim' },
  };
}

describe('agregarRecap — modo reflexao (G2.1)', () => {
  const agora = new Date('2026-05-04T20:00:00-03:00');
  const range = resolverPeriodo('semana', agora);

  it('separa em listas paralelas: 2 vitoria + 1 trigger + 3 reflexao', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [
        diario('2026-05-02T10:00:00-03:00', 'vitoria', 4, 'concluí leitura'),
        diario('2026-05-03T11:00:00-03:00', 'vitoria', 5, 'projeto entregue'),
        diario('2026-05-01T09:00:00-03:00', 'trigger', 4, 'discussão tensa'),
        diario(
          '2026-05-02T15:00:00-03:00',
          'reflexao',
          2,
          'pensando no futuro'
        ),
        diario('2026-05-03T16:00:00-03:00', 'reflexao', 3, 'observando rotina'),
        diario('2026-05-04T08:00:00-03:00', 'reflexao', 1, 'manhã calma'),
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });

    expect(data.conquistas.length).toBe(2);
    expect(data.crises.length).toBe(1);
    expect(data.reflexoes.length).toBe(3);

    // Zero contaminacao: nenhuma conquista origina-se de reflexao.
    expect(
      data.conquistas.every(
        (c) => c.origem === 'diario_vitoria' || c.origem === 'evento_positivo'
      )
    ).toBe(true);
    // Crises so de origens negativas.
    expect(
      data.crises.every(
        (c) => c.origem === 'diario_trigger' || c.origem === 'evento_negativo'
      )
    ).toBe(true);
  });

  it('reflexoes ordenadas por data desc (mais recente primeiro)', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [
        diario('2026-05-01T08:00:00-03:00', 'reflexao', 2, 'primeira'),
        diario('2026-05-04T08:00:00-03:00', 'reflexao', 3, 'terceira'),
        diario('2026-05-02T08:00:00-03:00', 'reflexao', 4, 'segunda'),
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });

    expect(data.reflexoes.length).toBe(3);
    expect(data.reflexoes[0]?.frase).toBe('terceira');
    expect(data.reflexoes[1]?.frase).toBe('segunda');
    expect(data.reflexoes[2]?.frase).toBe('primeira');
  });

  it('reflexao com texto vazio recebe frase fallback', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [diario('2026-05-03T10:00:00-03:00', 'reflexao', 2, '')],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });

    expect(data.reflexoes.length).toBe(1);
    expect(data.reflexoes[0]?.frase).toBe('Reflexão sem descrição.');
  });

  it('reflexao fora do periodo e ignorada', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [
        diario('2024-01-01T10:00:00-03:00', 'reflexao', 3, 'antiga'),
        diario('2026-05-03T10:00:00-03:00', 'reflexao', 3, 'recente'),
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });

    expect(data.reflexoes.length).toBe(1);
    expect(data.reflexoes[0]?.frase).toBe('recente');
  });

  it('reflexao carrega intensidade do diario para a UI', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [diario('2026-05-03T10:00:00-03:00', 'reflexao', 4, 'foco')],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });

    expect(data.reflexoes[0]?.intensidade).toBe(4);
  });

  it('estado sem reflexoes devolve lista vazia (nao undefined)', () => {
    const data = agregarRecap({
      humor: [],
      diarios: [
        diario('2026-05-02T10:00:00-03:00', 'vitoria', 4, 'so vitoria'),
      ],
      eventos: [],
      marcos: [],
      contadores: [],
      treinos: [],
      tarefas: [],
      de: range.de,
      ate: range.ate,
      agora,
    });

    expect(Array.isArray(data.reflexoes)).toBe(true);
    expect(data.reflexoes.length).toBe(0);
  });
});
