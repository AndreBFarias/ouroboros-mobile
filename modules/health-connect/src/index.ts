// Bridge JS -> Kotlin do modulo local ouroboros-health-connect.
// R-INT-3-HC-BRIDGE-NATIVA sub-sprint A.
//
// Substitui o pacote npm `react-native-health-connect@3.5.3` que esta
// pendurado em `connect-client:1.1.0-alpha11` (rejeitado como obsoleto
// pelo HC moderno). Aqui o modulo nativo vive em
// modules/health-connect/android/ usando connect-client:1.2.0-alpha04.
//
// A API exposta replica deliberadamente as assinaturas que
// src/lib/health/{availability,permissions,sync}.ts consumiam de
// react-native-health-connect, para que callers tenham mudanca minima
// (somente o require/import).
//
// Sub-sprint A entrega: availability + permissions. Sub-sprint B
// adicionou readRecords (Steps/ExerciseSession/Weight/BodyFat/
// HeartRate/SleepSession/MenstruationFlow). Sub-sprint C
// (insertRecords) fica para depois.
//
// Em ambiente sem suporte (Expo Go web, Jest, iOS), o modulo nativo
// e ausente: requireOptionalNativeModule devolve null e cada funcao
// vira no-op seguro. Sem Proxy issue como em react-native-health-connect
// (que lancava em qualquer acesso de propriedade).
//
// Comentarios sem acento (convencao shell/CI).

import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

// ---------- Tipos ----------

export type HealthSdkStatus = 'available' | 'needs_update' | 'unavailable';

export interface Permission {
  accessType: 'read' | 'write';
  recordType: string;
}

// Sub-sprint B: readRecords.
export interface TimeRangeFilterBetween {
  operator: 'between';
  startTime: string; // ISO 8601 com offset (ex: "2026-05-22T00:00:00-03:00")
  endTime: string;
}

export interface ReadRecordsOptions {
  timeRangeFilter: TimeRangeFilterBetween;
  ascendingOrder?: boolean;
  pageSize?: number;
  pageToken?: string;
}

// Shape do record retornado depende do recordType. O Kotlin emite chaves
// canonicas (startTime, endTime, count, weight.inKilograms etc); caller
// JS faz o cast pro shape esperado conforme tipo solicitado.
export interface ReadRecordsResult {
  records: Array<Record<string, unknown>>;
  pageToken?: string;
}

// ---------- Native module loader ----------

interface NativeModuleShape {
  getSdkStatus(): Promise<number>;
  initialize(): Promise<boolean>;
  openHealthConnectSettings(): void;
  requestPermission(perms: Permission[]): Promise<Permission[]>;
  getGrantedPermissions(): Promise<Permission[]>;
  revokeAllPermissions(): Promise<void>;
  readRecords(
    recordType: string,
    options: ReadRecordsOptions
  ): Promise<ReadRecordsResult>;
}

function getNative(): NativeModuleShape | null {
  if (Platform.OS !== 'android') return null;
  // requireOptionalNativeModule devolve null em vez de lancar em Expo Go
  // ou ambiente sem prebuild. Sem Proxy lancante, sem necessidade de
  // Reflect.get defensivo como em react-native-health-connect@3.5.0.
  return requireOptionalNativeModule<NativeModuleShape>(
    'OuroborosHealthConnect'
  );
}

// ---------- Availability ----------

// Retorna o codigo bruto do SDK (1=available, 2=unavailable,
// 3=needs_update). Em ambiente sem modulo nativo, retorna 2
// (SDK_UNAVAILABLE) para o caller mapear como 'unavailable'.
export async function getSdkStatus(): Promise<number> {
  const native = getNative();
  if (!native) return 2;
  try {
    return await native.getSdkStatus();
  } catch {
    return 2;
  }
}

// Inicializa o cliente HC. Idempotente. Retorna false em ambiente sem
// suporte ou se a inicializacao do client lancou.
export async function initialize(): Promise<boolean> {
  const native = getNative();
  if (!native) return false;
  try {
    return await native.initialize();
  } catch {
    return false;
  }
}

// Abre a tela nativa de configuracoes do Health Connect. No-op em
// ambiente sem suporte (intent action nao existe). Sincrono pois o
// caller upstream em src/lib/health/availability.ts e' sync.
export function openHealthConnectSettings(): void {
  const native = getNative();
  if (!native) return;
  try {
    native.openHealthConnectSettings();
  } catch {
    // Sem fallback: usuario pode procurar manualmente em Configuracoes
    // do Android.
  }
}

// ---------- Permissions ----------

// Solicita as permissions ao HC. Em ambiente sem modulo nativo,
// retorna [] (no-op). Em Android com HC disponivel, abre dialog e
// devolve subset concedido pelo usuario.
export async function requestPermission(
  perms: Permission[]
): Promise<Permission[]> {
  const native = getNative();
  if (!native) return [];
  try {
    const granted = await native.requestPermission(perms);
    return Array.isArray(granted) ? granted : [];
  } catch {
    return [];
  }
}

// Lista permissions atualmente concedidas pelo usuario. Util para a
// UI mostrar estado "Conectado: N tipos" vs "Desconectado".
export async function getGrantedPermissions(): Promise<Permission[]> {
  const native = getNative();
  if (!native) return [];
  try {
    const granted = await native.getGrantedPermissions();
    return Array.isArray(granted) ? granted : [];
  } catch {
    return [];
  }
}

// Revoga TODAS as permissions concedidas. No Android 14+ a revogacao
// efetiva acontece no proximo restart do app (limitacao do sistema).
export async function revokeAllPermissions(): Promise<void> {
  const native = getNative();
  if (!native) return;
  try {
    await native.revokeAllPermissions();
  } catch {
    // Sem fallback: usuario pode revogar manualmente em Settings do HC.
  }
}

// ---------- Records ----------

// Le records do HC dentro do timeRangeFilter. Em ambiente sem modulo
// nativo (Expo Go web, iOS, Jest), retorna { records: [] } no-op para
// nao quebrar callers em sync.ts / autopull.
//
// Shape dos records depende do recordType solicitado:
//   - Steps:            { startTime, endTime, count, metadata }
//   - ExerciseSession:  { startTime, endTime, title?, exerciseType,
//                         notes?, metadata }
//   - Weight:           { time, weight: { inKilograms }, metadata }
//   - BodyFat:          { time, percentage, metadata }
//   - HeartRate:        { startTime, endTime, samples: [{time,
//                         beatsPerMinute}], metadata }
//   - SleepSession:     { startTime, endTime, title?, notes?,
//                         stages: [{startTime, endTime, stage}], metadata }
//   - MenstruationFlow: { time, flow: number (1=light, 2=medium,
//                         3=heavy), metadata }
//
// metadata sempre tem { id, dataOrigin: {packageName}, lastModifiedTime }.
export async function readRecords(
  recordType: string,
  options: ReadRecordsOptions
): Promise<ReadRecordsResult> {
  const native = getNative();
  if (!native) return { records: [] };
  try {
    const result = await native.readRecords(recordType, options);
    return {
      records: Array.isArray(result?.records) ? result.records : [],
      pageToken: result?.pageToken,
    };
  } catch {
    return { records: [] };
  }
}

const _default = {
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
  getGrantedPermissions,
  revokeAllPermissions,
  readRecords,
};

export default _default;
