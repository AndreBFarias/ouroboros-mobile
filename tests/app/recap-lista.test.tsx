// R-RECAP-NUMEROS-AUDIOVIDEO-CARDS (2026-05-17): testes do handler
// app/recap-lista.tsx para os tipos novos audios e videos.
//
// O recap-lista trata tipos sem dado direto (fotos/audios/videos sao
// contagens agregadas em useRecap.numeros, nao listas indexaveis) via
// redirect para /galeria?filtro=<tipo>. Os testes validam:
//   1. tipo=audios -> router.replace('/galeria?filtro=audio')
//   2. tipo=videos -> router.replace('/galeria?filtro=video')
//   3. tipo=fotos preservado (regressao R-CROSS-FLOW-AUDIT)
//   4. tipos sem redirect (tarefas) nao chamam replace
//
// Comentarios sem acento (convencao shell/CI).
import { render } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    push: mockPush,
  }),
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/hooks/useRecap', () => ({
  __esModule: true,
  useRecap: () => ({
    data: {
      conquistas: [],
      crises: [],
      reflexoes: [],
      evolucoes: [],
      tarefasConcluidas: [],
      numeros: {
        registros: 0,
        treinos: 0,
        fotos: 0,
        audios: 0,
        videos: 0,
        eventos_positivos: 0,
        eventos_negativos: 0,
        tarefas_concluidas: 0,
      },
    },
    loading: false,
  }),
}));

jest.mock('@/lib/haptics', () => ({
  __esModule: true,
  haptics: {
    light: jest.fn(),
    selection: jest.fn(),
  },
}));

import RecapListaTela from '../../app/recap-lista';
import { ToastProvider } from '@/components/ui';

function renderTela() {
  return render(
    <ToastProvider>
      <RecapListaTela />
    </ToastProvider>
  );
}

describe('recap-lista R-RECAP-NUMEROS-AUDIOVIDEO-CARDS (redirects)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockBack.mockClear();
    mockParams = {};
  });

  it('tipo=audios redireciona para /galeria?filtro=audio', () => {
    mockParams = { tipo: 'audios' };
    renderTela();
    expect(mockReplace).toHaveBeenCalledWith('/galeria?filtro=audio');
  });

  it('tipo=videos redireciona para /galeria?filtro=video', () => {
    mockParams = { tipo: 'videos' };
    renderTela();
    expect(mockReplace).toHaveBeenCalledWith('/galeria?filtro=video');
  });

  it('tipo=fotos redireciona para /galeria?filtro=foto (regressao R-CROSS-FLOW)', () => {
    mockParams = { tipo: 'fotos' };
    renderTela();
    expect(mockReplace).toHaveBeenCalledWith('/galeria?filtro=foto');
  });

  it('tipo=tarefas nao chama replace (renderiza lista normal)', () => {
    mockParams = { tipo: 'tarefas' };
    renderTela();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('tipo invalido cai em registros e nao chama replace', () => {
    mockParams = { tipo: 'bogus' };
    renderTela();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
