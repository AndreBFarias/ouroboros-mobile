// Smoke da rota app/saude-fisica.tsx (sprint L1 renomeou de
// app/memoria.tsx). Verifica que SaudeFisicaScreen renderiza header,
// as 3 tabs corretas (Treinos / Evolucao Corporal / Exercicios) e que
// a aba inicial e Treinos. Aba Fotos foi removida; a verificacao
// explicita garante regressao.
//
// Mocka os hooks de dados para nao depender de SAF/file system real,
// e mocka @gorhom/bottom-sheet usando require dentro do factory para
// satisfazer a regra de variavel mock-prefixada do jest.
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  __esModule: true,
  useFocusEffect: () => undefined,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  // M-CAPTURA-UNIFICADA: SaudeFisicaScreen passou a ler ?abrirCaptura=1
  // via useLocalSearchParams. Mock devolve objeto vazio (sem query)
  // para o caminho default (auto-abertura nao acionada).
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('@/lib/hooks/useTreinos', () => ({
  __esModule: true,
  useTreinos: () => ({
    sessoes: [],
    loading: false,
    error: null,
    recarregar: () => Promise.resolve(),
  }),
}));
jest.mock('@/lib/hooks/useMarcos', () => ({
  __esModule: true,
  useMarcos: () => ({
    marcos: [],
    loading: false,
    error: null,
    recarregar: () => Promise.resolve(),
  }),
}));
jest.mock('@/lib/hooks/useFotosAgregadas', () => ({
  __esModule: true,
  useFotosAgregadas: () => ({
    fotos: [],
    loading: false,
    error: null,
    recarregar: () => Promise.resolve(),
  }),
}));
jest.mock('@/lib/hooks/useMedidas', () => ({
  __esModule: true,
  useMedidas: () => ({
    medidas: [],
    loading: false,
    error: null,
    recarregar: () => Promise.resolve(),
  }),
}));
jest.mock('@/lib/vault/exercicios', () => ({
  __esModule: true,
  listarExercicios: () => Promise.resolve([]),
  lerExercicio: () => Promise.resolve(null),
  escreverExercicio: () => Promise.resolve({ uri: '' }),
  excluirExercicio: () => Promise.resolve({ lixeiraPath: '' }),
}));

// Mock minimal do @gorhom/bottom-sheet. Usa View nativo via 'View'
// nome de componente para evitar referenciar React fora de escopo.
jest.mock('@gorhom/bottom-sheet', () => {
  const RN = jest.requireActual('react-native');
  const r = jest.requireActual('react');
  const Empty = r.forwardRef(function Empty(_p: unknown, _ref: unknown) {
    return null;
  });
  return {
    __esModule: true,
    default: Empty,
    BottomSheetBackdrop: () => null,
    BottomSheetView: function BottomSheetView(props: {
      children: unknown;
      style?: unknown;
    }) {
      return r.createElement(RN.View, { style: props.style }, props.children);
    },
    BottomSheetTextInput: function BottomSheetTextInput(props: unknown) {
      return r.createElement(RN.TextInput, props as object);
    },
  };
});

import SaudeFisicaTab from '@/../app/saude-fisica';

describe('app/saude-fisica.tsx', () => {
  it('renderiza header "Saude Fisica" e as 3 tabs (Treinos / Evolucao / Exercicios)', () => {
    const { getByText, queryByText } = render(<SaudeFisicaTab />);
    expect(getByText('Saúde Física')).toBeTruthy();
    expect(getByText('Treinos')).toBeTruthy();
    // W3 (M-AUDIT-VISUAL-WARNS): label da tab encurtada para 'Evolucao',
    // consistente com 'Treinos' e 'Exercicios' (1 palavra cada).
    expect(getByText('Evolução')).toBeTruthy();
    expect(queryByText('Evolução Corporal')).toBeNull();
    expect(getByText('Exercícios')).toBeTruthy();
    // Regressao: aba Fotos e label antigo "Memorias" foram removidos.
    expect(queryByText('Fotos')).toBeNull();
    expect(queryByText('Memórias')).toBeNull();
    expect(queryByText('Marcos')).toBeNull();
  });

  it('mostra empty state quando nao ha treinos (aba inicial)', () => {
    const { getByText } = render(<SaudeFisicaTab />);
    expect(getByText('Vai aparecer aqui assim que você treinar.')).toBeTruthy();
  });
});
