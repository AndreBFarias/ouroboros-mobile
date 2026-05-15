// M34 / I-VIDEO (M-SAVE-VIDEO-VALIDA, 2026-05-07): testes do helper
// capturarVideo. Cobre paths canonicos via vaultUriJoin (H1),
// galeria + camera (origem), vaultRoot ausente (throw), permissao
// negada e cancel do picker (no-op silencioso).
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';

jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { capturarVideo } from '@/lib/midia/capturarVideo';

const permGalSpy =
  ImagePicker.requestMediaLibraryPermissionsAsync as unknown as jest.Mock;
const permCamSpy =
  ImagePicker.requestCameraPermissionsAsync as unknown as jest.Mock;
const launchGalSpy =
  ImagePicker.launchImageLibraryAsync as unknown as jest.Mock;
const launchCamSpy = ImagePicker.launchCameraAsync as unknown as jest.Mock;
const copySpy = FileSystem.copyAsync as unknown as jest.Mock;
const writeSpy = FileSystem.writeAsStringAsync as unknown as jest.Mock;

describe('capturarVideo (M34 / I-VIDEO)', () => {
  beforeEach(() => {
    permGalSpy.mockReset();
    permCamSpy.mockReset();
    launchGalSpy.mockReset();
    launchCamSpy.mockReset();
    copySpy.mockReset();
    writeSpy.mockReset();
    useVault.setState({ vaultRoot: 'file:///mock/vault' });
    usePessoa.setState({ pessoaAtiva: 'pessoa_b' });
  });

  // I-VIDEO (2026-05-07): comportamento mudou — antes silenciava com
  // ok=false; agora throw para que caller exiba toast PT-BR explicito.
  it('lanca erro quando vaultRoot ausente', async () => {
    useVault.setState({ vaultRoot: null });
    await expect(capturarVideo()).rejects.toThrow(/Vault não conectado/);
  });

  it('em galeria com sucesso copia mp4 + companion', async () => {
    permGalSpy.mockResolvedValue({ granted: true });
    launchGalSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/clip.mp4' }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarVideo({
      origem: 'galeria',
      para: { tipo: 'outra', pessoa: 'pessoa_a' },
    });
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatch(
      /^mp4\/video-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.mp4$/
    );
    expect(r.companion).toMatch(
      /^markdown\/video-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.md$/
    );
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledTimes(1);

    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    expect(writeArgs[1]).toContain('tipo: midia_video');
    expect(writeArgs[1]).toContain('autor: pessoa_b');
    expect(writeArgs[1]).toContain('para: outra:pessoa_a');
  });

  it('em camera, usa requestCameraPermissions + launchCamera', async () => {
    permCamSpy.mockResolvedValue({ granted: true });
    launchCamSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cam/clip.mp4' }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarVideo({ origem: 'camera' });
    expect(r.ok).toBe(true);
    expect(launchGalSpy).not.toHaveBeenCalled();
    expect(launchCamSpy).toHaveBeenCalledTimes(1);
  });

  it('retorna ok=false quando permissao da camera negada', async () => {
    permCamSpy.mockResolvedValue({ granted: false });
    const r = await capturarVideo({ origem: 'camera' });
    expect(r.ok).toBe(false);
    expect(launchCamSpy).not.toHaveBeenCalled();
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('cancel do picker -> ok=false', async () => {
    permGalSpy.mockResolvedValue({ granted: true });
    launchGalSpy.mockResolvedValue({ canceled: true, assets: [] });
    const r = await capturarVideo({ origem: 'galeria' });
    expect(r.ok).toBe(false);
    expect(copySpy).not.toHaveBeenCalled();
  });

  // I-VIDEO: vaultUriJoin normaliza trailing whitespace + %20 ofensivo +
  // barras duplas. Espelha o teste equivalente em saveEvento.test.ts.
  it('path final via vaultUriJoin remove trailing %20 e barra dupla', async () => {
    useVault.setState({
      vaultRoot: 'content://com.android.providers/tree/Vault%20',
    });
    permGalSpy.mockResolvedValue({ granted: true });
    launchGalSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/clip.mp4' }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarVideo({ origem: 'galeria' });
    expect(r.ok).toBe(true);

    const copyArgs = copySpy.mock.calls[0][0] as { from: string; to: string };
    // Sem trailing %20 e sem barra dupla apos o host (ignora `//`
    // do esquema URI). Espelha asserts equivalentes de saveEvento.test.
    const semEsquemaCopy = copyArgs.to.replace(/^[a-z]+:\/\//, '');
    expect(copyArgs.to).not.toMatch(/%20\//);
    expect(semEsquemaCopy).not.toMatch(/\/\//);
    expect(copyArgs.to).toMatch(
      /content:\/\/com\.android\.providers\/tree\/Vault\/mp4\/video-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.mp4$/
    );

    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    const semEsquemaWrite = writeArgs[0].replace(/^[a-z]+:\/\//, '');
    expect(writeArgs[0]).not.toMatch(/%20\//);
    expect(semEsquemaWrite).not.toMatch(/\/\//);
    expect(writeArgs[0]).toMatch(
      /content:\/\/com\.android\.providers\/tree\/Vault\/markdown\/video-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.md$/
    );
  });

  // I-VIDEO: companion .md aponta para basename do binario (mesmo
  // basename, extensoes .mp4/.md). Garante que o frontmatter `arquivo`
  // bate com o nome real do binario gravado.
  it('companion frontmatter aponta para basename do binario', async () => {
    permGalSpy.mockResolvedValue({ granted: true });
    launchGalSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/clip.mp4' }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarVideo({ origem: 'galeria' });
    expect(r.ok).toBe(true);
    const basenameBin = (r.arquivo ?? '').split('/').pop() ?? '';
    expect(basenameBin).toMatch(/^video-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.mp4$/);

    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    expect(writeArgs[1]).toContain(`arquivo: ${basenameBin}`);
  });
});
