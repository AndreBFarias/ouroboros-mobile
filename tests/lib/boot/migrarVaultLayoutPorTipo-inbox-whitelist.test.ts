// Teste de regressao da whitelist de `inbox/` no boot hook
// migrarVaultLayoutPorTipo (ADR-0024, sprint G1).
//
// Cobre: arquivos do share intent receiver (M08) que vivem em
// `inbox/financeiro/{pix,extrato,nota}/`, `inbox/saude/{exame,receita}/`,
// `inbox/casa/{garantia,contrato}/` e `inbox/outros/` NAO sao tocados
// pelo boot hook. Permanecem em `inbox/` como triagem temporaria.
//
// Os subpaths legados que SAO migrados (`inbox/saude/ciclo/`,
// `inbox/mente/diario/`, `inbox/_devices.md`) continuam funcionando
// e nao colidem com a whitelist.
//
// Comentarios sem acento (convencao shell/CI).
const mockReadDirectoryAsync = jest.fn();
const mockGetInfoAsync = jest.fn();
const mockCopyAsync = jest.fn();
const mockDeleteAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  StorageAccessFramework: {
    readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  },
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

jest.mock('react-native', () => require('../../__support__/rnCssInteropMock.cjs')('android'));

import { useSessao } from '@/lib/stores/sessao';
import { migrarVaultLayoutPorTipo } from '@/lib/boot/migrarVaultLayoutPorTipo';

const VAULT_ROOT = 'content://test/vault';

// Subpaths do `inbox/` que NAO devem ser migrados (share intent
// receiver, M08). A pasta `inbox/` e excecao parcial ao layout-por-tipo
// (ADR-0024).
const INBOX_SHARE_INTENT_PATHS: ReadonlyArray<string> = [
  'inbox/financeiro/pix',
  'inbox/financeiro/extrato',
  'inbox/financeiro/nota',
  'inbox/saude/exame',
  'inbox/saude/receita',
  'inbox/casa/garantia',
  'inbox/casa/contrato',
  'inbox/outros',
];

beforeEach(() => {
  jest.clearAllMocks();
  // Reset flag para que o boot hook execute (nao no-op imediato).
  useSessao.getState().resetar();
  // Default: getInfoAsync devolve nao existe (destinos limpos).
  mockGetInfoAsync.mockResolvedValue({ exists: false });
  // Default: readDirectoryAsync devolve [] para qualquer path nao
  // explicitamente sobrescrito no teste.
  mockReadDirectoryAsync.mockResolvedValue([]);
});

describe('migrarVaultLayoutPorTipo — whitelist de inbox/ (ADR-0024)', () => {
  it('nao migra arquivos de inbox/financeiro/{pix,extrato,nota}/', async () => {
    // Popular subpaths do share intent com arquivos. O boot hook nao
    // os enumera; readDirectoryAsync nesses paths nem sera chamado,
    // mas se for, retornaria estes nomes.
    const arquivosShare = [
      'content://test/vault/inbox/financeiro/pix/2026-05-01-1430-comprovante.pdf',
      'content://test/vault/inbox/financeiro/pix/2026-05-01-1430-comprovante.md',
    ];
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('inbox/financeiro/pix')) {
        return Promise.resolve(arquivosShare);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT);

    // Verifica que nenhum arquivo do inbox/financeiro/pix foi copiado
    // para markdown/ ou pdf/. copyAsync so e chamado em paths
    // explicitamente listados no boot hook.
    const calls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;
    for (const [arg] of calls) {
      expect(arg.from).not.toContain('inbox/financeiro/');
      expect(arg.to).not.toMatch(/markdown\/.*pix/);
      expect(arg.to).not.toMatch(/pdf\/.*comprovante/);
    }
  });

  it('nao chama readDirectoryAsync em nenhum subpath de share intent', async () => {
    await migrarVaultLayoutPorTipo(VAULT_ROOT);

    const urisLidos = mockReadDirectoryAsync.mock.calls.map(
      (c) => c[0] as string
    );

    for (const proibido of INBOX_SHARE_INTENT_PATHS) {
      const algumLeu = urisLidos.some((uri) => uri.endsWith(proibido));
      expect({ proibido, algumLeu }).toEqual({ proibido, algumLeu: false });
    }
  });

  it('continua migrando inbox/saude/ciclo/ (whitelist do boot hook)', async () => {
    // Cenario: vault tem arquivo legado em inbox/saude/ciclo/. Boot
    // hook DEVE migrar para markdown/ciclo-*.md.
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('inbox/saude/ciclo')) {
        return Promise.resolve([
          'content://test/vault/inbox/saude/ciclo/2026-04-15.md',
        ]);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT);

    const copyCalls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;
    const ciclo = copyCalls.find(([arg]) =>
      arg.from.endsWith('inbox/saude/ciclo/2026-04-15.md')
    );
    expect(ciclo).toBeDefined();
    expect(ciclo?.[0].to).toMatch(/markdown\/ciclo-2026-04-15\.md$/);
  });

  it('continua migrando inbox/mente/diario/ (whitelist do boot hook)', async () => {
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('inbox/mente/diario')) {
        return Promise.resolve([
          'content://test/vault/inbox/mente/diario/2026-04-20-1530-conflito.md',
        ]);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT);

    const copyCalls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;
    const diario = copyCalls.find(([arg]) =>
      arg.from.endsWith('inbox/mente/diario/2026-04-20-1530-conflito.md')
    );
    expect(diario).toBeDefined();
    expect(diario?.[0].to).toMatch(
      /markdown\/diario-2026-04-20-1530-conflito\.md$/
    );
  });

  it('nao migra inbox/casa/garantia mesmo com arquivos presentes', async () => {
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('inbox/casa/garantia')) {
        return Promise.resolve([
          'content://test/vault/inbox/casa/garantia/2026-03-10-1200-geladeira.pdf',
          'content://test/vault/inbox/casa/garantia/2026-03-10-1200-geladeira.md',
        ]);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT);

    const copyCalls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;
    for (const [arg] of copyCalls) {
      expect(arg.from).not.toContain('inbox/casa/');
    }
  });

  it('nao migra inbox/outros mesmo com arquivos presentes', async () => {
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('inbox/outros')) {
        return Promise.resolve([
          'content://test/vault/inbox/outros/2026-02-05-1100-misc.txt',
          'content://test/vault/inbox/outros/2026-02-05-1100-misc.md',
        ]);
      }
      return Promise.resolve([]);
    });

    await migrarVaultLayoutPorTipo(VAULT_ROOT);

    const copyCalls = mockCopyAsync.mock.calls as Array<
      [{ from: string; to: string }]
    >;
    for (const [arg] of copyCalls) {
      expect(arg.from).not.toContain('inbox/outros');
    }
  });
});
