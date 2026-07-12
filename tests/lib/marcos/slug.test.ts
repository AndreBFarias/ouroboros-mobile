import { slugifyMarco } from '@/lib/marcos/slug';

describe('slugifyMarco', () => {
  it('deriva slug ASCII da descricao', () => {
    expect(slugifyMarco('Tres treinos nesta semana.')).toMatch(/^tres-treinos/);
  });

  it('cap em 24 chars', () => {
    const longo = 'Marco grande de muito conteudo aqui dentro';
    const slug = slugifyMarco(longo);
    expect(slug.length).toBeLessThanOrEqual(24);
  });

  it('fallback "marco" quando vazio', () => {
    expect(slugifyMarco('')).toBe('marco');
    expect(slugifyMarco('   ')).toBe('marco');
  });
});
