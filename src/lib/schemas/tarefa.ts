// Schema do arquivo tarefas/YYYY-MM-DD-<slug>.md (To-do leve opt-in,
// M17). Modelado em docs/sprints/M17-spec.md secao 3.
//
// Cada tarefa e uma linha plana global - sem subtarefas, sem projetos,
// sem prioridade, sem due-date complexo (ADR-0005, regra de baixa
// densidade de feature).
//
//  - tipo: literal 'tarefa' (discriminator do frontmatter).
//  - data: YYYY-MM-DD da criacao da tarefa (fuso UTC-3, formatDateYmd).
//  - autor: pessoa_a | pessoa_b (do store usePessoa.pessoaAtiva). Nao
//    aceita 'ambos' porque toda tarefa tem dono unico.
//  - titulo: string visivel (acentuacao completa PT-BR permitida).
//  - feito: boolean. Tap simples na lista alterna.
//  - feito_em: ISO datetime quando marcou feito; null enquanto pendente.
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

// ISO datetime com offset (ex: 2026-04-29T10:00:00-03:00).
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'datetime deve estar em ISO 8601 com offset'
  );

export const TarefaSchema = z.object({
  tipo: z.literal('tarefa'),
  data: DataYmd,
  autor: PessoaAutorSchema,
  titulo: z.string().min(1).max(200),
  feito: z.boolean(),
  // Null antes de marcar feito; ISO datetime depois.
  feito_em: IsoDatetime.nullable(),
});

export type Tarefa = z.infer<typeof TarefaSchema>;

// Helper para gerar slug a partir do titulo. Lower, troca acentos
// por equivalentes ASCII, espacos por '-', remove caracteres
// invalidos. Usuario nunca digita slug; e derivado em criacao e
// estavel para o resto da vida da tarefa (path do arquivo).
//
// Sufixo random 4 chars depois do kebab evita colisao quando dois
// titulos iguais sao criados no mesmo dia: 'comprar-pao' -> arquivo
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
  // fallback. Caller deve adicionar sufixo random para nao colidir.
  return base.length > 0 ? base : 'tarefa';
}

// Sufixo random 4 chars [a-z0-9] para deduplicar nomes de arquivo
// quando dois titulos iguais sao criados no mesmo dia. Deterministico
// em testes via Math.random; caller pode injetar seed.
export function sufixoRandom(): string {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return out;
}
