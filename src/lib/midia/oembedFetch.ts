// Wrapper canonico que o componente UI deve consumir para obter
// dados oEmbed (R-MEDIA-1). Combina o cache persistente (TTL 7d)
// com o client de rede (timeout 5s, fallback null):
//
//   1. Consulta o cache (`getOembedCached`).
//   2. Cache valido -> devolve direto, sem rede.
//   3. Cache vazio ou expirado -> chama `fetchOembed`.
//   4. Resposta valida -> popula cache via `setOembedCached`.
//   5. Falha (rede, timeout, parse) -> devolve null; o componente UI
//      cai para fallback bonito (logo + botao abrir externamente).
//
// O cache nao tem deduplicacao de requisicoes concorrentes neste
// nivel; a memoria em `spotifyOEmbedCache.ts` ja cobre o caso do
// calendario com dezenas de cards do mesmo track. Para Spotify ou
// YouTube cada URL e tipicamente unica por registro -- duplicacao
// vale somente se o usuario abrir o mesmo card duas vezes em janela
// curta, e a segunda requisicao acerta o cache de disco.
//
// Comentarios em PT-BR com acentuacao completa (licao
// INFRA-acentuacao).
import { fetchOembed } from '@/lib/midia/oembedClient';
import {
  getOembedCached,
  setOembedCached,
} from '@/lib/cache/oembedCache';
import type { OembedData } from '@/lib/midia/oembedSchema';

// Tenta cache, depois rede. Sempre devolve `OembedData` ou `null`.
// Nunca lanca: caller pode chamar sem try/catch.
export async function obterOembed(
  url: string
): Promise<OembedData | null> {
  if (typeof url !== 'string' || url.trim().length === 0) return null;

  const cached = await getOembedCached(url);
  if (cached) return cached;

  const fresh = await fetchOembed(url);
  if (!fresh) return null;

  // Populacao do cache e best-effort -- falhas nao bloqueiam o caller.
  void setOembedCached(url, fresh);
  return fresh;
}
