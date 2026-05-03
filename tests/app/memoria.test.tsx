// Smoke da rota app/memoria.tsx (M27 moveu de (tabs)/memoria para
// raiz). Verifica que MemoriasScreen renderiza header, tabs e que
// a aba inicial e Treinos.
//
// Mocka os hooks de dados para nao depender de SAF/file system real,
// e mocka @gorhom/bottom-sheet usando require dentro do factory para
// satisfazer a regra de variavel mock-prefixada do jest.
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  __esModule: true,
  useFocusEffect: () => undefined,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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

import MemoriaTab from '@/../app/memoria';

describe('app/memoria.tsx', () => {
  it('renderiza header Memorias e tabs Treinos/Fotos/Marcos', () => {
    const { getByText } = render(<MemoriaTab />);
    expect(getByText('Memórias')).toBeTruthy();
    expect(getByText('Treinos')).toBeTruthy();
    expect(getByText('Fotos')).toBeTruthy();
    expect(getByText('Marcos')).toBeTruthy();
  });

  it('mostra empty state quando nao ha treinos', () => {
    const { getByText } = render(<MemoriaTab />);
    expect(
      getByText('Vai aparecer aqui assim que você treinar.')
    ).toBeTruthy();
  });
});
