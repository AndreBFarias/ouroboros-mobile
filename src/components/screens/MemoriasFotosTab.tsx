// Aba Fotos da MemoriasScreen. Galeria agregada que varre fontes do
// Vault e renderiza grid 3 colunas em ordem cronologica desc. Tap
// abre FotoDetalhe com metadata + atalho para registro origem.
//
// M11.1 (§2.1): FAB roxo + adiciona foto manual via expo-image-picker
// em mobile real; em web/dev (GAUNTLET_ATIVO) chama
// __gauntlet.adicionarFotoMock() que insere entrada in-memory.
// Empty state ganha texto secundario.
//
// M34.3: o FAB proprio "adicionar foto" foi REMOVIDO porque colidia
// com o FAB verde do MenuCapturaVerde (mesmas coordenadas 769,900).
// A tab registra "Adicionar foto" como acao contextual via
// onRegistrarAcaoExtra; o sheet do MenuCapturaVerde unificado a
// renderiza como primeiro item. Empty state preservado.
//
// Comentarios sem acento (convencao shell/CI).
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus } from '@/lib/icons';
import {
  BottomSheet,
  Button,
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
import { adicionarFotoManual } from '@/lib/midia/adicionarFotoManual';
import { capturarFoto } from '@/lib/midia/capturarFoto';
import { useLarguraFrame } from '@/lib/ui/useLarguraFrame';
import type { AcaoExtraCaptura } from '@/components/chrome/MenuCapturaVerde';

const COLS = 3;

// M34.3: prop opcional usada pela MemoriasScreen para coletar a acao
// contextual da tab e injetar no MenuCapturaVerde. Quando undefined a
// tab funciona isoladamente.
export interface MemoriasFotosTabProps {
  onRegistrarAcaoExtra?: (acao: AcaoExtraCaptura | null) => void;
}

export function MemoriasFotosTab({
  onRegistrarAcaoExtra,
}: MemoriasFotosTabProps = {}): ReactNode {
  const router = useRouter();
  const { fotos, recarregar } = useFotosAgregadas();
  const larguraFrame = useLarguraFrame();
  const fotoRef = useRef<BottomSheetRef>(null);

  const [fotoSelecionada, setFotoSelecionada] = useState<FotoAgregada | null>(
    null
  );

  // Tamanho de cada thumbnail. width disponível - 2*padding lateral
  // - 2*gaps internos. Em web usa FRAME_W (412) via useLarguraFrame
  // para que a grid respeite o frame mobile do Gauntlet em vez de
  // estourar com a largura do viewport desktop.
  const thumbSize = useMemo(() => {
    const padding = spacing.lg * 2;
    const gaps = spacing.sm * (COLS - 1);
    return Math.floor((larguraFrame - padding - gaps) / COLS);
  }, [larguraFrame]);

  const handlePress = useCallback((foto: FotoAgregada) => {
    setFotoSelecionada(foto);
    fotoRef.current?.expand();
  }, []);

  const handleAbrirRegistro = useCallback(() => {
    if (!fotoSelecionada) return;
    fotoRef.current?.close();
    // Navegacao por origem. Eventos abrem em /eventos com query
    // (M07 não tem rota detalhe ainda); por ora apenas dismiss.
    if (fotoSelecionada.origem === 'evento') {
      router.push('/eventos');
    }
    setFotoSelecionada(null);
  }, [fotoSelecionada, router]);

  // M11.1: handler do FAB original (M34.3: agora chamado pelo
  // MenuCapturaVerde unificado via acao contextual). Em mobile real
  // abre expo-image-picker e copia para media/fotos/. Em web/dev
  // (GAUNTLET_ATIVO) delega ao __gauntlet.adicionarFotoMock(). Apos
  // sucesso recarrega a galeria.
  const handleAdicionarFoto = useCallback(async () => {
    const sucesso = await adicionarFotoManual();
    if (sucesso) {
      await recarregar();
    }
  }, [recarregar]);

  // M34.3: registra a acao "Adicionar foto" no MenuCapturaVerde da
  // screen pai. Limpa no unmount.
  useEffect(() => {
    if (!onRegistrarAcaoExtra) return;
    onRegistrarAcaoExtra({
      label: 'Adicionar foto',
      icone: <Plus size={20} color={colors.green} strokeWidth={2} />,
      onPress: () => {
        void handleAdicionarFoto();
      },
      accessibilityLabel: 'adicionar foto',
    });
    return () => {
      onRegistrarAcaoExtra(null);
    };
  }, [onRegistrarAcaoExtra, handleAdicionarFoto]);

  // M34: atalho do empty state. Reusa capturarFoto (helper unificado
  // do menu verde) com origem galeria. Em web/dev cai no caminho mock
  // do gauntlet; em mobile real, abre expo-image-picker e grava .md
  // companion preliminar junto com o binario.
  const handleRegistrarFotoEmptyState = useCallback(async () => {
    const r = await capturarFoto({ origem: 'galeria' });
    if (r.ok) {
      await recarregar();
    }
  }, [recarregar]);

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
          <View style={{ gap: spacing.sm }}>
            <EmptyState frase="Suas fotos vão aparecer aqui conforme você registrar." />
            <Text
              style={{
                color: colors.muted,
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 13,
                lineHeight: 20,
                textAlign: 'center',
              }}
            >
              Toque + para adicionar uma foto agora.
            </Text>
            <View style={{ paddingHorizontal: spacing.xl, marginTop: spacing.sm }}>
              <Button
                label="Registrar foto"
                onPress={() => {
                  void handleRegistrarFotoEmptyState();
                }}
                variant="primary"
              />
            </View>
          </View>
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
