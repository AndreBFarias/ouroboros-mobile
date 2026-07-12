// Hook generico de auto-save de rascunho de formulario (M24).
//
// Recebe a chave do rascunho no useSessao e o snapshot atual do
// estado do form; debounced internamente em DEBOUNCE_PADRAO_MS para
// evitar chamada de SecureStore a cada keystroke. Cleanup cancela o
// timer pendente ao desmontar a tela ou ao trocar valor antes do
// debounce disparar.
//
// O caller continua responsavel por chamar limparRascunho ao salvar
// o registro com sucesso (ver useSessao.getState().limparRascunho).
//
// Comentarios sem acento (convencao shell/CI).
import { useEffect, useRef } from 'react';
import {
  useSessao,
  type RascunhoKey,
  type RascunhoTipo,
} from '@/lib/stores/sessao';

export const DEBOUNCE_PADRAO_MS = 500;

export function useAutoSaveRascunho<K extends RascunhoKey>(
  chave: K,
  valor: RascunhoTipo<K>,
  debounceMs: number = DEBOUNCE_PADRAO_MS
): void {
  // Mantem a referencia do timer entre renders sem disparar re-render
  // por mudanca; setTimeout retorna NodeJS.Timeout em RN/Node e
  // number em web. Tipamos como ReturnType pra cobrir ambos sem any.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cancela timer anterior antes de criar novo. Garantia que
    // mudancas em rajada (ex: usuario digitando) so persistem ao
    // parar por debounceMs.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    timerRef.current = setTimeout(() => {
      useSessao.getState().salvarRascunho(chave, valor);
      timerRef.current = null;
    }, debounceMs);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [chave, valor, debounceMs]);
}
