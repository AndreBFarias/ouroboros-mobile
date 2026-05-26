// Camada de consumo da biblioteca Spotify para o picker de midia
// (R-INT-4-SPOTIFY-PICKER, 2026-05-25). Modelo "Google Fotos":
// quando a conta esta conectada, oferece navegar a biblioteca e
// escolher uma faixa em vez de colar URL.
//
// Reuso estrito: agrega getRecentlyPlayed + getTopTracks do client.ts
// (read-only, ja existentes). NAO recria fetch, NAO toca oauth/client.
// Token via useSpotifyAuth.getState().refreshIfNeeded() (refresh
// transparente). Sem token / erro de rede / 401 -> lista vazia (o
// caller cai no fallback de URL).
//
// Ordem do resultado: recently-played primeiro (mais recente no topo,
// preservando a ordem que a API devolve), depois top-tracks que ainda
// nao apareceram. Dedup por track_id mantendo a primeira ocorrencia.
//
// Rate limit: uma chamada de cada endpoint por invocacao; o caller
// chama listarFaixasParaPicker no maximo uma vez por abertura da aba.
//
// Comentarios sem acento (convencao shell/CI).
import {
  getRecentlyPlayed,
  getTopTracks,
  type SpotifyTrack,
} from '@/lib/integracoes/spotify/client';
import { useSpotifyAuth } from '@/lib/integracoes/spotify/store';

// Shape consumido pela UI do picker. Subset estavel de SpotifyTrack ja
// resolvido para os campos que MidiaSpotify precisa, mais capa/album
// para a linha visual.
export interface FaixaPicker {
  track_id: string;
  titulo: string;
  artista: string;
  album?: string;
  url?: string;
  capa?: string;
}

// Quantos itens puxar de cada endpoint. 20 e o default do client e
// cobre o caso de uso (lista navegavel curta) sem martelar a API.
const LIMITE_POR_FONTE = 20;

// Converte um SpotifyTrack cru no shape FaixaPicker. Artistas viram
// string unica separada por virgula; capa pega a primeira imagem do
// album (Spotify ordena da maior para a menor).
function mapearFaixa(track: SpotifyTrack): FaixaPicker {
  const artista = track.artists.map((a) => a.name).join(', ');
  const capa = track.album?.images?.[0]?.url;
  const url = track.external_urls?.spotify;
  return {
    track_id: track.id,
    titulo: track.name,
    artista,
    ...(track.album?.name ? { album: track.album.name } : {}),
    ...(url ? { url } : {}),
    ...(capa ? { capa } : {}),
  };
}

// Lista as faixas para o picker. Garante token valido via store; sem
// token retorna []. Falha de qualquer endpoint nao derruba o outro:
// usamos allSettled e ignoramos o que rejeitou (lista parcial e' melhor
// que lista vazia).
export async function listarFaixasParaPicker(): Promise<FaixaPicker[]> {
  const token = await useSpotifyAuth.getState().refreshIfNeeded();
  if (typeof token !== 'string' || token.length === 0) {
    return [];
  }

  const [recentes, top] = await Promise.allSettled([
    getRecentlyPlayed(token, LIMITE_POR_FONTE),
    getTopTracks(token, 'short_term', LIMITE_POR_FONTE),
  ]);

  const ordenadas: SpotifyTrack[] = [];
  if (recentes.status === 'fulfilled') ordenadas.push(...recentes.value);
  if (top.status === 'fulfilled') ordenadas.push(...top.value);

  // Dedup por track_id preservando a primeira ocorrencia (recencia).
  const vistos = new Set<string>();
  const resultado: FaixaPicker[] = [];
  for (const track of ordenadas) {
    if (vistos.has(track.id)) continue;
    vistos.add(track.id);
    resultado.push(mapearFaixa(track));
  }
  return resultado;
}
