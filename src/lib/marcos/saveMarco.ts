// Salva um marco no Vault. Wrapper sobre escreverMarco que valida
// o meta com MarcoSchema, deriva slug pela descricao e injeta hash
// canonical para idempotencia entre origens client/backend.
//
// Comentarios sem acento (convencao shell/CI).
import { escreverMarco } from '@/lib/vault/marcos';
import { MarcoSchema, type Marco } from '@/lib/schemas/marco';
import { slugifyMarco } from '@/lib/marcos/slug';
import { hashMarcoConteudo } from '@/lib/marcos/hash';

export interface SaveMarcoArgs {
  meta: Marco;
  body?: string;
  vaultRoot: string;
  slugOverride?: string;
}

export interface SaveMarcoResult {
  uri: string;
  rel: string;
  slug: string;
}

export async function saveMarco(args: SaveMarcoArgs): Promise<SaveMarcoResult> {
  const { meta, body = '', vaultRoot, slugOverride } = args;

  // Injeta hash automaticamente quando ausente. Garante que a versao
  // gravada sempre tenha hash canonical para dedupe futuro.
  const metaComHash: Marco = {
    ...meta,
    hash:
      typeof meta.hash === 'string' && meta.hash.length === 12
        ? meta.hash
        : hashMarcoConteudo(meta.autor, meta.descricao),
  };

  const parsed = MarcoSchema.safeParse(metaComHash);
  if (!parsed.success) {
    throw new Error(`marco invalido: ${parsed.error.message}`);
  }

  const slug =
    typeof slugOverride === 'string' && slugOverride.length > 0
      ? slugOverride
      : slugifyMarco(parsed.data.descricao);

  const { uri, rel } = await escreverMarco(vaultRoot, slug, parsed.data, body);
  return { uri, rel, slug };
}
