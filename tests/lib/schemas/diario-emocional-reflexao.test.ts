// Sprint G2 (I-DIARIO-REFLEXAO): cobre o terceiro modo do
// DiarioEmocionalSchema. Modo reflexao nao tem polaridade
// (nem trigger negativo, nem vitoria positiva): aceita registros
// sem midia, sem funcionou e sem estrategia. Os refines existentes
// (funcionou so em trigger; vitoria exige midia) seguem ativos
// para os outros dois modos.
import {
  DiarioEmocionalModoSchema,
  DiarioEmocionalSchema,
} from '@/lib/schemas/diario_emocional';

const baseReflexao = {
  tipo: 'diario_emocional',
  data: '2026-05-08T15:30:00-03:00',
  autor: 'pessoa_a',
  modo: 'reflexao',
  emocoes: ['pensativo', 'curioso'],
  intensidade: 3,
  com: [],
  texto: 'pensando no que o dia trouxe ate aqui.',
};

describe('DiarioEmocionalModoSchema enum', () => {
  it('aceita os 3 modos canonicos', () => {
    expect(DiarioEmocionalModoSchema.parse('trigger')).toBe('trigger');
    expect(DiarioEmocionalModoSchema.parse('vitoria')).toBe('vitoria');
    expect(DiarioEmocionalModoSchema.parse('reflexao')).toBe('reflexao');
  });

  it('rejeita modo desconhecido', () => {
    expect(() => DiarioEmocionalModoSchema.parse('outro')).toThrow();
  });
});

describe('DiarioEmocionalSchema modo reflexao', () => {
  it('aceita registro reflexao basico (sem midia, sem funcionou, sem estrategia)', () => {
    const out = DiarioEmocionalSchema.parse(baseReflexao);
    expect(out.modo).toBe('reflexao');
    expect(out.funcionou).toBeUndefined();
    expect(out.estrategia).toBeUndefined();
    expect(out.midia).toEqual([]);
  });

  it('rejeita funcionou em modo reflexao (so trigger pode setar funcionou)', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseReflexao, funcionou: true })
    ).toThrow(/funcionou so pode ser definido em modo trigger/);
  });

  it('NAO exige midia em modo reflexao (refine vitoria nao se aplica)', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseReflexao, midia: [] })
    ).not.toThrow();
  });

  it('aceita midia opcional em modo reflexao se usuario anexar', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseReflexao,
      midia: [{ tipo: 'foto', path: 'assets/2026-05-08-1530-stub.jpg' }],
    });
    expect(out.midia).toHaveLength(1);
  });

  it('aceita estrategia opcional em modo reflexao (campo segue z.string optional)', () => {
    // Schema nao tem refine bloqueando estrategia em modos diferentes
    // de trigger. Mantemos campo opcional para nao quebrar arquivos
    // antigos; UI nao oferece input de estrategia em reflexao.
    const out = DiarioEmocionalSchema.parse({
      ...baseReflexao,
      estrategia: 'pausei pra respirar.',
    });
    expect(out.estrategia).toBe('pausei pra respirar.');
  });

  it('aceita reflexao sem emocoes (lista vazia default)', () => {
    const semEmocoes = { ...baseReflexao, emocoes: [] };
    const out = DiarioEmocionalSchema.parse(semEmocoes);
    expect(out.emocoes).toEqual([]);
  });

  it('aceita reflexao com contexto_social', () => {
    const out = DiarioEmocionalSchema.parse({
      ...baseReflexao,
      contexto_social: ['sozinho'],
    });
    expect(out.contexto_social).toEqual(['sozinho']);
  });

  it('default {tipo:"mim"} em para quando omitido', () => {
    const out = DiarioEmocionalSchema.parse(baseReflexao);
    expect(out.para).toEqual({ tipo: 'mim' });
  });

  it('rejeita intensidade fora de 1-5', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseReflexao, intensidade: 6 })
    ).toThrow();
  });

  it('rejeita data sem hora', () => {
    expect(() =>
      DiarioEmocionalSchema.parse({ ...baseReflexao, data: '2026-05-08' })
    ).toThrow();
  });
});
