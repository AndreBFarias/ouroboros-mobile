// M34 / I-FOTO (M-SAVE-FOTO-VALIDA, 2026-05-07): testes do helper
// capturarFoto. Cobre paths canonicos via vaultUriJoin (H1), galeria
// + camera (origem), vaultRoot ausente (throw), permissao negada,
// cancel do picker (no-op silencioso), jpg vs png por mimeType,
// trailing %20 SAF normalizado.
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

describe('capturarFoto (M34 / I-FOTO)', () => {
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

  // I-FOTO (2026-05-07): comportamento mudou — antes silenciava com
  // ok=false; agora throw para que caller exiba toast PT-BR explicito.
  it('lanca erro quando vaultRoot ausente', async () => {
    useVault.setState({ vaultRoot: null });
    await expect(capturarFoto()).rejects.toThrow(/Vault não conectado/);
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

  // I-FOTO: jpg detectado por mimeType image/jpeg -> arquivo em jpg/.
  it('em galeria com jpg, copia para jpg/ + companion em markdown/', async () => {
    permGaleriaSpy.mockResolvedValue({ granted: true });
    launchGaleriaSpy.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///origem/foto.jpg',
          mimeType: 'image/jpeg',
        },
      ],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarFoto({
      origem: 'galeria',
      para: { tipo: 'casal' },
      legenda: 'momento bom',
    });
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatch(/^jpg\/foto-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.jpg$/);
    expect(r.companion).toMatch(
      /^markdown\/foto-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.md$/
    );
    expect(copySpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledTimes(1);

    const copyArgs = copySpy.mock.calls[0][0] as { from: string; to: string };
    expect(copyArgs.from).toBe('file:///origem/foto.jpg');
    expect(copyArgs.to).toContain('/mock/vault/jpg/foto-');
    expect(copyArgs.to).toMatch(/\.jpg$/);

    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    const conteudo = writeArgs[1];
    expect(conteudo).toContain('tipo: midia_foto');
    expect(conteudo).toContain('autor: pessoa_a');
    expect(conteudo).toContain('para: casal');
    expect(conteudo).toContain('legenda: "momento bom"');
    // Companion path em markdown/, mesmo basename do binario.
    expect(writeArgs[0]).toContain('/mock/vault/markdown/foto-');
    expect(writeArgs[0]).toMatch(/\.md$/);
  });

  // I-FOTO: png detectado por mimeType image/png -> arquivo em png/.
  it('em galeria com png, copia para png/ + companion em markdown/', async () => {
    permGaleriaSpy.mockResolvedValue({ granted: true });
    launchGaleriaSpy.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'file:///origem/captura.png',
          mimeType: 'image/png',
        },
      ],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarFoto({ origem: 'galeria' });
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatch(/^png\/foto-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.png$/);
    expect(r.companion).toMatch(
      /^markdown\/foto-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.md$/
    );

    const copyArgs = copySpy.mock.calls[0][0] as { from: string; to: string };
    expect(copyArgs.to).toContain('/mock/vault/png/foto-');
    expect(copyArgs.to).toMatch(/\.png$/);

    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    expect(writeArgs[0]).toContain('/mock/vault/markdown/foto-');
    // Companion frontmatter aponta para basename .png.
    const basename = (r.arquivo ?? '').split('/').pop() ?? '';
    expect(writeArgs[1]).toContain(`arquivo: ${basename}`);
    expect(basename).toMatch(/\.png$/);
  });

  // I-FOTO: fallback por extensao do URI quando mimeType ausente.
  it('sem mimeType, usa extensao do URI como fallback', async () => {
    permGaleriaSpy.mockResolvedValue({ granted: true });
    launchGaleriaSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/imagem.png', mimeType: null }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarFoto({ origem: 'galeria' });
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatch(/^png\//);
  });

  it('em camera, usa requestCameraPermissions + launchCamera', async () => {
    permCamSpy.mockResolvedValue({ granted: true });
    launchCamSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cam/foto.jpg', mimeType: 'image/jpeg' }],
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

  it('retorna ok=false quando permissao da camera negada', async () => {
    permCamSpy.mockResolvedValue({ granted: false });
    const r = await capturarFoto({ origem: 'camera' });
    expect(r.ok).toBe(false);
    expect(launchCamSpy).not.toHaveBeenCalled();
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('silencia erro de copia em ok=false', async () => {
    permGaleriaSpy.mockResolvedValue({ granted: true });
    launchGaleriaSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/foto.jpg', mimeType: 'image/jpeg' }],
    });
    copySpy.mockRejectedValue(new Error('EACCES'));
    const r = await capturarFoto({ origem: 'galeria' });
    expect(r.ok).toBe(false);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  // I-FOTO: vaultUriJoin normaliza trailing whitespace + %20 ofensivo +
  // barras duplas. Espelha o teste equivalente em capturarVideo.test.ts
  // e saveEvento.test.ts.
  it('path final via vaultUriJoin remove trailing %20 e barra dupla', async () => {
    useVault.setState({
      vaultRoot: 'content://com.android.providers/tree/Test%20',
    });
    permGaleriaSpy.mockResolvedValue({ granted: true });
    launchGaleriaSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/foto.jpg', mimeType: 'image/jpeg' }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarFoto({ origem: 'galeria' });
    expect(r.ok).toBe(true);

    const copyArgs = copySpy.mock.calls[0][0] as { from: string; to: string };
    // Sem trailing %20 e sem barra dupla apos o host (ignora `//` do
    // esquema URI). Espelha asserts equivalentes de capturarVideo.test.
    const semEsquemaCopy = copyArgs.to.replace(/^[a-z]+:\/\//, '');
    expect(copyArgs.to).not.toMatch(/%20\//);
    expect(semEsquemaCopy).not.toMatch(/\/\//);
    expect(copyArgs.to).toMatch(
      /content:\/\/com\.android\.providers\/tree\/Test\/jpg\/foto-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.jpg$/
    );

    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    const semEsquemaWrite = writeArgs[0].replace(/^[a-z]+:\/\//, '');
    expect(writeArgs[0]).not.toMatch(/%20\//);
    expect(semEsquemaWrite).not.toMatch(/\/\//);
    expect(writeArgs[0]).toMatch(
      /content:\/\/com\.android\.providers\/tree\/Test\/markdown\/foto-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.md$/
    );
  });

  // I-FOTO: companion .md aponta para basename do binario (mesmo
  // basename, extensoes coerentes .jpg/.md ou .png/.md).
  it('companion frontmatter aponta para basename do binario', async () => {
    permGaleriaSpy.mockResolvedValue({ granted: true });
    launchGaleriaSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/foto.jpg', mimeType: 'image/jpeg' }],
    });
    copySpy.mockResolvedValue(undefined);
    writeSpy.mockResolvedValue(undefined);

    const r = await capturarFoto({ origem: 'galeria' });
    expect(r.ok).toBe(true);
    const basenameBin = (r.arquivo ?? '').split('/').pop() ?? '';
    expect(basenameBin).toMatch(/^foto-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.jpg$/);

    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    expect(writeArgs[1]).toContain(`arquivo: ${basenameBin}`);
  });
});
