// Schema canonico de resposta oEmbed (R-MEDIA-1). Cobre o subset
// pratico usado pelo app: titulo, thumbnail, autor e provider. Os
// dois endpoints suportados nesta sprint (YouTube e Spotify) seguem
// a especificacao oEmbed 1.0 (https://oembed.com/) e respeitam estes
// campos. Outros campos da resposta sao ignorados (forward-compat).
//
// Validacao defensiva: schema usa `.optional()` em campos que apenas
// um dos provedores devolve sempre. Isso evita falha quando YouTube
// muda o shape ou Spotify omite um campo deprecado.
//
// Comentarios em PT-BR com acentuacao completa (licao
// INFRA-acentuacao).
import { z } from 'zod';

// Schema da resposta oEmbed validada. Campos canonicos:
//   - title: titulo exibivel da midia.
//   - thumbnail_url: URL HTTPS para o cover.
//   - author_name: autor (canal no YouTube, artista no Spotify).
//   - provider_name: 'YouTube' ou 'Spotify'.
//   - html: bloco HTML embed (descartado em mobile, mantido como
//     opcional para forward-compat com sprints futuras).
export const OembedDataSchema = z.object({
  title: z.string().min(1),
  thumbnail_url: z.string().url(),
  author_name: z.string().optional(),
  provider_name: z.string(),
  html: z.string().optional(),
});

export type OembedData = z.infer<typeof OembedDataSchema>;

// Discriminador interno: qual provedor responde a URL. Determinado
// via regex em oembedClient.detectarServico. 'audio' nao usa oEmbed
// (arquivo local), mas o tipo precisa existir para o componente
// preview saber qual fallback renderizar.
export type ServicoMidia = 'youtube' | 'spotify' | 'audio' | 'desconhecido';
