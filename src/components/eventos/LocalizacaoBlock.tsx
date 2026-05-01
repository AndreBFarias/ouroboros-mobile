// Bloco "Onde" da Tela 20. Combina input manual de lugar com botao
// "Usar localizacao atual" e chip cyan opcional mostrando o bairro
// detectado via expo-location. O bairro entra no estado do
// container; o input livre 'lugar' fica independente para
// cobrir cenarios como "casa da pessoa_b" ou "rua sem nome".
//
// Estados:
//  - lugar: string controlado pelo container.
//  - bairro: string | null controlado pelo container. Quando null,
//    chip não aparece. Quando string, exibe chip cyan ao lado do
//    botao.
//
// Erros de detec cao são silenciosos: o container chama
// getBairroAtual e mostra toast info se devolver null.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chip, Input } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

export interface LocalizacaoBlockProps {
  lugar: string;
  onChangeLugar: (next: string) => void;
  bairro: string | null;
  onDetectar: () => Promise<void>;
  detectando?: boolean;
  disabled?: boolean;
}

export function LocalizacaoBlock({
  lugar,
  onChangeLugar,
  bairro,
  onDetectar,
  detectando: detectandoProp,
  disabled = false,
}: LocalizacaoBlockProps) {
  // Permite que o container controle 'detectando' externamente, ou
  // gerencie internamente quando a prop não chega.
  const [detectandoLocal, setDetectandoLocal] = useState(false);
  const detectando = detectandoProp ?? detectandoLocal;

  const handleDetectar = async () => {
    if (disabled || detectando) return;
    setDetectandoLocal(true);
    try {
      await onDetectar();
    } finally {
      setDetectandoLocal(false);
    }
  };

  return (
    <View
      style={{ gap: spacing.sm }}
      accessibilityLabel="bloco onde"
    >
      <Text
        style={{
          color: colors.muted,
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 12,
        }}
      >
        Onde
      </Text>
      <Input
        value={lugar}
        onChangeText={onChangeLugar}
        placeholder="Ex.: padaria da esquina"
        accessibilityLabel="campo lugar"
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="ghost"
          label={detectando ? 'Detectando...' : 'Usar localização atual'}
          onPress={handleDetectar}
          disabled={disabled || detectando}
        />
        {bairro ? (
          <Chip
            label={bairro}
            accent="cyan"
            selected
            onPress={() => undefined}
          />
        ) : null}
      </View>
    </View>
  );
}
