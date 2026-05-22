// Config plugin entrypoint do modulo health-connect (R-INT-3-HC-BRIDGE-NATIVA
// sub-sprint A, 2026-05-22).
//
// Plugin local: nao gera codigo JS. O modulo nativo Android (Kotlin +
// androidx.health.connect:connect-client) vive em ./android e e linkado
// automaticamente pelo Expo Modules autolinking quando o app passa
// por prebuild. O config-plugin nao precisa modificar AndroidManifest
// do app -- os intent-filters de rationale activity ja sao provisionados
// pelo plugin react-native-health-connect existente em app.json (a remocao
// daquele plugin so acontece em sub-sprint D, junto com a remocao da
// dep npm).
//
// Em ambientes sem prebuild (Expo Go puro, smoke web), o modulo
// e um no-op silencioso: a bridge JS detecta ausencia e curta
// (modules/health-connect/src/index.ts).
//
// Comentarios sem acentuacao.
const withPlugins = require('@expo/config-plugins').withPlugins;

module.exports = function withHealthConnect(config) {
  return withPlugins(config, []);
};
