// Testes de inicializarVaultEscolhido (H3, M-VAULT-PASTA-NAO-HARDCODED,
// ADR-0022). Cobre:
//  - Web cai em no-op produtivo (URI mock + criado=false + modo 'web').
//  - Android: URI sugestao default (file://) cria 8 subpastas e
//    reporta modo 'auto'.
//  - Android: URI SAF (content://) cria 8 subpastas e reporta modo
//    'saf-fallback'.
//  - URI vazia lanca erro descritivo.
//  - Idempotencia: chamar 2x com mesma URI nao quebra (probe + dirs
//    se mantem).
//  - probe escreve, le e deleta o arquivo .ouroboros-probe.
//  - probe falhando lanca erro descritivo (caller decide proximo
//    passo: SAF picker em fluxo H3 separado).
//  - garantirSubpastas em web vira no-op silencioso.
//
// pedirPermissaoStorage continua identico ao M22 (sem alteracoes em
// H3); cobertura de iOS/web/android/erro mantida.
//
// Mocks: react-native (Platform), PermissionsAndroid, expo-intent-launcher,
// expo-file-system/legacy. Defaults vem de jest.setup.cjs; cada teste
// sobrescreve so o que precisa via jest.requireMock + mockImplementationOnce.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';

import {
  inicializarVaultEscolhido,
  garantirSubpastas,
  pedirPermissaoStorage,
  sugestaoVaultPathDefault,
  sugestaoVaultUriDefault,
  SUBPASTAS_CANONICAS,
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
    throw new Error(
      'jest.setup.cjs deve expor __memory no mock de expo-file-system/legacy'
    );
  }
  return fs.__memory;
}

function getFsDirs(): Set<string> {
  const fs = FileSystem as FsMockShape;
  if (!fs.__dirs) {
    throw new Error(
      'jest.setup.cjs deve expor __dirs no mock de expo-file-system/legacy'
    );
  }
  return fs.__dirs;
}

// Helper para trocar Platform.OS / Version dentro do bloco de cada teste
// sem vazar o estado para outros suites.
function setPlatform(os: 'web' | 'android' | 'ios', version: number) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
  Object.defineProperty(Platform, 'Version', {
    value: version,
    configurable: true,
  });
}

const ORIGINAL_OS = Platform.OS;
const ORIGINAL_VERSION = Platform.Version;

const SUGESTAO_URI = sugestaoVaultUriDefault();
const SAF_URI =
  'content://com.android.externalstorage.documents/tree/primary%3ADownload';

describe('sugestaoVaultPathDefault / sugestaoVaultUriDefault', () => {
  it('path default e /sdcard/Ouroboros/', () => {
    expect(sugestaoVaultPathDefault()).toBe('/mock/documents/Ouroboros/');
  });

  it('uri default e file://${path}', () => {
    expect(sugestaoVaultUriDefault()).toBe('file:///mock/documents/Ouroboros/');
  });
});

describe('inicializarVaultEscolhido (H3)', () => {
  beforeEach(() => {
    getFsMemory().clear();
    getFsDirs().clear();
    useVault.getState().clearVaultRoot();
    jest.clearAllMocks();
  });

  afterEach(() => {
    setPlatform(
      ORIGINAL_OS as 'web' | 'android' | 'ios',
      ORIGINAL_VERSION as number
    );
  });

  it('em web devolve mock URI sem tocar FileSystem (uri parametro ignorada)', async () => {
    setPlatform('web', 0);
    const result = await inicializarVaultEscolhido(SUGESTAO_URI);
    expect(result.modo).toBe('web');
    expect(result.criado).toBe(false);
    expect(result.vaultRoot).toMatch(/^web:\/\/mock-vault\//);
    expect(useVault.getState().vaultRoot).toBe(result.vaultRoot);
    expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
  });

  it('Android com URI sugestao default cria 8 subpastas e modo auto', async () => {
    setPlatform('android', 33);
    const result = await inicializarVaultEscolhido(SUGESTAO_URI);
    expect(SUBPASTAS_CANONICAS.length).toBe(8);
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(8);
    SUBPASTAS_CANONICAS.forEach((sub) => {
      // vaultUriJoin remove a barra final do root antes de juntar.
      const expected = `file:///mock/documents/Ouroboros/${sub}`;
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(expected, {
        intermediates: true,
      });
    });
    expect(result.modo).toBe('auto');
    expect(result.criado).toBe(true);
    expect(result.vaultRoot).toBe(SUGESTAO_URI);
    expect(useVault.getState().vaultRoot).toBe(SUGESTAO_URI);
  });

  it('Android com URI SAF persisted (content://...) migra para file:// e modo auto', async () => {
    // V4.0.2: vaultRoot persistido em content:// (apps pre-V4.0.2)
    // e migrado para file:// equivalente de armazenamento primario.
    setPlatform('android', 33);
    const result = await inicializarVaultEscolhido(SAF_URI);
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(8);
    SUBPASTAS_CANONICAS.forEach((sub) => {
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
        `file:///sdcard/Download/${sub}`,
        { intermediates: true }
      );
    });
    expect(result.modo).toBe('auto');
    expect(result.criado).toBe(true);
    expect(result.vaultRoot).toBe('file:///sdcard/Download');
    expect(useVault.getState().vaultRoot).toBe('file:///sdcard/Download');
  });

  it('URI vazia lanca erro descritivo', async () => {
    setPlatform('android', 33);
    await expect(inicializarVaultEscolhido('')).rejects.toThrow(/uri vazia/);
    await expect(inicializarVaultEscolhido('   ')).rejects.toThrow(/uri vazia/);
    expect(useVault.getState().vaultRoot).toBeNull();
  });

  it('idempotencia: chamar 2x com mesma URI nao lanca e mantem subpastas', async () => {
    setPlatform('android', 33);
    await inicializarVaultEscolhido(SUGESTAO_URI);
    await expect(inicializarVaultEscolhido(SUGESTAO_URI)).resolves.toEqual(
      expect.objectContaining({
        modo: 'auto',
        vaultRoot: SUGESTAO_URI,
        criado: true,
      })
    );
    // makeDirectoryAsync chamado 8x na primeira + 8x na segunda = 16.
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledTimes(16);
  });

  it('probe falha (OEM agressivo) lanca erro storage permission denied', async () => {
    setPlatform('android', 33);
    const writeMock = FileSystem.writeAsStringAsync as jest.Mock;
    writeMock.mockImplementationOnce(() => Promise.reject(new Error('EACCES')));
    await expect(inicializarVaultEscolhido(SUGESTAO_URI)).rejects.toThrow(
      /storage permission denied/
    );
    expect(useVault.getState().vaultRoot).toBeNull();
  });

  it('probe escreve, le e deleta .ouroboros-probe sob a URI escolhida', async () => {
    setPlatform('android', 33);
    await inicializarVaultEscolhido(SUGESTAO_URI);
    const probeUri = `file:///mock/documents/Ouroboros/.ouroboros-probe`;
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(probeUri, 'ok');
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(probeUri);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(probeUri, {
      idempotent: true,
    });
    expect(getFsMemory().has(probeUri)).toBe(false);
  });
});

describe('garantirSubpastas (H3)', () => {
  beforeEach(() => {
    getFsMemory().clear();
    getFsDirs().clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    setPlatform(
      ORIGINAL_OS as 'web' | 'android' | 'ios',
      ORIGINAL_VERSION as number
    );
  });

  it('idempotente: rodar 2x nao lanca', async () => {
    setPlatform('android', 33);
    await garantirSubpastas(SUGESTAO_URI);
    await expect(garantirSubpastas(SUGESTAO_URI)).resolves.toBeUndefined();
  });

  it('em web vira no-op silencioso', async () => {
    setPlatform('web', 0);
    await garantirSubpastas('web://mock/');
    expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
  });
});

describe('pedirPermissaoStorage (V4.0.2: boolean grant + retry probe)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getFsMemory().clear();
    getFsDirs().clear();
  });

  afterEach(() => {
    setPlatform(
      ORIGINAL_OS as 'web' | 'android' | 'ios',
      ORIGINAL_VERSION as number
    );
  });

  it('em iOS retorna true sem disparar intent', async () => {
    setPlatform('ios', 17);
    await expect(pedirPermissaoStorage()).resolves.toBe(true);
    expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
    expect(getPermissionsAndroid().request).not.toHaveBeenCalled();
  });

  it('em web retorna true sem disparar intent', async () => {
    setPlatform('web', 0);
    await expect(pedirPermissaoStorage()).resolves.toBe(true);
    expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
    expect(getPermissionsAndroid().request).not.toHaveBeenCalled();
  });

  it('Android API <30 retorna true em GRANTED, false em DENIED', async () => {
    setPlatform('android', 28);
    // Forca probe inicial falhar (mock ainda nao concedeu) — depois grant
    // sai pelo PermissionsAndroid.
    (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValueOnce(
      new Error('no permission')
    );
    (getPermissionsAndroid().request as jest.Mock).mockResolvedValueOnce(
      'granted'
    );
    await expect(pedirPermissaoStorage()).resolves.toBe(true);

    (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValueOnce(
      new Error('no permission')
    );
    (getPermissionsAndroid().request as jest.Mock).mockResolvedValueOnce(
      'denied'
    );
    await expect(pedirPermissaoStorage()).resolves.toBe(false);
  });

  it('engole erro do PermissionsAndroid retornando false', async () => {
    setPlatform('android', 28);
    (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValueOnce(
      new Error('no permission')
    );
    (getPermissionsAndroid().request as jest.Mock).mockRejectedValueOnce(
      new Error('User denied')
    );
    await expect(pedirPermissaoStorage()).resolves.toBe(false);
  });
});

describe('SUBPASTAS_CANONICAS (H2 layout-por-tipo, ADR-0023)', () => {
  it('inclui as 8 pastas canonicas por tipo de arquivo', () => {
    expect(SUBPASTAS_CANONICAS.length).toBe(8);
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
