// Testes da inferencia de autor padrao para ciclo (sprint I-CICLO,
// M-SAVE-CICLO-VALIDA, 2026-05-07). Cobre os 6 cenarios canonicos
// citados no spec: M+M, M+F, F+M, F+F, M+sozinho, F+sozinho. Mais
// 2 extras: nao-binario solo (elegivel) e sozinho prefiro-nao-dizer
// (nao elegivel).
//
// Funcao pura sem I/O: testes diretos sem mock.
//
// Comentarios sem acento (convencao shell/CI).
import { autorPadrao, deveMostrarItemCiclo } from '@/lib/ciclo/inferencia';

describe('autorPadrao - sozinho', () => {
  it('feminino solo infere pessoa_a', () => {
    expect(autorPadrao('sozinho', 'feminino', null)).toBe('pessoa_a');
  });

  it('masculino solo nao infere (null)', () => {
    expect(autorPadrao('sozinho', 'masculino', null)).toBeNull();
  });

  it('nao-binario solo infere pessoa_a (autonomia, decisao spec §7)', () => {
    expect(autorPadrao('sozinho', 'nao-binario', null)).toBe('pessoa_a');
  });

  it('prefiro-nao-dizer solo nao infere (sem sinal explicito)', () => {
    expect(autorPadrao('sozinho', 'prefiro-nao-dizer', null)).toBeNull();
  });

  it('null solo nao infere', () => {
    expect(autorPadrao('sozinho', null, null)).toBeNull();
  });
});

describe('autorPadrao - casal', () => {
  it('M+M nao infere (null)', () => {
    expect(autorPadrao('casal', 'masculino', 'masculino')).toBeNull();
  });

  it('M+F infere pessoa_b', () => {
    expect(autorPadrao('casal', 'masculino', 'feminino')).toBe('pessoa_b');
  });

  it('F+M infere pessoa_a', () => {
    expect(autorPadrao('casal', 'feminino', 'masculino')).toBe('pessoa_a');
  });

  it('F+F nao infere (ambigua, casal lesbico ou mae+filha)', () => {
    expect(autorPadrao('casal', 'feminino', 'feminino')).toBeNull();
  });

  it('F+null infere pessoa_a (parceira ainda nao declarou)', () => {
    expect(autorPadrao('casal', 'feminino', null)).toBe('pessoa_a');
  });

  it('null+F infere pessoa_b', () => {
    expect(autorPadrao('casal', null, 'feminino')).toBe('pessoa_b');
  });

  it('M+nao-binario nao infere (sem sinal claro de menstruacao)', () => {
    expect(autorPadrao('casal', 'masculino', 'nao-binario')).toBeNull();
  });
});

describe('autorPadrao - amigos', () => {
  it('mesma logica de casal: F+M infere pessoa_a', () => {
    expect(autorPadrao('amigos', 'feminino', 'masculino')).toBe('pessoa_a');
  });

  it('M+F infere pessoa_b', () => {
    expect(autorPadrao('amigos', 'masculino', 'feminino')).toBe('pessoa_b');
  });

  it('F+F nao infere', () => {
    expect(autorPadrao('amigos', 'feminino', 'feminino')).toBeNull();
  });

  it('M+M nao infere', () => {
    expect(autorPadrao('amigos', 'masculino', 'masculino')).toBeNull();
  });
});

describe('deveMostrarItemCiclo', () => {
  it('esconde quando ambos masculino', () => {
    expect(deveMostrarItemCiclo('masculino', 'masculino')).toBe(false);
  });

  it('mostra quando uma e feminina', () => {
    expect(deveMostrarItemCiclo('masculino', 'feminino')).toBe(true);
    expect(deveMostrarItemCiclo('feminino', 'masculino')).toBe(true);
  });

  it('mostra quando ambas femininas', () => {
    expect(deveMostrarItemCiclo('feminino', 'feminino')).toBe(true);
  });

  it('mostra quando ao menos uma e nao-binaria', () => {
    expect(deveMostrarItemCiclo('masculino', 'nao-binario')).toBe(true);
    expect(deveMostrarItemCiclo('nao-binario', 'masculino')).toBe(true);
  });

  it('mostra quando ao menos uma ainda nao declarou (null)', () => {
    expect(deveMostrarItemCiclo(null, null)).toBe(true);
    expect(deveMostrarItemCiclo('masculino', null)).toBe(true);
    expect(deveMostrarItemCiclo(null, 'masculino')).toBe(true);
  });

  it('mostra quando prefere-nao-dizer (autonomia)', () => {
    expect(deveMostrarItemCiclo('prefiro-nao-dizer', 'prefiro-nao-dizer')).toBe(
      true
    );
    expect(deveMostrarItemCiclo('masculino', 'prefiro-nao-dizer')).toBe(true);
  });
});
