// Cliente oEmbed unificado (R-MEDIA-1). Detecta servico (YouTube ou
// Spotify) e dispara GET unico contra o endpoint publico do provedor.
// Sem auth, sem token, sem retry -- failure mode: retornar null e
// deixar o UI mostrar fallback bonito com logo do servico.
//
// Endpoints:
//   - YouTube: https://www.youtube.com/oembed?url=<url>&format=json
//   - Spotify: https://open.spotify.com/oembed?url=<url>&format=json
//
// Decisao durable D2=A (R-MEDIA-1 _BACKLOG): exceção explicita a
// filosofia "sem rede de saida". GET unico anonimizavel; nenhum dado
// sai alem da propria URL que o usuario colou.
//
// Timeout: 5s para nao travar UI quando rede esta lenta. Erros de
// rede / timeout / status nao-200 / JSON invalido / Zod parse fail
// devolvem null. Caller decide entre fallback offline (logo + botao
// abrir externamente) ou nao renderizar nada.
//
// Reusa extratores existentes (extractYouTubeId, extractSpotifyTrackId)
// para detectar servico antes de gastar fetch.
//
// Comentarios em PT-BR com acentuacao completa (licao
// INFRA-acentuacao).
import { extractYouTubeId } from '@/lib/midia/youtubeId';
import { extractSpotifyTrackId } from '@/lib/midia/spotifyId';
import {
  OembedDataSchema,
  type OembedData,
  type ServicoMidia,
} from '@/lib/midia/oembedSchema';

const TIMEOUT_MS = 5000;
const YOUTUBE_OEMBED = 'https://www.youtube.com/oembed';
const SPOTIFY_OEMBED = 'https://open.spotify.com/oembed';

// Detecta servico a partir da URL. Reusa extratores existentes (regex
// canonica do M07.x) para nao duplicar logica. Retorna 'desconhecido'
// quando nenhum padrao casa -- caller pode escolher mostrar link cru
// ou esconder o item.
export function detectarServico(url: string): ServicoMidia {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return 'desconhecido';
  }
  // Audio local nao e URL -- detectado pelo caller via tipo.
  if (extractYouTubeId(url) !== null) return 'youtube';
  if (extractSpotifyTrackId(url) !== null) return 'spotify';
  // Spotify aceita tambem album/playlist nesta sprint; oEmbed publico
  // responde para qualquer link open.spotify.com/<tipo>/<id>.
  if (/spotify\.com\/(album|playlist|track)\//.test(url)) return 'spotify';
  return 'desconhecido';
}

// Fetch unico do oEmbed. Detecta servico, monta URL do endpoint,
// dispara GET com timeout via AbortController e valida via Zod.
// Erros de qualquer ordem (rede, timeout, status, parse) devolvem
// null sem propagar exception.
export async function fetchOembed(url: string): Promise<OembedData | null> {
  if (typeof url !== 'string' || url.trim().length === 0) return null;

  const servico = detectarServico(url);
  if (servico !== 'youtube' && servico !== 'spotify') return null;

  const endpoint = servico === 'youtube' ? YOUTUBE_OEMBED : SPOTIFY_OEMBED;
  const fetchUrl = `${endpoint}?url=${encodeURIComponent(url)}&format=json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(fetchUrl, { signal: controller.signal });
    if (!resp.ok) return null;
    const json = (await resp.json()) as unknown;
    const parsed = OembedDataSchema.safeParse(json);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
