// Testes do boot hook AUDIT-P4-8 sanearEstadoTextoPuro, que reescreve
// os .md de _estado deste device sem os campos sensiveis que versoes
// anteriores espelhavam (nomes e fotos em pessoa, corpo dos rascunhos
// em sessao).
//
// Mocka escreverEstadoCanonicoImediato para observar o payload de cada
// key; stores reais (zustand in-memory) para flags e vaultRoot.
//
// Comentarios sem acento (convencao shell/CI).

const mockEscreverImediato = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/vault/escreverEstado', () => ({
  __esModule: true,
  escreverEstadoCanonico: jest.fn(),
  escreverEstadoCanonicoImediato: (...args: unknown[]) =>
    mockEscreverImediato(...args),
}));

import {
  sanearEstadoTextoPuro,
  sanearEstadoTextoPuroUmaVez,
} from '@/lib/boot/sanearEstadoTextoPuro';
import { BOOT_HOOKS } from '@/lib/boot/reagendamento';
import { usePessoa } from '@/lib/stores/pessoa';
import { useSessao } from '@/lib/stores/sessao';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

function payloadDe(key: string): Record<string, unknown> | undefined {
  const chamada = mockEscreverImediato.mock.calls.find((c) => c[0] === key);
  return chamada?.[1] as Record<string, unknown> | undefined;
}

describe('sanearEstadoTextoPuro (AUDIT-P4-8)', () => {
  beforeEach(() => {
    mockEscreverImediato.mockClear();
    usePessoa.getState().resetar();
    useSessao.getState().resetar();
    useVault.setState({ vaultRoot: VAULT_ROOT });
  });

  it('reescreve pessoa sem nomes e sem fotos', async () => {
    usePessoa.getState().setNome('pessoa_a', 'Nome_Secreto');
    await sanearEstadoTextoPuro();

    const payload = payloadDe('pessoa');
    expect(payload).toBeDefined();
    expect(payload).not.toHaveProperty('nomes');
    expect(payload).not.toHaveProperty('fotos');
    expect(JSON.stringify(payload)).not.toContain('Nome_Secreto');
  });

  it('reescreve sessao sem o corpo dos rascunhos', async () => {
    useSessao
      .getState()
      .salvarRascunho('diarioEmocional', { texto: 'texto secreto' });
    await sanearEstadoTextoPuro();

    const payload = payloadDe('sessao');
    expect(payload).toBeDefined();
    expect(payload).not.toHaveProperty('rascunhos');
    expect(JSON.stringify(payload)).not.toContain('texto secreto');
    expect(payload).toHaveProperty('flags');
  });

  it('marca a flag depois de rodar', async () => {
    await sanearEstadoTextoPuroUmaVez();
    expect(useSessao.getState().flags.estadoTextoPuroSaneado).toBe(true);
    expect(mockEscreverImediato).toHaveBeenCalledTimes(2);
  });

  it('nao repete quando a flag ja subiu', async () => {
    useSessao.getState().marcarFlagBoot('estadoTextoPuroSaneado');
    mockEscreverImediato.mockClear();
    await sanearEstadoTextoPuroUmaVez();
    expect(mockEscreverImediato).not.toHaveBeenCalled();
  });

  it('sem vaultRoot nao escreve nem marca a flag', async () => {
    useVault.setState({ vaultRoot: null });
    await sanearEstadoTextoPuroUmaVez();
    expect(mockEscreverImediato).not.toHaveBeenCalled();
    expect(useSessao.getState().flags.estadoTextoPuroSaneado).toBe(false);
  });

  it('esta plugado em BOOT_HOOKS', () => {
    expect(BOOT_HOOKS).toContain(sanearEstadoTextoPuroUmaVez);
  });
});
