// Testes do MidiaSchema discriminatedUnion (M07.x). Cobre os 4
// tipos: spotify, youtube, foto, audio. Cada um aceita seus campos
// canonicos e rejeita estranhos. Garante que o discriminator 'tipo'
// pega o variant certo e que campos opcionais ficam undefined sem
// quebrar parse.
import {
  MidiaSchema,
  MidiaSpotifySchema,
  MidiaYoutubeSchema,
  MidiaFotoSchema,
  MidiaAudioSchema,
} from '@/lib/schemas/midia';

describe('MidiaSchema discriminatedUnion', () => {
  it('aceita midia spotify completa', () => {
    const out = MidiaSchema.parse({
      tipo: 'spotify',
      track_id: '4u7EnebtmKWzUH433cf5Qv',
      titulo: 'Bohemian Rhapsody',
      artista: 'Queen',
    });
    expect(out.tipo).toBe('spotify');
    if (out.tipo === 'spotify') {
      expect(out.track_id).toBe('4u7EnebtmKWzUH433cf5Qv');
      expect(out.titulo).toBe('Bohemian Rhapsody');
    }
  });

  it('aceita midia spotify minima (so tipo + track_id)', () => {
    const out = MidiaSpotifySchema.parse({
      tipo: 'spotify',
      track_id: 'abc123',
    });
    expect(out.titulo).toBeUndefined();
    expect(out.artista).toBeUndefined();
  });

  it('aceita midia youtube com thumbnail derivada', () => {
    const out = MidiaSchema.parse({
      tipo: 'youtube',
      video_id: 'dQw4w9WgXcQ',
      thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    });
    expect(out.tipo).toBe('youtube');
    if (out.tipo === 'youtube') {
      expect(out.video_id).toBe('dQw4w9WgXcQ');
    }
  });

  it('aceita midia foto com path relativo', () => {
    const out = MidiaFotoSchema.parse({
      tipo: 'foto',
      path: 'assets/2026-04-29-1845-conquista-3f2a.jpg',
    });
    expect(out.path.startsWith('assets/')).toBe(true);
  });

  it('aceita midia audio com duracao opcional', () => {
    const com = MidiaAudioSchema.parse({
      tipo: 'audio',
      path: 'assets/2026-04-29-1845-3f2a.m4a',
      duracao_seg: 12.5,
    });
    expect(com.duracao_seg).toBe(12.5);
    const sem = MidiaAudioSchema.parse({
      tipo: 'audio',
      path: 'assets/2026-04-29-1845-3f2a.m4a',
    });
    expect(sem.duracao_seg).toBeUndefined();
  });

  it('rejeita tipo desconhecido no discriminator', () => {
    expect(() =>
      MidiaSchema.parse({ tipo: 'tiktok', track_id: 'abc' })
    ).toThrow();
  });

  it('rejeita midia spotify sem track_id', () => {
    expect(() => MidiaSpotifySchema.parse({ tipo: 'spotify' })).toThrow();
  });

  it('rejeita midia foto com path vazio', () => {
    expect(() => MidiaFotoSchema.parse({ tipo: 'foto', path: '' })).toThrow();
  });

  it('rejeita youtube com video_id vazio', () => {
    expect(() =>
      MidiaYoutubeSchema.parse({ tipo: 'youtube', video_id: '' })
    ).toThrow();
  });

  it('rejeita audio com duracao zero ou negativa', () => {
    expect(() =>
      MidiaAudioSchema.parse({
        tipo: 'audio',
        path: 'a.m4a',
        duracao_seg: 0,
      })
    ).toThrow();
    expect(() =>
      MidiaAudioSchema.parse({
        tipo: 'audio',
        path: 'a.m4a',
        duracao_seg: -1,
      })
    ).toThrow();
  });
});
