// Gate de biometria real (M15). Quando
// useSettings.privacidade.biometriaAbrir === true, intercepta a
// renderizacao da arvore e mostra tela de bloqueio ate
// LocalAuthentication.authenticateAsync resolver com sucesso.
//
// Comportamento canonico:
//   - Toggle off (default): renderiza children direto, sem lock.
//   - Toggle on:
//       1. Mostra UI de bloqueio escura com botao "Desbloquear" e
//          icone de impressao digital.
//       2. authenticateAsync com promptMessage em PT-BR.
//       3. Sucesso -> renderiza children.
//       4. Falha -> permanece na tela com mensagem em red e botao
//          "Tentar novamente".
//   - Web: gate desligado (LocalAuthentication nao tem implementacao
//     web util); renderiza children. Comportamento documentado em
//     `STATE.md` -> Nivel A nao cobre biometria.
//
// Reativo: o useEffect re-dispara quando o toggle vira true em
// runtime (settings -> ligar -> volta -> abre).
//
// Deep links do widget homescreen (M20): o expo-router empilha a
// rota destino (ex: /humor-rapido?source=widget) antes do gate
// montar; quando autenticado=true, children renderiza a rota
// correta sem desvio extra. O gate trata o caso de forma
// transparente -- nenhum bypass necessario.
import { ReactNode, useEffect, useState, useCallback } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Fingerprint } from 'lucide-react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/lib/stores/settings';
import { colors, radius, spacing, typography } from '@/theme/tokens';

interface BiometriaGateProps {
  children: ReactNode;
}

export function BiometriaGate({ children }: BiometriaGateProps) {
  const ativa = useSettings((s) => s.privacidade.biometriaAbrir);
  const [autenticado, setAutenticado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentando, setTentando] = useState(false);

  const tentar = useCallback(async () => {
    if (!ativa) {
      setAutenticado(true);
      return;
    }
    if (Platform.OS === 'web') {
      // Web nao suporta LocalAuthentication util; libera para nao
      // bloquear o smoke do Chrome.
      setAutenticado(true);
      return;
    }
    setTentando(true);
    setErro(null);
    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!supported || !enrolled) {
        // Sem hardware ou sem cadastro: libera com aviso silencioso.
        // Spec: nao prender o usuario por falta de hardware.
        setAutenticado(true);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloqueie para continuar',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      if (result.success) {
        haptics.success();
        setAutenticado(true);
      } else {
        haptics.error();
        setErro('Falha ao autenticar.');
      }
    } catch {
      setErro('Erro inesperado.');
    } finally {
      setTentando(false);
    }
  }, [ativa]);

  useEffect(() => {
    if (!ativa) {
      setAutenticado(true);
      return;
    }
    setAutenticado(false);
    void tentar();
  }, [ativa, tentar]);

  if (!ativa || autenticado) {
    return <>{children}</>;
  }

  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="bloqueio biometria"
      style={{
        flex: 1,
        backgroundColor: colors.bgPage,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
      }}
    >
      <MotiView
        from={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springs.default}
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <Fingerprint
          size={48}
          color={colors.purple}
          strokeWidth={1.5}
        />
      </MotiView>
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: typography.heading2.size,
          lineHeight:
            typography.heading2.size * typography.heading2.lineHeight,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}
      >
        Aguardando biometria
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: typography.body.size,
          lineHeight: typography.body.size * typography.body.lineHeight,
          textAlign: 'center',
          marginBottom: spacing.xl,
        }}
      >
        Toque no leitor para desbloquear o app.
      </Text>
      {erro ? (
        <Text
          style={{
            color: colors.red,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: typography.caption.size,
            lineHeight:
              typography.caption.size * typography.caption.lineHeight,
            marginBottom: spacing.base,
          }}
        >
          {erro}
        </Text>
      ) : null}
      <Pressable
        onPress={() => {
          if (tentando) return;
          haptics.light();
          void tentar();
        }}
        accessibilityRole="button"
        accessibilityLabel="tentar novamente biometria"
        style={{
          backgroundColor: colors.purple,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderRadius: radius.card,
          minHeight: 48,
          opacity: tentando ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            color: colors.bg,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: typography.body.size,
          }}
        >
          {tentando ? 'Tentando…' : 'Tentar novamente'}
        </Text>
      </Pressable>
    </View>
  );
}
