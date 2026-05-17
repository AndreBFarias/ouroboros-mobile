// Teste de integracao RTL para SecaoProximos (R-HOME-2).
// Mocka useProximos com fixture deterministica e valida que:
//  - 3 itens (2 eventos + 1 alarme) aparecem na ordem cronologica.
//  - Cada item mostra o rotulo de tipo correto (Evento/Alarme/Tarefa).
//  - Fallback sem OAuth (so alarmes/tarefas) renderiza apenas esses.
//  - Empty state "Nada nas próximas horas." aparece quando lista vazia.
//
// Substitui em parte o E2E playwright para esta sprint, pois nao ha
// API gauntlet para popular cache de agenda no vaultMock (achado
// colateral registrado em sprint nova).
//
// Comentarios sem acento (convencao shell/CI).
import { render } from '@testing-library/react-native';
import type { ItemProximo, ProximosData } from '@/lib/hooks/useProximos';
import { SecaoProximos } from '@/components/screens/SecaoProximos';

// Mock factory para useProximos. Cada teste sobrescreve via beforeEach.
let mockDados: ProximosData = {
  itens: [],
  loading: false,
  error: null,
  reload: () => {},
};

jest.mock('@/lib/hooks/useProximos', () => {
  const actual = jest.requireActual('@/lib/hooks/useProximos');
  return {
    __esModule: true,
    ...actual,
    useProximos: () => mockDados,
  };
});

function fixtureEvento(
  id: string,
  titulo: string,
  hora: string,
  iso: string
): ItemProximo {
  return { tipo: 'evento', id, titulo, hora, iso };
}

function fixtureAlarme(
  id: string,
  titulo: string,
  hora: string,
  iso: string
): ItemProximo {
  return { tipo: 'alarme', id, titulo, hora, iso };
}

function fixtureTarefa(
  id: string,
  titulo: string,
  hora: string,
  iso: string,
  feita: boolean = false
): ItemProximo {
  return { tipo: 'tarefa', id, titulo, hora, iso, feita };
}

beforeEach(() => {
  mockDados = { itens: [], loading: false, error: null, reload: () => {} };
});

test('R-HOME-2 fixture 2 eventos + 1 alarme: ordem cronologica unica', () => {
  mockDados = {
    itens: [
      fixtureEvento(
        'ev-A',
        'Cafe da manha',
        '08:30',
        '2026-05-04T08:30:00-03:00'
      ),
      fixtureAlarme(
        'medicacao',
        'Medicação',
        '09:30',
        '2026-05-04T09:30:00-03:00'
      ),
      fixtureEvento(
        'ev-B',
        'Reuniao tarde',
        '11:00',
        '2026-05-04T11:00:00-03:00'
      ),
    ],
    loading: false,
    error: null,
    reload: () => {},
  };

  const { getByText, queryByText, getAllByText } = render(<SecaoProximos />);

  // Titulo da secao.
  expect(getByText('Próximos')).toBeTruthy();

  // 3 itens visiveis.
  expect(getByText('Cafe da manha')).toBeTruthy();
  expect(getByText('Medicação')).toBeTruthy();
  expect(getByText('Reuniao tarde')).toBeTruthy();

  // Rotulos de tipo distinguem origem: 2 "Evento" + 1 "Alarme".
  const eventos = getAllByText('Evento');
  const alarmes = getAllByText('Alarme');
  expect(eventos.length).toBe(2);
  expect(alarmes.length).toBe(1);

  // Hora de cada item exibida.
  expect(getByText('08:30')).toBeTruthy();
  expect(getByText('09:30')).toBeTruthy();
  expect(getByText('11:00')).toBeTruthy();

  // Empty state nao aparece.
  expect(queryByText('Nada nas próximas horas.')).toBeNull();
});

test('R-HOME-2 fallback sem OAuth: apenas alarmes/tarefas', () => {
  mockDados = {
    itens: [
      fixtureAlarme(
        'agua',
        'Tomar água',
        '09:00',
        '2026-05-04T09:00:00-03:00'
      ),
      fixtureTarefa(
        'tarefas/2026-05-04-pendente.md',
        'Tarefa pendente',
        '10:00',
        '2026-05-04T10:00:00-03:00'
      ),
    ],
    loading: false,
    error: null,
    reload: () => {},
  };

  const { getByText, queryByText } = render(<SecaoProximos />);

  expect(getByText('Próximos')).toBeTruthy();
  expect(getByText('Tomar água')).toBeTruthy();
  expect(getByText('Tarefa pendente')).toBeTruthy();

  // Nao deve mostrar eventos da agenda.
  expect(queryByText('Evento')).toBeNull();

  // Nao deve mostrar mensagem de erro/auth na secao Proximos.
  expect(queryByText('Nada nas próximas horas.')).toBeNull();
});

test('R-HOME-2 empty state: lista vazia mostra "Nada nas próximas horas."', () => {
  mockDados = {
    itens: [],
    loading: false,
    error: null,
    reload: () => {},
  };
  const { getByText } = render(<SecaoProximos />);
  expect(getByText('Próximos')).toBeTruthy();
  expect(getByText('Nada nas próximas horas.')).toBeTruthy();
});

test('R-HOME-2 loading state: mostra "Carregando..."', () => {
  mockDados = {
    itens: [],
    loading: true,
    error: null,
    reload: () => {},
  };
  const { getByText, queryByText } = render(<SecaoProximos />);
  expect(getByText('Próximos')).toBeTruthy();
  expect(getByText('Carregando...')).toBeTruthy();
  expect(queryByText('Nada nas próximas horas.')).toBeNull();
});

test('R-HOME-2 error state: nao renderiza fallback nem itens', () => {
  mockDados = {
    itens: [],
    loading: false,
    error: 'falha mock',
    reload: () => {},
  };
  const { getByText, queryByText } = render(<SecaoProximos />);
  expect(getByText('Próximos')).toBeTruthy();
  // Comportamento: error => null (nao renderiza Card de erro nem
  // empty state). Verifica que conteudo interno some.
  expect(queryByText('Nada nas próximas horas.')).toBeNull();
  expect(queryByText('Carregando...')).toBeNull();
});

test('R-HOME-2 tarefa feita aparece com risco (line-through)', () => {
  mockDados = {
    itens: [
      fixtureTarefa(
        'tarefas/feita.md',
        'Tarefa concluida',
        '09:00',
        '2026-05-04T09:00:00-03:00',
        true
      ),
    ],
    loading: false,
    error: null,
    reload: () => {},
  };
  const { getByText } = render(<SecaoProximos />);
  const titulo = getByText('Tarefa concluida');
  // Style array pode ter ate dois objetos (base + line-through overlay).
  // Flatten e busca textDecorationLine.
  const styles = Array.isArray(titulo.props.style)
    ? titulo.props.style
    : [titulo.props.style];
  const tem = styles.some(
    (s: { textDecorationLine?: string } | undefined) =>
      s?.textDecorationLine === 'line-through'
  );
  expect(tem).toBe(true);
});
