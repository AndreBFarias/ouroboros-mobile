// Extrai o video_id de uma URL do YouTube. Aceita os tres formatos
// em uso na pratica:
//   - https://www.youtube.com/watch?v=<id>
//   - https://youtu.be/<id>
//   - https://www.youtube.com/shorts/<id>
//
// Aceita parametros adicionais (timestamp, list, feature) sem
// interferir. Retorna null quando a URL nao casa nenhum padrao;
// caller mostra micro caption red e nao adiciona ao array.
//
// Regex permissiva: aceita http e https, com ou sem 'www.', com ou
// sem 'm.' (mobile). O id do YouTube e [A-Za-z0-9_-]{11} mas
// aceitamos 10-12 caracteres para tolerar variacoes; validacao
// estrita fica para o saveDiario / saveEvento se necessario.
const YT_REGEX =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{10,12})/;

export function extractYouTubeId(url: string): string | null {
  if (typeof url !== 'string' || url.trim().length === 0) return null;
  const match = url.match(YT_REGEX);
  if (!match) return null;
  return match[1];
}

// Constroi URL de thumbnail HQ a partir do id. Sem chamada de rede;
// a CDN do YouTube serve hqdefault.jpg para qualquer video publico.
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
