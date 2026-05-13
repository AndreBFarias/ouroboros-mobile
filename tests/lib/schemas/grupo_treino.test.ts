// Testes do GrupoTreinoSchema (Q19). Cobre caminho feliz, validacao
// de slug, cap 10 rotinas, autor enum, descricao nullable, data canonica
// YYYY-MM-DD, rejeicao de lista vazia.
//
// Comentarios sem acento (convencao shell/CI).
import { GrupoTreinoSchema, type GrupoTreino } from '@/lib/schemas/grupo_treino';

const base: GrupoTreino = {
  tipo: 'grupo_treino',
  slug: 'treino-do-quaresma',
  nome: 'Treino do Quaresma',
  descricao: null,
  rotina_slugs: ['treino-a', 'treino-b'],
  data_criacao: '2026-05-13',
  autor: 'pessoa_a',
};

describe('GrupoTreinoSchema', () => {
  it('aceita grupo completo padrao', () => {
    const out = GrupoTreinoSchema.parse(base);
    expect(out.nome).toBe('Treino do Quaresma');
    expect(out.rotina_slugs).toHaveLength(2);
  });

  it('aceita descricao texto e null', () => {
    expect(
      GrupoTreinoSchema.parse({ ...base, descricao: 'ciclo de hipertrofia' })
        .descricao
    ).toBe('ciclo de hipertrofia');
    expect(
      GrupoTreinoSchema.parse({ ...base, descricao: null }).descricao
    ).toBeNull();
  });

  it('rejeita slug com maiuscula ou espaco', () => {
    expect(() =>
      GrupoTreinoSchema.parse({ ...base, slug: 'Treino_X' })
    ).toThrow();
    expect(() =>
      GrupoTreinoSchema.parse({ ...base, slug: 'treino com espaco' })
    ).toThrow();
  });

  it('aceita slug com numeros e hifens', () => {
    expect(
      GrupoTreinoSchema.parse({ ...base, slug: 'treino-abc-123' }).slug
    ).toBe('treino-abc-123');
  });

  it('rejeita nome vazio', () => {
    expect(() => GrupoTreinoSchema.parse({ ...base, nome: '' })).toThrow();
  });

  it('rejeita nome com mais de 80 caracteres', () => {
    expect(() =>
      GrupoTreinoSchema.parse({ ...base, nome: 'a'.repeat(81) })
    ).toThrow();
  });

  it('rejeita lista de rotinas vazia', () => {
    expect(() =>
      GrupoTreinoSchema.parse({ ...base, rotina_slugs: [] })
    ).toThrow();
  });

  it('aceita exatamente 10 rotinas (limite)', () => {
    const dez = Array.from({ length: 10 }, (_, i) => `rotina-${i}`);
    expect(
      GrupoTreinoSchema.parse({ ...base, rotina_slugs: dez }).rotina_slugs
    ).toHaveLength(10);
  });

  it('rejeita 11 rotinas (estoura cap)', () => {
    const onze = Array.from({ length: 11 }, (_, i) => `rotina-${i}`);
    expect(() =>
      GrupoTreinoSchema.parse({ ...base, rotina_slugs: onze })
    ).toThrow();
  });

  it('rejeita slug de rotina com formato invalido', () => {
    expect(() =>
      GrupoTreinoSchema.parse({
        ...base,
        rotina_slugs: ['treino-a', 'INVALIDO'],
      })
    ).toThrow();
  });

  it('aceita autor pessoa_a ou pessoa_b', () => {
    expect(
      GrupoTreinoSchema.parse({ ...base, autor: 'pessoa_a' }).autor
    ).toBe('pessoa_a');
    expect(
      GrupoTreinoSchema.parse({ ...base, autor: 'pessoa_b' }).autor
    ).toBe('pessoa_b');
  });

  it('rejeita data fora do formato YYYY-MM-DD', () => {
    expect(() =>
      GrupoTreinoSchema.parse({ ...base, data_criacao: '13-05-2026' })
    ).toThrow();
    expect(() =>
      GrupoTreinoSchema.parse({ ...base, data_criacao: '2026-13-01' })
    ).toThrow();
  });

  it('rejeita tipo literal diferente', () => {
    expect(() =>
      GrupoTreinoSchema.parse({ ...base, tipo: 'rotina_treino' })
    ).toThrow();
  });
});
