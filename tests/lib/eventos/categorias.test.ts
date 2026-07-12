// Testes do dicionario de categorias (Tela 20). Slugs em
// snake_case ASCII; o mapa de labels precisa restaurar diacriticos
// PT-BR exigidos pela ortografia (exercicio -> Exercicio com agudo).
// Lista fechada e ordenada conforme a spec.
import {
  EVENTO_CATEGORIAS_LABELS,
  EVENTO_CATEGORIAS_OPTIONS,
  EVENTO_CATEGORIAS_SLUGS,
  formatCategoria,
} from '@/lib/eventos/categorias';

describe('EVENTO_CATEGORIAS_SLUGS', () => {
  it('expoe lista fechada com 8 slugs canonicos em snake_case', () => {
    expect(EVENTO_CATEGORIAS_SLUGS).toHaveLength(8);
    expect(EVENTO_CATEGORIAS_SLUGS).toEqual([
      'rolezinho',
      'compras',
      'consulta',
      'trabalho',
      'evento_social',
      'rotina',
      'exercicio',
      'outro',
    ]);
    for (const slug of EVENTO_CATEGORIAS_SLUGS) {
      expect(slug).toMatch(/^[a-z_]+$/);
    }
  });

  it('inclui exercicio (decisao M07 secao 9)', () => {
    expect(EVENTO_CATEGORIAS_SLUGS).toContain('exercicio');
  });

  it('slugs sao unicos', () => {
    const set = new Set(EVENTO_CATEGORIAS_SLUGS);
    expect(set.size).toBe(EVENTO_CATEGORIAS_SLUGS.length);
  });
});

describe('EVENTO_CATEGORIAS_LABELS', () => {
  it('cobre todos os 8 slugs', () => {
    for (const slug of EVENTO_CATEGORIAS_SLUGS) {
      expect(EVENTO_CATEGORIAS_LABELS[slug]).toBeDefined();
      expect(EVENTO_CATEGORIAS_LABELS[slug].length).toBeGreaterThan(0);
    }
  });

  it('Exercicio tem agudo no i', () => {
    expect(EVENTO_CATEGORIAS_LABELS.exercicio).toBe('Exercício');
  });

  it('Evento social esta em sentence case com espaco', () => {
    expect(EVENTO_CATEGORIAS_LABELS.evento_social).toBe('Evento social');
  });

  it('todos os labels comecam com letra maiuscula', () => {
    for (const slug of EVENTO_CATEGORIAS_SLUGS) {
      const label = EVENTO_CATEGORIAS_LABELS[slug];
      expect(label.charAt(0)).toBe(label.charAt(0).toUpperCase());
    }
  });
});

describe('formatCategoria', () => {
  it('converte slug canonico simples para Sentence case', () => {
    expect(formatCategoria('rolezinho')).toBe('Rolezinho');
    expect(formatCategoria('compras')).toBe('Compras');
    expect(formatCategoria('consulta')).toBe('Consulta');
    expect(formatCategoria('trabalho')).toBe('Trabalho');
    expect(formatCategoria('rotina')).toBe('Rotina');
    expect(formatCategoria('outro')).toBe('Outro');
  });

  it('converte evento_social em "Evento social"', () => {
    expect(formatCategoria('evento_social')).toBe('Evento social');
  });

  it('restaura diacritico em exercicio', () => {
    expect(formatCategoria('exercicio')).toBe('Exercício');
  });

  it('fallback mecanico para slug desconhecido', () => {
    expect(formatCategoria('show_de_rock')).toBe('Show de rock');
    expect(formatCategoria('xyz')).toBe('Xyz');
  });

  it('preserva slug original quando vazio', () => {
    expect(formatCategoria('')).toBe('');
  });
});

describe('EVENTO_CATEGORIAS_OPTIONS', () => {
  it('mapeia cada slug para ChipOption com value, label e accent', () => {
    expect(EVENTO_CATEGORIAS_OPTIONS).toHaveLength(8);
    const opt = EVENTO_CATEGORIAS_OPTIONS[0];
    expect(opt.value).toBe('rolezinho');
    expect(opt.label).toBe('Rolezinho');
    expect(opt.accent).toBe('purple');
  });

  it('todos os labels seguem o mapa acentuado', () => {
    for (const opt of EVENTO_CATEGORIAS_OPTIONS) {
      expect(opt.label).toBe(formatCategoria(opt.value));
    }
  });

  it('todos comecam com letra maiuscula', () => {
    for (const opt of EVENTO_CATEGORIAS_OPTIONS) {
      expect(opt.label.charAt(0)).toBe(opt.label.charAt(0).toUpperCase());
    }
  });
});
