// M34: BottomSheet pequeno para registrar uma frase texto-livre. O
// MenuCapturaVerde (chrome) abre este sheet; aqui o usuario digita,
// escolhe destinatario via SeletorPara e toca Salvar para persistir
// em media/frases/.
//
// Cabecalho usa cor green para reforcar a identidade do menu de
// captura unificada (distincao do FAB roxo de navegacao).
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Button, SeletorPara, Textarea } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import type { Para } from '@/lib/schemas/para';

export interface SheetFraseProps {
  // Disparado quando usuario toca Salvar com frase nao-vazia. Caller
  // chama salvarFrase() com payload e fecha o sheet.
  onSalvar: (payload: { frase: string; para: Para }) => void;
  onCancelar: () => void;
  // Em true bloqueia botoes durante I/O.
  salvando?: boolean;
  // Reset do conteudo ao reabrir sheet (caller incrementa um nonce).
  resetKey?: number;
}

const PARA_DEFAULT: Para = { tipo: 'mim' };

export function SheetFrase({
  onSalvar,
  onCancelar,
  salvando = false,
  resetKey = 0,
}: SheetFraseProps): ReactNode {
  const [frase, setFrase] = useState<string>('');
  const [para, setPara] = useState<Para>(PARA_DEFAULT);

  useEffect(() => {
    // Limpa estado quando o caller solicita reset (sheet reaberto).
    setFrase('');
    setPara(PARA_DEFAULT);
  }, [resetKey]);

  const podeSalvar = frase.trim().length > 0 && !salvando;

  const handleSalvar = () => {
    if (!podeSalvar) return;
    onSalvar({ frase: frase.trim(), para });
  };

  return (
    <BottomSheetView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: colors.green,
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          Nova frase
        </Text>

        <View style={{ gap: spacing.sm }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              lineHeight: 14,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Frase
          </Text>
          <Textarea
            value={frase}
            onChangeText={setFrase}
            placeholder="Aquilo que você queria registrar..."
            minHeight={120}
            maxHeight={260}
            accessibilityLabel="campo da frase"
          />
        </View>

        <SeletorPara value={para} onChange={setPara} disabled={salvando} />

        <View style={{ gap: spacing.sm, marginTop: spacing.base }}>
          <Button
            label="Salvar"
            onPress={handleSalvar}
            variant="primary"
            disabled={!podeSalvar}
          />
          <Button
            label="Cancelar"
            onPress={onCancelar}
            variant="ghost"
            disabled={salvando}
          />
        </View>
      </ScrollView>
    </BottomSheetView>
  );
}
