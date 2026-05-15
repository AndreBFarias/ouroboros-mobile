// Testes do TarefaSchema (M17 + M31). Cobre caminho feliz, regex de
// data, regex de feito_em, autor, slugifyTitulo helper, sufixoRandom
// e os campos novos M31 (categoria, pessoa_destino, alarme) incluindo
// migracao v1->v2 via defaults.
//
// Comentarios sem acento (convencao shell/CI).
import {
  TarefaSchema,
  TAREFA_CATEGORIAS,
  TAREFA_CATEGORIA_LABELS,
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
    expect(TarefaSchema.parse({ ...baseTarefa, autor: 'pessoa_b' }).autor).toBe(
      'pessoa_b'
    );
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
    expect(() => TarefaSchema.parse({ ...baseTarefa, titulo: '' })).toThrow();
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

describe('TarefaSchema v2 - migracao v1 -> v2', () => {
  // Tarefas v1 nao tem categoria/pessoa_destino/alarme. O schema v2
  // aplica defaults silenciosamente para preservar arquivos antigos.
  it('aplica defaults v2 quando campos novos ausentes', () => {
    const v1 = {
      tipo: 'tarefa',
      data: '2026-04-29',
      autor: 'pessoa_a',
      titulo: 'Tarefa antiga v1',
      feito: false,
      feito_em: null,
    };
    const out = TarefaSchema.parse(v1);
    expect(out.categoria).toBe('outro');
    expect(out.pessoa_destino).toEqual({ tipo: 'mim' });
    expect(out.alarme).toBeNull();
  });

  it('preserva campos v2 quando ja presentes', () => {
    const v2 = {
      ...baseTarefa,
      categoria: 'trabalho',
      pessoa_destino: { tipo: 'casal' },
      alarme: {
        ativo: true,
        data_hora_iso: '2026-05-01T14:00:00-03:00',
        recorrencia: 'unica',
      },
    };
    const out = TarefaSchema.parse(v2);
    expect(out.categoria).toBe('trabalho');
    expect(out.pessoa_destino).toEqual({ tipo: 'casal' });
    expect(out.alarme?.ativo).toBe(true);
    expect(out.alarme?.recorrencia).toBe('unica');
  });
});

describe('TarefaSchema v2 - categoria', () => {
  it('aceita todas as 8 categorias canonicas', () => {
    for (const cat of TAREFA_CATEGORIAS) {
      const out = TarefaSchema.parse({ ...baseTarefa, categoria: cat });
      expect(out.categoria).toBe(cat);
    }
  });

  it('rejeita categoria fora do enum fechado', () => {
    expect(() =>
      TarefaSchema.parse({ ...baseTarefa, categoria: 'inexistente' })
    ).toThrow();
  });

  it('expoe labels PT-BR com acentuacao para todas as categorias', () => {
    for (const cat of TAREFA_CATEGORIAS) {
      expect(TAREFA_CATEGORIA_LABELS[cat]).toBeTruthy();
    }
    expect(TAREFA_CATEGORIA_LABELS.financas).toBe('Finanças');
    expect(TAREFA_CATEGORIA_LABELS.saude).toBe('Saúde');
  });
});

describe('TarefaSchema v2 - pessoa_destino discriminado', () => {
  it('aceita tipo "mim" sem campos extras', () => {
    const out = TarefaSchema.parse({
      ...baseTarefa,
      pessoa_destino: { tipo: 'mim' },
    });
    expect(out.pessoa_destino).toEqual({ tipo: 'mim' });
  });

  it('aceita tipo "casal" sem campos extras', () => {
    const out = TarefaSchema.parse({
      ...baseTarefa,
      pessoa_destino: { tipo: 'casal' },
    });
    expect(out.pessoa_destino).toEqual({ tipo: 'casal' });
  });

  it('aceita tipo "outra" exigindo campo pessoa autor', () => {
    const out = TarefaSchema.parse({
      ...baseTarefa,
      pessoa_destino: { tipo: 'outra', pessoa: 'pessoa_b' },
    });
    expect(out.pessoa_destino).toEqual({
      tipo: 'outra',
      pessoa: 'pessoa_b',
    });
  });

  it('rejeita tipo "outra" sem campo pessoa', () => {
    expect(() =>
      TarefaSchema.parse({
        ...baseTarefa,
        pessoa_destino: { tipo: 'outra' },
      })
    ).toThrow();
  });

  it('rejeita tipo "outra" com pessoa "ambos"', () => {
    expect(() =>
      TarefaSchema.parse({
        ...baseTarefa,
        pessoa_destino: { tipo: 'outra', pessoa: 'ambos' },
      })
    ).toThrow();
  });

  it('aceita tipo "terceiro" exigindo nome livre', () => {
    const out = TarefaSchema.parse({
      ...baseTarefa,
      pessoa_destino: { tipo: 'terceiro', nome: 'Vovó' },
    });
    expect(out.pessoa_destino).toEqual({
      tipo: 'terceiro',
      nome: 'Vovó',
    });
  });

  it('rejeita tipo "terceiro" sem nome', () => {
    expect(() =>
      TarefaSchema.parse({
        ...baseTarefa,
        pessoa_destino: { tipo: 'terceiro' },
      })
    ).toThrow();
  });

  it('rejeita tipo "terceiro" com nome > 60 chars', () => {
    expect(() =>
      TarefaSchema.parse({
        ...baseTarefa,
        pessoa_destino: { tipo: 'terceiro', nome: 'a'.repeat(61) },
      })
    ).toThrow();
  });
});

describe('TarefaSchema v2 - alarme vinculado', () => {
  it('aceita alarme null (default)', () => {
    const out = TarefaSchema.parse({ ...baseTarefa, alarme: null });
    expect(out.alarme).toBeNull();
  });

  it('aceita bloco alarme com slug_vinculado opcional', () => {
    const out = TarefaSchema.parse({
      ...baseTarefa,
      alarme: {
        ativo: true,
        data_hora_iso: '2026-05-01T14:00:00-03:00',
        recorrencia: 'unica',
        slug_vinculado: 'comprar-pao-7k2x-alarme',
      },
    });
    expect(out.alarme?.slug_vinculado).toBe('comprar-pao-7k2x-alarme');
  });

  it('aceita as 4 recorrencias canonicas', () => {
    for (const rec of ['unica', 'diaria', 'semanal', 'mensal'] as const) {
      const out = TarefaSchema.parse({
        ...baseTarefa,
        alarme: {
          ativo: false,
          data_hora_iso: null,
          recorrencia: rec,
        },
      });
      expect(out.alarme?.recorrencia).toBe(rec);
    }
  });

  it('rejeita recorrencia fora do enum', () => {
    expect(() =>
      TarefaSchema.parse({
        ...baseTarefa,
        alarme: {
          ativo: false,
          data_hora_iso: null,
          recorrencia: 'aleatoria',
        },
      })
    ).toThrow();
  });
});
