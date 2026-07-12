// Testes do helper nomeDe() (sincrono) e do hook reativo useNomeDe().
// Cobre:
//   - 'pessoa_a'/'pessoa_b' resolvem para nomes vindos de
//     usePessoa.nomes (defaults genericos 'Nome_A'/'Nome_B' quando o
//     store nao foi populado pelo onboarding).
//   - 'ambos' ramifica por tipoCompanhia (I2-AMIGOS): 'casal' ->
//     'Casal', 'amigos' -> 'Todos', fallback 'Ambos' (sozinho).
//   - useNomeDe() reage a setNome() e a setTipoCompanhia() — re-render
//     dispara com label novo sem remount.
import { renderHook, act } from '@testing-library/react-native';
import { nomeDe, useNomeDe, usePessoa } from '@/lib/stores/pessoa';
import { useOnboarding } from '@/lib/stores/onboarding';

beforeEach(() => {
  usePessoa.getState().resetar();
  useOnboarding.getState().resetar();
});

describe('nomeDe (sincrono)', () => {
  it('ambos com tipoCompanhia=casal resolve para Casal', () => {
    useOnboarding.getState().setTipoCompanhia('casal');
    expect(nomeDe('ambos')).toBe('Casal');
  });

  it('ambos com tipoCompanhia=amigos resolve para Todos', () => {
    useOnboarding.getState().setTipoCompanhia('amigos');
    expect(nomeDe('ambos')).toBe('Todos');
  });

  it('ambos com tipoCompanhia=sozinho cai no fallback Ambos', () => {
    useOnboarding.getState().setTipoCompanhia('sozinho');
    expect(nomeDe('ambos')).toBe('Ambos');
  });

  it('pessoa_a usa default genérico Nome_A do config', () => {
    expect(nomeDe('pessoa_a')).toBe('Nome_A');
  });

  it('pessoa_b usa default genérico Nome_B do config', () => {
    expect(nomeDe('pessoa_b')).toBe('Nome_B');
  });

  it('pessoa_a reflete nome customizado do store', () => {
    usePessoa.getState().setNome('pessoa_a', 'Nome_X');
    expect(nomeDe('pessoa_a')).toBe('Nome_X');
  });
});

describe('useNomeDe (hook reativo)', () => {
  it('ambos com tipoCompanhia=casal retorna Casal', () => {
    useOnboarding.getState().setTipoCompanhia('casal');
    const { result } = renderHook(() => useNomeDe('ambos'));
    expect(result.current).toBe('Casal');
  });

  it('ambos com tipoCompanhia=amigos retorna Todos', () => {
    useOnboarding.getState().setTipoCompanhia('amigos');
    const { result } = renderHook(() => useNomeDe('ambos'));
    expect(result.current).toBe('Todos');
  });

  it('ambos com tipoCompanhia=sozinho retorna Ambos (fallback)', () => {
    useOnboarding.getState().setTipoCompanhia('sozinho');
    const { result } = renderHook(() => useNomeDe('ambos'));
    expect(result.current).toBe('Ambos');
  });

  it('reage a setTipoCompanhia em runtime sem remount', () => {
    useOnboarding.getState().setTipoCompanhia('casal');
    const { result } = renderHook(() => useNomeDe('ambos'));
    expect(result.current).toBe('Casal');
    act(() => {
      useOnboarding.getState().setTipoCompanhia('amigos');
    });
    expect(result.current).toBe('Todos');
  });

  it('reage a setNome em pessoa_a', () => {
    const { result } = renderHook(() => useNomeDe('pessoa_a'));
    expect(result.current).toBe('Nome_A');
    act(() => {
      usePessoa.getState().setNome('pessoa_a', 'Nome_Y');
    });
    expect(result.current).toBe('Nome_Y');
  });

  it('reage a setNome em pessoa_b', () => {
    const { result } = renderHook(() => useNomeDe('pessoa_b'));
    expect(result.current).toBe('Nome_B');
    act(() => {
      usePessoa.getState().setNome('pessoa_b', 'Nome_Z');
    });
    expect(result.current).toBe('Nome_Z');
  });
});
