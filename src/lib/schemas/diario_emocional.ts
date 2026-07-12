// Schema do arquivo inbox/mente/diario/YYYY-MM-DD-HHmm-slug.md
// (diario emocional). Modelado em docs/BRIEFING.md secao 7.
//
// Modos (vocabulario canonico Onda R / sprint R0):
// - 'gatilho'   = momento dificil. Estrategia + funcionou opcionais.
//                 Compat: aceita 'trigger' na leitura, remapeia para 'gatilho'.
// - 'conquista' = superacao, sucesso. So texto e emocoes, exige ao menos
//                 uma midia. Compat: aceita 'vitoria' na leitura, remapeia.
// - 'reflexao'  = anotacao contemplativa sem polaridade. Sem midia
//                 obrigatoria. Sprint G2 (I-DIARIO-REFLEXAO) introduziu o
//                 terceiro modo canonico prescrito em FEATURES-CANONICAS
//                 §2.2; nao entra em conquistas nem crises do Recap (M36).
//
// 'funcionou' so faz sentido em modo gatilho (estrategia foi efetiva?).
// Quando modo !== 'gatilho', funcionou deve ser undefined.
//
// R0 lexical: enum canonico = 'gatilho' | 'conquista' | 'reflexao'.
// Preprocess aceita os valores legacy ('trigger', 'vitoria') vindos de
// .md antigos no Vault e remapeia para o canonico em runtime, sem
// reescrever os arquivos no disco. Escritas novas (saveDiario)
// SEMPRE emitem o valor canonico. Ver docs/SCHEMA-MIGRATION.md e ADR-0025.
import { z } from 'zod';
import { PessoaAutorSchema, PessoaIdSchema } from '@/lib/schemas/pessoa';
import { MidiaSchema } from '@/lib/schemas/midia';
import { ParaSchema } from '@/lib/schemas/para';
import { normalizarDiarioModo } from '@/lib/migration/lexicon';

// Modos canonicos exportados. Conjunto enxuto para que callers usem
// apenas o vocabulario novo em codigo TypeScript.
export const DIARIO_EMOCIONAL_MODOS = ['gatilho', 'conquista', 'reflexao'] as const;
export type DiarioEmocionalModo = (typeof DIARIO_EMOCIONAL_MODOS)[number];

// Schema do enum com compat de leitura. Preprocess normaliza valores
// legacy antes de validar via z.enum. Escritas sempre passam pelo
// caminho canonico (writer emite valor canonico, parser idempotente
// quando input ja e canonico).
export const DiarioEmocionalModoSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== 'string') return raw;
    try {
      return normalizarDiarioModo(raw);
    } catch {
      // Deixa o z.enum reportar o erro de forma padronizada quando o
      // valor nao bater em nenhuma chave conhecida.
      return raw;
    }
  },
  z.enum(DIARIO_EMOCIONAL_MODOS)
);

const Iso8601 = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:?\d{2}|Z)?$/,
    'data deve ser ISO 8601 com hora'
  );

// Flags de contexto social: amigos / sozinho. Adicionado em M06.X
// para suportar a UI da Tela 18 que oferece esses chips ao lado das
// pessoas. Antes ficavam apenas em prosa no corpo do .md; agora sao
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
    // legados sem o campo. Refine abaixo bloqueia save de conquista
    // sem ao menos uma midia (conquistas exigem peso emocional).
    midia: z.array(MidiaSchema).default([]),
    // Destinatario / tema da anotacao (M33). Discriminado: mim /
    // outra(pessoa) / casal. Default {tipo:'mim'} para .md v1.
    para: ParaSchema,
  })
  .refine((v) => v.modo === 'gatilho' || v.funcionou === undefined, {
    message: 'funcionou so pode ser definido em modo gatilho',
    path: ['funcionou'],
  })
  .refine((v) => v.modo !== 'conquista' || v.midia.length > 0, {
    message: 'conquista exige pelo menos uma midia',
    path: ['midia'],
  });

export type DiarioEmocionalMeta = z.infer<typeof DiarioEmocionalSchema>;
