// Smoke do useUltimaRota (M24). Valida a logica pura de
// isRotaRestauravel - prefixos modais ficam fora do restore. O hook
// em si depende de usePathname() do expo-router, exercitado em testes
// integration de telas.
import { isRotaRestauravel } from '@/lib/hooks/useUltimaRota';

describe('isRotaRestauravel', () => {
  it('rota de visualizacao e restauravel', () => {
    expect(isRotaRestauravel('/(tabs)/hoje')).toBe(true);
    expect(isRotaRestauravel('/(tabs)/memorias')).toBe(true);
    expect(isRotaRestauravel('/(tabs)/exercicios/lista')).toBe(true);
  });

  it('home root e restauravel', () => {
    expect(isRotaRestauravel('/(tabs)')).toBe(true);
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
