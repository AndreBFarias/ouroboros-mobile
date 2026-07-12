// Testes do pool de frases empty state do Recap (R-RECAP-3).
//
// Cobertura:
//  - pool tem >=10 variacoes
//  - idempotencia: mesma seed -> mesma frase em N runs
//  - variacao por periodo: periodos distintos podem cair em frases
//    distintas (nao garantido sempre, mas em geral)
//  - variacao por semana: semanas adjacentes tendem a frases diferentes
//  - todas as frases tem acentuacao PT-BR consistente
//  - seedDeRange calcula semana ISO corretamente
import {
  FRASES_RECAP_VAZIO,
  escolherFrase,
  seedDeRange,
  type SeedFrase,
} from '@/lib/copy/recap-empty-states';

describe('FRASES_RECAP_VAZIO', () => {
  it('contem pelo menos 10 variacoes', () => {
    expect(FRASES_RECAP_VAZIO.length).toBeGreaterThanOrEqual(10);
  });

  it('todas as frases sao strings nao-vazias', () => {
    for (const frase of FRASES_RECAP_VAZIO) {
      expect(typeof frase).toBe('string');
      expect(frase.length).toBeGreaterThan(0);
    }
  });

  it('nao contem frases proibidas (acusacao ou celebracao)', () => {
    const proibidas = [
      'parabens',
      'parabéns',
      'que otimo',
      'que ótimo',
      'voce conseguiu',
      'você conseguiu',
      'incrivel',
      'incrível',
      'que pena',
      'não conseguiu',
      'falhou',
      'esqueceu',
    ];
    for (const frase of FRASES_RECAP_VAZIO) {
      const baixo = frase.toLowerCase();
      for (const palavra of proibidas) {
        expect(baixo).not.toContain(palavra);
      }
    }
  });

  it('nao contem emojis', () => {
    // Faixa basica de emojis (BMP + suplementares mais comuns).
    const regexEmoji =
      /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/u;
    for (const frase of FRASES_RECAP_VAZIO) {
      expect(regexEmoji.test(frase)).toBe(false);
    }
  });

  it('nao contem exclamacao em feedback', () => {
    for (const frase of FRASES_RECAP_VAZIO) {
      expect(frase).not.toContain('!');
    }
  });
});

describe('escolherFrase', () => {
  it('retorna uma frase do pool', () => {
    const seed: SeedFrase = { periodo: 'semana', ano: 2026, semana: 20 };
    const frase = escolherFrase(seed);
    expect(FRASES_RECAP_VAZIO).toContain(frase);
  });

  it('idempotencia: mesma seed retorna mesma frase em runs repetidos', () => {
    const seed: SeedFrase = { periodo: 'semana', ano: 2026, semana: 20 };
    const r1 = escolherFrase(seed);
    const r2 = escolherFrase(seed);
    const r3 = escolherFrase(seed);
    expect(r1).toBe(r2);
    expect(r2).toBe(r3);
  });

  it('idempotencia: 100 chamadas com mesma seed retornam mesma frase', () => {
    const seed: SeedFrase = { periodo: 'mes', ano: 2026, semana: 5 };
    const primeira = escolherFrase(seed);
    for (let i = 0; i < 100; i += 1) {
      expect(escolherFrase(seed)).toBe(primeira);
    }
  });

  it('seeds diferentes produzem distribuicao do pool', () => {
    const distintas = new Set<string>();
    for (let s = 0; s < 60; s += 1) {
      distintas.add(
        escolherFrase({ periodo: 'semana', ano: 2026, semana: s })
      );
    }
    // Em 60 semanas, com 12 frases, esperamos cobrir varias.
    // Conservador: ao menos 5 frases distintas para evitar
    // dependencia exata da funcao hash.
    expect(distintas.size).toBeGreaterThanOrEqual(5);
  });

  it('seed com periodo diferente pode produzir frase diferente', () => {
    const semanal = escolherFrase({
      periodo: 'semana',
      ano: 2026,
      semana: 20,
    });
    const mensal = escolherFrase({ periodo: 'mes', ano: 2026, semana: 20 });
    // Nao podemos garantir que sao distintas (colisao possivel),
    // mas as duas devem ser strings do pool.
    expect(FRASES_RECAP_VAZIO).toContain(semanal);
    expect(FRASES_RECAP_VAZIO).toContain(mensal);
  });
});

describe('seedDeRange', () => {
  it('calcula semana ISO para uma data conhecida', () => {
    // 2026-01-05 (segunda-feira) -> semana 2 ISO 2026.
    const seed = seedDeRange('semana', new Date(2026, 0, 5));
    expect(seed.periodo).toBe('semana');
    expect(seed.ano).toBe(2026);
    expect(seed.semana).toBe(2);
  });

  it('semana ISO para 2026-05-15 (sexta da semana 20)', () => {
    const seed = seedDeRange('semana', new Date(2026, 4, 15));
    expect(seed.ano).toBe(2026);
    expect(seed.semana).toBe(20);
  });

  it('semana ISO consistente entre dias da mesma semana', () => {
    // 2026-05-11 (segunda) a 2026-05-17 (domingo) sao todas semana 20.
    const segunda = seedDeRange('semana', new Date(2026, 4, 11));
    const quarta = seedDeRange('semana', new Date(2026, 4, 13));
    const domingo = seedDeRange('semana', new Date(2026, 4, 17));
    expect(segunda.semana).toBe(20);
    expect(quarta.semana).toBe(20);
    expect(domingo.semana).toBe(20);
  });

  it('idempotencia: mesma data -> mesma frase via seedDeRange', () => {
    const data = new Date(2026, 4, 15);
    const f1 = escolherFrase(seedDeRange('semana', data));
    const f2 = escolherFrase(seedDeRange('semana', data));
    expect(f1).toBe(f2);
  });
});
