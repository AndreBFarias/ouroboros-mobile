// M34: testes do helper salvarFrase (texto puro -> .md em
// media/frases/). Cobre vault ausente, frase vazia, sucesso e
// silenciamento de erro.
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  writeAsStringAsync: jest.fn(),
}));

import * as FileSystem from 'expo-file-system/legacy';
import { salvarFrase } from '@/lib/midia/salvarFrase';

const writeSpy = FileSystem.writeAsStringAsync as unknown as jest.Mock;

describe('salvarFrase (M34)', () => {
  beforeEach(() => {
    writeSpy.mockReset();
    useVault.setState({ vaultRoot: 'file:///mock/vault' });
    usePessoa.setState({ pessoaAtiva: 'pessoa_a' });
  });

  it('retorna ok=false quando vaultRoot ausente', async () => {
    useVault.setState({ vaultRoot: null });
    const r = await salvarFrase({ frase: 'olá mundo' });
    expect(r.ok).toBe(false);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('retorna ok=false para frase vazia ou apenas espaco', async () => {
    expect((await salvarFrase({ frase: '' })).ok).toBe(false);
    expect((await salvarFrase({ frase: '   ' })).ok).toBe(false);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('escreve .md com path media/frases/<data>-<slug>.md em sucesso', async () => {
    writeSpy.mockResolvedValue(undefined);
    const r = await salvarFrase({
      frase: 'Tudo bem comigo hoje',
      para: { tipo: 'casal' },
    });
    expect(r.ok).toBe(true);
    expect(r.arquivo).toMatch(
      /^media\/frases\/\d{4}-\d{2}-\d{2}-tudo-bem-comigo-hoje\.md$/
    );
    expect(writeSpy).toHaveBeenCalledTimes(1);
    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    expect(writeArgs[0]).toContain('/mock/vault/media/frases/');
    expect(writeArgs[1]).toContain('tipo: midia_frase');
    expect(writeArgs[1]).toContain('autor: pessoa_a');
    expect(writeArgs[1]).toContain('para: casal');
    expect(writeArgs[1]).toContain('Tudo bem comigo hoje');
  });

  it('silencia erro de escrita em ok=false', async () => {
    writeSpy.mockRejectedValue(new Error('EACCES'));
    const r = await salvarFrase({ frase: 'algum texto' });
    expect(r.ok).toBe(false);
    expect(r.arquivo).toBeNull();
  });

  it('default para quando nao informado e mim', async () => {
    writeSpy.mockResolvedValue(undefined);
    await salvarFrase({ frase: 'sem destino' });
    const writeArgs = writeSpy.mock.calls[0] as [string, string];
    expect(writeArgs[1]).toContain('para: mim');
  });
});
