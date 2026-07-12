// R-RECAP-LISTA-FIX-LOOP (2026-05-17): regressao para Maximum update
// depth em /recap-lista.
//
// Mesmo padrao de bug do R-RECAP-FIX-LOOP em /recap-memorias.
// Pre-fix: `hoje = new Date()` e `seteDiasAtras = new Date(...)` no
// top do componente eram recalculados a cada render com timestamps
// ligeiramente diferentes (Date.now() avanca entre renders). Sem
// params.de/params.ate, `range.de` e `range.ate` ficavam instaveis
// -> `useRecap.useEffect` re-disparava em deps -> setState ->
// re-render -> loop.
//
// Fix: memoizar `range` via useMemo([deString, ateString]),
// garantindo que sem params o objeto seja calculado uma so vez por
// montagem.
//
// O teste verifica que o useRecap recebe exatamente o MESMO objeto
// `range` em rerenders consecutivos quando os params nao mudam.
//
// Comentarios sem acento (convencao shell/CI).
import { act, render } from '@testing-library/react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  return {
    __esModule: true,
    useRouter: () => ({
      back: mockBack,
      replace: mockReplace,
      push: mockPush,
    }),
    useLocalSearchParams: () => ({}),
  };
});

// Captura cada chamada de useRecap para inspecionar a estabilidade
// do objeto range entre renders. O React vai re-renderizar diversas
// vezes ao montar (state inicial + side effects); cada chamada do
// hook real receberia novo range pre-fix.
const rangesRecebidos: unknown[] = [];

jest.mock('@/lib/hooks/useRecap', () => ({
  __esModule: true,
  useRecap: (range: unknown) => {
    rangesRecebidos.push(range);
    return {
      data: {
        humorMedia: 5,
        totalRegistros: 0,
        treinos: 0,
        tarefas: 0,
        reflexoes: [],
        conquistas: [],
        crises: [],
        tarefasConcluidas: [],
        vitorias: { contagem: 0, frasePrincipal: null, audioPath: null },
        midias: { fotos: 0, audios: 0, videos: 0 },
        numeros: {
          registros: 0,
          treinos: 0,
          fotos: 0,
          eventos_pos: 0,
          eventos_neg: 0,
          tarefas: 0,
        },
      },
      loading: false,
    };
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

describe('recap-lista R-RECAP-LISTA-FIX-LOOP (estabilidade do range)', () => {
  beforeEach(() => {
    rangesRecebidos.length = 0;
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('range entregue ao useRecap mantem identidade entre rerenders sem params', () => {
    const { rerender } = renderTela();
    // Forca rerenders sem mudar params: identidade do range deve
    // preservar via useMemo([deString, ateString]).
    rerender(
      <ToastProvider>
        <RecapListaTela />
      </ToastProvider>
    );
    rerender(
      <ToastProvider>
        <RecapListaTela />
      </ToastProvider>
    );
    // Espera pelo menos 2 chamadas de useRecap (montagem + rerender).
    expect(rangesRecebidos.length).toBeGreaterThanOrEqual(2);
    // Pre-fix: cada chamada recebia objeto novo com timestamps
    // ligeiramente diferentes. Pos-fix: identidade preservada via
    // useMemo([deString, ateString]).
    const primeiro = rangesRecebidos[0];
    rangesRecebidos.slice(1).forEach((r) => {
      expect(r).toBe(primeiro);
    });
  });

  it('timestamps de range.de e range.ate sao estaveis em tempo real avancando', () => {
    // Avanca Date.now() entre rerenders simulando producao: sem o
    // fix, cada render computaria novo `hoje = new Date()` com ms
    // diferente, gerando timestamps distintos no range.
    jest.setSystemTime(new Date('2026-05-17T03:49:48.254Z').getTime());
    const { rerender } = renderTela();
    jest.setSystemTime(new Date('2026-05-17T03:49:48.350Z').getTime());
    rerender(
      <ToastProvider>
        <RecapListaTela />
      </ToastProvider>
    );
    jest.setSystemTime(new Date('2026-05-17T03:49:48.500Z').getTime());
    rerender(
      <ToastProvider>
        <RecapListaTela />
      </ToastProvider>
    );
    expect(rangesRecebidos.length).toBeGreaterThanOrEqual(2);
    type RangeShape = { de: Date; ate: Date };
    const primeiro = rangesRecebidos[0] as RangeShape;
    const tsDeInicial = primeiro.de.getTime();
    const tsAteInicial = primeiro.ate.getTime();
    rangesRecebidos.slice(1).forEach((r) => {
      const cur = r as RangeShape;
      expect(cur.de.getTime()).toBe(tsDeInicial);
      expect(cur.ate.getTime()).toBe(tsAteInicial);
    });
  });
});
