// M39: schema zod canonico do .md companion 1:1 que acompanha
// binarios de midia (foto, audio, video, frase, pdf) gravados nas
// pastas media/<categoria>/. Formaliza, via ADR-0017, o contrato
// preliminar entregue em M34 (src/lib/midia/companion.ts) e
// estendido em A3.x.3 (medida_ref) e A3.x.4 (midia_pdf).
//
// Por que schema novo + serializador antigo coexistirem:
//   - O serializador stringifyCompanionMidia (M34) e' linha-a-linha
//     deterministico, com ordem de chaves fixa e escape de aspas
//     custom. 1335 testes baseline dependem dessa ordem para snapshot
//     comparativo. Manter.
//   - Aqui (M39) introduzimos o shape CANONICO via zod para LEITURA
//     e VALIDACAO de companions ja escritos pelo M34. Usado por
//     migrarAssetsLegacyParaMedia, lerCompanion, e por consumidores
//     futuros que precisam parsear companion antes de exibir
//     (galeria, recap, ETL desktop).
//   - O tipo CompanionMidiaInput (M34) passa a ser declarado COMPATIVEL
//     com MidiaCompanion via type-alias garantido em companion.ts.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { ParaSchema } from '@/lib/schemas/para';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// Tipos de midia suportados. Espelha TipoMidia em
// src/lib/midia/companion.ts; mantido em sync via teste de
// equivalencia em tests/lib/vault/midiaCompanion.test.ts.
export const TipoMidiaSchema = z.enum([
  'midia_foto',
  'midia_audio',
  'midia_video',
  'midia_frase',
  'midia_pdf',
]);
export type TipoMidiaCanonico = z.infer<typeof TipoMidiaSchema>;

// ISO datetime com offset (ex: 2026-04-29T10:00:00-03:00) ou Z. Mesmo
// regex de IsoDatetime usado em contador/tarefa/alarme. Replicado aqui
// para nao criar import circular (schemas/contador.ts importa para,
// que importa pessoa, etc).
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'data deve ser ISO 8601 com offset ou Z'
  );

// Schema canonico. Todos os campos textuais sao opcionais quando o
// caller nao tiver informacao (legenda, transcricao, origem). Os
// campos centrais (tipo, arquivo, data, autor, para) sao obrigatorios.
export const MidiaCompanionSchema = z.object({
  // Discriminador semantico do binario que o companion representa.
  tipo: TipoMidiaSchema,
  // Basename do binario (ex: 2026-05-04-abcd.jpg). Sem subpasta;
  // a pasta vem inferida de tipo via subpastaPara() em
  // vault/midiaCompanion.ts.
  arquivo: z.string().min(1),
  // ISO 8601 da captura (UTC ou offset).
  data: IsoDatetime,
  // Pessoa que registrou o binario.
  autor: PessoaAutorSchema,
  // Duracao em segundos para audio/video. Inteiro >= 0.
  duracao_seg: z.number().int().min(0).optional(),
  // Texto transcrito do audio (M06.5 + futuro). Opcional.
  transcricao: z.string().optional(),
  // Legenda livre digitada pelo usuario. Opcional.
  legenda: z.string().optional(),
  // Destinatario emocional. Default { tipo: 'mim' } via ParaSchema.
  para: ParaSchema,
  // Schema-mae que originou o binario (ex: 'diario_emocional',
  // 'evento', 'medida'). Opcional.
  origem: z.string().optional(),
  // Path relativo ao Vault do .md mae (ex:
  // 'inbox/mente/diario/2026-05-04-1430-foo.md'). Opcional.
  origem_ref: z.string().optional(),
  // Reverse-link para registro de medida (A3.x.3). Compat com
  // companion.ts antigo; o caller passa YYYY-MM-DD da medida.
  medida_ref: z.string().optional(),
});

export type MidiaCompanion = z.infer<typeof MidiaCompanionSchema>;

// Helper: dado um tipo de midia, devolve a subpasta canonica sob
// media/. Mantido aqui (no schema) porque a tabela e' parte do
// contrato canonico ADR-0017, nao detalhe de helper.
export function subpastaPara(tipo: TipoMidiaCanonico): string {
  switch (tipo) {
    case 'midia_foto':
      return 'fotos';
    case 'midia_audio':
      return 'audios';
    case 'midia_video':
      return 'videos';
    case 'midia_frase':
      return 'frases';
    case 'midia_pdf':
      return 'scanner';
  }
}

// Inverso de subpastaPara: dado o nome da subpasta, devolve o tipo
// canonico de midia. Usado por migrarAssetsLegacyParaMedia para
// inferir tipo a partir do path destino.
export function tipoPorSubpasta(subpasta: string): TipoMidiaCanonico | null {
  switch (subpasta) {
    case 'fotos':
      return 'midia_foto';
    case 'audios':
      return 'midia_audio';
    case 'videos':
      return 'midia_video';
    case 'frases':
      return 'midia_frase';
    case 'scanner':
      return 'midia_pdf';
    default:
      return null;
  }
}

// Inferencia de tipo a partir da extensao do binario. Usado pela
// migracao quando o arquivo legado em assets/ nao traz pista de
// origem alem do filename. Conservador: extensoes desconhecidas
// retornam null (caller decide pular).
export function tipoPorExtensao(ext: string): TipoMidiaCanonico | null {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (e === 'jpg' || e === 'jpeg' || e === 'png' || e === 'webp') {
    return 'midia_foto';
  }
  if (
    e === 'm4a' ||
    e === 'mp3' ||
    e === 'wav' ||
    e === 'ogg' ||
    e === 'opus'
  ) {
    return 'midia_audio';
  }
  if (e === 'mp4' || e === 'mov' || e === 'webm') {
    return 'midia_video';
  }
  if (e === 'pdf') {
    return 'midia_pdf';
  }
  return null;
}
