// Testes do schema AlarmeSchema (M16). Cobre:
//  - Frontmatter minimo valido.
//  - Frontmatter completo com todos os campos.
//  - Aceita ultimo_disparo null antes do primeiro Desligar.
//  - Recusa slug com maiusculas/acento/caracteres invalidos.
//  - Recusa horario fora do formato HH:MM.
//  - Recusa horario fora de 0-23 / 0-59.
//  - Recusa dias_semana vazio.
//  - Recusa tag/som fora do enum.
//  - Recusa snooze_minutos fora de 1-60.
//  - slugifyTitulo gera slug ASCII kebab-case.
//
// Comentarios sem acento (convencao shell/CI).
import { describe, expect, it } from '@jest/globals';
import {
  AlarmeSchema,
  AlarmeTagSchema,
  AlarmeSomSchema,
  TAGS_CANONICAS,
  SONS_CANONICOS,
  DIAS_SEMANA_LABELS,
  LIMITE_SCHEDULES,
  slugifyTitulo,
} from '@/lib/schemas/alarme';

describe('AlarmeSchema', () => {
  const minimo = {
    tipo: 'alarme' as const,
    slug: 'medicacao-manha',
    titulo: 'Medicação da manhã',
    horario: '08:30',
    dias_semana: [1, 2, 3, 4, 5],
    tag: 'medicacao' as const,
    som: 'gentle' as const,
    ativo: true,
    snooze_minutos: 5,
    criado_em: '2026-04-29T10:00:00-03:00',
    ultimo_disparo: null,
    notification_ids: [],
    snooze_id: null,
  };

  it('aceita alarme minimo valido', () => {
    const result = AlarmeSchema.safeParse(minimo);
    expect(result.success).toBe(true);
  });

  it('aceita alarme com snooze ativo e ids registrados', () => {
    const completo = {
      ...minimo,
      ultimo_disparo: '2026-04-29T08:30:00-03:00',
      notification_ids: ['ouroboros.alarme.medicacao-manha.d1', 'ouroboros.alarme.medicacao-manha.d2'],
      snooze_id: 'ouroboros.alarme.medicacao-manha.snooze',
    };
    const result = AlarmeSchema.safeParse(completo);
    expect(result.success).toBe(true);
  });

  it('aceita ultimo_disparo null antes do primeiro Desligar', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, ultimo_disparo: null });
    expect(result.success).toBe(true);
  });

  it('aceita criado_em em UTC com Z', () => {
    const result = AlarmeSchema.safeParse({
      ...minimo,
      criado_em: '2026-04-29T13:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('recusa slug com maiusculas', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, slug: 'Medicacao' });
    expect(result.success).toBe(false);
  });

  it('recusa slug com acento', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, slug: 'medicação' });
    expect(result.success).toBe(false);
  });

  it('recusa slug com espaco', () => {
    const result = AlarmeSchema.safeParse({
      ...minimo,
      slug: 'medicacao manha',
    });
    expect(result.success).toBe(false);
  });

  it('recusa slug vazio', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, slug: '' });
    expect(result.success).toBe(false);
  });

  it('recusa horario fora de HH:MM', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, horario: '8h30' });
    expect(result.success).toBe(false);
  });

  it('recusa horario com hora fora de 0-23', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, horario: '25:00' });
    expect(result.success).toBe(false);
  });

  it('recusa horario com minuto fora de 0-59', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, horario: '08:60' });
    expect(result.success).toBe(false);
  });

  it('aceita horario sem zero a esquerda', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, horario: '8:30' });
    expect(result.success).toBe(true);
  });

  it('recusa dias_semana vazio', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, dias_semana: [] });
    expect(result.success).toBe(false);
  });

  it('recusa dia da semana fora de 0-6', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, dias_semana: [7] });
    expect(result.success).toBe(false);
  });

  it('aceita 7 dias da semana', () => {
    const result = AlarmeSchema.safeParse({
      ...minimo,
      dias_semana: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(result.success).toBe(true);
  });

  it('recusa tag fora do enum', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, tag: 'estudo' });
    expect(result.success).toBe(false);
  });

  it('aceita as 3 tags canonicas', () => {
    for (const tag of TAGS_CANONICAS) {
      const result = AlarmeSchema.safeParse({ ...minimo, tag });
      expect(result.success).toBe(true);
    }
  });

  it('recusa som fora do enum', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, som: 'silencio' });
    expect(result.success).toBe(false);
  });

  it('aceita os 3 sons canonicos', () => {
    for (const som of SONS_CANONICOS) {
      const result = AlarmeSchema.safeParse({ ...minimo, som });
      expect(result.success).toBe(true);
    }
  });

  it('recusa snooze_minutos abaixo de 1', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, snooze_minutos: 0 });
    expect(result.success).toBe(false);
  });

  it('recusa snooze_minutos acima de 60', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, snooze_minutos: 61 });
    expect(result.success).toBe(false);
  });

  it('recusa criado_em fora de ISO datetime', () => {
    const result = AlarmeSchema.safeParse({
      ...minimo,
      criado_em: '2026-04-29',
    });
    expect(result.success).toBe(false);
  });

  it('recusa titulo vazio', () => {
    const result = AlarmeSchema.safeParse({ ...minimo, titulo: '' });
    expect(result.success).toBe(false);
  });

  it('aplica default snooze_minutos = 5 quando ausente', () => {
    const sem = {
      tipo: 'alarme' as const,
      slug: 'teste',
      titulo: 'Teste',
      horario: '08:00',
      dias_semana: [1],
      tag: 'outro' as const,
      som: 'gentle' as const,
      ativo: true,
      criado_em: '2026-04-29T10:00:00-03:00',
      ultimo_disparo: null,
      notification_ids: [],
      snooze_id: null,
    };
    const result = AlarmeSchema.safeParse(sem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.snooze_minutos).toBe(5);
    }
  });

  it('aplica default notification_ids = [] quando ausente', () => {
    const sem = {
      tipo: 'alarme' as const,
      slug: 'teste',
      titulo: 'Teste',
      horario: '08:00',
      dias_semana: [1],
      tag: 'outro' as const,
      som: 'gentle' as const,
      ativo: true,
      snooze_minutos: 5,
      criado_em: '2026-04-29T10:00:00-03:00',
      ultimo_disparo: null,
      snooze_id: null,
    };
    const result = AlarmeSchema.safeParse(sem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notification_ids).toEqual([]);
    }
  });
});

describe('AlarmeTagSchema / AlarmeSomSchema', () => {
  it('TAGS_CANONICAS tem 3 itens distintos', () => {
    expect(TAGS_CANONICAS.length).toBe(3);
    expect(new Set(TAGS_CANONICAS).size).toBe(3);
  });

  it('SONS_CANONICOS tem 3 itens distintos', () => {
    expect(SONS_CANONICOS.length).toBe(3);
    expect(new Set(SONS_CANONICOS).size).toBe(3);
  });

  it('AlarmeTagSchema rejeita string vazia', () => {
    expect(AlarmeTagSchema.safeParse('').success).toBe(false);
  });

  it('AlarmeSomSchema rejeita string vazia', () => {
    expect(AlarmeSomSchema.safeParse('').success).toBe(false);
  });
});

describe('DIAS_SEMANA_LABELS', () => {
  it('tem 7 entradas', () => {
    expect(DIAS_SEMANA_LABELS.length).toBe(7);
  });

  it('cada entrada tem 1 caractere', () => {
    for (const label of DIAS_SEMANA_LABELS) {
      expect(label.length).toBe(1);
    }
  });
});

describe('LIMITE_SCHEDULES', () => {
  it('vale 64 (cap nativo do Android)', () => {
    expect(LIMITE_SCHEDULES).toBe(64);
  });
});

describe('slugifyTitulo', () => {
  it('transforma acentos em ASCII', () => {
    expect(slugifyTitulo('Medicação da manhã')).toBe('medicacao-da-manha');
  });

  it('substitui multiplos espacos por hifen unico', () => {
    expect(slugifyTitulo('treino   da   tarde')).toBe('treino-da-tarde');
  });

  it('descarta caracteres especiais', () => {
    expect(slugifyTitulo('Remédio (manhã)!')).toBe('remedio-manha');
  });

  it('limita a 64 caracteres', () => {
    const longo = 'a'.repeat(100);
    const out = slugifyTitulo(longo);
    expect(out.length).toBeLessThanOrEqual(64);
  });

  it('retorna string vazia para entrada so com simbolos', () => {
    expect(slugifyTitulo('!!!')).toBe('');
  });
});
