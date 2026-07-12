// Testes do boot hook T2-LOCK-VAULT (2026-05-15) que renomeia arquivos
// canonicos (.md sem suffix) para o formato '-<deviceIdAtual>.md'.
//
// Mocka:
//  - Platform: forca 'android' para testar branch real (em web e' no-op).
//  - SecureStore: SecureStore in-memory via jest.setup.cjs (deviceId
//    determinista). Configuramos um deviceId fixo no beforeEach para
//    asserts previsiveis.
//  - FileSystem.readDirectoryAsync / copyAsync / deleteAsync /
//    getInfoAsync: instrumentamos para simular um vault inicial e
//    verificar renames idempotentes.
//  - useSessao.flags: estado real (zustand in-memory); resetamos entre
//    testes via _resetDeviceIdCache + setando flag false.
//
// Comentarios sem acento (convencao shell/CI).
import * as SecureStore from 'expo-secure-store';
import { useSessao } from '@/lib/stores/sessao';
import {
  _resetDeviceIdCache,
  DEVICE_ID_KEY,
} from '@/lib/util/deviceId';

const mockReadDirectory = jest.fn();
const mockCopyAsync = jest.fn();
const mockDeleteAsync = jest.fn();
const mockGetInfoAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectory(...args),
  StorageAccessFramework: {
    readDirectoryAsync: (...args: unknown[]) => mockReadDirectory(...args),
  },
}));

// Forca Platform.OS=android para sair do branch web (que e no-op).
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'android' },
}));

import { migrarArquivosCanonicosParaDeviceId } from '@/lib/boot/migrarArquivosCanonicosParaDeviceId';

const VAULT_ROOT = 'file:///mock/vault';
const DEVICE_ID_FIXO = 'ouro-tst001';

beforeEach(async () => {
  jest.clearAllMocks();
  // Reseta flag de migracao no useSessao (zustand in-memory).
  useSessao.setState((s) => ({
    flags: { ...s.flags, t2DeviceIdSuffixMigrado: false },
  }));
  // Reseta cache de deviceId e seta valor fixo no SecureStore.
  _resetDeviceIdCache();
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  await SecureStore.setItemAsync(DEVICE_ID_KEY, DEVICE_ID_FIXO);
  // Defaults: copy/delete sucesso; getInfo retorna ausente.
  mockCopyAsync.mockResolvedValue(undefined);
  mockDeleteAsync.mockResolvedValue(undefined);
  mockGetInfoAsync.mockResolvedValue({ exists: false });
});

describe('migrarArquivosCanonicosParaDeviceId T2-LOCK-VAULT', () => {
  it('renomeia humor-YYYY-MM-DD.md para humor-YYYY-MM-DD-<deviceId>.md', async () => {
    mockReadDirectory.mockResolvedValueOnce(['humor-2026-05-14.md']);

    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(1);
    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    const [{ from, to }] = mockCopyAsync.mock.calls[0];
    expect(from).toBe(`${VAULT_ROOT}/markdown/humor-2026-05-14.md`);
    expect(to).toBe(
      `${VAULT_ROOT}/markdown/humor-2026-05-14-${DEVICE_ID_FIXO}.md`
    );
    expect(mockDeleteAsync).toHaveBeenCalledWith(from, { idempotent: true });
  });

  it('pula arquivos que ja tem suffix de deviceId (idempotencia cross-device)', async () => {
    mockReadDirectory.mockResolvedValueOnce([
      'humor-2026-05-14-ouro-aaaaaa.md', // outro device, nao renomeia
      'humor-2026-05-15-ouro-tst001.md', // este device, ja tem suffix
    ]);

    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(0);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('pula .sync-conflict-* (preserva filtro T1B6)', async () => {
    mockReadDirectory.mockResolvedValueOnce([
      'humor-2026-05-14.sync-conflict-20260514-093412-OURO1.md',
      'diario-2026-05-14-0930-raiva.sync-conflict-20260514-093412-OURO1.md',
    ]);

    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(0);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('pula arquivos sem prefixo canonico pos-H2 (_devices.md, etc.)', async () => {
    mockReadDirectory.mockResolvedValueOnce([
      '_devices.md', // nao tem data, nao migra
      'random-arquivo.md', // prefixo nao canonico
      'humor-heatmap.json', // nao .md
    ]);

    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(0);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('pula prefixos sem data no nome (contador-, alarme-, tarefa-)', async () => {
    // Esses prefixos entram em layouts H2 com slug (sem data). T2 nao
    // migra-os para nao bagunc-ar fluxos de slug-canonico que usam
    // lerContador/lerAlarme.
    mockReadDirectory.mockResolvedValueOnce([
      'contador-sem-cigarro.md',
      'alarme-medicacao-manha.md',
      'tarefa-comprar-pao-7k2x.md',
      'exercicio-flexao.md',
    ]);

    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(0);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('renomeia variedade de prefixos com data (humor/diario/evento/marco/medidas/ciclo)', async () => {
    mockReadDirectory.mockResolvedValueOnce([
      'humor-2026-05-14.md',
      'diario-2026-05-14-0930-raiva.md',
      'evento-2026-05-14-festa.md',
      'marco-2026-05-14-primeiro-passo.md',
      'medidas-2026-05-14.md',
      'ciclo-2026-05-14.md',
    ]);

    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(6);
    expect(mockCopyAsync).toHaveBeenCalledTimes(6);
    // Cada destino tem suffix do device fixo.
    const destinos = mockCopyAsync.mock.calls.map((c) => c[0].to);
    for (const dest of destinos) {
      expect(dest).toMatch(new RegExp(`-${DEVICE_ID_FIXO}\\.md$`));
    }
  });

  it('marca flag t2DeviceIdSuffixMigrado apos sucesso (idempotente em boots futuros)', async () => {
    mockReadDirectory.mockResolvedValueOnce(['humor-2026-05-14.md']);
    await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(useSessao.getState().flags.t2DeviceIdSuffixMigrado).toBe(true);
  });

  it('no-op imediato quando flag ja esta true', async () => {
    useSessao.setState((s) => ({
      flags: { ...s.flags, t2DeviceIdSuffixMigrado: true },
    }));
    // Sem mock de readDirectory: como flag esta true, o codigo nem
    // chega a chamar o filesystem (gate antes de qualquer I/O). Se
    // chamasse com mock pendente, vazaria mockResolvedValueOnce para
    // o proximo teste.

    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(0);
    expect(mockReadDirectory).not.toHaveBeenCalled();
  });

  it('no-op quando vaultRoot tem scheme web://', async () => {
    // Cobertura do branch web: vaultRoot com prefix web:// dispara
    // no-op imediato sem tocar mock readDirectory. (Branch Platform.OS=web
    // tem cobertura indireta no smoke real do app web; tentar mockar
    // Platform via doMock+resetModules quebra o jest-resolver em
    // require()s aninhados, entao confiamos no scheme guard.)
    const out = await migrarArquivosCanonicosParaDeviceId('web://mock');
    expect(out.migrados).toBe(0);
    expect(mockReadDirectory).not.toHaveBeenCalled();
  });

  it('destino existe (Syncthing sincronizou primeiro): limpa origem sem rename', async () => {
    mockReadDirectory.mockResolvedValueOnce(['humor-2026-05-14.md']);
    // getInfoAsync para o destino retorna que ja existe.
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true });

    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(0); // nao conta como migrado
    expect(mockCopyAsync).not.toHaveBeenCalled();
    // Mas limpa a origem (canonico legado).
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      `${VAULT_ROOT}/markdown/humor-2026-05-14.md`,
      { idempotent: true }
    );
  });

  it('pasta markdown inexistente => migrados=0 sem erro', async () => {
    mockReadDirectory.mockRejectedValueOnce(new Error('directory not found'));
    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(0);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });

  it('cenario misto: alguns renomeiam, outros nao (idempotencia parcial)', async () => {
    mockReadDirectory.mockResolvedValueOnce([
      'humor-2026-05-14.md', // renomeia
      'humor-2026-05-15-ouro-xxxxxx.md', // ja tem suffix
      'diario-2026-05-15-1030-raiva.md', // renomeia
      '_devices.md', // pula
      'humor-2026-05-16.sync-conflict-20260516-090012-OURO2.md', // sync-conflict, pula
    ]);

    const out = await migrarArquivosCanonicosParaDeviceId(VAULT_ROOT);
    expect(out.migrados).toBe(2);
    expect(mockCopyAsync).toHaveBeenCalledTimes(2);
    const destinos = mockCopyAsync.mock.calls.map((c) => c[0].to);
    expect(destinos).toContain(
      `${VAULT_ROOT}/markdown/humor-2026-05-14-${DEVICE_ID_FIXO}.md`
    );
    expect(destinos).toContain(
      `${VAULT_ROOT}/markdown/diario-2026-05-15-1030-raiva-${DEVICE_ID_FIXO}.md`
    );
  });
});
