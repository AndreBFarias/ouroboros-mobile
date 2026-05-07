// Testes do saveNota apos I-SCANNER (M-SAVE-SCANNER-VALIDA +
// M-SCANNER-LAYOUT-POR-TIPO, 2026-05-07). Garante:
//  - binario .pdf (multi page) e .jpg (single page) gravados em
//    <ext>/scanner-<slug>.<ext> (layout-por-tipo H2, nao mais em
//    media/scanner/);
//  - companion .md 1:1 ao binario gravado em
//    markdown/scanner-<slug>.md (mesmo slug, padrao M34);
//  - md semantico em markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md
//    (FinanceiroNotaMeta com OCR + revisar) com wikilink no body
//    apontando o binario via '../<ext>/scanner-<slug>';
//  - meta.imagem sobrescreve o sentinela IMAGEM_PENDENTE com path
//    real ao Vault;
//  - vaultUriJoin canonico: vaultRoot vazio lanca erro claro,
//    trailing whitespace e %20 sao removidos;
//  - OCR confianca baixa (<0.8) gera revisar:true no frontmatter
//    do md semantico, refletido em metaArg passado ao writeVaultFile.
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

describe('saveNota — single page (.jpg) layout-por-tipo H2', () => {
  it('grava binario em jpg/scanner-<slug>.jpg (nao em media/scanner/)', async () => {
    const r = await saveNota({
      meta: metaBase,
      body: 'Texto OCR do recibo',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/img-tmp.jpg',
      isPdf: false,
    });

    expect(r.imagemRelativa.startsWith('jpg/scanner-')).toBe(true);
    expect(r.imagemRelativa.endsWith('.jpg')).toBe(true);
    expect(r.imagemRelativa.includes('media/scanner/')).toBe(false);
    expect(r.imagemRelativa.includes('assets/')).toBe(false);

    expect(mockCopyAsync).toHaveBeenCalledTimes(1);
    const arg = mockCopyAsync.mock.calls[0][0] as { from: string; to: string };
    expect(arg.from).toBe('file:///cache/img-tmp.jpg');
    expect(arg.to).toContain('jpg/scanner-');
    expect(arg.to.endsWith('.jpg')).toBe(true);
    // vaultUriJoin: sem barras duplas no path (apos o esquema
    // content://). Removemos o esquema antes de validar.
    expect(arg.to.startsWith(`${VAULT_ROOT}/jpg/scanner-`)).toBe(true);
    const semEsquema = arg.to.replace(/^[a-z]+:\/\//, '');
    expect(semEsquema).not.toMatch(/\/\//);
  });

  it('grava companion .md 1:1 em markdown/scanner-<slug>.md', async () => {
    const r = await saveNota({
      meta: metaBase,
      body: '',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/x.jpg',
      isPdf: false,
    });

    expect(r.companionRelativo.startsWith('markdown/scanner-')).toBe(true);
    expect(r.companionRelativo.endsWith('.md')).toBe(true);

    // Mesmo slug entre binario e companion: extrair slug e comparar.
    const slugBin = r.imagemRelativa
      .replace(/^jpg\/scanner-/, '')
      .replace(/\.jpg$/, '');
    const slugCompanion = r.companionRelativo
      .replace(/^markdown\/scanner-/, '')
      .replace(/\.md$/, '');
    expect(slugBin).toBe(slugCompanion);

    expect(mockWriteAsStringAsync).toHaveBeenCalledTimes(1);
    const [destino, conteudo] = mockWriteAsStringAsync.mock.calls[0] as [
      string,
      string,
    ];
    expect(destino).toContain('markdown/scanner-');
    expect(destino.endsWith('.md')).toBe(true);
    expect(conteudo).toContain('tipo: midia_foto');
    expect(conteudo).toContain('autor: pessoa_a');
    expect(conteudo).toContain('para: mim');
    expect(conteudo).toContain('Nota fiscal');
    // Companion arquivo aponta o basename do binario com ext.
    expect(conteudo).toContain(`arquivo: scanner-${slugBin}.jpg`);
  });
});

describe('saveNota — multi page (.pdf) layout-por-tipo H2', () => {
  it('grava binario .pdf em pdf/scanner-<slug>.pdf (nao em media/scanner/)', async () => {
    const r = await saveNota({
      meta: metaBase,
      body: 'OCR concatenado das paginas',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/consolidado.pdf',
      isPdf: true,
    });

    expect(r.imagemRelativa.startsWith('pdf/scanner-')).toBe(true);
    expect(r.imagemRelativa.endsWith('.pdf')).toBe(true);
    expect(r.imagemRelativa.includes('media/scanner/')).toBe(false);
    expect(r.imagemRelativa.includes('assets/')).toBe(false);
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
    const basenameBin = r.imagemRelativa.split('/').pop() ?? '';
    expect(conteudo).toContain(`arquivo: ${basenameBin}`);
    expect(basenameBin.endsWith('.pdf')).toBe(true);
  });
});

describe('saveNota — md semantico em markdown/nota-...md', () => {
  it('grava md em markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md e injeta wikilink no body', async () => {
    const r = await saveNota({
      meta: metaBase,
      body: 'Total: R$ 87,40',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/x.jpg',
      isPdf: false,
    });

    // markdown/nota-... (layout-por-tipo H2). Ja nao usa
    // inbox/financeiro/nota/ legado.
    expect(r.uri).toContain('markdown/nota-');
    expect(r.uri.includes('inbox/financeiro/nota/')).toBe(false);
    expect(r.uri.endsWith('.md')).toBe(true);
    // Filename casa o padrao de notaPath: nota-YYYY-MM-DD-HHmmss-slug.md
    expect(r.uri).toMatch(/markdown\/nota-\d{4}-\d{2}-\d{2}-\d{6}-[a-z0-9-]+\.md$/);

    expect(mockWriteVaultFile).toHaveBeenCalledTimes(1);
    const [, metaArg, bodyArg] = mockWriteVaultFile.mock.calls[0] as [
      string,
      FinanceiroNotaMeta,
      string,
    ];
    expect(metaArg.imagem).toBe(r.imagemRelativa);
    expect(metaArg.imagem).not.toBe(IMAGEM_PENDENTE);
    // Wikilink relativo ao md em markdown/: '../jpg/scanner-<slug>'.
    expect(bodyArg).toContain('[[../jpg/scanner-');
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

describe('saveNota — vaultUriJoin canonico (H1)', () => {
  it('vaultRoot vazio lanca erro de vaultUriJoin sem tocar filesystem', async () => {
    await expect(
      saveNota({
        meta: metaBase,
        body: '',
        vaultRoot: '',
        imagemUri: 'file:///cache/x.jpg',
        isPdf: false,
      })
    ).rejects.toThrow(/vault/i);

    expect(mockCopyAsync).not.toHaveBeenCalled();
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
    expect(mockWriteVaultFile).not.toHaveBeenCalled();
  });

  it('vaultRoot com trailing whitespace e %20 saneado pelo vaultUriJoin', async () => {
    const rootSujo = `${VAULT_ROOT}%20  `;
    const r = await saveNota({
      meta: metaBase,
      body: '',
      vaultRoot: rootSujo,
      imagemUri: 'file:///cache/x.jpg',
      isPdf: false,
    });

    const arg = mockCopyAsync.mock.calls[0][0] as { from: string; to: string };
    // vaultUriJoin remove %20 ofensivo + trailing whitespace, sem
    // gerar barras duplas. r.imagemRelativa permanece relativo (sem
    // VAULT_ROOT).
    expect(arg.to.startsWith(`${VAULT_ROOT}/jpg/scanner-`)).toBe(true);
    expect(arg.to).not.toContain('%20/');
    const semEsquema = arg.to.replace(/^[a-z]+:\/\//, '');
    expect(semEsquema).not.toMatch(/\/\//);
    expect(r.imagemRelativa.startsWith('jpg/scanner-')).toBe(true);
  });
});

describe('saveNota — OCR confianca baixa marca revisar=true', () => {
  it('confianca <0.8 propaga revisar=true para meta gravada', async () => {
    const metaConfBaixa: FinanceiroNotaMeta = {
      ...metaBase,
      ocr_confianca: 0.3,
      revisar: true,
    };
    await saveNota({
      meta: metaConfBaixa,
      body: 'texto borrado',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/borrado.jpg',
      isPdf: false,
    });

    const [, metaArg] = mockWriteVaultFile.mock.calls[0] as [
      string,
      FinanceiroNotaMeta,
      string,
    ];
    expect(metaArg.revisar).toBe(true);
    expect(metaArg.ocr_confianca).toBe(0.3);
  });

  it('confianca alta mantem revisar=false', async () => {
    await saveNota({
      meta: metaBase,
      body: 'texto nitido',
      vaultRoot: VAULT_ROOT,
      imagemUri: 'file:///cache/nitido.jpg',
      isPdf: false,
    });

    const [, metaArg] = mockWriteVaultFile.mock.calls[0] as [
      string,
      FinanceiroNotaMeta,
      string,
    ];
    expect(metaArg.revisar).toBe(false);
    expect(metaArg.ocr_confianca).toBeGreaterThanOrEqual(0.8);
  });
});
