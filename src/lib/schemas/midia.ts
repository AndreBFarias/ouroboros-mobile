// Schema canonico de midia anexada a registros (M07.x). Quatro
// tipos suportados via discriminatedUnion no campo 'tipo':
//   - spotify: link de musica colado pelo usuario; track_id
//     extraido via regex; titulo/artista vindos de oEmbed sem auth.
//   - youtube: link de video; video_id extraido via regex que aceita
//     watch?v=, youtu.be/ e shorts/. Thumbnail derivada do id sem
//     chamada de rede.
//   - foto: imagem da galeria ou camera, copiada para assets/ no
//     formato YYYY-MM-DD-HHmm-conquista-<idx>.jpg.
//   - audio: gravacao on-device via pipeline da M06.5; salva em
//     assets/ no formato .m4a com duracao em segundos.
//
// Mobile so escreve este shape; desktop le e renderiza covers em
// M11.5 (calendario visual). Caller que monta meta de diario ou
// evento embute Midia[] em meta.midia, dai o refine condicional
// dos schemas pais bloqueia save quando obrigatorio (vitoria/positivo)
// e o array vier vazio.
import { z } from 'zod';

export const MidiaSpotifySchema = z.object({
  tipo: z.literal('spotify'),
  track_id: z.string().min(1),
  titulo: z.string().optional(),
  artista: z.string().optional(),
  url_oembed: z.string().url().optional(),
});
export type MidiaSpotify = z.infer<typeof MidiaSpotifySchema>;

export const MidiaYoutubeSchema = z.object({
  tipo: z.literal('youtube'),
  video_id: z.string().min(1),
  titulo: z.string().optional(),
  thumbnail_url: z.string().url().optional(),
});
export type MidiaYoutube = z.infer<typeof MidiaYoutubeSchema>;

export const MidiaFotoSchema = z.object({
  tipo: z.literal('foto'),
  path: z.string().min(1),
});
export type MidiaFoto = z.infer<typeof MidiaFotoSchema>;

export const MidiaAudioSchema = z.object({
  tipo: z.literal('audio'),
  path: z.string().min(1),
  duracao_seg: z.number().positive().optional(),
});
export type MidiaAudio = z.infer<typeof MidiaAudioSchema>;

export const MidiaSchema = z.discriminatedUnion('tipo', [
  MidiaSpotifySchema,
  MidiaYoutubeSchema,
  MidiaFotoSchema,
  MidiaAudioSchema,
]);

export type Midia = z.infer<typeof MidiaSchema>;
