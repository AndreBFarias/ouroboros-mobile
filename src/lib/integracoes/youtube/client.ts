// Client da YouTube Data API v3 (R-INT-4, 2026-05-17). Read-only,
// expoe 2 metodos canonicos para a v1:
//
//   - getLiked(token, limit?): videos curtidos (playlist `LL`).
//   - getWatchLater(token, limit?): playlist "Assistir mais tarde" (`WL`).
//
// Implementacao: ambos sao playlists especiais do usuario com ids
// fixos (`LL` para Liked, `WL` para Watch Later). Listamos items via
// GET /youtube/v3/playlistItems?playlistId=<LL|WL>&part=snippet,contentDetails.
//
// Observacoes importantes (validadas pela docs oficial):
//   - `WL` (Watch Later) e' acessivel apenas pelo proprio dono via
//     playlistItems com `mine=true` ou `playlistId=WL`. Google
//     historicamente restringe alguns acessos a WL (alguns scopes
//     retornam 403); a v1 trata 403 retornando lista vazia + flag
//     `watchLaterIndisponivel` no resultado.
//   - `LL` (Liked) e' a playlist canonica de videos curtidos. Sempre
//     acessivel com scope youtube.readonly.
//
// Schemas zod no proprio arquivo: subset minimo das respostas reais.
// Erros e timeout seguem padrao do client Spotify (5s, 401 -> classe
// canonica YouTubeTokenExpiradoError).
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';

const BASE = 'https://www.googleapis.com/youtube/v3';
const TIMEOUT_MS = 5000;

// ===== Schemas zod =====

const ThumbnailSchema = z.object({
  url: z.string().url(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
});

const ThumbnailsSchema = z.object({
  default: ThumbnailSchema.optional(),
  medium: ThumbnailSchema.optional(),
  high: ThumbnailSchema.optional(),
  standard: ThumbnailSchema.optional(),
  maxres: ThumbnailSchema.optional(),
});

const PlaylistItemSnippetSchema = z.object({
  title: z.string(),
  channelTitle: z.string().optional(),
  videoOwnerChannelTitle: z.string().optional(),
  publishedAt: z.string().optional(),
  thumbnails: ThumbnailsSchema.optional(),
});

const PlaylistItemContentDetailsSchema = z.object({
  videoId: z.string(),
  videoPublishedAt: z.string().optional(),
});

const PlaylistItemSchema = z.object({
  id: z.string().optional(),
  snippet: PlaylistItemSnippetSchema,
  contentDetails: PlaylistItemContentDetailsSchema,
});

const PlaylistItemsResponseSchema = z.object({
  items: z.array(PlaylistItemSchema),
  nextPageToken: z.string().optional(),
});

// ===== Tipo publico canonico =====
//
// Shape que o client expoe (achatado para conveniencia do consumidor).
// Construido a partir de PlaylistItem; preserva videoId + titulo +
// thumbnail.url HQ + canal.
export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string | null;
  publishedAt: string | null;
  thumbnailUrl: string | null;
}

// ===== Erros =====

export class YouTubeTokenExpiradoError extends Error {
  constructor() {
    super('YouTube access token expirou.');
    this.name = 'YouTubeTokenExpiradoError';
  }
}

// Lancada quando Watch Later devolve 403 (Google restringe acesso WL
// para alguns scope/client setups). Caller deve tratar como "lista
// vazia + aviso".
export class YouTubeWatchLaterIndisponivelError extends Error {
  constructor() {
    super('Watch later indisponivel para este cliente.');
    this.name = 'YouTubeWatchLaterIndisponivelError';
  }
}

// ===== Fetch helper =====

async function getAutenticado(
  path: string,
  token: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(`${BASE}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    if (resp.status === 401) {
      throw new YouTubeTokenExpiradoError();
    }
    return resp;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Achata um PlaylistItem para o shape canonico YouTubeVideo.
// Escolhe a melhor thumbnail disponivel (high > medium > default).
function paraVideoCanonico(
  item: z.infer<typeof PlaylistItemSchema>
): YouTubeVideo {
  const t = item.snippet.thumbnails;
  const thumbnailUrl =
    t?.high?.url ?? t?.medium?.url ?? t?.default?.url ?? null;
  return {
    videoId: item.contentDetails.videoId,
    title: item.snippet.title,
    channelTitle:
      item.snippet.videoOwnerChannelTitle ??
      item.snippet.channelTitle ??
      null,
    publishedAt:
      item.contentDetails.videoPublishedAt ??
      item.snippet.publishedAt ??
      null,
    thumbnailUrl,
  };
}

// ===== Metodos canonicos =====

// Helper interno: lista items de uma playlist especial (LL ou WL).
async function listarPlaylistItems(
  playlistId: 'LL' | 'WL',
  token: string,
  limit: number
): Promise<YouTubeVideo[]> {
  const limitClamp = Math.max(1, Math.min(50, Math.floor(limit)));
  const resp = await getAutenticado(
    `/playlistItems?playlistId=${playlistId}&part=snippet,contentDetails&maxResults=${limitClamp}`,
    token
  );
  if (resp.status === 403 && playlistId === 'WL') {
    throw new YouTubeWatchLaterIndisponivelError();
  }
  if (!resp.ok) {
    const detalhe = await resp.text();
    throw new Error(`listarPlaylistItems ${playlistId} ${resp.status}: ${detalhe}`);
  }
  const json = (await resp.json()) as unknown;
  const parsed = PlaylistItemsResponseSchema.safeParse(json);
  if (!parsed.success) return [];
  return parsed.data.items.map(paraVideoCanonico);
}

// Videos curtidos. Sempre disponivel com youtube.readonly.
export async function getLiked(
  token: string,
  limit = 20
): Promise<YouTubeVideo[]> {
  return listarPlaylistItems('LL', token, limit);
}

// Watch later. Pode lancar YouTubeWatchLaterIndisponivelError em
// caso de 403. Caller decide se trata como erro ou apenas mostra
// "vazio + aviso".
export async function getWatchLater(
  token: string,
  limit = 20
): Promise<YouTubeVideo[]> {
  return listarPlaylistItems('WL', token, limit);
}

// Export schemas para testes determinarem shape parseado.
export const __testSchemas = {
  PlaylistItemSchema,
  PlaylistItemsResponseSchema,
};
