// Leitura tipada de arquivos .md do Vault via SAF. Toda leitura
// passa por aqui: o caller fornece um URI completo (root + path
// canonico, já resolvido) e o schema zod do tipo esperado. Retorna
// null em vez de lancar quando o arquivo não existe; outros erros
// (parse, schema) propagam.
import { StorageAccessFramework } from 'expo-file-system/legacy';
import type { ZodType } from 'zod';
import { parseFrontmatter, type ParsedFrontmatter } from '@/lib/vault/frontmatter';

// Le e parseia um arquivo .md do Vault. Retorna null se o arquivo
// não existir; lanca em outras falhas (yaml invalido, schema falho).
export async function readVaultFile<T>(
  uri: string,
  schema: ZodType<T>
): Promise<ParsedFrontmatter<T> | null> {
  let raw: string;
  try {
    raw = await StorageAccessFramework.readAsStringAsync(uri);
  } catch {
    // SAF não distingue 'não existe' de 'sem permissao' de forma
    // confiavel. Tratamos qualquer falha de I/O como ausencia.
    return null;
  }
  return parseFrontmatter(raw, schema);
}

// Lista URIs de arquivos dentro de uma pasta do Vault. Filtra por
// extensao quando fornecida (ex: '.md'). Pasta inexistente => [].
export async function listVaultFolder(
  folderUri: string,
  ext?: string
): Promise<string[]> {
  let entries: string[];
  try {
    entries = await StorageAccessFramework.readDirectoryAsync(folderUri);
  } catch {
    return [];
  }
  if (!ext) return entries;
  const norm = ext.startsWith('.') ? ext : `.${ext}`;
  return entries.filter((u) => u.toLowerCase().endsWith(norm.toLowerCase()));
}
