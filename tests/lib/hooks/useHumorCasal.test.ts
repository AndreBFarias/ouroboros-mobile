// Testes do hook useHumorCasal (R-HOME-4a). Cobre:
//   - vaultRoot ausente -> pessoaA/B null, loading false, sem I/O.
//   - casal com 2 registros de pessoa_a + 1 de pessoa_b -> pega o mais
//     recente de cada; registrouHoje correto.
//   - sozinho -> pessoaB null mesmo havendo registro de pessoa_b.
//
// Mocks: listarHumor + expo-router useFocusEffect + stores (vault,
// onboarding). useEffect padrao ja dispara o carregar em teste.
//
// Comentarios sem acento (convencao shell/CI).
import { renderHook, waitFor } from '@testing-library/react-native';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

const mockListarHumor = jest.fn();

jest.mock('@/lib/vault/humor', () => ({
  __esModule: true,
  listarHumor: (...args: unknown[]) => mockListarHumor(...args),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useFocusEffect: () => {
    // No-op em teste; useEffect padrao ja dispara carregar.
  },
}));

import { useHumorCasal } from '@/lib/hooks/useHumorCasal';
import { useVault } from '@/lib/stores/vault';
import { useOnboarding } from '@/lib/stores/onboarding';

const VAULT_ROOT = 'content://test/vault';

// YYYY-MM-DD no fuso BRT com offset em dias a partir de agora.
function ymdBrtOffset(offsetDias: number): string {
  const local = new Date(Date.now() + offsetDias * 86_400_000 + -180 * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function humor(autor: PessoaAutor, data: string, over: Partial<HumorMeta> = {}): HumorMeta {
  return {
    tipo: 'humor',
    data,
    autor,
    humor: 3,
    energia: 3,
    ansiedade: 3,
    foco: 3,
    tags: [],
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useVault.setState({ vaultRoot: VAULT_ROOT });
  useOnboarding.setState({ tipoCompanhia: 'casal' });
  mockListarHumor.mockResolvedValue([]);
});

describe('useHumorCasal', () => {
  it('retorna pessoaA/B null e loading false quando vaultRoot ausente', async () => {
    useVault.setState({ vaultRoot: null });
    const { result } = renderHook(() => useHumorCasal());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pessoaA).toBeNull();
    expect(result.current.pessoaB).toBeNull();
    expect(mockListarHumor).not.toHaveBeenCalled();
  });

  it('pega o registro mais recente de cada autor (casal)', async () => {
    const hojeA = ymdBrtOffset(0);
    const antigoA = ymdBrtOffset(-2);
    const ontemB = ymdBrtOffset(-1);
    // listarHumor devolve desc por data (mais recente primeiro).
    mockListarHumor.mockResolvedValueOnce([
      humor('pessoa_a', hojeA, { humor: 5 }),
      humor('pessoa_b', ontemB, { humor: 2 }),
      humor('pessoa_a', antigoA, { humor: 1 }),
    ]);

    const { result } = renderHook(() => useHumorCasal());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockListarHumor).toHaveBeenCalledWith(VAULT_ROOT);
    // pessoa_a: mais recente e o de hoje (humor 5).
    expect(result.current.pessoaA?.meta.humor).toBe(5);
    expect(result.current.pessoaA?.dataYmd).toBe(hojeA);
    expect(result.current.pessoaA?.registrouHoje).toBe(true);
    // pessoa_b: unico registro, de ontem -> registrouHoje false.
    expect(result.current.pessoaB?.meta.humor).toBe(2);
    expect(result.current.pessoaB?.registrouHoje).toBe(false);
    expect(result.current.ehSozinho).toBe(false);
  });

  it('registrouHoje false quando o registro mais recente nao e de hoje', async () => {
    mockListarHumor.mockResolvedValueOnce([
      humor('pessoa_a', ymdBrtOffset(-1)),
    ]);
    const { result } = renderHook(() => useHumorCasal());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.pessoaA?.registrouHoje).toBe(false);
    expect(result.current.pessoaB).toBeNull();
  });

  it('em sozinho pessoaB e null mesmo havendo registro de pessoa_b', async () => {
    useOnboarding.setState({ tipoCompanhia: 'sozinho' });
    mockListarHumor.mockResolvedValueOnce([
      humor('pessoa_a', ymdBrtOffset(0), { humor: 4 }),
      humor('pessoa_b', ymdBrtOffset(0), { humor: 4 }),
    ]);
    const { result } = renderHook(() => useHumorCasal());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ehSozinho).toBe(true);
    expect(result.current.pessoaA?.meta.humor).toBe(4);
    expect(result.current.pessoaB).toBeNull();
  });
});
