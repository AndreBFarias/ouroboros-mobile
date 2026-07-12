// Cache em memória do oEmbed do Spotify (M11.5). Decisão A2 do
// adendo: o calendário pode renderizar dezenas de cards Spotify;
// chamar fetchSpotifyOEmbed por card travaria a UI e excederia o
// limite cortês do endpoint público. Cache simples por track_id /
// trackUrl com TTL e deduplicação de requisições concorrentes.
//
// Escopo: ciclo de vida do processo (sem persistência cross-session).
// O spec adendo menciona AsyncStorage com TTL 7 dias como objetivo
// futuro; fica registrado como sub-sprint colateral, NÃO bloqueia
// M11.5. A degradação graciosa (fallback bonito com ícone Music
// sobre fundo verde) cobre o caso onde o cache está frio e a rede
// está lenta — o usuário vê o card sem espera.
//
// Comentário em PT-BR com acentuação completa (lição
// INFRA-acentuação): código nasce limpo desde o primeiro commit.
import {
  fetchSpotifyOEmbed,
  type SpotifyOEmbedResult,
} from '@/lib/midia/spotifyOEmbed';

// TTL de 7 dias em milissegundos. O endpoint do Spotify costuma
// responder estável para tracks publicados; refresh semanal evita
// que títulos editados pelos artistas fiquem permanentemente
// desatualizados.
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  data: SpotifyOEmbedResult;
  expiresAt: number;
}

// Estado local (escopo do módulo). Resetado em testes via
// resetSpotifyOEmbedCache.
let cache = new Map<string, CacheEntry>();
// Deduplicação: enquanto um fetch está em voo, requisições para a
// mesma URL aguardam a mesma Promise.
let inflight = new Map<string, Promise<SpotifyOEmbedResult>>();

// Função pública: devolve oEmbed do Spotify usando cache. Resultados
// vazios (`{}`) também são cacheados para evitar tempestade de
// requisições quando o endpoint está fora do ar.
export async function getSpotifyOEmbedCached(
  trackUrl: string
): Promise<SpotifyOEmbedResult> {
  if (typeof trackUrl !== 'string' || trackUrl.trim().length === 0) {
    return {};
  }

  const now = Date.now();
  const cached = cache.get(trackUrl);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // Já existe fetch em voo — reutiliza a Promise.
  const existing = inflight.get(trackUrl);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const data = await fetchSpotifyOEmbed(trackUrl);
      cache.set(trackUrl, { data, expiresAt: Date.now() + TTL_MS });
      return data;
    } finally {
      inflight.delete(trackUrl);
    }
  })();
  inflight.set(trackUrl, promise);
  return promise;
}

// Helper para testes: limpa cache e inflight. Não exportado em
// barrels de produção.
export function resetSpotifyOEmbedCache(): void {
  cache = new Map();
  inflight = new Map();
}

// Helper de inspeção (somente debug / testes): tamanho atual do
// cache. Não exportado em barrels de produção.
export function spotifyOEmbedCacheSize(): number {
  return cache.size;
}
