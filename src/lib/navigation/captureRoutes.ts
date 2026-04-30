// Mapa puro entre cada FABRadialKey e a rota concreta de captura.
// Centraliza o roteamento para que telas futuras (M05/M06/M07/M06.5/
// M09) consumam o mesmo contrato sem reimplementar a logica.
//
// Decisoes registradas em docs/sprints/M04-spec.md secao 9:
//   1. /diario-emocional recebe modo via query string
//      (audio | vitoria | trigger).
//   2. exercicio aponta para /em-breve enquanto a galeria de
//      exercicios nao chegar (M13).
//
// Comentarios em codigo sem acentuacao (convencao shell/CI).
import type { FABRadialKey } from '@/components/ui';

// Pathnames suportados pelas 6 acoes de captura. Mantemos como union
// literal para que o expo-router (`router.push`) aceite o descriptor
// sem cast e o TS detecte erro caso alguma sprint futura redefina
// uma rota fora desta lista.
export type CaptureRoutePath =
  | '/humor-rapido'
  | '/diario-emocional'
  | '/scanner'
  | '/em-breve';

export interface RouteDescriptor {
  pathname: CaptureRoutePath;
  params?: Record<string, string>;
}

// Mapa imutavel de cada acao para a rota destino. Mantem `as const`
// para que o TypeScript preserve os literais (necessario para o
// typed routing do expo-router).
const CAPTURE_ROUTES = {
  humor: { pathname: '/humor-rapido' },
  voz: { pathname: '/diario-emocional', params: { modo: 'audio' } },
  camera: { pathname: '/scanner' },
  exercicio: { pathname: '/em-breve' },
  vitoria: { pathname: '/diario-emocional', params: { modo: 'vitoria' } },
  trigger: { pathname: '/diario-emocional', params: { modo: 'trigger' } },
} as const satisfies Readonly<Record<FABRadialKey, RouteDescriptor>>;

// Devolve uma copia rasa e segura da rota associada a `key`. Copia
// tambem o `params` (quando existe) para evitar que callers mutem
// o mapa interno por engano.
export function routeForCapture(key: FABRadialKey): RouteDescriptor {
  const route = CAPTURE_ROUTES[key];
  return 'params' in route
    ? { pathname: route.pathname, params: { ...route.params } }
    : { pathname: route.pathname };
}

export { CAPTURE_ROUTES };
