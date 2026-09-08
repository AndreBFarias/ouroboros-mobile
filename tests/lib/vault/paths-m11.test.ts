// Testes dos paths novos da M11: treinosPath e marcosPath.
//
// EXE-1 (2026-09-08): treinosPath ganhou a hora. O formato antigo
// continua acessivel por treinosPathLegado, usado pela migracao
// one-shot e pelos testes de regressao de leitura.
import {
  treinosPath,
  treinosPathLegado,
  marcosPath,
} from '@/lib/vault/paths';

describe('treinosPath', () => {
  it('gera treinos/YYYY-MM-DD-HHmm-<slug>.md', () => {
    const d = new Date('2026-04-23T07:12:00-03:00');
    expect(treinosPath(d, 'rotina-a')).toBe(
      'treinos/2026-04-23-0712-rotina-a.md'
    );
  });

  it('distingue duas sessoes da mesma rotina no mesmo dia', () => {
    const manha = new Date('2026-04-23T07:12:00-03:00');
    const noite = new Date('2026-04-23T19:40:00-03:00');
    expect(treinosPath(manha, 'rotina-a')).not.toBe(
      treinosPath(noite, 'rotina-a')
    );
    expect(treinosPath(noite, 'rotina-a')).toBe(
      'treinos/2026-04-23-1940-rotina-a.md'
    );
  });

  it('treinosPathLegado preserva o formato anterior a EXE-1', () => {
    const d = new Date('2026-04-23T07:12:00-03:00');
    expect(treinosPathLegado(d, 'rotina-a')).toBe(
      'treinos/2026-04-23-rotina-a.md'
    );
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
