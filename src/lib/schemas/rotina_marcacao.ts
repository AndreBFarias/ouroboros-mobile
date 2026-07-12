// Schema do arquivo markdown/rotina-marcacao-<slug>-<YYYY-MM-DD>.md
// (R-SF-3, M-SAUDE-FISICA-MARCACAO-RAPIDA-MED).
//
// Modela uma marcacao rapida de Rotina recorrente (caso primario:
// medicacao diaria como Venvanse). Cada arquivo agrupa todas as
// marcacoes do mesmo dia para a mesma rotina, evitando explosao de
// arquivos pequenos no Vault (1 marcacao = 1 arquivo seria caro).
//
// Estrutura:
//  - tipo: discriminador 'rotina_marcacao' (consistente com H2).
//  - rotina_slug: chave estavel da rotina-pai (markdown/rotina-<slug>.md).
//    Nao validamos existencia da rotina aqui (writer faz cross-check
//    se necessario); schema apenas garante kebab-case ASCII.
//  - data: YYYY-MM-DD do dia das marcacoes. Casa com sufixo do filename.
//  - autor: pessoa_a | pessoa_b. Marcacao tem dono unico (segue padrao
//    de tarefa.ts; nao aceita 'ambos').
//  - marcacoes: array de timestamps ISO. Cap em 50 por dia (defesa
//    contra fat-finger; usuario tipico marca 1-5x por dia).
//  - silenciar_lembrete_ate: campo opcional para suprimir lembrete
//    pre-configurado quando usuario marcou antes do horario alvo
//    (decisao spec 3o criterio: "Lembrete cancelado se marcado antes").
//    Default null. Caller seta para fim do dia local quando registra
//    marcacao antes do horario do alarme companion.
//
// Helper puro: nada de IO aqui. Writer/reader em
// src/lib/vault/rotina_marcacao.ts.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from './pessoa';

// YYYY-MM-DD. Aceita 1900..2099, MM 01-12, DD 01-31 (validacao real
// do calendario fica no caller; aqui so formato).
const DataYmd = z
  .string()
  .regex(
    /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    'data deve estar em YYYY-MM-DD'
  );

// ISO datetime com offset (ex: 2026-05-15T08:32:00-03:00).
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'datetime deve estar em ISO 8601 com offset'
  );

// Slug: kebab-case ASCII. Espelha SlugSchema de alarme/rotina.
const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'slug deve ser kebab-case ASCII (a-z, 0-9, -)')
  .min(1)
  .max(64);

// Cap defensivo. Usuario tipico marca 1-5 medicacoes/habitos por dia;
// 50 cobre cenarios extremos (snacks, registros granulares) sem
// permitir crescimento patologico do .md.
export const MAX_MARCACOES_DIA = 50;

export const RotinaMarcacaoSchema = z.object({
  tipo: z.literal('rotina_marcacao'),
  rotina_slug: SlugSchema,
  data: DataYmd,
  autor: PessoaAutorSchema,
  // Array de timestamps ISO. Pode ter 1+ entradas (writer recusa array
  // vazio porque um arquivo de marcacao sem nenhuma marcacao nao faz
  // sentido). Ordem cronologica asc; caller mantem ao append.
  marcacoes: z.array(IsoDatetime).min(1).max(MAX_MARCACOES_DIA),
  // Default null == lembrete companion segue normal. Quando setado,
  // alarme companion (se houver) deve ser suprimido ate este instante.
  // Tipicamente final do dia local (23:59:59 da TZ -03:00).
  silenciar_lembrete_ate: IsoDatetime.nullable().default(null),
});

export type RotinaMarcacao = z.infer<typeof RotinaMarcacaoSchema>;
