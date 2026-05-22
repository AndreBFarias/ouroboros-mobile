// Config plugin entrypoint do modulo health-connect (R-INT-3-HC-BRIDGE-NATIVA
// sub-sprint A, 2026-05-22).
//
// R-INT-3-HC-EMPIRICAL-FINDINGS (2026-05-22): decompile de Tuya e Claude
// revelou estrutura canonica HC-aware para apps Android:
//
//   1) Activity dedicada PermissionsRationaleActivity com APENAS
//      intent-filter androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE
//      (sem outros filters de launcher/deep link). Implementacao:
//      com.ouroboros.healthconnect.PermissionsRationaleActivity (Kotlin).
//
//   2) Activity-alias ViewPermissionUsageActivity com permission
//      START_VIEW_PERMISSION_USAGE + intent VIEW_PERMISSION_USAGE +
//      category HEALTH_PERMISSIONS, apontando para (1).
//
//   3) Remover o intent-filter ACTION_SHOW_PERMISSIONS_RATIONALE da
//      MainActivity (deixado pelo plugin react-native-health-connect
//      antigo). Mantelo apenas em (1).
//
// Sem essa estrutura completa, HC moderno (provider 2026.04.16.00.release)
// retorna getSdkStatus() = 3 (PROVIDER_UPDATE_REQUIRED) permanentemente.
//
// Comentarios sem acentuacao.
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const RATIONALE_ACTIVITY = 'com.ouroboros.healthconnect.PermissionsRationaleActivity';
const ALIAS_NAME = 'com.ouroboros.healthconnect.ViewPermissionUsageActivity';
const RATIONALE_ACTION = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const VIEW_PERMISSION_ACTION = 'android.intent.action.VIEW_PERMISSION_USAGE';
const HEALTH_CATEGORY = 'android.intent.category.HEALTH_PERMISSIONS';
const START_VIEW_PERMISSION = 'android.permission.START_VIEW_PERMISSION_USAGE';

function withHealthConnectActivities(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      modConfig.modResults
    );

    // 1. Remover intent-filter ACTION_SHOW_PERMISSIONS_RATIONALE da MainActivity
    // (plugin react-native-health-connect injetou la). Esse filter agora vive
    // exclusivamente na PermissionsRationaleActivity dedicada.
    if (Array.isArray(application.activity)) {
      for (const act of application.activity) {
        if (!Array.isArray(act['intent-filter'])) continue;
        act['intent-filter'] = act['intent-filter'].filter((filter) => {
          if (!Array.isArray(filter.action)) return true;
          const isRationaleOnly =
            filter.action.length === 1 &&
            filter.action[0].$ &&
            filter.action[0].$['android:name'] === RATIONALE_ACTION;
          return !isRationaleOnly;
        });
      }
    }

    // 2. Adicionar (ou substituir) PermissionsRationaleActivity dedicada.
    application.activity = application.activity || [];
    const ratIdx = application.activity.findIndex(
      (a) => a.$ && a.$['android:name'] === RATIONALE_ACTIVITY
    );
    const ratEntry = {
      $: {
        'android:name': RATIONALE_ACTIVITY,
        'android:exported': 'true',
        'android:theme': '@android:style/Theme.NoDisplay',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': RATIONALE_ACTION } }],
        },
      ],
    };
    if (ratIdx >= 0) {
      application.activity[ratIdx] = ratEntry;
    } else {
      application.activity.push(ratEntry);
    }

    // 3. Adicionar (ou substituir) activity-alias apontando para a activity dedicada.
    application['activity-alias'] = application['activity-alias'] || [];
    const aliasIdx = application['activity-alias'].findIndex(
      (a) => a.$ && a.$['android:name'] === ALIAS_NAME
    );
    const aliasEntry = {
      $: {
        'android:name': ALIAS_NAME,
        'android:exported': 'true',
        'android:permission': START_VIEW_PERMISSION,
        'android:targetActivity': RATIONALE_ACTIVITY,
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': VIEW_PERMISSION_ACTION } }],
          category: [{ $: { 'android:name': HEALTH_CATEGORY } }],
        },
      ],
    };
    if (aliasIdx >= 0) {
      application['activity-alias'][aliasIdx] = aliasEntry;
    } else {
      application['activity-alias'].push(aliasEntry);
    }

    return modConfig;
  });
}

module.exports = function withHealthConnect(config) {
  return withHealthConnectActivities(config);
};
