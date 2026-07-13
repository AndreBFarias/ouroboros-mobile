// R-RECAP-9 (2026-07-11): testes do pool + seletor da trilha animada do
// slideshow Memorias. Cobre o seletor puro (deterministico por seed, sem
// repeticao imediata) e a integridade do pool (16 faixas, campos
// obrigatorios, licenca CC BY para a atribuicao). O audio real (tocar,
// fade, duck) e' proof-of-work Nivel C no device.
//
// Comentarios sem acento (convencao shell/CI).
import {
  MUSICAS_FUNDO,
  sortearMusica,
  registrarMusicaTocada,
  musicaPorIndice,
  _resetSessaoParaTeste,
} from '@/lib/recap/musicaFundo';

describe('musicaFundo — pool', () => {
  it('pool tem 16 faixas (nao-vazio)', () => {
    expect(MUSICAS_FUNDO.length).toBe(16);
    expect(MUSICAS_FUNDO.length).toBeGreaterThan(0);
  });

  it('cada faixa tem id, titulo, autor, licenca e asset', () => {
    for (const m of MUSICAS_FUNDO) {
      expect(typeof m.id).toBe('string');
      expect(m.id.length).toBeGreaterThan(0);
      expect(typeof m.titulo).toBe('string');
      expect(m.titulo.length).toBeGreaterThan(0);
      expect(m.autor).toBe('Kevin MacLeod');
      // CC BY: a licenca precisa estar declarada para a atribuicao.
      expect(m.licenca).toBe('CC BY 4.0');
      // asset e' o retorno de require() (jest-expo mapeia mp3 -> modulo).
      expect(m.asset).toBeDefined();
    }
  });

  it('ids sao unicos (sem faixa duplicada no pool)', () => {
    const ids = MUSICAS_FUNDO.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('musicaFundo — sortearMusica (seletor puro)', () => {
  beforeEach(() => {
    _resetSessaoParaTeste();
  });

  it('e deterministico: mesmo seed + mesmo anterior => mesmo indice', () => {
    const a = sortearMusica(123456, null);
    const b = sortearMusica(123456, null);
    expect(a).toBe(b);
    const c = sortearMusica(987, 3);
    const d = sortearMusica(987, 3);
    expect(c).toBe(d);
  });

  it('retorna indice valido no range [0, n) para seeds variados', () => {
    const seeds = [0, 1, 15, 16, 17, 100, 999999, -1, -42, 3.9, -3.9];
    for (const seed of seeds) {
      const idx = sortearMusica(seed, null);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(MUSICAS_FUNDO.length);
      expect(Number.isInteger(idx)).toBe(true);
    }
  });

  it('nunca repete a faixa anterior (desloca em colisao)', () => {
    const n = MUSICAS_FUNDO.length;
    // Para cada anterior possivel, um seed que cairia exatamente nele
    // deve ser deslocado para outro indice.
    for (let anterior = 0; anterior < n; anterior += 1) {
      // seed = anterior cai em indicePorSeed(anterior) = anterior.
      const idx = sortearMusica(anterior, anterior);
      expect(idx).not.toBe(anterior);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(n);
    }
  });

  it('nao repete usando o estado de sessao (sem anterior explicito)', () => {
    // Fixa a ultima faixa como 5; um seed que cairia em 5 deve variar.
    registrarMusicaTocada(5);
    const idx = sortearMusica(5);
    expect(idx).not.toBe(5);
  });

  it('lida com seed nao-finito sem quebrar', () => {
    expect(sortearMusica(Number.NaN, null)).toBeGreaterThanOrEqual(0);
    expect(sortearMusica(Number.POSITIVE_INFINITY, null)).toBeGreaterThanOrEqual(
      0
    );
  });
});

describe('musicaFundo — registrarMusicaTocada + rotacao', () => {
  beforeEach(() => {
    _resetSessaoParaTeste();
  });

  it('registrar uma faixa faz o proximo sorteio (mesmo seed) evita-la', () => {
    // Sem registro, o seed 7 cai em 7.
    expect(sortearMusica(7, null)).toBe(7);
    // Apos registrar 7, o sorteio da sessao (mesmo seed) desloca.
    registrarMusicaTocada(7);
    expect(sortearMusica(7)).not.toBe(7);
  });

  it('rotacao em sequencia nunca repete a faixa imediatamente anterior', () => {
    let anterior: number | null = null;
    // Simula 40 aberturas com seeds crescentes; a cada uma, marca a
    // escolhida e confere que nao e' igual a anterior.
    for (let i = 0; i < 40; i += 1) {
      const idx = sortearMusica(i * 7 + 1, anterior);
      if (anterior !== null) {
        expect(idx).not.toBe(anterior);
      }
      registrarMusicaTocada(idx);
      anterior = idx;
    }
  });
});

describe('musicaFundo — musicaPorIndice', () => {
  it('resolve indice valido e faz clamp defensivo (circular)', () => {
    expect(musicaPorIndice(0)).toBe(MUSICAS_FUNDO[0]);
    expect(musicaPorIndice(MUSICAS_FUNDO.length)).toBe(MUSICAS_FUNDO[0]);
    expect(musicaPorIndice(-1)).toBe(
      MUSICAS_FUNDO[MUSICAS_FUNDO.length - 1]
    );
  });
});
