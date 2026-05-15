// Tests do receiver auto-classificador financeiro (Q10). Verifica que
// processarShareFinanceiro:
//   - Devolve null quando classifier nao casa.
//   - Monta path canonico em inbox/financeiro/<categoria>/ via
//     inboxFinanceiroPath.
//   - Preenche FinanceiroMeta valida com metadados extraidos.
//
// Funcao pura (sem I/O), entao os testes nao precisam mockar
// FileSystem.
import { processarShareFinanceiro } from '@/lib/share/financeiroReceiver';

const AGORA = new Date('2026-05-12T15:30:45-03:00');

describe('processarShareFinanceiro', () => {
  it('devolve null quando texto e nome nao casam com classifier', () => {
    const r = processarShareFinanceiro({
      conteudo: {
        texto: 'Lembrete: ligar para o medico amanha.',
        nomeArquivo: 'nota.txt',
        uri: 'content://x/y',
        mimeType: 'text/plain',
      },
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r).toBeNull();
  });

  it('classifica Pix e devolve path canonico em inbox/financeiro/pix', () => {
    const r = processarShareFinanceiro({
      conteudo: {
        texto: 'Pix enviado R$ 50,00 EAB123CD45EF6789 via Nubank',
        nomeArquivo: 'comprovante.pdf',
        uri: 'content://x/y',
        mimeType: 'application/pdf',
      },
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r).not.toBeNull();
    expect(r!.categoria).toBe('pix');
    expect(r!.relMd).toMatch(/^inbox\/financeiro\/pix\//);
    expect(r!.relMd).toMatch(/\.md$/);
    expect(r!.relBinario).toMatch(/^inbox\/financeiro\/pix\//);
    expect(r!.relBinario).toMatch(/\.pdf$/);
    expect(r!.meta.tipo).toBe('financeiro');
    expect(r!.meta.categoria).toBe('pix');
    expect(r!.meta.valor).toBe(50);
    expect(r!.meta.end_to_end_id).toBe('EAB123CD45EF6789');
    expect(r!.meta.autor).toBe('pessoa_a');
    expect(r!.meta.data).toBe('2026-05-12');
  });

  it('classifica boleto a partir de linha digitavel', () => {
    const r = processarShareFinanceiro({
      conteudo: {
        texto: 'Boleto: 23793.39001 60083.395002 71300.063307 1 96920000150000',
        nomeArquivo: null,
        uri: null,
        mimeType: 'text/plain',
      },
      autor: 'pessoa_b',
      agora: AGORA,
    });
    expect(r).not.toBeNull();
    expect(r!.categoria).toBe('boleto');
    expect(r!.relMd).toMatch(/^inbox\/financeiro\/boleto\//);
    expect(r!.relBinario).toBeNull();
    expect(r!.meta.linha_digitavel).toContain('23793.39001');
  });

  it('classifica extrato e captura instituicao', () => {
    const r = processarShareFinanceiro({
      conteudo: {
        texto: 'Nubank — Lancamentos. Saldo R$ 3.200,45',
        nomeArquivo: 'extrato-maio.pdf',
        uri: 'content://x/extrato',
        mimeType: 'application/pdf',
      },
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r).not.toBeNull();
    expect(r!.categoria).toBe('extrato');
    expect(r!.meta.instituicao).toMatch(/Nubank/i);
    expect(r!.meta.valor).toBe(3200.45);
    expect(r!.relMd).toMatch(/^inbox\/financeiro\/extrato\//);
  });

  it('trunca texto_origem em 600 chars', () => {
    const longo = 'Pix R$ 50 EAB123CD45EF6789 ' + 'x'.repeat(800);
    const r = processarShareFinanceiro({
      conteudo: { texto: longo, uri: null, mimeType: 'text/plain' },
      autor: 'pessoa_a',
      agora: AGORA,
    });
    expect(r).not.toBeNull();
    expect(r!.meta.texto_origem!.length).toBeLessThanOrEqual(600);
  });

  it('cai no nomeArquivo quando texto e ausente', () => {
    const r = processarShareFinanceiro({
      conteudo: {
        texto: null,
        nomeArquivo: 'extrato-nubank-maio-2026.pdf',
        uri: 'content://x',
        mimeType: 'application/pdf',
      },
      autor: 'pessoa_a',
      agora: AGORA,
    });
    // 'extrato-nubank-...' deve casar com classifier (Nubank + extrato)
    expect(r).not.toBeNull();
    expect(r!.categoria).toBe('extrato');
  });
});
