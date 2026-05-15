// Store de identidade de pessoa. Mantem dois eixos:
//   - pessoaAtiva: quem esta usando o app neste momento (autor de novos
//     registros). Não aceita 'ambos' porque novo registro tem autor unico.
//   - filtroPessoa: lente de visualizacao, aceita 'ambos' para listas
//     combinadas.
// Persist via SecureStore para preservar nomes reais entre sessoes.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PESSOAS_CONFIG } from '@/config/pessoas.config';
import type { PessoaAutor, PessoaId } from '@/lib/schemas/pessoa';
import { secureStorage } from '@/lib/stores/persist';
import { useOnboarding } from '@/lib/stores/onboarding';

interface PessoaStore {
  pessoaAtiva: PessoaAutor;
  filtroPessoa: PessoaId;
  nomes: Record<PessoaAutor, string>;
  // URI local da foto de perfil (após copiar para documentDirectory).
  // null = sem foto, fallback para inicial em fundo colorido.
  fotos: Record<PessoaAutor, string | null>;
  setPessoaAtiva: (p: PessoaAutor) => void;
  setFiltroPessoa: (p: PessoaId) => void;
  setNome: (p: PessoaAutor, nome: string) => void;
  setFoto: (p: PessoaAutor, uri: string | null) => void;
  // Volta nomes e fotos aos defaults. Útil para reset de onboarding
  // em ambiente de desenvolvimento ou para botao "limpar dados" em
  // settings.
  resetar: () => void;
}

export const usePessoa = create<PessoaStore>()(
  persist(
    (set) => ({
      pessoaAtiva: 'pessoa_a',
      filtroPessoa: 'pessoa_a',
      nomes: {
        pessoa_a: PESSOAS_CONFIG.pessoa_a.nome,
        pessoa_b: PESSOAS_CONFIG.pessoa_b.nome,
      },
      fotos: {
        pessoa_a: null,
        pessoa_b: null,
      },
      setPessoaAtiva: (pessoaAtiva) => set({ pessoaAtiva }),
      setFiltroPessoa: (filtroPessoa) => set({ filtroPessoa }),
      setNome: (p, nome) => set((s) => ({ nomes: { ...s.nomes, [p]: nome } })),
      setFoto: (p, uri) => set((s) => ({ fotos: { ...s.fotos, [p]: uri } })),
      resetar: () =>
        set({
          pessoaAtiva: 'pessoa_a',
          filtroPessoa: 'pessoa_a',
          nomes: {
            pessoa_a: PESSOAS_CONFIG.pessoa_a.nome,
            pessoa_b: PESSOAS_CONFIG.pessoa_b.nome,
          },
          fotos: { pessoa_a: null, pessoa_b: null },
        }),
    }),
    {
      name: 'ouroboros.pessoa.v1',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);

// Resolve nome de exibicao para qualquer PessoaId (inclui 'ambos').
// Para autores (pessoa_a/b), pega do store; para 'ambos', ramifica por
// tipoCompanhia: 'casal' -> 'Casal', 'amigos' -> 'Todos', fallback
// defensivo 'Ambos' (sozinho nunca deveria pedir o label, mas mantem a
// resposta sensata para nao quebrar UI). Versao sincrona usa getState
// (nao reativa) — reservado para logging, sort e util fora de
// componentes.
export function nomeDe(pessoa: PessoaId): string {
  if (pessoa === 'ambos') {
    const { tipoCompanhia } = useOnboarding.getState();
    if (tipoCompanhia === 'casal') return 'Casal';
    if (tipoCompanhia === 'amigos') return 'Todos';
    return 'Ambos';
  }
  const { nomes } = usePessoa.getState();
  return nomes[pessoa] ?? PESSOAS_CONFIG[pessoa].nome;
}

// Versao reativa de nomeDe(): usa o seletor zustand para que componentes
// re-renderizem quando o nome muda (ex: usuario edita em Settings) ou
// quando tipoCompanhia muda em runtime (ex: troca de modo no
// onboarding). Use dentro de componentes; fora deles (logging, sort,
// util sincrono), continue com nomeDe() puro.
export function useNomeDe(pessoa: PessoaId): string {
  const nomeA = usePessoa((s) => s.nomes.pessoa_a);
  const nomeB = usePessoa((s) => s.nomes.pessoa_b);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);
  if (pessoa === 'pessoa_a') {
    return nomeA ?? PESSOAS_CONFIG.pessoa_a.nome;
  }
  if (pessoa === 'pessoa_b') {
    return nomeB ?? PESSOAS_CONFIG.pessoa_b.nome;
  }
  // 'ambos':
  if (tipoCompanhia === 'casal') return 'Casal';
  if (tipoCompanhia === 'amigos') return 'Todos';
  return 'Ambos';
}
