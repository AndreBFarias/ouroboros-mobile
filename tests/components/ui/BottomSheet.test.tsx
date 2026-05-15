import { createRef } from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { BottomSheet, type BottomSheetRef } from '@/components/ui';

describe('BottomSheet', () => {
  it('renderiza fechado por default e expoe ref com expand/close', () => {
    const ref = createRef<BottomSheetRef>();
    const { getByLabelText, getByText } = render(
      <BottomSheet ref={ref}>
        <Text>conteudo do sheet</Text>
      </BottomSheet>
    );
    expect(getByLabelText('bottom-sheet-mock')).toBeTruthy();
    expect(getByText('conteudo do sheet')).toBeTruthy();
    expect(ref.current).not.toBeNull();
    // ref deve oferecer api imperativa
    expect(typeof ref.current?.expand).toBe('function');
    expect(typeof ref.current?.close).toBe('function');
  });

  it('aceita snapPoints custom sem quebrar render', () => {
    const { getByText } = render(
      <BottomSheet snapPoints={['25%', '50%', '90%']}>
        <Text>multiplos snaps</Text>
      </BottomSheet>
    );
    expect(getByText('multiplos snaps')).toBeTruthy();
  });

  // M34.1: o wrapper precisa propagar containerStyle com zIndex 100
  // por default para que sheets fiquem acima do FABMenu (z=10) e
  // MenuLateral (z=20). Sem isso, o botao Cancelar no rodape do
  // SheetFrase ficava coberto pelo FAB roxo na tab Memorias.
  it('aplica zIndex 100 default no containerStyle', () => {
    const { getByLabelText } = render(
      <BottomSheet>
        <Text>conteudo padrao</Text>
      </BottomSheet>
    );
    const root = getByLabelText('bottom-sheet-mock');
    // Mock reflete containerStyle em props.style. Default = objeto
    // unico { zIndex: 100 }, sem array de merge.
    expect(root.props.style).toEqual({ zIndex: 100 });
  });

  it('permite override do containerStyle preservando zIndex base', () => {
    const { getByLabelText } = render(
      <BottomSheet containerStyle={{ paddingTop: 8 }}>
        <Text>com override</Text>
      </BottomSheet>
    );
    const root = getByLabelText('bottom-sheet-mock');
    // Override vira array [default, custom]: a ordem garante que
    // consumidor tambem possa sobrescrever zIndex se quiser.
    expect(Array.isArray(root.props.style)).toBe(true);
    expect(root.props.style).toEqual([{ zIndex: 100 }, { paddingTop: 8 }]);
  });
});
