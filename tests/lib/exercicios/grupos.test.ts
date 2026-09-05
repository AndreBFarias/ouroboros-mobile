import {
  GRUPOS_MUSCULARES_SLUGS,
  GRUPOS_MUSCULARES_LABELS,
  GRUPOS_MUSCULARES_OPTIONS,
  formatGrupoMuscular,
} from '@/lib/exercicios/grupos';

describe('grupos musculares canonicos', () => {
  it('expoe 8 slugs', () => {
    expect(GRUPOS_MUSCULARES_SLUGS).toHaveLength(8);
  });

  it('cobre todos os slugs no mapa de labels', () => {
    // Valor exato, não só presença: o mapa é string de UI e uma troca
    // silenciosa de label (ou perda de acento) é regressão visível ao
    // usuário. Os 8 pares abaixo são cópia literal da fonte.
    expect(GRUPOS_MUSCULARES_LABELS).toEqual({
      peito: 'Peito',
      costas: 'Costas',
      ombros: 'Ombros',
      biceps: 'Bíceps',
      triceps: 'Tríceps',
      pernas: 'Pernas',
      core: 'Core',
      cardio: 'Cardio',
    });
  });

  it('labels usam sentence case com acentuacao PT-BR', () => {
    expect(GRUPOS_MUSCULARES_LABELS.biceps).toBe('Bíceps');
    expect(GRUPOS_MUSCULARES_LABELS.triceps).toBe('Tríceps');
    expect(GRUPOS_MUSCULARES_LABELS.peito).toBe('Peito');
  });

  it('options pronta para ChipGroup', () => {
    expect(GRUPOS_MUSCULARES_OPTIONS).toHaveLength(8);
    for (const opt of GRUPOS_MUSCULARES_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
      expect(opt.accent).toBe('purple');
    }
  });

  it('formatGrupoMuscular resolve slug canonico', () => {
    expect(formatGrupoMuscular('peito')).toBe('Peito');
    expect(formatGrupoMuscular('biceps')).toBe('Bíceps');
  });

  it('formatGrupoMuscular faz fallback mecanico', () => {
    expect(formatGrupoMuscular('antebraco')).toBe('Antebraco');
  });
});
