// Teste de regressao de AUDIT-P1-5: a flag `vaultLayoutMigrado` subia
// incondicionalmente na ultima linha de migrarVaultLayoutPorTipo,
// contradizendo o contrato declarado no cabecalho do proprio modulo
// ("a flag so sobe se TODOS os arquivos do diretorio alvo foram
// processados sem erro fatal").
//
// Causa a montante: `moverIdempotente` devolvia `false` tanto para
// "destino ja existia" (sucesso idempotente) quanto para "copyAsync
// falhou" (erro real), e MigracaoLayoutResultado so carregava
// `migrados`. O sinal de falha morria antes de chegar na flag.
//
// Dano: o arquivo que falha a copia fica em daily//contadores/ e
// NENHUM leitor o enxerga (todos varrem apenas markdown/,
// MARKDOWN_FOLDER em src/lib/vault/paths.ts). Com a flag em true,
// nenhum boot futuro re-tentava — o registro sumia do historico, do
// Recap e das medias sem erro e sem log.
//
// Cobertura:
//   (a) falha parcial NAO marca a flag e reporta falhas + paths;
//   (b) "destino ja existia" NAO e tratado como falha;
//   (c) sucesso total marca as duas flags;
//   (d) varredura de recuperacao resgata orfaos em Vault que ja tem
//       vaultLayoutMigrado === true, e e no-op em Vault limpo.
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
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import { useSessao } from '@/lib/stores/sessao';
import {
  migrarVaultLayoutPorTipo,
  recuperarOrfaosVaultLayout,
} from '@/lib/boot/migrarVaultLayoutPorTipo';

const VAULT_ROOT = 'file:///vault';

// Popula uma unica pasta legada; todas as demais respondem [].
function comPastaLegada(pasta: string, basenames: string[]): void {
  mockReadDirectoryAsync.mockImplementation((uri: string) => {
    if (uri.endsWith(pasta)) return Promise.resolve(basenames);
    return Promise.resolve([]);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  useSessao.getState().resetar();
  mockGetInfoAsync.mockResolvedValue({ exists: false });
  mockReadDirectoryAsync.mockResolvedValue([]);
  mockCopyAsync.mockResolvedValue(undefined);
  mockDeleteAsync.mockResolvedValue(undefined);
});

describe('migrarVaultLayoutPorTipo — falha parcial (AUDIT-P1-5)', () => {
  it('copyAsync que levanta deixa a flag false e reporta falhas: 1 com o path relativo', async () => {
    // Cenario do spec: Syncthing escrevendo daily/2026-03-14.md no
    // exato boot da migracao. O outro arquivo da mesma pasta migra.
    comPastaLegada('daily', ['2026-03-14.md', '2026-03-15.md']);
    mockCopyAsync.mockImplementation((arg: { from: string; to: string }) => {
      if (arg.from.endsWith('daily/2026-03-14.md')) {
        return Promise.reject(new Error('EBUSY: arquivo em uso pelo sync'));
      }
      return Promise.resolve(undefined);
    });

    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(resultado.falhas).toBe(1);
    expect(resultado.pathsFalhos).toEqual(['daily/2026-03-14.md']);
    // O arquivo sadio da mesma pasta continua migrando.
    expect(resultado.migrados).toBe(1);
    // Contrato do cabecalho: sem sucesso total, nenhuma flag sobe.
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(false);
    expect(useSessao.getState().flags.vaultLayoutOrfaosVarridos).toBe(false);
  });

  it('com a flag ainda false, o boot seguinte re-tenta o arquivo que falhou', async () => {
    comPastaLegada('daily', ['2026-03-14.md']);
    mockCopyAsync.mockRejectedValueOnce(new Error('EBUSY'));

    await migrarVaultLayoutPorTipo(VAULT_ROOT);
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(false);

    // Segundo boot: o sync soltou o arquivo, a copia passa.
    mockCopyAsync.mockResolvedValue(undefined);
    const segundo = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(segundo.falhas).toBe(0);
    expect(segundo.migrados).toBe(1);
    expect(segundo.pathsFalhos).toEqual([]);
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(true);
  });

  it('falha em passo tardio (assets/exercicios) tambem segura a flag', async () => {
    comPastaLegada('assets/exercicios', ['agachamento.gif']);
    mockCopyAsync.mockRejectedValue(new Error('EACCES'));

    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(resultado.pathsFalhos).toEqual([
      'assets/exercicios/agachamento.gif',
    ]);
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(false);
  });

  it('migracao sem falhas marca vaultLayoutMigrado e dispensa a varredura de orfaos', async () => {
    comPastaLegada('contadores', ['sem-cigarro.md']);

    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(resultado).toEqual({
      migrados: 1,
      falhas: 0,
      pathsFalhos: [],
    });
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(true);
    expect(useSessao.getState().flags.vaultLayoutOrfaosVarridos).toBe(true);
  });

  it('Vault vazio (nada a migrar) marca a flag', async () => {
    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(resultado.migrados).toBe(0);
    expect(resultado.falhas).toBe(0);
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(true);
  });
});

describe('migrarVaultLayoutPorTipo — destino ja existia nao e falha (AUDIT-P1-5)', () => {
  it('destino presente conta como sucesso idempotente: falhas 0 e flag sobe', async () => {
    comPastaLegada('daily', ['2026-03-14.md']);
    // Destino markdown/humor-2026-03-14.md ja existe (boot anterior
    // copiou mas nao conseguiu apagar a origem).
    mockGetInfoAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('markdown/humor-2026-03-14.md')) {
        return Promise.resolve({ exists: true });
      }
      return Promise.resolve({ exists: false });
    });

    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    // Nao houve copia (destino ja la), mas tambem nao houve falha.
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(resultado.falhas).toBe(0);
    expect(resultado.pathsFalhos).toEqual([]);
    // Nao conta como migrado nesta execucao: nenhum trabalho novo.
    expect(resultado.migrados).toBe(0);
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(true);
    // A origem legada e limpa best-effort.
    expect(mockDeleteAsync).toHaveBeenCalledWith(
      'file:///vault/daily/2026-03-14.md',
      { idempotent: true }
    );
  });

  it('delete da origem que falha com destino presente nao vira falha de migracao', async () => {
    comPastaLegada('daily', ['2026-03-14.md']);
    mockGetInfoAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('markdown/humor-2026-03-14.md')) {
        return Promise.resolve({ exists: true });
      }
      return Promise.resolve({ exists: false });
    });
    mockDeleteAsync.mockRejectedValue(new Error('EPERM'));

    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    // O registro esta visivel em markdown/; sobra so uma duplicata
    // legada. Nao e perda de dado, entao nao trava a flag.
    expect(resultado.falhas).toBe(0);
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(true);
  });

  it('inbox/_devices.md ausente nao conta como falha', async () => {
    // Passo 3 e o unico com path fixo (sem listagem). Sem o guard de
    // existencia, o copyAsync levantaria ENOENT em todo Vault sem
    // devices index legado e a flag nunca subiria.
    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    const copiouDevices = mockCopyAsync.mock.calls.some(
      ([arg]: [{ from: string }]) => arg.from.endsWith('inbox/_devices.md')
    );
    expect(copiouDevices).toBe(false);
    expect(resultado.falhas).toBe(0);
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(true);
  });

  it('inbox/_devices.md presente continua migrando para markdown/', async () => {
    mockGetInfoAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('inbox/_devices.md')) {
        return Promise.resolve({ exists: true });
      }
      return Promise.resolve({ exists: false });
    });

    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: 'file:///vault/inbox/_devices.md',
      to: 'file:///vault/markdown/_devices.md',
    });
    expect(resultado.migrados).toBe(1);
    expect(resultado.falhas).toBe(0);
  });
});

describe('recuperarOrfaosVaultLayout — Vaults ja afetados (AUDIT-P1-5)', () => {
  it('resgata orfao mesmo com vaultLayoutMigrado ja true', async () => {
    // Estado de quem instalou antes desta sprint: a flag subiu, mas o
    // contador ficou para tras em contadores/ e nenhum leitor o ve.
    useSessao.getState().marcarFlagBoot('vaultLayoutMigrado');
    comPastaLegada('contadores', ['sem-cigarro.md']);

    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: 'file:///vault/contadores/sem-cigarro.md',
      to: 'file:///vault/markdown/contador-sem-cigarro.md',
    });
    expect(resultado.migrados).toBe(1);
    expect(useSessao.getState().flags.vaultLayoutOrfaosVarridos).toBe(true);
  });

  it('e no-op em Vault limpo e nao chama copyAsync', async () => {
    useSessao.getState().marcarFlagBoot('vaultLayoutMigrado');

    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(resultado.migrados).toBe(0);
    expect(resultado.falhas).toBe(0);
    expect(useSessao.getState().flags.vaultLayoutOrfaosVarridos).toBe(true);
  });

  it('roda uma unica vez: com as duas flags true nao varre mais nada', async () => {
    useSessao.getState().marcarFlagBoot('vaultLayoutMigrado');
    useSessao.getState().marcarFlagBoot('vaultLayoutOrfaosVarridos');
    comPastaLegada('contadores', ['sem-cigarro.md']);

    const resultado = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(mockReadDirectoryAsync).not.toHaveBeenCalled();
    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(resultado.migrados).toBe(0);
  });

  it('falha na varredura nao marca a flag; proximo boot tenta de novo', async () => {
    useSessao.getState().marcarFlagBoot('vaultLayoutMigrado');
    comPastaLegada('contadores', ['sem-cigarro.md']);
    mockCopyAsync.mockRejectedValueOnce(new Error('EBUSY'));

    const primeiro = await migrarVaultLayoutPorTipo(VAULT_ROOT);
    expect(primeiro.falhas).toBe(1);
    expect(primeiro.pathsFalhos).toEqual(['contadores/sem-cigarro.md']);
    expect(useSessao.getState().flags.vaultLayoutOrfaosVarridos).toBe(false);

    mockCopyAsync.mockResolvedValue(undefined);
    const segundo = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(segundo.migrados).toBe(1);
    expect(segundo.falhas).toBe(0);
    expect(useSessao.getState().flags.vaultLayoutOrfaosVarridos).toBe(true);
  });

  it('chamada direta ignora vaultLayoutMigrado e devolve o mesmo resultado tipado', async () => {
    useSessao.getState().marcarFlagBoot('vaultLayoutMigrado');
    useSessao.getState().marcarFlagBoot('vaultLayoutOrfaosVarridos');
    comPastaLegada('tarefas', ['2026-03-14-comprar-pao.md']);

    const resultado = await recuperarOrfaosVaultLayout(VAULT_ROOT);

    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: 'file:///vault/tarefas/2026-03-14-comprar-pao.md',
      to: 'file:///vault/markdown/tarefa-comprar-pao.md',
    });
    expect(resultado).toEqual({ migrados: 1, falhas: 0, pathsFalhos: [] });
  });

  it('no-op em web (vault mock)', async () => {
    const resultado = await recuperarOrfaosVaultLayout('web://vault');

    expect(mockReadDirectoryAsync).not.toHaveBeenCalled();
    expect(resultado).toEqual({ migrados: 0, falhas: 0, pathsFalhos: [] });
  });
});

// AUDIT-P1-5B: listarBasenames devolve tres estados em vez de sempre [].
//
// O `catch { return [] }` anterior era ambiguo do mesmo jeito que o
// boolean que a AUDIT-P1-5 desfez: "pasta nao existe" (benigno, esperado
// num Vault novo) e "nao consegui ler" (perda real) viravam a mesma lista
// vazia. A migracao seguia como se tivesse terminado, a flag one-shot
// subia, e a pasta ilegivel nunca mais era tentada.
describe('migrarVaultLayoutPorTipo — listagem ilegivel (AUDIT-P1-5B)', () => {
  it('pasta que existe mas nao lista conta como falha e segura a flag', async () => {
    // readDirectory levanta E a pasta existe: perda real.
    mockReadDirectoryAsync.mockImplementation((uri: string) => {
      if (uri.endsWith('daily')) {
        return Promise.reject(new Error('EACCES: permissao negada'));
      }
      return Promise.resolve([]);
    });
    mockGetInfoAsync.mockImplementation((uri: string) =>
      Promise.resolve({ exists: uri.endsWith('daily') })
    );

    const r = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(r.falhas).toBeGreaterThanOrEqual(1);
    expect(r.pathsFalhos).toContain('daily');
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(false);
  });

  it('pasta ausente segue sendo no-op silencioso (Vault novo nao acusa falha)', async () => {
    // readDirectory levanta porque a pasta nao existe -- o caso comum
    // num Vault recem-criado, em que as 19 pastas legadas nao existem.
    mockReadDirectoryAsync.mockRejectedValue(new Error('ENOENT'));
    mockGetInfoAsync.mockResolvedValue({ exists: false });

    const r = await migrarVaultLayoutPorTipo(VAULT_ROOT);

    expect(r.falhas).toBe(0);
    expect(r.pathsFalhos).toEqual([]);
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(true);
  });

  it('em content:// mantem o comportamento historico (fail-open)', async () => {
    // getInfoAsync NAO discrimina em SAF: para content:// ele so devolve
    // exists:true quando consegue abrir um InputStream, coisa que um
    // DIRETORIO nunca faz. Usa-lo ali daria "inexistente" para pasta boa
    // e "falhou" para pasta ausente -- o inverso do desejado, travando a
    // flag para sempre e transformando a migracao one-shot num fan-out
    // de listagens SAF a cada boot. Por isso content:// nao usa a sonda.
    const RAIZ_SAF =
      'content://com.android.externalstorage/tree/primary%3AOuroboros';
    mockReadDirectoryAsync.mockRejectedValue(new Error('falha SAF'));
    // Mesmo que a sonda dissesse "existe", content:// nao deve consultar.
    mockGetInfoAsync.mockResolvedValue({ exists: true });

    const r = await migrarVaultLayoutPorTipo(RAIZ_SAF);

    expect(r.falhas).toBe(0);
    expect(useSessao.getState().flags.vaultLayoutMigrado).toBe(true);
  });
});
