// Helpers de permissao e inicializacao do Vault.
//
// Camada nova (M22): inicializarVaultCanonico() cria a estrutura
// completa em /sdcard/Documents/Ouroboros/ na primeira execucao.
// Pede permissao de armazenamento sem SAF (PermissionsAndroid em
// Android <11; Intent MANAGE_EXTERNAL_STORAGE em Android >=11).
// Probe write+read+delete e a unica fonte de verdade sobre permissao
// funcional (vide armadilha A19 no VALIDATOR_BRIEF.md).
//
// Camada legada (mantida): requestVaultPermission() ainda existe para
// servir como fallback SAF quando o probe falha em OEMs agressivos
// (MIUI, OneUI etc.). M23 cuidara de remover o uso direto no
// onboarding; aqui o helper segue como recurso ultimo.
//
// Armadilha A2: Android 13+ exige requestDirectoryPermissionsAsync;
// pedidos so podem partir de gesto do usuario (botao na tela 01).
//
// O API legacy do expo-file-system continua sendo o canal
// suportado para SAF na SDK 54 (entry point: 'expo-file-system/legacy').
//
// No web (Chrome desktop, validacao via MCP de browser), SAF e
// SecureStore nao existem. Usamos localStorage como fallback para
// permitir testar fluxos JS sem conflito com celular fisico.
import { PermissionsAndroid, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT_KEY = 'ouroboros.vault.root.v1';
// Avaliado por chamada (nao na carga do modulo) para que testes possam
// trocar Platform.OS via Object.defineProperty entre suites sem precisar
// reimportar o modulo. Em runtime real Platform.OS e constante.
function isWeb(): boolean {
  return Platform.OS === 'web';
}

// Path canonico do Vault no Android. ADR-0016: pasta visivel em
// qualquer file manager, facil de pareear no Syncthing externo.
const VAULT_PATH = '/sdcard/Documents/Ouroboros/';
const VAULT_URI = `file://${VAULT_PATH}`;
const PROBE_FILENAME = '.ouroboros-probe';
const ANDROID_PACKAGE = 'com.ouroboros.mobile';

// Subpastas canonicas criadas pela inicializacao. Sao 19 leaves: o
// mkdir recursivo cria automaticamente os intermediarios (inbox/,
// inbox/mente/, .ouroboros/ etc.). Lista alinhada com ADR-0016 e
// VAULT_FOLDERS legado em paths.ts.
export const SUBPASTAS_CANONICAS: readonly string[] = [
  'daily',
  'eventos',
  'marcos',
  'treinos',
  'exercicios',
  'medidas',
  'alarmes',
  'tarefas',
  'contadores',
  'inbox/mente/diario',
  'inbox/saude/ciclo',
  'inbox/arquivos',
  'media/fotos',
  'media/audios',
  'media/videos',
  'media/frases',
  'media/avatares',
  'media/scanner',
  '.ouroboros/cache',
] as const;

async function readKey(name: string): Promise<string | null> {
  if (isWeb()) {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(name);
  }
  return (await SecureStore.getItemAsync(name)) ?? null;
}

async function writeKey(name: string, value: string): Promise<void> {
  if (isWeb()) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(name, value);
    return;
  }
  await SecureStore.setItemAsync(name, value);
}

async function deleteKey(name: string): Promise<void> {
  if (isWeb()) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(name);
    return;
  }
  await SecureStore.deleteItemAsync(name);
}

// Fluxo de pedido de permissao de armazenamento. NAO usa o resultado
// como fonte de verdade; apenas dispara a UI de pedido. O probe
// posterior diz se o write funciona de fato (vide A19).
//
// Android <11 (API <30): WRITE_EXTERNAL_STORAGE via PermissionsAndroid.
// Android >=11 (API >=30): Intent MANAGE_EXTERNAL_STORAGE leva o
// usuario direto para a tela de configuracao do app no sistema.
export async function pedirPermissaoStorage(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const apiLevel =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10) || 0;
  if (apiLevel >= 30) {
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
        { data: `package:${ANDROID_PACKAGE}` }
      );
    } catch {
      // Se a Intent falhar, segue: o probe vai detectar.
    }
    return;
  }
  try {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
  } catch {
    // Mesmo padrao: probe e fonte de verdade.
  }
}

// Garante recursivamente todas as subpastas canonicas. Idempotente:
// makeDirectoryAsync com intermediates: true nao falha quando a pasta
// ja existe; capturamos qualquer erro residual em silencio para
// permitir auto-cura em saves subsequentes (Syncthing pode apagar).
export async function garantirSubpastas(vaultRoot: string): Promise<void> {
  if (isWeb()) return;
  const base = vaultRoot.endsWith('/') ? vaultRoot : `${vaultRoot}/`;
  for (const sub of SUBPASTAS_CANONICAS) {
    const uri = `${base}${sub}`;
    try {
      await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
    } catch {
      // Pasta ja existe ou backend rejeitou: probe posterior decide.
    }
  }
}

// Probe write+read+delete. Unica fonte de verdade sobre permissao
// funcional (vide A19). Falha silenciosa se qualquer passo cair.
async function probeVaultWritable(vaultRoot: string): Promise<boolean> {
  const base = vaultRoot.endsWith('/') ? vaultRoot : `${vaultRoot}/`;
  const probe = `${base}${PROBE_FILENAME}`;
  try {
    await FileSystem.writeAsStringAsync(probe, 'ok');
    const back = await FileSystem.readAsStringAsync(probe);
    await FileSystem.deleteAsync(probe, { idempotent: true });
    return back === 'ok';
  } catch {
    return false;
  }
}

export type ModoInicializacao = 'auto' | 'saf-fallback' | 'web';

export interface ResultadoInicializacao {
  vaultRoot: string;
  criado: boolean;
  modo: ModoInicializacao;
}

// Inicializa o Vault canonico. Cria estrutura, persiste vaultRoot no
// store global. Em caso de probe falhar (OEM agressivo bloqueando
// write em /sdcard/Documents/), cai em SAF interativo via
// requestVaultPermission(). Em web e no-op produtivo: apenas devolve
// um URI mock para manter Tela 01 e seeds rodando no Chrome.
export async function inicializarVaultCanonico(): Promise<ResultadoInicializacao> {
  if (isWeb()) {
    const mockUri = 'web://mock-vault/Protocolo-Ouroboros';
    await writeKey(VAULT_ROOT_KEY, mockUri);
    useVault.getState().setVaultRoot(mockUri);
    return { vaultRoot: mockUri, criado: false, modo: 'web' };
  }
  await pedirPermissaoStorage();
  await garantirSubpastas(VAULT_URI);
  const writable = await probeVaultWritable(VAULT_URI);
  if (!writable) {
    // Armadilha A19: scoped storage ou OEM bloqueou write mesmo com
    // permissao concedida via Intent. Cai em SAF interativo: usuario
    // escolhe a pasta uma vez e o app aceita o URI SAF retornado.
    const safUri = await requestVaultPermission();
    if (!safUri) {
      throw new Error(
        'storage permission denied (saf fallback also denied)'
      );
    }
    await garantirSubpastas(safUri);
    await writeKey(VAULT_ROOT_KEY, safUri);
    useVault.getState().setVaultRoot(safUri);
    return { vaultRoot: safUri, criado: true, modo: 'saf-fallback' };
  }
  await writeKey(VAULT_ROOT_KEY, VAULT_URI);
  useVault.getState().setVaultRoot(VAULT_URI);
  return { vaultRoot: VAULT_URI, criado: true, modo: 'auto' };
}

// Pede permissao SAF e retorna URI da pasta selecionada, ou null se
// o usuario cancelar. Persiste o URI. No web devolve URI mock para
// permitir validacao visual do app sem precisar de SAF.
//
// TODO M23 remove after onboarding (usado apenas como fallback SAF).
export async function requestVaultPermission(): Promise<string | null> {
  if (isWeb()) {
    const mockUri = 'web://mock-vault/Protocolo-Ouroboros';
    await writeKey(VAULT_ROOT_KEY, mockUri);
    return mockUri;
  }
  const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!result.granted) {
    return null;
  }
  const uri = result.directoryUri;
  await writeKey(VAULT_ROOT_KEY, uri);
  return uri;
}

// Le o URI persistido. Retorna null se nunca foi concedido ou foi limpo.
export async function loadVaultRoot(): Promise<string | null> {
  return await readKey(VAULT_ROOT_KEY);
}

// Limpa o URI persistido (usado em logout / reset).
export async function clearVaultRootStorage(): Promise<void> {
  await deleteKey(VAULT_ROOT_KEY);
}

export const VAULT_ROOT_STORAGE_KEY = VAULT_ROOT_KEY;
export const VAULT_CANONICO_PATH = VAULT_PATH;
export const VAULT_CANONICO_URI = VAULT_URI;
