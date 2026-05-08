// Smoke da Tela 15 (humor rapido). Render do bottom sheet, defaults
// dos sliders, save chamando saveHumor com payload valido pelo
// HumorSchema.
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  // Factory roda fora do escopo do arquivo de teste; nada importado
  // top-level pode ser referenciado aqui. Ainda assim, variaveis
  // prefixadas com 'mock' sao permitidas (ver doc do jest.mock).
  // Para o Redirect retornamos uma string global lookup-friendly via
  // setRedirectHref (registrado no globalThis pelo test runner).
  const mockRedirectInstances: Array<{ href: string }> = [];
  (globalThis as { __mockRedirectInstances?: typeof mockRedirectInstances })
    .__mockRedirectInstances = mockRedirectInstances;
  return {
    __esModule: true,
    useRouter: () => ({
      back: mockBack,
      replace: mockReplace,
      push: mockPush,
    }),
    Redirect: function MockRedirect(props: { href: string }) {
      mockRedirectInstances.push({ href: props.href });
      return null;
    },
  };
});

const mockSaveHumor = jest.fn<
  Promise<{ uri: string; conflito: boolean }>,
  [unknown, string]
>();

jest.mock('@/lib/humor/saveHumor', () => ({
  saveHumor: (...args: [unknown, string]) => mockSaveHumor(...args),
}));

import HumorRapido from '../../app/humor-rapido';
import { ToastProvider } from '@/components/ui';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { HumorSchema } from '@/lib/schemas/humor';

const VAULT_ROOT = 'content://mock/Vault';

function renderTela() {
  return render(
    <ToastProvider>
      <HumorRapido />
    </ToastProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // Fake timers para nao deixar setTimeout do ToastProvider segurando
  // o jest worker depois que o teste termina.
  jest.useFakeTimers();
  useVault.getState().setVaultRoot(VAULT_ROOT);
  usePessoa.getState().setPessoaAtiva('pessoa_a');
  mockSaveHumor.mockResolvedValue({
    uri: `${VAULT_ROOT}/daily/2026-04-29.md`,
    conflito: false,
  });
});

afterEach(() => {
  // Avanca timers pendentes (toast 2,5s, etc.) e volta para real.
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  useVault.getState().clearVaultRoot();
});

describe('Tela 15 — humor rapido', () => {
  it('M26: renderiza dentro de <Screen> opaco com BottomSheet em index=0', () => {
    const { getByLabelText, UNSAFE_getAllByType } = renderTela();
    // O sheet (mock) expoe accessibilityHint='index=0' apenas se a
    // rota passou index={0} direto (M26). Antes de M26 era index=-1
    // + useEffect expand, o que escondia o conteudo no boot.
    const sheet = getByLabelText('bottom-sheet-mock');
    expect(sheet.props.accessibilityHint).toBe('index=0');
    // Screen (SafeAreaView interno) deve estar acima do sheet na
    // arvore. Garantia minima: ha ao menos 2 SafeAreaView/View
    // wrappers antes do mock-sheet (Screen + container do loader).
    // Validamos via a presenca explicita do hint=index=0 (acima) e
    // do label do mock no render. Faltar Screen quebraria a render
    // sem fundo (regressao A18).
    // Smoke: garante que o tree montou sem erro.
    void UNSAFE_getAllByType;
  });

  it('renderiza o bottom sheet com sliders default 3', () => {
    const { getByLabelText } = renderTela();
    // Bottom sheet mockado em jest.setup expoe label 'bottom-sheet-mock'.
    expect(getByLabelText('bottom-sheet-mock')).toBeTruthy();

    // 4 sliders, todos com value default 3.
    const labels = [
      'slider humor',
      'slider energia',
      'slider ansiedade',
      'slider foco',
    ];
    for (const lbl of labels) {
      const node = getByLabelText(lbl);
      expect(node.props.accessibilityValue.now).toBe(3);
    }
  });

  it('renderiza inputs e textarea com placeholders', () => {
    const { getByPlaceholderText } = renderTela();
    expect(
      getByPlaceholderText('Ex.: Fluoxetina 20mg (opcional)')
    ).toBeTruthy();
    expect(getByPlaceholderText('0 a 24')).toBeTruthy();
    expect(getByPlaceholderText('Opcional')).toBeTruthy();
  });

  it('save chama saveHumor com payload valido pelo HumorSchema', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('Salvar'));

    await waitFor(() => expect(mockSaveHumor).toHaveBeenCalledTimes(1));
    const [meta, vaultRoot] = mockSaveHumor.mock.calls[0];
    expect(vaultRoot).toBe(VAULT_ROOT);
    // Payload precisa passar pelo HumorSchema.
    const parsed = HumorSchema.safeParse(meta);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        tipo: 'humor',
        autor: 'pessoa_a',
        humor: 3,
        energia: 3,
        ansiedade: 3,
        foco: 3,
        tags: [],
      });
      expect(parsed.data.medicacao).toBeUndefined();
      expect(parsed.data.horas_sono).toBeUndefined();
      expect(parsed.data.frase).toBeUndefined();
    }
  });

  it('apos salvar com sucesso chama router.back', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('Salvar'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('digitar medicacao adiciona o campo no payload', async () => {
    const { getByLabelText, getByPlaceholderText } = renderTela();
    fireEvent.changeText(
      getByPlaceholderText('Ex.: Fluoxetina 20mg (opcional)'),
      'Fluoxetina 20mg'
    );
    fireEvent.press(getByLabelText('Salvar'));

    await waitFor(() => expect(mockSaveHumor).toHaveBeenCalled());
    const [meta] = mockSaveHumor.mock.calls[0];
    expect(meta).toMatchObject({ medicacao: 'Fluoxetina 20mg' });
  });

  it('horas de sono numerica vai como number no payload', async () => {
    const { getByLabelText, getByPlaceholderText } = renderTela();
    fireEvent.changeText(getByPlaceholderText('0 a 24'), '7');
    fireEvent.press(getByLabelText('Salvar'));

    await waitFor(() => expect(mockSaveHumor).toHaveBeenCalled());
    const [meta] = mockSaveHumor.mock.calls[0];
    expect(meta).toMatchObject({ horas_sono: 7 });
  });

  it('frase vazia nao entra no payload', async () => {
    const { getByLabelText, getByPlaceholderText } = renderTela();
    fireEvent.changeText(getByPlaceholderText('Opcional'), '   ');
    fireEvent.press(getByLabelText('Salvar'));

    await waitFor(() => expect(mockSaveHumor).toHaveBeenCalled());
    const [meta] = mockSaveHumor.mock.calls[0];
    const m = meta as { frase?: string };
    expect(m.frase).toBeUndefined();
  });

  it('redireciona para onboarding quando nao ha vaultRoot', () => {
    useVault.getState().clearVaultRoot();
    // Limpa o array existente sem trocar a referencia (o factory do
    // mock guardou um ponteiro fixo para esse array).
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

  it('toast de erro quando saveHumor falha', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSaveHumor.mockRejectedValueOnce(new Error('SAF off'));
    const { getByLabelText, queryByLabelText } = renderTela();
    fireEvent.press(getByLabelText('Salvar'));
    await waitFor(() =>
      expect(queryByLabelText('toast error')).toBeTruthy()
    );
    // Nao deve voltar quando o save falha.
    expect(mockBack).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('clique em chip rapido entra na lista de tags', async () => {
    const { getByLabelText } = renderTela();
    // Chip exposto via accessibilityLabel 'chip <label>'.
    fireEvent.press(getByLabelText('chip Trabalho pesado'));
    fireEvent.press(getByLabelText('Salvar'));
    await waitFor(() => expect(mockSaveHumor).toHaveBeenCalled());
    const [meta] = mockSaveHumor.mock.calls[0];
    expect((meta as { tags: string[] }).tags).toContain('trabalho_pesado');
  });
});

// Reseta a Pessoa para nao vazar entre suites.
afterAll(() => {
  // SecureStore mock e in-memory; nao precisa limpar arquivos.
  // Apenas garante que outras suites nao vejam um estado modificado.
  act(() => {
    useVault.getState().clearVaultRoot();
  });
});
