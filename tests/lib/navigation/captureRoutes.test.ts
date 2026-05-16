import {
  CAPTURE_ROUTES,
  routeForCapture,
} from '@/lib/navigation/captureRoutes';
import type { FABRadialKey } from '@/components/ui';

// R-FAB-1: entry 'voz' removida; 5 keys remanescentes.
const KEYS: readonly FABRadialKey[] = [
  'humor',
  'camera',
  'exercicio',
  'vitoria',
  'trigger',
] as const;

describe('captureRoutes', () => {
  it('mapeia as 5 FABRadialKey para pathname nao vazio', () => {
    for (const key of KEYS) {
      const route = routeForCapture(key);
      expect(typeof route.pathname).toBe('string');
      expect(route.pathname.length).toBeGreaterThan(0);
      expect(route.pathname.startsWith('/')).toBe(true);
    }
  });

  it('humor aponta para /humor-rapido sem params', () => {
    const route = routeForCapture('humor');
    expect(route.pathname).toBe('/humor-rapido');
    expect(route.params).toBeUndefined();
  });

  it('camera aponta para /scanner sem params', () => {
    const route = routeForCapture('camera');
    expect(route.pathname).toBe('/scanner');
    expect(route.params).toBeUndefined();
  });

  it('exercicio aponta para a Tela 02 de cadastro (M13/M27)', () => {
    const route = routeForCapture('exercicio');
    expect(route.pathname).toBe('/exercicios/novo');
    expect(route.params).toBeUndefined();
  });

  // R0 lexical: FABRadialKey internamente segue 'vitoria'/'trigger'
  // (chave estavel de UI), mas o param 'modo' emitido em URL e o
  // canonico 'conquista'/'gatilho'. A tela diario-emocional aceita
  // ambos os vocabularios via normalizarModoParam. R-FAB-1: 'voz' fora.
  it('vitoria e trigger compartilham /diario-emocional com modo distinto', () => {
    const vitoria = routeForCapture('vitoria');
    const trigger = routeForCapture('trigger');

    expect(vitoria.pathname).toBe('/diario-emocional');
    expect(trigger.pathname).toBe('/diario-emocional');

    expect(vitoria.params).toEqual({ modo: 'conquista' });
    expect(trigger.params).toEqual({ modo: 'gatilho' });

    expect(vitoria.params?.modo).not.toBe(trigger.params?.modo);
  });

  it('quando params e declarado, nao e objeto vazio', () => {
    for (const key of KEYS) {
      const route = routeForCapture(key);
      if (route.params !== undefined) {
        expect(Object.keys(route.params).length).toBeGreaterThan(0);
      }
    }
  });

  it('routeForCapture devolve copia segura (caller nao muta o mapa)', () => {
    const a = routeForCapture('vitoria');
    const b = routeForCapture('vitoria');
    expect(a).not.toBe(b);
    expect(a.params).not.toBe(b.params);

    if (a.params) {
      a.params.modo = 'mutado';
    }
    const c = routeForCapture('vitoria');
    expect(c.params).toEqual({ modo: 'conquista' });
  });

  it('CAPTURE_ROUTES expoe entrada para cada FABRadialKey', () => {
    for (const key of KEYS) {
      expect(CAPTURE_ROUTES[key]).toBeDefined();
      expect(CAPTURE_ROUTES[key].pathname).toBeTruthy();
    }
  });
});
