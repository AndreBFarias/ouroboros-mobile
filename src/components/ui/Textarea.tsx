// Variante multilinha do Input com auto-expand simples baseada em
// onContentSizeChange. Altura minima de 96dp e maxima opcional.
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { colors } from '@/theme/tokens';

export interface TextareaProps {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  label?: string;
  minHeight?: number;
  maxHeight?: number;
  accessibilityLabel?: string;
}

export function Textarea({
  value,
  onChangeText,
  placeholder,
  label,
  minHeight = 96,
  maxHeight = 240,
  accessibilityLabel,
}: TextareaProps) {
  const [focused, setFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(minHeight);
  const a11y =
    accessibilityLabel ?? label ?? placeholder ?? 'campo de texto longo';

  const height = Math.min(Math.max(contentHeight, minHeight), maxHeight);

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
          multiline
          textAlignVertical="top"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onContentSizeChange={(e) =>
            setContentHeight(e.nativeEvent.contentSize.height + 24)
          }
          className="font-mono text-fg text-base px-4"
          style={{ height, paddingVertical: 12 }}
          accessibilityLabel={a11y}
        />
      </MotiView>
    </View>
  );
}
