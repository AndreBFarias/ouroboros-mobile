// Rota raiz da Tela 16 (Scanner). Substitui o stub idempotente da
// M04: agora dispara o modal nativo do @dariyd/react-native-document-
// scanner via ScannerSheet. O modal nativo cuida do viewfinder,
// detecção de cantos e deskew; aqui so orquestramos a entrada.
//
// Sub-rota /scanner/preview recebe URIs e roda OCR + form de validacao.
import { useRouter } from 'expo-router';
import { Header, Screen } from '@/components/ui';
import { ScannerSheet } from '@/components/screens/ScannerSheet';

export default function Scanner() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="Scanner" onBack={() => router.back()} />
      <ScannerSheet />
    </Screen>
  );
}
