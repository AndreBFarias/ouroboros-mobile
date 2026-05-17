// Testes da funcao getDeviceId e helper applyDeviceIdSuffix (M38).
// Mock SecureStore vem de jest.setup.cjs (in-memory por suite).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  DEVICE_ID_KEY,
  _resetDeviceIdCache,
  applyDeviceIdSuffix,
  getDeviceId,
} from '@/lib/util/deviceId';

beforeEach(async () => {
  // Limpa o slot do SecureStore in-memory entre testes para garantir
  // determinismo (mock keep-alive no setup).
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  _resetDeviceIdCache();
});

describe('getDeviceId', () => {
  it('gera novo deviceId com prefix ouro- e 6 chars alfanumericos', async () => {
    const id = await getDeviceId();
    expect(id).toMatch(/^ouro-[a-z0-9]{6}$/);
  });

  it('persiste no SecureStore: segunda chamada devolve o mesmo id', async () => {
    const a = await getDeviceId();
    _resetDeviceIdCache();
    const b = await getDeviceId();
    expect(a).toBe(b);
  });

  it('cache em memoria evita I/O repetido em chamadas consecutivas', async () => {
    const a = await getDeviceId();
    // Sem reset de cache, segunda chamada devolve mesmo id sem
    // tocar SecureStore novamente. A nao-chamada e' garantida pela
    // implementacao (cacheMemoria); validamos pelo retorno identico
    // sem regenerar (que envolveria randomShort).
    const b = await getDeviceId();
    const c = await getDeviceId();
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('id cabe em < 32 bytes (limite SecureStore A20 do BRIEF)', async () => {
    const id = await getDeviceId();
    expect(id.length).toBeLessThan(32);
  });

  it('regenera quando SecureStore foi zerado (uninstall+reinstall)', async () => {
    const a = await getDeviceId();
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    _resetDeviceIdCache();
    const b = await getDeviceId();
    expect(b).toMatch(/^ouro-[a-z0-9]{6}$/);
    // Probabilisticamente diferente; se falhar = colisao 1 em 36^6
    // (2.1 bi). Aceitamos como flake aceitavel se ocorrer.
    expect(b).not.toBe(a);
  });
});

// R-DX-SECURESTORE-WEB-DEV-FALLBACK: em web, expo-secure-store nao
// tem implementacao direta (lanca getValueWithKeyAsync is not a
// function). Os 4 cenarios abaixo cobrem o fallback localStorage
// + a defesa em camadas (mobile com SecureStore lancando excecao).
//
// O ambiente Jest do projeto (jest-expo) usa testEnvironment
// jest-environment-node, sem `window` global. Os testes web
// instalam um shim `window.localStorage` Map-based, e o caso
// "indisponivel" remove `window` inteiro.
describe('getDeviceId fallback web (R-DX-SECURESTORE-WEB-DEV-FALLBACK)', () => {
  const osOriginal = Platform.OS;
  function setOS(os: 'web' | 'android' | 'ios'): void {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => os,
    });
  }

  // Shim minimo de localStorage (subset usado pelo fallback).
  function makeLocalStorageShim(): Storage {
    const map = new Map<string, string>();
    return {
      get length() {
        return map.size;
      },
      clear: () => map.clear(),
      getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
      setItem: (k: string, v: string) => {
        map.set(k, String(v));
      },
      removeItem: (k: string) => {
        map.delete(k);
      },
      key: (i: number) => Array.from(map.keys())[i] ?? null,
    } as Storage;
  }

  // Instala/remove `window` global em torno do teste. Mantemos
  // estado isolado entre casos via afterEach.
  function installWindow(localStorage?: Storage): void {
    (globalThis as unknown as { window: { localStorage?: Storage } }).window = {
      localStorage,
    };
  }
  function uninstallWindow(): void {
    delete (globalThis as unknown as { window?: unknown }).window;
  }

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => osOriginal,
    });
    uninstallWindow();
  });

  it('web + localStorage disponivel: cria e persiste em localStorage', async () => {
    setOS('web');
    const storage = makeLocalStorageShim();
    installWindow(storage);
    // Snapshot do contador de chamadas antes do teste para medir
    // delta (o mock e' compartilhado entre suites do arquivo).
    const getItemMock = SecureStore.getItemAsync as jest.Mock;
    const setItemMock = SecureStore.setItemAsync as jest.Mock;
    const baseGet = getItemMock.mock.calls.length;
    const baseSet = setItemMock.mock.calls.length;
    const a = await getDeviceId();
    expect(a).toMatch(/^ouro-[a-z0-9]{6}$/);
    // Segunda chamada (sem reset de cache) devolve o mesmo id.
    const b = await getDeviceId();
    expect(b).toBe(a);
    // E persistiu na chave canonica do localStorage.
    expect(storage.getItem(DEVICE_ID_KEY)).toBe(a);
    // Nao tocou em SecureStore (delta zero apos as duas chamadas).
    expect(getItemMock.mock.calls.length - baseGet).toBe(0);
    expect(setItemMock.mock.calls.length - baseSet).toBe(0);
  });

  it('web + localStorage indisponivel: fallback in-memory por sessao', async () => {
    setOS('web');
    // Sem window/localStorage: ambiente SSR/sandbox simulado.
    uninstallWindow();
    const id = await getDeviceId();
    expect(id).toMatch(/^ouro-[a-z0-9]{6}$/);
    // Cache de memoria mantem o mesmo id durante a sessao.
    const id2 = await getDeviceId();
    expect(id2).toBe(id);
  });

  it('android: comportamento atual preservado via SecureStore', async () => {
    setOS('android');
    const id = await getDeviceId();
    expect(id).toMatch(/^ouro-[a-z0-9]{6}$/);
    // Persistiu em SecureStore (path nativo, nao localStorage).
    expect(await SecureStore.getItemAsync(DEVICE_ID_KEY)).toBe(id);
  });

  it('android + SecureStore lanca: cai no fallback web/in-memory (defesa)', async () => {
    setOS('android');
    const storage = makeLocalStorageShim();
    installWindow(storage);
    const getItemMock = SecureStore.getItemAsync as jest.Mock;
    const original = getItemMock.getMockImplementation();
    getItemMock.mockImplementationOnce(() => {
      throw new Error('SecureStore indisponivel (simulado)');
    });
    try {
      const id = await getDeviceId();
      expect(id).toMatch(/^ouro-[a-z0-9]{6}$/);
      // Caiu no path web: gravou no localStorage, nao tentou setItem
      // em SecureStore (o throw foi antes).
      expect(storage.getItem(DEVICE_ID_KEY)).toBe(id);
    } finally {
      // Restaura mock original (caso testes futuros dependam).
      if (original) getItemMock.mockImplementation(original);
    }
  });
});

describe('applyDeviceIdSuffix', () => {
  it('aplica suffix antes da extensao .md', () => {
    expect(applyDeviceIdSuffix('daily/2026-05-04.md', 'ouro-abc123')).toBe(
      'daily/2026-05-04-ouro-abc123.md'
    );
  });

  it('aplica suffix em path com slug intermediario', () => {
    expect(
      applyDeviceIdSuffix('tarefas/2026-05-04-comprar-pao.md', 'ouro-xyz999')
    ).toBe('tarefas/2026-05-04-comprar-pao-ouro-xyz999.md');
  });

  it('append no final quando nao ha extensao', () => {
    expect(applyDeviceIdSuffix('daily/2026-05-04', 'ouro-abc')).toBe(
      'daily/2026-05-04-ouro-abc'
    );
  });

  it('preserva extensoes nao .md (defesa)', () => {
    expect(applyDeviceIdSuffix('media/foto.jpg', 'ouro-z')).toBe(
      'media/foto-ouro-z.jpg'
    );
  });
});
