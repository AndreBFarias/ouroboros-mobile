// Config plugin entrypoint do modulo widget-homescreen (M20).
//
// Este plugin e local: ele nao gera codigo JS. O modulo nativo
// Android (Kotlin + RemoteViews) vive em ./android e e linkado
// automaticamente pelo Expo Modules autolinking quando o app
// passa por prebuild. O config-plugin propriamente dito nao
// precisa modificar AndroidManifest do app (o receiver e o
// AppWidgetProvider ja vivem no AndroidManifest do modulo).
//
// Em ambientes sem prebuild (Expo Go puro, smoke web), o modulo
// e um no-op silencioso: a bridge JS detecta ausencia e curta
// (modules/widget-homescreen/src/index.ts).
//
// Comentarios sem acentuacao.
const withPlugins = require('@expo/config-plugins').withPlugins;

module.exports = function withWidgetHomescreen(config) {
  return withPlugins(config, []);
};
