// Fetch unico do oEmbed publico do Spotify para enriquecer midia
// com titulo e artista (campos 'title' e 'author_name'). Sem auth,
// sem token, sem PKCE -- contrato canonico da spec M07.x: zero
// rede recorrente, falha silenciosa quando offline.
//
// Endpoint: https://open.spotify.com/oembed?url=<link da musica>
// Resposta esperada (exemplo):
//   {
//     "title": "Bohemian Rhapsody - Remastered 2011",
//     "author_name": "Queen",
//     "thumbnail_url": "https://i.scdn.co/image/...",
//     ...
//   }
//
// Timeout 5s para nao travar UI quando rede esta lenta. Erro de
// rede / timeout / status nao-200 / JSON invalido devolve objeto
// vazio. Caller decide se persiste so com track_id ou se mostra
// fallback bonito.
const TIMEOUT_MS = 5000;
const ENDPOINT = 'https://open.spotify.com/oembed';

export interface SpotifyOEmbedResult {
  title?: string;
  author_name?: string;
}

export async function fetchSpotifyOEmbed(
  trackUrl: string
): Promise<SpotifyOEmbedResult> {
  if (typeof trackUrl !== 'string' || trackUrl.trim().length === 0) {
    return {};
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `${ENDPOINT}?url=${encodeURIComponent(trackUrl)}`;
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return {};

    const json = (await resp.json()) as Record<string, unknown>;
    const out: SpotifyOEmbedResult = {};
    if (typeof json.title === 'string' && json.title.length > 0) {
      out.title = json.title;
    }
    if (typeof json.author_name === 'string' && json.author_name.length > 0) {
      out.author_name = json.author_name;
    }
    return out;
  } catch {
    return {};
  } finally {
    clearTimeout(timeoutId);
  }
}
