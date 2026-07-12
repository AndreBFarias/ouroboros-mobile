// Testes do schema CicloMenstrualSchema (M14.5). Cobre:
//  - Frontmatter minimo valido (todos os campos obrigatorios e
//    nullables explicitos).
//  - Recusa data fora do formato YYYY-MM-DD.
//  - Recusa fase fora do enum.
//  - Recusa autor 'ambos' (so pessoa_a/b sao validos para registro).
//  - Aceita lista vazia de sintomas (default).
//  - Recusa intensidade fora de 1-5.
//  - Recusa humor_associado fora de 1-5.
//
// Comentarios sem acento (convencao shell/CI).
import { describe, expect, it } from '@jest/globals';
import {
  CicloMenstrualSchema,
  FaseCicloSchema,
  SintomaCicloSchema,
  SINTOMAS_CANONICOS,
  FASES_CANONICAS,
} from '@/lib/schemas/ciclo_menstrual';

describe('CicloMenstrualSchema', () => {
  const minimo = {
    tipo: 'ciclo_menstrual' as const,
    data: '2026-04-29',
    autor: 'pessoa_a' as const,
    data_inicio: '2026-04-12',
    fase: 'lutea' as const,
    sintomas: [],
    intensidade: null,
    humor_associado: null,
    texto: null,
  };

  it('aceita registro minimo valido', () => {
    const result = CicloMenstrualSchema.safeParse(minimo);
    expect(result.success).toBe(true);
  });

  it('aceita registro completo com todos os campos preenchidos', () => {
    const completo = {
      ...minimo,
      sintomas: ['colica', 'fadiga'],
      intensidade: 3,
      humor_associado: 4,
      texto: 'noite tranquila.',
    };
    const result = CicloMenstrualSchema.safeParse(completo);
    expect(result.success).toBe(true);
  });

  it('aceita data_inicio null antes do primeiro registro', () => {
    const result = CicloMenstrualSchema.safeParse({
      ...minimo,
      data_inicio: null,
    });
    expect(result.success).toBe(true);
  });

  it('recusa data fora de YYYY-MM-DD', () => {
    const result = CicloMenstrualSchema.safeParse({
      ...minimo,
      data: '29/04/2026',
    });
    expect(result.success).toBe(false);
  });

  it('recusa fase fora do enum', () => {
    const result = CicloMenstrualSchema.safeParse({
      ...minimo,
      fase: 'invalida',
    });
    expect(result.success).toBe(false);
  });

  it('recusa autor ambos', () => {
    const result = CicloMenstrualSchema.safeParse({
      ...minimo,
      autor: 'ambos',
    });
    expect(result.success).toBe(false);
  });

  it('recusa intensidade fora de 1-5', () => {
    const tooLow = CicloMenstrualSchema.safeParse({
      ...minimo,
      intensidade: 0,
    });
    const tooHigh = CicloMenstrualSchema.safeParse({
      ...minimo,
      intensidade: 6,
    });
    expect(tooLow.success).toBe(false);
    expect(tooHigh.success).toBe(false);
  });

  it('recusa humor_associado fora de 1-5', () => {
    const tooLow = CicloMenstrualSchema.safeParse({
      ...minimo,
      humor_associado: 0,
    });
    const tooHigh = CicloMenstrualSchema.safeParse({
      ...minimo,
      humor_associado: 9,
    });
    expect(tooLow.success).toBe(false);
    expect(tooHigh.success).toBe(false);
  });

  it('default sintomas vazio quando ausente', () => {
    const semSintomas = {
      tipo: 'ciclo_menstrual' as const,
      data: '2026-04-29',
      autor: 'pessoa_a' as const,
      data_inicio: '2026-04-12',
      fase: 'menstrual' as const,
      intensidade: null,
      humor_associado: null,
      texto: null,
    };
    const result = CicloMenstrualSchema.safeParse(semSintomas);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sintomas).toEqual([]);
    }
  });

  it('aceita todos os sintomas canonicos do enum', () => {
    for (const s of SINTOMAS_CANONICOS) {
      expect(SintomaCicloSchema.safeParse(s).success).toBe(true);
    }
  });

  it('aceita todas as fases canonicas do enum', () => {
    for (const f of FASES_CANONICAS) {
      expect(FaseCicloSchema.safeParse(f).success).toBe(true);
    }
  });

  it('recusa sintoma fora do enum canonico', () => {
    const result = CicloMenstrualSchema.safeParse({
      ...minimo,
      sintomas: ['febre'],
    });
    expect(result.success).toBe(false);
  });

  it('recusa tipo diferente de ciclo_menstrual', () => {
    const result = CicloMenstrualSchema.safeParse({
      ...minimo,
      tipo: 'humor',
    });
    expect(result.success).toBe(false);
  });
});
