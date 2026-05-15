// M34: testes do helper capturarMusica.
//   - vault ausente -> ok=false.
//   - cancel do picker -> ok=false.
//   - sucesso -> copia binario com extensao preservada + companion .md.
//   - extensao default 'm4a' quando picker nao informa name.
//   - silencia erro de copia em ok=false.
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';

jest.mock('expo-document-picker', () => ({
  __esModule: true,
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { capturarMusica } from '@/lib/midia/capturarMusica';

const pickSpy = DocumentPicker.getDocumentAsync as unknown as jest.Mock;
const copySpy = FileSystem.copyAsync as unknown as jest.Mock;
const writeSpy = FileSystem.writeAsStringAsync as unknown as jest.Mock;

describe('capturarMusica (M34)', () => {
  beforeEach(() => {
    pickSpy.mockReset();
    copySpy.mockReset();
    writeSpy.mockReset();
    useVault.setState({ vaultRoot: 'file:///mock/vault' });
    usePessoa.setState({ pessoaAtiva: 'pessoa_a' });
  });

  it('retorna ok=false quando vaultRoot ausente', async () => {
    useVault.setState({ vaultRoot: null });
    const r = await capturarMusica();
    expect(r.ok).toBe(false);
    expect(pickSpy).not.toHaveBeenCalled();
  });

  it('retorna ok=false quando picker cancelado', async () => {
    pickSpy.mockResolvedValue({ canceled: true });
    const r = await capturarMusica();
    expect(r.ok).toBe(false);
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('preserva extensao mp3 ao copiar e escreve companion', async () => {
    pickSpy.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///cache/track.mp3',
          name: 'minha-musica.mp3',
          mimeType: 'audio/mpeg',
        },
      ],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarMusica({ para: { tipo: 'mim' } });
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatch(
      /^m4a\/(audio-)?\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.mp3$/
    );
    expect(r.companion).toMatch(
      /^markdown\/(audio-)?\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.md$/
    );

    const copyArgs = copySpy.mock.calls[0][0] as { from: string; to: string };
    expect(copyArgs.from).toBe('file:///cache/track.mp3');
    expect(copyArgs.to).toMatch(/\.mp3$/);

    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    expect(writeArgs[1]).toContain('tipo: midia_audio');
    expect(writeArgs[1]).toContain('autor: pessoa_a');
    expect(writeArgs[1]).toContain('para: mim');
  });

  it('cai em extensao default m4a quando picker nao tem name', async () => {
    pickSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'content://media/track', name: undefined }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarMusica();
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatch(/\.m4a$/);
  });

  it('silencia erro de copia em ok=false', async () => {
    pickSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/x.mp3', name: 'x.mp3' }],
    });
    copySpy.mockRejectedValue(new Error('EACCES'));
    const r = await capturarMusica();
    expect(r.ok).toBe(false);
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
