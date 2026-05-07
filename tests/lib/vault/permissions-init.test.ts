// Testes de inicializarVaultCanonico (M22). Cobre:
//  - Web cai em no-op produtivo (URI mock + criado=false + modo 'web').
//  - Android API <30: pede WRITE_EXTERNAL_STORAGE via PermissionsAndroid.
//  - Android API >=30: dispara Intent MANAGE_APP_ALL_FILES_ACCESS_PERMISSION.
//  - garantirSubpastas e idempotente: chamar duas vezes nao falha.
//  - probe write+read+delete confirma permissao funcional (modo 'auto').
//  - probe falhando cai em fallback SAF (modo 'saf-fallback').
//  - SAF tambem negado lanca erro.
//
// Mocks: react-native (Platform), PermissionsAndroid, expo-intent-launcher,
// expo-file-system/legacy. Defaults vem de jest.setup.cjs; cada teste
// sobrescreve so o que precisa via jest.requireMock + mockImplementationOnce.
// O preset jest-expo intercepta react-native; PermissionsAndroid e
// resolvido pelo mock interno do preset, entao importamos via require()
// no momento do teste para pegar a referencia atual ja decorada.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';

import {
  inicializarVaultCanonico,
  garantirSubpastas,
  pedirPermissaoStorage,
  SUBPASTAS_CANONICAS,
  VAULT_CANONICO_URI,
} from '@/lib/vault/permissions';
import { useVault } from '@/lib/stores/vault';

// PermissionsAndroid vem do mock interno do preset jest-expo. require()
// devolve o objeto mockado com PERMISSIONS.WRITE_EXTERNAL_STORAGE e
// request stub. Centralizado em helper para uso consistente.
function getPermissionsAndroid() {
  const rn = require('react-native');
  return rn.PermissionsAndroid as {
    request: jest.Mock;
    PERMISSIONS: { WRITE_EXTERNAL_STORAGE: string };
  };
}

type FsMockShape = typeof FileSystem & {
  __memory?: Map<string, string>;
  __dirs?: Set<string>;
};

function getFsMemory(): Map<string, string> {
  const fs = FileSystem as FsMockShape;
  if (!fs.__memory) {
    throw new Error('jest.setup.cjs deve expor __memory no mock de expo-file-system/legacy');
  }
  return fs.__memory;
}

function getFsDirs(): Set<string> {
  const fs = FileSystem as FsMockShape;
  if (!fs.__dirs) {
    throw new Error('jest.setup.cjs deve expor __dirs no mock de expo-file-system/legacy');
  }
  return fs.__dirs;
}

// Helper para trocar Platform.OS / Version dentro do bloco de cada teste
// sem vazar o estado para outros suites.
function setPlatform(os: 'web' | 'android' | 'ios', version: number) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
}

const ORIGINAL_OS = Platform.OS;
const ORIGINAL_VERSION = Platform.Version;

describe('inicializarVaultCanonico', () => {
  beforeEach(() => {
    getFsMemory().clear();
    getFsDirs().clear();
    useVault.getState().clearVaultRoot();
    jest.clearAllMocks();
  });

  afterEach(() => {
    setPlatform(ORIGINAL_OS as 'web' | 'android' | 'ios', ORIGINAL_VERSION as number);
  });

  it('em web devolve mock URI sem tocar FileSystem', async () => {
    setPlatform('web', 0);
    const result = await inicializarVaultCanonico();
    expect(result.modo).toBe('web');
    expect(result.criado).toBe(false);
    expect(result.vaultRoot).toMatch(/^web:\/\/mock-vault\//);
    expect(useVault.getState().vaultRoot).toBe(result.vaultRoot);
    expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });

  it('em Android API >=30 dispara Intent MANAGE_EXTERNAL_STORAGE e cria subpastas', async () => {
    setPlatform('android', 33);
    const result = await inicializarVaultCanonico();
    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith(
      'android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION',
      expect.objectContaining({ data: 'package:com.ouroboros.mobile' })
    );
    expect(getPermissionsAndroid().request).not.toHaveBeenCalled();
    expect(result.modo).toBe('auto');
    expect(result.criado).toBe(true);
    expect(result.vaultRoot).toBe(VAULT_CANONICO_URI);
    expect(useVault.getState().vaultRoot).toBe(VAULT_CANONICO_URI);
  });

  it('em Android API <30 pede WRITE_EXTERNAL_STORAGE via PermissionsAndroid', async () => {
    setPlatform('android', 28);
    const result = await inicializarVaultCanonico();
    expect(getPermissionsAndroid().request).toHaveBeenCalledWith(
      'android.permission.WRITE_EXTERNAL_STORAGE'
    );
    expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
    expect(result.modo).toBe('auto');
  });

  it('cria todas as 8 subpastas canonicas no boot (H2 layout-por-tipo)', async () => {
    setPlatform('android', 33);
    await inicializarVaultCanonico();
    // garantirSubpastas chamou makeDirectoryAsync uma vez por subpasta
    // (intermediates: true). Pode ser >= se houve tentativa do fallback,
    // mas no caminho 'auto' espera-se exato a contagem da constante.
    expect(SUBPASTAS_CANONICAS.length).toBe(8);
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(8);
    SUBPASTAS_CANONICAS.forEach((sub) => {
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        `${VAULT_CANONICO_URI}${sub}`,
        { intermediates: true }
      );
    });
  });

  it('garantirSubpastas e idempotente: rodar duas vezes nao lanca', async () => {
    setPlatform('android', 33);
    await garantirSubpastas(VAULT_CANONICO_URI);
    await expect(
      garantirSubpastas(VAULT_CANONICO_URI)
    ).resolves.toBeUndefined();
  });

  it('garantirSubpastas em web vira no-op silencioso', async () => {
    setPlatform('web', 0);
    await garantirSubpastas('web://mock/');
    expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
  });

  it('quando probe falha cai em fallback SAF e marca modo saf-fallback', async () => {
    setPlatform('android', 33);
    const writeMock = FileSystem.writeAsStringAsync as jest.Mock;
    // Primeira tentativa: probe write em /sdcard/ falha (OEM agressivo).
    // Demais escritas (no SAF URI) seguem o default e gravam em memoria.
    writeMock.mockImplementationOnce(() => Promise.reject(new Error('EACCES')));

    const result = await inicializarVaultCanonico();
    expect(result.modo).toBe('saf-fallback');
    expect(result.criado).toBe(true);
    expect(result.vaultRoot).toMatch(/^content:\/\/com\.android\.externalstorage/);
    expect(useVault.getState().vaultRoot).toBe(result.vaultRoot);
  });

  it('quando probe falha e SAF e cancelado lanca erro descritivo', async () => {
    setPlatform('android', 33);
    const writeMock = FileSystem.writeAsStringAsync as jest.Mock;
    writeMock.mockImplementationOnce(() => Promise.reject(new Error('EACCES')));
    // SAF tambem negado pelo usuario.
    (FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      granted: false,
      directoryUri: '',
    });

    await expect(inicializarVaultCanonico()).rejects.toThrow(
      /storage permission denied/
    );
    expect(useVault.getState().vaultRoot).toBeNull();
  });

  it('probe escreve, le e deleta o arquivo .ouroboros-probe', async () => {
    setPlatform('android', 33);
    await inicializarVaultCanonico();
    const probeUri = `${VAULT_CANONICO_URI}.ouroboros-probe`;
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(probeUri, 'ok');
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(probeUri);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(probeUri, {
      idempotent: true,
    });
    // Memoria nao deve manter o probe apos o ciclo.
    expect(getFsMemory().has(probeUri)).toBe(false);
  });
});

describe('pedirPermissaoStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    setPlatform(ORIGINAL_OS as 'web' | 'android' | 'ios', ORIGINAL_VERSION as number);
  });

  it('em iOS vira no-op', async () => {
    setPlatform('ios', 17);
    await pedirPermissaoStorage();
    expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
    expect(getPermissionsAndroid().request).not.toHaveBeenCalled();
  });

  it('em web vira no-op', async () => {
    setPlatform('web', 0);
    await pedirPermissaoStorage();
    expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
    expect(getPermissionsAndroid().request).not.toHaveBeenCalled();
  });

  it('engole erro do IntentLauncher e nao propaga', async () => {
    setPlatform('android', 33);
    (IntentLauncher.startActivityAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Activity not found')
    );
    await expect(pedirPermissaoStorage()).resolves.toBeUndefined();
  });

  it('engole erro do PermissionsAndroid e nao propaga', async () => {
    setPlatform('android', 28);
    (getPermissionsAndroid().request as jest.Mock).mockRejectedValueOnce(
      new Error('User denied')
    );
    await expect(pedirPermissaoStorage()).resolves.toBeUndefined();
  });
});

describe('SUBPASTAS_CANONICAS (H2 layout-por-tipo, ADR-0023)', () => {
  it('inclui as pastas canonicas por tipo de arquivo', () => {
    expect(SUBPASTAS_CANONICAS).toEqual(
      expect.arrayContaining([
        'markdown',
        'png',
        'jpg',
        'm4a',
        'mp4',
        'pdf',
        'gif',
        '.ouroboros/cache',
      ])
    );
  });
});
