// Escrita atomica de arquivos .md no Vault via SAF. Esta sprint não
// usa o writer (escrita comeca na M03), mas o expomos para permitir
// que sprints futuras dependam apenas do barrel '@/lib/vault'.
//
// O contrato: writer recebe URI completo do arquivo (já criado via
// SAF.createFileAsync no caller), serializa frontmatter+body e faz
// writeAsStringAsync. Atomicidade real (rename .tmp -> final) não e
// suportada por SAF; aceitamos a granularidade do underlying SAF.
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { stringifyFrontmatter } from '@/lib/vault/frontmatter';

export async function writeVaultFile<T>(
  uri: string,
  meta: T,
  body: string
): Promise<void> {
  const raw = stringifyFrontmatter(meta, body);
  await StorageAccessFramework.writeAsStringAsync(uri, raw);
}
