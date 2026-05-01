// Paths canonicos do Vault. Mobile so escreve/le pastas que ele
// proprio gera; o Vault humano (Diario/, Inbox/, Pessoal/) coexiste
// intocado. Filesystem ext4 e case-sensitive: 'daily' e 'Diario'
// nao colidem.
//
// Convencoes:
// - Datas serializadas no fuso de Sao Paulo (UTC-3 fixo, sem DST a
//   partir de 2019). Formato YYYY-MM-DD para arquivos diarios e
//   YYYY-MM-DD-HHmm para arquivos com hora.
// - 'Slug' e o sufixo livre escolhido pelo usuario (kebab-case).
// - Todos os paths sao relativos ao root do Vault (URI SAF resolvido
//   em runtime). O caller concatena com a base.

const TZ_OFFSET_MIN = -180; // UTC-3 fixo (Sao Paulo, sem DST)
const TZ_SHIFT_MS = TZ_OFFSET_MIN * 60_000;

// Converte um Date (UTC interno) para sua representacao em UTC-3,
// retornando um Date cujos getUTC* refletem os componentes locais
// de Sao Paulo.
function toSaoPauloUtc(date: Date): Date {
  return new Date(date.getTime() + TZ_SHIFT_MS);
}

// Formata um Date para YYYY-MM-DD no fuso de Sao Paulo.
export function formatDateYmd(date: Date): string {
  const local = toSaoPauloUtc(date);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Formata um Date para YYYY-MM-DD-HHmm no fuso de Sao Paulo.
export function formatDateYmdHm(date: Date): string {
  const local = toSaoPauloUtc(date);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}-${hh}${mm}`;
}

// Formata um Date para YYYY-MM-DD-HHmmss no fuso de Sao Paulo.
// Granularidade adicional para o share intent (M08): dois shares
// dentro do mesmo minuto colidiriam se usassemos so HHmm. O
// resolvedor de conflito ainda lida com colisao residual via
// sufixos -1, -2, mas comecar com segundos reduz drasticamente a
// frequencia.
export function formatDateYmdHms(date: Date): string {
  const local = toSaoPauloUtc(date);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  const ss = String(local.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}-${hh}${mm}${ss}`;
}

// daily/YYYY-MM-DD.md (humor do dia).
export function dailyPath(date: Date): string {
  return `daily/${formatDateYmd(date)}.md`;
}

// eventos/YYYY-MM-DD-slug.md.
export function eventosPath(date: Date, slug: string): string {
  return `eventos/${formatDateYmd(date)}-${slug}.md`;
}

// inbox/mente/diario/YYYY-MM-DD-HHmm.md (diario emocional).
export function diarioEmocionalPath(date: Date, slug: string): string {
  return `inbox/mente/diario/${formatDateYmdHm(date)}-${slug}.md`;
}

// assets/<filename> (anexos: fotos, audio).
export function assetsPath(filename: string): string {
  return `assets/${filename}`;
}

// exercicios/<slug>.md (biblioteca de exercicios da M13). Caller
// fornece slug ja em kebab-case ASCII (ver slugifyExercicio em
// src/lib/exercicios/slug.ts).
export function exerciciosPath(slug: string): string {
  return `exercicios/${slug}.md`;
}

// assets/exercicios/<slug>.gif. GIFs ficam fora de assets/<filename>
// para nao misturar com fotos de eventos. Caller fornece slug igual
// ao do .md companion.
export function exerciciosGifPath(slug: string): string {
  return `assets/exercicios/${slug}.gif`;
}

// treinos/draft/YYYY-MM-DD-<slug>.md (M13 cria sessao rapida quando
// usuario toca "Adicionar a treino livre" no detalhe do exercicio).
// Migrado para schema TreinoSessao formal quando M11 chegar.
export function treinosDraftPath(date: Date, slug: string): string {
  return `treinos/draft/${formatDateYmd(date)}-${slug}.md`;
}

// treinos/YYYY-MM-DD-<slug>.md (sessao formal de treino - M11).
// Caller fornece slug ja em kebab-case ASCII.
export function treinosPath(date: Date, slug: string): string {
  return `treinos/${formatDateYmd(date)}-${slug}.md`;
}

// marcos/YYYY-MM-DD-<slug>.md (marco / conquista - M11). Slug em
// kebab-case ASCII (helper slugifyMarco).
export function marcosPath(date: Date, slug: string): string {
  return `marcos/${formatDateYmd(date)}-${slug}.md`;
}

// inbox/financeiro/<subtipo>/YYYY-MM-DD-HHmmss-<slug>.<ext>
// Helper para o share intent receiver (M08). Subtipo vem de
// src/lib/share/categorias.ts (pix, extrato, nota); a extensao
// inclui o ponto se nao vier vazia. Slug e opcional: quando ausente
// o nome final fica somente com timestamp (ex: 2026-04-30-1530.pdf).
export function inboxFinanceiroPath(
  subtipo: 'pix' | 'extrato' | 'nota',
  date: Date,
  args: { ext: string; slug?: string }
): string {
  const ts = formatDateYmdHms(date);
  const slug =
    typeof args.slug === 'string' && args.slug.trim().length > 0
      ? `-${args.slug}`
      : '';
  const ext = args.ext.length > 0 ? `.${args.ext}` : '';
  return `inbox/financeiro/${subtipo}/${ts}${slug}${ext}`;
}

// Pasta-prefixos das pastas canonicas do mobile. Reader/lister deve
// usar somente estes; nunca varrer raiz para nao tocar dados humanos.
//
// Pastas inbox/<area>/<subtipo> sao alimentadas pelo share intent
// receiver (M08, Tela 17). Aqui ficam as 7 entradas adicionais alem
// do inboxFinanceiroPix que ja existia desde a M02.
export const VAULT_FOLDERS = {
  daily: 'daily',
  eventos: 'eventos',
  inboxMenteHumor: 'inbox/mente/humor',
  inboxMenteDiario: 'inbox/mente/diario',
  inboxFinanceiroPix: 'inbox/financeiro/pix',
  inboxFinanceiroExtrato: 'inbox/financeiro/extrato',
  inboxFinanceiroNota: 'inbox/financeiro/nota',
  inboxSaudeExame: 'inbox/saude/exame',
  inboxSaudeReceita: 'inbox/saude/receita',
  inboxCasaGarantia: 'inbox/casa/garantia',
  inboxCasaContrato: 'inbox/casa/contrato',
  inboxOutros: 'inbox/outros',
  treinos: 'treinos',
  treinosDraft: 'treinos/draft',
  medidas: 'medidas',
  marcos: 'marcos',
  exercicios: 'exercicios',
  assets: 'assets',
  assetsExercicios: 'assets/exercicios',
  cache: '.ouroboros/cache',
} as const;

export type VaultFolderKey = keyof typeof VAULT_FOLDERS;

// Verifica se um nome de arquivo bate com o padrao YYYY-MM-DD no
// inicio (usado para listagens de daily/ e eventos/).
export function fileMatchesDate(filename: string, date: Date): boolean {
  const ymd = formatDateYmd(date);
  return filename.startsWith(ymd);
}
