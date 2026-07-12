// Tests do sincronizarWidget (R-WIDG-1, 2026-05-17). Mock pesado da
// bridge nativa (modules/widget-homescreen/src) + tarefas vault.
//
// Cobre:
//   - montarTarefaDeEntry devolve Tarefa valida com defaults v2.
//   - montarTarefaDeEntry trata entry com titulo vazio -> null.
//   - montarTarefaDeEntry trunca titulo > 200 chars.
//   - drenarFilaTodoWidget: vault root ausente -> resultado zerado.
//   - drenarFilaTodoWidget: fila vazia -> resultado zerado, criarTarefa
//     nao chamado.
//   - drenarFilaTodoWidget: 3 entries -> 3 criarTarefa + 1 limparFila.
//   - drenarFilaTodoWidget: criarTarefa lanca -> falhadas++, continua
//     processando restante, limparFila ainda chamado.
//   - sincronizarCountPendentes: toggle off -> count=0.
//   - sincronizarCountPendentes: conta pendentes (feito=false).
//
// Comentarios sem acentuacao.
import {
  drenarFilaTodoWidget,
  sincronizarCountPendentes,
  montarTarefaDeEntry,
} from '@/lib/widget/sincronizarWidget';
import { useSettings } from '@/lib/stores/settings';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';

// Mock da bridge nativa do widget. Prefixo `mock*` exigido pelo factory
// hoisting do jest.mock.
const mockAtualizarCount = jest.fn();
const mockLerFila = jest.fn();
const mockLimparFila = jest.fn();
jest.mock('../../../modules/widget-homescreen/src', () => ({
  atualizarCountTodoWidget: (n: number) =>
    (mockAtualizarCount as unknown as (n: number) => Promise<void>)(n),
  lerFilaTodoWidget: () =>
    (mockLerFila as unknown as () => Promise<unknown[]>)(),
  limparFilaTodoWidget: () =>
    (mockLimparFila as unknown as () => Promise<void>)(),
}));

// Mock dos helpers de tarefas. criarTarefa e listarTarefas sao callees
// pesados que envolvem SAF; aqui controlamos comportamento direto.
const mockCriarTarefa = jest.fn();
const mockListarTarefas = jest.fn();
jest.mock('@/lib/vault/tarefas', () => ({
  criarTarefa: (...args: unknown[]) =>
    (
      mockCriarTarefa as unknown as (
        ...a: unknown[]
      ) => Promise<unknown>
    )(...args),
  listarTarefas: (...args: unknown[]) =>
    (
      mockListarTarefas as unknown as (
        ...a: unknown[]
      ) => Promise<unknown>
    )(...args),
}));

describe('montarTarefaDeEntry', () => {
  it('devolve Tarefa valida com defaults v2 para entry comum', () => {
    const entry = { titulo: 'comprar pão', criadoEmMs: 1714579200000 };
    const result = montarTarefaDeEntry(entry, 'pessoa_a');
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.meta.tipo).toBe('tarefa');
    expect(result.meta.autor).toBe('pessoa_a');
    expect(result.meta.titulo).toBe('comprar pão');
    expect(result.meta.feito).toBe(false);
    expect(result.meta.feito_em).toBeNull();
    expect(result.meta.categoria).toBe('outro');
    expect(result.meta.pessoa_destino).toEqual({ tipo: 'mim' });
    expect(result.meta.alarme).toBeNull();
    expect(result.slug).toMatch(/^comprar-pao-[a-z0-9]{4}$/);
  });

  it('rejeita entry com titulo vazio (so espaco) devolvendo null', () => {
    const entry = { titulo: '   ', criadoEmMs: Date.now() };
    expect(montarTarefaDeEntry(entry, 'pessoa_a')).toBeNull();
  });

  it('trunca titulo acima de 200 chars para caber no schema', () => {
    const titulo = 'x'.repeat(300);
    const entry = { titulo, criadoEmMs: Date.now() };
    const result = montarTarefaDeEntry(entry, 'pessoa_b');
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.meta.titulo.length).toBe(200);
  });

  it('formata data em UTC-3 a partir de criadoEmMs (fuso do projeto)', () => {
    // 2026-05-17T03:00:00Z = 2026-05-17T00:00:00-03:00 (UTC-3).
    const ms = Date.UTC(2026, 4, 17, 3, 0, 0);
    const entry = { titulo: 'teste', criadoEmMs: ms };
    const result = montarTarefaDeEntry(entry, 'pessoa_a');
    expect(result?.meta.data).toBe('2026-05-17');
  });
});

describe('drenarFilaTodoWidget', () => {
  beforeEach(() => {
    mockAtualizarCount.mockClear();
    mockLerFila.mockReset();
    mockLimparFila.mockClear();
    mockCriarTarefa.mockReset();
    mockListarTarefas.mockReset();
    mockListarTarefas.mockResolvedValue([]);

    useSettings.getState().resetar();
    usePessoa.getState().resetar();
    useVault.getState().setVaultRoot('content://mock/vault');
  });

  it('vault sem root devolve resultado zerado e nao chama criarTarefa', async () => {
    useVault.getState().clearVaultRoot();
    const result = await drenarFilaTodoWidget();
    expect(result).toEqual({ tentadas: 0, criadas: 0, falhadas: 0 });
    expect(mockCriarTarefa).not.toHaveBeenCalled();
  });

  it('fila vazia devolve resultado zerado e nao chama criarTarefa', async () => {
    mockLerFila.mockResolvedValueOnce([]);
    const result = await drenarFilaTodoWidget();
    expect(result).toEqual({ tentadas: 0, criadas: 0, falhadas: 0 });
    expect(mockCriarTarefa).not.toHaveBeenCalled();
    expect(mockLimparFila).not.toHaveBeenCalled();
  });

  it('drena 3 entries criando 3 tarefas e zerando fila uma vez', async () => {
    mockLerFila.mockResolvedValueOnce([
      { titulo: 'comprar pao', criadoEmMs: Date.now() },
      { titulo: 'ligar medico', criadoEmMs: Date.now() },
      { titulo: 'pagar conta', criadoEmMs: Date.now() },
    ]);
    mockCriarTarefa.mockResolvedValue({ uri: 'x', rel: 'y' });
    const result = await drenarFilaTodoWidget();
    expect(result.tentadas).toBe(3);
    expect(result.criadas).toBe(3);
    expect(result.falhadas).toBe(0);
    expect(mockCriarTarefa).toHaveBeenCalledTimes(3);
    expect(mockLimparFila).toHaveBeenCalledTimes(1);
  });

  it('falha em uma entry incrementa falhadas e ainda zera a fila', async () => {
    mockLerFila.mockResolvedValueOnce([
      { titulo: 'ok 1', criadoEmMs: Date.now() },
      { titulo: 'falha', criadoEmMs: Date.now() },
      { titulo: 'ok 2', criadoEmMs: Date.now() },
    ]);
    mockCriarTarefa
      .mockResolvedValueOnce({ uri: 'a', rel: 'b' })
      .mockRejectedValueOnce(new Error('SAF write erro'))
      .mockResolvedValueOnce({ uri: 'c', rel: 'd' });
    const result = await drenarFilaTodoWidget();
    expect(result.criadas).toBe(2);
    expect(result.falhadas).toBe(1);
    expect(mockLimparFila).toHaveBeenCalledTimes(1);
  });

  it('entry com titulo vazio so vira falhada sem chamar criarTarefa', async () => {
    mockLerFila.mockResolvedValueOnce([
      { titulo: '', criadoEmMs: Date.now() },
      { titulo: 'valida', criadoEmMs: Date.now() },
    ]);
    // O bridge JS (modules/widget-homescreen/src) ja filtra titulos
    // vazios via .filter no parser; mas o helper aqui defende em
    // profundidade caso o mock devolva direto sem filtro.
    mockCriarTarefa.mockResolvedValue({ uri: 'x', rel: 'y' });
    const result = await drenarFilaTodoWidget();
    // 2 entries vieram, mas a primeira tem titulo vazio: montar
    // devolve null -> falhada++ sem chamar criarTarefa.
    expect(result.tentadas).toBe(2);
    expect(result.criadas).toBe(1);
    expect(result.falhadas).toBe(1);
    expect(mockCriarTarefa).toHaveBeenCalledTimes(1);
  });
});

describe('sincronizarCountPendentes', () => {
  beforeEach(() => {
    mockAtualizarCount.mockClear();
    mockListarTarefas.mockReset();
    mockListarTarefas.mockResolvedValue([]);

    useSettings.getState().resetar();
    usePessoa.getState().resetar();
    useVault.getState().setVaultRoot('content://mock/vault');
  });

  it('toggle off envia count=0 sem listar tarefas', async () => {
    useSettings.getState().setFeatureToggle('widgetHomescreen', false);
    await sincronizarCountPendentes();
    expect(mockAtualizarCount).toHaveBeenCalledWith(0);
    expect(mockListarTarefas).not.toHaveBeenCalled();
  });

  it('vault sem root envia count=0 sem listar', async () => {
    useVault.getState().clearVaultRoot();
    await sincronizarCountPendentes();
    expect(mockAtualizarCount).toHaveBeenCalledWith(0);
    expect(mockListarTarefas).not.toHaveBeenCalled();
  });

  it('conta apenas tarefas pendentes (feito=false)', async () => {
    useSettings.getState().setFeatureToggle('widgetHomescreen', true);
    mockListarTarefas.mockResolvedValueOnce([
      { meta: { feito: false, titulo: 'a' }, rel: 'a' },
      { meta: { feito: false, titulo: 'b' }, rel: 'b' },
      { meta: { feito: true, titulo: 'c' }, rel: 'c' },
      { meta: { feito: true, titulo: 'd' }, rel: 'd' },
      { meta: { feito: false, titulo: 'e' }, rel: 'e' },
    ]);
    await sincronizarCountPendentes();
    expect(mockAtualizarCount).toHaveBeenCalledWith(3);
  });
});
