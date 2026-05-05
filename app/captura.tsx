// Sprint M-CAPTURA-UNIFICADA. Rota raiz transparentModal que ramifica
// o item "Camera" do MenuLateral em duas escolhas semanticas:
//   - Registrar momento -> /memoria?abrirCaptura=1 (MenuCapturaVerde
//     abre automaticamente em Memorias).
//   - Escanear documento -> /scanner (ScannerSheet M09; em ambiente
//     sem dev-client mostra empty state honesto via comportamento
//     existente).
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
  type BottomSheetRef,
} from '@/components/ui';
import { OuroborosLoader } from '@/components/brand';
import { SheetEscolhaCaptura } from '@/components/screens/SheetEscolhaCaptura';

export default function Captura() {
  const router = useRouter();
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleRegistrarMomento = useCallback(() => {
    sheetRef.current?.close();
    // Replace evita acumular entrada de historico que volte ao /captura
    // (modal one-shot ja consumido). Cast template literal -- a query
    // ?abrirCaptura=1 e' lida em MemoriasScreen via useLocalSearchParams.
    router.replace(
      '/memoria?abrirCaptura=1' as Parameters<typeof router.replace>[0]
    );
  }, [router]);

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
          onRegistrarMomento={handleRegistrarMomento}
          onEscanearDocumento={handleEscanearDocumento}
        />
      </BottomSheet>
    </Screen>
  );
}
