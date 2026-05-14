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
}

export interface SlideCrises {
  id: 'crises';
  contagem: number;
}

export interface SlideEncerramento {
  id: 'encerramento';
}

export type Slide =
  | SlideAbertura
  | SlideNumeros
  | SlideVitorias /* anonimato-allow: categoria do diario emocional */
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
      slides.push({
        id: 'vitorias',
        contagem: vitorias.length,
        frasePrincipal: ordenadas[0]?.frase ?? null,
      });
    }

    // Crises: agregado sem detalhe (evita re-trauma).
    if (d.crises.length > 0) {
      slides.push({ id: 'crises', contagem: d.crises.length });
    }

    slides.push({ id: 'encerramento' });
    return slides;
  }, [input.data]);
}
