// Schema do arquivo tarefas/YYYY-MM-DD-<slug>.md (To-do leve opt-in,
// M17). Modelado em docs/sprints/M17-spec.md seção 3, expandido v2 em
// M31 com categoria, pessoa_destino e alarme vinculado.
//
// Cada tarefa e uma linha plana global - sem subtarefas, sem projetos,
// sem prioridade, sem due-date complexo (ADR-0005, regra de baixa
// densidade de feature).
//
// Campos v1 (M17):
//  - tipo: literal 'tarefa' (discriminator do frontmatter).
//  - data: YYYY-MM-DD da criacao da tarefa (fuso UTC-3, formatDateYmd).
//  - autor: pessoa_a | pessoa_b (do store usePessoa.pessoaAtiva). Não
//    aceita 'ambos' porque toda tarefa tem dono unico.
//  - titulo: string visivel (acentuacao completa PT-BR permitida).
//  - feito: boolean. Tap simples na lista alterna.
//  - feito_em: ISO datetime quando marcou feito; null enquanto pendente.
//
// Campos v2 (M31, todos com default para compat com tarefas v1):
//  - categoria: enum fechado de 8 slugs. Default 'outro'.
//  - pessoa_destino: discriminatedUnion (mim/outra/casal/terceiro).
//    Default { tipo: 'mim' } para preservar semantica v1 (autor === dono).
//  - alarme: bloco opcional para lembrar a tarefa via wrapper alarmes.
//    Default null. Quando ativo, o caller cria entry separada em
//    alarmes/<slug-tarefa>-alarme.md e popula slug_vinculado para
//    cancelamento idempotente em marcarFeito/excluir.
//
// Concluir tarefa NAO apaga: ela permanece com feito: true e feito_em
// preenchido. Long-press em concluida abre menu Reabrir/Apagar
// definitivo (decisao usuario 2026-05-03; BRIEF §1.8).
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from './pessoa';

// YYYY-MM-DD. Aceita 1900..2099, MM 01-12, DD 01-31 (validação real
// do calendario fica no caller; aqui so formato).
const DataYmd = z
  .string()
  .regex(
    /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    'data deve estar em YYYY-MM-DD'
  );

// ISO datetime com offset (ex: 2026-04-29T10:00:00-03:00).
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'datetime deve estar em ISO 8601 com offset'
  );

// M31 v2: categorias canonicas. Enum fechado evita drift textual entre
// dispositivos sincronizados (Syncthing) e simplifica filtros futuros
// (M36 Recap pode agrupar conquistas por categoria).
export const TAREFA_CATEGORIAS = [
  'trabalho',
  'casa',
  'rotina',
  'financas',
  'desenvolvimento_pessoal',
  'obrigacoes',
  'saude',
  'outro',
] as const;

export type TarefaCategoria = (typeof TAREFA_CATEGORIAS)[number];

export const TAREFA_CATEGORIA_LABELS: Record<TarefaCategoria, string> = {
  trabalho: 'Trabalho',
  casa: 'Casa',
  rotina: 'Rotina',
  financas: 'Finanças',
  desenvolvimento_pessoal: 'Desenvolvimento pessoal',
  obrigacoes: 'Obrigações',
  saude: 'Saúde',
  outro: 'Outro',
};

// M31 v2: pessoa_destino discriminado. Tipo seguro:
//  - mim     : tarefa para o autor da tarefa (default e legacy).
//  - outra   : para a pessoa parceira (campo `pessoa` exige um autor
//              concreto, nao 'ambos').
//  - casal   : tarefa do casal (ambos responsaveis).
//  - terceiro: nome livre para alguem fora do casal (parente, colega).
//              Limitado a 60 chars; usuario digita.
export const TarefaPessoaDestinoSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('mim') }),
  z.object({ tipo: z.literal('outra'), pessoa: PessoaAutorSchema }),
  z.object({ tipo: z.literal('casal') }),
  z.object({ tipo: z.literal('terceiro'), nome: z.string().min(1).max(60) }),
]);

export type TarefaPessoaDestino = z.infer<typeof TarefaPessoaDestinoSchema>;

// M31 v2: bloco de alarme vinculado. Quando ativo === true, o caller
// cria um Alarme em alarmes/<slug-tarefa>-alarme.md ANTES de salvar a
// tarefa, popula slug_vinculado e o wrapper alarmesNotificacoes agenda
// o trigger nativo. Marcar tarefa como feita cancela o alarme (M30
// idempotente via cancelarAlarme(slug_vinculado)).
//
// Recorrencia espelha o vocabulario do AlarmeSchema (M30) para reuso
// direto sem mapper. data_hora_iso e o instante absoluto; recorrencia
// 'unica' usa; outras formas decodam hour/minute para o trigger.
export const TarefaAlarmeSchema = z.object({
  ativo: z.boolean(),
  data_hora_iso: IsoDatetime.nullable(),
  recorrencia: z.enum(['unica', 'diaria', 'semanal', 'mensal']),
  // Slug do arquivo em alarmes/. Optional porque so e populado depois
  // que o caller efetivamente persiste o alarme companion.
  slug_vinculado: z.string().optional(),
});

export type TarefaAlarme = z.infer<typeof TarefaAlarmeSchema>;

export const TarefaSchema = z.object({
  tipo: z.literal('tarefa'),
  data: DataYmd,
  autor: PessoaAutorSchema,
  titulo: z.string().min(1).max(200),
  feito: z.boolean(),
  // Null antes de marcar feito; ISO datetime depois.
  feito_em: IsoDatetime.nullable(),
  // M31 v2 - defaults garantem migracao silenciosa de tarefas v1: o
  // .md antigo sem esses campos vira meta v2 ao ser parseado.
  categoria: z.enum(TAREFA_CATEGORIAS).default('outro'),
  pessoa_destino: TarefaPessoaDestinoSchema.default({ tipo: 'mim' }),
  alarme: TarefaAlarmeSchema.nullable().default(null),
  // R-ROT-1-B: ate quando suprimir banner de sugestao de alarme com
  // base no padrao de horario em que o usuario marca esta tarefa.
  // Default null == nunca silenciado. Setado quando usuario rejeita
  // uma sugestao (silencio de 30 dias). Aplica-se a todas as tarefas
  // com mesmo titulo normalizado (familia recorrente).
  silenciar_sugestao_ate: IsoDatetime.nullable().default(null),
});

export type Tarefa = z.infer<typeof TarefaSchema>;

// Helper para gerar slug a partir do titulo. Lower, troca acentos
// por equivalentes ASCII, espacos por '-', remove caracteres
// invalidos. Usuario nunca digita slug; e derivado em criacao e
// estavel para o resto da vida da tarefa (path do arquivo).
//
// Sufixo random 4 chars depois do kebab evita colisao quando dois
// titulos iguais são criados no mesmo dia: 'comprar-pao' -> arquivo
// 'YYYY-MM-DD-comprar-pao.md'; segundo identico vira
// 'YYYY-MM-DD-comprar-pao-7k2x.md'. Caller compoe esse sufixo.
export function slugifyTitulo(titulo: string): string {
  const base = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
  // Evita slug vazio (titulo so com simbolos): retorna 'tarefa' como
  // fallback. Caller deve adicionar sufixo random para não colidir.
  return base.length > 0 ? base : 'tarefa';
}

// Sufixo random 4 chars [a-z0-9] para deduplicar nomes de arquivo
// quando dois titulos iguais são criados no mesmo dia. Deterministico
// em testes via Math.random; caller pode injetar seed.
export function sufixoRandom(): string {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return out;
}
