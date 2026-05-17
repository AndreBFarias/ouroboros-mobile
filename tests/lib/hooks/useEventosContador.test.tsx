// Testes do hook useEventosContador (R-RECAP-5, 2026-05-16). Cobre:
// vaultRoot ausente, contadorId null, lista carregada e erro de I/O.
//
// Mocks: listarEventosContador + stores (vault) + expo-router
// useFocusEffect.
//
// Comentarios sem acento (convencao shell/CI).
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { EventoContador } from '@/lib/schemas/evento_contador';

const mockListarEventos = jest.fn();

jest.mock('@/lib/vault/eventosContador', () => ({
  __esModule: true,
  listarEventosContador: (...args: unknown[]) => mockListarEventos(...args),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useFocusEffect: () => {
    // No-op em teste; useEffect padrao ja dispara carregar.
  },
}));

import { useEventosContador } from '@/lib/hooks/useEventosContador';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

function fixture(over: Partial<EventoContador> = {}): EventoContador {
  return {
    tipo: 'evento_contador',
    contadorId: 'sem-cigarro',
    data: '2026-05-16',
    slug: 'aaa',
    humor: 4,
    descricao: 'desc',
    tags: [],
    midias: [],
    criado_em: '2026-05-16T14:00:00-03:00',
    autor: 'pessoa_a',
    para: { tipo: 'mim' },
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useVault.setState({ vaultRoot: VAULT_ROOT });
  mockListarEventos.mockResolvedValue([]);
});

describe('useEventosContador', () => {
  it('retorna [] e loading=false quando vaultRoot ausente', async () => {
    useVault.setState({ vaultRoot: null });
    const { result } = renderHook(() => useEventosContador('sem-cigarro'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.eventos).toEqual([]);
    expect(mockListarEventos).not.toHaveBeenCalled();
  });

  it('retorna [] e loading=false quando contadorId null', async () => {
    const { result } = renderHook(() => useEventosContador(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.eventos).toEqual([]);
    expect(mockListarEventos).not.toHaveBeenCalled();
  });

  it('chama listarEventosContador com vaultRoot e contadorId', async () => {
    mockListarEventos.mockResolvedValueOnce([fixture()]);
    const { result } = renderHook(() => useEventosContador('sem-cigarro'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListarEventos).toHaveBeenCalledWith(VAULT_ROOT, 'sem-cigarro');
    expect(result.current.eventos).toHaveLength(1);
    expect(result.current.eventos[0].slug).toBe('aaa');
  });

  it('seta error quando listar falha', async () => {
    mockListarEventos.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useEventosContador('x'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.eventos).toEqual([]);
  });

  it('recarregar reexecuta a busca', async () => {
    mockListarEventos.mockResolvedValueOnce([fixture({ slug: 'aaa' })]);
    const { result } = renderHook(() => useEventosContador('x'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.eventos[0].slug).toBe('aaa');

    mockListarEventos.mockResolvedValueOnce([
      fixture({ slug: 'aaa' }),
      fixture({ slug: 'bbb' }),
    ]);
    await act(async () => {
      await result.current.recarregar();
    });
    expect(result.current.eventos).toHaveLength(2);
    expect(mockListarEventos).toHaveBeenCalledTimes(2);
  });
});
