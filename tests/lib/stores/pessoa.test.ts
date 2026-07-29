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
import {
  nomeDe,
  useNomeDe,
  usePessoa,
  mergePessoaPersistido,
} from '@/lib/stores/pessoa';
import { PESSOAS_CONFIG } from '@/config/pessoas.config';
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

// AUDIT-P1-8 (2026-07-28): back-fill da hidratacao (armadilha A47).
//
// Store sem version/migrate: TODA hidratacao passa pelo merge. Sem o
// custom, valia o merge SHALLOW do zustand, onde o objeto `fotos` (ou
// `nomes`) persistido substitui o default inteiro -- uma chave ausente
// hidrata `undefined` e o avatar da pessoa cai para a inicial.
//
// Os testes chamam a funcao REAL `mergePessoaPersistido` (a mesma
// cabeada em `merge` no persist config).
describe('mergePessoaPersistido (back-fill nested - AUDIT-P1-8)', () => {
  beforeEach(() => {
    usePessoa.getState().resetar();
  });

  // Instalacao organica de quem usava o app sozinho: nomeou e fotografou
  // apenas pessoa_a. Ao virar duo, as chaves de pessoa_b faltam no blob
  // persistido.
  function persistidoAntigo(): Record<string, unknown> {
    return {
      pessoaAtiva: 'pessoa_a',
      filtroPessoa: 'ambos',
      nomes: { pessoa_a: 'Nome_Escolhido' },
      fotos: { pessoa_a: 'file:///vault/avatar-a.jpg' },
    };
  }

  it('back-filla nome ausente com o default sem apagar o escolhido', () => {
    const persistido = persistidoAntigo();
    expect(
      (persistido.nomes as Record<string, unknown>).pessoa_b
    ).toBeUndefined();

    const merged = mergePessoaPersistido(persistido, usePessoa.getState());

    // O fix: cai no default generico do config, nao em undefined.
    expect(merged.nomes.pessoa_b).toBe(PESSOAS_CONFIG.pessoa_b.nome);
    // Escolha organica preservada.
    expect(merged.nomes.pessoa_a).toBe('Nome_Escolhido');
  });

  it('back-filla foto ausente com null sem derrubar a foto existente', () => {
    const merged = mergePessoaPersistido(
      persistidoAntigo(),
      usePessoa.getState()
    );

    expect(merged.fotos.pessoa_b).toBeNull();
    expect(merged.fotos.pessoa_a).toBe('file:///vault/avatar-a.jpg');
  });

  it('preserva chaves planas e as acoes do store apos a hidratacao', () => {
    const merged = mergePessoaPersistido(
      persistidoAntigo(),
      usePessoa.getState()
    );

    expect(merged.pessoaAtiva).toBe('pessoa_a');
    expect(merged.filtroPessoa).toBe('ambos');
    expect(typeof merged.setNome).toBe('function');
    expect(typeof merged.setFoto).toBe('function');
    expect(typeof merged.resetar).toBe('function');
  });

  it('back-filla sub-objeto ausente por inteiro (persistido corrompido)', () => {
    const merged = mergePessoaPersistido(
      { pessoaAtiva: 'pessoa_b', filtroPessoa: 'pessoa_b' },
      usePessoa.getState()
    );

    expect(merged.nomes.pessoa_a).toBe(PESSOAS_CONFIG.pessoa_a.nome);
    expect(merged.nomes.pessoa_b).toBe(PESSOAS_CONFIG.pessoa_b.nome);
    expect(merged.fotos.pessoa_a).toBeNull();
    expect(merged.fotos.pessoa_b).toBeNull();
  });

  it('guard: persistedState null/undefined/nao-objeto retorna o currentState intacto', () => {
    const atual = usePessoa.getState();
    expect(mergePessoaPersistido(null, atual)).toBe(atual);
    expect(mergePessoaPersistido(undefined, atual)).toBe(atual);
    expect(mergePessoaPersistido('lixo', atual)).toBe(atual);
    expect(typeof mergePessoaPersistido(null, atual).setNome).toBe('function');
  });
});
