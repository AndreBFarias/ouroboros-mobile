// Wrapper sobre StorageAccessFramework do expo-file-system para
// pedir permissao da pasta raiz do Vault. Persiste o URI escolhido
// em SecureStore (mesma camada que pessoa.ts usa) para que o app
// recupere acesso entre sessoes.
//
// Armadilha A2: Android 13+ exige requestDirectoryPermissionsAsync;
// pedidos so podem partir de gesto do usuario (botao na tela 01).
//
// O API legacy do expo-file-system continua sendo o canal
// suportado para SAF na SDK 54 (entry point: 'expo-file-system/legacy').
//
// No web (Chrome desktop, validação via MCP de browser), SAF e
// SecureStore não existem. Usamos localStorage como fallback para
// permitir testar fluxos JS sem conflito com celular fisico.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { StorageAccessFramework } from 'expo-file-system/legacy';

const VAULT_ROOT_KEY = 'ouroboros.vault.root.v1';
const isWeb = Platform.OS === 'web';

async function readKey(name: string): Promise<string | null> {
  if (isWeb) {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(name);
  }
  return (await SecureStore.getItemAsync(name)) ?? null;
}

async function writeKey(name: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(name, value);
    return;
  }
  await SecureStore.setItemAsync(name, value);
}

async function deleteKey(name: string): Promise<void> {
  if (isWeb) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(name);
    return;
  }
  await SecureStore.deleteItemAsync(name);
}

// Pede permissao SAF e retorna URI da pasta selecionada, ou null se
// o usuario cancelar. Persiste o URI. No web devolve URI mock para
// permitir validação visual do app sem precisar de SAF.
export async function requestVaultPermission(): Promise<string | null> {
  if (isWeb) {
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
