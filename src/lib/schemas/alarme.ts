// Schema do arquivo alarmes/<slug>.md (alarme pessoal opt-in, M16).
// Modelado em docs/sprints/M16-spec.md seção 3.
//
// Cada arquivo representa um alarme recorrente individual:
//  - slug: identificador estavel kebab-case ASCII; também e o nome do
//    arquivo. Validamos formato para evitar colisao no filesystem.
//  - titulo: string visivel (acentuacao completa PT-BR permitida).
//  - horario: HH:MM 24h, sem segundos.
//  - dias_semana: array de 0-6 (0=domingo, ..., 6=sabado). Pelo menos 1.
//  - tag: medicacao | treino | outro. Categoria conceitual; não altera
//    comportamento, so e exibida em contextos de listagem futuros.
//  - som: gentle | normal | forte. Mapeia para arquivo .wav empacotado
//    em assets/sounds/alarmes/ (resolvido no wrapper de notificações).
//  - ativo: toggle global do alarme. Quando false, notification_ids
//    fica vazio e não ha schedule no sistema.
//  - snooze_minutos: 1-60. Default 5 (decisão do spec, seção 11).
//  - criado_em: ISO datetime da criacao do alarme.
//  - ultimo_disparo: ISO datetime do ultimo Desligar; null inicialmente.
//  - notification_ids: array de identifiers retornados por
//    expo-notifications.scheduleNotificationAsync (1 por dia da semana).
//    Gerenciado pelo wrapper alarmesNotificacoes.
//  - snooze_id: identifier do snooze ativo (one-shot); null quando não
//    ha snooze pendente.
//
// Convencoes do projeto:
//  - Sem campo de "autor": alarme pertence ao dispositivo, não ha
//    distincao pessoa_a/pessoa_b para esta feature (CONTRACT seção 1.1).
//  - Sem gamificacao (ADR-0005): não ha campo de "alarmes cumpridos".
//  - Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';

// Slug: kebab-case ASCII. Aceita letras minusculas, digitos e '-'.
// Comprimento minimo 1, maximo 64 (limite de filesystem amigavel).
const SlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'slug deve ser kebab-case ASCII (a-z, 0-9, -)')
  .min(1)
  .max(64);

// Horario HH:MM 24h, sem segundos. Aceita 1 ou 2 digitos na hora
// (ex: '9:00' ou '09:00'); minutos sempre 2 digitos.
const HorarioSchema = z
  .string()
  .regex(
    /^([01]?\d|2[0-3]):[0-5]\d$/,
    'horario deve ser HH:MM 24h (00:00 a 23:59)'
  );

// Dia da semana: 0=domingo, 6=sabado. Mesma convencao do
// expo-notifications WeeklyTriggerInput.
export const DiaSemanaSchema = z.number().int().min(0).max(6);

// Tag conceitual. Mantemos enum fechado para permitir UI (chips) sem
// drift textual. 'outro' cobre o catch-all sem virar texto livre.
export const AlarmeTagSchema = z.enum(['medicacao', 'treino', 'outro']);
export type AlarmeTag = z.infer<typeof AlarmeTagSchema>;

// Som mapeado para arquivo .wav empacotado. 'gentle' default conservador
// (sons CC0 documentados em assets/sounds/alarmes/CREDITS.md).
export const AlarmeSomSchema = z.enum(['gentle', 'normal', 'forte']);
export type AlarmeSom = z.infer<typeof AlarmeSomSchema>;

// ISO datetime com offset (ex: 2026-04-29T10:00:00-03:00).
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'datetime deve estar em ISO 8601 com offset'
  );

export const AlarmeSchema = z.object({
  tipo: z.literal('alarme'),
  slug: SlugSchema,
  titulo: z.string().min(1).max(80),
  horario: HorarioSchema,
  // Pelo menos 1 dia, no maximo 7 (sem repetidos faz sentido mas não
  // forcamos uniqueness no schema; UI cuida disso).
  dias_semana: z.array(DiaSemanaSchema).min(1).max(7),
  tag: AlarmeTagSchema,
  som: AlarmeSomSchema,
  ativo: z.boolean(),
  // 1 a 60 minutos. Default 5 conforme decisão do spec.
  snooze_minutos: z.number().int().min(1).max(60).default(5),
  criado_em: IsoDatetime,
  // Null antes do primeiro Desligar.
  ultimo_disparo: IsoDatetime.nullable(),
  // Array de identifiers do expo-notifications. Pode ser vazio quando
  // alarme inativo.
  notification_ids: z.array(z.string()).default([]),
  // Identifier de snooze pendente; null quando não ha snooze ativo.
  snooze_id: z.string().nullable(),
});

export type Alarme = z.infer<typeof AlarmeSchema>;

// Labels canonicos PT-BR para UI. Sentence case, acentuacao completa
// (regra 1.4 do BRIEF).
export const TAG_LABELS: Record<AlarmeTag, string> = {
  medicacao: 'Medicação',
  treino: 'Treino',
  outro: 'Outro',
};

export const SOM_LABELS: Record<AlarmeSom, string> = {
  gentle: 'Suave',
  normal: 'Normal',
  forte: 'Forte',
};

// Ordem canonica de iteracao na UI (form e leitura).
export const TAGS_CANONICAS = [
  'medicacao',
  'treino',
  'outro',
] as const satisfies ReadonlyArray<AlarmeTag>;

export const SONS_CANONICOS = [
  'gentle',
  'normal',
  'forte',
] as const satisfies ReadonlyArray<AlarmeSom>;

// Labels curtos dos dias da semana (1 char), sentence case. Ordem
// canonica do schema: 0=domingo. Indices 0-6 espelham o array
// dias_semana do alarme.
export const DIAS_SEMANA_LABELS: readonly string[] = [
  'D',
  'S',
  'T',
  'Q',
  'Q',
  'S',
  'S',
];

// Labels longos para acessibilidade e leitura não redundante. Sem acento
// (a11y label não acentua, convencao do projeto).
export const DIAS_SEMANA_NOMES: readonly string[] = [
  'domingo',
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
];

// Limite hard do Android para schedules ativos. expo-notifications não
// expoe esse cap diretamente; o sistema rejeita silenciosamente alem
// do limite. Toast informativo no 65o (decisão do spec, seção 11).
export const LIMITE_SCHEDULES = 64;

// Helper para gerar slug a partir de titulo. Lower, troca acentos por
// equivalentes ASCII, espacos por '-', remove caracteres invalidos.
// Útil na criacao do alarme; usuario pode ajustar manualmente depois.
export function slugifyTitulo(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD')
    // Remove diacriticos (faixa Unicode U+0300 a U+036F).
    .replace(/[̀-ͯ]/g, '')
    // Mantem so a-z 0-9 espaco e hifen.
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
}
