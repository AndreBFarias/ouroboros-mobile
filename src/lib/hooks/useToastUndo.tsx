// Host do toast "Desfazer" padrao Material Design (R-HOME-3, reancorado
// em R-HOME-5).
//
// Uso:
//   // nas secoes que disparam o toast (sem prop-drilling, R-HOME-4a):
//   const mostrarUndo = useToastUndoStore((s) => s.mostrarUndo);
//   mostrarUndo('Tarefa concluida', () => reverter(), 5000);
//
//   // uma unica vez, no root da Tela Hoje, FORA do ScrollView:
//   <UndoOverlayHost />
//
// Comportamento:
//   - Mostra toast bottom 80dp com label + botao Desfazer.
//   - Timeout default 5000ms; ao expirar, oculta sem chamar onUndo.
//   - Tap em Desfazer: chama onUndo + oculta imediatamente.
//   - Spring de entrada (snappy), timing de saida 180ms (ADR-010).
//   - Chamadas consecutivas substituem o toast anterior (sem fila).
//
// R-HOME-5 (bug B4): antes cada secao montava seu proprio <UndoOverlay/>
// dentro do card, no meio do ScrollView e sem zIndex -- o balao ficava
// atras dos cards seguintes e rolava com o feed. Agora o estado vive na
// store (src/lib/stores/toastUndo.ts) e um unico <UndoOverlayHost/> e
// montado no root da tela, fora do ScrollView, com zIndex + elevation
// acima do feed e ancorado ao rodape da TELA (nao da caixa do feed).
//
// Comentarios sem acento (convencao shell/CI).
import { type ReactElement } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme/tokens';
import { useToastUndoStore } from '@/lib/stores/toastUndo';

const TOAST_BOTTOM_OFFSET = 80;

// Overlay em nivel de tela: renderizar UMA vez no root do Screen, como
// irmao DEPOIS do ScrollView. Le o toast atual da store; retorna null
// quando idle. Ancorado ao rodape da tela (position absolute + bottom),
// acima do feed via zIndex (web/iOS) + elevation (Android/Fabric).
export function UndoOverlayHost(): ReactElement | null {
  const atual = useToastUndoStore((s) => s.atual);
  const executarUndo = useToastUndoStore((s) => s.executarUndo);

  if (!atual) return null;

  const handleUndo = () => {
    haptics.light();
    executarUndo();
  };

  return (
    <Animated.View
      key={atual.id}
      entering={SlideInDown.springify().damping(20).stiffness(250)}
      exiting={SlideOutDown.duration(180)}
      accessibilityRole="alert"
      accessibilityLabel={`toast undo ${atual.mensagem}`}
      style={{
        position: 'absolute',
        bottom: TOAST_BOTTOM_OFFSET,
        left: spacing.lg,
        right: spacing.lg,
        backgroundColor: colors.bgElev,
        borderLeftWidth: 3,
        borderLeftColor: colors.cyan,
        borderRadius: radius.toast,
        paddingVertical: spacing.base,
        paddingHorizontal: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        // R-HOME-5 / INTEGRATION-CONTRACT §7.10: camada 15 do toast-undo,
        // acima dos FABs (10/11) e abaixo do Drawer (20). zIndex ordena em
        // web/iOS; elevation e obrigatorio no Android (Fabric), onde a
        // ordem entre irmaos segue elevation, nao a ordem da arvore -- sem
        // ele o balao ficava atras dos cards do feed (bug B4).
        zIndex: 15,
        elevation: 15,
      }}
    >
      <Text
        style={{
          flex: 1,
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
          lineHeight: 22,
        }}
        numberOfLines={2}
      >
        {atual.mensagem}
      </Text>
      <Pressable
        onPress={handleUndo}
        accessibilityRole="button"
        accessibilityLabel="desfazer"
        hitSlop={12}
        style={({ pressed }) => ({
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.chip,
          backgroundColor: pressed
            ? 'rgba(139,233,253,0.22)'
            : 'rgba(139,233,253,0.12)',
        })}
      >
        <Text
          style={{
            color: colors.cyan,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          Desfazer
        </Text>
      </Pressable>
    </Animated.View>
  );
}
