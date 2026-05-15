// Smoke da Tela 18 (diario emocional). Render do bottom sheet,
// troca de modo trigger <-> vitoria muda o set de chips, validacao
// trava save com texto vazio, save chama saveDiario com payload
// valido pelo DiarioEmocionalSchema.
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSearchParams: { modo?: string } = {};

jest.mock('expo-router', () => {
  const mockRedirectInstances: Array<{ href: string }> = [];
  (
    globalThis as { __mockRedirectInstances?: typeof mockRedirectInstances }
  ).__mockRedirectInstances = mockRedirectInstances;
  return {
    __esModule: true,
    useRouter: () => ({
      back: mockBack,
      replace: mockReplace,
      push: mockPush,
    }),
    useLocalSearchParams: () => mockSearchParams,
    Redirect: function MockRedirect(props: { href: string }) {
      mockRedirectInstances.push({ href: props.href });
      return null;
    },
  };
});

const mockSaveDiario = jest.fn<
  Promise<{ uri: string }>,
  [unknown, string, string]
>();

jest.mock('@/lib/diario/saveDiario', () => ({
  saveDiario: (...args: [unknown, string, string]) => mockSaveDiario(...args),
}));

import DiarioEmocional from '../../app/diario-emocional';
import { ToastProvider } from '@/components/ui';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { DiarioEmocionalSchema } from '@/lib/schemas/diario_emocional';

const VAULT_ROOT = 'content://mock/Vault';

function renderTela() {
  return render(
    <ToastProvider>
      <DiarioEmocional />
    </ToastProvider>
  );
}

// Helper M07.x: adiciona uma midia youtube valida em modo vitoria
// para satisfazer o refine de midia obrigatoria. Tests que validam
// o caminho de save em modo vitoria precisam chamar antes do press
// no botao Anotar.
function adicionarMidiaYoutube(utils: {
  getByText: (t: string) => unknown;
  getByLabelText: (l: string) => unknown;
}) {
  // Chip 'YouTube' (label visivel) troca para a aba; depois cola
  // link valido e pressiona Adicionar.
  fireEvent.press(utils.getByText('YouTube') as never);
  fireEvent.changeText(
    utils.getByLabelText('campo link youtube') as never,
    'https://youtu.be/dQw4w9WgXcQ'
  );
  fireEvent.press(utils.getByText('Adicionar') as never);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  // Default: sem modo (cai em vitoria por default da spec).
  for (const k of Object.keys(mockSearchParams)) {
    delete (mockSearchParams as Record<string, string>)[k];
  }
  useVault.getState().setVaultRoot(VAULT_ROOT);
  usePessoa.getState().setPessoaAtiva('pessoa_a');
  mockSaveDiario.mockResolvedValue({
    uri: `${VAULT_ROOT}/inbox/mente/diario/2026-04-29-1000-alegria.md`,
  });
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  useVault.getState().clearVaultRoot();
});

describe('Tela 18 — diario emocional render', () => {
  it('M26: BottomSheet abre em index=0 direto (Screen opaco por tras)', () => {
    const { getByLabelText } = renderTela();
    const sheet = getByLabelText('bottom-sheet-mock');
    expect(sheet.props.accessibilityHint).toBe('index=0');
  });

  it('renderiza o bottom sheet em modo vitoria por default', () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText('bottom-sheet-mock')).toBeTruthy();
    // Em modo vitoria os chips positivos aparecem.
    expect(getByLabelText('chip Gratidão')).toBeTruthy();
    expect(getByLabelText('chip Alegria')).toBeTruthy();
  });

  it('parametro modo=trigger inicializa em trigger e mostra chips negativos', () => {
    mockSearchParams.modo = 'trigger';
    const { getByLabelText, queryByLabelText } = renderTela();
    expect(getByLabelText('chip Frustração')).toBeTruthy();
    expect(getByLabelText('chip Raiva')).toBeTruthy();
    expect(queryByLabelText('chip Gratidão')).toBeNull();
  });

  it('parametro modo=audio inicializa em vitoria e expoe MicrofoneButton', () => {
    mockSearchParams.modo = 'audio';
    const { getByLabelText } = renderTela();
    // Modo audio cai em vitoria por default (chips positivos
    // aparecem). M06.5 substituiu o aviso placeholder pelo
    // MicrofoneButton inline acima do textarea.
    expect(getByLabelText('chip Gratidão')).toBeTruthy();
    expect(getByLabelText('botao gravar audio')).toBeTruthy();
  });

  it('redireciona para onboarding quando nao ha vaultRoot', () => {
    useVault.getState().clearVaultRoot();
    const instancias = (
      globalThis as { __mockRedirectInstances?: Array<{ href: string }> }
    ).__mockRedirectInstances;
    if (!instancias) {
      throw new Error('Mock de Redirect nao registrou globalThis');
    }
    instancias.length = 0;
    renderTela();
    expect(instancias.length).toBeGreaterThan(0);
    expect(instancias[instancias.length - 1].href).toBe('/onboarding');
  });
});

describe('Tela 18 — troca de modo', () => {
  it('clicar no chip Trigger troca o conjunto de chips de emocao', () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    expect(getByLabelText('chip Gratidão')).toBeTruthy();
    fireEvent.press(getByLabelText('chip Trigger'));
    expect(getByLabelText('chip Frustração')).toBeTruthy();
    expect(queryByLabelText('chip Gratidão')).toBeNull();
  });

  it('trocar modo limpa as emocoes selecionadas anteriormente', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('chip Gratidão'));
    fireEvent.press(getByLabelText('chip Trigger'));
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'agora estou triste.'
    );
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(mockSaveDiario).toHaveBeenCalled());
    const meta = mockSaveDiario.mock.calls[0][0] as {
      emocoes: string[];
      modo: string;
    };
    expect(meta.modo).toBe('trigger');
    // Emocoes resetadas: 'gratidao' nao deve persistir em modo trigger.
    expect(meta.emocoes).not.toContain('gratidao');
  });
});

describe('Tela 18 — validacao do save', () => {
  it('texto vazio bloqueia save e mostra warn', async () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    fireEvent.press(getByLabelText('Anotar'));
    expect(mockSaveDiario).not.toHaveBeenCalled();
    await waitFor(() => expect(queryByLabelText('toast warn')).toBeTruthy());
  });

  it('save em modo vitoria chama saveDiario com payload valido', async () => {
    const utils = renderTela();
    const { getByLabelText } = utils;
    fireEvent.press(getByLabelText('chip Gratidão'));
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'consegui fechar a tarefa.'
    );
    // M07.x: vitoria exige midia. Helper adiciona youtube valido.
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Anotar'));

    await waitFor(() => expect(mockSaveDiario).toHaveBeenCalledTimes(1));
    const [meta, body, vaultRoot] = mockSaveDiario.mock.calls[0];
    expect(vaultRoot).toBe(VAULT_ROOT);
    expect(typeof body).toBe('string');
    const parsed = DiarioEmocionalSchema.safeParse(meta);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        tipo: 'diario_emocional',
        autor: 'pessoa_a',
        // anonimato-allow: substantivo comum 'vitoria'
        modo: 'vitoria',
        emocoes: ['gratidao'],
        intensidade: 3,
      });
      // funcionou nao deve aparecer em modo vitoria.
      expect(parsed.data.funcionou).toBeUndefined();
    }
  });

  it('save em modo trigger inclui funcionou e estrategia opcionais', async () => {
    mockSearchParams.modo = 'trigger';
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('chip Raiva'));
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'discussao sobre planejamento.'
    );
    fireEvent.changeText(
      getByLabelText('campo estrategia'),
      'respirei e sai do comodo.'
    );
    fireEvent.press(getByLabelText('toggle funcionou'));
    fireEvent.press(getByLabelText('Registrar'));

    await waitFor(() => expect(mockSaveDiario).toHaveBeenCalledTimes(1));
    const [meta] = mockSaveDiario.mock.calls[0];
    expect(meta).toMatchObject({
      modo: 'trigger',
      emocoes: ['raiva'],
      estrategia: 'respirei e sai do comodo.',
      funcionou: true,
    });
  });

  it('apos salvar com sucesso chama router.back', async () => {
    const utils = renderTela();
    const { getByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'foi um bom dia.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Anotar'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('toast de sucesso "Anotado." em modo vitoria', async () => {
    const utils = renderTela();
    const { getByLabelText, queryByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'feliz hoje.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Anotar'));
    await waitFor(() => expect(queryByLabelText('toast success')).toBeTruthy());
  });

  it('toast de sucesso "Registrado." em modo trigger', async () => {
    mockSearchParams.modo = 'trigger';
    const { getByLabelText, queryByLabelText } = renderTela();
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'cansaco profundo.'
    );
    fireEvent.press(getByLabelText('Registrar'));
    await waitFor(() => expect(queryByLabelText('toast success')).toBeTruthy());
  });

  it('toast de erro quando saveDiario rejeita', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSaveDiario.mockRejectedValueOnce(new Error('SAF off'));
    const utils = renderTela();
    const { getByLabelText, queryByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'algo aconteceu.'
    );
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Anotar'));
    await waitFor(() => expect(queryByLabelText('toast error')).toBeTruthy());
    expect(mockBack).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('Tela 18 — com quem', () => {
  it('flags amigos/sozinho nao entram em meta.com (filtrados)', async () => {
    const utils = renderTela();
    const { getByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'feliz com o time.'
    );
    fireEvent.press(getByLabelText('chip Amigos'));
    fireEvent.press(getByLabelText('chip Sozinho'));
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Anotar'));
    await waitFor(() => expect(mockSaveDiario).toHaveBeenCalled());
    const [meta] = mockSaveDiario.mock.calls[0];
    const m = meta as { com: string[] };
    expect(m.com).not.toContain('amigos');
    expect(m.com).not.toContain('sozinho');
  });

  it('PessoaIds em "com quem" entram no payload validado', async () => {
    const utils = renderTela();
    const { getByLabelText } = utils;
    fireEvent.changeText(
      getByLabelText('campo o que aconteceu'),
      'conversamos a noite toda.'
    );
    // O chip de pessoa_b usa nomeDe('pessoa_b'), default 'Nome_B'.
    fireEvent.press(getByLabelText('chip Nome_B'));
    adicionarMidiaYoutube(utils);
    fireEvent.press(getByLabelText('Anotar'));
    await waitFor(() => expect(mockSaveDiario).toHaveBeenCalled());
    const [meta] = mockSaveDiario.mock.calls[0];
    const m = meta as { com: string[] };
    // O slug interno e 'pessoa_b' independente do nome de exibicao.
    expect(m.com).toContain('pessoa_b');
  });
});

afterAll(() => {
  act(() => {
    useVault.getState().clearVaultRoot();
  });
});
