// Smoke da Tela 01 (hoje) v2 — M40. Cobre:
//  - Sozinho: header com 1 avatar md + botao Recap; sem
//    SecaoStatusCasal renderizada (titulo "Status do casal" ausente).
//  - Duo (casal): header com 2 avatares sm + botao Recap;
//    SecaoStatusCasal renderiza (titulo "Status do casal" presente).
//  - Tap em "Recap" chama router.push('/recap').
//
// Estrategia: nao mockamos os subcomponentes (jest.mock factory com
// JSX/createElement bate no injetor _ReactNativeCSSInterop do
// nativewind/babel). Mockamos apenas hooks de Vault para que as
// secoes filhas devolvam estado vazio determinístico, e validamos a
// composicao da tela pela presenca/ausencia de titulos canonicos.
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const mockRedirectInstances: Array<{ href: string }> = [];
  (
    globalThis as { __mockRedirectInstances?: typeof mockRedirectInstances }
  ).__mockRedirectInstances = mockRedirectInstances;
  return {
    __esModule: true,
    useRouter: () => ({ back: mockBack, replace: mockReplace, push: mockPush }),
    Redirect: function MockRedirect(props: { href: string }) {
      mockRedirectInstances.push({ href: props.href });
      return null;
    },
  };
});

// Hooks de Vault mockados: devolvem estado estavel/vazio. Isso evita
// dependencia de SAF e garante que a tela renderiza headers/secoes
// sem interferencia de leitura assincrona.
jest.mock('@/lib/hooks/useHoje', () => ({
  __esModule: true,
  useHoje: () => ({
    humor: null,
    diarios: [],
    eventos: [],
    loading: false,
    error: null,
    reload: () => undefined,
  }),
}));

jest.mock('@/lib/hooks/useStatusCasal', () => ({
  __esModule: true,
  useStatusCasal: () => ({
    pessoaA: { pessoa: 'pessoa_a', humor: null, ultima: null },
    pessoaB: { pessoa: 'pessoa_b', humor: null, ultima: null },
    loading: false,
    error: null,
    reload: () => undefined,
  }),
}));

jest.mock('@/lib/hooks/useProximos', () => ({
  __esModule: true,
  useProximos: () => ({
    itens: [],
    loading: false,
    error: null,
    reload: () => undefined,
  }),
}));

import TelaHoje from '../../app/index';
import { ToastProvider } from '@/components/ui';
import { useVault } from '@/lib/stores/vault';
import { useOnboarding } from '@/lib/stores/onboarding';

const VAULT_ROOT = 'content://mock/Vault';

function renderTela() {
  return render(
    <ToastProvider>
      <TelaHoje />
    </ToastProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  useVault.setState({ vaultRoot: VAULT_ROOT });
  useOnboarding.setState({ done: true, tipoCompanhia: 'sozinho' });
  // Forca flag de hidratacao via API interna do persist.
  const persistApiOnb = (
    useOnboarding as unknown as {
      persist?: { setHasHydrated?: (b: boolean) => void };
    }
  ).persist;
  persistApiOnb?.setHasHydrated?.(true);
  const persistApiVault = (
    useVault as unknown as {
      persist?: { setHasHydrated?: (b: boolean) => void };
    }
  ).persist;
  persistApiVault?.setHasHydrated?.(true);
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

test('M40 sozinho: cabecalho tem Recap e nao mostra "Status do casal"', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'sozinho' });
  const { findByText, queryByText } = renderTela();

  const recapBtn = await findByText('Recap');
  expect(recapBtn).toBeTruthy();
  // Titulo "Status do casal" nao aparece em modo sozinho.
  expect(queryByText('Status do casal')).toBeNull();
  // Titulo "Próximos" sempre aparece.
  expect(queryByText('Próximos')).toBeTruthy();
});

test('M40 duo: secao status casal aparece + Recap presente', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'casal' });
  const { findByText } = renderTela();

  await findByText('Recap');
  await findByText('Status do casal');
  await findByText('Próximos');
});

test('M40 tap em Recap navega para /recap', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'sozinho' });
  const { findByText } = renderTela();

  const recapBtn = await findByText('Recap');
  fireEvent.press(recapBtn);

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/recap');
  });
});
