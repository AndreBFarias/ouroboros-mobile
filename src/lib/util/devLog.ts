// R-INT-3-LOGGER-CONDICIONAL: log de diagnostico que so emite em __DEV__.
//
// Os logs operacionais [hc-autopull]/[integracoes]/[hc-sync] poluiam o logcat
// do APK release (apareciam em producao). __DEV__ e flag build-time do React
// Native: Babel-preset-expo inlina como `false` em release, entao o corpo vira
// dead-code e os logs somem do bundle de producao. Em dev (Metro/web) loga
// normalmente.
//
// IMPORTANTE: console.warn/console.error NAO devem usar isto — erros reais
// precisam aparecer em release tambem.
//
// Comentarios sem acento (convencao shell/CI).

declare const __DEV__: boolean;

export function devLog(...args: unknown[]): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
