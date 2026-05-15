// Campo de texto base. Fundo bg-alt, borda bg-elev em rest, anima para
// purple via spring_subtle no foco. Placeholder muted-decor. Aceita
// label opcional acima do campo.
import { useState } from 'react';
import { Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { colors } from '@/theme/tokens';

// Subset suportado de autoCapitalize. O TextInput nativo aceita os 4
// valores; expomos os mesmos para refletir a API do React Native sem
// alargar a superficie da abstracao.
export type InputAutoCapitalize = 'none' | 'sentences' | 'words' | 'characters';

export interface InputProps {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  label?: string;
  secureTextEntry?: boolean;
  // accessibilityLabel customizavel; quando ausente cai no label ou
  // placeholder. Convencao do projeto: PT-BR sem acento.
  accessibilityLabel?: string;
  // Repassados ao TextInput interno. autoCapitalize default 'sentences'
  // (idiomatico para textos PT-BR). keyboardType default 'default'.
  autoCapitalize?: InputAutoCapitalize;
  keyboardType?: KeyboardTypeOptions;
  // Limite de caracteres aceitos pelo TextInput nativo. Quando omitido
  // o campo aceita entrada ilimitada (comportamento padrao). Usado pelos
  // forms de rotina (nome 60), descricao (280), grupo etc.
  maxLength?: number;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  secureTextEntry = false,
  accessibilityLabel,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  maxLength,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const a11y = accessibilityLabel ?? label ?? placeholder ?? 'campo de texto';

  return (
    <View>
      {label ? (
        <Text className="font-mono text-muted text-xs mb-2">{label}</Text>
      ) : null}
      <MotiView
        animate={{
          borderColor: focused ? colors.purple : colors.bgElev,
        }}
        transition={springs.subtle}
        className="bg-bg-alt rounded-[10px]"
        style={{ borderWidth: 1 }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedDecor}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="font-mono text-fg text-base px-4"
          style={{ minHeight: 48, paddingVertical: 12 }}
          accessibilityLabel={a11y}
        />
      </MotiView>
    </View>
  );
}
