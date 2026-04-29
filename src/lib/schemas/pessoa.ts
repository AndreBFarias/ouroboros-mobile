// Identidade generica de pessoa. Nunca usar nomes reais (Regra -1).
// Em codigo sempre 'pessoa_a' / 'pessoa_b' / 'ambos'. Nomes de exibicao
// vem do store em runtime, preenchidos no onboarding.
import { z } from 'zod';

export const PessoaIdSchema = z.enum(['pessoa_a', 'pessoa_b', 'ambos']);
export type PessoaId = z.infer<typeof PessoaIdSchema>;

export const PessoaAutorSchema = z.enum(['pessoa_a', 'pessoa_b']);
export type PessoaAutor = z.infer<typeof PessoaAutorSchema>;

// Type-guard: distingue autor (pessoa_a/b) de filtro (que aceita 'ambos').
export const isAutor = (id: PessoaId): id is PessoaAutor =>
  id === 'pessoa_a' || id === 'pessoa_b';
