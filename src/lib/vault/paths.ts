// Paths canonicos do Vault. Layout-por-tipo (ADR-0023, sprint H2 do
// plano golden-zebra). Todos os .md vivem em markdown/ com prefixo
// de feature embutido no filename. Binarios separados por extensao
// (png/, jpg/, m4a/, mp4/, pdf/, gif/). Cache mantido em
// .ouroboros/cache/ (excecao ADR-0019).
//
// Convencoes:
// - Datas serializadas no fuso de São Paulo (UTC-3 fixo, sem DST a
//   partir de 2019). Formato YYYY-MM-DD para arquivos diarios e
//   YYYY-MM-DD-HHmm para arquivos com hora.
// - 'Slug' e o sufixo livre escolhido pelo usuario (kebab-case).
// - Todos os paths são relativos ao root do Vault (URI SAF resolvido
//   em runtime). O caller concatena com a base via vaultUriJoin.
// - Helpers legados (treinosPath, inboxFinanceiroPath, assetsPath etc.)
//   permanecem para nao quebrar features fora do escopo da H2 (share
//   intent receiver M08, treinos M11). Migracao formal dessas features
//   fica para sprints derivadas (registradas como achado colateral em
//   M-VAULT-LAYOUT-POR-TIPO).
//
// Comentarios sem acento (convencao shell/CI).

// Helper canonico para concatenacao de URIs do Vault. Resolve o
// problema de trailing whitespace + barras duplas + percent-encoding
// ofensivo (%20 no fim do tree URI SAF) que vinha contaminando saves
// em OEMs MIUI/OneUI/HyperOS. Lanca erro claro se root ou rel
// estiverem vazios - sinal de bug em estado anterior do app.
export function vaultUriJoin(root: string, rel: string): string {
  const r = root
    .trim()
    .replace(/\s+$/, '') // trim trailing whitespace
    .replace(/%20+$/, '') // trim trailing percent-encoded space
    .replace(/\/+$/, ''); // trim trailing slashes
  const s = rel
    .trim()
    .replace(/^\s+/, '') // trim leading whitespace
    .replace(/^\/+/, ''); // trim leading slashes
  if (!r) {
    throw new Error('vaultUriJoin: root vazio (vault não inicializado?)');
  }
  if (!s) {
    throw new Error('vaultUriJoin: rel vazio');
  }
  return `${r}/${s}`;
}

const TZ_OFFSET_MIN = -180; // UTC-3 fixo (São Paulo, sem DST)
const TZ_SHIFT_MS = TZ_OFFSET_MIN * 60_000;

// Converte um Date (UTC interno) para sua representacao em UTC-3,
// retornando um Date cujos getUTC* refletem os componentes locais
// de São Paulo.
function toSaoPauloUtc(date: Date): Date {
  return new Date(date.getTime() + TZ_SHIFT_MS);
}

// Formata um Date para YYYY-MM-DD no fuso de São Paulo.
export function formatDateYmd(date: Date): string {
  const local = toSaoPauloUtc(date);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Formata um Date para YYYY-MM-DD-HHmm no fuso de São Paulo.
export function formatDateYmdHm(date: Date): string {
  const local = toSaoPauloUtc(date);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}-${hh}${mm}`;
}

// Formata um Date para YYYY-MM-DD-HHmmss no fuso de São Paulo.
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

// =====================================================================
// Helpers do novo layout-por-tipo (ADR-0023)
// =====================================================================
//
// Convencao para .md: markdown/<feature>-<chave>.md
// Convencao para binario: <ext>/<feature>-<chave>.<ext>
// Companion .md sempre em markdown/<feature>-<chave>.md
// Caller concatena com vaultRoot via vaultUriJoin.

export const MARKDOWN_FOLDER = 'markdown';
export const PNG_FOLDER = 'png';
export const JPG_FOLDER = 'jpg';
export const M4A_FOLDER = 'm4a';
export const MP4_FOLDER = 'mp4';
export const PDF_FOLDER = 'pdf';
export const GIF_FOLDER = 'gif';
export const CACHE_FOLDER = '.ouroboros/cache';

// markdown/humor-YYYY-MM-DD.md
export function humorPath(date: Date): string {
  return `markdown/humor-${formatDateYmd(date)}.md`;
}

// markdown/diario-YYYY-MM-DD-HHmm-<slug>.md
export function diarioPath(date: Date, slug: string): string {
  return `markdown/diario-${formatDateYmdHm(date)}-${slug}.md`;
}

// markdown/evento-YYYY-MM-DD-<slug>.md
export function eventoPath(date: Date, slug: string): string {
  return `markdown/evento-${formatDateYmd(date)}-${slug}.md`;
}

// markdown/marco-YYYY-MM-DD-<slug>.md
export function marcoPath(date: Date, slug: string): string {
  return `markdown/marco-${formatDateYmd(date)}-${slug}.md`;
}

// markdown/medidas-YYYY-MM-DD.md
export function medidasPath(date: Date): string {
  return `markdown/medidas-${formatDateYmd(date)}.md`;
}

// jpg/medidas-YYYY-MM-DD-<lado>.jpg (foto de medida corporal)
export function medidasFotoPath(
  date: Date,
  lado: 'frente' | 'costas' | 'lado'
): string {
  return `jpg/medidas-${formatDateYmd(date)}-${lado}.jpg`;
}

// markdown/medidas-foto-YYYY-MM-DD-<lado>.md (companion da foto de medida)
export function medidasFotoCompanionPath(
  date: Date,
  lado: 'frente' | 'costas' | 'lado'
): string {
  return `markdown/medidas-foto-${formatDateYmd(date)}-${lado}.md`;
}

// markdown/exercicio-<slug>.md
export function exercicioPath(slug: string): string {
  return `markdown/exercicio-${slug}.md`;
}

// gif/exercicio-<slug>.gif
export function exercicioGifPath(slug: string): string {
  return `gif/exercicio-${slug}.gif`;
}

// markdown/ciclo-YYYY-MM-DD.md
export function cicloPath(date: Date): string {
  return `markdown/ciclo-${formatDateYmd(date)}.md`;
}

// markdown/alarme-<slug>.md
export function alarmePath(slug: string): string {
  return `markdown/alarme-${slug}.md`;
}

// markdown/tarefa-<slug>.md
// Decisao H2: tarefa nao usa data no path (somente slug). Slug ja
// inclui sufixo random para deduplicar; data de criacao vive no
// frontmatter. Quem listar por data le frontmatter.
export function tarefaPath(slug: string): string {
  return `markdown/tarefa-${slug}.md`;
}

// markdown/rotina-<slug>.md (Q11, M-ROTINA-TREINO)
// Rotina de treino reusavel (template). Slug e a chave estavel; nome
// pode mudar em edicao. data_criacao vive no frontmatter.
export function rotinaPath(slug: string): string {
  return `markdown/rotina-${slug}.md`;
}

// markdown/grupo-<slug>.md (Q19, Grupos de Treino)
// Container que referencia 1..10 rotinas por slug. Permite "Treino A
// /B/C" sob um mesmo grupo "Treino do Quaresma" sem duplicar dados.
export function grupoPath(slug: string): string {
  return `markdown/grupo-${slug}.md`;
}

// markdown/contador-<slug>.md
export function contadorPath(slug: string): string {
  return `markdown/contador-${slug}.md`;
}

// markdown/evento-contador-<contadorId>-<YYYY-MM-DD>-<slug>.md
// (R-RECAP-5, 2026-05-16). Evento pontual associado a um Contador.
// contadorId e a chave estavel do contador-pai; data e o dia do
// evento; slug deriva da descricao + sufixo random. Listagem por
// contador filtra por prefixo "evento-contador-<contadorId>-".
export function eventoContadorPath(
  contadorId: string,
  date: Date,
  slug: string
): string {
  return `markdown/evento-contador-${contadorId}-${formatDateYmd(date)}-${slug}.md`;
}

// markdown/nota-YYYY-MM-DD-HHmmss-<slug>.md
// Companion .md de uma nota fiscal capturada pelo scanner ou recebida
// via share intent. Spec H2 §2: sempre em markdown/.
export function notaPath(date: Date, slug: string): string {
  return `markdown/nota-${formatDateYmdHms(date)}-${slug}.md`;
}

// <ext>/nota-YYYY-MM-DD-HHmmss-<slug>.<ext>
// Binario da nota (pdf/jpg/png) recebido via share intent ou scanner.
// Caller fornece ext sem o ponto (ex: 'pdf', 'jpg'); funcao roteia
// para a pasta de tipo correta.
export function notaArquivoPath(date: Date, slug: string, ext: string): string {
  const extLower = ext.toLowerCase();
  return `${extLower}/nota-${formatDateYmdHms(date)}-${slug}.${extLower}`;
}

// <ext>/foto-YYYY-MM-DD-<rand>.<ext> (jpg ou png)
export function fotoPath(date: Date, rand: string, ext: string): string {
  const extLower = ext.toLowerCase();
  return `${extLower}/foto-${formatDateYmd(date)}-${rand}.${extLower}`;
}

// markdown/foto-YYYY-MM-DD-<rand>.md (companion da foto)
export function fotoCompanionPath(date: Date, rand: string): string {
  return `markdown/foto-${formatDateYmd(date)}-${rand}.md`;
}

// m4a/audio-YYYY-MM-DD-<rand>.m4a
export function audioPath(date: Date, rand: string): string {
  return `m4a/audio-${formatDateYmd(date)}-${rand}.m4a`;
}

// markdown/audio-YYYY-MM-DD-<rand>.md (companion do audio)
export function audioCompanionPath(date: Date, rand: string): string {
  return `markdown/audio-${formatDateYmd(date)}-${rand}.md`;
}

// mp4/video-YYYY-MM-DD-<rand>.mp4
export function videoPath(date: Date, rand: string): string {
  return `mp4/video-${formatDateYmd(date)}-${rand}.mp4`;
}

// markdown/video-YYYY-MM-DD-<rand>.md (companion do video)
export function videoCompanionPath(date: Date, rand: string): string {
  return `markdown/video-${formatDateYmd(date)}-${rand}.md`;
}

// markdown/frase-YYYY-MM-DD-<slug>.md
export function frasePath(date: Date, slug: string): string {
  return `markdown/frase-${formatDateYmd(date)}-${slug}.md`;
}

// <ext>/scanner-<slug>.<ext> (jpg ou pdf)
export function scannerPath(slug: string, ext: 'jpg' | 'pdf'): string {
  return `${ext}/scanner-${slug}.${ext}`;
}

// markdown/scanner-<slug>.md (companion do scan)
export function scannerCompanionPath(slug: string): string {
  return `markdown/scanner-${slug}.md`;
}

// jpg/avatar-<pessoa>-<ts>.jpg (avatares usam .jpg fixo).
// Timestamp evita cache do <Image> (Armadilha A6).
export function avatarPath(
  pessoa: 'pessoa_a' | 'pessoa_b',
  ts: number
): string {
  return `jpg/avatar-${pessoa}-${ts}.jpg`;
}

// markdown/agenda-<pessoa>-YYYY-MM-DD-<eventId>.md
// Caller fornece inicio (ISO 8601 com offset), eventId vem direto da
// resposta da Google Calendar API (Base32hex slug-safe).
export function agendaEventoPath(
  pessoa: 'pessoa_a' | 'pessoa_b',
  iso: string,
  eventId: string
): string {
  const ymd = iso.slice(0, 10);
  return `markdown/agenda-${pessoa}-${ymd}-${eventId}.md`;
}

// markdown/_devices.md (devices index, ADR-0023)
export function devicesIndexPath(): string {
  return 'markdown/_devices.md';
}

// .ouroboros/cache/humor-heatmap.json (M10). Cache readonly gerado
// pelo backend (sprint MOB-bridge-2). Mobile so le; ADR-0012.
export function humorHeatmapCachePath(): string {
  return '.ouroboros/cache/humor-heatmap.json';
}

// .ouroboros/cache/financas-cache.json (M14). Cache readonly.
export function financasCachePath(): string {
  return '.ouroboros/cache/financas-cache.json';
}

// =====================================================================
// VAULT_FOLDERS canonico do novo layout (ADR-0023)
// =====================================================================
//
// Exposto como tupla readonly para iteracao via for-of em
// inicializarVaultCanonico e exportarVault. Callers que iteram com
// Object.entries continuam funcionando: arrays expoem entries
// numericas [indice, valor].

export const VAULT_FOLDERS = [
  'markdown',
  'png',
  'jpg',
  'm4a',
  'mp4',
  'pdf',
  'gif',
  '.ouroboros/cache',
] as const;

export type VaultFolder = (typeof VAULT_FOLDERS)[number];

// =====================================================================
// Helpers de listagem (layout-por-tipo)
// =====================================================================

// Verifica se um nome de arquivo bate com o padrao YYYY-MM-DD em
// alguma posicao do filename (legado: prefixo). No layout novo a data
// vem apos o prefixo de feature (ex: humor-2026-05-06.md), entao a
// busca e por inclusao em vez de prefixo.
export function fileMatchesDate(filename: string, date: Date): boolean {
  const ymd = formatDateYmd(date);
  return filename.includes(ymd);
}

// Verifica se o basename de um arquivo bate com um prefixo de feature
// no layout-por-tipo. Tolera caminhos completos: extrai a parte apos
// a ultima barra. Ex: matchesFeaturePrefix(uri, 'humor-') => true se
// arquivo se chama humor-2026-05-06.md.
export function matchesFeaturePrefix(
  filenameOrUri: string,
  prefix: string
): boolean {
  const decoded = (() => {
    try {
      return decodeURIComponent(filenameOrUri);
    } catch {
      return filenameOrUri;
    }
  })();
  const last = decoded.split('/').pop() ?? decoded;
  return last.startsWith(prefix);
}

// =====================================================================
// Helpers legados (mantidos para compatibilidade fora do escopo H2)
// =====================================================================
//
// Sprints futuras devem migrar consumidores para os helpers novos.
// Documentado em ADR-0023: share intent receiver (M08), treinos
// formais (M11) e share/path-resolver (M08) continuam usando esses
// helpers ate sprint dedicada.

// daily/YYYY-MM-DD.md (humor do dia, layout legado).
// Usado por widget/atualizarWidgetHomescreen para compatibilidade
// com saves anteriores ao layout-por-tipo. saveHumor canonico ja
// usa humorPath.
export function dailyPath(date: Date): string {
  return `daily/${formatDateYmd(date)}.md`;
}

// eventos/YYYY-MM-DD-slug.md (eventos legado).
export function eventosPath(date: Date, slug: string): string {
  return `eventos/${formatDateYmd(date)}-${slug}.md`;
}

// inbox/mente/diario/YYYY-MM-DD-HHmm.md (diario emocional legado).
export function diarioEmocionalPath(date: Date, slug: string): string {
  return `inbox/mente/diario/${formatDateYmdHm(date)}-${slug}.md`;
}

// assets/<filename> (legado, usado apenas pelo MidiaFotoTab quando
// le fotos antigas pre-M22).
export function assetsPath(filename: string): string {
  return `assets/${filename}`;
}

// assets/<formatDateYmdHm>-<suffix>.m4a (legado M06.5).
export function assetsAudioPath(date: Date, suffix: string): string {
  return `assets/${formatDateYmdHm(date)}-${suffix}.m4a`;
}

// exercicios/<slug>.md (layout legado de exercicios).
// Mantido para callers que ainda referenciam esta convencao.
export function exerciciosPath(slug: string): string {
  return `exercicios/${slug}.md`;
}

// assets/exercicios/<slug>.gif (legado).
export function exerciciosGifPath(slug: string): string {
  return `assets/exercicios/${slug}.gif`;
}

// treinos/draft/YYYY-MM-DD-<slug>.md (legado M11).
export function treinosDraftPath(date: Date, slug: string): string {
  return `treinos/draft/${formatDateYmd(date)}-${slug}.md`;
}

// treinos/YYYY-MM-DD-<slug>.md (legado M11).
export function treinosPath(date: Date, slug: string): string {
  return `treinos/${formatDateYmd(date)}-${slug}.md`;
}

// marcos/YYYY-MM-DD-<slug>.md (legado, mantido para migrarVaultLayoutPorTipo).
export function marcosPath(date: Date, slug: string): string {
  return `marcos/${formatDateYmd(date)}-${slug}.md`;
}

// alarmes/<slug>.md (legado).
export function alarmesPath(slug: string): string {
  return `alarmes/${slug}.md`;
}

// tarefas/YYYY-MM-DD-<slug>.md (legado, com data no path).
export function tarefasPath(date: Date, slug: string): string {
  return `tarefas/${formatDateYmd(date)}-${slug}.md`;
}

// contadores/<slug>.md (legado).
export function contadoresPath(slug: string): string {
  return `contadores/${slug}.md`;
}

// inbox/financeiro/<subtipo>/YYYY-MM-DD-HHmmss-<slug>.<ext>
// Helper para o share intent receiver (M08). Mantido em layout legado
// porque share intent tem subtipos (pix/extrato/exame/...) que nao
// foram cobertos pelo redesenho H2. Sprint dedicada migrara.
export function inboxFinanceiroPath(
  subtipo: 'pix' | 'extrato' | 'nota' | 'boleto',
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

// inbox/financeiro/nota/YYYY-MM-DD-HHmmss-<slug>.md (legado).
export function inboxFinanceiroNotaPath(date: Date, slug: string): string {
  return inboxFinanceiroPath('nota', date, { ext: 'md', slug });
}

// media/fotos/YYYY-MM-DD-<rand>.jpg (legado pre-H2).
export function mediaFotosPath(date: Date, rand: string): string {
  return `media/fotos/${formatDateYmd(date)}-${rand}.jpg`;
}

// media/audios/YYYY-MM-DD-<rand>.m4a (legado pre-H2).
export function mediaAudiosPath(date: Date, rand: string): string {
  return `media/audios/${formatDateYmd(date)}-${rand}.m4a`;
}

// media/videos/YYYY-MM-DD-<rand>.mp4 (legado pre-H2).
export function mediaVideosPath(date: Date, rand: string): string {
  return `media/videos/${formatDateYmd(date)}-${rand}.mp4`;
}

// media/frases/YYYY-MM-DD-<slug>.md (legado pre-H2).
export function mediaFrasesPath(date: Date, slug: string): string {
  return `media/frases/${formatDateYmd(date)}-${slug}.md`;
}

// media/avatares/<pessoa>-<ts>.jpg (legado pre-H2).
export function mediaAvataresPath(
  pessoa: 'pessoa_a' | 'pessoa_b',
  ts: number
): string {
  return `media/avatares/${pessoa}-${ts}.jpg`;
}

// media/scanner/<slug>.<ext> (legado pre-H2).
export function mediaScannerPath(slug: string): string;
export function mediaScannerPath(basename: string, ext: string): string;
export function mediaScannerPath(slugOrBasename: string, ext?: string): string {
  if (typeof ext === 'string' && ext.length > 0) {
    return `media/scanner/${slugOrBasename}.${ext}`;
  }
  return `media/scanner/${slugOrBasename}.jpg`;
}

// agenda/<pessoa>/ (legado: caller previo de agenda M37.1.2).
// Mantido apenas para a migration H2 referenciar o path antigo.
export function agendaPessoaFolder(pessoa: 'pessoa_a' | 'pessoa_b'): string {
  return `agenda/${pessoa}`;
}
