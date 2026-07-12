// Schema do arquivo markdown/evento-contador-<contadorId>-<YYYY-MM-DD>-<slug>.md
// (R-RECAP-5, 2026-05-16). Evento de Contador: cada Contador (M18)
// agora aceita eventos pontuais que enriquecem o recap do contador
// alem do simples numero de dias. Cada evento traz humor (1-5 slider),
// descricao livre, midias (foto/audio/video/spotify/youtube) e tags
// curtas.
//
// Identificacao:
//   - tipo: literal 'evento_contador' (discriminator do frontmatter).
//   - contadorId: slug do Contador-pai (ContadorSchema.slug). FK para
//     o arquivo markdown/contador-<slug>.md. Validamos formato igual
//     ao SlugSchema para garantir simetria.
//   - data: YYYY-MM-DD do dia do evento (caller informa).
//   - slug: kebab-case ASCII derivado de descricao ou random, sufixo
//     4-char garantido pelo writer para evitar colisao no filesystem.
//   - humor: int 1..5. Slider de humor do momento do evento. Diferente
//     do humor do dia (HumorSchema, M-HUMOR) -- este e por-evento, nao
//     agregado, nao entra no heatmap principal.
//   - descricao: string livre, max 280 chars (limite de respiracao
//     visual em cards do recap). Pode ser vazia se houver midias.
//   - tags: array de strings curtas (max 16 chars cada, max 5 tags).
//     Sentence case + acentuacao PT-BR permitida.
//   - midias: array de Midia (foto/audio/video/spotify/youtube),
//     mesma uniao discriminada que evento.md.
//   - criado_em: ISO datetime com offset da criacao do evento.
//   - autor: PessoaAutor padrao (pessoa_a/pessoa_b).
//   - para: ParaSchema (mim/outra/casal) -- evento sempre tem
//     destinatario, herdado do Contador por default mas editavel.
//
// Convencoes:
//   - Sem campo "milestone": ADR-0005 zero gamificacao. Eventos sao
//     marcadores de momentos, nao trofeus.
//   - midias: array vazio default; se descricao ausente E midias
//     vazias, refine bloqueia (evento precisa de conteudo).
//   - Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';
import { MidiaSchema } from '@/lib/schemas/midia';
import { ParaSchema } from '@/lib/schemas/para';

// Slug kebab-case ASCII. Aceita letras minusculas, digitos e '-'.
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

// Tag curta: max 16 chars; nao restringe charset (UI PT-BR pode usar
// acento), apenas tamanho e ausencia de quebras de linha.
const TagSchema = z
  .string()
  .min(1)
  .max(16)
  .regex(/^[^\n\r]+$/, 'tag nao pode ter quebra de linha');

export const EventoContadorSchema = z
  .object({
    tipo: z.literal('evento_contador'),
    contadorId: SlugSchema,
    data: DataYmd,
    slug: SlugSchema,
    humor: z.number().int().min(1).max(5),
    descricao: z.string().max(280).default(''),
    tags: z.array(TagSchema).max(5).default([]),
    midias: z.array(MidiaSchema).default([]),
    criado_em: IsoDatetime,
    autor: PessoaAutorSchema,
    para: ParaSchema,
  })
  .refine(
    (v) => v.descricao.trim().length > 0 || v.midias.length > 0,
    {
      message: 'evento precisa de descricao ou midia',
      path: ['descricao'],
    }
  );

export type EventoContador = z.infer<typeof EventoContadorSchema>;

// Helper para gerar slug a partir de descricao. Lower, troca acentos
// por equivalentes ASCII, espacos por '-', remove caracteres invalidos.
// Caller compoe sufixo random para deduplicar quando necessario.
export function slugifyDescricao(descricao: string): string {
  const base = descricao
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);
  return base.length > 0 ? base : 'evento';
}

// Sufixo random 4 chars [a-z0-9]. Mesmo helper de tarefa/contador
// duplicado para evitar acoplamento entre schemas.
export function sufixoRandomEvento(): string {
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  }
  return out;
}
