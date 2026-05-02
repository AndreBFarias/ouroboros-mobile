// Testes do selector useFiltroPessoaEfetivo. Cobre as 4 combinações
// (vaultCompartilhado x filtroPessoa) e o comportamento reativo
// quando qualquer ingrediente muda.
//
// Snapshot helper getFiltroPessoaEfetivo (não-hook) também coberto.
import { renderHook, act } from '@testing-library/react-native';
import {
  useFiltroPessoaEfetivo,
  useVaultCompartilhado,
  getFiltroPessoaEfetivo,
} from '@/lib/stores/filtroEfetivo';
import { usePessoa } from '@/lib/stores/pessoa';
import { useSettings } from '@/lib/stores/settings';

beforeEach(() => {
  // Reset stores para defaults antes de cada teste.
  usePessoa.getState().resetar();
  useSettings.getState().resetar();
});

describe('useFiltroPessoaEfetivo', () => {
  it('retorna filtroPessoa do store quando vaultCompartilhado=true', () => {
    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', true);
      usePessoa.getState().setFiltroPessoa('ambos');
      usePessoa.getState().setPessoaAtiva('pessoa_a');
    });
    const { result } = renderHook(() => useFiltroPessoaEfetivo());
    expect(result.current).toBe('ambos');
  });

  it('retorna pessoaAtiva quando vaultCompartilhado=false e store guarda ambos', () => {
    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', false);
      usePessoa.getState().setFiltroPessoa('ambos');
      usePessoa.getState().setPessoaAtiva('pessoa_b');
    });
    const { result } = renderHook(() => useFiltroPessoaEfetivo());
    expect(result.current).toBe('pessoa_b');
  });

  it('retorna filtroPessoa quando vaultCompartilhado=true e filtro = pessoa específica', () => {
    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', true);
      usePessoa.getState().setFiltroPessoa('pessoa_b');
      usePessoa.getState().setPessoaAtiva('pessoa_a');
    });
    const { result } = renderHook(() => useFiltroPessoaEfetivo());
    expect(result.current).toBe('pessoa_b');
  });

  it('retorna pessoaAtiva quando vaultCompartilhado=false mesmo se filtro = pessoa específica', () => {
    // Privacidade absoluta: não expõe registros da outra pessoa.
    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', false);
      usePessoa.getState().setFiltroPessoa('pessoa_b');
      usePessoa.getState().setPessoaAtiva('pessoa_a');
    });
    const { result } = renderHook(() => useFiltroPessoaEfetivo());
    expect(result.current).toBe('pessoa_a');
  });

  it('reage à mudança de vaultCompartilhado', () => {
    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', true);
      usePessoa.getState().setFiltroPessoa('ambos');
      usePessoa.getState().setPessoaAtiva('pessoa_a');
    });
    const { result } = renderHook(() => useFiltroPessoaEfetivo());
    expect(result.current).toBe('ambos');

    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', false);
    });
    expect(result.current).toBe('pessoa_a');
  });

  it('reage à mudança de pessoaAtiva quando privado', () => {
    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', false);
      usePessoa.getState().setPessoaAtiva('pessoa_a');
    });
    const { result } = renderHook(() => useFiltroPessoaEfetivo());
    expect(result.current).toBe('pessoa_a');

    act(() => {
      usePessoa.getState().setPessoaAtiva('pessoa_b');
    });
    expect(result.current).toBe('pessoa_b');
  });
});

describe('useVaultCompartilhado', () => {
  it('reflete o flag direto do settings', () => {
    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', true);
    });
    const { result } = renderHook(() => useVaultCompartilhado());
    expect(result.current).toBe(true);

    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', false);
    });
    expect(result.current).toBe(false);
  });
});

describe('getFiltroPessoaEfetivo (snapshot)', () => {
  it('respeita vaultCompartilhado=true', () => {
    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', true);
      usePessoa.getState().setFiltroPessoa('ambos');
    });
    expect(getFiltroPessoaEfetivo()).toBe('ambos');
  });

  it('força pessoaAtiva quando vaultCompartilhado=false', () => {
    act(() => {
      useSettings.getState().setPessoa('vaultCompartilhado', false);
      usePessoa.getState().setFiltroPessoa('ambos');
      usePessoa.getState().setPessoaAtiva('pessoa_b');
    });
    expect(getFiltroPessoaEfetivo()).toBe('pessoa_b');
  });
});
