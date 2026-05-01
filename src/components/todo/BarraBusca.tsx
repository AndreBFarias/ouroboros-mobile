// Campo de busca textual da tela de tarefas (M17). Substring no
// titulo, case-insensitive, accent-insensitive. Caller passa value e
// onChangeText; este componente apenas renderiza visual + a11y.
//
// Variante "bem leve" do Input base: sem label, com icone de lupa a
// esquerda e botao 'limpar' a direita quando ha conteudo.
//
// Comentarios sem acento (convencao shell/CI).
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { MotiView } from 'moti';
import { Search, X } from 'lucide-react-native';
import { springs } from '@/lib/motion';
import { colors, radius, spacing } from '@/theme/tokens';

export interface BarraBuscaProps {
  value: string;
  onChangeText: (next: string) => void;
  // Placeholder em sentence case PT-BR.
  placeholder?: string;
}

export function BarraBusca({
  value,
  onChangeText,
  placeholder = 'Buscar tarefas',
}: BarraBuscaProps) {
  const [focused, setFocused] = useState(false);

  return (
    <MotiView
      animate={{
        borderColor: focused ? colors.purple : colors.bgElev,
      }}
      transition={springs.subtle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.bgAlt,
        borderRadius: radius.input,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        minHeight: 44,
      }}
    >
      <Search
        size={18}
        color={colors.mutedDecor}
        strokeWidth={1.8}
        accessibilityLabel="buscar"
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedDecor}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          color: colors.fg,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 14,
          paddingVertical: 8,
        }}
        accessibilityLabel="campo de busca de tarefas"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="limpar busca"
        >
          <View
            style={{
              width: 22,
              height: 22,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} color={colors.muted} strokeWidth={2} />
          </View>
        </Pressable>
      ) : null}
    </MotiView>
  );
}

// Normaliza string para busca: lowercase + remove diacriticos. Helper
// estatico exposto para a tela mae aplicar no array de tarefas.
export function normalizarBusca(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
