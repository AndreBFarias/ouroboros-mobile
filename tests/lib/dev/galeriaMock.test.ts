// M11.1 unit: store auxiliar useGaleriaMock garante adicao em LIFO
// (mais recente primeiro) e idempotencia do limpar().
//
// Comentarios sem acento.
import { useGaleriaMock } from '@/lib/dev/galeriaMock';

describe('useGaleriaMock (M11.1)', () => {
  beforeEach(() => {
    useGaleriaMock.getState().limpar();
  });

  it('inicia com lista vazia', () => {
    expect(useGaleriaMock.getState().fotos).toEqual([]);
  });

  it('adicionar insere no inicio (LIFO)', () => {
    const a = {
      uri: 'a',
      data: '2026-05-01',
      origemPath: 'p/a',
      origemSlug: 'a',
    };
    const b = {
      uri: 'b',
      data: '2026-05-02',
      origemPath: 'p/b',
      origemSlug: 'b',
    };
    useGaleriaMock.getState().adicionar(a);
    useGaleriaMock.getState().adicionar(b);
    const fotos = useGaleriaMock.getState().fotos;
    expect(fotos.length).toBe(2);
    expect(fotos[0]).toEqual(b);
    expect(fotos[1]).toEqual(a);
  });

  it('limpar zera independente de quantas entradas', () => {
    useGaleriaMock.getState().adicionar({
      uri: 'x',
      data: '2026-05-03',
      origemPath: 'p/x',
      origemSlug: 'x',
    });
    useGaleriaMock.getState().limpar();
    expect(useGaleriaMock.getState().fotos).toEqual([]);
  });
});
