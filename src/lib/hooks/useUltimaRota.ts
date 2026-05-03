// Hook de tracking da rota corrente (M24). Escuta usePathname() do
// expo-router e propaga setUltimaRota apenas para rotas nao-modais
// (re-abrir um sheet automaticamente no boot e intrusivo). A lista
// de prefixos ignorados e canonica e cresce caso novas rotas modais
// sejam adicionadas.
//
// Uso esperado: chamado uma unica vez no _layout, junto dos boot
// hooks. Nao precisa retornar nada; o efeito colateral e gravar no
// store.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { useSessao } from '@/lib/stores/sessao';

// Prefixos de rota que nao devem ser persistidos como ultima rota.
// Rotas modais e fluxos one-shot (onboarding, share intent, scanner,
// sheets de captura). Uma rota e ignorada se comecar com qualquer
// prefixo desta lista (ou for igual a ele).
export const ROTAS_NAO_RESTAURAVEIS: ReadonlyArray<string> = [
  '/onboarding',
  '/share-receive',
  '/humor-rapido',
  '/diario-emocional',
  '/eventos',
  '/scanner',
  '/_components',
];

export function isRotaRestauravel(path: string | null): boolean {
  if (!path) return false;
  // pathname vazio em web pode aparecer como '' antes do primeiro
  // navigation; tratamos como nao-restauravel.
  if (path.length === 0) return false;
  // Normaliza descartando query string e hash; usePathname() em
  // expo-router devolve o pathname limpo, mas ate na chamada manual
  // (testes ou rotas com '?modo=...') tratamos por defesa.
  const semQuery = path.split('?')[0].split('#')[0];
  for (const prefixo of ROTAS_NAO_RESTAURAVEIS) {
    if (semQuery === prefixo || semQuery.startsWith(`${prefixo}/`)) {
      return false;
    }
  }
  return true;
}

export function useUltimaRota(): void {
  const pathname = usePathname();
  useEffect(() => {
    if (!isRotaRestauravel(pathname)) return;
    useSessao.getState().setUltimaRota(pathname);
  }, [pathname]);
}
