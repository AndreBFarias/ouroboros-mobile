// Store da cor que identifica cada pessoa (P7 das decisoes de
// 2026-09-08, "as cores de pessoa viram default editavel").
//
// O QUE MUDOU
//
// #bd93f9 e #ff79c6 continuam sendo os defaults, e continuam morando em
// src/config/pessoas.config.ts. O que deixou de valer e' a parte
// "inviolaveis": quem instala pode trocar em Configuracoes, e quem nao
// mexer segue com a identidade visual do projeto. Este store e' a
// camada de runtime que sustenta essa troca -- o config nao muda, e por
// isso nao existe recompilar nem editar arquivo para adaptar o
// aplicativo a outra pessoa (mesmo raciocinio da ADR-0015 para nomes).
//
// A TROCA NAO E' LIVRE, E ISSO E' PARTE DO DESENHO
//
// definirCor MEDE antes de guardar (src/lib/a11y/corPessoa.ts) e recusa
// cor que reprove, devolvendo a avaliacao para a interface explicar o
// motivo. A recusa mora aqui, e nao so' na tela, de proposito: se
// amanha outra tela quiser oferecer a troca, ela herda o mesmo piso sem
// precisar lembrar de medir. Uma cor ilegivel guardada e' pior que a
// troca nao existir -- some a informacao que a cor carrega.
//
// ONDE O VALOR MORA
//
// SecureStore via o adapter secureStorage, que cai em localStorage no
// Web (armadilha A15, e e' o que permite o Gauntlet exercitar isto).
// Sao 7 caracteres por pessoa: cabe folgado no limite de ~2KB do
// SecureStore (A20).
//
// LIMITE CONHECIDO, DECLARADO PARA NAO PARECER BUG: o widget da tela
// inicial guarda a cor no payload nativo. Ele nao observa este store; a
// cor nova chega ao widget na proxima atualizacao. A tela de troca
// forca uma (atualizarWidgetHomescreen({ forcar: true })), o que resolve
// o caso normal; se o widget estiver desligado nas features, nada
// acontece, que e' o comportamento correto.
//
// Comentarios sem acento (convencao dos modulos vizinhos de stores).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { corDe } from '@/config/pessoas.config';
import { colors } from '@/theme/tokens';
import type { PessoaAutor, PessoaId } from '@/lib/schemas/pessoa';
import { secureStorage } from '@/lib/stores/persist';
import {
  avaliarCorPessoa,
  type AvaliacaoCorPessoa,
} from '@/lib/a11y/corPessoa';

// Defaults derivados do config -- nao repetidos aqui. Repetir o hex
// criaria um segundo lugar para mudar a identidade visual, e um dos
// dois ficaria para tras.
export const CORES_PESSOA_DEFAULT: Record<PessoaAutor, string> = {
  pessoa_a: corDe('pessoa_a'),
  pessoa_b: corDe('pessoa_b'),
};

export interface CoresPessoaState {
  cores: Record<PessoaAutor, string>;
  // Guarda a cor SE ela passar na medida de contraste. Devolve sempre a
  // avaliacao: `ok: true` quando guardou, `ok: false` com o motivo e as
  // razoes quando recusou. Quem chama nao precisa medir de novo.
  definirCor: (pessoa: PessoaAutor, valor: string) => AvaliacaoCorPessoa;
  restaurarPadrao: (pessoa: PessoaAutor) => void;
}

const STORAGE_KEY = 'ouroboros.cores-pessoa.v1';

export const useCoresPessoa = create<CoresPessoaState>()(
  persist(
    (set) => ({
      cores: { ...CORES_PESSOA_DEFAULT },
      definirCor: (pessoa, valor) => {
        const avaliacao = avaliarCorPessoa(valor);
        if (!avaliacao.ok || avaliacao.cor === null) return avaliacao;
        set((s) => ({ cores: { ...s.cores, [pessoa]: avaliacao.cor } }));
        return avaliacao;
      },
      restaurarPadrao: (pessoa) =>
        set((s) => ({
          cores: { ...s.cores, [pessoa]: CORES_PESSOA_DEFAULT[pessoa] },
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ cores: s.cores }),
      merge: mergeCoresPessoaPersistido,
    }
  )
);

// Higieniza o que veio do armazenamento. Duas coisas acontecem aqui:
//
//   1. Deep-merge dos defaults (armadilha A47): chave ausente cai no
//      default em vez de hidratar `undefined`. Sem isto, uma instalacao
//      antiga -- gravada antes desta sprint -- pintaria avatar com
//      `undefined` e o React Native cairia em transparente.
//   2. Re-medicao do valor guardado. O que vale para quem escolhe vale
//      para quem restaura: se um valor ilegivel chegar por backup,
//      edicao manual do armazenamento ou por um piso de contraste que
//      ficou mais rigoroso numa versao nova, ele volta ao default em
//      vez de entrar na tela. A alternativa seria confiar que todo
//      caminho de escrita mediu, e um dia um deles nao vai ter medido.
//
// Exportada para o teste exercitar o codigo REAL cabeado em `merge`, e
// nao uma replica tautologica (mesmo padrao de mergePessoaPersistido).
export function mergeCoresPessoaPersistido(
  persistedState: unknown,
  currentState: CoresPessoaState
): CoresPessoaState {
  if (!persistedState || typeof persistedState !== 'object') {
    return currentState;
  }
  const ps = persistedState as { cores?: Record<string, unknown> };
  const guardadas = ps.cores ?? {};
  const cores = { ...CORES_PESSOA_DEFAULT };
  for (const pessoa of Object.keys(cores) as PessoaAutor[]) {
    const bruto = guardadas[pessoa];
    if (typeof bruto !== 'string') continue;
    const avaliacao = avaliarCorPessoa(bruto);
    if (avaliacao.ok && avaliacao.cor !== null) cores[pessoa] = avaliacao.cor;
  }
  return { ...currentState, cores };
}

// 'ambos' reusa a cor de pessoa_a, como sempre reusou (o config
// carrega o mesmo hex nas duas entradas). Derivar em vez de guardar uma
// terceira cor mantem a relacao visual depois da troca: quem escolhe
// verde para pessoa_a ve o card do casal em verde, sem ter que
// descobrir que existia uma terceira cor escondida.
function corPessoaDeEstado(
  cores: Record<PessoaAutor, string>,
  pessoa: PessoaId
): string {
  if (pessoa === 'ambos') return cores.pessoa_a;
  return cores[pessoa] ?? CORES_PESSOA_DEFAULT[pessoa];
}

// Leitura sincrona, para caminhos fora de componente (o payload do
// widget e' o caso real hoje).
export function corPessoa(pessoa: PessoaId): string {
  return corPessoaDeEstado(useCoresPessoa.getState().cores, pessoa);
}

// Leitura reativa, para dentro de componente: a tela repinta quando a
// pessoa troca a cor em Configuracoes, sem precisar reabrir.
export function useCorPessoa(pessoa: PessoaId): string {
  return useCoresPessoa((s) => corPessoaDeEstado(s.cores, pessoa));
}

// Cores oferecidas como atalho na tela de troca. Todas passam na
// medida de contraste -- ha teste que prova, porque oferecer um atalho
// que o proprio aplicativo recusaria seria constrangedor e confuso.
// Sao tokens da paleta do projeto, entao o resultado continua parecendo
// o aplicativo e nao um tema improvisado.
export const CORES_SUGERIDAS: ReadonlyArray<{ hex: string; nome: string }> = [
  { hex: colors.purple, nome: 'Roxo' },
  { hex: colors.pink, nome: 'Rosa' },
  { hex: colors.cyan, nome: 'Azul' },
  { hex: colors.green, nome: 'Verde' },
  { hex: colors.yellow, nome: 'Amarelo' },
  { hex: colors.orange, nome: 'Laranja' },
];
