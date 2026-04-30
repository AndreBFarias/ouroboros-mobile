import {
  TAGS_RAPIDAS,
  TAGS_RAPIDAS_SLUGS,
  formatTag,
} from '@/lib/humor/tagsRapidas';

describe('formatTag', () => {
  it('converte slug canonico simples em label acentuado', () => {
    expect(formatTag('trabalho_pesado')).toBe('Trabalho pesado');
  });

  it('aplica acentuacao correta nos slugs canonicos', () => {
    expect(formatTag('boa_conversa')).toBe('Boa conversa');
    expect(formatTag('foco_dificil')).toBe('Foco difícil');
    expect(formatTag('dormi_mal')).toBe('Dormi mal');
    expect(formatTag('treino_bom')).toBe('Treino bom');
    expect(formatTag('dia_leve')).toBe('Dia leve');
  });

  it('restaura diacriticos faltantes nos slugs canonicos', () => {
    expect(formatTag('cansaco')).toBe('Cansaço');
    expect(formatTag('exercicio')).toBe('Exercício');
  });

  it('faz fallback mecanico para slug desconhecido', () => {
    // Slugs nao canonicos (ex.: tag livre futura) caem na regra
    // mecanica de underscore -> espaco + capitalizacao.
    expect(formatTag('alguma_outra')).toBe('Alguma outra');
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
