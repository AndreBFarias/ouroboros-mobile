// Testes do SheetNovaTarefa (M17 + M31). Cobre render do header,
// modos criar/editar, dispatch de onSalvar com payload completo
// (titulo + categoria + destino + alarme), e estados expansiveis
// dos campos M31.
//
// Mock inline de @gorhom/bottom-sheet: jest.setup.cjs ja cobre os
// simbolos canonicos (BottomSheet default, BottomSheetView,
// BottomSheetBackdrop), mas nao expoe BottomSheetTextInput. Aqui
// adicionamos o mock especifico.
//
// DateTimePicker mockado para no-op (renderiza null) - testes nao
// precisam interagir com picker nativo.
//
// Comentarios sem acento (convencao shell/CI).
jest.mock('@gorhom/bottom-sheet', () => {
  const ReactInner = require('react');
  const RNInner = require('react-native');
  return {
    __esModule: true,
    BottomSheetView: ({ children, ...rest }: Record<string, unknown>) =>
      ReactInner.createElement(RNInner.View, rest, children as unknown),
    BottomSheetTextInput: (props: Record<string, unknown>) =>
      ReactInner.createElement(RNInner.TextInput, props),
    BottomSheetBackdrop: (props: Record<string, unknown>) =>
      ReactInner.createElement(RNInner.View, props),
    default: ReactInner.forwardRef(
      (
        props: { children: unknown },
        ref: unknown
      ) => {
        ReactInner.useImperativeHandle(ref, () => ({
          expand: () => undefined,
          close: () => undefined,
          snapToIndex: () => undefined,
        }));
        return ReactInner.createElement(RNInner.View, null, props.children);
      }
    ),
  };
});

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
}));

import { render, fireEvent } from '@testing-library/react-native';
import {
  SheetNovaTarefa,
  CATEGORIA_ACCENTS,
  corDaCategoria,
} from '@/components/todo/SheetNovaTarefa';
import { colors } from '@/theme/tokens';
import { TAREFA_CATEGORIAS } from '@/lib/schemas/tarefa';

describe('SheetNovaTarefa', () => {
  it('renderiza header "Nova tarefa" no modo criar', () => {
    const { getByText } = render(
      <SheetNovaTarefa
        onSalvar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    expect(getByText('Nova tarefa')).toBeTruthy();
  });

  it('renderiza header "Editar tarefa" no modo editar', () => {
    const { getByText } = render(
      <SheetNovaTarefa
        modo="editar"
        tituloInicial="Comprar pão"
        onSalvar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    expect(getByText('Editar tarefa')).toBeTruthy();
  });

  it('inicia campo com tituloInicial', () => {
    const { getByLabelText } = render(
      <SheetNovaTarefa
        modo="editar"
        tituloInicial="Comprar pão"
        onSalvar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    const input = getByLabelText('campo titulo da tarefa');
    expect(input.props.value).toBe('Comprar pão');
  });

  it('dispara onSalvar com payload contendo titulo trim e defaults M31', () => {
    const onSalvar = jest.fn();
    const { getByLabelText, getByText } = render(
      <SheetNovaTarefa
        onSalvar={onSalvar}
        onCancelar={() => undefined}
      />
    );
    const input = getByLabelText('campo titulo da tarefa');
    fireEvent.changeText(input, '  Comprar leite  ');
    fireEvent.press(getByText('Salvar'));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Comprar leite',
        categoria: 'outro',
        pessoa_destino: { tipo: 'mim' },
        alarme: null,
      })
    );
  });

  it('botao Salvar disabled quando titulo vazio', () => {
    const onSalvar = jest.fn();
    const { getByLabelText } = render(
      <SheetNovaTarefa
        onSalvar={onSalvar}
        onCancelar={() => undefined}
      />
    );
    fireEvent.press(getByLabelText('Salvar'));
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('dispara onCancelar no botao Cancelar', () => {
    const onCancelar = jest.fn();
    const { getByText } = render(
      <SheetNovaTarefa
        onSalvar={() => undefined}
        onCancelar={onCancelar}
      />
    );
    fireEvent.press(getByText('Cancelar'));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('label do botao primario muda em modo editar', () => {
    const { getByText } = render(
      <SheetNovaTarefa
        modo="editar"
        tituloInicial="x"
        onSalvar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    expect(getByText('Atualizar')).toBeTruthy();
  });
});

describe('SheetNovaTarefa - M31 categoria', () => {
  it('renderiza chips de todas as 8 categorias canonicas', () => {
    const { getByLabelText } = render(
      <SheetNovaTarefa
        onSalvar={() => undefined}
        onCancelar={() => undefined}
      />
    );
    // Labels com acentuacao PT-BR (sentence case).
    expect(getByLabelText('chip Trabalho')).toBeTruthy();
    expect(getByLabelText('chip Casa')).toBeTruthy();
    expect(getByLabelText('chip Rotina')).toBeTruthy();
    expect(getByLabelText('chip Finanças')).toBeTruthy();
    expect(getByLabelText('chip Desenvolvimento pessoal')).toBeTruthy();
    expect(getByLabelText('chip Obrigações')).toBeTruthy();
    expect(getByLabelText('chip Saúde')).toBeTruthy();
    expect(getByLabelText('chip Outro')).toBeTruthy();
  });

  it('dispara onSalvar com categoria selecionada via chip', () => {
    const onSalvar = jest.fn();
    const { getByLabelText, getByText } = render(
      <SheetNovaTarefa
        onSalvar={onSalvar}
        onCancelar={() => undefined}
      />
    );
    fireEvent.changeText(getByLabelText('campo titulo da tarefa'), 'Reunião');
    fireEvent.press(getByLabelText('chip Trabalho'));
    fireEvent.press(getByText('Salvar'));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        titulo: 'Reunião',
        categoria: 'trabalho',
      })
    );
  });

  it('inicia categoria com categoriaInicial em modo editar', () => {
    const onSalvar = jest.fn();
    const { getByLabelText, getByText } = render(
      <SheetNovaTarefa
        modo="editar"
        tituloInicial="x"
        categoriaInicial="saude"
        onSalvar={onSalvar}
        onCancelar={() => undefined}
      />
    );
    fireEvent.press(getByText('Atualizar'));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ categoria: 'saude' })
    );
  });
});

describe('SheetNovaTarefa - M-DEBITO-CATEGORIA-CORES', () => {
  it('cobre todas as 8 categorias canonicas no mapping de accents', () => {
    for (const cat of TAREFA_CATEGORIAS) {
      expect(CATEGORIA_ACCENTS[cat]).toBeDefined();
    }
  });

  it('atribui cor semantica distinta a cada categoria (sem todas iguais)', () => {
    const accents = TAREFA_CATEGORIAS.map((c) => CATEGORIA_ACCENTS[c]);
    const unicos = new Set(accents);
    // 8 categorias devem ter pelo menos 7 cores distintas (orange e ghost
    // sao reservadas a obrigacoes e outro respectivamente; demais sao
    // todas distintas). Antes do fix: todas 'orange' (1 unico).
    expect(unicos.size).toBeGreaterThanOrEqual(7);
  });

  it('outro mantem accent ghost (neutro generico, M-DEBITO-UI-UX-SEED-DUO)', () => {
    expect(CATEGORIA_ACCENTS.outro).toBe('ghost');
  });

  it('mapeamento canonico semantico Dracula', () => {
    expect(CATEGORIA_ACCENTS).toEqual({
      trabalho: 'cyan',
      casa: 'pink',
      rotina: 'purple',
      financas: 'green',
      desenvolvimento_pessoal: 'yellow',
      obrigacoes: 'orange',
      saude: 'red',
      outro: 'ghost',
    });
  });
});

describe('SheetNovaTarefa - M31 alarme toggle', () => {
  it('alarme default desligado, payload com alarme null', () => {
    const onSalvar = jest.fn();
    const { getByLabelText, getByText } = render(
      <SheetNovaTarefa
        onSalvar={onSalvar}
        onCancelar={() => undefined}
      />
    );
    fireEvent.changeText(getByLabelText('campo titulo da tarefa'), 'X');
    fireEvent.press(getByText('Salvar'));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ alarme: null })
    );
  });

  it('toggle alarme ligado expoe seletor de data e payload com alarme ativo', () => {
    const onSalvar = jest.fn();
    const { getByLabelText, getByText } = render(
      <SheetNovaTarefa
        onSalvar={onSalvar}
        onCancelar={() => undefined}
      />
    );
    fireEvent.changeText(getByLabelText('campo titulo da tarefa'), 'X');
    // Toggle "Lembrar com alarme" - implementacao usa Pressable interno;
    // em testes basta press().
    fireEvent.press(getByLabelText('alternar lembrete com alarme'));
    fireEvent.press(getByText('Salvar'));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        alarme: expect.objectContaining({
          ativo: true,
          recorrencia: 'unica',
        }),
      })
    );
  });
});

describe('SheetNovaTarefa - M31 destino', () => {
  it('destino default "mim" no payload', () => {
    const onSalvar = jest.fn();
    const { getByLabelText, getByText } = render(
      <SheetNovaTarefa
        onSalvar={onSalvar}
        onCancelar={() => undefined}
      />
    );
    fireEvent.changeText(getByLabelText('campo titulo da tarefa'), 'X');
    fireEvent.press(getByText('Salvar'));
    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({ pessoa_destino: { tipo: 'mim' } })
    );
  });
});

describe('SheetNovaTarefa - M-DEBITO-CATEGORIA-ICONE', () => {
  // Helper puro corDaCategoria deve refletir CATEGORIA_ACCENTS
  // (paleta Dracula) e tratar 'ghost' como muted. Antes do fix:
  // SheetNovaTarefa renderizava color={colors.orange} hardcoded em
  // duas posicoes (header + IconeCategoriaAtiva). Depois do fix:
  // ambos usam corDaCategoria(categoria).
  it('trabalho resolve cyan', () => {
    expect(corDaCategoria('trabalho')).toBe(colors.cyan);
  });

  it('saude resolve red (critico, alerta)', () => {
    expect(corDaCategoria('saude')).toBe(colors.red);
  });

  it('outro (ghost) resolve muted, nao tem cor accent semantica', () => {
    expect(corDaCategoria('outro')).toBe(colors.muted);
    // Garantia explicita: nunca laranja (regressao do bug pre-fix).
    expect(corDaCategoria('outro')).not.toBe(colors.orange);
  });

  it('cobre todas as 8 categorias canonicas com cor resolvida nao vazia', () => {
    for (const cat of TAREFA_CATEGORIAS) {
      const cor = corDaCategoria(cat);
      expect(typeof cor).toBe('string');
      expect(cor.length).toBeGreaterThan(0);
    }
  });

  it('mapeamento canonico Dracula completo (3 cores aleatoriamente checadas)', () => {
    expect(corDaCategoria('casa')).toBe(colors.pink);
    expect(corDaCategoria('financas')).toBe(colors.green);
    expect(corDaCategoria('obrigacoes')).toBe(colors.orange);
  });

  it('regressao: trabalho/saude/outro nao usam mais colors.orange hardcoded', () => {
    expect(corDaCategoria('trabalho')).not.toBe(colors.orange);
    expect(corDaCategoria('saude')).not.toBe(colors.orange);
    expect(corDaCategoria('outro')).not.toBe(colors.orange);
  });
});
