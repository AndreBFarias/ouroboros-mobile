// Migra drafts de treino livre criados pela M13
// (treinos/draft/<YYYY-MM-DD>-<slug>.md com tipo: treino_draft) para
// sessoes formais TreinoSessaoSchema (treinos/<YYYY-MM-DD>-<slug>.md).
//
// Como cada draft contem apenas slugs de exercício (sem séries/reps/
// carga), a migracao gera uma sessao "espelho" com:
//  - rotina: "Treino livre"
//  - duracao_min: 30 (estimativa neutra)
//  - exercícios: cada slug do draft vira item com séries=3, reps=10,
//    sem carga (caller pode editar depois pela Tela 10).
//
// Idempotente: usa marker .ouroboros/cache/migracao-drafts-m11.flag
// para não processar duas vezes. Falha silenciosa em ambiente sem
// FileSystem (web mock).
//
// Plugado em BOOT_HOOKS pela M11 (uma vez na vida do app, depois
// vira no-op).
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { useVault } from '@/lib/stores/vault';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { treinosPath } from '@/lib/vault/paths';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// Re-cria o schema do draft inline (mesmo formato de
// adicionarTreinoLivre.ts) para validar leitura.
const TreinoDraftSchema = z.object({
  tipo: z.literal('treino_draft'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD'),
  autor: PessoaAutorSchema,
  exercicios: z.array(z.string()).min(1),
});

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Extrai data + slug do path canonico
// treinos/draft/<YYYY-MM-DD>-<slug>.md.
function parseDraftFilename(
  uri: string
): { data: string; slug: string } | null {
  const decoded = decodeURIComponent(uri);
  const match = decoded.match(/(\d{4}-\d{2}-\d{2})-([^/]+)\.md$/);
  if (!match) return null;
  return { data: match[1], slug: match[2] };
}

// Resultado da migracao para inspecao em testes / debug.
export interface MigracaoDraftsResult {
  migrados: number;
  ignorados: number;
}

export async function migrarDraftsParaTreinoSessao(
  vaultRootArg?: string
): Promise<MigracaoDraftsResult> {
  // Caller pode passar root explicito (em testes); senao pega do
  // store. Sem root não ha o que migrar (Vault não concedido).
  const vaultRoot =
    typeof vaultRootArg === 'string' && vaultRootArg.length > 0
      ? vaultRootArg
      : useVault.getState().vaultRoot;
  if (!vaultRoot) return { migrados: 0, ignorados: 0 };

  // Treinos drafts (M11) ainda em layout legado: pasta 'treinos/draft'.
  const draftsFolderUri = joinUri(vaultRoot, 'treinos/draft');
  const arquivos = await listVaultFolder(draftsFolderUri, '.md');

  let migrados = 0;
  let ignorados = 0;

  for (const draftUri of arquivos) {
    // Filtro defensivo: copias geradas pelo Syncthing em janela de
    // conflito (sync-conflict-<YYYYMMDD>-<HHMMSS>-<dispid>) nao
    // viram TreinoSessao espelho. O arquivo continua no path
    // original para reconciliacao manual via Obsidian/Syncthing.
    // (sprint AUDIT-T1B7-DRAFT-EXPORT-FIX)
    if (ehSyncConflict(draftUri)) continue;

    const partes = parseDraftFilename(draftUri);
    if (!partes) {
      ignorados++;
      continue;
    }

    let draft: { meta: z.infer<typeof TreinoDraftSchema>; body: string } | null;
    try {
      draft = await readVaultFile(draftUri, TreinoDraftSchema);
    } catch {
      ignorados++;
      continue;
    }
    if (!draft) {
      ignorados++;
      continue;
    }

    // Constroi sessao formal com defaults conservadores.
    const dataIso = `${partes.data}T00:00:00-03:00`;
    const sessao: TreinoSessao = {
      tipo: 'treino_sessao',
      data: dataIso,
      autor: draft.meta.autor,
      rotina: 'Treino livre',
      duracao_min: 30,
      exercicios: draft.meta.exercicios.map((nome) => ({
        nome,
        series: 3,
        reps: 10,
      })),
    };

    const parsed = TreinoSessaoSchema.safeParse(sessao);
    if (!parsed.success) {
      ignorados++;
      continue;
    }

    const dataDate = new Date(dataIso);
    const novoRel = treinosPath(dataDate, partes.slug);
    const novoUri = joinUri(vaultRoot, novoRel);

    try {
      await writeVaultFile<TreinoSessao>(
        novoUri,
        parsed.data,
        'Sessao migrada automaticamente do draft criado em "Adicionar a treino livre".\n'
      );
      // Tenta apagar o draft. Falha aqui não reverte a migracao - o
      // draft fica como artefato e o usuario pode limpar manualmente.
      try {
        await StorageAccessFramework.deleteAsync(draftUri);
      } catch {
        // ok.
      }
      migrados++;
    } catch {
      ignorados++;
    }
  }

  return { migrados, ignorados };
}
