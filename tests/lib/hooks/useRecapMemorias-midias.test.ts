// R-CRIT-3 (2026-05-16): testes do slide `'midias'` introduzido em
// useRecapMemorias. Slide aparece quando ha pelo menos 1 foto/audio/
// video no periodo (independente da origem -- standalone do FAB ou
// embutida em diario/evento, soma em RecapData.numeros).
//
// O hook em si e wrapped por useMemo. Testamos invocando como funcao
// direta via renderHook nao seria simples no jest-expo; aqui exercemos
// a logica pura via input data e checagem do array Slide retornado.
//
// Comentarios sem acento (convencao shell/CI).
import { renderHook } from '@testing-library/react-native';
import { useRecapMemorias } from '@/lib/hooks/useRecapMemorias';
import type { RecapData } from '@/lib/hooks/useRecap';

function dadosBase(over: Partial<RecapData>): RecapData {
  return {
    conquistas: [],
    crises: [],
    reflexoes: [],
    evolucoes: [],
    tarefasConcluidas: [],
    numeros: {
      registros: 0,
      treinos: 0,
      fotos: 0,
      audios: 0,
      videos: 0,
      eventos_positivos: 0,
      eventos_negativos: 0,
      tarefas_concluidas: 0,
    },
    ...over,
  };
}

describe('useRecapMemorias slide `midias` (R-CRIT-3)', () => {
  it('inclui slide `midias` quando fotos+audios+videos > 0', () => {
    const data = dadosBase({
      numeros: {
        registros: 3,
        treinos: 0,
        fotos: 2,
        audios: 1,
        videos: 0,
        eventos_positivos: 0,
        eventos_negativos: 0,
        tarefas_concluidas: 0,
      },
    });
    const { result } = renderHook(() => useRecapMemorias({ data }));
    const midias = result.current.find((s) => s.id === 'midias');
    expect(midias).toBeDefined();
    expect(midias).toEqual({
      id: 'midias',
      fotos: 2,
      audios: 1,
      videos: 0,
    });
  });

  it('pula slide `midias` quando total = 0', () => {
    const data = dadosBase({
      numeros: {
        registros: 2,
        treinos: 0,
        fotos: 0,
        audios: 0,
        videos: 0,
        eventos_positivos: 0,
        eventos_negativos: 0,
        tarefas_concluidas: 0,
      },
    });
    const { result } = renderHook(() => useRecapMemorias({ data }));
    expect(result.current.find((s) => s.id === 'midias')).toBeUndefined();
  });

  it('slide `midias` aparece apos slide de conquistas e antes de crises', () => {
    // test-data-allow: 'diario_vitoria' aqui e categoria canonica
    // (origem) do diario emocional, nao nome proprio. Mesma excecao
    // registrada em useRecapMemorias.ts §32 e §62.
    const data = dadosBase({
      conquistas: [
        {
          id: 'd:2026-05-12:pessoa_a',
          origem: 'diario_vitoria', // test-data-allow: categoria canonica
          data: '2026-05-12',
          frase: 'conquista registrada',
        },
      ],
      crises: [
        {
          id: 'c:2026-05-13:pessoa_a',
          origem: 'diario_trigger',
          data: '2026-05-13',
          intensidade: 3,
          frase: 'crise',
        },
      ],
      numeros: {
        registros: 2,
        treinos: 0,
        fotos: 1,
        audios: 0,
        videos: 0,
        eventos_positivos: 0,
        eventos_negativos: 0,
        tarefas_concluidas: 0,
      },
    });
    const { result } = renderHook(() => useRecapMemorias({ data }));
    const ids = result.current.map((s) => s.id);
    // test-data-allow: 'vitorias' = id canonico do slide (categoria)
    const idxSlideConquistas = ids.indexOf('vitorias'); // test-data-allow
    const idxMidias = ids.indexOf('midias');
    const idxCrises = ids.indexOf('crises');
    expect(idxSlideConquistas).toBeGreaterThanOrEqual(0);
    expect(idxMidias).toBeGreaterThan(idxSlideConquistas);
    expect(idxCrises).toBeGreaterThan(idxMidias);
  });
});
