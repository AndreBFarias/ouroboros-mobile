// Q24.b (2026-05-13) -- Hook agregador dos slides do modo Memorias
// do Recap. Le um RecapData ja resolvido (vem do useRecap) e devolve
// uma lista ordenada de slides ativos -- slides sem dado relevante
// no periodo sao pulados automaticamente.
//
// Cada slide tem id canonico (string) + payload tipado. Componente
// SlideShow renderiza condicionalmente por id.
//
// Comentarios sem acento (convencao shell/CI).
import { useMemo } from 'react';
import type { RecapData } from '@/lib/hooks/useRecap';

export type SlideId =
  | 'abertura'
  | 'numeros'
  | 'vitorias'
  | 'midias'
  | 'crises'
  | 'encerramento';

export interface SlideAbertura {
  id: 'abertura';
}

export interface SlideNumeros {
  id: 'numeros';
  registros: number;
  treinos: number;
  tarefas: number;
}

export interface SlideVitorias /* anonimato-allow: categoria do diario emocional */ {
  id: 'vitorias';
  contagem: number;
  frasePrincipal: string | null; // frase da vitoria mais recente
  // R-MEDIA-2 (2026-05-16): path do audio anexado da conquista mais
  // recente (mesmo item que cedeu a frasePrincipal). Null quando o
  // item lider nao tem audio. recap-memorias usa para autoplay.
  audioPath?: string | null;
}

// R-CRIT-3 (2026-05-16): slide novo das midias capturadas no periodo.
// Contagens vem de RecapData.numeros (fotos / audios / videos). Quando
// nao houver nenhuma midia no periodo o slide e' pulado (filtro em
// useRecapMemorias). Tom sobrio (ADR-0005): sem exclamacao, sem
// celebracao -- so o numero e o rotulo.
export interface SlideMidias {
  id: 'midias';
  fotos: number;
  audios: number;
  videos: number;
}

export interface SlideCrises {
  id: 'crises';
  contagem: number;
  // R-MEDIA-2 (2026-05-16): path do audio anexado da crise lider
  // (mais intensa; empate -> mais recente, ordem ja garantida em
  // useRecap.crises). Null quando o item lider nao tem audio.
  audioPath?: string | null;
}

export interface SlideEncerramento {
  id: 'encerramento';
}

export type Slide =
  | SlideAbertura
  | SlideNumeros
  | SlideVitorias /* anonimato-allow: categoria do diario emocional */
  | SlideMidias
  | SlideCrises
  | SlideEncerramento;

export interface UseRecapMemoriasInput {
  data: RecapData | null;
}

export function useRecapMemorias(input: UseRecapMemoriasInput): Slide[] {
  return useMemo(() => {
    const slides: Slide[] = [{ id: 'abertura' }];
    if (!input.data) {
      slides.push({ id: 'encerramento' });
      return slides;
    }
    const d = input.data;

    // Numeros: so renderiza se houver pelo menos 1 registro.
    if (
      d.numeros.registros > 0 ||
      d.numeros.treinos > 0 ||
      d.numeros.tarefas_concluidas > 0
    ) {
      slides.push({
        id: 'numeros',
        registros: d.numeros.registros,
        treinos: d.numeros.treinos,
        tarefas: d.numeros.tarefas_concluidas,
      });
    }

    // Slide vitoria: conta diario_vitoria + evento_positivo. anonimato-allow.
    const vitorias = d.conquistas.filter(
      (c) => c.origem === 'diario_vitoria' || c.origem === 'evento_positivo'
    );
    if (vitorias.length > 0) {
      const ordenadas = [...vitorias].sort((a, b) =>
        a.data > b.data ? -1 : 1
      );
      const lider = ordenadas[0];
      slides.push({
        id: 'vitorias',
        contagem: vitorias.length,
        frasePrincipal: lider?.frase ?? null,
        // R-MEDIA-2: audio anexado do mesmo item que cedeu a frase.
        audioPath: lider?.audioPath ?? null,
      });
    }

    // R-CRIT-3 (2026-05-16): slide de midias capturadas. Aparece quando
    // ha pelo menos 1 foto/audio/video no periodo (independente da
    // origem -- standalone via FAB ou embutida em diario/evento, ambos
    // somados em RecapData.numeros). Sem nenhuma midia, slide pulado.
    if (
      d.numeros.fotos > 0 ||
      d.numeros.audios > 0 ||
      d.numeros.videos > 0
    ) {
      slides.push({
        id: 'midias',
        fotos: d.numeros.fotos,
        audios: d.numeros.audios,
        videos: d.numeros.videos,
      });
    }

    // Crises: agregado sem detalhe (evita re-trauma). R-MEDIA-2:
    // audio do item lider (ja ordenado por intensidade desc em useRecap).
    if (d.crises.length > 0) {
      const liderCrise = d.crises[0];
      slides.push({
        id: 'crises',
        contagem: d.crises.length,
        audioPath: liderCrise?.audioPath ?? null,
      });
    }

    slides.push({ id: 'encerramento' });
    return slides;
  }, [input.data]);
}
