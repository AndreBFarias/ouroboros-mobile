// Testes do SheetNovoEvento (M37.2). Cobre render do header, validacao
// (titulo obrigatorio bloqueia o botao Criar), dispatch de onSalvar com
// payload (titulo trim + inicioIso/fimIso no formato canonico + para),
// campos opcionais (local/descricao), cancelar e reset via resetKey.
//
// Mock de @gorhom/bottom-sheet e @react-native-community/datetimepicker
// igual ao SheetNovaTarefa.test.tsx (jest.setup.cjs nao expoe
// BottomSheetTextInput).
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
      (props: { children: unknown }, ref: unknown) => {
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
  SheetNovoEvento,
  TIMEZONE_PADRAO,
} from '@/components/agenda/SheetNovoEvento';

const ISO_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-03:00$/;

describe('SheetNovoEvento', () => {
  it('renderiza header "Novo evento"', () => {
    const { getByText } = render(
      <SheetNovoEvento onSalvar={() => undefined} onCancelar={() => undefined} />
    );
    expect(getByText('Novo evento')).toBeTruthy();
  });

  it('botao Criar bloqueado quando titulo vazio', () => {
    const onSalvar = jest.fn();
    const { getByLabelText } = render(
      <SheetNovoEvento onSalvar={onSalvar} onCancelar={() => undefined} />
    );
    fireEvent.press(getByLabelText('criar evento'));
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('dispara onSalvar com titulo trim + ISO canonico + para mim', () => {
    const onSalvar = jest.fn();
    const { getByLabelText } = render(
      <SheetNovoEvento onSalvar={onSalvar} onCancelar={() => undefined} />
    );
    fireEvent.changeText(
      getByLabelText('campo titulo do evento'),
      '  Reunião de equipe  '
    );
    fireEvent.press(getByLabelText('criar evento'));
    expect(onSalvar).toHaveBeenCalledTimes(1);
    const payload = onSalvar.mock.calls[0][0];
    expect(payload.titulo).toBe('Reunião de equipe');
    expect(payload.para).toEqual({ tipo: 'mim' });
    expect(payload.inicioIso).toMatch(ISO_LOCAL);
    expect(payload.fimIso).toMatch(ISO_LOCAL);
    // Fim sempre depois do inicio (a duracao default e positiva).
    expect(payload.fimIso > payload.inicioIso).toBe(true);
    // Campos opcionais ausentes quando vazios.
    expect(payload.local).toBeUndefined();
    expect(payload.descricao).toBeUndefined();
  });

  it('inclui local e descricao no payload quando preenchidos', () => {
    const onSalvar = jest.fn();
    const { getByLabelText } = render(
      <SheetNovoEvento onSalvar={onSalvar} onCancelar={() => undefined} />
    );
    fireEvent.changeText(getByLabelText('campo titulo do evento'), 'Consulta');
    fireEvent.changeText(
      getByLabelText('campo local do evento'),
      '  Clínica central  '
    );
    fireEvent.changeText(
      getByLabelText('campo descricao do evento'),
      'Levar exames'
    );
    fireEvent.press(getByLabelText('criar evento'));
    const payload = onSalvar.mock.calls[0][0];
    expect(payload.local).toBe('Clínica central');
    expect(payload.descricao).toBe('Levar exames');
  });

  it('dispara onCancelar no botao Cancelar', () => {
    const onCancelar = jest.fn();
    const { getByLabelText } = render(
      <SheetNovoEvento onSalvar={() => undefined} onCancelar={onCancelar} />
    );
    fireEvent.press(getByLabelText('cancelar novo evento'));
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('nao dispara onSalvar quando salvando=true', () => {
    const onSalvar = jest.fn();
    const { getByLabelText } = render(
      <SheetNovoEvento
        onSalvar={onSalvar}
        onCancelar={() => undefined}
        salvando
      />
    );
    fireEvent.changeText(getByLabelText('campo titulo do evento'), 'X');
    fireEvent.press(getByLabelText('criar evento'));
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('resetKey limpa o titulo (Criar volta a bloquear)', () => {
    const onSalvar = jest.fn();
    const { getByLabelText, rerender } = render(
      <SheetNovoEvento
        onSalvar={onSalvar}
        onCancelar={() => undefined}
        resetKey={0}
      />
    );
    fireEvent.changeText(getByLabelText('campo titulo do evento'), 'Rascunho');
    // Novo resetKey reseta o form aos defaults.
    rerender(
      <SheetNovoEvento
        onSalvar={onSalvar}
        onCancelar={() => undefined}
        resetKey={1}
      />
    );
    expect(getByLabelText('campo titulo do evento').props.value).toBe('');
    fireEvent.press(getByLabelText('criar evento'));
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('exporta a timezone canonica America/Sao_Paulo', () => {
    expect(TIMEZONE_PADRAO).toBe('America/Sao_Paulo');
  });
});
