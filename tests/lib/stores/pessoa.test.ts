// Testes do helper nomeDe() (sincrono) e do hook reativo useNomeDe()
// adicionados em M28. Cobre:
//   - 'ambos' resolve para 'Casal' (rotulo afetivo definido em M28).
//   - 'pessoa_a'/'pessoa_b' resolvem para nomes vindos de
//     usePessoa.nomes (defaults genericos 'Nome_A'/'Nome_B' quando o
//     store nao foi populado pelo onboarding).
//   - useNomeDe() reage a setNome() — re-render dispara com nome novo.
import { renderHook, act } from '@testing-library/react-native';
import { nomeDe, useNomeDe, usePessoa } from '@/lib/stores/pessoa';

beforeEach(() => {
  usePessoa.getState().resetar();
});

describe('nomeDe (sincrono)', () => {
  it('ambos resolve para Casal (rotulo afetivo)', () => {
    expect(nomeDe('ambos')).toBe('Casal');
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
  it('ambos retorna Casal e nao depende do store', () => {
    const { result } = renderHook(() => useNomeDe('ambos'));
    expect(result.current).toBe('Casal');
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
