// Modal sheet wrap sobre abrirScanner. Nao renderiza viewfinder
// próprio: o pacote nativo @dariyd/react-native-document-scanner
// entrega UI completa (câmera, detecção de cantos, deskew). O
// componente apenas:
//   1. Mostra um botao primario CTA "Capturar nota".
//   2. Le qualidadeScanner do useSettings.
//   3. Chama abrirScanner e trata a discriminated union.
//   4. Em sucesso, navega para /scanner/preview com URIs em params.
//   5. Em cancelamento, fica silencioso (usuário voltou).
//   6. Em erro, mostra toast vermelho.
import { useState } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { Button, EmptyState, useToast } from '@/components/ui';
import { useSettings } from '@/lib/stores/settings';
import { haptics } from '@/lib/haptics';
import { abrirScanner } from '@/lib/scanner/launch';

export function ScannerSheet() {
  const router = useRouter();
  const toast = useToast();
  const qualidade = useSettings((s) => s.sync.qualidadeScanner);
  const [carregando, setCarregando] = useState(false);

  async function aoCapturar() {
    if (carregando) return;
    setCarregando(true);
    await haptics.medium();
    try {
      const resultado = await abrirScanner(qualidade);
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
