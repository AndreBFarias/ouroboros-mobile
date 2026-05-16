// Mapa puro entre cada FABRadialKey e a rota concreta de captura.
// Centraliza o roteamento para que telas futuras (M05/M06/M07/M06.5/
// M09) consumam o mesmo contrato sem reimplementar a logica.
//
// Decisões registradas em docs/sprints/M04-spec.md seção 9,
// docs/sprints/M13-spec.md seção 10 e docs/sprints/M27-spec.md:
//   1. /diario-emocional recebe modo via query string
//      (audio | conquista | gatilho | reflexao).
//   2. exercício aponta para /exercicios/novo (M27 removeu o grupo
//      (tabs); M13 antes apontava para /(tabs)/exercicios/novo).
//
// R0 lexical: param 'modo' emitido com vocabulario canonico
// (conquista/gatilho/reflexao). A tela diario-emocional aceita os
// valores legacy via normalizarModoParam, mas as rotas internas
// emitem apenas canonico em codigo novo.
//
// Comentarios em código sem acentuacao (convencao shell/CI).
import type { FABRadialKey } from '@/components/ui';

// Pathnames suportados pelas 6 ações de captura. Mantemos como union
// literal para que o expo-router (`router.push`) aceite o descriptor
// sem cast e o TS detecte erro caso alguma sprint futura redefina
// uma rota fora desta lista.
export type CaptureRoutePath =
  | '/humor-rapido'
  | '/diario-emocional'
  | '/scanner'
  | '/exercicios/novo';

export interface RouteDescriptor {
  pathname: CaptureRoutePath;
  params?: Record<string, string>;
}

// Mapa imutavel de cada ação para a rota destino. Mantem `as const`
// para que o TypeScript preserve os literais (necessario para o
// typed routing do expo-router).
const CAPTURE_ROUTES = {
  humor: { pathname: '/humor-rapido' },
  voz: { pathname: '/diario-emocional', params: { modo: 'audio' } },
  camera: { pathname: '/scanner' },
  exercicio: { pathname: '/exercicios/novo' },
  vitoria: { pathname: '/diario-emocional', params: { modo: 'conquista' } },
  trigger: { pathname: '/diario-emocional', params: { modo: 'gatilho' } },
} as const satisfies Readonly<Record<FABRadialKey, RouteDescriptor>>;

// Devolve uma copia rasa e segura da rota associada a `key`. Copia
// também o `params` (quando existe) para evitar que callers mutem
// o mapa interno por engano.
export function routeForCapture(key: FABRadialKey): RouteDescriptor {
  const route = CAPTURE_ROUTES[key];
  return 'params' in route
    ? { pathname: route.pathname, params: { ...route.params } }
    : { pathname: route.pathname };
}

export { CAPTURE_ROUTES };
