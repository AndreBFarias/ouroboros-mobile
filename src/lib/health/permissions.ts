// Mapeamento de permissions canonicas do Ouroboros para Permission
// do `react-native-health-connect`. Q17.a (Onda Q, 2026-05-13).
//
// Tipos cobertos nesta sprint (vide spec docs/sprints/Q17-...):
//   Steps (read)
//   ExerciseSession (read + write)
//   Weight (read + write)
//   BodyFat (read + write)
//   HeartRate (read)
//   SleepSession (read)
//   MenstruationFlow (read + write)
//
// Lazy require do modulo nativo: em ambiente sem suporte (Expo Go,
// web, jest), as funcoes retornam listas vazias / no-op sem crashar.
//
// Comentarios sem acento (convencao shell/CI).

interface PermissionItem {
  accessType: 'read' | 'write';
  recordType: string;
}

interface HealthConnectModule {
  requestPermission: (perms: PermissionItem[]) => Promise<PermissionItem[]>;
  getGrantedPermissions: () => Promise<PermissionItem[]>;
  revokeAllPermissions: () => Promise<unknown>;
}

function carregarModulo(): HealthConnectModule | null {
  try {
    const mod =
      require('react-native-health-connect') as Partial<HealthConnectModule>;
    if (
      typeof mod.requestPermission !== 'function' ||
      typeof mod.getGrantedPermissions !== 'function'
    ) {
      return null;
    }
    return mod as HealthConnectModule;
  } catch {
    return null;
  }
}

// Lista canonica das permissions que pedimos no flow padrao da v1
// (Q17.a). Pessoa pode aceitar tudo ou subset; o app trabalha com o
// que tiver. Sub-sprints Q17.b/c/d expandem essa lista.
export const PERMISSOES_CANONICAS: PermissionItem[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'write', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'Weight' },
  { accessType: 'read', recordType: 'BodyFat' },
  { accessType: 'write', recordType: 'BodyFat' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'MenstruationFlow' },
  { accessType: 'write', recordType: 'MenstruationFlow' },
];

// Solicita ao sistema permissions canonicas. Retorna a lista do que
// o usuario realmente concedeu (pode ser subset). Em ambiente sem
// suporte, retorna [] sem crashar.
export async function solicitarPermissoesCanonicas(): Promise<
  PermissionItem[]
> {
  const mod = carregarModulo();
  if (!mod) return [];
  try {
    const grant = await mod.requestPermission(PERMISSOES_CANONICAS);
    return grant.filter(
      (p): p is PermissionItem =>
        typeof p === 'object' &&
        p !== null &&
        'accessType' in p &&
        'recordType' in p
    );
  } catch {
    return [];
  }
}

// Lista permissions atualmente concedidas. Util para a UI mostrar
// estado "Conectado: 3 tipos" vs "Desconectado".
export async function listarPermissoesConcedidas(): Promise<PermissionItem[]> {
  const mod = carregarModulo();
  if (!mod) return [];
  try {
    const ativas = await mod.getGrantedPermissions();
    return ativas.filter(
      (p): p is PermissionItem =>
        typeof p === 'object' &&
        p !== null &&
        'accessType' in p &&
        'recordType' in p
    );
  } catch {
    return [];
  }
}

// Revoga todas as permissions. No Android 14+ a revogacao acontece
// no proximo restart do app (limitacao do sistema, nao nossa).
export async function revogarTodas(): Promise<void> {
  const mod = carregarModulo();
  if (!mod) return;
  try {
    await mod.revokeAllPermissions();
  } catch {
    // Sem fallback: usuario pode revogar manualmente em Settings.
  }
}

export type { PermissionItem };
