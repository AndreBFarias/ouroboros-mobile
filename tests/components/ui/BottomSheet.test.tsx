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
});
