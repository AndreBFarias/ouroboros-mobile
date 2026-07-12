// Cria um arquivo de rascunho de treino livre quando o usuario toca
// "Adicionar a treino livre" no Detalhe (Tela 08). Sai em
// treinos/draft/YYYY-MM-DD-<slug>.md com YAML minimo.
//
// Decisão M13 (spec seção 10): não criar TreinoSessaoSchema agora.
// M11 migrara esses drafts para schema formal. Aqui usamos zod
// inline com tipo treino_draft, autor, data e lista de slugs de
// exercícios.
//
// Quando já existe um draft do mesmo dia, o helper le o existente,
// concatena o slug novo (se não estiver presente) e regrava. Assim
// o usuario pode adicionar varios exercícios ao mesmo treino livre
// numa unica sessao sem criar arquivos duplicados.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
// Imports diretos aos modulos finais (não ao barrel @/lib/vault)
// para evitar ciclo de carregamento durante jest.requireActual nos
// testes que mockam o barrel.
import { treinosDraftPath, formatDateYmd } from '@/lib/vault/paths';
import { readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { PessoaAutorSchema, type PessoaAutor } from '@/lib/schemas/pessoa';

// Schema inline do treino_draft. Quando M11 chegar, este schema
// sera migrado para src/lib/schemas/treino_sessao.ts e este modulo
// refatorado para usar a versao formal.
export const TreinoDraftSchema = z.object({
  tipo: z.literal('treino_draft'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD'),
  autor: PessoaAutorSchema,
  exercicios: z.array(z.string()).min(1),
});
export type TreinoDraft = z.infer<typeof TreinoDraftSchema>;

export interface AdicionarTreinoLivreArgs {
  vaultRoot: string;
  exercicioSlug: string;
  autor: PessoaAutor;
}

export interface AdicionarTreinoLivreResult {
  uri: string;
  // true se criou arquivo novo, false se anexou a um draft existente.
  criadoNovo: boolean;
}

// Concatena root SAF e path relativo, normalizando barras.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

export async function adicionarTreinoLivre(
  args: AdicionarTreinoLivreArgs
): Promise<AdicionarTreinoLivreResult> {
  const { vaultRoot, exercicioSlug, autor } = args;

  if (!exercicioSlug || exercicioSlug.length === 0) {
    throw new Error('exercicio slug obrigatorio');
  }

  const agora = new Date();
  const dataYmd = formatDateYmd(agora);
  const slugDraft = exercicioSlug; // primeiro slug e o nome do arquivo
  const rel = treinosDraftPath(agora, slugDraft);
  const uri = joinUri(vaultRoot, rel);

  // Verifica se já existe draft com o mesmo nome de arquivo. Se
  // houver, anexa o slug a lista (sem duplicar).
  const existente = await readVaultFile<TreinoDraft>(uri, TreinoDraftSchema);
  if (existente) {
    if (!existente.meta.exercicios.includes(exercicioSlug)) {
      const metaAtualizado: TreinoDraft = {
        ...existente.meta,
        exercicios: [...existente.meta.exercicios, exercicioSlug],
      };
      await writeVaultFile<TreinoDraft>(uri, metaAtualizado, existente.body);
    }
    return { uri, criadoNovo: false };
  }

  const meta: TreinoDraft = {
    tipo: 'treino_draft',
    data: dataYmd,
    autor,
    exercicios: [exercicioSlug],
  };
  const body =
    'Treino livre criado a partir do detalhe do exercicio. Migrado para sessao formal quando a M11 chegar.\n';
  await writeVaultFile<TreinoDraft>(uri, meta, body);
  return { uri, criadoNovo: true };
}
