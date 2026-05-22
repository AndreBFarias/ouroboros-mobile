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
// Sub-sprint A entrega: availability + permissions. Sub-sprints
// B (readRecords) e C (insertRecords) ficam para depois -- entre
// tanto, exportamos shims que rejeitam ate ficarem implementados,
// para que typings nao quebrem callers em sync.ts cedo demais.
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

// ---------- Native module loader ----------

interface NativeModuleShape {
  getSdkStatus(): Promise<number>;
  initialize(): Promise<boolean>;
  openHealthConnectSettings(): void;
  requestPermission(perms: Permission[]): Promise<Permission[]>;
  getGrantedPermissions(): Promise<Permission[]>;
  revokeAllPermissions(): Promise<void>;
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

const _default = {
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
  getGrantedPermissions,
  revokeAllPermissions,
};

export default _default;
