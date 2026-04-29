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

// Pasta-prefixos das pastas canonicas do mobile. Reader/lister deve
// usar somente estes; nunca varrer raiz para nao tocar dados humanos.
export const VAULT_FOLDERS = {
  daily: 'daily',
  eventos: 'eventos',
  inboxMenteHumor: 'inbox/mente/humor',
  inboxMenteDiario: 'inbox/mente/diario',
  inboxFinanceiroPix: 'inbox/financeiro/pix',
  treinos: 'treinos',
  medidas: 'medidas',
  marcos: 'marcos',
  assets: 'assets',
  cache: '.ouroboros/cache',
} as const;

export type VaultFolderKey = keyof typeof VAULT_FOLDERS;

// Verifica se um nome de arquivo bate com o padrao YYYY-MM-DD no
// inicio (usado para listagens de daily/ e eventos/).
export function fileMatchesDate(filename: string, date: Date): boolean {
  const ymd = formatDateYmd(date);
  return filename.startsWith(ymd);
}
