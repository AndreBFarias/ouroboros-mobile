// Botao "marcar" rapido em item de Rotina recorrente (R-SF-3).
//
// Caso primario: dono toca para registrar "tomei Venvanse" em 1 tap.
// Dimensao 32dp (visual compacto pra caber em lista densa) +
// hitSlop 16 (area de toque efetiva 64dp, acima do minHitArea 44dp do
// BRIEF §1.5).
//
// Dois estados visuais:
//   - marcado=false: borda purple, fundo transparente (call to action).
//   - marcado=true: fundo purple + check branco (confirmacao). Continua
//     pressable: novo tap registra OUTRA marcacao no mesmo dia
//     (caso valido: medicacao 2x ao dia). O componente nao impede
//     re-marcacao; semantica fica com o caller.
//
// Haptic.light no press (BRIEF §1.7: botoes primarios sempre disparam
// light). Sem toast: caller decide se mostra confirmacao.
//
// Visual segue Dracula + tokens: purple (#bd93f9) para acao primaria,
// fg (#f8f8f2) para o check. Spring nao e necessario porque o tap e
// instantaneo (sem state transition complexo); haptic + cor sao
// suficientes pra feedback.
//
// Comentarios sem acento (convencao shell/CI).
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Check } from '@/lib/icons';
import { haptics } from '@/lib/haptics';
import { colors } from '@/theme/tokens';

interface BotaoMarcarProps {
  // Estado visual atual. True quando ja houve >=1 marcacao no dia
  // (caller calcula via lerMarcacaoDia ou listarMarcacoesUltimosDias).
  marcado: boolean;
  // Callback chamado no tap. Caller persiste via registrarMarcacao.
  onPress: () => void;
  // Label para screen reader. Sem acento (convencao a11y do projeto,
  // BRIEF §1.4). Caller passa "marcar rotina <nome>".
  accessibilityLabel: string;
  // Toggle de teste para desabilitar haptic em jest (default true).
  haptic?: boolean;
}

export function BotaoMarcar({
  marcado,
  onPress,
  accessibilityLabel,
  haptic = true,
}: BotaoMarcarProps): ReactNode {
  const handlePress = (): void => {
    if (haptic) {
      // Fire-and-forget; nao queremos bloquear o tap esperando vibracao.
      void haptics.light();
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: marcado }}
      hitSlop={16}
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.purple,
        backgroundColor: marcado ? colors.purple : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {marcado ? (
        <Check size={18} color={colors.fg} strokeWidth={2.5} />
      ) : (
        // Placeholder neutro para reservar dimensao visual quando
        // nao marcado; deixa Pressable centrado mesmo sem icone.
        <View style={{ width: 18, height: 18 }} />
      )}
    </Pressable>
  );
}
