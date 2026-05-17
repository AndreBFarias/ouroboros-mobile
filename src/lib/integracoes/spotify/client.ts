// Client da Spotify Web API (R-INT-4, 2026-05-17). Read-only,
// expoe 3 metodos canonicos para a v1:
//
//   - getNowPlaying(token): "tocando agora" no dashboard.
//   - getRecentlyPlayed(token, limit?): historico recente para Recap.
//   - getTopTracks(token, range?, limit?): top tracks (4 semanas, 6 meses).
//
// Schemas zod no proprio arquivo: subset minimo das respostas reais
// da Web API; campos extras sao strippados (forward-compat). Cada
// metodo:
//   - GET autenticado via Bearer token (Authorization header).
//   - Timeout 5s via AbortController (igual oembedClient).
//   - Status 204 (sem conteudo) em getNowPlaying -> retorna null.
//   - Status 401 -> lanca TokenExpiradoError (caller tenta refresh).
//   - Outros erros -> lanca Error com detalhe pra debug.
//
// Nada e' cacheado neste nivel; o store decide se persiste resultado
// (Recap usa cache em disco; dashboard "tocando agora" sempre fresh).
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';

const BASE = 'https://api.spotify.com/v1';
const TIMEOUT_MS = 5000;

// ===== Schemas zod =====
//
// Subset do shape oficial. Campos opcionais com .optional() para
// tolerar variacoes (deprecation futura, conta sem foto, etc).

const SpotifyImageSchema = z.object({
  url: z.string().url(),
  height: z.number().int().nullable().optional(),
  width: z.number().int().nullable().optional(),
});

const SpotifyArtistRefSchema = z.object({
  name: z.string(),
  id: z.string().optional(),
});

const SpotifyAlbumRefSchema = z.object({
  name: z.string(),
  images: z.array(SpotifyImageSchema).optional(),
});

const SpotifyTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  artists: z.array(SpotifyArtistRefSchema),
  album: SpotifyAlbumRefSchema.optional(),
  duration_ms: z.number().int().optional(),
  external_urls: z
    .object({
      spotify: z.string().url().optional(),
    })
    .optional(),
});

export type SpotifyTrack = z.infer<typeof SpotifyTrackSchema>;

// /me/player/currently-playing: envelope com `item` + `is_playing`.
// Quando nenhum player ativo, Spotify retorna 204 No Content; o caller
// devolve null em vez de tentar parsear body vazio.
const NowPlayingSchema = z.object({
  item: SpotifyTrackSchema.nullable(),
  is_playing: z.boolean().optional(),
  progress_ms: z.number().int().nullable().optional(),
});

export type SpotifyNowPlaying = z.infer<typeof NowPlayingSchema>;

// /me/player/recently-played: envelope com `items[].track`.
const RecentlyPlayedSchema = z.object({
  items: z.array(
    z.object({
      track: SpotifyTrackSchema,
      played_at: z.string().optional(),
    })
  ),
});

export type SpotifyRecentlyPlayed = z.infer<typeof RecentlyPlayedSchema>;

// /me/top/tracks: envelope com `items[]` -- tracks diretamente, sem
// nivel `track` intermediario.
const TopTracksSchema = z.object({
  items: z.array(SpotifyTrackSchema),
});

export type SpotifyTopTracks = z.infer<typeof TopTracksSchema>;

// Ranges aceitos pela Web API. 'short' = 4 semanas, 'medium' = 6 meses,
// 'long' = todo o historico da conta.
export type SpotifyTimeRange = 'short_term' | 'medium_term' | 'long_term';

// ===== Erros =====

// Lancado em 401 (Unauthorized). Caller refresha token e tenta de novo.
export class SpotifyTokenExpiradoError extends Error {
  constructor() {
    super('Spotify access token expirou.');
    this.name = 'SpotifyTokenExpiradoError';
  }
}

// ===== Fetch helper =====
//
// GET autenticado generico. Aplica timeout, valida 401 -> erro
// canonico, devolve body json para parse pelo caller.
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
      throw new SpotifyTokenExpiradoError();
    }
    return resp;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===== Metodos canonicos =====

// "Tocando agora". Retorna null quando:
//   - Status 204 (nenhum player ativo).
//   - item == null (paused com track limpa).
//
// Lanca SpotifyTokenExpiradoError em 401 (caller refresha).
// Lanca Error generico em outros status >= 400.
export async function getNowPlaying(
  token: string
): Promise<SpotifyTrack | null> {
  const resp = await getAutenticado('/me/player/currently-playing', token);
  if (resp.status === 204) return null;
  if (!resp.ok) {
    const detalhe = await resp.text();
    throw new Error(`getNowPlaying ${resp.status}: ${detalhe}`);
  }
  const json = (await resp.json()) as unknown;
  const parsed = NowPlayingSchema.safeParse(json);
  if (!parsed.success) return null;
  if (parsed.data.item === null) return null;
  return parsed.data.item;
}

// Historico recente. Spotify aceita limit ate 50; default 20.
// Resposta pode vir com items vazio quando conta nunca tocou nada.
export async function getRecentlyPlayed(
  token: string,
  limit = 20
): Promise<SpotifyTrack[]> {
  const limitClamp = Math.max(1, Math.min(50, Math.floor(limit)));
  const resp = await getAutenticado(
    `/me/player/recently-played?limit=${limitClamp}`,
    token
  );
  if (!resp.ok) {
    const detalhe = await resp.text();
    throw new Error(`getRecentlyPlayed ${resp.status}: ${detalhe}`);
  }
  const json = (await resp.json()) as unknown;
  const parsed = RecentlyPlayedSchema.safeParse(json);
  if (!parsed.success) return [];
  return parsed.data.items.map((i) => i.track);
}

// Top tracks. range default 'short_term' (4 semanas), limit default 20
// (ate 50). Sem cursor; Spotify oferece offset, mas v1 nao precisa.
export async function getTopTracks(
  token: string,
  range: SpotifyTimeRange = 'short_term',
  limit = 20
): Promise<SpotifyTrack[]> {
  const limitClamp = Math.max(1, Math.min(50, Math.floor(limit)));
  const resp = await getAutenticado(
    `/me/top/tracks?time_range=${range}&limit=${limitClamp}`,
    token
  );
  if (!resp.ok) {
    const detalhe = await resp.text();
    throw new Error(`getTopTracks ${resp.status}: ${detalhe}`);
  }
  const json = (await resp.json()) as unknown;
  const parsed = TopTracksSchema.safeParse(json);
  if (!parsed.success) return [];
  return parsed.data.items;
}

// Export schemas para testes determinarem shape parseado.
export const __testSchemas = {
  SpotifyTrackSchema,
  NowPlayingSchema,
  RecentlyPlayedSchema,
  TopTracksSchema,
};
