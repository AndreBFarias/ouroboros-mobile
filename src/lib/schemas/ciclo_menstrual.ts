// Schema do arquivo inbox/saude/ciclo/YYYY-MM-DD.md (acompanhamento
// de ciclo menstrual, M14.5). Modelado em docs/sprints/M14.5-spec.md.
//
// Cada arquivo representa um snapshot do dia com:
//  - data_inicio: data de início do ciclo atual; null antes do primeiro
//    registro real ou em dias que não marcam novo ciclo (apenas
//    registro de sintomas no meio do ciclo vigente).
//  - fase: folicular | ovulatoria | lutea | menstrual. Inferida via
//    inferirFase mas pode ser sobrescrita manualmente pelo usuario via
//    radio no form (override).
//  - sintomas: lista opcional de chips canonicos (8 itens). Vazio se
//    não houver registro de sintomas.
//  - intensidade: 1-5 opcional (intensidade dos sintomas no dia).
//  - humor_associado: 1-5 opcional (correlacao manual com humor para
//    leitura no desktop).
//  - texto: campo livre opcional.
//
// Convencoes do projeto:
//  - autor sempre 'pessoa_a' ou 'pessoa_b' (nunca 'ambos'); a feature
//    e individual e privacidade visual e preservada por aba separada.
//  - Tom sobrio absoluto: schema não traz campo de "atrasou" nem
//    "anomalia"; o calendario e leitura passiva.
//  - Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema } from '@/lib/schemas/pessoa';

// Data YYYY-MM-DD (sem hora; ciclo e snapshot diario, não um evento).
const DataYmd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar em YYYY-MM-DD');

export const FaseCicloSchema = z.enum([
  'folicular',
  'ovulatoria',
  'lutea',
  'menstrual',
]);
export type FaseCiclo = z.infer<typeof FaseCicloSchema>;

// Lista canonica de sintomas (8 itens, M14.5 spec). Sem patologizar:
// e uma lista neutra de chips opt-in. 'libido_alta' e 'libido_baixa'
// usam underscore em vez de espaco no enum para casar com convencao
// snake_case dos values do projeto.
export const SintomaCicloSchema = z.enum([
  'colica',
  'dor_de_cabeca',
  'sensibilidade',
  'fadiga',
  'irritabilidade',
  'inchaco',
  'libido_alta',
  'libido_baixa',
]);
export type SintomaCiclo = z.infer<typeof SintomaCicloSchema>;

export const CicloMenstrualSchema = z.object({
  tipo: z.literal('ciclo_menstrual'),
  data: DataYmd,
  autor: PessoaAutorSchema,
  // Data de início do ciclo atual; null antes do primeiro registro
  // real ou quando o dia não marca um novo ciclo.
  data_inicio: DataYmd.nullable(),
  // Fase auto-inferida ou manualmente sobrescrita pelo usuario.
  fase: FaseCicloSchema,
  // Lista opcional; default array vazio para compatibilidade com
  // arquivos legados sem o campo.
  sintomas: z.array(SintomaCicloSchema).default([]),
  // Intensidade dos sintomas no dia (1-5). Opcional.
  intensidade: z.number().int().min(1).max(5).nullable(),
  // Humor associado registrado manualmente para correlacao no desktop.
  humor_associado: z.number().int().min(1).max(5).nullable(),
  // Texto livre opcional.
  texto: z.string().nullable(),
});

export type CicloMenstrualMeta = z.infer<typeof CicloMenstrualSchema>;

// Metadata canonica para exibicao dos sintomas. Mantem rotulo PT-BR
// próximo do schema para evitar drift entre tela e modelo. Acentuacao
// completa nas labels (texto visivel).
export const SINTOMAS_LABELS: Record<SintomaCiclo, string> = {
  colica: 'Cólica',
  dor_de_cabeca: 'Dor de cabeça',
  sensibilidade: 'Sensibilidade',
  fadiga: 'Fadiga',
  irritabilidade: 'Irritabilidade',
  inchaco: 'Inchaço',
  libido_alta: 'Libido alta',
  libido_baixa: 'Libido baixa',
};

// Ordem canonica de iteracao na UI (form e leitura).
export const SINTOMAS_CANONICOS = [
  'colica',
  'dor_de_cabeca',
  'sensibilidade',
  'fadiga',
  'irritabilidade',
  'inchaco',
  'libido_alta',
  'libido_baixa',
] as const satisfies ReadonlyArray<SintomaCiclo>;

// Metadata visual por fase (cor da paleta Dracula + label PT-BR).
// As cores casam com docs/BRIEFING.md seção 3 e M14.5-spec seção 2.
export const FASES_LABELS: Record<FaseCiclo, string> = {
  folicular: 'Folicular',
  ovulatoria: 'Ovulatória',
  lutea: 'Lútea',
  menstrual: 'Menstrual',
};

export const FASES_CANONICAS = [
  'folicular',
  'ovulatoria',
  'lutea',
  'menstrual',
] as const satisfies ReadonlyArray<FaseCiclo>;
