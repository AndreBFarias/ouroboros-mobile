// Sprint M-CAPTURA-UNIFICADA. Sheet 60% que ramifica o item "Camera"
// do MenuLateral em duas decisoes:
//   - Registrar momento (Foto/Musica/Video/Frase em Memorias).
//   - Escanear documento (nota fiscal, comprovante via Scanner M09).
//
// Renderizado pela rota raiz transparentModal app/captura.tsx (padrao
// M26 z-index, Armadilha A18 mitigada com Screen opaco por tras).
//
// Decisao de UI:
//   - 2 cards verticais grandes (area de toque >=64dp), sem cor de
//     festa, sem badge "novo" (ADR-010 estetica).
//   - Sheet abre com index={0} direto (Armadilhas A17/A18).
//   - Cores discretas: ImagePlus em green; ScanLine em cyan. Reusa
//     paleta Dracula sem chamar a atencao alem do necessario.
//   - Subtitulo curto explicando o que cada ramo faz, evitando que o
//     usuario precise tentar para descobrir.
//
// Strings PT-BR sentence case com acentuacao; a11y sem acento.
// Comentarios sem acento (convencao shell/CI).
import { type ComponentType, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { ImagePlus, ScanLine, type LucideProps } from '@/lib/icons';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';

export interface SheetEscolhaCapturaProps {
  // Disparado quando o usuario escolhe "Registrar momento". O caller
  // (app/captura.tsx) e' responsavel por dismissar a rota e navegar
  // para /saude-fisica?abrirCaptura=1 (sprint L1 renomeou /memoria).
  onRegistrarMomento: () => void;
  // Disparado quando o usuario escolhe "Escanear documento". O caller
  // dismissa e navega para /scanner.
  onEscanearDocumento: () => void;
}

interface OpcaoCapturaProps {
  Icon: ComponentType<LucideProps>;
  cor: string;
  titulo: string;
  subtitulo: string;
  a11yLabel: string;
  onPress: () => void;
}

// Card grande com icone redondo a esquerda, titulo + subtitulo a
// direita. Area de toque generosa (minHeight 88dp), padding lateral
// 20dp (ADR-010 spacing). Sem borda colorida; o tint do icone ja
// transmite a categoria.
function OpcaoCaptura({
  Icon,
  cor,
  titulo,
  subtitulo,
  a11yLabel,
  onPress,
}: OpcaoCapturaProps): ReactNode {
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        backgroundColor: colors.bgPage,
        borderRadius: radius.card,
        minHeight: 88,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={28} color={cor} strokeWidth={1.6} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 16,
            lineHeight: 24,
          }}
        >
          {titulo}
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {subtitulo}
        </Text>
      </View>
    </Pressable>
  );
}

export function SheetEscolhaCaptura({
  onRegistrarMomento,
  onEscanearDocumento,
}: SheetEscolhaCapturaProps): ReactNode {
  return (
    <BottomSheetView style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <Text
          accessibilityRole="header"
          accessibilityLabel="escolha o que registrar"
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 26,
          }}
        >
          O que você quer registrar?
        </Text>

        <View style={{ gap: spacing.md }}>
          <OpcaoCaptura
            Icon={ImagePlus}
            cor={colors.green}
            titulo="Registrar momento"
            subtitulo="Foto, música, vídeo ou frase."
            a11yLabel="registrar momento"
            onPress={onRegistrarMomento}
          />
          <OpcaoCaptura
            Icon={ScanLine}
            cor={colors.cyan}
            titulo="Escanear documento"
            subtitulo="Nota fiscal, comprovante."
            a11yLabel="escanear documento"
            onPress={onEscanearDocumento}
          />
        </View>
      </View>
    </BottomSheetView>
  );
}
