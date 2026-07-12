// Botao premium: variantes primary | success | ghost | destructive.
// Altura minima 56dp. Press in dispara haptic light e scale 0.97 com
// spring snappy. Disabled = opacity 0.4 e bloqueio de eventos.
//
// M34.2: aplica style direto alem de className. Em web (Gauntlet) o
// MotiView nao propaga className NativeWind para o DOM com confianca
// (RN-Web + nativewind interop perdem no atravessamento), levando o
// botao "Registrar foto" do empty state e "Salvar" do SheetFrase a
// renderizar como texto puro sem background. Style direto cobre o
// caminho web e duplica seguranca em mobile.
import { useState, type ReactNode } from 'react';
import { Pressable, Text } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { colors, spacing } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'success' | 'ghost' | 'destructive';

interface ButtonProps {
  label: string | ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  // Permite acessibilidade desacoplada do label visual.
  // Quando label e elemento React (e.g. <Text> custom), forneca aqui
  // um string sem acento para o screen reader.
  accessibilityLabel?: string;
  // K5 (M-BOTOES-LARGURA, 2026-05-07): quando true, o botao ocupa 100%
  // da largura disponivel do container. Default false mantem largura
  // intrinseca do conteudo (chips, tags, header right). Aplicado em
  // CTAs primarios de tela cheia ("Conectar conta Google", "Abrir
  // agenda") onde a largura intrinseca era visualmente fraca.
  fullWidth?: boolean;
}

interface VariantClasses {
  bg: string;
  text: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  borderWidth?: number;
}

const VARIANT_CLASSES: Record<ButtonVariant, VariantClasses> = {
  primary: {
    bg: 'bg-purple',
    text: 'text-bg',
    bgColor: colors.purple,
    textColor: colors.bg,
  },
  success: {
    bg: 'bg-green',
    text: 'text-bg',
    bgColor: colors.green,
    textColor: colors.bg,
  },
  ghost: {
    bg: 'bg-transparent border border-bg-elev',
    text: 'text-fg',
    bgColor: 'transparent',
    textColor: colors.fg,
    borderColor: colors.bgElev,
    borderWidth: 1,
  },
  destructive: {
    bg: 'bg-red',
    text: 'text-fg',
    bgColor: colors.red,
    textColor: colors.fg,
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  fullWidth = false,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const v = VARIANT_CLASSES[variant];
  // Prioriza prop explicita; se ausente e label e string, deriva.
  // Caso label seja ReactNode sem accessibilityLabel explicito, cai
  // em undefined (RN ignora) — consumidor e responsavel por prover.
  const a11yLabel =
    accessibilityLabel ?? (typeof label === 'string' ? label : undefined);

  return (
    <Pressable
      onPressIn={() => {
        if (disabled) return;
        setPressed(true);
        haptics.light();
      }}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (!disabled) onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled }}
      style={fullWidth ? { width: '100%' } : undefined}
    >
      <MotiView
        animate={{ scale: pressed ? 0.97 : 1 }}
        transition={springs.snappy}
        className={`${v.bg} rounded-xl py-4 items-center justify-center`}
        style={{
          minHeight: 56,
          opacity: disabled ? 0.4 : 1,
          backgroundColor: v.bgColor,
          borderRadius: 12,
          paddingVertical: 16,
          // W1.1 (M-AUDIT-VISUAL-BUTTON-GHOST-PADDING): variant ghost
          // tinha paddingHorizontal 0 e o texto ficava colado nas
          // bordas do pill (borda 1dp visivel). 16dp uniforme garante
          // respiracao interna em todas as instancias compartilhadas.
          // As outras variantes mantem padding 0 horizontal porque o
          // CTA primario costuma ser fullWidth com label curto e nao
          // se beneficia do mesmo espaco extra.
          ...(variant === 'ghost' ? { paddingHorizontal: spacing.base } : {}),
          alignItems: 'center',
          justifyContent: 'center',
          ...(fullWidth ? { width: '100%' as const } : {}),
          ...(v.borderColor
            ? { borderColor: v.borderColor, borderWidth: v.borderWidth }
            : {}),
        }}
      >
        {typeof label === 'string' ? (
          <Text
            className={`${v.text} font-mono-medium text-base`}
            style={{
              color: v.textColor,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 16,
            }}
          >
            {label}
          </Text>
        ) : (
          label
        )}
      </MotiView>
    </Pressable>
  );
}
