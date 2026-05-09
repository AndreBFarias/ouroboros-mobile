// Leitura tipada de arquivos .md do Vault via SAF. Toda leitura
// passa por aqui: o caller fornece um URI completo (root + path
// canonico, já resolvido) e o schema zod do tipo esperado. Retorna
// null em vez de lancar quando o arquivo não existe; outros erros
// (parse, schema) propagam.
//
// V4.0 (INFRA-VAULT-WEB-MOCK, 2026-05-08): em web/dev (Platform.OS
// === 'web' && __DEV__), le do useVaultMock em vez de SAF (que lanca
// UnavailabilityError no DOM). Mobile real continua usando SAF nativo.
//
// V4.0.2 (2026-05-08): listVaultFolder dispatcha entre file:// e
// content://. StorageAccessFramework.readDirectoryAsync e bound ao
// readSAFDirectoryAsync nativo, que rejeita file:// URIs com erro
// silencioso (try/catch retornava []). Para file://, usamos
// FileSystem.readDirectoryAsync (que devolve NOMES, nao URIs cheios),
// e prependamos o folderUri para retornar formato consistente.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import type { ZodType } from 'zod';
import { parseFrontmatter, type ParsedFrontmatter } from '@/lib/vault/frontmatter';
import { useVaultMock } from '@/lib/dev/vaultMockStore';

// Le e parseia um arquivo .md do Vault. Retorna null se o arquivo
// não existir; lanca em outras falhas (yaml invalido, schema falho).
export async function readVaultFile<T>(
  uri: string,
  schema: ZodType<T>
): Promise<ParsedFrontmatter<T> | null> {
  let raw: string;
  if (Platform.OS === 'web' && __DEV__) {
    // Branch web/dev: le do mock store. SAF nao existe em web, e em
    // mobile-release esse branch e dead-code (Platform.OS !== 'web').
    const conteudo = useVaultMock.getState().getArquivo(uri);
    if (conteudo === undefined) return null;
    raw = conteudo;
  } else {
    try {
      raw = await StorageAccessFramework.readAsStringAsync(uri);
    } catch {
      // SAF não distingue 'não existe' de 'sem permissao' de forma
      // confiavel. Tratamos qualquer falha de I/O como ausencia.
      return null;
    }
  }
  return parseFrontmatter(raw, schema);
}

// Lista URIs de arquivos dentro de uma pasta do Vault. Filtra por
// extensao quando fornecida (ex: '.md'). Pasta inexistente => [].
//
// V4.0.2: dispatcha por scheme. file:// usa FileSystem.readDirectoryAsync
// (devolve NOMES) e prepend o folderUri para resultado uniforme.
// content:// (legacy SAF persisted) usa StorageAccessFramework.
export async function listVaultFolder(
  folderUri: string,
  ext?: string
): Promise<string[]> {
  if (Platform.OS === 'web' && __DEV__) {
    // Branch web/dev: lista do mock store. listarPasta ja filtra por
    // prefixo e extensao -- sem chamar SAF (que lancaria).
    return useVaultMock.getState().listarPasta(folderUri, ext);
  }
  let entries: string[];
  try {
    if (folderUri.startsWith('content://')) {
      entries = await StorageAccessFramework.readDirectoryAsync(folderUri);
    } else {
      // file:// (post-V4.0.2 vault root). FileSystem.readDirectoryAsync
      // devolve apenas nomes; transformamos em URIs completos.
      const names = await FileSystem.readDirectoryAsync(folderUri);
      const sep = folderUri.endsWith('/') ? '' : '/';
      entries = names.map((n) => `${folderUri}${sep}${encodeURIComponent(n)}`);
    }
  } catch {
    return [];
  }
  if (!ext) return entries;
  const norm = ext.startsWith('.') ? ext : `.${ext}`;
  return entries.filter((u) => u.toLowerCase().endsWith(norm.toLowerCase()));
}
