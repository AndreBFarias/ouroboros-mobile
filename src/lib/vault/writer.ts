// Escrita atomica de arquivos .md no Vault via SAF. Esta sprint não
// usa o writer (escrita comeca na M03), mas o expomos para permitir
// que sprints futuras dependam apenas do barrel '@/lib/vault'.
//
// O contrato: writer recebe URI completo do arquivo (já criado via
// SAF.createFileAsync no caller), serializa frontmatter+body e faz
// writeAsStringAsync. Atomicidade real (rename .tmp -> final) não e
// suportada por SAF nativo; mantemos o comportamento simples nessa
// branch.
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
//
// AUDIT-T1-BUGS B1 (2026-05-15): atomic write na branch file://. O
// vault default desde V4.0.2-5 e' documentDirectory (file://), onde
// FileSystem.moveAsync suporta rename atomico. Sequencia:
//   1) ensureParentDir
//   2) writeAsStringAsync(uri + '.writing', raw)
//   3) moveAsync({ from: uri + '.writing', to: uri })
//
// Se app for matado entre 2 e 3, o arquivo final original (se existia)
// continua intacto e o '.writing' fica orfao em disco. O boot hook
// limparArquivosWritingOrfaos varre o vault root e apaga essas
// pendencias. Em content:// (SAF), nao ha rename atomico
// confiavel, entao mantemos writeAsStringAsync direto.
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

// Sufixo canonico para arquivo em escrita temporaria. Boot hook
// limparArquivosWritingOrfaos varre por este sufixo. NAO usar '.tmp'
// (alguns backends Android indexam .tmp como cache). NAO usar prefixo
// '.' (Syncthing-ignore patterns podem pular).
export const WRITING_SUFFIX = '.writing';

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
  // Atomic write so' em file://. content:// (SAF persisted, vault
  // externo) mantem o write direto: rename SAF nao garante atomicidade
  // entre tree URIs do mesmo provider.
  if (uri.startsWith('file://')) {
    const tmpUri = `${uri}${WRITING_SUFFIX}`;
    await StorageAccessFramework.writeAsStringAsync(tmpUri, raw);
    try {
      await FileSystem.moveAsync({ from: tmpUri, to: uri });
    } catch (e) {
      // Se moveAsync falhar (rename rejeitado, FS read-only, etc),
      // tenta delete do tmp para nao deixar orfao; cleanup do boot
      // recupera caso isso tambem falhe. Re-lanca para que caller
      // saiba do erro de escrita.
      try {
        await FileSystem.deleteAsync(tmpUri, { idempotent: true });
      } catch {
        // best-effort; boot hook varre depois.
      }
      throw e;
    }
    return;
  }
  await StorageAccessFramework.writeAsStringAsync(uri, raw);
}
