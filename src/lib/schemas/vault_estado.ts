// Schemas zod para o estado canonico do app espelhado em
// vault/_estado/. Cada bloco corresponde a um store zustand
// persistido (settings, sessao, onboarding, pessoa, navegacao).
//
// R-VAULT-CANONICAL-COMPLETE-A (2026-05-16): SecureStore continua
// sendo o cache rapido + fallback offline. O Vault e a fonte canonica
// para o sibling Python ler estado consolidado. Estes schemas validam
// payload ANTES de escrever em .md, garantindo que sibling sempre
// tenha frontmatter parseavel.
//
// Cada schema:
//  - Carrega 'version: 1' explicito (Q12 ja faz isso global via
//    _schema_version, mas mantemos a chave 'version' tipica do
//    schema-de-store para compat com leitores que nao olhem frontmatter).
//  - Aceita forma parcial via z.preprocess defensivo: caller pode passar
//    o getState() bruto do store; campos desconhecidos sao strippados
//    por Zod 4 default. Sem isso, leitura cross-versao quebraria.
//  - Tipos exportados via z.infer pra reuso em escreverEstado.
//
// Convencao de cada bloco:
//   _schema_version (frontmatter Q12) + version (interna do schema) +
//   campos do store + atualizadoEm (ISO datetime).
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import { PessoaAutorSchema, PessoaIdSchema } from '@/lib/schemas/pessoa';

// ===== Helpers genericos =====

// ISO datetime com offset ou Z (mesmo padrao de schemas existentes).
const IsoDatetime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?([+-]\d{2}:\d{2}|Z)$/,
    'datetime deve estar em ISO 8601 com offset'
  );

// Versao do schema canonico de estado. Incrementar quando o shape
// canonico mudar de forma incompativel para o sibling Python.
export const ESTADO_SCHEMA_VERSION = 1 as const;

// ===== Settings (useSettings) =====
//
// Shape v2 do store (M29). Aceita apenas as 5 chaves canonicas;
// chaves extras sao strippadas. Defaults em z.boolean() porque o
// store sempre devolve booleans (nao undefined).
export const EstadoSettingsSchema = z.object({
  version: z.literal(ESTADO_SCHEMA_VERSION),
  somVibracao: z.object({
    geral: z.boolean(),
    despertar: z.boolean(),
    conquista: z.boolean(),
    botoes: z.boolean(),
  }),
  pessoa: z.object({
    ativa: PessoaAutorSchema,
    vaultCompartilhado: z.boolean(),
    tipoCompanhia: z.enum(['sozinho', 'duo']),
  }),
  featureToggles: z.object({
    cicloMenstrual: z.boolean(),
    alarmePessoal: z.boolean(),
    todoLeve: z.boolean(),
    contadorDiasSem: z.boolean(),
    calendarioConquistas: z.boolean(),
    widgetHomescreen: z.boolean(),
    widgetMostraNome: z.boolean(),
    mostrarFinancasEmDesenvolvimento: z.boolean(),
    backupAutomaticoSemanal: z.boolean(),
    healthConnectSync: z.boolean(),
    recapAmbientAudio: z.boolean(),
  }),
  privacidade: z.object({
    biometriaAbrir: z.boolean(),
    ocultarTranscricoes: z.boolean(),
  }),
  midia: z.object({
    capPorRegistro: z.number().int().min(1),
    permitirAudio: z.boolean(),
  }),
  atualizadoEm: IsoDatetime,
});
export type EstadoSettings = z.infer<typeof EstadoSettingsSchema>;

// ===== Sessao (useSessao) =====
//
// Rascunhos sao snapshots em construcao (Partial<*Meta>). Para o
// vault canonico, persistimos um JSON serializavel; o schema valida
// que cada chave existe e que rascunhos sao record (ou null).
const Rascunho = z.union([z.record(z.string(), z.unknown()), z.null()]);

export const EstadoSessaoSchema = z.object({
  version: z.literal(ESTADO_SCHEMA_VERSION),
  ultimaRota: z.string().nullable(),
  rascunhos: z.object({
    humorRapido: Rascunho,
    diarioEmocional: Rascunho,
    eventos: Rascunho,
    cicloRegistrar: Rascunho,
    alarmesNovo: Rascunho,
    contadoresNovo: Rascunho,
    tarefasNova: Rascunho,
  }),
  permissoesPedidas: z.object({
    storage: z.boolean(),
    notif: z.boolean(),
    camera: z.boolean(),
    mic: z.boolean(),
  }),
  flags: z.object({
    canalV1Deletado: z.boolean(),
    cacheAgendaMigrado: z.boolean(),
    vaultLayoutMigrado: z.boolean(),
    t2DeviceIdSuffixMigrado: z.boolean(),
    estadoMigradoParaVault: z.boolean(),
  }),
  atualizadoEm: IsoDatetime,
});
export type EstadoSessao = z.infer<typeof EstadoSessaoSchema>;

// ===== Onboarding (useOnboarding) =====
export const EstadoOnboardingSchema = z.object({
  version: z.literal(ESTADO_SCHEMA_VERSION),
  done: z.boolean(),
  tipoCompanhia: z.enum(['sozinho', 'casal', 'amigos']),
  sexoDeclarado: z.object({
    pessoa_a: z
      .enum(['masculino', 'feminino', 'nao-binario', 'prefiro-nao-dizer'])
      .nullable(),
    pessoa_b: z
      .enum(['masculino', 'feminino', 'nao-binario', 'prefiro-nao-dizer'])
      .nullable(),
  }),
  permissoes: z.object({
    storage: z.boolean(),
    camera: z.boolean(),
    microfone: z.boolean(),
    notificacoes: z.boolean(),
    localizacao: z.boolean(),
  }),
  atualizadoEm: IsoDatetime,
});
export type EstadoOnboarding = z.infer<typeof EstadoOnboardingSchema>;

// ===== Pessoa (usePessoa) =====
//
// Nomes reais e fotos sao runtime; o vault canonico precisa do
// snapshot pra que sibling Python saiba mapear pessoa_a -> exibicao.
// fotos podem ser file:// URI (mobile real) ou null.
export const EstadoPessoaSchema = z.object({
  version: z.literal(ESTADO_SCHEMA_VERSION),
  pessoaAtiva: PessoaAutorSchema,
  filtroPessoa: PessoaIdSchema,
  nomes: z.object({
    pessoa_a: z.string(),
    pessoa_b: z.string(),
  }),
  fotos: z.object({
    pessoa_a: z.string().nullable(),
    pessoa_b: z.string().nullable(),
  }),
  atualizadoEm: IsoDatetime,
});
export type EstadoPessoa = z.infer<typeof EstadoPessoaSchema>;

// ===== Navegacao (useNavegacao) =====
//
// useNavegacao e runtime-only (sem persist zustand): menuAberto,
// sheetCapturaAberto e scrollMenuLateralPosition resetam a cada
// boot. Persistir snapshot no Vault e util pra debug e pra que o
// sibling Python possa diagnosticar estado intermediario em momento
// de crash. Como o store nao tem ultimaRota (vive em useSessao),
// mantemos os 3 campos transientes.
export const EstadoNavegacaoSchema = z.object({
  version: z.literal(ESTADO_SCHEMA_VERSION),
  menuAberto: z.boolean(),
  sheetCapturaAberto: z.boolean(),
  scrollMenuLateralPosition: z.number(),
  atualizadoEm: IsoDatetime,
});
export type EstadoNavegacao = z.infer<typeof EstadoNavegacaoSchema>;

// ===== Mapa key -> schema =====
//
// Usado por escreverEstadoCanonico pra resolver schema dado o nome
// da chave. Caller passa 'settings' | 'sessao' | 'onboarding' |
// 'pessoa' | 'navegacao'.
export const ESTADO_SCHEMAS = {
  settings: EstadoSettingsSchema,
  sessao: EstadoSessaoSchema,
  onboarding: EstadoOnboardingSchema,
  pessoa: EstadoPessoaSchema,
  navegacao: EstadoNavegacaoSchema,
} as const;

export type EstadoKey = keyof typeof ESTADO_SCHEMAS;
