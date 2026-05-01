import { slugifyExercicio } from '@/lib/exercicios/slug';

describe('slugifyExercicio', () => {
  it('converte nome simples em kebab-case', () => {
    expect(slugifyExercicio('Agachamento livre')).toBe('agachamento-livre');
  });

  it('remove acentos', () => {
    expect(slugifyExercicio('Flexão')).toBe('flexao');
    expect(slugifyExercicio('Tríceps testa')).toBe('triceps-testa');
  });

  it('colapsa multiplos espacos e simbolos', () => {
    expect(slugifyExercicio('Rosca   direta!!')).toBe('rosca-direta');
  });

  it('trunca preservando palavras (max 32)', () => {
    const slug = slugifyExercicio(
      'Agachamento bulgaro com halteres de quinze quilos cada lado'
    );
    expect(slug.length).toBeLessThanOrEqual(32);
    // Nao deve terminar com hifen.
    expect(slug.endsWith('-')).toBe(false);
  });

  it('cai em fallback "exercicio" para entrada vazia', () => {
    expect(slugifyExercicio('')).toBe('exercicio');
    expect(slugifyExercicio('!!!')).toBe('exercicio');
  });

  it('mantem digitos no slug', () => {
    expect(slugifyExercicio('Agachamento 5x10')).toBe('agachamento-5x10');
  });
});
