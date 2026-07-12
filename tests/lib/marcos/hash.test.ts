// Testes do hash de marcos. Determinismo, comprimento e dedupe entre
// origens.
import { hashMarcoConteudo } from '@/lib/marcos/hash';

describe('hashMarcoConteudo', () => {
  it('retorna hash de 12 chars hex', () => {
    const h = hashMarcoConteudo('pessoa_a', 'Tres treinos nesta semana.');
    expect(h).toMatch(/^[0-9a-f]{12}$/);
  });

  it('e deterministico para mesma entrada', () => {
    const a = hashMarcoConteudo('pessoa_a', 'algo');
    const b = hashMarcoConteudo('pessoa_a', 'algo');
    expect(a).toBe(b);
  });

  it('diferencia por autor', () => {
    const a = hashMarcoConteudo('pessoa_a', 'algo');
    const b = hashMarcoConteudo('pessoa_b', 'algo');
    expect(a).not.toBe(b);
  });

  it('diferencia por descricao', () => {
    const a = hashMarcoConteudo('pessoa_a', 'algo X');
    const b = hashMarcoConteudo('pessoa_a', 'algo Y');
    expect(a).not.toBe(b);
  });

  it('ignora trim na descricao', () => {
    const a = hashMarcoConteudo('pessoa_a', 'algo');
    const b = hashMarcoConteudo('pessoa_a', '  algo  ');
    expect(a).toBe(b);
  });

  it('preserva caso (case-sensitive)', () => {
    const a = hashMarcoConteudo('pessoa_a', 'Algo');
    const b = hashMarcoConteudo('pessoa_a', 'algo');
    expect(a).not.toBe(b);
  });
});
