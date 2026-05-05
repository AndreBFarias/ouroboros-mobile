// M34: FAB verde no canto inferior direito da tab Memorias. Abre um
// sheet pequeno com 4 acoes de captura unificada (Foto / Musica /
// Video / Frase). Cada acao delega ao helper correspondente em
// src/lib/midia/.
//
// M34.3: prop acoesExtras permite que cada tab da MemoriasScreen
// injete sua acao contextual ("Adicionar marco", "Adicionar foto",
// "Novo treino") como primeiro item do sheet. Resolveu o conflito de
// z-order do FAB verde sobrepondo os FABs proprios das tabs (mesmas
// coordenadas 769,900 56x56). Os FABs proprios foram removidos das
// tabs em troca, restando 1 FAB unico por tela com semantica clara.
//
// Decisao de UI:
//  - Cor verde distingue do FAB roxo de navegacao (FABMenu, esquerda).
//  - Posicao direita evita conflito de gestos.
//  - Sheet usa SHEET_60 (50% +10% para garantir 4 itens visiveis +
//    paddings sem corte em tela 412dp). Com 1 acao extra cabe 5 itens
//    mantendo o snap; itens extras alem disso vao roer paddings.
//  - Indice 0 (aberto direto) quando o caller decide via expand(); aqui
//    inicializamos -1 e o tap no FAB chama expand(). A17 nao se aplica
//    porque o sheet e' filho do mesmo provider de tab e o expand e
//    disparado por tap sincrono (mesmo padrao do MemoriasFotosTab).
//  - Itens contextuais usam mesma cor green dos itens de captura por
//    coerencia visual; o que diferencia e a posicao (1a) e o icone.
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
} from '@/lib/icons';
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
import { useNavegacao } from '@/lib/stores/navegacao';

const FAB_SIZE = 56;

// M34.3: descricao de uma acao contextual injetada pela tab que
// hospeda o MenuCapturaVerde. A tab fornece o conjunto que deve
// aparecer ANTES das 4 acoes de captura no sheet. Permite que o FAB
// verde unificado absorva o papel do FAB proprio da tab ("Adicionar
// marco" em Marcos, "Adicionar foto" em Fotos, "Novo treino" em
// Treinos).
export interface AcaoExtraCaptura {
  label: string;
  icone: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}

export interface MenuCapturaVerdeProps {
  // Disparado apos qualquer captura concluida com sucesso (foto/audio/
  // video/frase). Caller usa para recarregar galerias relevantes.
  onCapturaConcluida?: () => void;
  // M34.3: acoes contextuais da tab atual. Renderizadas acima das 4
  // acoes de captura. Quando vazio/undefined o sheet mantem layout M34
  // original (4 itens).
  acoesExtras?: ReadonlyArray<AcaoExtraCaptura>;
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
  acoesExtras,
}: MenuCapturaVerdeProps): ReactNode {
  const sheetRef = useRef<BottomSheetRef>(null);
  const fraseRef = useRef<BottomSheetRef>(null);
  const [pressed, setPressed] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resetFrase, setResetFrase] = useState(0);
  const setSheetCapturaAberto = useNavegacao(
    (s) => s.setSheetCapturaAberto
  );

  const abrirMenu = useCallback(() => {
    setSheetCapturaAberto(true);
    haptics.fab();
    sheetRef.current?.expand();
  }, [setSheetCapturaAberto]);

  const fecharMenu = useCallback(() => {
    setSheetCapturaAberto(false);
    sheetRef.current?.close();
  }, [setSheetCapturaAberto]);

  // Sincroniza flag global quando o usuario fecha por gesto pan-down
  // ou quando o gorhom emite snap-change (index === -1 e' fechado).
  // Tambem cobre transicoes do SheetFrase, que e' filho deste menu —
  // se ambos estiverem fechados, FABMenu pode reaparecer.
  const handleSheetChange = useCallback(
    (idx: number) => {
      if (idx === -1) {
        setSheetCapturaAberto(false);
      } else {
        setSheetCapturaAberto(true);
      }
    },
    [setSheetCapturaAberto]
  );

  const handleFraseChange = useCallback(
    (idx: number) => {
      if (idx === -1) {
        setSheetCapturaAberto(false);
      } else {
        setSheetCapturaAberto(true);
      }
    },
    [setSheetCapturaAberto]
  );

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
    // Mantem flag sheetCapturaAberto=true durante a transicao
    // (menu->frase). fecharMenu zeraria a flag e o FAB roxo piscaria
    // visivel na janela de 200ms; reafirmamos true logo apos.
    sheetRef.current?.close();
    setSheetCapturaAberto(true);
    setResetFrase((n) => n + 1);
    setTimeout(() => fraseRef.current?.expand(), 200);
  }, [setSheetCapturaAberto]);

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
        onChange={handleSheetChange}
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
          {acoesExtras?.map((acao) => (
            <AcaoMenuItem
              key={acao.accessibilityLabel}
              icone={acao.icone}
              label={acao.label}
              onPress={() => {
                fecharMenu();
                acao.onPress();
              }}
              accessibilityLabel={acao.accessibilityLabel}
            />
          ))}
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

      <BottomSheet
        ref={fraseRef}
        snapPoints={SHEET_60}
        index={-1}
        onChange={handleFraseChange}
      >
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
