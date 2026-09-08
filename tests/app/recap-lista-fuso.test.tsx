// A4 (2026-09-08): regressao de fuso no rotulo de data de /recap-lista.
//
// `formatarData` lia getUTCDate/getUTCMonth/getUTCFullYear sobre um ISO
// que ja carrega hora e offset -03:00, entao qualquer registro feito
// depois das 21h aparecia com o dia seguinte. Os tres call sites da
// tela caem no mesmo helper: `sessao.data` (treinos, EXE-3),
// `t.feito_em` (tarefas, anterior a EXE-3) e `r.data`/`c.data`
// (registros) -- por isso os tres estao aqui, e nao so o da EXE-3.
//
// O teste renderiza a TELA e le o texto que o usuario ve; nao chama o
// helper por dentro. Todas as entradas trazem offset explicito, que e
// o que os writers gravam (isoComOffsetLocal em
// src/lib/exercicios/adicionarTreinoLivre.ts:130), entao a assercao nao
// depende do TZ da maquina que roda a suite -- o CI roda em UTC.
//
// Comentarios sem acento (convencao shell/CI).
import { render, screen } from '@testing-library/react-native';
import type { RecapData } from '@/lib/hooks/useRecap';

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

let mockData: RecapData | null = null;

jest.mock('@/lib/hooks/useRecap', () => ({
  __esModule: true,
  useRecap: () => ({ data: mockData, loading: false }),
}));

jest.mock('@/lib/haptics', () => ({
  __esModule: true,
  haptics: { light: jest.fn(), selection: jest.fn() },
}));

import RecapListaTela from '../../app/recap-lista';
import { ToastProvider } from '@/components/ui';

const NUMEROS_ZERADOS: RecapData['numeros'] = {
  registros: 0,
  treinos: 0,
  fotos: 0,
  audios: 0,
  videos: 0,
  eventos_positivos: 0,
  eventos_negativos: 0,
  tarefas_concluidas: 0,
};

function recapVazio(): RecapData {
  return {
    conquistas: [],
    crises: [],
    reflexoes: [],
    evolucoes: [],
    tarefasConcluidas: [],
    sessoesTreino: [],
    numeros: { ...NUMEROS_ZERADOS },
  };
}

function renderTela() {
  return render(
    <ToastProvider>
      <RecapListaTela />
    </ToastProvider>
  );
}

describe('recap-lista A4 (rotulo de data no fuso local)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockBack.mockClear();
    mockParams = {};
    mockData = recapVazio();
  });

  it('sessao de treino das 21h30 mostra o dia 23, nao o 24 (EXE-3)', () => {
    mockParams = { tipo: 'treinos' };
    mockData = {
      ...recapVazio(),
      sessoesTreino: [
        {
          id: 'treino:2026-04-23T21:30:00-03:00:rotina-a',
          rotulo: 'Rotina A',
          duracao_min: 45,
          data: '2026-04-23T21:30:00-03:00',
        },
      ],
    };
    renderTela();
    expect(screen.getByText('23 abr 2026')).toBeTruthy();
    expect(screen.queryByText('24 abr 2026')).toBeNull();
  });

  it('tarefa concluida as 22h10 mostra o dia 23, nao o 24 (anterior a EXE-3)', () => {
    mockParams = { tipo: 'tarefas' };
    mockData = {
      ...recapVazio(),
      tarefasConcluidas: [
        {
          id: 'tarefa:markdown/tarefa-x.md',
          titulo: 'Levar o lixo',
          categoria: 'casa',
          feito_em: '2026-04-23T22:10:00-03:00',
        },
      ],
    };
    renderTela();
    expect(screen.getByText('23 abr 2026')).toBeTruthy();
    expect(screen.queryByText('24 abr 2026')).toBeNull();
  });

  it('reflexao das 23h50 mostra o dia 23, nao o 24 (aba registros)', () => {
    mockParams = { tipo: 'registros' };
    mockData = {
      ...recapVazio(),
      reflexoes: [
        {
          id: 'diario_reflexao:2026-04-23T23:50:00-03:00:pessoa_a',
          data: '2026-04-23T23:50:00-03:00',
          intensidade: 3,
          frase: 'Dia longo, mas fechou bem.',
        },
      ],
    };
    renderTela();
    expect(screen.getByText('23 abr 2026')).toBeTruthy();
    expect(screen.queryByText('24 abr 2026')).toBeNull();
  });

  it('registro da manha continua no mesmo dia (nao regrediu o caso que ja acertava)', () => {
    mockParams = { tipo: 'treinos' };
    mockData = {
      ...recapVazio(),
      sessoesTreino: [
        {
          id: 'treino:2026-04-23T07:15:00-03:00:rotina-b',
          rotulo: 'Rotina B',
          duracao_min: 30,
          data: '2026-04-23T07:15:00-03:00',
        },
      ],
    };
    renderTela();
    expect(screen.getByText('23 abr 2026')).toBeTruthy();
  });

  it('data pura sem hora cai no ramo defensivo T12:00:00Z e nao desloca o dia', () => {
    // `conquistas` normalmente traz Iso8601 com hora; a entrada sem hora
    // existe no helper como defesa (contador.inicio e DataYmd) e o
    // sufixo de meio-dia UTC e o que a mantem no mesmo dia civil.
    mockParams = { tipo: 'registros' };
    mockData = {
      ...recapVazio(),
      conquistas: [
        {
          id: 'marco:2026-04-23:pessoa_b:abc',
          origem: 'marco',
          data: '2026-04-23',
          frase: 'Primeiro mes de rotina.',
        },
      ],
    };
    renderTela();
    expect(screen.getByText('23 abr 2026')).toBeTruthy();
  });
});
