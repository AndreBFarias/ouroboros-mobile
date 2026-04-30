import {
  TAGS_RAPIDAS,
  TAGS_RAPIDAS_SLUGS,
  formatTag,
} from '@/lib/humor/tagsRapidas';

describe('formatTag', () => {
  it('converte snake_case em sentence case', () => {
    expect(formatTag('trabalho_pesado')).toBe('Trabalho pesado');
  });

  it('cobre slugs de duas palavras', () => {
    expect(formatTag('boa_conversa')).toBe('Boa conversa');
    expect(formatTag('foco_dificil')).toBe('Foco dificil');
    expect(formatTag('dormi_mal')).toBe('Dormi mal');
    expect(formatTag('treino_bom')).toBe('Treino bom');
    expect(formatTag('dia_leve')).toBe('Dia leve');
  });

  it('mantem slug de uma palavra capitalizado', () => {
    expect(formatTag('cansaco')).toBe('Cansaco');
    expect(formatTag('exercicio')).toBe('Exercicio');
  });

  it('preserva slug original quando vazio', () => {
    expect(formatTag('')).toBe('');
  });

  it('lida com slug todo em underscore', () => {
    // Edge: '_' vira ' ', trim deixa vazio. Devolve o slug original
    // como fallback para nao quebrar UI.
    expect(formatTag('_')).toBe('_');
  });
});

describe('TAGS_RAPIDAS_SLUGS', () => {
  it('expoe lista fechada com 8 slugs canonicos', () => {
    expect(TAGS_RAPIDAS_SLUGS).toHaveLength(8);
    expect(TAGS_RAPIDAS_SLUGS).toEqual([
      'trabalho_pesado',
      'boa_conversa',
      'cansaco',
      'exercicio',
      'foco_dificil',
      'dormi_mal',
      'treino_bom',
      'dia_leve',
    ]);
  });
});

describe('TAGS_RAPIDAS', () => {
  it('mapeia cada slug para ChipOption com value, label e accent', () => {
    expect(TAGS_RAPIDAS).toHaveLength(8);
    const opt = TAGS_RAPIDAS[0];
    expect(opt.value).toBe('trabalho_pesado');
    expect(opt.label).toBe('Trabalho pesado');
    expect(opt.accent).toBe('cyan');
  });

  it('todos os labels comecam com letra maiuscula', () => {
    for (const opt of TAGS_RAPIDAS) {
      expect(opt.label.charAt(0)).toBe(opt.label.charAt(0).toUpperCase());
    }
  });
});
