// R-CRIT-1 (2026-05-15): handler declarativo da rota
// `:/oauthredirect`. Sem este arquivo, quando o Google redireciona
// de volta via deep link `com.googleusercontent.apps.<id>:/oauthredirect?
// code=...&state=...`, o Android entrega o intent ao app e o
// expo-router tenta resolver o path `/oauthredirect`. Sem rota
// declarada, caia em `+not-found` exibindo a URL bruta na UI -- o
// que (a) confunde o usuario e (b) vaza o parametro `code` OAuth.
//
// Q22.B (alpha-9) ja deixou a chamada de WebBrowser.maybeComplete
// AuthSession() top-level em app/_layout.tsx. Em muitos cenarios
// (cold boot, app fechado), essa chamada captura o callback antes
// que o expo-router resolva a rota. Mas em warm boot (multitasking,
// Custom Tab ainda viva) o handshake pode chegar via Linking event
// depois do roteador, e a rota /oauthredirect e' o que aparece na
// pilha de navegacao.
//
// Esta rota:
// - chama maybeCompleteAuthSession() de novo no mount (idempotente)
//   para garantir que o cookie da Custom Tab seja descartado e o
//   AuthRequest.promptAsync interno resolva com o code;
// - redireciona o usuario para a ultima rota restauravel ou para
//   /settings/integracoes (origem mais provavel do fluxo de
//   conectar Google Calendar);
// - NAO renderiza a URL bruta em nenhuma circunstancia -- mostra
//   apenas um loader sobrio. O `code` OAuth fica em queryParams
//   mas nunca chega ao DOM.
//
// Comentarios em codigo sem acento (convencao shell/CI). Strings de
// UI nao existem nesta rota (so loader visual).
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { OuroborosLoader } from '@/components/brand';
import { colors } from '@/theme/tokens';
import { useSessao } from '@/lib/stores/sessao';
import { isRotaRestauravel } from '@/lib/hooks/useUltimaRota';

// Destino canonico quando nao ha ultima rota valida. Origem mais
// provavel do fluxo OAuth de Google Calendar (Q22.B).
const DESTINO_FALLBACK = '/settings/integracoes';

export default function OAuthRedirect() {
  const router = useRouter();
  // Lock por mount: evita re-disparar a navegacao se o efeito
  // re-executar (Strict Mode dev, hot reload em web).
  const redirecionadoRef = useRef<boolean>(false);

  useEffect(() => {
    if (redirecionadoRef.current) return;
    redirecionadoRef.current = true;

    // Idempotente: se ja foi chamado top-level em _layout, este
    // segundo call e' no-op no web e no native. Defensive call
    // garante o caso de warm boot onde o app ja estava vivo e o
    // _layout nao re-executou o side-effect top-level.
    try {
      WebBrowser.maybeCompleteAuthSession();
    } catch {
      // Plataforma sem suporte (web sem Custom Tab) -- nada a fazer.
    }

    // Tenta restaurar a ultima rota visitada antes do OAuth flow.
    // Caso comum: usuario estava em /settings/integracoes, clicou
    // Conectar, Custom Tab abriu, retornou aqui. ultimaRota deve
    // apontar para /settings/integracoes.
    const ultima = useSessao.getState().ultimaRota;
    const destino = isRotaRestauravel(ultima) && ultima ? ultima : DESTINO_FALLBACK;

    // replace para nao deixar /oauthredirect na pilha de back.
    router.replace(destino as Parameters<typeof router.replace>[0]);
  }, [router]);

  // UI minima: mesma identidade visual do boot. NAO renderiza
  // params nem URL. O usuario ve loader sobrio enquanto o
  // redirect resolve (tipicamente <50ms).
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bgPage,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <OuroborosLoader />
    </View>
  );
}
