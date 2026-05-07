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
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  useOptionalToast,
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
import { comTimeout } from '@/lib/util/comTimeout';
import { useSafeBottomMargin } from './safeBottom';

const FAB_SIZE = 56;

// I-DIARIO (M-SAVE-DIARIO-VALIDA, 2026-05-07): comTimeout extraido
// para @/lib/util/comTimeout (helper canonico do Bloco I). FRASE,
// HUMOR e DIARIO importam daqui agora; o default 10s vive no helper.

// I-VIDEO (M-SAVE-VIDEO-VALIDA, 2026-05-07): timeout de save de video
// e' 15s (vs default 10s). Justificativa: copy de mp4 com 30-60s pode
// passar de 5s em devices com /sdcard saturada; 15s cobre p99 sem
// frustrar o usuario.
const TIMEOUT_VIDEO_MS = 15_000;

// I-FOTO (M-SAVE-FOTO-VALIDA, 2026-05-07): timeout de save de foto e'
// 30s. Justificativa: copy SAF de jpg/png em OEMs MIUI/OneUI/HyperOS
// pode passar de 10s quando o storage scoped esta saturado ou quando
// o asset vem da nuvem (Google Photos sync); 30s cobre p99 sem
// frustrar o usuario. Tambem cobre o tempo de pegar permissao na
// primeira captura (J1) + abrir o picker + escolher.
const TIMEOUT_FOTO_MS = 30_000;

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
  // M-CAPTURA-UNIFICADA: quando true, o sheet expande automaticamente
  // 1 frame apos a montagem. Usado por SaudeFisicaScreen quando a
  // rota /saude-fisica recebe ?abrirCaptura=1 (vinda de /captura ->
  // "Registrar momento"). Sem isto, o usuario teria que tocar no FAB
  // verde de novo. Acionado apenas uma vez por mount via ref interno.
  abrirNoMount?: boolean;
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
  abrirNoMount,
}: MenuCapturaVerdeProps): ReactNode {
  const sheetRef = useRef<BottomSheetRef>(null);
  const fraseRef = useRef<BottomSheetRef>(null);
  const [pressed, setPressed] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resetFrase, setResetFrase] = useState(0);
  // I-FRASE: useOptionalToast em vez de useToast porque tests/app
  // renderizam MenuCapturaVerde sem ToastProvider. Em runtime real
  // (root layout monta ToastProvider) o comportamento e identico ao
  // useToast; em testes isolados retorna no-op em vez de throw.
  const toast = useOptionalToast();
  // M-CAPTURA-UNIFICADA: lock para garantir que abrirNoMount dispare
  // apenas uma vez por mount. Sem isto, mudancas de prop ou re-renders
  // do MemoriasScreen poderiam reciclar o sheet involuntariamente.
  const abriuAutomaticoRef = useRef<boolean>(false);
  const setSheetCapturaAberto = useNavegacao(
    (s) => s.setSheetCapturaAberto
  );
  const insets = useSafeAreaInsets();
  // K4 (M-FAB-MENU-SAFE-BOTTOM, 2026-05-07): margem canonica = max(24dp,
  // 10% da altura) + inset.bottom. Mesma regra do FABMenu roxo para
  // garantir que ambos fiquem acima da nav bar Android.
  const marginBottomCanonico = useSafeBottomMargin(insets.bottom);

  const abrirMenu = useCallback(() => {
    setSheetCapturaAberto(true);
    haptics.fab();
    sheetRef.current?.expand();
  }, [setSheetCapturaAberto]);

  // M-CAPTURA-UNIFICADA: dispara expand 1 frame apos mount quando
  // abrirNoMount=true. setTimeout(0) garante que o sheet ja montou
  // a arvore interna antes de tentar expandir (evita Armadilha A17:
  // race com hidratacao + ref nula no primeiro render).
  useEffect(() => {
    if (!abrirNoMount) return;
    if (abriuAutomaticoRef.current) return;
    abriuAutomaticoRef.current = true;
    const t = setTimeout(() => {
      setSheetCapturaAberto(true);
      sheetRef.current?.expand();
    }, 0);
    return () => clearTimeout(t);
  }, [abrirNoMount, setSheetCapturaAberto]);

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

  // I-FOTO (M-SAVE-FOTO-VALIDA, 2026-05-07): handler com padrao
  // canonico try/catch + comTimeout (30s para fotos que podem ser
  // grandes ou vir do Google Photos sync) + toasts PT-BR. Vault nao
  // conectado / erro de copy / timeout viram toast vermelho com
  // mensagem clara em vez de silenciar. Cancel do picker (ok=false
  // sem throw) nao mostra toast — usuario decidiu cancelar e nao
  // precisa de feedback.
  //
  // Race fix obrigatorio (spec §7): o sheet so fecha APOS o save
  // resolver (sucesso OU erro). Antes, fecharMenu() era chamado
  // sincrono no onPress, e em devices lentos o sheet ja estava
  // fechado quando o copy SAF falhava — usuario nao via o toast
  // amarelado e ficava sem feedback. Custo: sheet fica aberto ~1-2s
  // (mais quando o usuario interage com o picker). Aceito.
  const handleFoto = useCallback(async () => {
    setSalvando(true);
    try {
      const r = await comTimeout(
        capturarFoto({ origem: 'galeria' }),
        TIMEOUT_FOTO_MS
      );
      if (r.ok) {
        toast.show('Foto salva.', 'success');
        tratarSucesso();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      // eslint-disable-next-line no-console
      console.error('save foto fail', e);
    } finally {
      setSalvando(false);
      fecharMenu();
    }
  }, [fecharMenu, toast, tratarSucesso]);

  const handleMusica = useCallback(async () => {
    fecharMenu();
    setSalvando(true);
    const r = await capturarMusica();
    setSalvando(false);
    if (r.ok) tratarSucesso();
  }, [fecharMenu, tratarSucesso]);

  // I-VIDEO (M-SAVE-VIDEO-VALIDA, 2026-05-07): handler com padrao
  // canonico try/catch + comTimeout (15s para videos que podem ser
  // longos) + toasts PT-BR. Vault nao conectado / erro de copy /
  // timeout viram toast vermelho com mensagem clara em vez de
  // silenciar. Cancel do picker (ok=false sem throw) nao mostra
  // toast — usuario decidiu cancelar e nao precisa de feedback.
  const handleVideo = useCallback(async () => {
    fecharMenu();
    setSalvando(true);
    try {
      const r = await comTimeout(
        capturarVideo({ origem: 'galeria' }),
        TIMEOUT_VIDEO_MS
      );
      if (r.ok) {
        toast.show('Vídeo salvo.', 'success');
        tratarSucesso();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível salvar: ${msg}`, 'error');
      // eslint-disable-next-line no-console
      console.error('save video fail', e);
    } finally {
      setSalvando(false);
    }
  }, [fecharMenu, toast, tratarSucesso]);

  const handleAbrirFrase = useCallback(() => {
    // Mantem flag sheetCapturaAberto=true durante a transicao
    // (menu->frase). fecharMenu zeraria a flag e o FAB roxo piscaria
    // visivel na janela de 200ms; reafirmamos true logo apos.
    sheetRef.current?.close();
    setSheetCapturaAberto(true);
    setResetFrase((n) => n + 1);
    setTimeout(() => fraseRef.current?.expand(), 200);
  }, [setSheetCapturaAberto]);

  // I-FRASE: handler do botao "Salvar" do SheetFrase. Padrao canonico
  // try/catch + timeout + toast. Em sucesso, fecha sheet e exibe toast
  // verde "Frase salva." (PT-BR sentence case + acentuacao). Em falha,
  // mantem sheet aberto e exibe toast vermelho com a mensagem do erro.
  const handleSalvarFrase = useCallback(
    async (payload: { frase: string; para: Para }) => {
      setSalvando(true);
      try {
        const r = await comTimeout(
          salvarFrase({ frase: payload.frase, para: payload.para })
        );
        if (r.ok) {
          toast.show('Frase salva.', 'success');
          fraseRef.current?.close();
          tratarSucesso();
        } else {
          toast.show('Não foi possível salvar a frase.', 'error');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.show(`Não foi possível salvar: ${msg}`, 'error');
        // eslint-disable-next-line no-console
        console.error('save frase fail', e);
      } finally {
        setSalvando(false);
      }
    },
    [toast, tratarSucesso]
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
          bottom: marginBottomCanonico,
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
