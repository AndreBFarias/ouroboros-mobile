// Testes do saveNota refatorado em M-VAULT-MD-FIX-scanner. Garante:
//  - binario .pdf (multi page) e .jpg (single page) gravados em
//    media/scanner/<basename>.<ext> (nao mais em assets/);
//  - companion .md 1:1 ao binario gravado em
//    media/scanner/<basename>.md com frontmatter midia_pdf/midia_foto;
//  - md semantico mantido em inbox/financeiro/nota/<ts>-<slug>.md
//    com wikilink para o binario no body;
//  - meta.imagem sobrescreve o sentinela IMAGEM_PENDENTE com path real.
//
// Comentarios sem acento (convencao shell/CI).
import type { FinanceiroNotaMeta } from '@/lib/schemas/financeiro_nota';

const mockCopyAsync = jest.fn();
const mockWriteAsStringAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
}));

const mockWriteVaultFile = jest.fn();
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));

import { saveNota, IMAGEM_PENDENTE } from '@/lib/scanner/saveNota';

const VAULT_ROOT = 'content://com.android.externalstorage/tree/Vault';

const metaBase: FinanceiroNotaMeta = {
  tipo: 'financeiro',
  subtipo: 'nota',
  data: '2026-05-04T12:30:00-03:00',
  autor: 'pessoa_a',
  valor: 87.4,
  descricao: 'Mercado da esquina',
  categoria: 'mercado',
  imagem: IMAGEM_PENDENTE,
  ocr_confianca: 0.92,
  revisar: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCopyAsync.mockResolvedValue(undefined);
  mockWriteAsStringAsync.mockResolvedValue(undefined);
  mockWriteVaultFile.mockResolvedValue(undefined);
});

describe('saveNota — single page (.jpg)', () => {
  it('grava binario em media/scanner/<basename>.jpg, nao em assets/', async () => {
    const r = await saveNota({
      meta: metaBase,
      body: 'Texto OCR do recibo',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/img-tmp.jpg',
      isPdf: false,
    });

    expect(r.imagemRelativa.startsWith('media/scanner/')).toBe(true);
    expect(r.imagemRelativa.endsWith('.jpg')).toBe(true);
    expect(r.imagemRelativa.includes('assets/')).toBe(false);

    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    const arg = mockCopyAsync.mock.calls[0][0] as { from: string; to: string };
    expect(arg.from).toBe('file:///cache/img-tmp.jpg');
    expect(arg.to).toContain('media/scanner/');
    expect(arg.to.endsWith('.jpg')).toBe(true);
  });

  it('grava companion .md 1:1 com mesmo basename do binario', async () => {
    const r = await saveNota({
      meta: metaBase,
      body: '',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/x.jpg',
      isPdf: false,
    });

    expect(r.companionRelativo.startsWith('media/scanner/')).toBe(true);
    expect(r.companionRelativo.endsWith('.md')).toBe(true);

    const baseBin = r.imagemRelativa.replace(/\.jpg$/, '');
    const baseCompanion = r.companionRelativo.replace(/\.md$/, '');
    expect(baseBin).toBe(baseCompanion);

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [destino, conteudo] = mockWriteAsStringAsync.mock.calls[0] as [
      string,
      string,
    ];
    expect(destino).toContain('media/scanner/');
    expect(destino.endsWith('.md')).toBe(true);
    expect(conteudo).toContain('tipo: midia_foto');
    expect(conteudo).toContain('autor: pessoa_a');
    expect(conteudo).toContain('para: mim');
    expect(conteudo).toContain('Nota fiscal');
  });
});

describe('saveNota — multi page (.pdf)', () => {
  it('grava binario .pdf em media/scanner/, nao em assets/', async () => {
    const r = await saveNota({
      meta: metaBase,
      body: 'OCR concatenado das paginas',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/consolidado.pdf',
      isPdf: true,
    });

    expect(r.imagemRelativa.startsWith('media/scanner/')).toBe(true);
    expect(r.imagemRelativa.endsWith('.pdf')).toBe(true);
    expect(r.imagemRelativa.includes('assets/')).toBe(false);
    expect(r.imagemRelativa).toContain('multipagina');
  });

  it('companion usa tipo midia_pdf e referencia o pdf', async () => {
    const r = await saveNota({
      meta: metaBase,
      body: '',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/c.pdf',
      isPdf: true,
    });

    const [, conteudo] = mockWriteAsStringAsync.mock.calls[0] as [
      string,
      string,
    ];
    expect(conteudo).toContain('tipo: midia_pdf');
    const basenameBin = (r.imagemRelativa.split('/').pop() ?? '');
    expect(conteudo).toContain(`arquivo: ${basenameBin}`);
  });
});

describe('saveNota — md semantico em inbox/financeiro/nota', () => {
  it('mantem md em inbox/financeiro/nota e injeta wikilink no body', async () => {
    const r = await saveNota({
      meta: metaBase,
      body: 'Total: R$ 87,40',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/x.jpg',
      isPdf: false,
    });

    expect(r.uri).toContain('inbox/financeiro/nota/');
    expect(r.uri.endsWith('.md')).toBe(true);

    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [, metaArg, bodyArg] = mockWriteVaultFile.mock.calls[0] as [
      string,
      FinanceiroNotaMeta,
      string,
    ];
    expect(metaArg.imagem).toBe(r.imagemRelativa);
    expect(metaArg.imagem).not.toBe(IMAGEM_PENDENTE);
    expect(bodyArg).toContain('[[../../../media/scanner/');
    expect(bodyArg).toContain('Total: R$ 87,40');
  });

  it('rejeita meta invalido sem tocar o filesystem', async () => {
    const metaQuebrado = { ...metaBase, valor: -1 };
    await expect(
      saveNota({
        meta: metaQuebrado as unknown as FinanceiroNotaMeta,
        body: '',
        vaultRoot: VAULT_ROOT,
        imagemUri: 'file:///cache/x.jpg',
        isPdf: false,
      })
    ).rejects.toThrow(/nota invalida/);

    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });
});
