// Testes dos writers/readers de marcacoes de rotina (R-SF-3). Cobre:
//  - rotinaMarcacaoPath: convencao H2 markdown/rotina-marcacao-<slug>-<ymd>.md
//  - lerMarcacaoDia: null quando arquivo nao existe
//  - registrarMarcacao: cria arquivo na 1a marcacao, append idempotente
//    em chamadas subsequentes do mesmo segundo, valida schema.
//  - listarMarcacoesUltimosDias: enumera dias da janela, filtra por autor.
//  - silenciarLembreteHoje: marca fim do dia local; null se sem arquivo.
//
// Mocks: reader/writer pra isolar I/O, mesmo padrao de rotina.test.ts.
//
// Comentarios sem acento (convencao shell/CI).
import type { RotinaMarcacao } from '@/lib/schemas/rotina_marcacao';

const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockListVaultFolder = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: (...args: unknown[]) => mockListVaultFolder(...args),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

import {
  lerMarcacaoDia,
  listarMarcacoesUltimosDias,
  registrarMarcacao,
  rotinaMarcacaoPath,
  silenciarLembreteHoje,
} from '@/lib/vault/rotina_marcacao';

const VAULT_ROOT = 'content://test/vault';
// 21/maio/2026 12:00 UTC == 09:00 SP. fuso SP -03:00.
const AGORA = new Date('2026-05-21T12:00:00+00:00');

function entrada(over: Partial<RotinaMarcacao> = {}): RotinaMarcacao {
  return {
    tipo: 'rotina_marcacao',
    rotina_slug: 'venvanse',
    data: '2026-05-21',
    autor: 'pessoa_a',
    marcacoes: ['2026-05-21T12:00:00-03:00'],
    silenciar_lembrete_ate: null,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('rotinaMarcacaoPath', () => {
  it('produz layout H2 com slug e ymd', () => {
    expect(rotinaMarcacaoPath('venvanse', AGORA)).toBe(
      'markdown/rotina-marcacao-venvanse-2026-05-21.md'
    );
  });

  it('respeita fuso SP nas datas de borda', () => {
    // 22/maio 02:30 UTC == 21/maio 23:30 SP
    const limiar = new Date('2026-05-22T02:30:00+00:00');
    expect(rotinaMarcacaoPath('venvanse', limiar)).toBe(
      'markdown/rotina-marcacao-venvanse-2026-05-21.md'
    );
  });
});

describe('lerMarcacaoDia', () => {
  it('retorna null quando arquivo nao existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    const r = await lerMarcacaoDia(VAULT_ROOT, 'venvanse', AGORA);
    expect(r).toBeNull();
  });

  it('retorna meta quando arquivo existe', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: entrada(),
      body: '',
    });
    const r = await lerMarcacaoDia(VAULT_ROOT, 'venvanse', AGORA);
    expect(r?.rotina_slug).toBe('venvanse');
    expect(r?.marcacoes).toHaveLength(1);
  });
});

describe('registrarMarcacao', () => {
  it('cria arquivo na primeira marcacao do dia', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const r = await registrarMarcacao(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r.marcacoes).toHaveLength(1);
    expect(r.marcacoes[0]).toMatch(/^2026-05-21T/);
    expect(r.marcacoes[0]).toMatch(/-03:00$/);
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [uri, meta] = mockWriteVaultFile.mock.calls[0];
    expect(uri).toBe(
      `${VAULT_ROOT}/markdown/rotina-marcacao-venvanse-2026-05-21.md`
    );
    expect((meta as RotinaMarcacao).tipo).toBe('rotina_marcacao');
  });

  it('append novo timestamp quando arquivo ja existe', async () => {
    const existente = entrada({ marcacoes: ['2026-05-21T08:00:00-03:00'] });
    mockReadVaultFile.mockResolvedValueOnce({ meta: existente, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const r = await registrarMarcacao(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r.marcacoes).toHaveLength(2);
    expect(r.marcacoes[0]).toBe('2026-05-21T08:00:00-03:00');
  });

  it('idempotente: 2 chamadas no mesmo segundo -> 1 marcacao', async () => {
    let arquivoSimulado: RotinaMarcacao | null = null;
    mockReadVaultFile.mockImplementation(() =>
      Promise.resolve(arquivoSimulado ? { meta: arquivoSimulado, body: '' } : null)
    );
    mockWriteVaultFile.mockImplementation((_uri, meta) => {
      arquivoSimulado = meta as RotinaMarcacao;
      return Promise.resolve(undefined);
    });
    await registrarMarcacao(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      autor: 'pessoa_a',
      agora: AGORA,
    });
    const r2 = await registrarMarcacao(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r2.marcacoes).toHaveLength(1);
  });

  it('preserva silenciar_lembrete_ate em append', async () => {
    const existente = entrada({
      marcacoes: ['2026-05-21T08:00:00-03:00'],
      silenciar_lembrete_ate: '2026-05-21T23:59:59-03:00',
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: existente, body: '' });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const r = await registrarMarcacao(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r.silenciar_lembrete_ate).toBe('2026-05-21T23:59:59-03:00');
  });
});

describe('listarMarcacoesUltimosDias', () => {
  it('enumera N dias e ordena reverso por data', async () => {
    // Simula 3 dias com arquivo, 4 sem.
    mockReadVaultFile.mockImplementation((uri: string) => {
      if (uri.includes('2026-05-21'))
        return Promise.resolve({
          meta: entrada({ data: '2026-05-21' }),
          body: '',
        });
      if (uri.includes('2026-05-20'))
        return Promise.resolve({
          meta: entrada({ data: '2026-05-20' }),
          body: '',
        });
      if (uri.includes('2026-05-19'))
        return Promise.resolve({
          meta: entrada({ data: '2026-05-19' }),
          body: '',
        });
      return Promise.resolve(null);
    });
    const r = await listarMarcacoesUltimosDias(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r).toHaveLength(3);
    expect(r[0].data).toBe('2026-05-21');
    expect(r[2].data).toBe('2026-05-19');
  });

  it('filtra por autor', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: entrada({ autor: 'pessoa_b' }),
      body: '',
    });
    mockReadVaultFile.mockResolvedValue(null);
    const r = await listarMarcacoesUltimosDias(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r).toHaveLength(0);
  });

  it('janelaDias customizavel', async () => {
    mockReadVaultFile.mockResolvedValue(null);
    await listarMarcacoesUltimosDias(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      autor: 'pessoa_a',
      agora: AGORA,
      janelaDias: 3,
    });
    expect(mockReadVaultFile).toHaveBeenCalledTimes(3);
  });
});

describe('silenciarLembreteHoje', () => {
  it('retorna null quando nao ha arquivo do dia', async () => {
    mockReadVaultFile.mockResolvedValueOnce(null);
    const r = await silenciarLembreteHoje(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      agora: AGORA,
    });
    expect(r).toBeNull();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('marca silenciar_lembrete_ate como fim do dia local', async () => {
    mockReadVaultFile.mockResolvedValueOnce({
      meta: entrada(),
      body: '',
    });
    mockWriteVaultFile.mockResolvedValueOnce(undefined);
    const r = await silenciarLembreteHoje(VAULT_ROOT, {
      rotinaSlug: 'venvanse',
      agora: AGORA,
    });
    expect(r?.silenciar_lembrete_ate).toBe('2026-05-21T23:59:59-03:00');
    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
  });
});
