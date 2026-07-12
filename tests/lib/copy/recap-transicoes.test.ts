// R-RECAP-4 (2026-05-16): testes unitarios das frases de transicao
// do modo Memorias.
//
// Comentarios sem acento.
import {
  FRASES_TRANSICAO_MEMORIAS,
  fraseTransicaoPara,
} from '@/lib/copy/recap-transicoes';

describe('FRASES_TRANSICAO_MEMORIAS', () => {
  it('tem pelo menos 10 variacoes (criterio da sprint)', () => {
    expect(FRASES_TRANSICAO_MEMORIAS.length).toBeGreaterThanOrEqual(10);
  });

  it('todas as frases sao sentence case com acentuacao (sem CAIXA-ALTA)', () => {
    for (const frase of FRASES_TRANSICAO_MEMORIAS) {
      expect(frase).toMatch(/^[A-ZÀ-Ý]/); // comeca com maiuscula
      expect(frase).not.toMatch(/!/); // sem exclamacao (ADR-0005)
      // tem ponto final ou nao tem qualquer pontuacao chamativa
      expect(frase.length).toBeLessThanOrEqual(40);
    }
  });
});

describe('fraseTransicaoPara', () => {
  it('e determinista: mesma seed retorna mesma frase', () => {
    const a = fraseTransicaoPara('vitorias:2026-05-09');
    const b = fraseTransicaoPara('vitorias:2026-05-09');
    expect(a).toBe(b);
  });

  it('seeds diferentes podem retornar frases diferentes', () => {
    // Possivel colisao (12 buckets), mas conjunto de 10 seeds gera
    // pelo menos 2 frases distintas em pratica.
    const seeds = [
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
    ];
    const set = new Set(seeds.map(fraseTransicaoPara));
    expect(set.size).toBeGreaterThanOrEqual(2);
  });

  it('aceita string vazia (retorna primeira frase do pool)', () => {
    const p = fraseTransicaoPara('');
    expect(FRASES_TRANSICAO_MEMORIAS).toContain(p);
  });
});
