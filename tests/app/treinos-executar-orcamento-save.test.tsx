// A3 (2026-09-08): o orcamento do comTimeout do executor de treino
// precisa cobrir o que a promise do save realmente faz.
//
// Ate a EXE-3B, `saveTreino` era um write de .md e o default de 10s do
// helper (calibrado justamente para um write) servia. A EXE-3B pendurou
// no mesmo `saveTreino` uma leitura mais uma escrita por exercicio
// cadastrado que a sessao cita; em file:// cada escrita sao tres
// chamadas de FS. Com o orcamento fixo, uma sessao longa em aparelho
// lento estourava os 10s e a tela dizia "Nao foi possivel salvar" para
// uma sessao que ja estava no disco -- e no executor nao ha botao de
// tentar de novo, so' "Voltar".
//
// Estes testes exercitam o caminho real: a tela e' navegada exercicio a
// exercicio ate concluir, o `comTimeout` de verdade e' quem corre contra
// o relogio (nada de mock do helper) e o unico mock e' a fronteira de
// I/O (`saveTreino`), que resolve depois de um tempo controlado por
// fake timers. O que se afirma e' o que o usuario ve: qual toast aparece.
//
// Os tres casos, juntos, medem o orcamento inteiro:
//   1. sessao longa (8 exercicios) que demora 18s -> salva, sem timeout;
//   2. sessao curta (1 exercicio) que demora mais que os 12s dela ->
//      o timeout continua armado (nao viramos o guard em no-op);
//   3. sessao no teto (20 exercicios) que passa dos 40s -> o orcamento
//      e' limitado, porque comTimeout existe contra loader infinito (A29).
//
// Comentarios sem acento (convencao shell/CI).
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockParams: { slug?: string } = { slug: 'rotina-a' };

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: mockBack,
    replace: jest.fn(),
    push: jest.fn(),
  }),
  useLocalSearchParams: () => mockParams,
}));

const mockLerRotina = jest.fn();

jest.mock('@/lib/vault/rotina', () => ({
  __esModule: true,
  lerRotina: (...args: unknown[]) => mockLerRotina(...args),
}));

const mockSaveTreino = jest.fn();

jest.mock('@/lib/treinos/saveTreino', () => ({
  __esModule: true,
  saveTreino: (...args: unknown[]) => mockSaveTreino(...args),
}));

import ExecutarTreino from '@/../app/treinos/executar/[slug]';
import { ToastProvider } from '@/components/ui';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { RotinaSchema, type RotinaMeta } from '@/lib/schemas/rotina';

const VAULT_ROOT = 'file:///vault';

// Quanto o save demora no aparelho lento simulado. Fica acima do
// default de 10s do helper de proposito: e' esse intervalo que a EXE-3B
// tornou alcancavel numa sessao longa.
const DEMORA_SAVE_MS = 18_000;

// Rotina valida pelo RotinaSchema real. Uma serie por exercicio para
// que cada toque avance um exercicio inteiro.
function rotinaCom(qtd: number): RotinaMeta {
  const bruta = {
    tipo: 'rotina_treino',
    slug: 'rotina-a',
    nome: 'Rotina A',
    descricao: null,
    exercicios: Array.from({ length: qtd }, (_, i) => ({
      nome: `Exercício ${i + 1}`,
      carga_kg: null,
      series: 1,
      reps: '10',
      descanso_seg: 60,
      observacao: null,
    })),
    data_criacao: '2026-09-08',
    autor: 'pessoa_a',
    categoria: 'saude_fisica',
    silenciar_sugestao_ate: null,
  };
  // Parse pelo schema real: se a fixture divergir do contrato, o teste
  // falha aqui e nao num assert de UI enganoso.
  return RotinaSchema.parse(bruta);
}

function renderTela() {
  return render(
    <ToastProvider>
      <ExecutarTreino />
    </ToastProvider>
  );
}

// Percorre a tela ate o ultimo toque, que dispara o save.
async function concluirTreino(
  tela: ReturnType<typeof renderTela>,
  qtd: number
): Promise<void> {
  for (let i = 0; i < qtd - 1; i += 1) {
    await act(async () => {
      fireEvent.press(tela.getByLabelText('Próximo exercício'));
    });
    // Sem pular o descanso o botao do proximo exercicio nem e'
    // renderizado: o painel de descanso ocupa o lugar dele.
    await act(async () => {
      fireEvent.press(tela.getByLabelText('Pular descanso'));
    });
  }
  await act(async () => {
    fireEvent.press(tela.getByLabelText('Concluir treino'));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useVault.getState().setVaultRoot(VAULT_ROOT);
  usePessoa.getState().setPessoaAtiva('pessoa_a');
  mockSaveTreino.mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(
          () =>
            resolve({
              uri: `${VAULT_ROOT}/treinos/2026-09-08-1200-rotina-a.md`,
              rel: 'treinos/2026-09-08-1200-rotina-a.md',
              slug: 'rotina-a',
              historicoAtualizados: 0,
            }),
          DEMORA_SAVE_MS
        );
      })
  );
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  useVault.getState().clearVaultRoot();
});

describe('executor de treino — orcamento do timeout do save', () => {
  it('sessao de 8 exercicios que demora 18s ainda registra o treino', async () => {
    mockLerRotina.mockResolvedValue(rotinaCom(8));
    const tela = renderTela();
    await waitFor(() =>
      expect(tela.getByLabelText('Próximo exercício')).toBeTruthy()
    );

    await concluirTreino(tela, 8);
    expect(mockSaveTreino).toHaveBeenCalledTimes(1);

    // Orcamento desta sessao: 10s de base + 8 x 2s = 26s. O save resolve
    // em 18s, dentro do orcamento. Com o default fixo de 10s, este
    // mesmo save virava "Nao foi possivel salvar".
    await act(async () => {
      jest.advanceTimersByTime(DEMORA_SAVE_MS);
    });

    expect(tela.queryByLabelText('toast error')).toBeNull();
    expect(tela.queryByLabelText('toast success')).toBeTruthy();
    expect(tela.getByText('Treino registrado.')).toBeTruthy();
  });

  it('sessao de 1 exercicio mantem o timeout armado quando o save trava', async () => {
    mockLerRotina.mockResolvedValue(rotinaCom(1));
    const tela = renderTela();
    await waitFor(() =>
      expect(tela.getByLabelText('Concluir treino')).toBeTruthy()
    );

    await concluirTreino(tela, 1);
    expect(mockSaveTreino).toHaveBeenCalledTimes(1);

    // Orcamento desta sessao: 10s + 1 x 2s = 12s. Avancamos 13s, antes
    // dos 18s do save: quem resolve a corrida e' o timeout.
    await act(async () => {
      jest.advanceTimersByTime(13_000);
    });

    expect(tela.queryByLabelText('toast error')).toBeTruthy();
    expect(
      tela.getByText('Não foi possível salvar: timeout salvando')
    ).toBeTruthy();
  });

  it('sessao no maximo de 20 exercicios respeita o teto de 40s', async () => {
    mockLerRotina.mockResolvedValue(rotinaCom(20));
    mockSaveTreino.mockImplementation(() => new Promise(() => {}));
    const tela = renderTela();
    await waitFor(() =>
      expect(tela.getByLabelText('Próximo exercício')).toBeTruthy()
    );

    await concluirTreino(tela, 20);
    expect(mockSaveTreino).toHaveBeenCalledTimes(1);

    // 10s + 20 x 2s = 50s, mas o teto corta em 40s. Em 39s a tela ainda
    // espera; em 41s ja desistiu. O guard contra loader infinito (A29)
    // continua valendo mesmo na sessao mais longa que o schema permite.
    await act(async () => {
      jest.advanceTimersByTime(39_000);
    });
    expect(tela.queryByLabelText('toast error')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });
    expect(tela.queryByLabelText('toast error')).toBeTruthy();
    expect(
      tela.getByText('Não foi possível salvar: timeout salvando')
    ).toBeTruthy();
  });
});
