// M-GAUNTLET-DEAD-CODE-V2: wrapper leve da rota /_dev/gauntlet. O
// dashboard interativo de fato vive em src/lib/dev/gauntletDashboard.tsx
// e e carregado via require lazy guardado por __DEV__ -- Babel-preset-
// expo substitui __DEV__ por false em release, Metro/Hermes elimina o
// branch via DCE, e gauntletDashboard (que importa o gauntlet pesado
// com __gauntlet, useGaleriaMock, instalarGauntlet, adicionarFotoMock)
// NAO entra no bundle Android release.
//
// Em release: Redirect imediato para /, sem tocar gauntletDashboard.
// Em dev (web ou nativo): require carrega o dashboard normalmente.
//
// Comentarios sem acento.
import { Redirect } from 'expo-router';
import { MODO_DEV_WEB } from '@/lib/dev/gauntletAtivo';
import type { ComponentType } from 'react';

declare const __DEV__: boolean;

export default function RotaModoDev() {
  if (!MODO_DEV_WEB) {
    return <Redirect href="/" />;
  }
  // require lazy guardado por __DEV__: Metro DCE elimina este branch
  // em release Android, e o painel pesado nao entra no bundle.
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Painel = require('@/lib/dev/gauntletDashboard')
      .default as ComponentType;
    return <Painel />;
  }
  return <Redirect href="/" />;
}
