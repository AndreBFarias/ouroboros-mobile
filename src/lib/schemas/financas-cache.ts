// Schema do cache JSON gerado pelo backend (ADR-0012). Mobile so le;
// nunca escreve. Estrutura espelha
// ~/Protocolo-Ouroboros/.ouroboros/cache/financas-cache.json gerado
// pela sprint MOB-bridge-2.
//
// schema_version 1 e o unico aceito; valores diferentes devolvem
// erro explicito para o reader, que exibe EmptyState orientando o
// usuario a rodar o pipeline atualizado.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// Tipo de movimentacao financeira. 'despesa' e o caso comum (debito,
// pagamento, compra). 'credito' e raro (estorno, recebimento, cashback)
// e ganha cor verde no frontend para uniformizar sem usar badges.
export const FinancasTipoSchema = z.enum(['despesa', 'credito']);
export type FinancasTipo = z.infer<typeof FinancasTipoSchema>;

// Item de top categorias. 'percentual' e fracao 0..1 do gasto da
// semana atribuido a esta categoria; o frontend usa para largura da
// barra horizontal cyan (CardTopCategorias).
export const FinancasTopCategoriaSchema = z.object({
  nome: z.string().min(1),
  valor: z.number().min(0),
  percentual: z.number().min(0).max(1),
});
export type FinancasTopCategoria = z.infer<typeof FinancasTopCategoriaSchema>;

// Linha de transacao. 'destino' e texto livre vindo do backend (nome
// do estabelecimento, do contato pix, etc.); o frontend so renderiza
// e nunca persiste. 'autor' indica qual pessoa registrou a despesa.
export const FinancasTransacaoSchema = z.object({
  data: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve ser YYYY-MM-DD'),
  autor: PessoaAutorSchema,
  tipo: FinancasTipoSchema,
  valor: z.number(),
  destino: z.string().min(1),
  categoria: z.string().min(1),
});
export type FinancasTransacao = z.infer<typeof FinancasTransacaoSchema>;

// Cache canonico. delta_textual vem pronto do backend ("abaixo da
// media" / "acima da media" / "em linha"), sem heuristica no
// frontend. ADR-0005 fixa que o app nao colore esse delta como
// positivo/negativo.
export const FinancasCacheSchema = z.object({
  schema_version: z.literal(1),
  gerado_em: z.string().min(1),
  periodo_referencia: z.string().min(1),
  gasto_semana: z.number(),
  gasto_semana_anterior: z.number(),
  delta_textual: z.string().min(1),
  top_categorias: z.array(FinancasTopCategoriaSchema),
  ultimas_transacoes: z.array(FinancasTransacaoSchema),
});
export type FinancasCache = z.infer<typeof FinancasCacheSchema>;
