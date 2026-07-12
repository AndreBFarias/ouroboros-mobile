// M11.1 unit: gauntlet.adicionarFotoMock e no-op em ambiente onde
// GAUNTLET_ATIVO=false (Jest roda com Platform.OS='ios' por default).
//
// O caminho web/dev (insercao real na useGaleriaMock) e validado em
// browser pelo Gauntlet via E2E playwright; nao se reproduz aqui.
//
// Comentarios sem acento.
import { gauntlet } from '@/lib/dev/gauntlet';
import { useGaleriaMock } from '@/lib/dev/galeriaMock';

describe('gauntlet.adicionarFotoMock (M11.1)', () => {
  beforeEach(() => {
    useGaleriaMock.getState().limpar();
  });

  it('e no-op quando GAUNTLET_ATIVO=false (mobile/Jest)', async () => {
    await gauntlet.adicionarFotoMock();
    expect(useGaleriaMock.getState().fotos).toEqual([]);
  });

  it('reset() limpa galeria mock junto', async () => {
    // Mesmo em modo mobile, reset() filtra por GAUNTLET_ATIVO.
    // A store nao recebeu entrada nenhuma porque adicionarFotoMock
    // tambem e guardado. Smoke check: chamada nao explode.
    expect(() => gauntlet.reset()).not.toThrow();
    expect(useGaleriaMock.getState().fotos).toEqual([]);
  });
});
