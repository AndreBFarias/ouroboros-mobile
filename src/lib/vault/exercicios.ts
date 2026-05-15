// Helpers de leitura, listagem, escrita e exclusao de exercícios no
// Vault (M13). Cada exercício vive em markdown/exercicio-<slug>.md com
// frontmatter validado pelo ExercicioSchema; o GIF associado fica em
// gif/exercicio-<slug>.gif (path relativo, layout-por-tipo H2 do plano
// golden-zebra; ADR-0023). Frontmatter linka via campo gif (cross-link
// .md -> binario).
//
// Exclusao usa lixeira soft: move o .md para
// cacheDirectory/lixeira/exercicios/<timestamp>-<slug>.md. O GIF
// permanece em gif/ porque outro exercício pode referência-lo.
// Limpeza automática acontece via boot hook (M00.5; cap de 30 dias).
//
// listarExercicios aplica filtros sequencialmente (grupo -> pessoa ->
// search) e devolve a lista ordenada por nome em ordem alfabetica.
//
// I-EXERCICIO (M-SAVE-EXERCICIO-VALIDA, 2026-05-07): migra joinUri
// local para vaultUriJoin canonico (H1 do plano golden-zebra). Helper
// canonico (paths.ts:27) limpa trailing whitespace/%20/'/' que SAF
// aplicava em runtime real (sintoma A29 em OEMs MIUI/OneUI/HyperOS).
// Crash empirico do screenshot 466875db (IOException: directory cannot
// be created) era causado por concatenacao ad-hoc de root contaminado
// SAF + path antigo assets/exercicios/<slug>.gif (substituido por
// gif/exercicio-<slug>.gif em H2).
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
// Imports apontam diretamente para os modulos finais (não para o
// barrel @/lib/vault) para evitar ciclo de carregamento. O barrel
// re-exporta este arquivo, e tests que fazem
// jest.mock('@/lib/vault') com requireActual perderiam o helper sem
// este desvio.
import {
  exercicioPath,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';
import { ExercicioSchema, type Exercicio } from '@/lib/schemas/exercicio';

export interface ListarExerciciosFiltros {
  // Slug do grupo muscular para filtro (ex: 'pernas').
  grupo?: string | null;
  // Texto livre para busca por nome (case-insensitive, accent-insensitive).
  search?: string;
}

// Normaliza string para busca: lowercase + remove diacriticos.
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

// Le e parseia um exercício pelo slug. Retorna null se ausente.
export async function lerExercicio(
  vaultRoot: string,
  slug: string
): Promise<Exercicio | null> {
  const uri = vaultUriJoin(vaultRoot, exercicioPath(slug));
  const result = await readVaultFile(uri, ExercicioSchema);
  if (!result) return null;
  return result.meta;
}

// Lista todos os exercícios do Vault aplicando filtros opcionais.
// Pasta inexistente => [] silenciosamente.
export async function listarExercicios(
  vaultRoot: string,
  filtros: ListarExerciciosFiltros = {}
): Promise<Exercicio[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, 'exercicio-')
  );

  const lidos: Exercicio[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, ExercicioSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Arquivo .md presente mas com schema invalido. Ignora
      // silenciosamente: a galeria não pode quebrar por causa de
      // um arquivo manualmente editado.
    }
  }

  let filtrados = lidos;

  if (typeof filtros.grupo === 'string' && filtros.grupo.length > 0) {
    const grupo = filtros.grupo;
    filtrados = filtrados.filter((e) => e.grupo_muscular.includes(grupo));
  }

  if (typeof filtros.search === 'string' && filtros.search.trim().length > 0) {
    const termo = norm(filtros.search.trim());
    filtrados = filtrados.filter((e) => norm(e.nome).includes(termo));
  }

  // Ordena por nome (case-insensitive, accent-insensitive) para
  // garantir lista deterministica em qualquer ambiente.
  filtrados.sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
  return filtrados;
}

// Cria ou atualiza um exercício. O caller fornece meta validado e
// body livre. Path canonico vem do slug do meta.
export async function escreverExercicio(
  vaultRoot: string,
  meta: Exercicio,
  body: string = ''
): Promise<{ uri: string }> {
  const parsed = ExercicioSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`exercicio invalido: ${parsed.error.message}`);
  }
  const rel = exercicioPath(parsed.data.slug);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<Exercicio>(uri, parsed.data, body);
  return { uri };
}

// Move um exercício para a lixeira soft. Retorna o path final na
// lixeira. GIF associado permanece em assets/ (pode ser referenciado
// por outro exercício futuro).
export async function excluirExercicio(
  vaultRoot: string,
  slug: string
): Promise<{ lixeiraPath: string }> {
  const origemUri = vaultUriJoin(vaultRoot, exercicioPath(slug));

  // cacheDirectory pode ser null em ambientes web. Usamos prefixo
  // mock para não quebrar testes; o caller real (Tela 08 botao
  // Excluir) depende de ambiente nativo.
  const cacheBase = FileSystem.cacheDirectory ?? 'cache://';
  const lixeiraDir = `${cacheBase}lixeira/exercicios/`;
  try {
    await FileSystem.makeDirectoryAsync(lixeiraDir, { intermediates: true });
  } catch {
    // Já existe, ok.
  }

  const ts = formatTimestampLixeira(new Date());
  const lixeiraPath = `${lixeiraDir}${ts}-${slug}.md`;

  // Le o conteudo original via SAF e regrava em cache (filesystem
  // local). Em seguida apaga o original. Não usamos copyAsync direto
  // porque SAF -> cacheDirectory pode falhar com URIs content://.
  let raw: string;
  try {
    raw = await StorageAccessFramework.readAsStringAsync(origemUri);
    await FileSystem.writeAsStringAsync(lixeiraPath, raw);
    await StorageAccessFramework.deleteAsync(origemUri);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`falha ao mover para lixeira: ${msg}`);
  }
  return { lixeiraPath };
}

// Formata timestamp para nome de arquivo na lixeira: YYYYMMDD-HHmmss.
// Sem separadores extras para não colidir com o slug que já contem
// hifens.
function formatTimestampLixeira(date: Date): string {
  const TZ_OFFSET_MIN = -180;
  const local = new Date(date.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  const ss = String(local.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}
