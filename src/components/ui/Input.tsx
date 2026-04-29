// Campo de texto base. Fundo bg-alt, borda bg-elev em rest, anima para
// purple via spring_subtle no foco. Placeholder muted-decor. Aceita
// label opcional acima do campo.
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { colors } from '@/theme/tokens';

export interface InputProps {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  label?: string;
  secureTextEntry?: boolean;
  // accessibilityLabel customizavel; quando ausente cai no label ou
  // placeholder. Convencao do projeto: PT-BR sem acento.
  accessibilityLabel?: string;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  secureTextEntry = false,
  accessibilityLabel,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const a11y = accessibilityLabel ?? label ?? placeholder ?? 'campo de texto';

  return (
    <View>
      {label ? (
        <Text className="font-mono text-muted text-xs mb-2">
          {label}
        </Text>
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
