import { DiarioEmocionalSchema } from '@/lib/schemas/diario_emocional';

const baseTrigger = {
  tipo: 'diario_emocional',
  data: '2026-04-29T19:15:00-03:00',
  autor: 'pessoa_a',
  modo: 'trigger',
  emocoes: ['tristeza', 'frustracao'],
  intensidade: 4,
  com: ['pessoa_b'],
  texto: 'discussao sobre dinheiro.',
};

const baseSucesso = {
  tipo: 'diario_emocional',
  data: '2026-04-29T20:00:00-03:00',
  autor: 'pessoa_a',
  // modo vitoria = anonimato-allow: superacao
  modo: 'vitoria',
  emocoes: ['alegria', 'gratidao'],
  intensidade: 4,
  com: [],
  texto: 'consegui terminar o que comecei.',
  // M07.x: vitoria exige ao menos uma midia. Foto stub para passar
  // o refine; testes especificos do refine moram em midia.test.ts e
  // no bloco abaixo de modo vitoria.
  midia: [{ tipo: 'foto', path: 'assets/2026-04-29-2000-stub.jpg' }],
};

describe('DiarioEmocionalSchema modo trigger', () => {
  it('aceita registro com estrategia e funcionou', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseTrigger,
      estrategia: 'respirei fundo.',
      funcionou: true,
    });
    expect(out.modo).toBe('trigger');
    expect(out.funcionou).toBe(true);
  });

  it('aceita sem estrategia/funcionou', () => {
    expect(() => DiarioEmocionalSchema.parse(baseTrigger)).not.toThrow();
  });

  it('rejeita intensidade fora de 1-5', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, intensidade: 0 })
    ).toThrow();
  });
});

describe('DiarioEmocionalSchema modo vitoria', () => {
  it('aceita sem funcionou', () => {
    const out = DiarioEmocionalSchema.parse(baseSucesso);
    // anonimato-allow: substantivo comum 'vitoria'
    expect(out.modo).toBe('vitoria');
    expect(out.funcionou).toBeUndefined();
  });

  it('rejeita funcionou em modo vitoria', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseSucesso, funcionou: true })
    ).toThrow(/funcionou so pode ser definido em modo trigger/);
  });

  // M07.x: refine de midia obrigatoria.
  it('rejeita vitoria sem midia', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseSucesso, midia: [] })
    ).toThrow(/vitoria exige pelo menos uma midia/);
  });

  it('rejeita vitoria com campo midia ausente (default vazio dispara refine)', () => {
    const semMidia = { ...baseSucesso };
    delete (semMidia as { midia?: unknown }).midia;
    expect(() => DiarioEmocionalSchema.parse(semMidia)).toThrow(
      /vitoria exige pelo menos uma midia/
    );
  });
});

describe('DiarioEmocionalSchema validacoes gerais', () => {
  it('rejeita autor ambos', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, autor: 'ambos' })
    ).toThrow();
  });

  it('rejeita data sem hora', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, data: '2026-04-29' })
    ).toThrow();
  });

  it('aceita audio null e undefined', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, audio: null })
    ).not.toThrow();
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseTrigger, audio: undefined })
    ).not.toThrow();
  });
});

describe('DiarioEmocionalSchema contexto_social (M06.X)', () => {
  it('default vazio quando campo omitido (compat com .md antigos)', () => {
    const out = DiarioEmocionalSchema.parse(baseTrigger);
    expect(out.contexto_social).toEqual([]);
  });

  it('aceita amigos', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseTrigger,
      contexto_social: ['amigos'],
    });
    expect(out.contexto_social).toEqual(['amigos']);
  });

  it('aceita sozinho', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseTrigger,
      contexto_social: ['sozinho'],
    });
    expect(out.contexto_social).toEqual(['sozinho']);
  });

  it('aceita amigos e sozinho juntos (cenario de pesquisa social)', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseTrigger,
      contexto_social: ['amigos', 'sozinho'],
    });
    expect(out.contexto_social).toHaveLength(2);
  });

  it('rejeita valor fora do enum', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({
        ...baseTrigger,
        contexto_social: ['familia'],
      })
    ).toThrow();
  });

  it('rejeita PessoaId em contexto_social (campo separado)', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({
        ...baseTrigger,
        contexto_social: ['pessoa_a'],
      })
    ).toThrow();
  });
});
