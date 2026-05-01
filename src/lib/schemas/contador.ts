// Schema do arquivo contadores/<slug>.md (contador "dias sem X" opt-in,
// M18). Modelado em docs/sprints/M18-spec.md secao 3.
//
// Cada contador e uma sequencia pessoal de dias desde a ultima
// ocorrencia de algo que o usuario quer evitar. ADR-0005 proibe
// celebracao visual: nao ha campo de "milestone", nao ha "achievement",
// nao ha cor de destaque para sequencias longas.
//
//  - tipo: literal 'contador' (discriminator do frontmatter).
//  - slug: identificador estavel kebab-case ASCII; tambem e o nome do
//    arquivo. Validamos formato para evitar colisao no filesystem.
//  - titulo: string visivel (acentuacao completa PT-BR permitida).
//  - inicio: YYYY-MM-DD da data atual de inicio. Atualiza em cada
//    reset; o calculo de "dias atuais" e diasEntre(inicio, hoje).
//  - recorde: int >=0, melhor sequencia ja alcancada em dias. Nunca
//    diminui (logica em registrarReset). Default 0 em criacao.
//  - resets: array de ISO datetimes; cada entrada e um momento de
//    reset registrado. Default [] (contador novo nunca foi resetado).
//  - criado_em: ISO datetime da criacao do contador.
//
// Convencoes do projeto:
//  - Sem campo de "autor": contador pertence ao dispositivo, mantemos
//    simetria com schema de alarme (M16).
//  - Sem gamificacao (ADR-0005).
//  - Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';

// Slug: kebab-case ASCII. Aceita letras minusculas, digitos e '-'.
// Comprimento minimo 1, maximo 64 (limite de filesystem amigavel).
const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'slug deve ser kebab-case ASCII (a-z, 0-9, -)')
  .min(1)
  .max(64);

// YYYY-MM-DD. Aceita 1900..2099, MM 01-12, DD 01-31.
const DataYmd = z
  .string()
  .regex(
    /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    'data deve estar em YYYY-MM-DD'
  );

// ISO datetime com offset (ex: 2026-04-29T10:00:00-03:00) ou Z.
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'datetime deve estar em ISO 8601 com offset'
  );

export const ContadorSchema = z.object({
  tipo: z.literal('contador'),
  slug: SlugSchema,
  titulo: z.string().min(1).max(80),
  inicio: DataYmd,
  // Recorde em dias; >=0. Default 0 em contador novo.
  recorde: z.number().int().min(0).default(0),
  // Historico de resets. Cada entrada e um ISO datetime do momento de
  // reset; o array cresce ao longo do tempo. Default [] em novo.
  resets: z.array(IsoDatetime).default([]),
  criado_em: IsoDatetime,
});

export type Contador = z.infer<typeof ContadorSchema>;

// Helper para gerar slug a partir do titulo. Lower, troca acentos por
// equivalentes ASCII, espacos por '-', remove caracteres invalidos.
// Caller compoe sufixo random para deduplicar quando necessario.
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
  // Evita slug vazio (titulo so com simbolos): retorna 'contador' como
  // fallback. Caller deve adicionar sufixo random para nao colidir.
  return base.length > 0 ? base : 'contador';
}

// Sufixo random 4 chars [a-z0-9]. Mesmo helper de tarefa.ts mas
// duplicado para evitar acoplamento entre schemas.
export function sufixoRandom(): string {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return out;
}
