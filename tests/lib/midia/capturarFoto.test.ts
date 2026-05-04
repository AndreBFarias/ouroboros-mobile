// M34: testes do helper capturarFoto. Cobre os 4 caminhos:
//   - vault ausente -> ok=false sem chamar APIs.
//   - permissao negada (galeria) -> ok=false.
//   - cancel do picker -> ok=false.
//   - sucesso galeria -> copia binario + escreve companion .md.
//   - sucesso camera -> usa requestCameraPermissions + launchCamera.
//
// Path web/dev (GAUNTLET_ATIVO) e validado em E2E (Gauntlet web).
// Em Jest, Platform.OS === 'ios' por default; GAUNTLET_ATIVO falso.
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
import { capturarFoto } from '@/lib/midia/capturarFoto';

const permGaleriaSpy =
  ImagePicker.requestMediaLibraryPermissionsAsync as unknown as jest.Mock;
const permCamSpy =
  ImagePicker.requestCameraPermissionsAsync as unknown as jest.Mock;
const launchGaleriaSpy =
  ImagePicker.launchImageLibraryAsync as unknown as jest.Mock;
const launchCamSpy = ImagePicker.launchCameraAsync as unknown as jest.Mock;
const copySpy = FileSystem.copyAsync as unknown as jest.Mock;
const writeSpy = FileSystem.writeAsStringAsync as unknown as jest.Mock;

describe('capturarFoto (M34)', () => {
  beforeEach(() => {
    permGaleriaSpy.mockReset();
    permCamSpy.mockReset();
    launchGaleriaSpy.mockReset();
    launchCamSpy.mockReset();
    copySpy.mockReset();
    writeSpy.mockReset();
    useVault.setState({ vaultRoot: 'file:///mock/vault' });
    usePessoa.setState({ pessoaAtiva: 'pessoa_a' });
  });

  it('retorna ok=false quando vaultRoot ausente', async () => {
    useVault.setState({ vaultRoot: null });
    const r = await capturarFoto();
    expect(r.ok).toBe(false);
    expect(r.arquivo).toBeNull();
    expect(r.companion).toBeNull();
    expect(permGaleriaSpy).not.toHaveBeenCalled();
  });

  it('retorna ok=false quando permissao da galeria negada', async () => {
    permGaleriaSpy.mockResolvedValue({ granted: false });
    const r = await capturarFoto({ origem: 'galeria' });
    expect(r.ok).toBe(false);
    expect(launchGaleriaSpy).not.toHaveBeenCalled();
    expect(copySpy).not.toHaveBeenCalled();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('retorna ok=false quando picker cancelado', async () => {
    permGaleriaSpy.mockResolvedValue({ granted: true });
    launchGaleriaSpy.mockResolvedValue({ canceled: true, assets: [] });
    const r = await capturarFoto({ origem: 'galeria' });
    expect(r.ok).toBe(false);
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('em galeria com sucesso, copia binario e escreve companion', async () => {
    permGaleriaSpy.mockResolvedValue({ granted: true });
    launchGaleriaSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/foto.jpg' }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarFoto({
      origem: 'galeria',
      para: { tipo: 'casal' },
      legenda: 'momento bom',
    });
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatch(
      /^media\/fotos\/\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.jpg$/
    );
    expect(r.companion).toMatch(
      /^media\/fotos\/\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.md$/
    );
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledTimes(1);

    const copyArgs = copySpy.mock.calls[0][0] as { from: string; to: string };
    expect(copyArgs.from).toBe('file:///origem/foto.jpg');
    expect(copyArgs.to).toContain('/mock/vault/media/fotos/');

    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    const conteudo = writeArgs[1];
    expect(conteudo).toContain('tipo: midia_foto');
    expect(conteudo).toContain('autor: pessoa_a');
    expect(conteudo).toContain('para: casal');
    expect(conteudo).toContain('legenda: "momento bom"');
  });

  it('em camera, usa requestCameraPermissions + launchCamera', async () => {
    permCamSpy.mockResolvedValue({ granted: true });
    launchCamSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cam/foto.jpg' }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarFoto({ origem: 'camera' });
    expect(r.ok).toBe(true);
    expect(permGaleriaSpy).not.toHaveBeenCalled();
    expect(launchGaleriaSpy).not.toHaveBeenCalled();
    expect(launchCamSpy).toHaveBeenCalledTimes(1);
    expect(copySpy).toHaveBeenCalledTimes(1);
  });

  it('silencia erro de copia em ok=false', async () => {
    permGaleriaSpy.mockResolvedValue({ granted: true });
    launchGaleriaSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/foto.jpg' }],
    });
    copySpy.mockRejectedValue(new Error('EACCES'));
    const r = await capturarFoto({ origem: 'galeria' });
    expect(r.ok).toBe(false);
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
