// M27.3: store leve sem persist para latch global de "app pronto".
// Fica em memoria so durante a sessao; nao precisa hidratar do
// SecureStore (seria recursivo, ja que e o agregador da hidratacao
// das outras stores).
//
// Por que store global e nao ref local em _layout?
//   - useAppPronto pode ser chamado de outros componentes (testes,
//     futuros gates) e todos precisam ver o mesmo latch.
//   - Selector estavel (zustand) evita re-render em cascata quando
//     so muda o status de hidratacao parcial.
//
// Idempotencia: marcarPronto() so vira true uma vez. Chamadas
// subsequentes sao no-op.
//
// Comentarios sem acento.
import { create } from 'zustand';

interface BootStatusStore {
  pronto: boolean;
  marcarPronto: () => void;
  // Reset somente para testes -- producao nunca chama. Documentado
  // em CONTRACT secao 7.9 (boot e mono-direcional).
  __resetParaTeste: () => void;
}

export const useBootStatus = create<BootStatusStore>((set, get) => ({
  pronto: false,
  marcarPronto: () => {
    if (get().pronto) return;
    set({ pronto: true });
  },
  __resetParaTeste: () => set({ pronto: false }),
}));

// Selector estavel exportado para evitar inline arrow em consumidores
// (cada inline cria selector novo e re-subscribe em cada render).
export const selectBootPronto = (s: BootStatusStore): boolean => s.pronto;
