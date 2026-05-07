// M34 / I-FRASE (M-SAVE-FRASE-VALIDA): testes do helper salvarFrase.
// Cobertura:
//   - frase vazia ou whitespace -> ok=false sem write.
//   - vaultRoot ausente -> throw 'Vault não conectado.' (caller trata
//     no toast).
//   - sucesso normal -> path canonico H2 (markdown/frase-...md) com
//     vaultUriJoin (sem trailing space, sem %20, sem barras duplas).
//   - default para='mim' quando nao informado.
//   - colisao de slug no mesmo dia -> sufixo -2 no segundo save.
//   - vaultRoot com URI SAF tree (content://...primary:Test%20) gera
//     URI final limpo apos vaultUriJoin.
//   - erro de write propaga para caller (nao silencia).
//
// Comentarios sem acento.
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  writeAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

import * as FileSystem from 'expo-file-system/legacy';
import { salvarFrase } from '@/lib/midia/salvarFrase';

const writeSpy = FileSystem.writeAsStringAsync as unknown as jest.Mock;
const infoSpy = FileSystem.getInfoAsync as unknown as jest.Mock;

describe('salvarFrase (M34 / I-FRASE)', () => {
  beforeEach(() => {
    writeSpy.mockReset();
    infoSpy.mockReset();
    // Default: arquivo nao existe (sem colisao).
    infoSpy.mockResolvedValue({ exists: false });
    useVault.setState({ vaultRoot: 'file:///mock/vault' });
    usePessoa.setState({ pessoaAtiva: 'pessoa_a' });
  });

  it('retorna ok=false para frase vazia ou apenas espaco', async () => {
    expect((await salvarFrase({ frase: '' })).ok).toBe(false);
    expect((await salvarFrase({ frase: '   ' })).ok).toBe(false);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('lanca erro claro quando vaultRoot ausente (caller exibe toast)', async () => {
    useVault.setState({ vaultRoot: null });
    await expect(salvarFrase({ frase: 'olá mundo' })).rejects.toThrow(
      'Vault não conectado.'
    );
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('escreve .md com path markdown/frase-<data>-<slug>.md em sucesso (H2 layout-por-tipo)', async () => {
    writeSpy.mockResolvedValue(undefined);
    const r = await salvarFrase({
      frase: 'Tudo bem comigo hoje',
      para: { tipo: 'casal' },
    });
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatch(
      /^markdown\/frase-\d{4}-\d{2}-\d{2}-tudo-bem-comigo-hoje\.md$/
    );
    expect(writeSpy).toHaveBeenCalledTimes(1);
    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    expect(writeArgs[0]).toContain('/mock/vault/markdown/frase-');
    expect(writeArgs[1]).toContain('tipo: midia_frase');
    expect(writeArgs[1]).toContain('autor: pessoa_a');
    expect(writeArgs[1]).toContain('para: casal');
    expect(writeArgs[1]).toContain('Tudo bem comigo hoje');
  });

  it('default para quando nao informado e mim', async () => {
    writeSpy.mockResolvedValue(undefined);
    await salvarFrase({ frase: 'sem destino' });
    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    expect(writeArgs[1]).toContain('para: mim');
  });

  it('vaultRoot SAF tree URI com %20 trailing gera path final limpo via vaultUriJoin', async () => {
    // SAF tree URI tipico: content://com.android.externalstorage.documents/tree/primary:Test%20
    // Sprint H1 (vaultUriJoin) garante trim de %20 trailing + barras
    // duplas. Aqui validamos integracao end-to-end (writer -> helper).
    useVault.setState({
      vaultRoot:
        'content://com.android.externalstorage.documents/tree/primary:Test%20',
    });
    writeSpy.mockResolvedValue(undefined);
    const r = await salvarFrase({ frase: 'algum texto resiliente' });
    expect(r.ok).toBe(true);
    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    // Sem barras duplas
    expect(writeArgs[0]).not.toMatch(/[^:]\/\//);
    // Sem %20 ofensivo no fim do root (garantido por vaultUriJoin)
    expect(writeArgs[0]).not.toMatch(/%20\//);
    // Path final comeca com markdown/ apos a base
    expect(writeArgs[0]).toContain('/markdown/frase-');
  });

  it('colisao de slug no mesmo dia: segundo save recebe sufixo -2', async () => {
    writeSpy.mockResolvedValue(undefined);
    // Primeira chamada: arquivo base nao existe (default ja setado em
    // beforeEach). Segunda: simulamos que markdown/frase-...mesma-frase.md
    // ja existe, mas markdown/frase-...mesma-frase-2.md nao.
    let chamada = 0;
    infoSpy.mockImplementation(async () => {
      chamada += 1;
      // Estrategia: 1a chamada (base path do 1o save) -> nao existe.
      // 2a chamada (base do 2o save) -> existe.
      // 3a chamada (sufixo -2 do 2o save) -> nao existe.
      if (chamada === 1) return { exists: false };
      if (chamada === 2) return { exists: true };
      return { exists: false };
    });

    const r1 = await salvarFrase({ frase: 'mesma frase de teste' });
    const r2 = await salvarFrase({ frase: 'mesma frase de teste' });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.arquivo).toMatch(/-mesma-frase-de-teste\.md$/);
    expect(r2.arquivo).toMatch(/-mesma-frase-de-teste-2\.md$/);
    expect(writeSpy).toHaveBeenCalledTimes(2);
  });

  it('erro de write propaga para caller (nao silencia em ok=false)', async () => {
    writeSpy.mockRejectedValue(new Error('EACCES'));
    await expect(salvarFrase({ frase: 'algum texto' })).rejects.toThrow(
      'EACCES'
    );
  });
});
