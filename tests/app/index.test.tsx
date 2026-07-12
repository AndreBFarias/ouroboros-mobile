// Smoke da Tela 01 (hoje) -- R-HOME-1 (ADR-0026) + R-HOME-4a (ADR-0028)
// + R-HOME-4c. Cobre:
//  - Cabecalho com data por extenso + saudacao personalizada + atalho
//    Reflexao.
//  - Tap em Reflexao chama router.push('/diario-emocional?modo=reflexao').
//  - R-HOME-4a: feed adaptativo. Card garantido "Voce(s)" sempre visivel
//    (topo). Com vault vazio, Proximos/To-do fazem self-hide (titulos
//    ausentes) e NENHUMA caixa "Nada nas próximas horas" / "Sem tarefas
//    pendentes" aparece.
//  - R-HOME-4c: o BotaoRecap standalone "Recap" e o link __DEV__ "Ver
//    storybook de componentes" saem da home. O card semanal "Na sua
//    semana" so aparece com registros na semana (aqui: vault vazio ->
//    card ausente).
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

// Mock de listarTarefas para devolver lista vazia (self-hide do
// SecaoTodoHoje). Tap em checkbox nao precisa ser testado aqui -- o E2E
// playwright (r-home-1.e2e.ts) cobre o fluxo completo de persist
// otimista.
jest.mock('@/lib/vault/tarefas', () => ({
  __esModule: true,
  listarTarefas: jest.fn(async () => []),
  marcarFeito: jest.fn(async () => ({})),
}));

// Mock de listarHumor vazio: o card garantido "Voce(s)" (R-HOME-4a)
// mostra convites em vez de mood, sem tocar o Vault real.
jest.mock('@/lib/vault/humor', () => ({
  __esModule: true,
  listarHumor: jest.fn(async () => []),
}));

// R-HOME-4d: mock de listarDiarios vazio para o card garantido
// "Relembrando" cair no cold start (pool vazio -> boas-vindas), sem
// tocar o Vault real. Espelha o mock de listarHumor acima.
jest.mock('@/lib/vault/diario', () => ({
  __esModule: true,
  listarDiarios: jest.fn(async () => []),
}));

// R-HOME-4c: mock de useRecap para o card "Na sua semana" fazer
// self-hide deterministico (data null -> null) com vault vazio, sem
// depender de leitura assincrona do Vault. resolverPeriodo real
// preservado via requireActual.
jest.mock('@/lib/hooks/useRecap', () => {
  const actual = jest.requireActual('@/lib/hooks/useRecap');
  return {
    __esModule: true,
    ...actual,
    useRecap: () => ({ data: null, loading: false }),
  };
});

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

test('R-HOME-4a: cabecalho tem saudacao + Reflexao + card Voce garantido', async () => {
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

  // R-HOME-4a: card garantido presente em sozinho -> titulo "Voce".
  expect(await findByText('Você')).toBeTruthy();

  // R-HOME-4a: vault vazio -> Proximos/To-do self-hide (titulos ausentes)
  // e NENHUMA caixa "Nada ..." aparece.
  await waitFor(() => {
    expect(queryByText('Próximos')).toBeNull();
    expect(queryByText('To-do hoje')).toBeNull();
  });
  expect(queryByText('Nada nas próximas horas.')).toBeNull();
  expect(queryByText('Sem tarefas pendentes. Toque + para criar.')).toBeNull();

  // R-HOME-4c: BotaoRecap standalone e link storybook saem da home; o
  // card semanal "Na sua semana" fica ausente com vault vazio.
  expect(queryByText('Recap')).toBeNull();
  expect(queryByText('Ver storybook de componentes')).toBeNull();
  expect(queryByText('Na sua semana')).toBeNull();

  // R-HOME-1 (D1=C): secoes removidas nao aparecem (o card novo se chama
  // "Voce", texto diferente do antigo "Status do casal").
  expect(queryByText('Status do casal')).toBeNull();
  expect(queryByText('Humor do dia')).toBeNull();
  expect(queryByText('Esta jornada')).toBeNull();
});

test('R-HOME-4a duo: card "Voces" (plural) garantido; sem Status do casal', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'casal' });
  const { findByText, queryByText } = renderTela();

  await findByText('Reflexão');
  // Card garantido em modo casal -> titulo plural "Voces".
  expect(await findByText('Vocês')).toBeTruthy();

  // R-HOME-4c: BotaoRecap standalone removido da home.
  expect(queryByText('Recap')).toBeNull();

  // R-HOME-1 (D1=C): mesmo em modo duo, Status do casal nao volta.
  expect(queryByText('Status do casal')).toBeNull();
  expect(queryByText('Humor do dia')).toBeNull();
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

test('R-HOME-4a vault vazio: card Voce mostra convite, sem caixa "Nada"', async () => {
  useOnboarding.setState({ done: true, tipoCompanhia: 'sozinho' });
  const { findByText, findAllByText, queryByText } = renderTela();

  // Card garantido presente com convite suave (listarHumor mockado []).
  await findByText('Você');
  const convites = await findAllByText(/ainda não registrou hoje/);
  expect(convites.length).toBeGreaterThanOrEqual(1);

  // Nenhuma caixa toxica de empty state na home.
  expect(queryByText('Sem tarefas pendentes. Toque + para criar.')).toBeNull();
  expect(queryByText('Nada nas próximas horas.')).toBeNull();
});
