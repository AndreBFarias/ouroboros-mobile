// Wrapper sobre @gorhom/bottom-sheet com tema Dracula aplicado.
// Background bg-alt, handle indicator bg-elev, backdrop fade ate
// opacity 0.5. Snap points configuraveis. Gesture nativo de fechar
// arrastando para baixo ja esta embutido na lib. Accept ref via
// forwardRef para o consumidor chamar `.expand()` ou `.close()`.
import {
  forwardRef,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  type BottomSheetProps as GorhomProps,
} from '@gorhom/bottom-sheet';
import { colors, radius } from '@/theme/tokens';

export interface BottomSheetProps {
  snapPoints?: Array<string | number>;
  index?: number;
  onChange?: (index: number) => void;
  children: ReactNode;
  enablePanDownToClose?: boolean;
}

export type BottomSheetRef = GorhomBottomSheet;

const DEFAULT_SNAP_POINTS: Array<string | number> = ['40%', '85%'];

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  function BottomSheet(
    {
      snapPoints,
      index = -1,
      onChange,
      children,
      enablePanDownToClose = true,
    },
    ref
  ) {
    const points = useMemo<Array<string | number>>(
      () => snapPoints ?? DEFAULT_SNAP_POINTS,
      [snapPoints]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.5}
          pressBehavior="close"
        />
      ),
      []
    );

    const handleChange = useCallback<NonNullable<GorhomProps['onChange']>>(
      (next) => {
        onChange?.(next);
      },
      [onChange]
    );

    return (
      <GorhomBottomSheet
        ref={ref}
        index={index}
        snapPoints={points}
        onChange={handleChange}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.bgAlt,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.bgElev,
          width: 40,
          height: 4,
        }}
      >
        {children}
      </GorhomBottomSheet>
    );
  }
);
