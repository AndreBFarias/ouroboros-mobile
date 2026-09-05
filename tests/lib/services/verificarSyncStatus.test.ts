// Cobertura de verificarSyncStatus (AUDIT-P2-7-SYNCSTATUS-M15,
// 2026-09-05). Ate esta sprint a unica funcao publica de
// src/lib/services/syncStatus.ts que faz I/O nunca tinha sido
// exercitada: tests/lib/services/syncStatus.test.ts importa apenas
// classificar e descreverDelta, as duas funcoes puras.
//
// Suite em arquivo separado de proposito: o mock global de
// expo-file-system/legacy em jest.setup.cjs nao devolve
// modificationTime e nao tem readDirectoryAsync nenhum. Sem o
// jest.mock LOCAL abaixo, todo caso cairia no branch de mtime ausente
// e todo assert de cor viraria 'vermelho'. Padrao copiado de
// tests/lib/services/exportarVault-syncConflict.test.ts.
//
// Comentarios sem acento (convencao shell/CI).

interface EntradaMock {
  exists: boolean;
  isDirectory?: boolean;
  modificationTime?: number;
  lancar?: boolean;
}

const mockFs = {
  entradas: new Map<string, EntradaMock>(),
  filhos: new Map<string, string[]>(),
};

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  getInfoAsync: jest.fn((uri: string) => {
    const e = mockFs.entradas.get(uri);
    if (e?.lancar) return Promise.reject(new Error(`EACCES: ${uri}`));
    if (!e) return Promise.resolve({ exists: false, uri });
    return Promise.resolve({
      exists: e.exists,
      isDirectory: e.isDirectory ?? false,
      uri,
      ...(typeof e.modificationTime === 'number'
        ? { modificationTime: e.modificationTime }
        : {}),
    });
  }),
  readDirectoryAsync: jest.fn((uri: string) =>
    Promise.resolve(mockFs.filhos.get(uri) ?? [])
  ),
}));

import { Platform } from 'react-native';
import { verificarSyncStatus } from '@/lib/services/syncStatus';

const VAULT = 'file:///mock/documents/Ouroboros';
const STVERSIONS = `${VAULT}/.stversions`;

// Platform.OS no jest-expo e 'ios' por default; o branch web de
// syncStatus.ts precisa ser forcado explicitamente.
const OS_ORIGINAL = Platform.OS;
function setPlatform(os: 'web' | 'android' | 'ios') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

// Segundos desde o epoch (expo devolve modificationTime em segundos).
function segundosAtras(ms: number): number {
  return Math.floor((Date.now() - ms) / 1000);
}

describe('verificarSyncStatus', () => {
  beforeEach(() => {
    mockFs.entradas.clear();
    mockFs.filhos.clear();
    setPlatform('android');
  });

  afterAll(() => {
    setPlatform(OS_ORIGINAL as 'web' | 'android' | 'ios');
  });

  it('vaultUri null => desconhecido, sem alvo', async () => {
    const r = await verificarSyncStatus(null);
    expect(r.cor).toBe('desconhecido');
    expect(r.ultimaModificacao).toBeNull();
    expect(r.conflito).toBe(false);
    expect(r.alvo).toBe('');
  });

  it('web => desconhecido mesmo com vaultUri preenchida', async () => {
    setPlatform('web');
    const r = await verificarSyncStatus(VAULT);
    expect(r.cor).toBe('desconhecido');
    expect(r.ultimaModificacao).toBeNull();
    expect(r.alvo).toBe(VAULT);
  });

  it('diretorio inexistente => vermelho com ultimaModificacao null', async () => {
    const r = await verificarSyncStatus(VAULT);
    expect(r.cor).toBe('vermelho');
    expect(r.ultimaModificacao).toBeNull();
    expect(r.conflito).toBe(false);
  });

  it('mtime recente => verde', async () => {
    mockFs.entradas.set(VAULT, {
      exists: true,
      isDirectory: true,
      modificationTime: segundosAtras(5 * 60 * 1000),
    });
    const r = await verificarSyncStatus(VAULT);
    expect(r.cor).toBe('verde');
    expect(r.conflito).toBe(false);
    expect(r.ultimaModificacao).toBeInstanceOf(Date);
  });

  it('mtime de 3h => amarelo', async () => {
    mockFs.entradas.set(VAULT, {
      exists: true,
      isDirectory: true,
      modificationTime: segundosAtras(3 * 60 * 60 * 1000),
    });
    const r = await verificarSyncStatus(VAULT);
    expect(r.cor).toBe('amarelo');
  });

  it('mtime de 10h => vermelho', async () => {
    mockFs.entradas.set(VAULT, {
      exists: true,
      isDirectory: true,
      modificationTime: segundosAtras(10 * 60 * 60 * 1000),
    });
    const r = await verificarSyncStatus(VAULT);
    expect(r.cor).toBe('vermelho');
    expect(r.ultimaModificacao).toBeInstanceOf(Date);
  });

  it('.stversions com filhos => conflito true e vermelho mesmo com mtime recente', async () => {
    mockFs.entradas.set(VAULT, {
      exists: true,
      isDirectory: true,
      modificationTime: segundosAtras(60 * 1000),
    });
    mockFs.entradas.set(STVERSIONS, { exists: true, isDirectory: true });
    mockFs.filhos.set(STVERSIONS, ['humor-2026-09-01~20260901-101010.md']);
    const r = await verificarSyncStatus(VAULT);
    expect(r.conflito).toBe(true);
    expect(r.cor).toBe('vermelho');
  });

  it('.stversions vazia => sem conflito, cor pelo mtime', async () => {
    mockFs.entradas.set(VAULT, {
      exists: true,
      isDirectory: true,
      modificationTime: segundosAtras(60 * 1000),
    });
    mockFs.entradas.set(STVERSIONS, { exists: true, isDirectory: true });
    mockFs.filhos.set(STVERSIONS, []);
    const r = await verificarSyncStatus(VAULT);
    expect(r.conflito).toBe(false);
    expect(r.cor).toBe('verde');
  });

  it('info sem modificationTime => vermelho com ultimaModificacao null', async () => {
    mockFs.entradas.set(VAULT, { exists: true, isDirectory: true });
    const r = await verificarSyncStatus(VAULT);
    expect(r.cor).toBe('vermelho');
    expect(r.ultimaModificacao).toBeNull();
    expect(r.alvo).toBe(VAULT);
  });

  it('getInfoAsync que lanca => vermelho, sem propagar erro', async () => {
    mockFs.entradas.set(VAULT, { exists: true, lancar: true });
    const r = await verificarSyncStatus(VAULT);
    expect(r.cor).toBe('vermelho');
    expect(r.ultimaModificacao).toBeNull();
    expect(r.conflito).toBe(false);
    expect(r.alvo).toBe(VAULT);
  });

  it('vaultUri com barra final nao duplica a barra do .stversions', async () => {
    mockFs.entradas.set(`${VAULT}/`, {
      exists: true,
      isDirectory: true,
      modificationTime: segundosAtras(60 * 1000),
    });
    mockFs.entradas.set(STVERSIONS, { exists: true, isDirectory: true });
    mockFs.filhos.set(STVERSIONS, ['algo.md']);
    const r = await verificarSyncStatus(`${VAULT}/`);
    expect(r.conflito).toBe(true);
  });
});
