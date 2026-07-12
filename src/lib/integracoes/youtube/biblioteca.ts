// Camada de biblioteca do YouTube para o picker de midia
// (R-INT-4-YOUTUBE-PICKER). Consome o client read-only (getLiked +
// getWatchLater) e entrega uma lista plana, deduplicada por video_id,
// pronta para a UI de selecao. Espelha a forma do picker Spotify
// (modelo Google Fotos): navegar a propria biblioteca conectada e
// escolher um item, em vez de colar URL.
//
// Decisoes:
//   - O client expoe Liked (LL) + Watch Later (WL). Agregamos os dois.
//     Watch Later pode lancar YouTubeWatchLaterIndisponivelError (403
//     do Google para alguns clientes); tratamos como lista vazia.
//   - Dedup por video_id preservando a primeira ocorrencia (Liked tem
//     prioridade sobre Watch Later na ordem de agregacao).
//   - Sem token / token invalido / qualquer erro de rede -> lista
//     vazia. A UI decide o fallback (input de URL).
//   - Rate limit / quota da Data API: cache curto em memoria (TTL 60s)
//     por token, para nao martelar a API quando o usuario reabre a aba.
//
// Comentarios sem acento (convencao shell/CI).
import {
  getLiked,
  getWatchLater,
  YouTubeWatchLaterIndisponivelError,
  type YouTubeVideo,
} from '@/lib/integracoes/youtube/client';
import { youtubeThumbnailUrl } from '@/lib/midia/youtubeId';

// Item plano consumido pela UI do picker. url e' a watch URL canonica;
// thumb deriva do client ou, em ultimo caso, da CDN por id.
export interface VideoPicker {
  video_id: string;
  titulo: string;
  canal: string | null;
  url: string;
  thumb: string | null;
}

const TTL_MS = 60_000;
const LIMIT_PADRAO = 25;

interface CacheEntry {
  expira: number;
  itens: VideoPicker[];
}

// Cache por token. Token muda a cada refresh; um token novo invalida
// naturalmente a entrada antiga (chave diferente).
const cache = new Map<string, CacheEntry>();

function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function paraPicker(v: YouTubeVideo): VideoPicker {
  return {
    video_id: v.videoId,
    titulo: v.title,
    canal: v.channelTitle,
    url: watchUrl(v.videoId),
    thumb: v.thumbnailUrl ?? youtubeThumbnailUrl(v.videoId),
  };
}

// Busca uma fonte, tolerando ausencia (Watch Later indisponivel) e
// qualquer outro erro de rede como lista vazia.
async function buscarTolerante(
  fn: (token: string, limit: number) => Promise<YouTubeVideo[]>,
  token: string,
  limit: number
): Promise<YouTubeVideo[]> {
  try {
    return await fn(token, limit);
  } catch (e) {
    if (e instanceof YouTubeWatchLaterIndisponivelError) {
      return [];
    }
    return [];
  }
}

// Agrega Liked + Watch Later, deduplica por video_id e mapeia para o
// shape da UI. Sem token -> vazio. Cache curto por token (TTL 60s).
export async function listarVideosParaPicker(
  token: string | null,
  limit: number = LIMIT_PADRAO
): Promise<VideoPicker[]> {
  if (typeof token !== 'string' || token.length === 0) {
    return [];
  }

  const agora = Date.now();
  const cached = cache.get(token);
  if (cached && cached.expira > agora) {
    return cached.itens;
  }

  const [liked, watchLater] = await Promise.all([
    buscarTolerante(getLiked, token, limit),
    buscarTolerante(getWatchLater, token, limit),
  ]);

  const vistos = new Set<string>();
  const itens: VideoPicker[] = [];
  // Liked primeiro (prioridade na dedup), depois Watch Later.
  for (const v of [...liked, ...watchLater]) {
    if (vistos.has(v.videoId)) continue;
    vistos.add(v.videoId);
    itens.push(paraPicker(v));
  }

  cache.set(token, { expira: agora + TTL_MS, itens });
  return itens;
}

// Limpa o cache em memoria. Usado em testes e ao desconectar a conta.
export function limparCacheBiblioteca(): void {
  cache.clear();
}
