// R-MEDIA-2 (2026-05-16): testes do propagacao de `audioPath` dos
// items (ConquistaItem/CriseItem/ReflexaoItem) para os slides
// (SlideVitorias /* anonimato-allow: tipo TS canonico do slide; test-data-allow */ /
// SlideCrises) em useRecapMemorias. O hook deve transportar o
// audioPath do item lider (frase principal / crise mais intensa)
// para que o slideshow possa autoplay.
//
// O autoplay em si (Audio.Sound, fade-in/out, prioridade vs ambient)
// vive em app/recap-memorias.tsx -- tests visuais E2E cobrem a UX.
// Aqui isolamos a logica pura do hook.
//
// Comentarios sem acento (convencao shell/CI).
import { renderHook } from '@testing-library/react-native';
import { useRecapMemorias } from '@/lib/hooks/useRecapMemorias';
import type {
  RecapData,
  ConquistaItem,
  CriseItem,
} from '@/lib/hooks/useRecap';

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

function conquista(over: Partial<ConquistaItem>): ConquistaItem {
  return {
    id: 'c:2026-05-12:pessoa_a',
    // test-data-allow: categoria canonica do diario emocional, nao
    // nome proprio. Mesma excecao registrada em useRecapMemorias.ts §32.
    origem: 'diario_vitoria',
    data: '2026-05-12',
    frase: 'conquista padrao',
    audioPath: null,
    ...over,
  };
}

function crise(over: Partial<CriseItem>): CriseItem {
  return {
    id: 'cr:2026-05-12:pessoa_a',
    origem: 'diario_trigger',
    data: '2026-05-12',
    intensidade: 3,
    frase: 'crise padrao',
    audioPath: null,
    ...over,
  };
}

describe('useRecapMemorias propagacao de audioPath (R-MEDIA-2)', () => {
  it('SlideVitorias /* anonimato-allow: tipo TS canonico; test-data-allow */ herda audioPath da conquista mais recente', () => {
    const data = dadosBase({
      conquistas: [
        conquista({
          id: 'c:2026-05-10',
          data: '2026-05-10',
          frase: 'conquista antiga',
          audioPath: 'media/m4a/audio-antigo.m4a',
        }),
        conquista({
          id: 'c:2026-05-15',
          data: '2026-05-15',
          frase: 'conquista recente',
          audioPath: 'media/m4a/audio-recente.m4a',
        }),
      ],
    });
    const { result } = renderHook(() => useRecapMemorias({ data }));
    // test-data-allow: 'vitorias' = id canonico do slide (categoria).
    const slide = result.current.find((s) => s.id === 'vitorias');
    expect(slide).toBeDefined();
    if (slide?.id !== 'vitorias') throw new Error('slide tipo errado');
    expect(slide.frasePrincipal).toBe('conquista recente');
    // Audio vem do mesmo item que cedeu a frase (mais recente).
    expect(slide.audioPath).toBe('media/m4a/audio-recente.m4a');
  });

  it('SlideVitorias /* anonimato-allow: tipo canonico; test-data-allow */ audioPath = null quando lider nao tem audio anexado', () => {
    const data = dadosBase({
      conquistas: [
        conquista({
          id: 'c:2026-05-15',
          data: '2026-05-15',
          audioPath: null,
        }),
      ],
    });
    const { result } = renderHook(() => useRecapMemorias({ data }));
    const slide = result.current.find((s) => s.id === 'vitorias');
    if (slide?.id !== 'vitorias') throw new Error('slide tipo errado');
    expect(slide.audioPath).toBeNull();
  });

  it('SlideVitorias /* anonimato-allow: tipo canonico; test-data-allow */ audioPath tolera item lider sem campo (legacy)', () => {
    // Defesa contra ConquistaItem produzido por consumidores legados
    // (pre-R-MEDIA-2) sem o campo audioPath. Esperado: slide expoe
    // null em vez de undefined.
    const item: ConquistaItem = {
      id: 'c:2026-05-15',
      // test-data-allow: categoria canonica.
      origem: 'diario_vitoria',
      data: '2026-05-15',
      frase: 'sem audio',
    };
    const data = dadosBase({ conquistas: [item] });
    const { result } = renderHook(() => useRecapMemorias({ data }));
    const slide = result.current.find((s) => s.id === 'vitorias');
    if (slide?.id !== 'vitorias') throw new Error('slide tipo errado');
    expect(slide.audioPath).toBeNull();
  });

  it('SlideCrises herda audioPath da crise mais intensa', () => {
    // useRecap ja ordena por intensidade desc; replicamos aqui
    // (test foca em useRecapMemorias = pega d.crises[0]).
    const data = dadosBase({
      crises: [
        crise({
          id: 'cr:2026-05-13:alta',
          intensidade: 5,
          data: '2026-05-13',
          audioPath: 'media/m4a/audio-pico.m4a',
        }),
        crise({
          id: 'cr:2026-05-12:baixa',
          intensidade: 2,
          data: '2026-05-12',
          audioPath: 'media/m4a/audio-secundario.m4a',
        }),
      ],
    });
    const { result } = renderHook(() => useRecapMemorias({ data }));
    const slide = result.current.find((s) => s.id === 'crises');
    if (slide?.id !== 'crises') throw new Error('slide tipo errado');
    expect(slide.audioPath).toBe('media/m4a/audio-pico.m4a');
  });

  it('SlideCrises.audioPath = null quando crise lider nao tem audio', () => {
    const data = dadosBase({
      crises: [crise({ id: 'cr:1', audioPath: null })],
    });
    const { result } = renderHook(() => useRecapMemorias({ data }));
    const slide = result.current.find((s) => s.id === 'crises');
    if (slide?.id !== 'crises') throw new Error('slide tipo errado');
    expect(slide.audioPath).toBeNull();
  });

  it('slides sem campo audio (abertura, numeros, midias, encerramento) ficam intactos', () => {
    // Garantia: outros slides nao ganham audioPath inadvertidamente.
    const data = dadosBase({
      numeros: {
        registros: 3,
        treinos: 1,
        fotos: 2,
        audios: 0,
        videos: 0,
        eventos_positivos: 0,
        eventos_negativos: 0,
        tarefas_concluidas: 0,
      },
    });
    const { result } = renderHook(() => useRecapMemorias({ data }));
    const abertura = result.current.find((s) => s.id === 'abertura');
    const numeros = result.current.find((s) => s.id === 'numeros');
    const midias = result.current.find((s) => s.id === 'midias');
    const encerramento = result.current.find((s) => s.id === 'encerramento');
    expect(abertura).toEqual({ id: 'abertura' });
    expect(encerramento).toEqual({ id: 'encerramento' });
    // numeros e midias nao tem campo audioPath no shape.
    expect(numeros).toBeDefined();
    expect(midias).toBeDefined();
    if (numeros?.id === 'numeros') {
      expect('audioPath' in numeros).toBe(false);
    }
    if (midias?.id === 'midias') {
      expect('audioPath' in midias).toBe(false);
    }
  });
});
