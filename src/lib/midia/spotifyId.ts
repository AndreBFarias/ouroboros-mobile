// Extrai o track_id de uma URL do Spotify. Aceita formato canonico
//   https://open.spotify.com/track/<id>
// com ou sem query string (?si=...) e com prefixo de regiao
// opcional (intl-pt/, intl-en/). Outros tipos (album, playlist,
// artist) nao sao aceitos nesta sprint; caller mostra micro caption
// red. Retorna null quando nao casa.
//
// Track id do Spotify: 22 chars base62 [A-Za-z0-9]. Mantemos a
// regex tolerante (1+) para nao bloquear ids de tamanho diferente
// caso o Spotify mude o formato; validacao estrita fica para o
// saveDiario / saveEvento se necessario.
const SP_REGEX =
  /spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]+)/;

export function extractSpotifyTrackId(url: string): string | null {
  if (typeof url !== 'string' || url.trim().length === 0) return null;
  const match = url.match(SP_REGEX);
  if (!match) return null;
  return match[1];
}
