// UNICO arquivo onde nomes "default" aparecem. Genericos por desenho.
// Nomes reais entram em runtime via store (lib/stores/pessoa.ts) e
// SecureStore. Repositorio nunca contem nome real (Regra -1).
//
// P7 (2026-09-08): a `cor` daqui e' DEFAULT, nao regra. Ate esta data
// #bd93f9 e #ff79c6 eram Regra Inviolavel e so' mudavam recompilando;
// hoje quem instala troca em Configuracoes > Cores das pessoas, e a
// escolha vive em lib/stores/coresPessoa.ts (SecureStore), medida
// contra o piso de contraste de lib/a11y/corPessoa.ts.
//
// Consequencia para quem le este arquivo procurando onde mexer: NAO
// edite o hex daqui para adaptar o aplicativo a outra pessoa -- e' o
// mesmo engano que a instrucao antiga sobre `nome` induzia (ADR-0015).
// Editar aqui muda o ponto de partida de toda instalacao nova; trocar
// a cor de UMA instalacao e' na tela. corDe() devolve o DEFAULT; a cor
// em vigor se le por corPessoa() ou useCorPessoa().
import type { PessoaId } from '@/lib/schemas/pessoa';

export interface PessoaConfig {
  nome: string;
  inicial: string;
  cor: string;
}

export const PESSOAS_CONFIG: Record<PessoaId, PessoaConfig> = {
  pessoa_a: { nome: 'Nome_A', inicial: 'A', cor: '#bd93f9' },
  pessoa_b: { nome: 'Nome_B', inicial: 'B', cor: '#ff79c6' },
  ambos: { nome: 'Casal', inicial: 'AB', cor: '#bd93f9' },
};

export function inicialDe(pessoa: PessoaId): string {
  return PESSOAS_CONFIG[pessoa].inicial;
}

// Cor de PARTIDA de cada identidade. Quem quer a cor em vigor usa
// corPessoa()/useCorPessoa() (lib/stores/coresPessoa.ts), que caem
// nesta aqui quando a pessoa nunca trocou.
export function corDe(pessoa: PessoaId): string {
  return PESSOAS_CONFIG[pessoa].cor;
}
