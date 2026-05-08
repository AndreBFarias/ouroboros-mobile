// Sprint S2 (M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR): testes do
// re-agendamento idempotente do alarme companion quando o usuario
// edita uma tarefa que ja tem alarme vinculado. Cobre transicoes:
//
//  - data_hora_iso muda  -> agendarAlarme disparado uma vez.
//  - recorrencia muda    -> agendarAlarme disparado uma vez.
//  - ativo: true -> false -> cancelarAlarme disparado, sem agendarAlarme.
//  - nada relevante muda -> nenhum dos dois disparado.
//  - alarme criado do zero (sem slug_vinculado antigo) -> branch
//    reagendar inerte (responsabilidade de criarTarefa).
//
// Mocks espelham o setup de tarefas.test.ts. Comentarios sem acento
// (convencao shell/CI).
import type { Tarefa } from '@/lib/schemas/tarefa';

const mockReadVaultFile = jest.fn();
const mockWriteVaultFile = jest.fn();
const mockEscreverAlarme = jest.fn();
const mockAgendarAlarme = jest.fn();
const mockCancelarAlarme = jest.fn();

jest.mock('@/lib/vault/reader', () => ({
  __esModule: true,
  listVaultFolder: jest.fn(),
  readVaultFile: (...args: unknown[]) => mockReadVaultFile(...args),
}));
jest.mock('@/lib/vault/writer', () => ({
  __esModule: true,
  writeVaultFile: (...args: unknown[]) => mockWriteVaultFile(...args),
}));
jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  cacheDirectory: 'cache://test/',
  makeDirectoryAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  StorageAccessFramework: {
    readAsStringAsync: jest.fn(),
    deleteAsync: jest.fn(),
  },
}));
jest.mock('@/lib/vault/alarmes', () => ({
  __esModule: true,
  escreverAlarme: (...args: unknown[]) => mockEscreverAlarme(...args),
}));
jest.mock('@/lib/services/alarmesNotificacoes', () => ({
  __esModule: true,
  agendarAlarme: (...args: unknown[]) => mockAgendarAlarme(...args),
  cancelarAlarme: (...args: unknown[]) => mockCancelarAlarme(...args),
}));

import { escreverTarefa } from '@/lib/vault/tarefas';

const VAULT_ROOT = 'content://test/vault';
const REL = 'markdown/tarefa-foo-1234.md';
const URI = `${VAULT_ROOT}/${REL}`;
const SLUG_VINCULADO = 'foo-1234-alarme';

function tarefaComAlarme(over: Partial<Tarefa['alarme']> = {}): Tarefa {
  return {
    tipo: 'tarefa',
    data: '2026-04-29',
    autor: 'pessoa_a',
    titulo: 'Reuniao',
    feito: false,
    feito_em: null,
    categoria: 'outro',
    pessoa_destino: { tipo: 'mim' },
    alarme: {
      ativo: true,
      data_hora_iso: '2026-05-01T14:00:00-03:00',
      recorrencia: 'unica',
      slug_vinculado: SLUG_VINCULADO,
      ...over,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWriteVaultFile.mockResolvedValue(undefined);
  mockEscreverAlarme.mockResolvedValue({
    uri: `${VAULT_ROOT}/markdown/alarme-${SLUG_VINCULADO}.md`,
    rel: `markdown/alarme-${SLUG_VINCULADO}.md`,
  });
  mockAgendarAlarme.mockResolvedValue({ ids: ['x'], estourou: false });
  mockCancelarAlarme.mockResolvedValue(undefined);
});

describe('escreverTarefa - re-agendamento companion (S2)', () => {
  it('reagenda quando data_hora_iso muda', async () => {
    const antigo = tarefaComAlarme({
      data_hora_iso: '2026-05-01T14:00:00-03:00',
    });
    mockReadVaultFile.mockResolvedValueOnce({ meta: antigo, body: '' });

    const novo = tarefaComAlarme({
      data_hora_iso: '2026-05-02T18:30:00-03:00',
    });
    await escreverTarefa(VAULT_ROOT, REL, novo);

    expect(mockWriteVaultFile).toHaveBeenCalledWith(URI, novo, '');
    expect(mockEscreverAlarme).toHaveBeenCalledTimes(1);
    expect(mockAgendarAlarme).toHaveBeenCalledTimes(1);
    // O Alarme reconstruido herda slug vinculado e horario derivado.
    const alarmeAgendado = mockAgendarAlarme.mock.calls[0][0];
    expect(alarmeAgendado.slug).toBe(SLUG_VINCULADO);
    expect(alarmeAgendado.data_unica).toBe('2026-05-02T18:30:00-03:00');
  });

  it('reagenda quando recorrencia muda (unica -> diaria)', async () => {
    const antigo = tarefaComAlarme({ recorrencia: 'unica' });
    mockReadVaultFile.mockResolvedValueOnce({ meta: antigo, body: '' });

    const novo = tarefaComAlarme({ recorrencia: 'diaria' });
    await escreverTarefa(VAULT_ROOT, REL, novo);

    expect(mockEscreverAlarme).toHaveBeenCalledTimes(1);
    expect(mockAgendarAlarme).toHaveBeenCalledTimes(1);
    const alarmeAgendado = mockAgendarAlarme.mock.calls[0][0];
    expect(alarmeAgendado.recorrencia).toBe('diaria');
  });

  it('cancela schedules quando alarme e desativado (true -> false)', async () => {
    const antigo = tarefaComAlarme({ ativo: true });
    mockReadVaultFile.mockResolvedValueOnce({ meta: antigo, body: '' });

    const novo = tarefaComAlarme({ ativo: false });
    await escreverTarefa(VAULT_ROOT, REL, novo);

    expect(mockCancelarAlarme).toHaveBeenCalledTimes(1);
    expect(mockCancelarAlarme).toHaveBeenCalledWith(SLUG_VINCULADO);
    expect(mockEscreverAlarme).not.toHaveBeenCalled();
    expect(mockAgendarAlarme).not.toHaveBeenCalled();
  });

  it('no-op quando nada relevante mudou (apenas titulo)', async () => {
    const antigo = tarefaComAlarme();
    mockReadVaultFile.mockResolvedValueOnce({ meta: antigo, body: '' });

    const novo: Tarefa = { ...tarefaComAlarme(), titulo: 'Reuniao editada' };
    await escreverTarefa(VAULT_ROOT, REL, novo);

    expect(mockEscreverAlarme).not.toHaveBeenCalled();
    expect(mockAgendarAlarme).not.toHaveBeenCalled();
    expect(mockCancelarAlarme).not.toHaveBeenCalled();
  });

  it('inerte quando nao havia alarme antigo (criacao inicial)', async () => {
    // metaAntigo.alarme === null: este e cenario de criacao inicial,
    // nao re-agendamento. criarTarefa cuida do caminho de criacao.
    const antigoSemAlarme: Tarefa = {
      ...tarefaComAlarme(),
      alarme: null,
    };
    mockReadVaultFile.mockResolvedValueOnce({
      meta: antigoSemAlarme,
      body: '',
    });

    const novo = tarefaComAlarme();
    await escreverTarefa(VAULT_ROOT, REL, novo);

    expect(mockEscreverAlarme).not.toHaveBeenCalled();
    expect(mockAgendarAlarme).not.toHaveBeenCalled();
    expect(mockCancelarAlarme).not.toHaveBeenCalled();
  });

  it('idempotente: se agendarAlarme falhar, tarefa ja foi persistida', async () => {
    const antigo = tarefaComAlarme();
    mockReadVaultFile.mockResolvedValueOnce({ meta: antigo, body: '' });
    mockAgendarAlarme.mockRejectedValueOnce(new Error('cap atingido'));

    const novo = tarefaComAlarme({
      data_hora_iso: '2026-05-03T10:00:00-03:00',
    });
    await expect(escreverTarefa(VAULT_ROOT, REL, novo)).resolves.toMatchObject(
      { rel: REL }
    );
    expect(mockWriteVaultFile).toHaveBeenCalled();
  });

  it('cancelarAlarme em desativacao e silencioso em falha', async () => {
    const antigo = tarefaComAlarme({ ativo: true });
    mockReadVaultFile.mockResolvedValueOnce({ meta: antigo, body: '' });
    mockCancelarAlarme.mockRejectedValueOnce(new Error('id inexistente'));

    const novo = tarefaComAlarme({ ativo: false });
    await expect(escreverTarefa(VAULT_ROOT, REL, novo)).resolves.toMatchObject(
      { rel: REL }
    );
    expect(mockCancelarAlarme).toHaveBeenCalledTimes(1);
  });
});
