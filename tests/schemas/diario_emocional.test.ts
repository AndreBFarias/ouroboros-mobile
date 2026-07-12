// R0 lexical: testes refletem o vocabulario canonico atual
// (gatilho/conquista/reflexao) e cobrem a compat de leitura dos
// valores legacy (trigger/vitoria) via z.preprocess.
import { DiarioEmocionalSchema } from '@/lib/schemas/diario_emocional';

const baseGatilho = {
  tipo: 'diario_emocional',
  data: '2026-04-29T19:15:00-03:00',
  autor: 'pessoa_a',
  modo: 'gatilho',
  emocoes: ['tristeza', 'frustracao'],
  intensidade: 4,
  com: ['pessoa_b'],
  texto: 'discussao sobre dinheiro.',
};

const baseConquista = {
  tipo: 'diario_emocional',
  data: '2026-04-29T20:00:00-03:00',
  autor: 'pessoa_a',
  modo: 'conquista',
  emocoes: ['alegria', 'gratidao'],
  intensidade: 4,
  com: [],
  texto: 'consegui terminar o que comecei.',
  // M07.x: conquista exige ao menos uma midia. Foto stub para passar
  // o refine; testes especificos do refine moram em midia.test.ts e
  // no bloco abaixo de modo conquista.
  midia: [{ tipo: 'foto', path: 'assets/2026-04-29-2000-stub.jpg' }],
};

describe('DiarioEmocionalSchema modo gatilho', () => {
  it('aceita registro com estrategia e funcionou', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseGatilho,
      estrategia: 'respirei fundo.',
      funcionou: true,
    });
    expect(out.modo).toBe('gatilho');
    expect(out.funcionou).toBe(true);
  });

  it('aceita sem estrategia/funcionou', () => {
    expect(() => DiarioEmocionalSchema.parse(baseGatilho)).not.toThrow();
  });

  it('rejeita intensidade fora de 1-5', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseGatilho, intensidade: 0 })
    ).toThrow();
  });
});

describe('DiarioEmocionalSchema modo conquista', () => {
  it('aceita sem funcionou', () => {
    const out = DiarioEmocionalSchema.parse(baseConquista);
    expect(out.modo).toBe('conquista');
    expect(out.funcionou).toBeUndefined();
  });

  it('rejeita funcionou em modo conquista', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseConquista, funcionou: true })
    ).toThrow(/funcionou so pode ser definido em modo gatilho/);
  });

  // M07.x: refine de midia obrigatoria.
  it('rejeita conquista sem midia', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseConquista, midia: [] })
    ).toThrow(/conquista exige pelo menos uma midia/);
  });

  it('rejeita conquista com campo midia ausente (default vazio dispara refine)', () => {
    const semMidia = { ...baseConquista };
    delete (semMidia as { midia?: unknown }).midia;
    expect(() => DiarioEmocionalSchema.parse(semMidia)).toThrow(
      /conquista exige pelo menos uma midia/
    );
  });
});

describe('DiarioEmocionalSchema validacoes gerais', () => {
  it('rejeita autor ambos', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseGatilho, autor: 'ambos' })
    ).toThrow();
  });

  it('rejeita data sem hora', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseGatilho, data: '2026-04-29' })
    ).toThrow();
  });

  it('aceita audio null e undefined', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseGatilho, audio: null })
    ).not.toThrow();
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseGatilho, audio: undefined })
    ).not.toThrow();
  });
});

describe('DiarioEmocionalSchema campo para (M33)', () => {
  it('default {tipo:"mim"} quando campo omitido (compat .md v1)', () => {
    const out = DiarioEmocionalSchema.parse(baseGatilho);
    expect(out.para).toEqual({ tipo: 'mim' });
  });

  it('aceita para mim explicito', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseGatilho,
      para: { tipo: 'mim' },
    });
    expect(out.para).toEqual({ tipo: 'mim' });
  });

  it('aceita para outra pessoa (pessoa_b)', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseGatilho,
      para: { tipo: 'outra', pessoa: 'pessoa_b' },
    });
    expect(out.para).toEqual({ tipo: 'outra', pessoa: 'pessoa_b' });
  });

  it('aceita para o casal', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseGatilho,
      para: { tipo: 'casal' },
    });
    expect(out.para).toEqual({ tipo: 'casal' });
  });

  it('rejeita tipo invalido', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({
        ...baseGatilho,
        para: { tipo: 'terceiro' },
      })
    ).toThrow();
  });

  it('rejeita outra sem campo pessoa', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({
        ...baseGatilho,
        para: { tipo: 'outra' },
      })
    ).toThrow();
  });

  it('rejeita outra com pessoa = ambos', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({
        ...baseGatilho,
        para: { tipo: 'outra', pessoa: 'ambos' },
      })
    ).toThrow();
  });
});

describe('DiarioEmocionalSchema contexto_social (M06.X)', () => {
  it('default vazio quando campo omitido (compat com .md antigos)', () => {
    const out = DiarioEmocionalSchema.parse(baseGatilho);
    expect(out.contexto_social).toEqual([]);
  });

  it('aceita amigos', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseGatilho,
      contexto_social: ['amigos'],
    });
    expect(out.contexto_social).toEqual(['amigos']);
  });

  it('aceita sozinho', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseGatilho,
      contexto_social: ['sozinho'],
    });
    expect(out.contexto_social).toEqual(['sozinho']);
  });

  it('aceita amigos e sozinho juntos (cenario de pesquisa social)', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseGatilho,
      contexto_social: ['amigos', 'sozinho'],
    });
    expect(out.contexto_social).toHaveLength(2);
  });

  it('rejeita valor fora do enum', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({
        ...baseGatilho,
        contexto_social: ['familia'],
      })
    ).toThrow();
  });

  it('rejeita PessoaId em contexto_social (campo separado)', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({
        ...baseGatilho,
        contexto_social: ['pessoa_a'],
      })
    ).toThrow();
  });
});

// R0 backward-compat: testes novos cobrindo a leitura de .md antigos
// com chave legacy 'trigger'/'vitoria'. O schema remapeia ao parsear,
// nao reescreve o arquivo.
describe('DiarioEmocionalSchema R0 backward-compat (legacy modo)', () => {
  it('le .md antigo com modo "trigger" e expoe "gatilho" em runtime', () => {
    const legacy = { ...baseGatilho, modo: 'trigger' };
    const out = DiarioEmocionalSchema.parse(legacy);
    expect(out.modo).toBe('gatilho');
  });

  it('le .md antigo com modo "vitoria" e expoe "conquista" em runtime', () => {
    const legacy = { ...baseConquista, modo: 'vitoria' };
    const out = DiarioEmocionalSchema.parse(legacy);
    expect(out.modo).toBe('conquista');
  });

  it('preserva semantica de refines com input legacy (vitoria sem midia falha)', () => {
    const legacy = { ...baseConquista, modo: 'vitoria', midia: [] };
    expect(() => DiarioEmocionalSchema.parse(legacy)).toThrow(
      /conquista exige pelo menos uma midia/
    );
  });

  it('preserva semantica de refines com input legacy (vitoria + funcionou falha)', () => {
    const legacy = { ...baseConquista, modo: 'vitoria', funcionou: true };
    expect(() => DiarioEmocionalSchema.parse(legacy)).toThrow(
      /funcionou so pode ser definido em modo gatilho/
    );
  });

  it('idempotente: parse de um modo ja canonico nao muda valor', () => {
    const canonico = { ...baseGatilho, modo: 'gatilho' };
    const out = DiarioEmocionalSchema.parse(canonico);
    expect(out.modo).toBe('gatilho');
  });
});
