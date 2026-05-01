// Salva uma sessao de treino formal no Vault. Wrapper sobre
// escreverTreino que valida o meta com TreinoSessaoSchema antes de
// tocar I/O e deriva o slug a partir da rotina (ou fallback).
//
// Comentarios sem acento (convencao shell/CI).
import { escreverTreino } from '@/lib/vault/treinos';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import { slugifyTreino } from '@/lib/treinos/slug';

export interface SaveTreinoArgs {
  meta: TreinoSessao;
  body?: string;
  vaultRoot: string;
  // Override opcional do slug. Quando ausente, deriva da rotina.
  // Util em edicao para preservar o slug original.
  slugOverride?: string;
}

export interface SaveTreinoResult {
  uri: string;
  rel: string;
  slug: string;
}

export async function saveTreino(
  args: SaveTreinoArgs
): Promise<SaveTreinoResult> {
  const { meta, body = '', vaultRoot, slugOverride } = args;

  const parsed = TreinoSessaoSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`treino invalido: ${parsed.error.message}`);
  }

  const slug =
    typeof slugOverride === 'string' && slugOverride.length > 0
      ? slugOverride
      : slugifyTreino(parsed.data.rotina ?? 'treino');

  const { uri, rel } = await escreverTreino(vaultRoot, slug, parsed.data, body);
  return { uri, rel, slug };
}
