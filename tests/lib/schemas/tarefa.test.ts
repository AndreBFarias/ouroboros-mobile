// Testes do TarefaSchema (M17). Cobre caminho feliz, regex de data,
// regex de feito_em, autor, slugifyTitulo helper e sufixoRandom.
//
// Comentarios sem acento (convencao shell/CI).
import {
  TarefaSchema,
  slugifyTitulo,
  sufixoRandom,
} from '@/lib/schemas/tarefa';

const baseTarefa = {
  tipo: 'tarefa',
  data: '2026-04-29',
  autor: 'pessoa_a',
  titulo: 'Comprar pão',
  feito: false,
  feito_em: null,
};

describe('TarefaSchema', () => {
  it('aceita tarefa pendente completa', () => {
    const out = TarefaSchema.parse(baseTarefa);
    expect(out.titulo).toBe('Comprar pão');
    expect(out.feito).toBe(false);
    expect(out.feito_em).toBeNull();
  });

  it('aceita tarefa feita com feito_em ISO', () => {
    const t = {
      ...baseTarefa,
      feito: true,
      feito_em: '2026-04-29T10:00:00-03:00',
    };
    const out = TarefaSchema.parse(t);
    expect(out.feito).toBe(true);
    expect(out.feito_em).toBe('2026-04-29T10:00:00-03:00');
  });

  it('aceita autor pessoa_b', () => {
    expect(
      TarefaSchema.parse({ ...baseTarefa, autor: 'pessoa_b' }).autor
    ).toBe('pessoa_b');
  });

  it('rejeita autor "ambos"', () => {
    expect(() =>
      TarefaSchema.parse({ ...baseTarefa, autor: 'ambos' })
    ).toThrow();
  });

  it('rejeita data fora do formato YYYY-MM-DD', () => {
    expect(() =>
      TarefaSchema.parse({ ...baseTarefa, data: '29/04/2026' })
    ).toThrow();
    expect(() =>
      TarefaSchema.parse({ ...baseTarefa, data: '2026-4-29' })
    ).toThrow();
  });

  it('rejeita feito_em sem offset', () => {
    expect(() =>
      TarefaSchema.parse({
        ...baseTarefa,
        feito: true,
        feito_em: '2026-04-29 10:00:00',
      })
    ).toThrow();
  });

  it('aceita feito_em em UTC com Z', () => {
    const t = {
      ...baseTarefa,
      feito: true,
      feito_em: '2026-04-29T13:00:00Z',
    };
    expect(TarefaSchema.parse(t).feito_em).toBe('2026-04-29T13:00:00Z');
  });

  it('rejeita titulo vazio', () => {
    expect(() =>
      TarefaSchema.parse({ ...baseTarefa, titulo: '' })
    ).toThrow();
  });

  it('rejeita titulo > 200 chars', () => {
    expect(() =>
      TarefaSchema.parse({ ...baseTarefa, titulo: 'a'.repeat(201) })
    ).toThrow();
  });

  it('rejeita tipo diferente de "tarefa"', () => {
    expect(() =>
      TarefaSchema.parse({ ...baseTarefa, tipo: 'humor' })
    ).toThrow();
  });
});

describe('slugifyTitulo', () => {
  it('remove acentos e troca espacos por hifen', () => {
    expect(slugifyTitulo('Comprar pão')).toBe('comprar-pao');
  });

  it('remove caracteres especiais', () => {
    expect(slugifyTitulo('Ligar p/ médico!')).toBe('ligar-p-medico');
  });

  it('colapsa hifens consecutivos', () => {
    expect(slugifyTitulo('a   b')).toBe('a-b');
  });

  it('retorna fallback "tarefa" para titulo so com simbolos', () => {
    expect(slugifyTitulo('!!!')).toBe('tarefa');
  });

  it('limita a 64 chars', () => {
    const longo = 'a '.repeat(80);
    const out = slugifyTitulo(longo);
    expect(out.length).toBeLessThanOrEqual(64);
  });

  it('trata maiusculas', () => {
    expect(slugifyTitulo('LIVROS NOVOS')).toBe('livros-novos');
  });
});

describe('sufixoRandom', () => {
  it('gera 4 chars [a-z0-9]', () => {
    const s = sufixoRandom();
    expect(s).toMatch(/^[a-z0-9]{4}$/);
  });

  it('valores variam entre chamadas', () => {
    // Probabilistico mas confiavel: 36^4 = 1.6M combinacoes; 5
    // amostras quase nunca colidem.
    const conjunto = new Set<string>();
    for (let i = 0; i < 5; i++) conjunto.add(sufixoRandom());
    expect(conjunto.size).toBeGreaterThanOrEqual(2);
  });
});
