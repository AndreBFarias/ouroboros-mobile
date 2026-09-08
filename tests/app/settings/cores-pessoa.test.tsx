// P7 (2026-09-08) — tela /settings/cores-pessoa.
//
// Esta suite mede tres coisas que a decisao do dono pediu nominalmente:
//
//  1. A troca acontece de verdade (a cor sai da tela e chega ao store).
//  2. A interface RECUSA cor que reprove no contraste — e recusar aqui
//     significa nao guardar, nao apenas avisar.
//  3. O texto da recusa diz a razao obtida, a razao minima e o que
//     ficaria dificil de ler, sem culpar quem escolheu. "Cor invalida"
//     seco esta proibido por escrito.
//
// Mocks antes dos imports por causa do hoisting com nativewind (A12),
// mesmo padrao de tests/app/settings/credenciais.test.tsx.
//
// Comentarios sem acento (convencao shell/CI).

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  }),
  Redirect: () => null,
}));

// O widget nativo nao existe no Jest; mockar aqui deixa o empurrao
// observavel (a cor precisa chegar ao payload da tela inicial) sem
// arrastar vault, humor e heatmap para dentro de um teste de tela.
const mockAtualizarWidget = jest.fn(() => Promise.resolve());
jest.mock('@/lib/widget/atualizarWidgetHomescreen', () => ({
  __esModule: true,
  atualizarWidgetHomescreen: (...args: unknown[]) =>
    mockAtualizarWidget(...(args as [])),
}));

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CoresPessoaTela from '@/../app/settings/cores-pessoa';
import { ToastProvider } from '@/components/ui/Toast';
import { useSettings } from '@/lib/stores/settings';
import {
  useCoresPessoa,
  corPessoa,
  CORES_PESSOA_DEFAULT,
} from '@/lib/stores/coresPessoa';
import { avaliarCorPessoa, formatarRazao } from '@/lib/a11y/corPessoa';

// Cor escura o bastante para reprovar em qualquer uma das medidas.
const COR_ILEGIVEL = '#101014';

function renderTela() {
  return render(
    <ToastProvider>
      <CoresPessoaTela />
    </ToastProvider>
  );
}

beforeEach(() => {
  mockAtualizarWidget.mockClear();
  useCoresPessoa.setState({ cores: { ...CORES_PESSOA_DEFAULT } });
  useSettings.getState().resetar();
  useSettings.setState((s) => ({
    pessoa: { ...s.pessoa, tipoCompanhia: 'casal' },
  }));
});

describe('/settings/cores-pessoa — troca', () => {
  it('mostra um bloco por pessoa quando ha duas', () => {
    const { getByLabelText } = renderTela();
    expect(getByLabelText('bloco cor pessoa_a')).toBeTruthy();
    expect(getByLabelText('bloco cor pessoa_b')).toBeTruthy();
  });

  it('em modo sozinho, o bloco da segunda pessoa nao aparece', () => {
    useSettings.setState((s) => ({
      pessoa: { ...s.pessoa, tipoCompanhia: 'sozinho' },
    }));
    const { getByLabelText, queryByLabelText } = renderTela();
    expect(getByLabelText('bloco cor pessoa_a')).toBeTruthy();
    expect(queryByLabelText('bloco cor pessoa_b')).toBeNull();
  });

  it('escrever uma cor legivel e confirmar troca a cor em vigor', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo cor pessoa_a'), '#50fa7b');
    fireEvent.press(getByLabelText('usar cor pessoa_a'));

    expect(corPessoa('pessoa_a')).toBe('#50fa7b');
    await waitFor(() => {
      expect(getByLabelText('cor em vigor pessoa_a #50fa7b')).toBeTruthy();
    });
  });

  it('o atalho de cor sugerida troca sem passar pelo campo', () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('cor verde para pessoa_b'));
    expect(corPessoa('pessoa_b')).toBe('#50fa7b');
  });

  it('trocar uma pessoa nao mexe na cor da outra', () => {
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('cor amarelo para pessoa_a'));
    expect(corPessoa('pessoa_b')).toBe(CORES_PESSOA_DEFAULT.pessoa_b);
  });

  it('a cor nova chega ao widget da tela inicial', () => {
    // Sem este empurrao a tela inicial ficaria na cor antiga ate o
    // proximo registro de humor, e pareceria que a troca nao pegou.
    const { getByLabelText } = renderTela();
    fireEvent.press(getByLabelText('cor azul para pessoa_a'));
    expect(mockAtualizarWidget).toHaveBeenCalledWith({ forcar: true });
  });

  it('voltar ao padrao so aparece quando ha escolha propria, e desfaz', async () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    expect(queryByLabelText('voltar cor padrao pessoa_a')).toBeNull();

    fireEvent.press(getByLabelText('cor laranja para pessoa_a'));
    await waitFor(() => {
      expect(getByLabelText('voltar cor padrao pessoa_a')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('voltar cor padrao pessoa_a'));
    expect(corPessoa('pessoa_a')).toBe(CORES_PESSOA_DEFAULT.pessoa_a);
  });
});

describe('/settings/cores-pessoa — recusa de cor ilegivel', () => {
  it('recusar significa NAO guardar, e nao apenas avisar', () => {
    const { getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo cor pessoa_a'), COR_ILEGIVEL);
    fireEvent.press(getByLabelText('usar cor pessoa_a'));
    expect(corPessoa('pessoa_a')).toBe(CORES_PESSOA_DEFAULT.pessoa_a);
  });

  it('o aviso traz a razao obtida e a razao minima, com numero', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo cor pessoa_a'), COR_ILEGIVEL);
    fireEvent.press(getByLabelText('usar cor pessoa_a'));

    const av = avaliarCorPessoa(COR_ILEGIVEL);
    await waitFor(() => {
      const aviso = getByLabelText('aviso cor pessoa_a');
      const texto = String(aviso.props.children);
      expect(texto).toContain(formatarRazao(av.ratio));
      expect(texto).toContain(formatarRazao(av.minimo));
    });
  });

  it('o aviso diz o que ficaria dificil de ler e sugere um caminho', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo cor pessoa_a'), COR_ILEGIVEL);
    fireEvent.press(getByLabelText('usar cor pessoa_a'));

    await waitFor(() => {
      const texto = String(
        getByLabelText('aviso cor pessoa_a').props.children
      );
      expect(texto).toMatch(/difícil de (ler|enxergar)|sumiria/);
      expect(texto).toMatch(/mais clara/);
    });
  });

  it('valor que nem forma cor recebe explicacao de formato, nao numero', async () => {
    const { getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo cor pessoa_a'), 'roxo');
    fireEvent.press(getByLabelText('usar cor pessoa_a'));

    await waitFor(() => {
      const texto = String(
        getByLabelText('aviso cor pessoa_a').props.children
      );
      expect(texto).toContain('#bd93f9');
      expect(texto).not.toMatch(/para 1/);
    });
    expect(corPessoa('pessoa_a')).toBe(CORES_PESSOA_DEFAULT.pessoa_a);
  });

  it('o aviso some quando a pessoa recomeca a escrever', async () => {
    const { getByLabelText, queryByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo cor pessoa_a'), COR_ILEGIVEL);
    fireEvent.press(getByLabelText('usar cor pessoa_a'));
    await waitFor(() => {
      expect(getByLabelText('aviso cor pessoa_a')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('campo cor pessoa_a'), '#50fa7b');
    await waitFor(() => {
      expect(queryByLabelText('aviso cor pessoa_a')).toBeNull();
    });
  });

  it('a recusa nao chega ao widget: nada mudou para propagar', () => {
    const { getByLabelText } = renderTela();
    fireEvent.changeText(getByLabelText('campo cor pessoa_a'), COR_ILEGIVEL);
    fireEvent.press(getByLabelText('usar cor pessoa_a'));
    expect(mockAtualizarWidget).not.toHaveBeenCalled();
  });
});

describe('/settings/cores-pessoa — tom do texto', () => {
  // Regra de tom do projeto (ADR-0005) mais a instrucao explicita da
  // P7: ao recusar, explicar de forma util e sem culpar. A tela e o
  // aviso ficam sob a mesma regra.
  it('nao usa vocabulario de defeito nem exclamacao, nem apos recusar', async () => {
    const { getByLabelText, queryByText } = renderTela();
    fireEvent.changeText(getByLabelText('campo cor pessoa_a'), COR_ILEGIVEL);
    fireEvent.press(getByLabelText('usar cor pessoa_a'));
    await waitFor(() => {
      expect(getByLabelText('aviso cor pessoa_a')).toBeTruthy();
    });

    const proibidos: RegExp[] = [
      /\binválid/i,
      /\berro\b/i,
      /\bfalha/i,
      /\bproibid/i,
      /!/,
      /você errou/i,
      /parabéns/i,
    ];
    for (const padrao of proibidos) {
      expect(queryByText(padrao)).toBeNull();
    }
  });

  it('explica por que algumas cores nao entram, antes de a pessoa tentar', () => {
    const { getByText } = renderTela();
    expect(getByText(/fundo do aplicativo é escuro/i)).toBeTruthy();
    expect(getByText(/a troca não é guardada/i)).toBeTruthy();
  });

  it('diz que a escolha nao mexe nos registros ja gravados', () => {
    // Medo legitimo de quem troca a cor de identidade: perder ou
    // reescrever o que ja esta no Vault.
    const { getByText } = renderTela();
    expect(getByText(/não muda os registros já\s+gravados/i)).toBeTruthy();
  });
});
