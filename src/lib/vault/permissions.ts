// Helpers de permissao e inicializacao do Vault.
//
// H3 (M-VAULT-PASTA-NAO-HARDCODED, ADR-0022): a pasta deixa de ser
// hardcoded. O onboarding pergunta ao usuario, oferecendo uma sugestao
// default (/sdcard/Documents/Ouroboros/) ou um SAF picker para escolha
// manual. Em ambos os casos o caller ja chega aqui com a URI definida
// e chama inicializarVaultEscolhido(uri). Esta funcao apenas cria a
// estrutura canonica (8 subpastas via H2) e persiste o vaultRoot.
//
// Camada legada (mantida): requestVaultPermission() ainda existe para
// disparar o SAF picker; pedirPermissaoStorageDefault() ainda existe
// para pedir permissao de armazenamento na pasta sugerida default.
//
// Armadilha A2: Android 13+ exige requestDirectoryPermissionsAsync;
// pedidos so podem partir de gesto do usuario (botao na tela do
// onboarding).
//
// Armadilha A19: scoped storage Android 11+ + OEMs agressivos podem
// negar write em /sdcard/Documents/<app>/ mesmo com permissao
// concedida. Probe write+read+delete e a unica fonte de verdade. Se o
// probe falha na pasta sugerida default, lancamos erro claro e o
// caller cai em fluxo de SAF picker (decisao do usuario).
//
// Armadilha A29: trailing space e percent-encoding ofensivo no URI
// SAF retornado por OEMs MIUI/OneUI/HyperOS. Tudo passa por
// vaultUriJoin (H1) que ja saneia.
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
import { vaultUriJoin } from './paths';

const VAULT_ROOT_KEY = 'ouroboros.vault.root.v1';
// Avaliado por chamada (nao na carga do modulo) para que testes possam
// trocar Platform.OS via Object.defineProperty entre suites sem precisar
// reimportar o modulo. Em runtime real Platform.OS e constante.
function isWeb(): boolean {
  return Platform.OS === 'web';
}

// Sugestao default de pasta para o Vault no Android. Visivel em
// qualquer file manager, facil de pareear no Syncthing externo. NAO e
// hardcode: o usuario pode escolher outra via SAF picker no
// onboarding (ADR-0022). Mantida como funcao para nao virar constante
// global de modulo (impede testes de monkeypatch, mantem clareza de
// intencao: e uma sugestao, nao a verdade).
const SUGESTAO_VAULT_PATH = '/sdcard/Documents/Ouroboros/';
const SUGESTAO_VAULT_URI = `file://${SUGESTAO_VAULT_PATH}`;
const PROBE_FILENAME = '.ouroboros-probe';
const ANDROID_PACKAGE = 'com.ouroboros.mobile';

// Retorna a sugestao default de path para a pasta do Vault. NAO
// implica que o vault esta nesse path; e apenas o que o onboarding
// oferece como atalho. ADR-0022.
export function sugestaoVaultPathDefault(): string {
  return SUGESTAO_VAULT_PATH;
}

// Retorna a sugestao default ja em forma de URI file://. Usado pelo
// caminho "Usar essa" do onboarding e pela sub-tela de Settings.
export function sugestaoVaultUriDefault(): string {
  return SUGESTAO_VAULT_URI;
}

// Subpastas canonicas criadas pela inicializacao (H2 layout-por-tipo,
// ADR-0023). 8 leaves: o mkdir recursivo cria automaticamente os
// intermediarios (.ouroboros/). Alinhada com VAULT_FOLDERS em paths.ts.
//
// Layout-por-tipo: todos os .md vivem em markdown/, binarios em
// pastas por extensao (png/, jpg/, m4a/, mp4/, pdf/, gif/), cache
// preservado em .ouroboros/cache (excecao ADR-0019).
export const SUBPASTAS_CANONICAS: readonly string[] = [
  'markdown',
  'png',
  'jpg',
  'm4a',
  'mp4',
  'pdf',
  'gif',
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
//
// H3: usa vaultUriJoin (H1) para evitar trailing space + barras
// duplas + percent-encoding ofensivo (A29) que vinha contaminando
// saves em OEMs MIUI/OneUI/HyperOS.
export async function garantirSubpastas(vaultRoot: string): Promise<void> {
  if (isWeb()) return;
  for (const sub of SUBPASTAS_CANONICAS) {
    const uri = vaultUriJoin(vaultRoot, sub);
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
  const probe = vaultUriJoin(vaultRoot, PROBE_FILENAME);
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

// Inicializa o Vault na URI escolhida pelo usuario (H3, ADR-0022). O
// caller (onboarding ou Settings) ja decidiu onde salvar via
// sugestao default ou SAF picker; aqui apenas:
//   1. Cria a estrutura canonica de 8 subpastas (H2).
//   2. Roda probe write+read+delete para confirmar permissao real
//      (A19).
//   3. Persiste o vaultRoot no store global.
//
// Em web e no-op produtivo: apenas devolve um URI mock para manter
// Tela 01 e seeds rodando no Chrome.
//
// Lanca erro descritivo se uri vazia (sinal de bug do caller) ou se
// o probe falhar (caller exibe toast e oferece outra opcao).
export async function inicializarVaultEscolhido(
  uri: string
): Promise<ResultadoInicializacao> {
  if (isWeb()) {
    const mockUri = 'web://mock-vault/Protocolo-Ouroboros';
    await writeKey(VAULT_ROOT_KEY, mockUri);
    useVault.getState().setVaultRoot(mockUri);
    return { vaultRoot: mockUri, criado: false, modo: 'web' };
  }
  const trimmed = uri.trim();
  if (!trimmed) {
    throw new Error('inicializarVaultEscolhido: uri vazia');
  }
  await garantirSubpastas(trimmed);
  const writable = await probeVaultWritable(trimmed);
  if (!writable) {
    throw new Error(
      'storage permission denied (probe write failed na pasta escolhida)'
    );
  }
  // Detecta se a URI veio do SAF picker (content://) ou de uma pasta
  // file:// concedida via MANAGE_EXTERNAL_STORAGE. So afeta o telemetry
  // do retorno (modo); pode ser util para o caller decidir copy/UX.
  const modo: ModoInicializacao = trimmed.startsWith('content://')
    ? 'saf-fallback'
    : 'auto';
  await writeKey(VAULT_ROOT_KEY, trimmed);
  useVault.getState().setVaultRoot(trimmed);
  return { vaultRoot: trimmed, criado: true, modo };
}

// Pede permissao SAF e retorna URI da pasta selecionada, ou null se
// o usuario cancelar. Persiste o URI. No web devolve URI mock para
// permitir validacao visual do app sem precisar de SAF.
//
// H3: o caller (onboarding "Outra pasta" ou Settings "Trocar pasta")
// e responsavel por chamar inicializarVaultEscolhido(uri) em seguida.
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
