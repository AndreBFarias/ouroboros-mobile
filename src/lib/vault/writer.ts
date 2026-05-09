// Escrita atomica de arquivos .md no Vault via SAF. Esta sprint não
// usa o writer (escrita comeca na M03), mas o expomos para permitir
// que sprints futuras dependam apenas do barrel '@/lib/vault'.
//
// O contrato: writer recebe URI completo do arquivo (já criado via
// SAF.createFileAsync no caller), serializa frontmatter+body e faz
// writeAsStringAsync. Atomicidade real (rename .tmp -> final) não e
// suportada por SAF; aceitamos a granularidade do underlying SAF.
//
// V4.0 (INFRA-VAULT-WEB-MOCK, 2026-05-08): em web/dev (Platform.OS
// === 'web' && __DEV__), escreve no useVaultMock em vez de SAF (que
// lancaria UnavailabilityError silencioso). Mobile real continua
// usando SAF nativo.
//
// V4.0.2 (2026-05-08): garante pasta-pai antes de write em file://.
// Cobre paths legados (treinos/, inbox/financeiro/<subtipo>/) que
// nao estao em SUBPASTAS_CANONICAS. Sem isso, FileOutputStream
// interno do writeAsStringAsync falha por parent ausente.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { stringifyFrontmatter } from '@/lib/vault/frontmatter';
import { useVaultMock } from '@/lib/dev/vaultMockStore';

async function ensureParentDir(fileUri: string): Promise<void> {
  if (!fileUri.startsWith('file://')) return; // SAF auto-cria
  const lastSlash = fileUri.lastIndexOf('/');
  if (lastSlash === -1) return;
  const parentUri = fileUri.substring(0, lastSlash);
  try {
    await FileSystem.makeDirectoryAsync(parentUri, { intermediates: true });
  } catch {
    // Ja existe ou backend rejeitou; write posterior decide.
  }
}

export async function writeVaultFile<T>(
  uri: string,
  meta: T,
  body: string
): Promise<void> {
  const raw = stringifyFrontmatter(meta, body);
  if (Platform.OS === 'web' && __DEV__) {
    // Branch web/dev: persiste no mock store. Em mobile-release esse
    // branch e dead-code (Platform.OS !== 'web').
    useVaultMock.getState().setArquivo(uri, raw);
    return;
  }
  await ensureParentDir(uri);
  await StorageAccessFramework.writeAsStringAsync(uri, raw);
}
