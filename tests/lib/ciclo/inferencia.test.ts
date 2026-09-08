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

describe('deveMostrarItemCiclo - com segunda pessoa', () => {
  it('esconde quando ambos masculino', () => {
    expect(deveMostrarItemCiclo('masculino', 'masculino', 'casal')).toBe(false);
    expect(deveMostrarItemCiclo('masculino', 'masculino', 'amigos')).toBe(
      false
    );
  });

  it('mostra quando uma e feminina', () => {
    expect(deveMostrarItemCiclo('masculino', 'feminino', 'casal')).toBe(true);
    expect(deveMostrarItemCiclo('feminino', 'masculino', 'casal')).toBe(true);
  });

  it('mostra quando ambas femininas', () => {
    expect(deveMostrarItemCiclo('feminino', 'feminino', 'casal')).toBe(true);
  });

  it('mostra quando ao menos uma e nao-binaria', () => {
    expect(deveMostrarItemCiclo('masculino', 'nao-binario', 'casal')).toBe(
      true
    );
    expect(deveMostrarItemCiclo('nao-binario', 'masculino', 'casal')).toBe(
      true
    );
  });

  it('mostra quando ao menos uma ainda nao declarou (null)', () => {
    expect(deveMostrarItemCiclo(null, null, 'casal')).toBe(true);
    expect(deveMostrarItemCiclo('masculino', null, 'casal')).toBe(true);
    expect(deveMostrarItemCiclo(null, 'masculino', 'casal')).toBe(true);
  });

  it('mostra quando prefere-nao-dizer (autonomia)', () => {
    expect(
      deveMostrarItemCiclo('prefiro-nao-dizer', 'prefiro-nao-dizer', 'casal')
    ).toBe(true);
    expect(deveMostrarItemCiclo('masculino', 'prefiro-nao-dizer', 'casal')).toBe(
      true
    );
  });
});

// P2 (2026-09-08): em modo sozinho o sexo de pessoa_b e' sempre null,
// porque o onboarding nunca o pergunta. A regra antiga exigia que AS
// DUAS pessoas fossem masculinas para esconder o item, entao um homem
// que usa o app sozinho via "Ciclo" no menu. Estes casos travam a
// regra nova; sem eles, a proxima sprint que mexer no menu regride.
describe('deveMostrarItemCiclo - sozinho', () => {
  it('esconde para homem sozinho, mesmo com sexoB null', () => {
    expect(deveMostrarItemCiclo('masculino', null, 'sozinho')).toBe(false);
  });

  it('mostra para mulher sozinha', () => {
    expect(deveMostrarItemCiclo('feminino', null, 'sozinho')).toBe(true);
  });

  it('mostra para pessoa nao-binaria sozinha (autonomia)', () => {
    expect(deveMostrarItemCiclo('nao-binario', null, 'sozinho')).toBe(true);
  });

  it('mostra quem nao declarou ou preferiu nao dizer (nao presume)', () => {
    expect(deveMostrarItemCiclo(null, null, 'sozinho')).toBe(true);
    expect(deveMostrarItemCiclo('prefiro-nao-dizer', null, 'sozinho')).toBe(
      true
    );
  });

  it('ignora sexoB residual de um modo anterior', () => {
    // Quem foi casal e voltou a sozinho pode ter sexoB gravado; em
    // sozinho ele nao pode decidir nada.
    expect(deveMostrarItemCiclo('masculino', 'feminino', 'sozinho')).toBe(
      false
    );
  });
});
