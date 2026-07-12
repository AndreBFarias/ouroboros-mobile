// Sheet de detalhe de uma foto agregada. Mostra a imagem grande,
// metadata (data, origem) e botao "Abrir registro" que navega para
// o schema-mae (ex: detalhe de evento).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, type ReactNode } from 'react';
import { Image, Text, View } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Button } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import type { FotoAgregada } from '@/lib/hooks/useFotosAgregadas';

const ORIGEM_LABEL: Record<FotoAgregada['origem'], string> = {
  evento: 'Evento',
  medida: 'Medida',
  diario: 'Diário',
  // M11.1: foto adicionada manualmente pelo FAB + da aba Fotos.
  'galeria-manual': 'Galeria',
};

export interface FotoDetalheProps {
  foto: FotoAgregada;
  onAbrirRegistro: () => void;
  onFechar: () => void;
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hh}:${mm}`;
}

export function FotoDetalhe({
  foto,
  onAbrirRegistro,
  onFechar,
}: FotoDetalheProps): ReactNode {
  const handleAbrir = useCallback(() => {
    onAbrirRegistro();
  }, [onAbrirRegistro]);

  return (
    <BottomSheetView style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.base,
        }}
      >
        <View
          style={{
            width: '100%',
            aspectRatio: 1,
            backgroundColor: colors.bgElev,
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: foto.uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            accessibilityLabel={`foto de ${foto.origem}`}
          />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {ORIGEM_LABEL[foto.origem]}
          </Text>
          <Text
            style={{
              color: colors.fg,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 14,
              lineHeight: 22,
            }}
          >
            {formatarData(foto.data)}
          </Text>
          <Text
            style={{
              color: colors.cyan,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              lineHeight: 18,
            }}
            numberOfLines={1}
          >
            {foto.origemSlug}
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            label="Abrir registro"
            onPress={handleAbrir}
            variant="primary"
          />
          <Button label="Fechar" onPress={onFechar} variant="ghost" />
        </View>
      </View>
    </BottomSheetView>
  );
}
