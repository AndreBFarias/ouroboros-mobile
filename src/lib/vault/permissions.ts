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
//
// V4.0.2 (2026-05-08): SAF picker passa a resolver tree URIs em
// armazenamento primario (/sdcard) para file:// equivalente, de
// forma que toda a camada de save (que sempre assumiu file://)
// continue funcionando uniformemente. Combinado com
// MANAGE_EXTERNAL_STORAGE concedido, o usuario pode escolher
// QUALQUER pasta sob /sdcard via picker SAF mas o app escreve
// como file:// (sem URIs malformados de string-concat). Tambem
// trata trailing space em nome de pasta (Syncthing/MIUI) renomeando
// silenciosamente a pasta antes de inicializar.
import { AppState, PermissionsAndroid, Platform } from 'react-native';
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
// V4.0.2 (2026-05-09): default agora computa dinamicamente como
// FileSystem.documentDirectory + 'Ouroboros/'. expo-file-system bloqueia
// writes em /sdcard/ raiz mesmo com MANAGE_EXTERNAL_STORAGE granted
// (FilePermissionModule restringe writes a filesDir, cacheDir e
// external app dir). documentDirectory sempre gravavel, sem
// permissao especial. Trade-off: outros apps (Obsidian/Syncthing)
// nao acessam diretamente — usuario que precisar dessa integracao
// usa "Outra pasta" via SAF picker para escolher /sdcard/X visivel.
//
// Computado por chamada porque FileSystem.documentDirectory pode ser
// null em testes/web e a chamada precisa happenar runtime.
const PROBE_FILENAME = '.ouroboros-probe';
const ANDROID_PACKAGE = 'com.ouroboros.mobile';

// Retorna a sugestao default de path para a pasta do Vault. NAO
// implica que o vault esta nesse path; e apenas o que o onboarding
// oferece como atalho. ADR-0022.
//
// V4.0.2: computado dinamicamente via FileSystem.documentDirectory
// porque expo-file-system bloqueia writes em /sdcard/ raiz.
export function sugestaoVaultPathDefault(): string {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return '/data/user/0/com.ouroboros.mobile/files/Ouroboros/';
  // documentDirectory ja vem com 'file://' prefix; strip para path.
  const path = docDir.replace(/^file:\/\//, '');
  return `${path}Ouroboros/`;
}

// Retorna a sugestao default ja em forma de URI file://. Usado pelo
// caminho "Usar essa" do onboarding e pela sub-tela de Settings.
export function sugestaoVaultUriDefault(): string {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return 'file:///data/user/0/com.ouroboros.mobile/files/Ouroboros/';
  return `${docDir}Ouroboros/`;
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

// Probe rapido de MANAGE_EXTERNAL_STORAGE: tenta escrever um arquivo
// efemero em /sdcard/Documents/. Se sucesso, permissao esta ativa
// (Android 11+) ou WRITE_EXTERNAL_STORAGE concedido (Android <11).
// Idempotente, deleta o probe ao final.
async function probeManagePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // V4.0.2: probe no app's external files dir, que sempre e gravavel
  // independente de MANAGE_EXTERNAL_STORAGE. Para vault em /sdcard/
  // arbitrario o caller precisa usar SAF picker explicitamente.
  const baseDir = FileSystem.documentDirectory ?? 'file:///sdcard/';
  const probeUri = `${baseDir}.ouroboros-permcheck-${Date.now()}`;
  try {
    await FileSystem.writeAsStringAsync(probeUri, 'ok');
    await FileSystem.deleteAsync(probeUri, { idempotent: true });
    return true;
  } catch {
    return false;
  }
}

// Espera AppState voltar para 'active' (usuario retornou da tela de
// configuracoes). Resolve com true quando volta, false em timeout.
function waitForAppForeground(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (AppState.currentState === 'active') {
      resolve(true);
      return;
    }
    let resolved = false;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !resolved) {
        resolved = true;
        sub.remove();
        resolve(true);
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        sub.remove();
        resolve(false);
      }
    }, timeoutMs);
  });
}

// Fluxo de pedido de permissao de armazenamento. Diferente da versao
// pre-V4.0.2: agora ESPERA o usuario retornar da tela de configuracoes
// e re-probea ate confirmar grant ou esgotar timeout. Resolve com true
// se permissao concedida, false caso contrario. Caller deve mostrar
// toast acionavel se false.
//
// Android <11 (API <30): WRITE_EXTERNAL_STORAGE via PermissionsAndroid.
// Android >=11 (API >=30): Intent MANAGE_EXTERNAL_STORAGE leva o
// usuario para tela de configuracao; AppState detecta retorno; probe
// confirma grant.
export async function pedirPermissaoStorage(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  // Caminho rapido: ja concedida.
  if (await probeManagePermission()) return true;
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
      // Intent falhou; sem caminho de fallback util.
      return false;
    }
    // Usuario foi para configuracoes. Espera retorno + retry probe.
    await waitForAppForeground(60_000);
    // Backoff curto para o sistema atualizar appops.
    for (let i = 0; i < 5; i++) {
      if (await probeManagePermission()) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }
  // Android <11: pedido convencional bloqueante.
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

// Converte um SAF tree URI em armazenamento primario (/sdcard) para
// file:// equivalente. Retorna null se o URI nao for resolvivel para
// file:// (cartao SD externo, USB, etc) — caller deve mostrar erro.
//
// Formato SAF tree URI:
//   content://com.android.externalstorage.documents/tree/<volume>%3A<path>
// onde:
//   <volume> = 'primary' (armazenamento principal) ou UUID (cartao SD)
//   <path> = caminho relativo url-encoded (espacos = %20)
//
// V4.0.2: app monta toda a logica em cima de file:// + MANAGE
// permission, evitando os problemas estruturais de SAF (URIs
// malformadas em concat, createFileAsync obrigatorio para writes).
export function safTreeUriToFileUri(treeUri: string): string | null {
  const PREFIX = 'content://com.android.externalstorage.documents/tree/';
  if (!treeUri.startsWith(PREFIX)) return null;
  const treePart = treeUri.substring(PREFIX.length);
  let decoded: string;
  try {
    decoded = decodeURIComponent(treePart);
  } catch {
    return null;
  }
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return null;
  const volume = decoded.substring(0, colonIdx);
  const relPath = decoded.substring(colonIdx + 1);
  if (volume !== 'primary') {
    // Cartao SD ou USB — nao suportado nesta fase.
    return null;
  }
  // Encode path para URI (espacos viram %20) mas preservando '/' e
  // evitando dupla codificacao. Vamos componenetizar e re-encodar.
  const segs = relPath.split('/').map((s) => encodeURIComponent(s));
  const encodedPath = segs.join('/');
  return `file:///sdcard/${encodedPath}`;
}

// Detecta se o nome final da pasta tem trailing space (artefato MIUI/
// HyperOS/Syncthing) e renomeia para versao limpa. Retorna o URI
// final (renomeado se aplicavel, original caso contrario). Idempotente.
export async function sanearTrailingSpaceFolder(
  fileUri: string
): Promise<string> {
  if (!fileUri.startsWith('file://')) return fileUri;
  // Remove trailing slashes.
  const noTrail = fileUri.replace(/\/+$/, '');
  // decodifica para detectar espaco no nome real.
  let decoded: string;
  try {
    decoded = decodeURIComponent(noTrail);
  } catch {
    return fileUri;
  }
  // Procura ultimo segmento.
  const lastSlash = decoded.lastIndexOf('/');
  if (lastSlash === -1) return fileUri;
  const parent = decoded.substring(0, lastSlash);
  const folderName = decoded.substring(lastSlash + 1);
  if (!/\s$/.test(folderName)) return fileUri;
  const cleanName = folderName.replace(/\s+$/, '');
  if (cleanName === folderName || cleanName.length === 0) return fileUri;
  const cleanFileUri = `file://${parent}/${encodeURIComponent(cleanName)}`;
  // Tenta renomear via moveAsync. Se destino ja existe, mantem o
  // original (usuario tem 2 pastas: uma com espaco, outra sem; nao
  // mexemos para nao perder dado).
  try {
    const cleanInfo = await FileSystem.getInfoAsync(cleanFileUri);
    if (cleanInfo.exists) return fileUri;
  } catch {
    return fileUri;
  }
  try {
    await FileSystem.moveAsync({ from: noTrail, to: cleanFileUri });
    return cleanFileUri;
  } catch {
    // Falha em renomear: continua com o original.
    return fileUri;
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
  // V4.0.2: migra vaultRoot persistido em formato content:// (apps
  // pre-V4.0.2 que escolheram via SAF picker) para file:// equivalente.
  // Sem isso, listVaultFolder/saves silenciosos. Volume secundario
  // permanece content:// (sem migration possivel).
  const migrated = trimmed.startsWith('content://')
    ? safTreeUriToFileUri(trimmed) ?? trimmed
    : trimmed;
  // V4.0.2: renomeia pasta com trailing space (artefato Syncthing/MIUI)
  // antes de qualquer probe ou write. Idempotente.
  const sane = await sanearTrailingSpaceFolder(migrated);
  await garantirSubpastas(sane);
  const writable = await probeVaultWritable(sane);
  if (!writable) {
    throw new Error(
      'storage permission denied (probe write failed na pasta escolhida)'
    );
  }
  const modo: ModoInicializacao = sane.startsWith('content://')
    ? 'saf-fallback'
    : 'auto';
  await writeKey(VAULT_ROOT_KEY, sane);
  useVault.getState().setVaultRoot(sane);
  return { vaultRoot: sane, criado: true, modo };
}

// Pede permissao SAF (apenas como UI de seletor de pasta) e converte
// o tree URI para file:// equivalente. V4.0.2 (2026-05-08): app
// nunca persiste content:// como vault root; toda a camada de save
// assume file:// + MANAGE_EXTERNAL_STORAGE. Se o picker retornar
// armazenamento secundario (cartao SD/USB), retorna null e caller
// avisa.
//
// Retorna { fileUri, treeUri } quando ok, null quando cancelado/nao
// suportado. fileUri esta pronto para inicializarVaultEscolhido.
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
  const treeUri = result.directoryUri;
  // Converte para file:// — V4.0.2 unifica saves em MANAGE permission.
  const fileUri = safTreeUriToFileUri(treeUri);
  if (!fileUri) {
    // Volume secundario nao suportado nesta fase.
    return null;
  }
  return fileUri;
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
