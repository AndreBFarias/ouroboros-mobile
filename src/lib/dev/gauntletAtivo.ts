// M-GAUNTLET-DEAD-CODE-V2: micro-modulo isolado que expoe apenas a
// flag MODO_DEV_WEB. Existe para que consumidores em runtime de release
// (useFotosAgregadas, useHumorHeatmap, capturarFoto, adicionarFotoManual,
// app/_dev/_layout, app/_dev/showcase, app/_layout) possam checar o
// modo dev SEM importar `@/lib/dev/gauntlet`, que carrega o objeto
// __gauntlet pesado e arrasta useGaleriaMock/useHumorMock/useDiarioMock/
// useEventosMock para o bundle.
//
// MODO_DEV_WEB substitui o antigo GAUNTLET_ATIVO em todos os
// consumidores de release. O nome canonico GAUNTLET_ATIVO continua
// disponivel via re-export em `@/lib/dev/gauntlet` para back-compat de
// testes e codigo dev-only.
//
// Garantia anti-vazamento:
//   MODO_DEV_WEB = Platform.OS === 'web' && __DEV__.
// Em mobile (Android/iOS) Platform.OS !== 'web' bloqueia.
// Em release web __DEV__ vira false e o branch que importa modulos
// pesados via require() lazy e DCE-ado por Metro/Hermes.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';

declare const __DEV__: boolean;

export const MODO_DEV_WEB: boolean =
  Platform.OS === 'web' && (typeof __DEV__ !== 'undefined' ? __DEV__ : false);
