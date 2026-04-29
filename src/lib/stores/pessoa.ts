// Store de identidade de pessoa. Mantem dois eixos:
//   - pessoaAtiva: quem esta usando o app neste momento (autor de novos
//     registros). Nao aceita 'ambos' porque novo registro tem autor unico.
//   - filtroPessoa: lente de visualizacao, aceita 'ambos' para listas
//     combinadas.
// Persist via SecureStore para preservar nomes reais entre sessoes.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PESSOAS_CONFIG } from '@/config/pessoas.config';
import type { PessoaAutor, PessoaId } from '@/lib/schemas/pessoa';
import { secureStorage } from '@/lib/stores/persist';

interface PessoaStore {
  pessoaAtiva: PessoaAutor;
  filtroPessoa: PessoaId;
  nomes: Record<PessoaAutor, string>;
  // URI local da foto de perfil (apos copiar para documentDirectory).
  // null = sem foto, fallback para inicial em fundo colorido.
  fotos: Record<PessoaAutor, string | null>;
  setPessoaAtiva: (p: PessoaAutor) => void;
  setFiltroPessoa: (p: PessoaId) => void;
  setNome: (p: PessoaAutor, nome: string) => void;
  setFoto: (p: PessoaAutor, uri: string | null) => void;
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
      setNome: (p, nome) =>
        set((s) => ({ nomes: { ...s.nomes, [p]: nome } })),
      setFoto: (p, uri) =>
        set((s) => ({ fotos: { ...s.fotos, [p]: uri } })),
    }),
    {
      name: 'ouroboros.pessoa.v1',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);

// Resolve nome de exibicao para qualquer PessoaId (inclui 'ambos').
// Para autores (pessoa_a/b), pega do store; para 'ambos', pega do config.
export function nomeDe(pessoa: PessoaId): string {
  if (pessoa === 'ambos') return PESSOAS_CONFIG.ambos.nome;
  const { nomes } = usePessoa.getState();
  return nomes[pessoa] ?? PESSOAS_CONFIG[pessoa].nome;
}
