// Hook de boot: registra listener de deep link para share intent.
// Esqueleto idempotente. M08 plugara o fluxo real de share-receive
// quando implementar a tela de inbox de arquivos compartilhados.
//
// Comportamento atual:
//   - Escuta `Linking.addEventListener('url', handler)`.
//   - Se a URL contem `?uri=...`, encaminha para `/share-receive`.
//   - URL malformada nao quebra (try/catch envolve o parse).
//
// Idempotencia: o cleanup remove o listener ao desmontar; re-mount
// registra um novo. Hook seguro para chamar em RootLayout.
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

// Extrai o param `uri` de um deep link arbitrario. Devolve null
// quando a URL nao tem o param ou e malformada.
export function extractShareUri(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const uri = parsed.queryParams?.uri;
    if (typeof uri === 'string' && uri.length > 0) return uri;
    if (Array.isArray(uri) && uri.length > 0 && typeof uri[0] === 'string') {
      return uri[0];
    }
    return null;
  } catch {
    return null;
  }
}

// Roteador externo aceita o handler. Separado para facilitar testes
// sem precisar mockar `expo-router` inteiro.
export function handleSharedUrl(url: string): void {
  const uri = extractShareUri(url);
  if (!uri) return;
  try {
    router.push({
      pathname: '/share-receive' as never,
      params: { uri },
    });
  } catch {
    // Rota /share-receive ainda nao existe (M08 cria); silencia erro
    // para nao crashar boot.
  }
}

export function useDeepLinkListener(): void {
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleSharedUrl(url);
    });
    return () => {
      subscription.remove();
    };
  }, []);
}
