// Comentários deste arquivo em PT-BR acentuado.
//
// AUDIT-P3-7. `src/lib/stores/persist.ts` tem 38 linhas e é o adapter de
// storage das 8 stores persistidas do app (pessoa, vault, settings, sessao,
// onboarding, googleAuth, spotify, youtube). Até esta sprint nenhum teste o
// importava. O cenário de falha que esta suíte trava: trocar `?? null` por
// `?? undefined` no `getItem` nativo (persist.ts:28) faz o middleware
// `persist` do zustand ler "sem estado salvo" e reidratar as 8 stores
// vazias — o app abre como primeira instalação.
//
// Três restrições de ambiente moldam o formato desta suíte:
//
//  1. `jest.setup.cjs` já mocka `expo-secure-store` globalmente, e o
//     `getItemAsync` de lá é `Promise.resolve(memory.get(k) ?? null)` — ele
//     nunca devolve `undefined`. Confiar nele deixaria o caso principal
//     verde sem exercitar nada, porque o `?? null` estaria sendo aplicado na
//     origem. Por isso o mock local abaixo sobrescreve o global e devolve
//     exatamente o que cada teste mandar.
//
//  2. `secureStorage` é resolvido em tempo de CARGA do módulo
//     (persist.ts:37-38 é um `const` de topo). Trocar `Platform.OS` com
//     `Object.defineProperty` depois do import não muda o ramo escolhido —
//     é preciso recarregar o módulo com `react-native` mockado, padrão já
//     usado em tests/lib/dev/gauntlet-autoseed-onboarding.test.ts:129-135.
//
//  3. O ambiente de teste é Node (tests/__env__/rn-realtimers.js estende
//     react-native-env, não jsdom): `window` existe e é o próprio
//     `globalThis`, mas `window.localStorage` não existe. Os dois globais
//     mexidos aqui (`window` e `window.localStorage`) são restaurados em
//     `afterEach`, senão vazam para as suítes seguintes do mesmo worker
//     (`maxWorkers: 2`).

import type { StateStorage } from 'zustand/middleware';

// Mock local de expo-secure-store. O objeto vive em `globalThis` para que a
// fábrica devolva SEMPRE as mesmas jest.fn, inclusive quando reexecutada
// dentro de um registro isolado por `jest.isolateModules`.
jest.mock('expo-secure-store', () => {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!g.__persistSecureStoreMock) {
    g.__persistSecureStoreMock = {
      getItemAsync: jest.fn(),
      setItemAsync: jest.fn(),
      deleteItemAsync: jest.fn(),
    };
  }
  return g.__persistSecureStoreMock;
});

type SecureStoreMock = {
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};

const SecureStore = jest.requireMock('expo-secure-store') as SecureStoreMock;

type LocalStorageMock = {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

const globalComWindow = globalThis as unknown as {
  window?: { localStorage?: LocalStorageMock };
};

const DESCRITOR_WINDOW = Object.getOwnPropertyDescriptor(globalThis, 'window');

// Recarrega persist.ts com o ramo de plataforma desejado. `dontMock`
// simétrico devolve o `react-native` real ao registro global logo em
// seguida, para não contaminar nada fora deste helper.
function carregarStorage(os: 'web' | 'ios'): StateStorage {
  let carregado: typeof import('@/lib/stores/persist') | undefined;
  jest.isolateModules(() => {
    jest.resetModules();
    jest.doMock('react-native', () => ({
      __esModule: true,
      Platform: { OS: os },
    }));
    carregado =
      require('@/lib/stores/persist') as typeof import('@/lib/stores/persist');
  });
  jest.dontMock('react-native');
  if (!carregado) {
    throw new Error('persist.ts não carregou dentro do isolateModules');
  }
  return carregado.secureStorage;
}

function localStorageFalso(): LocalStorageMock {
  return {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };
}

afterEach(() => {
  // Restaura os dois globais compartilhados. `delete` explícito na
  // localStorage porque restaurar o descritor de `window` não remove uma
  // propriedade injetada dentro dele — `window` é o próprio `globalThis`.
  if (DESCRITOR_WINDOW) {
    Object.defineProperty(globalThis, 'window', DESCRITOR_WINDOW);
  }
  if (globalComWindow.window) {
    delete globalComWindow.window.localStorage;
  }
  jest.clearAllMocks();
  jest.dontMock('react-native');
});

describe('secureStorage — ramo nativo (Platform.OS diferente de web)', () => {
  it('getItem devolve o valor que o SecureStore resolveu', async () => {
    SecureStore.getItemAsync.mockResolvedValue('{"nome":"pessoa_a"}');
    const storage = carregarStorage('ios');

    await expect(storage.getItem('ouroboros-pessoa')).resolves.toBe(
      '{"nome":"pessoa_a"}'
    );
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('ouroboros-pessoa');
  });

  it('getItem converte undefined em null estrito (persist.ts:28)', async () => {
    // O caso que justifica a suíte. Se o `?? null` virar `?? undefined`, o
    // middleware persist do zustand entende "sem estado salvo" e as 8 stores
    // reidratam vazias. Esta asserção é a que reprova essa troca.
    SecureStore.getItemAsync.mockResolvedValue(undefined);
    const storage = carregarStorage('ios');

    const lido = await storage.getItem('ouroboros-vault');
    expect(lido).toBeNull();
    expect(lido).not.toBeUndefined();
  });

  it('setItem delega a SecureStore.setItemAsync com nome e valor', async () => {
    SecureStore.setItemAsync.mockResolvedValue(undefined);
    const storage = carregarStorage('ios');

    await storage.setItem('ouroboros-settings', '{"tema":"escuro"}');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'ouroboros-settings',
      '{"tema":"escuro"}'
    );
  });

  it('removeItem delega a SecureStore.deleteItemAsync', async () => {
    SecureStore.deleteItemAsync.mockResolvedValue(undefined);
    const storage = carregarStorage('ios');

    await storage.removeItem('ouroboros-sessao');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'ouroboros-sessao'
    );
  });
});

describe('secureStorage — ramo web com window sem localStorage', () => {
  // Estado natural do ambiente de teste: `window` existe, `localStorage`
  // não. Cobre a segunda metade da guarda de persist.ts:14,18,22.
  it('getItem devolve null sem lançar', async () => {
    const storage = carregarStorage('web');
    await expect(storage.getItem('ouroboros-pessoa')).resolves.toBeNull();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('setItem e removeItem são no-op sem lançar', async () => {
    const storage = carregarStorage('web');
    await expect(
      storage.setItem('ouroboros-pessoa', '{}')
    ).resolves.toBeUndefined();
    await expect(
      storage.removeItem('ouroboros-pessoa')
    ).resolves.toBeUndefined();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});

describe('secureStorage — ramo web sem window (SSR)', () => {
  // Cobre a primeira metade da guarda: `typeof window === 'undefined'`.
  beforeEach(() => {
    delete (globalThis as unknown as Record<string, unknown>).window;
  });

  it('os três métodos são no-op sem lançar', async () => {
    const storage = carregarStorage('web');
    await expect(storage.getItem('ouroboros-vault')).resolves.toBeNull();
    await expect(
      storage.setItem('ouroboros-vault', '{}')
    ).resolves.toBeUndefined();
    await expect(
      storage.removeItem('ouroboros-vault')
    ).resolves.toBeUndefined();
  });
});

describe('secureStorage — ramo web com localStorage disponível', () => {
  // Caminho feliz do ramo web: cobre persist.ts:15,19,23.
  let ls: LocalStorageMock;

  beforeEach(() => {
    ls = localStorageFalso();
    if (!globalComWindow.window) {
      throw new Error('o ambiente de teste deveria expor window');
    }
    globalComWindow.window.localStorage = ls;
  });

  it('getItem delega a window.localStorage.getItem', async () => {
    ls.getItem.mockReturnValue('{"tema":"escuro"}');
    const storage = carregarStorage('web');

    await expect(storage.getItem('ouroboros-settings')).resolves.toBe(
      '{"tema":"escuro"}'
    );
    expect(ls.getItem).toHaveBeenCalledWith('ouroboros-settings');
  });

  it('setItem delega a window.localStorage.setItem', async () => {
    const storage = carregarStorage('web');

    await storage.setItem('ouroboros-settings', '{"tema":"claro"}');
    expect(ls.setItem).toHaveBeenCalledWith(
      'ouroboros-settings',
      '{"tema":"claro"}'
    );
  });

  it('removeItem delega a window.localStorage.removeItem', async () => {
    const storage = carregarStorage('web');

    await storage.removeItem('ouroboros-settings');
    expect(ls.removeItem).toHaveBeenCalledWith('ouroboros-settings');
  });
});
