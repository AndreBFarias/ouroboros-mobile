// M11.1 unit: helper adicionarFotoManual cobre 3 caminhos:
//   - mobile real com permissao+selecao -> copia para media/fotos/.
//   - mobile real com permissao negada -> false sem copiar.
//   - mobile real com cancel do picker -> false sem copiar.
//
// Caminho web/dev (GAUNTLET_ATIVO) e validado em E2E pelo Gauntlet
// (browser-only). Em Jest, Platform.OS === 'ios' por default e
// Platform.OS !== 'web' ja faz GAUNTLET_ATIVO ser falso, levando ao
// caminho mobile.
//
// Comentarios sem acento.
import { useVault } from '@/lib/stores/vault';

// expo-image-picker substituido por mocks declarativos. Os campos
// jest.fn() ficam acessiveis via require() apos o mock estar in
// place; assim evitamos referenciar variaveis externas no factory
// (regra do jest "out-of-scope variables").
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
import { adicionarFotoManual } from '@/lib/midia/adicionarFotoManual';

const permSpy = ImagePicker.requestMediaLibraryPermissionsAsync as unknown as jest.Mock;
const launchSpy = ImagePicker.launchImageLibraryAsync as unknown as jest.Mock;
const copySpy = FileSystem.copyAsync as unknown as jest.Mock;

describe('adicionarFotoManual (M11.1)', () => {
  beforeEach(() => {
    permSpy.mockReset();
    launchSpy.mockReset();
    copySpy.mockReset();
    useVault.setState({ vaultRoot: 'file:///mock/vault' });
  });

  it('retorna false quando vaultRoot nao definido', async () => {
    useVault.setState({ vaultRoot: null });
    const ok = await adicionarFotoManual();
    expect(ok).toBe(false);
    expect(permSpy).not.toHaveBeenCalled();
  });

  it('retorna false quando permissao negada', async () => {
    permSpy.mockResolvedValue({ granted: false });
    const ok = await adicionarFotoManual();
    expect(ok).toBe(false);
    expect(launchSpy).not.toHaveBeenCalled();
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('retorna false quando picker cancelado', async () => {
    permSpy.mockResolvedValue({ granted: true });
    launchSpy.mockResolvedValue({ canceled: true, assets: [] });
    const ok = await adicionarFotoManual();
    expect(ok).toBe(false);
    expect(copySpy).not.toHaveBeenCalled();
  });

  it('copia foto para jpg/ (H2 layout-por-tipo) quando selecionada e retorna true', async () => {
    permSpy.mockResolvedValue({ granted: true });
    launchSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/foto.jpg' }],
    });
    copySpy.mockResolvedValue(undefined);
    const ok = await adicionarFotoManual();
    expect(ok).toBe(true);
    expect(copySpy).toHaveBeenCalledTimes(1);
    const call = copySpy.mock.calls[0][0] as { from: string; to: string };
    expect(call.from).toBe('file:///origem/foto.jpg');
    expect(call.to).toMatch(
      /file:\/\/\/mock\/vault\/jpg\/foto-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.jpg/
    );
  });

  it('retorna false em erro de copia silenciado', async () => {
    permSpy.mockResolvedValue({ granted: true });
    launchSpy.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///origem/foto.jpg' }],
    });
    copySpy.mockRejectedValue(new Error('EACCES'));
    const ok = await adicionarFotoManual();
    expect(ok).toBe(false);
  });
});
