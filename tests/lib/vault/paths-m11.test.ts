// Testes dos paths novos da M11: treinosPath e marcosPath.
import { treinosPath, marcosPath } from '@/lib/vault/paths';

describe('treinosPath', () => {
  it('gera treinos/YYYY-MM-DD-<slug>.md', () => {
    const d = new Date('2026-04-23T15:00:00.000Z');
    expect(treinosPath(d, 'rotina-a')).toBe('treinos/2026-04-23-rotina-a.md');
  });
});

describe('marcosPath', () => {
  it('gera marcos/YYYY-MM-DD-<slug>.md', () => {
    const d = new Date('2026-04-23T15:00:00.000Z');
    expect(marcosPath(d, 'tres-treinos')).toBe(
      'marcos/2026-04-23-tres-treinos.md'
    );
  });
});
