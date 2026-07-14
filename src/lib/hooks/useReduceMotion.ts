// R-AUDIT-A11Y-MOVIMENTO (2026-07-13): fonte unica de verdade
// "posso animar?". Combina o reduce-motion do sistema (Android/web)
// com um toggle explicito em Configuracoes.
//
// OR simples (decisao TRAVADA do dono, spec §3.5): o toggle SO
// adiciona reducao, nunca desfaz o pedido do sistema. Se o sistema
// pede reducao, o app reduz -- o toggle nao pode forcar animacao
// contra o sistema. E' a postura mais segura para o publico
// vulneravel (autismo/TDAH/ansiedade).
//
// A28-safe: roda no boot path (OuroborosLoader em _layout). Sem Moti
// nem Reanimated -- apenas useState/useEffect + bridge JS de
// AccessibilityInfo + selector do store de settings. Antes da
// hidratacao do store, o toggle cai no default false; a deteccao de
// sistema ja funciona via bridge nativa, entao o boot ja respeita o
// sistema mesmo antes de o toggle hidratar.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSettings } from '@/lib/stores/settings';

export function useReduceMotion(): boolean {
  // Estado do reduce-motion do sistema. Em web o react-native-web
  // mapeia isReduceMotionEnabled para matchMedia('(prefers-reduced-
  // motion: reduce)'), cobrindo prefers-reduced-motion sem branch
  // manual.
  const [reduzirSistema, setReduzirSistema] = useState(false);
  const reduzirToggle = useSettings((s) => s.featureToggles.reduzirMovimento);

  useEffect(() => {
    let ativo = true;
    // Leitura inicial no mount.
    void AccessibilityInfo.isReduceMotionEnabled().then((valor) => {
      if (ativo) setReduzirSistema(valor);
    });
    // Reage a mudanca em runtime: usuario liga/desliga a reducao de
    // animacoes do sistema com o app aberto. Guarda o remove() no
    // cleanup para nao vazar listener.
    const inscricao = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (valor) => {
        if (ativo) setReduzirSistema(valor);
      }
    );
    return () => {
      ativo = false;
      inscricao.remove();
    };
  }, []);

  return reduzirSistema || Boolean(reduzirToggle);
}
