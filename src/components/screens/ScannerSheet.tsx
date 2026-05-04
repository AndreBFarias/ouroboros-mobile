// Modal sheet wrap sobre abrirScanner. Nao renderiza viewfinder
// proprio: o pacote nativo @dariyd/react-native-document-scanner
// entrega UI completa (camera, deteccao de cantos, deskew). O
// componente apenas:
//   1. Mostra um botao primario CTA "Capturar nota".
//   2. Usa qualidade 'maxima' (sprint M29 removeu o seletor; sempre
//      maximo, sem compressao adicional).
//   3. Chama abrirScanner e trata a discriminated union.
//   4. Em sucesso, navega para /scanner/preview com URIs em params.
//   5. Em cancelamento, fica silencioso (usuario voltou).
//   6. Em erro, mostra toast vermelho.
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { Button, EmptyState, useToast } from '@/components/ui';
import { haptics } from '@/lib/haptics';
import { abrirScanner } from '@/lib/scanner/launch';

// Sprint M29: qualidade fixa 'maxima'. Antes vinha de
// useSettings.sync.qualidadeScanner; o seletor foi removido da UI.
const QUALIDADE_FIXA = 'maxima' as const;

export function ScannerSheet() {
  const router = useRouter();
  const toast = useToast();
  const [carregando, setCarregando] = useState(false);

  async function aoCapturar() {
    if (carregando) return;
    setCarregando(true);
    await haptics.medium();
    try {
      const resultado = await abrirScanner(QUALIDADE_FIXA);
      if (!resultado.ok) {
        if (resultado.erro.tipo === 'cancelado') {
          return;
        }
        toast.show('Falha ao abrir o scanner.', 'error');
        return;
      }
      const uris = resultado.imagens.map((i) => i.uri).join('|');
      // Cast para Href: o gerador de typed routes ainda não re-rodou
      // para incluir /scanner/preview, mas a rota existe em runtime.
      router.push(
        `/scanner/preview?uris=${encodeURIComponent(uris)}` as unknown as Href
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 24 }}>
      <EmptyState
        Icon={Camera}
        frase="Toque em capturar para abrir o scanner. Múltiplas páginas viram um PDF único."
      />
      <Button
        label={carregando ? 'Abrindo...' : 'Capturar nota'}
        onPress={aoCapturar}
        variant="primary"
        disabled={carregando}
      />
    </View>
  );
}
