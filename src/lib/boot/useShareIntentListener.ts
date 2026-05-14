// Q22.G (2026-05-13) -- Listener do share intent nativo via
// expo-share-intent. Substitui (e complementa) o
// useDeepLinkListener legacy que so reagia a deep links
// custom-scheme (`ouroboros://...?uri=...`); intents action.SEND
// reais (Pix, comprovantes, fotos compartilhadas) chegavam aqui
// e nunca ate o JS layer.
//
// Quando hasShareIntent vira true, o hook navega para a rota
// /share-receive com os mesmos params canonicos esperados pelo
// container existente (uri, mime, nome, origem, texto). Reseta o
// share intent nativo no proximo tick para liberar o slot.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect } from 'react';
import { router } from 'expo-router';
import useShareIntent from 'expo-share-intent/build/useShareIntent';

export function useShareIntentListener(): void {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;
    // Mapeia ShareIntent -> params canonicos do /share-receive.
    const params: Record<string, string> = {};
    if (shareIntent.text) params.texto = shareIntent.text;
    const primeiro = shareIntent.files?.[0];
    if (primeiro?.path) params.uri = primeiro.path;
    if (primeiro?.mimeType) params.mime = primeiro.mimeType;
    if (primeiro?.fileName) params.nome = primeiro.fileName;
    if (shareIntent.webUrl) params.origem = shareIntent.webUrl;

    // Se nao houver nem texto nem arquivo, ignora.
    if (!params.texto && !params.uri) {
      resetShareIntent();
      return;
    }

    // Cast via never para satisfazer o typed routes restritivo do
    // expo-router (mesmo padrao do deepLink.ts).
    router.push({
      pathname: '/share-receive' as never,
      params,
    });
    // Limpa o slot nativo no tick seguinte pra evitar re-fire ao
    // voltar pra Home (resetOnBackground default da lib ja cobre,
    // mas garantia extra nao machuca).
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent]);
}
