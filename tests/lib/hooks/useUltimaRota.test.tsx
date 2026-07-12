// Smoke do useUltimaRota (M24). Valida a logica pura de
// isRotaRestauravel - prefixos modais ficam fora do restore. O hook
// em si depende de usePathname() do expo-router, exercitado em testes
// integration de telas.
import { isRotaRestauravel } from '@/lib/hooks/useUltimaRota';

describe('isRotaRestauravel', () => {
  it('rota de visualizacao e restauravel', () => {
    // M27: rotas migraram de /(tabs)/* para raiz; fixtures
    // refletem o novo path canonico. Sprint L1 renomeou /memoria
    // para /saude-fisica.
    expect(isRotaRestauravel('/saude-fisica')).toBe(true);
    expect(isRotaRestauravel('/humor')).toBe(true);
    expect(isRotaRestauravel('/exercicios/lista')).toBe(true);
  });

  it('home root e restauravel', () => {
    expect(isRotaRestauravel('/')).toBe(true);
  });

  it('rotas modais nao sao restauraveis', () => {
    expect(isRotaRestauravel('/onboarding')).toBe(false);
    expect(isRotaRestauravel('/share-receive')).toBe(false);
    expect(isRotaRestauravel('/humor-rapido')).toBe(false);
    expect(isRotaRestauravel('/diario-emocional')).toBe(false);
    expect(isRotaRestauravel('/eventos')).toBe(false);
    expect(isRotaRestauravel('/scanner')).toBe(false);
    expect(isRotaRestauravel('/_components')).toBe(false);
  });

  it('rotas modais com query/sub-rota tambem ficam fora', () => {
    expect(isRotaRestauravel('/diario-emocional?modo=trigger')).toBe(false);
    expect(isRotaRestauravel('/onboarding/frame2')).toBe(false);
    expect(isRotaRestauravel('/_components/buttons')).toBe(false);
  });

  it('null e string vazia nao sao restauraveis', () => {
    expect(isRotaRestauravel(null)).toBe(false);
    expect(isRotaRestauravel('')).toBe(false);
  });
});
