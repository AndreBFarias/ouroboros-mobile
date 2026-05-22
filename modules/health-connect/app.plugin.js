// Config plugin entrypoint do modulo health-connect (R-INT-3-HC-BRIDGE-NATIVA
// sub-sprint A, 2026-05-22).
//
// R-INT-3-HC-EMPIRICAL-FINDINGS (2026-05-22): decompile de Tuya
// (com.tuya.smart) e Claude (com.anthropic.claude) revelou que ambos
// declaram um <activity-alias android:name="...ViewPermissionUsageActivity">
// com permission START_VIEW_PERMISSION_USAGE + intent VIEW_PERMISSION_USAGE
// + category HEALTH_PERMISSIONS. Esse alias e o que registra o app como
// HC-aware pro provider moderno (com.google.android.apps.healthdata
// >= 2026.04.16.00.release). Sem ele, getSdkStatus() retorna 3
// (PROVIDER_UPDATE_REQUIRED) mesmo com SDK androidx valido.
//
// Este plugin injeta o activity-alias no AndroidManifest gerado pelo
// Expo prebuild, apontando para MainActivity (que ja tem o intent-filter
// ACTION_SHOW_PERMISSIONS_RATIONALE provisionado pelo plugin
// react-native-health-connect existente).
//
// Comentarios sem acentuacao.
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const ALIAS_NAME = 'com.ouroboros.healthconnect.ViewPermissionUsageActivity';
const TARGET_ACTIVITY = '.MainActivity';
const PERMISSION = 'android.permission.START_VIEW_PERMISSION_USAGE';
const ACTION = 'android.intent.action.VIEW_PERMISSION_USAGE';
const CATEGORY = 'android.intent.category.HEALTH_PERMISSIONS';

function withHealthConnectViewPermissionAlias(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      modConfig.modResults
    );

    application['activity-alias'] = application['activity-alias'] || [];

    const existingIndex = application['activity-alias'].findIndex(
      (a) => a.$ && a.$['android:name'] === ALIAS_NAME
    );

    const aliasEntry = {
      $: {
        'android:name': ALIAS_NAME,
        'android:exported': 'true',
        'android:permission': PERMISSION,
        'android:targetActivity': TARGET_ACTIVITY,
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': ACTION } }],
          category: [{ $: { 'android:name': CATEGORY } }],
        },
      ],
    };

    if (existingIndex >= 0) {
      application['activity-alias'][existingIndex] = aliasEntry;
    } else {
      application['activity-alias'].push(aliasEntry);
    }

    return modConfig;
  });
}

module.exports = function withHealthConnect(config) {
  return withHealthConnectViewPermissionAlias(config);
};
