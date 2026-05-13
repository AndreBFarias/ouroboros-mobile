// Helpers vault para Grupos de Treino (Q19, Onda Q 2026-05-13).
// Espelha padrao de vault/rotina.ts: filter por autor, sort PT-BR,
// path canonico H2, vaultUriJoin para tolerancia a SAF/file ofensivo.
//
// Comentarios sem acento (convencao shell/CI).
import { StorageAccessFramework } from 'expo-file-system/legacy';
import {
  grupoPath,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { GrupoTreinoSchema, type GrupoTreino } from '@/lib/schemas/grupo_treino';

export async function listarGrupos(
  vaultRoot: string,
  autor: 'pessoa_a' | 'pessoa_b'
): Promise<GrupoTreino[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter((u) => matchesFeaturePrefix(u, 'grupo-'));

  const lidas: GrupoTreino[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, GrupoTreinoSchema);
      if (result && result.meta.autor === autor) lidas.push(result.meta);
    } catch {
      // ignora arquivos malformados.
    }
  }

  lidas.sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );
  return lidas;
}

export async function lerGrupo(
  vaultRoot: string,
  slug: string
): Promise<GrupoTreino | null> {
  const rel = grupoPath(slug);
  const uri = vaultUriJoin(vaultRoot, rel);
  const result = await readVaultFile(uri, GrupoTreinoSchema);
  return result ? result.meta : null;
}

export async function escreverGrupo(
  vaultRoot: string,
  meta: GrupoTreino,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = GrupoTreinoSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`grupo invalido: ${parsed.error.message}`);
  }
  const rel = grupoPath(parsed.data.slug);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<GrupoTreino>(uri, parsed.data, body);
  return { uri, rel };
}

export async function removerGrupo(
  vaultRoot: string,
  slug: string
): Promise<void> {
  const rel = grupoPath(slug);
  const uri = vaultUriJoin(vaultRoot, rel);
  try {
    await StorageAccessFramework.deleteAsync(uri);
  } catch {
    // ok se nao existe ou plataforma sem SAF.
  }
}
