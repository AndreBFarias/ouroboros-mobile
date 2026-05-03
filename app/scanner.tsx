// Rota raiz da Tela 16 (Scanner). Substitui o stub idempotente da
// M04: agora dispara o modal nativo do @dariyd/react-native-document-
// scanner via ScannerSheet. O modal nativo cuida do viewfinder,
// detecção de cantos e deskew; aqui so orquestramos a entrada.
//
// Sub-rota /scanner/preview recebe URIs e roda OCR + form de validacao.
//
// M26: rota ja envolvia <Screen> (fundo Dracula opaco). Adiciona o
// OuroborosLoader compacto centralizado como marca de fundo para
// consistencia com as outras 3 rotas modais (humor-rapido,
// diario-emocional, eventos). Visivel em momentos de transicao da
// camera nativa; pointerEvents='none' garante que o ScannerSheet
// continua interativo.
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Header, Screen } from '@/components/ui';
import { OuroborosLoader } from '@/components/brand';
import { ScannerSheet } from '@/components/screens/ScannerSheet';

export default function Scanner() {
  const router = useRouter();
  return (
    <Screen padded={false}>
      <Header title="Scanner" onBack={() => router.back()} />
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
      <ScannerSheet />
    </Screen>
  );
}
