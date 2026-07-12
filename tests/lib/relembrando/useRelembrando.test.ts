// Testes do hook useRelembrando (R-HOME-4d, spec §3). Cobre:
//   - vaultRoot ausente -> relembranca null, loading false, sem I/O.
//   - monta o pool das TRES origens (reflexao / conquista / humor com
//     frase): quando so uma origem qualifica (idade >= limiar), a
//     lembranca escolhida vem dessa origem.
//   - humor sem frase e diario com texto vazio nao entram no pool.
//   - itens recentes (idade < 2) sao filtrados.
//
// Mocks: listarDiarios + listarHumor + expo-router useFocusEffect. O
// useEffect padrao ja dispara o carregar em teste. Store de vault real.
//
// Comentarios sem acento (convencao shell/CI).
import { renderHook, waitFor } from '@testing-library/react-native';
import type { DiarioEmocionalMeta } from '@/lib/schemas/diario_emocional';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

const mockListarDiarios = jest.fn();
const mockListarHumor = jest.fn();

jest.mock('@/lib/vault/diario', () => ({
  __esModule: true,
  listarDiarios: (...args: unknown[]) => mockListarDiarios(...args),
}));

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

import { useRelembrando } from '@/lib/hooks/useRelembrando';
import { useVault } from '@/lib/stores/vault';

const VAULT_ROOT = 'content://test/vault';

// YYYY-MM-DD no fuso BRT com offset em dias a partir de agora.
function ymdOffset(dias: number): string {
  const local = new Date(Date.now() + dias * 86_400_000 + -180 * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ISO 8601 com hora (formato do diario). O hook corta os 10 primeiros
// chars para o dia puro.
function isoOffset(dias: number): string {
  return `${ymdOffset(dias)}T12:00:00-03:00`;
}

function diario(
  modo: DiarioEmocionalMeta['modo'],
  dataIso: string,
  texto: string,
  autor: PessoaAutor = 'pessoa_a'
): DiarioEmocionalMeta {
  return {
    tipo: 'diario_emocional',
    data: dataIso,
    autor,
    modo,
    emocoes: [],
    intensidade: 3,
    com: [],
    contexto_social: [],
    texto,
    midia: [],
    para: { tipo: 'mim' },
  } as DiarioEmocionalMeta;
}

function humor(
  data: string,
  over: Partial<HumorMeta> = {}
): HumorMeta {
  return {
    tipo: 'humor',
    data,
    autor: 'pessoa_a',
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
  mockListarDiarios.mockResolvedValue([]);
  mockListarHumor.mockResolvedValue([]);
});

describe('useRelembrando', () => {
  it('vaultRoot ausente -> relembranca null, loading false, sem I/O', async () => {
    useVault.setState({ vaultRoot: null });
    const { result } = renderHook(() => useRelembrando());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.relembranca).toBeNull();
    expect(mockListarDiarios).not.toHaveBeenCalled();
    expect(mockListarHumor).not.toHaveBeenCalled();
  });

  it('reflexao antiga entra no pool e e escolhida (unico candidato)', async () => {
    mockListarDiarios.mockResolvedValueOnce([
      diario('reflexao', isoOffset(-40), 'Tarde tranquila e leve'),
      // Recente: idade < 2, filtrado.
      diario('reflexao', isoOffset(0), 'Hoje passou depressa'),
    ]);
    const { result } = renderHook(() => useRelembrando());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListarDiarios).toHaveBeenCalledWith(VAULT_ROOT);
    expect(result.current.relembranca).not.toBeNull();
    expect(result.current.relembranca?.origem).toBe('reflexao');
    expect(result.current.relembranca?.frase).toBe('Tarde tranquila e leve');
  });

  it('conquista antiga entra no pool (origem conquista)', async () => {
    mockListarDiarios.mockResolvedValueOnce([
      diario('conquista', isoOffset(-90), 'Corrida terminada'),
    ]);
    const { result } = renderHook(() => useRelembrando());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.relembranca?.origem).toBe('conquista');
    expect(result.current.relembranca?.id).toContain('diario_vitoria');
  });

  it('humor com frase antiga entra no pool (origem humor)', async () => {
    mockListarHumor.mockResolvedValueOnce([
      humor(ymdOffset(-20), { frase: 'Um dia devagar' }),
    ]);
    const { result } = renderHook(() => useRelembrando());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.relembranca?.origem).toBe('humor');
    expect(result.current.relembranca?.frase).toBe('Um dia devagar');
  });

  it('humor sem frase e diario com texto vazio nao entram -> null', async () => {
    mockListarDiarios.mockResolvedValueOnce([
      diario('reflexao', isoOffset(-30), '   '),
      // gatilho nunca entra no pool.
      diario('gatilho', isoOffset(-30), 'Momento dificil'),
    ]);
    mockListarHumor.mockResolvedValueOnce([humor(ymdOffset(-30))]);
    const { result } = renderHook(() => useRelembrando());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.relembranca).toBeNull();
  });
});
