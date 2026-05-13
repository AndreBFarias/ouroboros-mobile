// Input numerico especializado para medidas corporais. Render visual:
//   - Label PT-BR acima ("Peso", "Cintura", ...).
//   - Campo com fundo bg-alt, borda bg-elev (purple ao focar).
//   - Placeholder em muted-decor mostrando a SUGESTAO (ultima medida)
//     ou apenas a unidade "kg" / "cm" / "%" quando sem sugestao. Cor
//     muted-decor diferencia visualmente que e sugestao, não valor
//     real - quando o usuario digita, o texto vira fg normal.
//   - keyboardType decimal-pad para teclado numerico.
//
// Caller fornece string (estado) e handler. Conversao para número
// fica no submit (Tela 12). Aceita virgula ou ponto como separador
// decimal; Tela 12 normaliza ao salvar.
//
// Comentarios sem acento (convencao shell/CI).
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { MotiView } from 'moti';
import { springs } from '@/lib/motion';
import { colors } from '@/theme/tokens';

export interface InputMedidaProps {
  label: string;
  unidade: 'kg' | 'cm' | '%';
  // Valor digitado (string para permitir virgula PT-BR); '' = vazio.
  value: string;
  onChangeText: (next: string) => void;
  // Sugestao de pre-preenchimento (ultima medida). null = sem
  // sugestao; quando ha sugestao e value === '', placeholder mostra
  // a sugestao + unidade em muted-decor.
  sugestao?: number | null;
  // accessibilityLabel sem acento (convencao screen reader). Default
  // deriva do label removendo acentos.
  accessibilityLabel?: string;
}

// Remove acentos para gerar accessibilityLabel default.
function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Formata número PT-BR com 1 casa decimal (separador virgula).
function formatarNumero(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

export function InputMedida({
  label,
  unidade,
  value,
  onChangeText,
  sugestao = null,
  accessibilityLabel,
}: InputMedidaProps) {
  const [focused, setFocused] = useState(false);

  // Placeholder muda com base na sugestao. Sem sugestao -> so unidade.
  const placeholder =
    sugestao !== null && sugestao !== undefined
      ? `${formatarNumero(sugestao)} ${unidade}`
      : unidade;

  const a11y = accessibilityLabel ?? semAcento(label).toLowerCase();

  return (
    <View>
      <Text
        className="font-mono text-muted text-xs mb-2"
        style={{ color: colors.muted }}
      >
        {label}
      </Text>
      <MotiView
        animate={{
          borderColor: focused ? colors.purple : colors.bgElev,
        }}
        transition={springs.subtle}
        style={{
          backgroundColor: colors.bgAlt,
          borderRadius: 10,
          borderWidth: 1,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedDecor}
          keyboardType="decimal-pad"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            color: colors.fg,
            fontFamily: 'JetBrainsMono_400Regular',
            fontSize: 14,
            lineHeight: 22,
            paddingHorizontal: 14,
            paddingVertical: 12,
            minHeight: 48,
          }}
          accessibilityLabel={a11y}
        />
      </MotiView>
    </View>
  );
}
