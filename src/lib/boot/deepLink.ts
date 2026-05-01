// Hook de boot: registra listener de deep link para share intent.
// M00.5 criou o esqueleto; M08 estendeu para reconhecer action.SEND
// e extrair mime type + origem alem da uri.
//
// Comportamento atual:
//   - Escuta `Linking.addEventListener('url', handler)`.
//   - Se a URL contem `?uri=...`, encaminha para `/share-receive`
//     com uri + mime + origem + nome (todos opcionais alem de uri).
//   - URL malformada não quebra (try/catch envolve o parse).
//
// Em Android nativo, a activity de share (configurada como
// singleTask em app.json) recebe o intent action.SEND e o
// expo-linking entrega a URL deep link para esse listener; cabe ao
// app interpretar os params como SharedIntentInput.
//
// Idempotencia: o cleanup remove o listener ao desmontar; re-mount
// registra um novo. Hook seguro para chamar em RootLayout.
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

// Estrutura dos parametros conhecidos do share intent. Mantem
// nullable para refletir o fato de que o emissor pode omitir mime,
// nome ou origem; o consumidor (Tela 17) lida com defaults.
export interface SharedIntentParams {
  readonly uri: string;
  readonly mime: string | null;
  readonly nome: string | null;
  readonly origem: string | null;
}

// Útil interno: pega primeiro valor string de queryParam que pode
// vir string ou string[] do Linking.parse.
function pickStringParam(
  value: string | string[] | undefined
): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }
  return null;
}

// Extrai o param `uri` de um deep link arbitrario. Devolve null
// quando a URL não tem o param ou e malformada. Mantida para
// preservar compat com tests da M00.5.
export function extractShareUri(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    return pickStringParam(parsed.queryParams?.uri);
  } catch {
    return null;
  }
}

// Extrai todos os params relevantes do share intent. uri e
// obrigatório; mime, nome e origem são opcionais. Retorna null
// quando uri ausente.
export function parseSharedUrl(url: string): SharedIntentParams | null {
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams ?? {};
    const uri = pickStringParam(q.uri);
    if (!uri) return null;
    return {
      uri,
      mime: pickStringParam(q.mime),
      nome: pickStringParam(q.nome),
      origem: pickStringParam(q.origem),
    };
  } catch {
    return null;
  }
}

// Roteador externo aceita o handler. Separado para facilitar testes
// sem precisar mockar `expo-router` inteiro. Encaminha todos os
// params extraidos do share intent para a rota /share-receive.
export function handleSharedUrl(url: string): void {
  const params = parseSharedUrl(url);
  if (!params) return;
  try {
    // Constroi objeto de params somente com chaves não nulas para
    // que a query gerada pelo router fique limpa quando o intent
    // emissor omitir campos opcionais.
    const out: Record<string, string> = { uri: params.uri };
    if (params.mime) out.mime = params.mime;
    if (params.nome) out.nome = params.nome;
    if (params.origem) out.origem = params.origem;
    router.push({
      pathname: '/share-receive' as never,
      params: out,
    });
  } catch {
    // Falha de roteamento (rota não registrada em ambiente de teste,
    // por exemplo) e silenciada para não crashar boot.
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
