// Schema do arquivo inbox/mente/diario/YYYY-MM-DD-HHmm-slug.md
// (diario emocional). Modelado em docs/BRIEFING.md seção 7.
//
// Modos:
// - 'trigger' = momento dificil. Estrategia + funcionou opcionais.
// - 'vitoria' = anonimato-allow: superacao, sucesso. So texto e emocoes,
//   exige ao menos uma midia.
// - 'reflexao' = anotacao contemplativa sem polaridade (nem trigger,
//   nem vitoria). Sem midia obrigatoria, sem funcionou/estrategia.
//   Sprint G2 (I-DIARIO-REFLEXAO): cobre o terceiro modo canonico
//   prescrito em FEATURES-CANONICAS §2.2; nao entra em conquistas
//   nem crises do Recap (M36).
//
// 'funcionou' so faz sentido em modo trigger (estrategia foi
// efetiva?). Quando modo !== 'trigger', funcionou deve ser undefined.
import { z } from 'zod';
import { PessoaAutorSchema, PessoaIdSchema } from '@/lib/schemas/pessoa';
import { MidiaSchema } from '@/lib/schemas/midia';
import { ParaSchema } from '@/lib/schemas/para';

export const DiarioEmocionalModoSchema = z.enum(['trigger', 'vitoria', 'reflexao']);
export type DiarioEmocionalModo = z.infer<typeof DiarioEmocionalModoSchema>;

const Iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/,
    'data deve ser ISO 8601 com hora'
  );

// Flags de contexto social: amigos / sozinho. Adicionado em M06.X
// para suportar a UI da Tela 18 que oferece esses chips ao lado das
// pessoas. Antes ficavam apenas em prosa no corpo do .md; agora são
// campo estruturado opcional. Arquivos antigos sem o campo seguem
// validos (default = []).
export const ContextoSocialSchema = z.enum(['amigos', 'sozinho']);
export type ContextoSocial = z.infer<typeof ContextoSocialSchema>;

export const DiarioEmocionalSchema = z
  .object({
    tipo: z.literal('diario_emocional'),
    data: Iso8601,
    autor: PessoaAutorSchema,
    modo: DiarioEmocionalModoSchema,
    emocoes: z.array(z.string()).default([]),
    intensidade: z.number().int().min(1).max(5),
    com: z.array(PessoaIdSchema).default([]),
    contexto_social: z.array(ContextoSocialSchema).default([]),
    texto: z.string(),
    estrategia: z.string().optional(),
    funcionou: z.boolean().optional(),
    audio: z.string().nullable().optional(),
    // Midia anexada (M07.x). Array vazio default para arquivos
    // legados sem o campo. Refine abaixo bloqueia save de vitoria
    // sem ao menos uma midia (conquistas exigem peso emocional).
    midia: z.array(MidiaSchema).default([]),
    // Destinatario / tema da anotacao (M33). Discriminado: mim /
    // outra(pessoa) / casal. Default {tipo:'mim'} para .md v1.
    para: ParaSchema,
  })
  .refine(
    (v) => v.modo === 'trigger' || v.funcionou === undefined,
    { message: 'funcionou so pode ser definido em modo trigger', path: ['funcionou'] }
  )
  .refine(
    (v) => v.modo !== 'vitoria' || v.midia.length > 0,
    { message: 'vitoria exige pelo menos uma midia', path: ['midia'] }
  );

export type DiarioEmocionalMeta = z.infer<typeof DiarioEmocionalSchema>;
