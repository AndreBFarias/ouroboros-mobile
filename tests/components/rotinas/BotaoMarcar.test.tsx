// Testes do BotaoMarcar (R-SF-3). Cobre:
//  - render com accessibilityRole=button + accessibilityState.checked.
//  - dispara onPress no tap.
//  - render diferenciado entre marcado=true/false (check icon visivel
//    so em marcado=true).
//  - aceita prop haptic=false para suprimir vibracao em tests.
//
// Mocks: lib/icons.Check (estatico, sem precisar de SVG runtime),
// lib/haptics (no-op pra nao tocar API nativa em jsdom).
//
// Comentarios sem acento (convencao shell/CI).
import { fireEvent, render } from '@testing-library/react-native';
import { BotaoMarcar } from '@/components/rotinas/BotaoMarcar';

jest.mock('@/lib/haptics', () => ({
  __esModule: true,
  haptics: {
    light: jest.fn(() => Promise.resolve()),
  },
}));

describe('BotaoMarcar', () => {
  it('renderiza com accessibilityRole=button e label', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <BotaoMarcar
        marcado={false}
        onPress={onPress}
        accessibilityLabel="marcar rotina venvanse"
        haptic={false}
      />
    );
    const el = getByLabelText('marcar rotina venvanse');
    expect(el.props.accessibilityRole).toBe('button');
    expect(el.props.accessibilityState).toMatchObject({ checked: false });
  });

  it('reflete marcado=true em accessibilityState.checked', () => {
    const { getByLabelText } = render(
      <BotaoMarcar
        marcado={true}
        onPress={jest.fn()}
        accessibilityLabel="marcar rotina venvanse"
        haptic={false}
      />
    );
    const el = getByLabelText('marcar rotina venvanse');
    expect(el.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('dispara onPress no tap', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(
      <BotaoMarcar
        marcado={false}
        onPress={onPress}
        accessibilityLabel="marcar rotina venvanse"
        haptic={false}
      />
    );
    fireEvent.press(getByLabelText('marcar rotina venvanse'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('dispara haptic.light quando haptic=true (default)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { haptics } = require('@/lib/haptics') as {
      haptics: { light: jest.Mock };
    };
    haptics.light.mockClear();
    const { getByLabelText } = render(
      <BotaoMarcar
        marcado={false}
        onPress={jest.fn()}
        accessibilityLabel="marcar rotina venvanse"
      />
    );
    fireEvent.press(getByLabelText('marcar rotina venvanse'));
    expect(haptics.light).toHaveBeenCalledTimes(1);
  });

  it('NAO dispara haptic.light quando haptic=false', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { haptics } = require('@/lib/haptics') as {
      haptics: { light: jest.Mock };
    };
    haptics.light.mockClear();
    const { getByLabelText } = render(
      <BotaoMarcar
        marcado={false}
        onPress={jest.fn()}
        accessibilityLabel="marcar rotina venvanse"
        haptic={false}
      />
    );
    fireEvent.press(getByLabelText('marcar rotina venvanse'));
    expect(haptics.light).not.toHaveBeenCalled();
  });

  it('aplica hitSlop 16 (area de toque expandida)', () => {
    const { getByLabelText } = render(
      <BotaoMarcar
        marcado={false}
        onPress={jest.fn()}
        accessibilityLabel="marcar rotina venvanse"
        haptic={false}
      />
    );
    const el = getByLabelText('marcar rotina venvanse');
    expect(el.props.hitSlop).toBe(16);
  });

  it('aplica dimensao 32x32 com borderRadius 16', () => {
    const { getByLabelText } = render(
      <BotaoMarcar
        marcado={false}
        onPress={jest.fn()}
        accessibilityLabel="marcar rotina venvanse"
        haptic={false}
      />
    );
    const el = getByLabelText('marcar rotina venvanse');
    expect(el.props.style).toMatchObject({
      width: 32,
      height: 32,
      borderRadius: 16,
    });
  });
});
