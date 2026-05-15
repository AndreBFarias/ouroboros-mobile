// T1B3: testa adicionarFotoManualDetalhado, versao discriminada que
// distingue permissao negada de cancel, erro, no_op, sem_vault.
// Callers futuros consomem isso e mostram toast especifico.
//
// Comentarios sem acento.
import { useVault } from '@/lib/stores/vault';

jest.mock('expo-image-picker', () => ({
  __esModule: true,
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: jest.fn(),
}));

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { adicionarFotoManualDetalhado } from '@/lib/midia/adicionarFotoManual';

const permSpy =
  ImagePicker.requestMediaLibraryPermissionsAsync as unknown as jest.Mock;
const launchSpy = ImagePicker.launchImageLibraryAsync as unknown as jest.Mock;
const copySpy = FileSystem.copyAsync as unknown as jest.Mock;

describe('adicionarFotoManualDetalhado (T1B3 discriminator)', () => {
  beforeEach(() => {
    permSpy.mockReset();
    launchSpy.mockReset();
    copySpy.mockReset();
    useVault.setState({ vaultRoot: 'file:///mock/vault' });
  });

  it('retorna razao=sem_vault quando vaultRoot nulo', async () => {
    useVault.setState({ vaultRoot: null });
    const out = await adicionarFotoManualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('sem_vault');
    expect(permSpy).not.toHaveBeenCalled();
  });

  it('retorna razao=permissao_negada quando permissao recusada', async () => {
    permSpy.mockResolvedValue({ granted: false });
    const out = await adicionarFotoManualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('permissao_negada');
    expect(launchSpy).not.toHaveBeenCalled();
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('retorna razao=cancelado quando picker cancelado', async () => {
    permSpy.mockResolvedValue({ granted: true });
    launchSpy.mockResolvedValue({ canceled: true, assets: [] });
    const out = await adicionarFotoManualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('cancelado');
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('retorna ok=true quando foto selecionada e copiada', async () => {
    permSpy.mockResolvedValue({ granted: true });
    launchSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/foto.jpg' }],
    });
    copySpy.mockResolvedValue(undefined);
    const out = await adicionarFotoManualDetalhado();
    expect(out.ok).toBe(true);
    expect(copySpy).toHaveBeenCalledTimes(1);
  });

  it('retorna razao=erro quando copia falha', async () => {
    permSpy.mockResolvedValue({ granted: true });
    launchSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/foto.jpg' }],
    });
    copySpy.mockRejectedValue(new Error('EACCES'));
    const out = await adicionarFotoManualDetalhado();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.razao).toBe('erro');
  });
});
