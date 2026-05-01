// Persiste um registro de diario emocional (Tela 18) em
// inbox/mente/diario/YYYY-MM-DD-HHmm-<slug>.md no Vault. Função pura:
// recebe meta validado, body livre e vaultRoot; devolve URI final.
//
// Slug do nome de arquivo: deriva da primeira emocao da lista (ou
// 'registro' se vazia). Em colisao improvavel (mesmo arquivo no
// mesmo minuto e mesmo slug), aplica sufixo numerico crescente.
//
// Diferenca para saveHumor: aqui não ha A5 de Syncthing porque o
// path já contem hora e minuto, dificultando colisao real entre
// dois celulares. Mantemos a logica de sufixo defensiva mesmo
// assim.
import {
  diarioEmocionalPath,
  readVaultFile,
  writeVaultFile,
} from '@/lib/vault';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
} from '@/lib/schemas/diario_emocional';

export interface SaveDiarioResult {
  uri: string;
}

// Concatena root SAF e path relativo, normalizando barras.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Monta o slug do nome de arquivo a partir da primeira emocao do
// meta. Slugs são snake_case ASCII; o path canonico aceita
// kebab-case mas o frontmatter usa snake. Mantemos snake aqui para
// alinhar com os slugs e simplificar buscas futuras.
function slugDe(meta: DiarioEmocionalMeta): string {
  const primeira = meta.emocoes[0];
  if (typeof primeira === 'string' && primeira.length > 0) {
    return primeira;
  }
  return 'registro';
}

// Aplica sufixo numerico no rel para evitar colisao ('-1', '-2', ...).
function applyConflictSuffix(rel: string, n: number): string {
  const dotIdx = rel.lastIndexOf('.');
  if (dotIdx === -1) return `${rel}-${n}`;
  return `${rel.slice(0, dotIdx)}-${n}${rel.slice(dotIdx)}`;
}

// Tenta gravar no path canonico. Se já existir um arquivo no mesmo
// URI, incrementa sufixo até encontrar slot livre. Limite defensivo
// de 9 tentativas (mesmo minuto, mesmo slug, mesmo autor) para não
// entrar em loop infinito caso o reader minta sobre existencia.
async function resolvePath(
  vaultRoot: string,
  relCanonico: string
): Promise<string> {
  const uriCanonico = joinUri(vaultRoot, relCanonico);
  const existente = await readVaultFile(
    uriCanonico,
    DiarioEmocionalSchema
  );
  if (!existente) return relCanonico;

  for (let n = 1; n <= 9; n++) {
    const rel = applyConflictSuffix(relCanonico, n);
    const uri = joinUri(vaultRoot, rel);
    const ja = await readVaultFile(uri, DiarioEmocionalSchema);
    if (!ja) return rel;
  }
  // Fallback: timestamp em ms para garantir unicidade absoluta.
  return applyConflictSuffix(relCanonico, Date.now());
}

export async function saveDiario(
  meta: DiarioEmocionalMeta,
  body: string,
  vaultRoot: string
): Promise<SaveDiarioResult> {
  // Defensivo: revalida o meta antes de tocar em I/O.
  const parsed = DiarioEmocionalSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`diario emocional invalido: ${parsed.error.message}`);
  }

  const slug = slugDe(parsed.data);
  // O path canonico usa a hora local de São Paulo formatada por
  // diarioEmocionalPath. Passamos `new Date()` para refletir o
  // momento real do save; meta.data fica em ISO 8601 dentro do
  // frontmatter para preservar fuso explicito.
  const relCanonico = diarioEmocionalPath(new Date(), slug);
  const rel = await resolvePath(vaultRoot, relCanonico);
  const uri = joinUri(vaultRoot, rel);
  await writeVaultFile<DiarioEmocionalMeta>(uri, parsed.data, body);
  return { uri };
}
