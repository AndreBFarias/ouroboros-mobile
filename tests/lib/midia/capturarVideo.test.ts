// M34: testes do helper capturarVideo (galeria + camera).
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

describe('capturarVideo (M34)', () => {
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

  it('retorna ok=false quando vaultRoot ausente', async () => {
    useVault.setState({ vaultRoot: null });
    const r = await capturarVideo();
    expect(r.ok).toBe(false);
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
      /^media\/videos\/\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.mp4$/
    );
    expect(r.companion).toMatch(
      /^media\/videos\/\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.md$/
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
});
