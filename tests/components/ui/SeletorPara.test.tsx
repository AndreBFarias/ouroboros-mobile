// Testes do SeletorPara (M33). Cobre:
//   - render dinamico em modo duo (3 chips com nome runtime do
//     parceiro).
//   - hide em modo sozinho (return null).
//   - callback onChange para cada opcao (mim / outra / casal).
//   - troca de selecao mantendo discriminador.
//
// Mocks de useSettings e usePessoa evitam dependencia de SecureStore.
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { SeletorPara } from '@/components/ui';
import type { Para } from '@/lib/schemas/para';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// Mocks configuraveis por teste via vars do escopo.
let mockTipoCompanhia: 'sozinho' | 'duo' = 'duo';
let mockPessoaAtiva: PessoaAutor = 'pessoa_a';
let mockNomes: Record<PessoaAutor, string> = {
  pessoa_a: 'Pessoa A',
  pessoa_b: 'Pessoa B',
};

jest.mock('@/lib/stores/settings', () => ({
  __esModule: true,
  useSettings: <T,>(
    sel: (s: { pessoa: { tipoCompanhia: 'sozinho' | 'duo' } }) => T
  ): T => sel({ pessoa: { tipoCompanhia: mockTipoCompanhia } }),
}));

jest.mock('@/lib/stores/pessoa', () => ({
  __esModule: true,
  usePessoa: <T,>(
    sel: (s: { pessoaAtiva: PessoaAutor; nomes: typeof mockNomes }) => T
  ): T => sel({ pessoaAtiva: mockPessoaAtiva, nomes: mockNomes }),
  // useNomeDe le nomes diretamente do mock.
  useNomeDe: (p: 'pessoa_a' | 'pessoa_b' | 'ambos'): string => {
    if (p === 'ambos') return 'Os dois';
    return mockNomes[p];
  },
  nomeDe: (p: 'pessoa_a' | 'pessoa_b' | 'ambos'): string => {
    if (p === 'ambos') return 'Os dois';
    return mockNomes[p];
  },
}));

beforeEach(() => {
  mockTipoCompanhia = 'duo';
  mockPessoaAtiva = 'pessoa_a';
  mockNomes = { pessoa_a: 'Pessoa A', pessoa_b: 'Pessoa B' };
});

// Wrapper controlado.
function Harness({
  inicial = { tipo: 'mim' } as Para,
  onChangeSpy,
}: {
  inicial?: Para;
  onChangeSpy?: (next: Para) => void;
}) {
  const [value, setValue] = useState<Para>(inicial);
  return (
    <SeletorPara
      value={value}
      onChange={(n) => {
        setValue(n);
        onChangeSpy?.(n);
      }}
    />
  );
}

describe('SeletorPara render', () => {
  it('renderiza 3 chips em modo duo', () => {
    const { getByLabelText } = render(<Harness />);
    expect(getByLabelText('chip Para mim')).toBeTruthy();
    expect(getByLabelText('chip Para Pessoa B')).toBeTruthy();
    expect(getByLabelText('chip Para o casal')).toBeTruthy();
  });

  it('usa nome dinamico do parceiro (pessoa_a ativa -> rotulo de pessoa_b)', () => {
    mockPessoaAtiva = 'pessoa_a';
    mockNomes = { pessoa_a: 'Nome A', pessoa_b: 'Nome B' };
    const { getByLabelText, queryByLabelText } = render(<Harness />);
    expect(getByLabelText('chip Para Nome B')).toBeTruthy();
    expect(queryByLabelText('chip Para Nome A')).toBeNull();
  });

  it('inverte quando pessoa_b esta ativa (rotula pessoa_a)', () => {
    mockPessoaAtiva = 'pessoa_b';
    mockNomes = { pessoa_a: 'Nome A', pessoa_b: 'Nome B' };
    const { getByLabelText, queryByLabelText } = render(<Harness />);
    expect(getByLabelText('chip Para Nome A')).toBeTruthy();
    expect(queryByLabelText('chip Para Nome B')).toBeNull();
  });

  it('retorna null em modo sozinho (campo invisivel)', () => {
    mockTipoCompanhia = 'sozinho';
    const { queryByLabelText } = render(<Harness />);
    expect(queryByLabelText('chip Para mim')).toBeNull();
    expect(queryByLabelText('chip Para Pessoa B')).toBeNull();
    expect(queryByLabelText('chip Para o casal')).toBeNull();
  });
});

describe('SeletorPara onChange', () => {
  it('emite {tipo:"mim"} quando chip Para mim e pressionado', () => {
    const spy = jest.fn();
    const { getByLabelText } = render(
      <Harness inicial={{ tipo: 'casal' }} onChangeSpy={spy} />
    );
    fireEvent.press(getByLabelText('chip Para mim'));
    expect(spy).toHaveBeenCalledWith({ tipo: 'mim' });
  });

  it('emite {tipo:"outra", pessoa:"pessoa_b"} ao pressionar chip do parceiro', () => {
    const spy = jest.fn();
    const { getByLabelText } = render(<Harness onChangeSpy={spy} />);
    fireEvent.press(getByLabelText('chip Para Pessoa B'));
    expect(spy).toHaveBeenCalledWith({ tipo: 'outra', pessoa: 'pessoa_b' });
  });

  it('emite {tipo:"outra", pessoa:"pessoa_a"} quando pessoa_b esta ativa', () => {
    mockPessoaAtiva = 'pessoa_b';
    const spy = jest.fn();
    const { getByLabelText } = render(<Harness onChangeSpy={spy} />);
    fireEvent.press(getByLabelText('chip Para Pessoa A'));
    expect(spy).toHaveBeenCalledWith({ tipo: 'outra', pessoa: 'pessoa_a' });
  });

  it('emite {tipo:"casal"} quando chip Para o casal e pressionado', () => {
    const spy = jest.fn();
    const { getByLabelText } = render(<Harness onChangeSpy={spy} />);
    fireEvent.press(getByLabelText('chip Para o casal'));
    expect(spy).toHaveBeenCalledWith({ tipo: 'casal' });
  });

  it('mantem coerencia entre value controlado e chip selecionado', () => {
    const { getByLabelText } = render(
      <Harness inicial={{ tipo: 'outra', pessoa: 'pessoa_b' }} />
    );
    // Estado inicial: chip Para Pessoa B selecionado.
    const chipParceiro = getByLabelText('chip Para Pessoa B');
    expect(chipParceiro.props.accessibilityState.selected).toBe(true);
  });
});

describe('SeletorPara desempate disabled', () => {
  it('aceita prop disabled e propaga para os chips', () => {
    const spy = jest.fn();
    const { getByLabelText } = render(
      <SeletorPara value={{ tipo: 'mim' }} onChange={spy} disabled />
    );
    const chipCasal = getByLabelText('chip Para o casal');
    fireEvent.press(chipCasal);
    expect(spy).not.toHaveBeenCalled();
  });
});
