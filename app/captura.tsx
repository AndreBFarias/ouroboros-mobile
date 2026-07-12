// Sprint M-CAPTURA-UNIFICADA. Rota raiz transparentModal que ramifica
// o item "Camera" do MenuLateral em duas escolhas semanticas:
//
// R-FAB-2 (Onda R Fase 2): "Registrar momento" virou "Reflexao com
// foto" e o caminho mudou. Em vez de navegar para /saude-fisica?
// abrirCaptura=1 (que abria o MenuCapturaVerde), o caller agora:
//   1. Dispara capturarFoto({origem:'camera'}) -- abre a camera real.
//   2. Em sucesso, salva rascunho diarioEmocional com modo='reflexao'
//      e midia=[{tipo:'foto', path: <arquivo relativo>}].
//   3. Faz router.replace('/diario-emocional?modo=reflexao') -- o
//      Diario Emocional inicializa form a partir do rascunho (campo
//      midia preenchido) e abre direto na aba Reflexao.
//   4. Em cancel/erro, simplesmente faz router.back() (volta para a
//      tela anterior sem perda de digitacao em outro lugar).
//
// "Escanear documento" segue intacto -> /scanner (ScannerSheet M09).
//
// Padrao M26: Screen padded={false} opaco por tras + BottomSheet com
// index={0} direto + onChange dispatch router.back quando idx === -1.
// Mitiga Armadilhas A17/A18 (sheet preto se expand falha; o usuario
// sempre ve algo e tem rota de saida via gesto pan-down ou backdrop).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BottomSheet,
  Screen,
  SHEET_60,
  useOptionalToast,
  type BottomSheetRef,
} from '@/components/ui';
import { OuroborosLoader } from '@/components/brand';
import { SheetEscolhaCaptura } from '@/components/screens/SheetEscolhaCaptura';
import { capturarFoto } from '@/lib/midia/capturarFoto';
import { useSessao } from '@/lib/stores/sessao';

export default function Captura() {
  const router = useRouter();
  const toast = useOptionalToast();
  const sheetRef = useRef<BottomSheetRef>(null);

  // R-FAB-2: handler "Reflexao com foto". Fecha o sheet, abre a
  // camera, em sucesso seedeia o rascunho do Diario Emocional com a
  // foto recem-capturada e navega para a tela Reflexao. Em cancel
  // (usuario fechou a camera sem tirar foto), volta para o ponto de
  // origem sem rascunho residual.
  const handleReflexaoComFoto = useCallback(async () => {
    sheetRef.current?.close();
    try {
      const r = await capturarFoto({ origem: 'camera' });
      if (!r.ok || !r.arquivo) {
        // Cancel ou permissao negada: nao polui o rascunho e dismissa
        // o modal. O capturarFoto ja loga o motivo internamente.
        router.back();
        return;
      }
      // Seedeia o rascunho diarioEmocional: caller do Diario Emocional
      // ja inicializa useState com base em useSessao.rascunhos. Modo
      // 'reflexao' e' canonico pos-R0. midia=[{tipo:'foto', path}]
      // pre-anexa o arquivo recem-copiado para o Vault. O usuario ainda
      // tem que digitar texto e tap "Refletir" para persistir o .md
      // do diario; o binario da foto ja esta no Vault desde o
      // capturarFoto (companion .md de midia_foto tambem).
      useSessao.getState().salvarRascunho('diarioEmocional', {
        modo: 'reflexao',
        midia: [{ tipo: 'foto', path: r.arquivo }],
      });
      router.replace('/diario-emocional?modo=reflexao');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.show(`Não foi possível capturar: ${msg}`, 'error');
      console.error('reflexao com foto fail', e);
      router.back();
    }
  }, [router, toast]);

  const handleEscanearDocumento = useCallback(() => {
    sheetRef.current?.close();
    router.replace('/scanner');
  }, [router]);

  return (
    <Screen padded={false}>
      {/* Marca de fundo durante a animacao. pointerEvents='none'
          garante que o sheet continue interativo. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <OuroborosLoader compacto />
      </View>
      <BottomSheet
        ref={sheetRef}
        snapPoints={SHEET_60}
        index={0}
        enablePanDownToClose
        onChange={(idx) => {
          if (idx === -1) {
            router.back();
          }
        }}
      >
        <SheetEscolhaCaptura
          onReflexaoComFoto={() => {
            void handleReflexaoComFoto();
          }}
          onEscanearDocumento={handleEscanearDocumento}
        />
      </BottomSheet>
    </Screen>
  );
}
