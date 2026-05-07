// FAB principal global (M27). Substitui a bottom bar e o FABRadial
// como ponto unico de entrada para navegacao. Renderizado pelo
// _layout raiz no canto inferior esquerdo (decisao explicita: nao
// competir com o FAB radial historico que vivia a direita).
//
// Comportamento:
//   - Tap dispara haptic light + abre o MenuLateral via useNavegacao.
//   - Esconde automaticamente em rotas modais (rotaEsconderFAB).
//   - M34.1.1: tambem se desmonta quando sheetCapturaAberto=true
//     (MenuCapturaVerde ou SheetFrase abertos). z-index isolado (=10)
//     nao bastava porque os sheets vivem dentro do <Stack> enquanto o
//     FAB e' irmao no _layout raiz; CSS compara stacking contexts no
//     ancestor comum e o FAB vencia. Solucao: sair do DOM quando
//     captura ativa.
//   - z-index 10 (CONTRACT secao 7.10).
//
// Strings visiveis em PT-BR sentence case com acentuacao; a11y sem
// acento. Comentarios sem acento (convencao shell/CI).
import { Pressable, View } from 'react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu } from '@/lib/icons';
import { usePathname } from 'expo-router';
import { useState } from 'react';
import { colors, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { useNavegacao } from '@/lib/stores/navegacao';
import { rotaEsconderFAB } from '@/lib/navigation/rotasSemFAB';
import { useSafeBottomMargin } from './safeBottom';

const FAB_SIZE = 72;

export function FABMenu() {
  const pathname = usePathname();
  const abrir = useNavegacao((s) => s.abrir);
  const sheetCapturaAberto = useNavegacao((s) => s.sheetCapturaAberto);
  const insets = useSafeAreaInsets();
  // K4 (M-FAB-MENU-SAFE-BOTTOM, 2026-05-07): margem canonica = max(24dp,
  // 10% da altura) + inset.bottom. Evita overlap com nav bar Android
  // (3-button) e com a barra de gestos. Hook fica antes dos returns
  // condicionais (regra de hooks).
  const marginBottomCanonico = useSafeBottomMargin(insets.bottom);
  const [pressed, setPressed] = useState(false);

  if (rotaEsconderFAB(pathname)) return null;
  if (sheetCapturaAberto) return null;

  const handlePress = () => {
    haptics.light();
    abrir();
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 10,
      }}
    >
      <MotiView
        from={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: pressed ? 0.94 : 1, opacity: 1 }}
        transition={springs.snappy}
        style={{
          position: 'absolute',
          left: spacing.lg,
          bottom: marginBottomCanonico,
        }}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          accessibilityRole="button"
          accessibilityLabel="abrir menu lateral"
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: FAB_SIZE / 2,
            backgroundColor: colors.purple,
            alignItems: 'center',
            justifyContent: 'center',
            // Sombra suave (Android elevation; iOS shadow*).
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
          }}
        >
          <Menu size={28} color={colors.bg} strokeWidth={1.8} />
        </Pressable>
      </MotiView>
    </View>
  );
}
