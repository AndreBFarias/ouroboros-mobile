// Lista canonica das rotas onde o FABMenu global deve sumir. Definido
// em INTEGRATION-CONTRACT secao 7.10 (M27): rotas modais e fluxos
// one-shot nao devem hospedar o FAB para nao competir com o gesto
// proprio do sheet/scanner. Storybook /_components mantem o FAB
// visivel propositalmente para validacao em desenvolvimento.
//
// Verificacao por prefixo: uma rota e ocultada se for igual a um
// item da lista ou comecar com `<item>/` (cobre /scanner/captura,
// /onboarding/frame2 etc).
//
// Comentarios sem acento (convencao shell/CI).
export const ROTAS_SEM_FAB: ReadonlyArray<string> = [
  '/onboarding',
  '/share-receive',
  '/humor-rapido',
  '/diario-emocional',
  '/eventos',
  '/scanner',
  '/recap',
  // M-CAPTURA-UNIFICADA: rota modal de escolha entre "Registrar
  // momento" e "Escanear documento". FAB principal nao deve
  // renderizar sobre o sheet de decisao.
  '/captura',
] as const;

export function rotaEsconderFAB(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.length === 0) return false;
  // Normaliza descartando query string e hash; usePathname() em
  // expo-router devolve pathname limpo, mas aqui defendemos contra
  // chamada manual.
  const semQuery = pathname.split('?')[0].split('#')[0];
  for (const prefixo of ROTAS_SEM_FAB) {
    if (semQuery === prefixo || semQuery.startsWith(`${prefixo}/`)) {
      return true;
    }
  }
  return false;
}
