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
import * as SecureStore from 'expo-secure-store';
import { StorageAccessFramework } from 'expo-file-system/legacy';

const VAULT_ROOT_KEY = 'ouroboros.vault.root.v1';

// Pede permissao SAF e retorna URI da pasta selecionada, ou null se
// o usuario cancelar. Persiste o URI em SecureStore.
export async function requestVaultPermission(): Promise<string | null> {
  const result = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!result.granted) {
    return null;
  }
  const uri = result.directoryUri;
  await SecureStore.setItemAsync(VAULT_ROOT_KEY, uri);
  return uri;
}

// Le do SecureStore o URI persistido. Retorna null se nunca foi
// concedido ou foi limpo.
export async function loadVaultRoot(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(VAULT_ROOT_KEY);
  return v ?? null;
}

// Limpa o URI persistido (usado em logout / reset).
export async function clearVaultRootStorage(): Promise<void> {
  await SecureStore.deleteItemAsync(VAULT_ROOT_KEY);
}

export const VAULT_ROOT_STORAGE_KEY = VAULT_ROOT_KEY;
