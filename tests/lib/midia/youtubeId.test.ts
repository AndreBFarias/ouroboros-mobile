// Testes da extracao de video_id do YouTube (M07.x). Cobre os
// tres formatos canonicos em uso: watch?v=, youtu.be/, shorts/.
import {
  extractYouTubeId,
  youtubeThumbnailUrl,
} from '@/lib/midia/youtubeId';

describe('extractYouTubeId', () => {
  it('extrai id de watch?v=', () => {
    expect(
      extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    ).toBe('dQw4w9WgXcQ');
  });

  it('extrai id de watch?v= com parametros adicionais', () => {
    expect(
      extractYouTubeId(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=ABC'
      )
    ).toBe('dQw4w9WgXcQ');
  });

  it('extrai id de youtu.be/', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('extrai id de youtu.be/ com timestamp', () => {
    expect(
      extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=42')
    ).toBe('dQw4w9WgXcQ');
  });

  it('extrai id de shorts/', () => {
    expect(
      extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')
    ).toBe('dQw4w9WgXcQ');
  });

  it('retorna null para link nao-youtube', () => {
    expect(extractYouTubeId('https://vimeo.com/12345678')).toBeNull();
  });

  it('retorna null para string vazia', () => {
    expect(extractYouTubeId('')).toBeNull();
  });

  it('retorna null para input nao-string', () => {
    expect(extractYouTubeId(null as unknown as string)).toBeNull();
    expect(extractYouTubeId(undefined as unknown as string)).toBeNull();
  });
});

describe('youtubeThumbnailUrl', () => {
  it('monta URL de hqdefault com base no id', () => {
    expect(youtubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });
});
