// Aba Fotos da MemoriasScreen. Galeria agregada que varre 5 fontes
// do Vault e renderiza grid 3 colunas em ordem cronologica desc.
// Tap abre FotoDetalhe com metadata + atalho para registro origem.
//
// Empty state quando nenhuma foto encontrada.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BottomSheet,
  EmptyState,
  SHEET_70,
  type BottomSheetRef,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import {
  useFotosAgregadas,
  type FotoAgregada,
} from '@/lib/hooks/useFotosAgregadas';
import { FotoDetalhe } from './FotoDetalhe';

const COLS = 3;

export function MemoriasFotosTab(): ReactNode {
  const router = useRouter();
  const { fotos } = useFotosAgregadas();
  const dim = useWindowDimensions();
  const fotoRef = useRef<BottomSheetRef>(null);

  const [fotoSelecionada, setFotoSelecionada] = useState<FotoAgregada | null>(
    null
  );

  // Tamanho de cada thumbnail. width disponivel - 2*padding lateral
  // - 2*gaps internos.
  const thumbSize = useMemo(() => {
    const padding = spacing.lg * 2;
    const gaps = spacing.sm * (COLS - 1);
    return Math.floor((dim.width - padding - gaps) / COLS);
  }, [dim.width]);

  const handlePress = useCallback((foto: FotoAgregada) => {
    setFotoSelecionada(foto);
    fotoRef.current?.expand();
  }, []);

  const handleAbrirRegistro = useCallback(() => {
    if (!fotoSelecionada) return;
    fotoRef.current?.close();
    // Navegacao por origem. Eventos abrem em /eventos com query
    // (M07 nao tem rota detalhe ainda); por ora apenas dismiss.
    if (fotoSelecionada.origem === 'evento') {
      router.push('/eventos');
    }
    setFotoSelecionada(null);
  }, [fotoSelecionada, router]);

  // Agrupa em linhas de COLS para grid manual (FlatList numColumns
  // tem bug em web).
  const linhas = useMemo(() => {
    const out: FotoAgregada[][] = [];
    for (let i = 0; i < fotos.length; i += COLS) {
      out.push(fotos.slice(i, i + COLS));
    }
    return out;
  }, [fotos]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.base,
          paddingBottom: spacing.huge,
          gap: spacing.sm,
        }}
        showsVerticalScrollIndicator={false}
      >
        {fotos.length === 0 ? (
          <EmptyState frase="Suas fotos vão aparecer aqui conforme você registrar." />
        ) : (
          linhas.map((linha, idx) => (
            <View
              key={`linha-${idx}`}
              style={{ flexDirection: 'row', gap: spacing.sm }}
            >
              {linha.map((foto, j) => (
                <Pressable
                  key={`foto-${idx}-${j}`}
                  onPress={() => handlePress(foto)}
                  accessibilityRole="button"
                  accessibilityLabel={`foto ${foto.origem} ${foto.data}`}
                  style={{
                    width: thumbSize,
                    height: thumbSize,
                    backgroundColor: colors.bgElev,
                    borderRadius: 8,
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: foto.uri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
              {linha.length < COLS
                ? Array.from({ length: COLS - linha.length }).map((_, k) => (
                    <View
                      key={`pad-${idx}-${k}`}
                      style={{ width: thumbSize, height: thumbSize }}
                    />
                  ))
                : null}
            </View>
          ))
        )}
      </ScrollView>

      <BottomSheet ref={fotoRef} snapPoints={SHEET_70} index={-1}>
        {fotoSelecionada ? (
          <FotoDetalhe
            foto={fotoSelecionada}
            onAbrirRegistro={handleAbrirRegistro}
            onFechar={() => {
              fotoRef.current?.close();
              setFotoSelecionada(null);
            }}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}
