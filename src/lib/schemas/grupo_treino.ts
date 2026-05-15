// Schema de Grupo de Treino (Q19, Onda Q 2026-05-13). Container que
// agrupa rotinas relacionadas — ex: Grupo "Treino do Quaresma" contem
// "Treino A — peito e triceps", "Treino B — costas e biceps",
// "Treino C — perna inteira".
//
// Compatibilidade: rotinas existentes (markdown/rotina-<slug>.md)
// continuam funcionando standalone. Grupo so faz referencia por slug;
// nao duplica dados.
//
// Path canonico: markdown/grupo-<slug>.md (layout-por-tipo H2).
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from './pessoa';

const DataYmd = z
  .string()
  .regex(
    /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    'data deve estar em YYYY-MM-DD'
  );

export const GrupoTreinoSchema = z.object({
  tipo: z.literal('grupo_treino'),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  nome: z.string().min(1).max(80),
  descricao: z.string().nullable(),
  // Lista de slugs de rotinas. Cada rotina sera carregada via
  // lerRotina(vaultRoot, slug). 1..10 rotinas (cap pra UX nao virar
  // lista absurda; usuario que quer mais cria multiplo grupo).
  rotina_slugs: z
    .array(z.string().regex(/^[a-z0-9-]+$/))
    .min(1)
    .max(10),
  data_criacao: DataYmd,
  autor: PessoaAutorSchema,
});

export type GrupoTreino = z.infer<typeof GrupoTreinoSchema>;
