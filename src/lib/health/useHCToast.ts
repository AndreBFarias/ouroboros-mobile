// R-INT-3 (2026-05-16): bridge React entre o emitter de falhas HC
// (`src/lib/health/eventBus.ts`) e o Toast global (ToastProvider em
// `app/_layout.tsx`). Mantem o codigo de sync fora de arvore React,
// concentra toda a logica de exibicao aqui.
//
// Regra de exibicao:
//   - `no_module` em release Android = nao deveria acontecer; em web /
//     Expo Go acontece todo save. Pra evitar spam de toast em dev,
//     suprime `no_module` quando settings.featureToggles.
//     healthConnectSync esta on mas o usuario nao tem o app HC
//     instalado (sintoma esperado). Toast aparece SO em
//     `permission_denied` e `api_error` — sao os casos que confundem
//     o usuario alpha (achar que sync funcionou).
//   - Toast tipo 'warn' (nao 'error') pra deixar claro que o save
//     local SUCESSOU; o HC e' segundo.
//
// Hook standalone: monta um listener no mount, devolve nada. Caller
// renderiza este componente uma unica vez no `_layout.tsx` dentro do
// ToastProvider.
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, type ReactElement } from 'react';
import { useToast } from '@/components/ui';
import {
  subscribeHCSyncFail,
  type HCSyncFailEvent,
} from '@/lib/health/eventBus';

export function useHCToastBridge(): void {
  const toast = useToast();
  useEffect(() => {
    const unsubscribe = subscribeHCSyncFail((event: HCSyncFailEvent) => {
      // Suprime no_module em dev/web (caso esperado). Em release
      // Android sem HC instalado tambem cai aqui — usuario vai notar
      // que o sync nao funciona; nao precisamos de spam de toast a
      // cada save (1 toast e ja viu, repetidos viram fadiga).
      if (event.motivo === 'no_module') return;
      toast.show(event.mensagem, 'warn');
    });
    return unsubscribe;
  }, [toast]);
}

// Componente trampolim. Existe apenas pra ser montado declarativamente
// no _layout, dentro do ToastProvider. Sem JSX (null render) — efeito
// colateral via useEffect do hook acima.
export function HCToastBridge(): ReactElement | null {
  useHCToastBridge();
  return null;
}
