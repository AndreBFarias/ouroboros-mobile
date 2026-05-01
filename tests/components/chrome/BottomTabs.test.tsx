// Render do BottomTabs com props mockados estilo BottomTabBarProps.
// O componente filtra abas por nome usando useSettings; aqui
// alteramos o store via getState().setFeatureToggle para simular
// toggle on/off em cada cenario.
//
// Verificamos:
//   - 5 abas fixas aparecem por padrao (index, memoria, humor,
//     financas, settings).
//   - Aba interna `em-construcao` nunca aparece na bottom bar.
//   - Aba opt-in com toggle on aparece; com toggle off some.
//   - Tap em aba nao focada chama navigation.navigate.
//   - Aba focada tem accessibilityState.selected=true.
import { fireEvent, render } from '@testing-library/react-native';
import { BottomTabs } from '@/components/chrome/BottomTabs';
import { useSettings } from '@/lib/stores/settings';

interface MockRoute {
  key: string;
  name: string;
  params?: Record<string, unknown>;
}

function makeProps(focusedIndex: number) {
  // Lista emitida pelo Expo Router quando o tabBar e customizado:
  // todas as Tabs.Screen aparecem em state.routes na ordem de
  // declaracao em (tabs)/_layout.tsx. Filtragem ocorre dentro do
  // componente.
  const routes: MockRoute[] = [
    { key: 'k-index', name: 'index' },
    { key: 'k-memoria', name: 'memoria' },
    { key: 'k-humor', name: 'humor' },
    { key: 'k-financas', name: 'financas' },
    { key: 'k-settings', name: 'settings' },
    { key: 'k-em-construcao', name: 'em-construcao' },
    { key: 'k-ciclo', name: 'ciclo' },
    { key: 'k-alarmes', name: 'alarmes' },
    { key: 'k-todo', name: 'todo' },
    { key: 'k-contadores', name: 'contadores' },
    { key: 'k-calendario', name: 'calendario' },
  ];

  const descriptors: Record<string, { options: Record<string, unknown> }> = {};
  for (const r of routes) descriptors[r.key] = { options: {} };

  return {
    state: {
      index: focusedIndex,
      routes,
      key: 'tab-state',
      routeNames: routes.map((r) => r.name),
      history: [],
      type: 'tab' as const,
      stale: false as const,
    },
    descriptors,
    navigation: {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    },
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  };
}

describe('BottomTabs', () => {
  beforeEach(() => {
    useSettings.getState().resetar();
  });

  it('renderiza apenas as 5 abas fixas quando todos os toggles estao off', () => {
    const props = makeProps(0);

    const { getByLabelText, queryByLabelText } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <BottomTabs {...(props as any)} />
    );

    // 5 fixas devem aparecer.
    expect(getByLabelText('aba hoje')).toBeTruthy();
    expect(getByLabelText('aba memorias')).toBeTruthy();
    expect(getByLabelText('aba humor')).toBeTruthy();
    expect(getByLabelText('aba financas')).toBeTruthy();
    expect(getByLabelText('aba settings')).toBeTruthy();

    // Em construcao nunca aparece (rota interna).
    expect(queryByLabelText('aba em construcao')).toBeNull();

    // Condicionais com toggle off: nenhuma deve aparecer.
    expect(queryByLabelText('aba ciclo')).toBeNull();
    expect(queryByLabelText('aba alarmes')).toBeNull();
    expect(queryByLabelText('aba tarefas')).toBeNull();
    expect(queryByLabelText('aba contadores')).toBeNull();
    expect(queryByLabelText('aba calendario')).toBeNull();
  });

  it('renderiza aba opt-in quando toggle correspondente esta on', () => {
    useSettings.getState().setFeatureToggle('cicloMenstrual', true);
    useSettings.getState().setFeatureToggle('alarmePessoal', true);
    const props = makeProps(0);

    const { getByLabelText, queryByLabelText } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <BottomTabs {...(props as any)} />
    );

    // 5 fixas + 2 opt-in ligadas.
    expect(getByLabelText('aba ciclo')).toBeTruthy();
    expect(getByLabelText('aba alarmes')).toBeTruthy();

    // As 3 opt-in que ficaram off seguem ausentes.
    expect(queryByLabelText('aba tarefas')).toBeNull();
    expect(queryByLabelText('aba contadores')).toBeNull();
    expect(queryByLabelText('aba calendario')).toBeNull();
  });

  it('todas as 5 opt-in ligadas resultam em 10 abas visiveis', () => {
    useSettings.getState().setFeatureToggle('cicloMenstrual', true);
    useSettings.getState().setFeatureToggle('alarmePessoal', true);
    useSettings.getState().setFeatureToggle('todoLeve', true);
    useSettings.getState().setFeatureToggle('contadorDiasSem', true);
    useSettings.getState().setFeatureToggle('calendarioConquistas', true);

    const props = makeProps(0);
    const { getByLabelText } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <BottomTabs {...(props as any)} />
    );

    expect(getByLabelText('aba hoje')).toBeTruthy();
    expect(getByLabelText('aba memorias')).toBeTruthy();
    expect(getByLabelText('aba humor')).toBeTruthy();
    expect(getByLabelText('aba financas')).toBeTruthy();
    expect(getByLabelText('aba settings')).toBeTruthy();
    expect(getByLabelText('aba ciclo')).toBeTruthy();
    expect(getByLabelText('aba alarmes')).toBeTruthy();
    expect(getByLabelText('aba tarefas')).toBeTruthy();
    expect(getByLabelText('aba contadores')).toBeTruthy();
    expect(getByLabelText('aba calendario')).toBeTruthy();
  });

  it('tap em aba nao focada chama navigation.navigate com nome da rota', () => {
    const props = makeProps(0);

    const { getByLabelText } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <BottomTabs {...(props as any)} />
    );

    fireEvent.press(getByLabelText('aba humor'));
    expect(props.navigation.navigate).toHaveBeenCalledWith('humor', undefined);
  });

  it('tap na aba ativa nao chama navigation.navigate', () => {
    const props = makeProps(0);

    const { getByLabelText } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <BottomTabs {...(props as any)} />
    );

    fireEvent.press(getByLabelText('aba hoje'));
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('aba focada tem accessibilityState selected=true', () => {
    // Foco no indice 2 da lista bruta (que e `humor`).
    const props = makeProps(2);

    const { getByLabelText } = render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <BottomTabs {...(props as any)} />
    );

    const humor = getByLabelText('aba humor');
    expect(humor.props.accessibilityState.selected).toBe(true);

    const hoje = getByLabelText('aba hoje');
    expect(hoje.props.accessibilityState.selected).toBe(false);
  });
});
