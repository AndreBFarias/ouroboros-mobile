// M34: FAB verde no canto inferior direito da tab Memorias. Abre um
// sheet pequeno com 4 acoes de captura unificada (Foto / Musica /
// Video / Frase). Cada acao delega ao helper correspondente em
// src/lib/midia/.
//
// Decisao de UI:
//  - Cor verde distingue do FAB roxo de navegacao (FABMenu, esquerda).
//  - Posicao direita evita conflito de gestos.
//  - Sheet usa SHEET_60 (50% +10% para garantir 4 itens visiveis +
//    paddings sem corte em tela 412dp).
//  - Indice 0 (aberto direto) quando o caller decide via expand(); aqui
//    inicializamos -1 e o tap no FAB chama expand(). A17 nao se aplica
//    porque o sheet e' filho do mesmo provider de tab e o expand e
//    disparado por tap sincrono (mesmo padrao do MemoriasFotosTab).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  Image as ImageIcon,
  MessageCircle,
  Music,
  Plus,
  Video,
} from 'lucide-react-native';
import {
  BottomSheet,
  SHEET_60,
  type BottomSheetRef,
} from '@/components/ui';
import { SheetFrase } from '@/components/midia/SheetFrase';
import { colors, radius, spacing } from '@/theme/tokens';
import { springs } from '@/lib/motion';
import { haptics } from '@/lib/haptics';
import { capturarFoto } from '@/lib/midia/capturarFoto';
import { capturarMusica } from '@/lib/midia/capturarMusica';
import { capturarVideo } from '@/lib/midia/capturarVideo';
import { salvarFrase } from '@/lib/midia/salvarFrase';
import type { Para } from '@/lib/schemas/para';

const FAB_SIZE = 56;

export interface MenuCapturaVerdeProps {
  // Disparado apos qualquer captura concluida com sucesso (foto/audio/
  // video/frase). Caller usa para recarregar galerias relevantes.
  onCapturaConcluida?: () => void;
}

interface AcaoMenuItemProps {
  icone: ReactNode;
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
}

// Item de menu local, padrao Pressable + icone + label. Nao foi
// promovido a componente generico em ui/ porque so e usado neste
// sheet por enquanto; M39 pode extrair se outros menus pedirem.
function AcaoMenuItem({
  icone,
  label,
  onPress,
  accessibilityLabel,
}: AcaoMenuItemProps): ReactNode {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: pressed ? colors.bgElev : 'transparent',
        borderRadius: radius.input,
        minHeight: 56,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.bgElev,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icone}
      </View>
      <Text
        style={{
          color: colors.fg,
          fontFamily: 'JetBrainsMono_500Medium',
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function MenuCapturaVerde({
  onCapturaConcluida,
}: MenuCapturaVerdeProps): ReactNode {
  const sheetRef = useRef<BottomSheetRef>(null);
  const fraseRef = useRef<BottomSheetRef>(null);
  const [pressed, setPressed] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resetFrase, setResetFrase] = useState(0);

  const abrirMenu = useCallback(() => {
    haptics.fab();
    sheetRef.current?.expand();
  }, []);

  const fecharMenu = useCallback(() => {
    sheetRef.current?.close();
  }, []);

  const tratarSucesso = useCallback(() => {
    onCapturaConcluida?.();
  }, [onCapturaConcluida]);

  const handleFoto = useCallback(async () => {
    fecharMenu();
    setSalvando(true);
    const r = await capturarFoto({ origem: 'galeria' });
    setSalvando(false);
    if (r.ok) tratarSucesso();
  }, [fecharMenu, tratarSucesso]);

  const handleMusica = useCallback(async () => {
    fecharMenu();
    setSalvando(true);
    const r = await capturarMusica();
    setSalvando(false);
    if (r.ok) tratarSucesso();
  }, [fecharMenu, tratarSucesso]);

  const handleVideo = useCallback(async () => {
    fecharMenu();
    setSalvando(true);
    const r = await capturarVideo({ origem: 'galeria' });
    setSalvando(false);
    if (r.ok) tratarSucesso();
  }, [fecharMenu, tratarSucesso]);

  const handleAbrirFrase = useCallback(() => {
    fecharMenu();
    setResetFrase((n) => n + 1);
    // Pequeno delay para o sheet do menu fechar antes do sheet de
    // frase abrir; evita corrida de dois sheets simultaneos.
    setTimeout(() => fraseRef.current?.expand(), 200);
  }, [fecharMenu]);

  const handleSalvarFrase = useCallback(
    async (payload: { frase: string; para: Para }) => {
      setSalvando(true);
      const r = await salvarFrase({ frase: payload.frase, para: payload.para });
      setSalvando(false);
      fraseRef.current?.close();
      if (r.ok) tratarSucesso();
    },
    [tratarSucesso]
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <Pressable
        onPress={abrirMenu}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel="abrir menu de captura"
        style={{
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.xl,
        }}
      >
        <MotiView
          animate={{ scale: pressed ? 0.97 : 1 }}
          transition={springs.snappy}
          style={{
            width: FAB_SIZE,
            height: FAB_SIZE,
            borderRadius: radius.fab,
            backgroundColor: colors.green,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 8,
            opacity: salvando ? 0.6 : 1,
          }}
        >
          <Plus size={24} color={colors.bg} strokeWidth={2} />
        </MotiView>
      </Pressable>

      <BottomSheet
        ref={sheetRef}
        snapPoints={SHEET_60}
        index={-1}
      >
        <BottomSheetView style={{ paddingVertical: spacing.base }}>
          <Text
            style={{
              color: colors.green,
              fontFamily: 'JetBrainsMono_500Medium',
              fontSize: 18,
              lineHeight: 24,
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.base,
            }}
          >
            Registrar
          </Text>
          <AcaoMenuItem
            icone={<ImageIcon size={20} color={colors.green} strokeWidth={2} />}
            label="Foto"
            onPress={() => {
              void handleFoto();
            }}
            accessibilityLabel="capturar foto"
          />
          <AcaoMenuItem
            icone={<Music size={20} color={colors.green} strokeWidth={2} />}
            label="Música"
            onPress={() => {
              void handleMusica();
            }}
            accessibilityLabel="capturar musica"
          />
          <AcaoMenuItem
            icone={<Video size={20} color={colors.green} strokeWidth={2} />}
            label="Vídeo"
            onPress={() => {
              void handleVideo();
            }}
            accessibilityLabel="capturar video"
          />
          <AcaoMenuItem
            icone={
              <MessageCircle size={20} color={colors.green} strokeWidth={2} />
            }
            label="Frase"
            onPress={handleAbrirFrase}
            accessibilityLabel="capturar frase"
          />
        </BottomSheetView>
      </BottomSheet>

      <BottomSheet ref={fraseRef} snapPoints={SHEET_60} index={-1}>
        <SheetFrase
          onSalvar={(payload) => {
            void handleSalvarFrase(payload);
          }}
          onCancelar={() => fraseRef.current?.close()}
          salvando={salvando}
          resetKey={resetFrase}
        />
      </BottomSheet>
    </View>
  );
}
