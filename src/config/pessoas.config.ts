// UNICO arquivo onde nomes "default" aparecem. Genericos por desenho.
// Nomes reais entram em runtime via store (lib/stores/pessoa.ts) e
// SecureStore. Repositorio nunca contem nome real (Regra -1).
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

export function corDe(pessoa: PessoaId): string {
  return PESSOAS_CONFIG[pessoa].cor;
}
