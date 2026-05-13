// Salva uma sessao de treino formal no Vault. Wrapper sobre
// escreverTreino que valida o meta com TreinoSessaoSchema antes de
// tocar I/O e deriva o slug a partir da rotina (ou fallback).
//
// Q17.c (Onda Q, 2026-05-13): apos save bem-sucedido, opcionalmente
// grava o treino tambem no Health Connect (opt-in via
// settings.featureToggles.healthConnectSync). Best-effort — falha
// no HC nao falha o save local.
//
// Comentarios sem acento (convencao shell/CI).
import { escreverTreino } from '@/lib/vault/treinos';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import { slugifyTreino } from '@/lib/treinos/slug';
import { escreverTreinoEmHC } from '@/lib/health/sync';
import { useSettings } from '@/lib/stores/settings';

export interface SaveTreinoArgs {
  meta: TreinoSessao;
  body?: string;
  vaultRoot: string;
  // Override opcional do slug. Quando ausente, deriva da rotina.
  // Útil em edicao para preservar o slug original.
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

  // Q17.c: sync opt-in para Health Connect. Best-effort — falha aqui
  // nao impacta o caller (save no Vault ja aconteceu).
  try {
    const habilitado = useSettings.getState().featureToggles.healthConnectSync;
    if (habilitado) {
      void escreverTreinoEmHC(parsed.data);
    }
  } catch {
    // Sem hook React: usar getState (sincrono). Erros aqui sao
    // silenciosos por design (path nao-critico).
  }

  return { uri, rel, slug };
}
