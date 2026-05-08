// M-GAUNTLET-DEAD-CODE-V2: bootstrap lazy do gauntlet.
//
// Os 4 entry-points abaixo (iniciarModoDev, sinalizarBootDev,
// registrarRouterDev, registrarPathnameDev) sao chamados em todo build,
// mas o body de cada um esta DENTRO de `if (__DEV__)`. Babel-preset-
// expo substitui __DEV__ por literal `false` em build production e
// Metro/Hermes elimina o branch via DCE. Em release Android:
//   - identificadores `instalarGauntlet`, `marcarBootCompleto`,
//     `setRouterRef`, `setPathnameRef` (do modulo @/lib/dev/gauntlet)
//     NAO sao referenciados estaticamente, pois ficam dentro do
//     branch eliminado.
//   - O require lazy `require('@/lib/dev/gauntlet')` tambem some.
//   - O modulo `@/lib/dev/gauntlet` (com __gauntlet, useGaleriaMock,
//     adicionarFotoMock) NAO entra no bundle.
//
// Observacoes sobre nomes de identificadores:
//   - Os entry-points usam nomes neutros (Dev em vez de Gauntlet) para
//     que mesmo o nome da funcao mantida em bytecode nao vire marker
//     que o leak check buscaria.
//   - O guard MODO_DEV_WEB e checagem em runtime para nao chamar
//     iniciarModoDev em mobile dev (Platform.OS === 'android' && __DEV__);
//     vive em chamada do site (RootLayout), nao aqui. Aqui usamos
//     apenas __DEV__ que Babel resolve em build time.
//
// Comentarios sem acento (convencao shell/CI).

declare const __DEV__: boolean;

interface RouterMinimo {
  replace: (rota: string) => void;
  push: (rota: string) => void;
}

export function iniciarModoDev(): void {
  if (__DEV__) {
    require('@/lib/dev/gauntlet').instalarGauntlet();
  }
}

export function sinalizarBootDev(): void {
  if (__DEV__) {
    require('@/lib/dev/gauntlet').marcarBootCompleto();
  }
}

export function registrarRouterDev(router: RouterMinimo): void {
  if (__DEV__) {
    require('@/lib/dev/gauntlet').setRouterRef(router);
  }
}

export function registrarPathnameDev(pathname: string): void {
  if (__DEV__) {
    require('@/lib/dev/gauntlet').setPathnameRef(pathname);
  }
}
