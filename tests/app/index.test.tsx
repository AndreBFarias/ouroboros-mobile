// Smoke da Tela 01 (hoje) v3 -- R-HOME-1 (ADR-0026). Cobre:
//  - Cabecalho com data por extenso + saudacao personalizada + atalho
//    Reflexao.
//  - Tap em Recap chama router.push('/recap').
//  - Tap em Reflexao chama router.push('/diario-emocional?modo=reflexao').
//  - Secao Proximos sempre presente.
//  - Secao To-do hoje renderiza (com loading -> empty quando sem tarefas).
//  - NAO renderiza "Status do casal" (removido em R-HOME-1).
//  - NAO renderiza "Humor do dia" (removido em R-HOME-1).
//  - NAO renderiza "Esta jornada" (removido em R-HOME-1).
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
  // useFocusEffect dispara o callback em React useEffect (montagem
  // do componente), espelhando o comportamento do expo-router em
  // primeira foco-renderizacao. Isso encapsula side-effect dentro do
  // ciclo de vida do React e evita warning de "update outside act()".
  const React = require('react') as typeof import('react');
  return {
    __esModule: true,
    useRouter: () => ({ back: mockBack, replace: mockReplace, push: mockPush }),
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => {
        // O callback retornado pode devolver cleanup; aqui basta
        // executa-lo como effect normal.
        const cleanup = cb();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [cb]);
    },
    Redirect: function MockRedirect(props: { href: string }) {
      mockRedirectInstances.push({ href: props.href });
      return null;
    },
  };
});

// Hooks de Vault mockados: devolvem estado estavel/vazio. Isso evita
// dependencia de SAF e garante que a tela renderiza headers/secoes
// sem interferencia de leitura assincrona.
jest.mock('@/lib/hooks/useProximos', () => ({
  __esModule: true,
  useProximos: () => ({
    itens: [],
    loading: false,
    error: null,
    reload: () => undefined,
  }),
}));

// Mock de listarTarefas para devolver lista vazia (empty state branch
// do SecaoTodoHoje). Tap em checkbox nao precisa ser testado aqui --
// o E2E playwright (r-home-1.e2e.ts) cobre o fluxo completo de
// persist otimista.
jest.mock('@/lib/vault/tarefas', () => ({
  __esModule: true,
  listarTarefas: jest.fn(async () => []),
  marcarFeito: jest.fn(async () => ({})),
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

test('R-HOME-1: cabecalho tem saudacao + Reflexao + Recap; nao mostra secoes removidas', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'sozinho' });
  const { findByText, queryByText } = renderTela();

  // Cabecalho R-HOME-1: data + saudacao.
  // Aceitamos qualquer das tres saudacoes (Bom dia / Boa tarde / Boa noite)
  // -- depende do horario de execucao do teste.
  await waitFor(() => {
    const bomDia = queryByText(/Bom dia,/);
    const boaTarde = queryByText(/Boa tarde,/);
    const boaNoite = queryByText(/Boa noite,/);
    expect(bomDia || boaTarde || boaNoite).toBeTruthy();
  });

  // Atalho Reflexao na primeira linha do header.
  const reflexao = await findByText('Reflexão');
  expect(reflexao).toBeTruthy();

  // Botao Recap inline (centralizado depois das secoes).
  const recapBtn = await findByText('Recap');
  expect(recapBtn).toBeTruthy();

  // Secao Proximos sempre presente.
  expect(queryByText('Próximos')).toBeTruthy();

  // Secao To-do hoje presente.
  expect(queryByText('To-do hoje')).toBeTruthy();

  // R-HOME-1 (D1=C): secoes removidas nao aparecem.
  expect(queryByText('Status do casal')).toBeNull();
  expect(queryByText('Humor do dia')).toBeNull();
  expect(queryByText('Esta jornada')).toBeNull();
});

test('R-HOME-1 duo: mesmo layout enxuto (sem Status do casal)', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'casal' });
  const { findByText, queryByText } = renderTela();

  await findByText('Recap');
  await findByText('Reflexão');
  await findByText('Próximos');
  await findByText('To-do hoje');

  // R-HOME-1 (D1=C): mesmo em modo duo, Status do casal nao volta.
  expect(queryByText('Status do casal')).toBeNull();
  expect(queryByText('Humor do dia')).toBeNull();
});

test('R-HOME-1 tap em Recap navega para /recap', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'sozinho' });
  const { findByText } = renderTela();

  const recapBtn = await findByText('Recap');
  fireEvent.press(recapBtn);

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/recap');
  });
});

test('R-HOME-1 tap em Reflexao navega para /diario-emocional?modo=reflexao', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'sozinho' });
  const { findByText } = renderTela();

  const reflexaoBtn = await findByText('Reflexão');
  fireEvent.press(reflexaoBtn);

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/diario-emocional?modo=reflexao');
  });
});

test('R-HOME-1 To-do hoje renderiza empty state quando vault vazio', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'sozinho' });
  const { findByText } = renderTela();

  await findByText('To-do hoje');
  // listarTarefas mockado devolve []; empty state aparece.
  await findByText('Sem tarefas pendentes. Toque + para criar.');
});
