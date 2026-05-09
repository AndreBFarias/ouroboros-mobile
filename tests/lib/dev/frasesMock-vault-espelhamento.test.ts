// V4.0.1 (INFRA-VAULT-MOCK-CONVERGENCIA, 2026-05-08): unit do
// espelhamento automatico de useFrasesMock.adicionar para useVaultMock.
// Garante que ao adicionar uma frase mock, o companion .md tambem
// aparece no vault mock no path canonico <vaultRoot>/<arquivo>.
//
// Comentarios sem acento (convencao shell/CI).
import { useFrasesMock } from '@/lib/dev/frasesMock';
import { useVaultMock } from '@/lib/dev/vaultMockStore';
import { useVault } from '@/lib/stores/vault';

describe('useFrasesMock.adicionar - espelhamento vault mock (V4.0.1)', () => {
  beforeEach(() => {
    useFrasesMock.getState().limpar();
    useVaultMock.getState().limpar();
    useVault.setState({ vaultRoot: 'web://mock-vault/Ouroboros' });
  });

  it('com vaultRoot setado, replica companion no path canonico', () => {
    const arquivo = 'markdown/frase-2026-05-08-tudo-bem.md';
    const companion = '---\ntipo: midia_frase\n---\n\nTudo bem\n';
    useFrasesMock.getState().adicionar({
      arquivo,
      texto: 'Tudo bem',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
      companion,
      data: '2026-05-08T10:00:00Z',
    });
    const uri = 'web://mock-vault/Ouroboros/markdown/frase-2026-05-08-tudo-bem.md';
    expect(useVaultMock.getState().getArquivo(uri)).toBe(companion);
    expect(useVaultMock.getState().listar()).toContain(uri);
  });

  it('sem vaultRoot setado, pula espelhamento (silencioso)', () => {
    useVault.setState({ vaultRoot: null });
    useFrasesMock.getState().adicionar({
      arquivo: 'markdown/frase-x.md',
      texto: 'x',
      autor: 'pessoa_a',
      para: { tipo: 'mim' },
      companion: '---\n---\n',
      data: '2026-05-08T10:00:00Z',
    });
    expect(useVaultMock.getState().listar()).toEqual([]);
    // Frase ainda foi adicionada na store de dominio.
    expect(useFrasesMock.getState().frases.length).toBe(1);
  });

  it('multiplas frases populam multiplas entradas no vault mock', () => {
    const base = {
      texto: 't',
      autor: 'pessoa_a' as const,
      para: { tipo: 'mim' as const },
      data: '2026-05-08T10:00:00Z',
    };
    useFrasesMock.getState().adicionar({
      ...base,
      arquivo: 'markdown/frase-a.md',
      companion: '---\nA\n---\n',
    });
    useFrasesMock.getState().adicionar({
      ...base,
      arquivo: 'markdown/frase-b.md',
      companion: '---\nB\n---\n',
    });
    expect(useVaultMock.getState().listar().length).toBe(2);
  });
});
