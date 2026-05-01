import { slugifyTreino } from '@/lib/treinos/slug';

describe('slugifyTreino', () => {
  it('converte em kebab-case ASCII', () => {
    expect(slugifyTreino('Rotina A')).toBe('rotina-a');
    expect(slugifyTreino('Treino Funcional')).toBe('treino-funcional');
  });

  it('remove diacriticos PT-BR', () => {
    expect(slugifyTreino('Membros inferiores')).toBe('membros-inferiores');
    expect(slugifyTreino('Núcleo')).toBe('nucleo');
  });

  it('cap em 32 chars preservando palavras', () => {
    const longo = 'rotina super longa do treino completo para hoje';
    const slug = slugifyTreino(longo);
    expect(slug.length).toBeLessThanOrEqual(32);
    expect(slug.startsWith('rotina-super-longa-do-treino')).toBe(true);
  });

  it('fallback "treino" quando entrada vazia', () => {
    expect(slugifyTreino('')).toBe('treino');
    expect(slugifyTreino('!!!')).toBe('treino');
  });
});
