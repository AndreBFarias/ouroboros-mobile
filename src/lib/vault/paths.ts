// Paths canonicos do Vault. Mobile so escreve/le pastas que ele
// proprio gera; o Vault humano (Diario/, Inbox/, Pessoal/) coexiste
// intocado. Filesystem ext4 e case-sensitive: 'daily' e 'Diario'
// não colidem.
//
// Convencoes:
// - Datas serializadas no fuso de São Paulo (UTC-3 fixo, sem DST a
//   partir de 2019). Formato YYYY-MM-DD para arquivos diarios e
//   YYYY-MM-DD-HHmm para arquivos com hora.
// - 'Slug' e o sufixo livre escolhido pelo usuario (kebab-case).
// - Todos os paths são relativos ao root do Vault (URI SAF resolvido
//   em runtime). O caller concatena com a base.

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

// assets/<formatDateYmdHm>-<suffix>.m4a (anexo de audio do diario
// emocional - M06.5). Sufixo aleatorio curto evita colisao quando
// duas gravacoes acontecem dentro do mesmo minuto. O caller fornece
// o sufixo (tipicamente 4 chars hex de Math.random); paths.ts so
// monta a string canonica para reuso por recordAudio e por testes.
export function assetsAudioPath(date: Date, suffix: string): string {
  return `assets/${formatDateYmdHm(date)}-${suffix}.m4a`;
}

// exercicios/<slug>.md (biblioteca de exercícios da M13). Caller
// fornece slug já em kebab-case ASCII (ver slugifyExercicio em
// src/lib/exercicios/slug.ts).
export function exerciciosPath(slug: string): string {
  return `exercicios/${slug}.md`;
}

// assets/exercicios/<slug>.gif. GIFs ficam fora de assets/<filename>
// para não misturar com fotos de eventos. Caller fornece slug igual
// ao do .md companion.
export function exerciciosGifPath(slug: string): string {
  return `assets/exercicios/${slug}.gif`;
}

// treinos/draft/YYYY-MM-DD-<slug>.md (M13 cria sessao rapida quando
// usuario toca "Adicionar a treino livre" no detalhe do exercício).
// Migrado para schema TreinoSessao formal quando M11 chegar.
export function treinosDraftPath(date: Date, slug: string): string {
  return `treinos/draft/${formatDateYmd(date)}-${slug}.md`;
}

// treinos/YYYY-MM-DD-<slug>.md (sessao formal de treino - M11).
// Caller fornece slug já em kebab-case ASCII.
export function treinosPath(date: Date, slug: string): string {
  return `treinos/${formatDateYmd(date)}-${slug}.md`;
}

// marcos/YYYY-MM-DD-<slug>.md (marco / conquista - M11). Slug em
// kebab-case ASCII (helper slugifyMarco).
export function marcosPath(date: Date, slug: string): string {
  return `marcos/${formatDateYmd(date)}-${slug}.md`;
}

// medidas/YYYY-MM-DD.md (snapshot diario de medidas corporais - M12).
// Sem slug porque o registro e unico por dia (sobrescreve o anterior
// se o usuario salvar duas vezes no mesmo dia, comportamento
// intencional do form Tela 12).
export function medidasPath(date: Date): string {
  return `medidas/${formatDateYmd(date)}.md`;
}

// assets/m-YYYY-MM-DD-<lado>.jpg (foto de medida corporal). Lado e
// uma das tres posicoes canonicas (frente, costas, lado). Caller
// fornece lado em snake_case ASCII para não colidir com encoding
// nem misturar acentos no filesystem (convencao do projeto).
export function medidasFotoPath(
  date: Date,
  lado: 'frente' | 'costas' | 'lado'
): string {
  return `assets/m-${formatDateYmd(date)}-${lado}.jpg`;
}

// inbox/saude/ciclo/YYYY-MM-DD.md (acompanhamento de ciclo menstrual,
// M14.5). Sem slug porque o registro e unico por dia: registrar duas
// vezes no mesmo dia sobrescreve o anterior. Pasta dedicada para
// isolar dos outros schemas mentais e financeiros (privacidade
// reforcada, ADR-0007).
export function cicloPath(date: Date): string {
  return `inbox/saude/ciclo/${formatDateYmd(date)}.md`;
}

// alarmes/<slug>.md (alarme pessoal opt-in - M16). Slug em kebab-case
// ASCII fornecido pelo usuario (titulo slugificado). Sem datas no path:
// alarme e recorrente; o frontmatter guarda horario, dias_semana e
// notification_ids. Pasta dedicada simplifica listagem e backup.
export function alarmesPath(slug: string): string {
  return `alarmes/${slug}.md`;
}

// tarefas/YYYY-MM-DD-<slug>.md (to-do leve opt-in - M17). Slug em
// kebab-case ASCII derivado do titulo + sufixo random para deduplicar.
// Data e a de criacao (não se altera mesmo após marcar feito); o
// frontmatter guarda feito + feito_em separadamente. Pasta dedicada
// simplifica listagem e backup.
export function tarefasPath(date: Date, slug: string): string {
  return `tarefas/${formatDateYmd(date)}-${slug}.md`;
}

// contadores/<slug>.md (contador "dias sem X" opt-in - M18). Slug em
// kebab-case ASCII fornecido pelo caller. Sem datas no path: o
// contador e persistente; o frontmatter guarda início (data atual de
// início que muda em cada reset), recorde e histórico de resets.
// Pasta dedicada simplifica listagem e backup.
export function contadoresPath(slug: string): string {
  return `contadores/${slug}.md`;
}

// inbox/financeiro/<subtipo>/YYYY-MM-DD-HHmmss-<slug>.<ext>
// Helper para o share intent receiver (M08). Subtipo vem de
// src/lib/share/categorias.ts (pix, extrato, nota); a extensao
// inclui o ponto se não vier vazia. Slug e opcional: quando ausente
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

// inbox/financeiro/nota/YYYY-MM-DD-HHmmss-<slug>.md
// Helper especifico para o .md companion da nota fiscal capturada
// pelo scanner (M09). Wrapper sobre inboxFinanceiroPath fixando o
// subtipo 'nota' e a extensao 'md'. Caller fornece slug em
// kebab-case ASCII (tipicamente derivado do estabelecimento ou
// 'nota' generico quando nao da para inferir).
export function inboxFinanceiroNotaPath(date: Date, slug: string): string {
  return inboxFinanceiroPath('nota', date, { ext: 'md', slug });
}

// .ouroboros/cache/humor-heatmap.json (M10). Cache readonly gerado
// pelo backend (sprint MOB-bridge-2). Mobile so le; ADR-0012 fixa que
// pipelines de agregacao rodam no desktop.
export function humorHeatmapCachePath(): string {
  return '.ouroboros/cache/humor-heatmap.json';
}

// .ouroboros/cache/financas-cache.json (M14). Cache readonly gerado
// pelo backend (sprint MOB-bridge-2). Mobile so le; ADR-0012 fixa que
// pipelines de agregacao rodam no desktop. Contem gasto da semana,
// top categorias e ultimas 20 transacoes.
export function financasCachePath(): string {
  return '.ouroboros/cache/financas-cache.json';
}

// media/fotos/YYYY-MM-DD-<rand>.jpg (M22 + M34). Pasta dedicada para
// fotos capturadas via menu verde de captura. Caller fornece sufixo
// random curto (4-6 chars) para deduplicar dentro do mesmo dia.
export function mediaFotosPath(date: Date, rand: string): string {
  return `media/fotos/${formatDateYmd(date)}-${rand}.jpg`;
}

// media/audios/YYYY-MM-DD-<rand>.m4a (M22 + M34). Idem fotos: pasta
// dedicada para audio do diario emocional ou captura livre. M06.5 hoje
// usa assets/<formatDateYmdHm>-<suffix>.m4a; migracao para media/audios
// fica para M39 (assetsLegacy migrator).
export function mediaAudiosPath(date: Date, rand: string): string {
  return `media/audios/${formatDateYmd(date)}-${rand}.m4a`;
}

// media/videos/YYYY-MM-DD-<rand>.mp4 (M22 + M34). Pasta nova para
// videos curtos capturados pelo menu verde.
export function mediaVideosPath(date: Date, rand: string): string {
  return `media/videos/${formatDateYmd(date)}-${rand}.mp4`;
}

// media/frases/YYYY-MM-DD-<slug>.md (M22 + M34). Frase capturada como
// .md curto: caller fornece slug derivado das primeiras palavras.
export function mediaFrasesPath(date: Date, slug: string): string {
  return `media/frases/${formatDateYmd(date)}-${slug}.md`;
}

// media/avatares/<pessoa>-<ts>.jpg (M22 + M34). Avatares trocados ao
// longo do tempo: o timestamp evita cache do <Image> (vide A6) e
// preserva historico para o usuario voltar atras.
export function mediaAvataresPath(
  pessoa: 'pessoa_a' | 'pessoa_b',
  ts: number
): string {
  return `media/avatares/${pessoa}-${ts}.jpg`;
}

// media/scanner/<slug>.jpg (M22 + M34). Documentos digitalizados
// (notas, recibos) que ainda nao foram movidos para inbox/financeiro.
// Caller fornece slug em kebab-case ASCII.
export function mediaScannerPath(slug: string): string {
  return `media/scanner/${slug}.jpg`;
}

// Pasta-prefixos das pastas canonicas do mobile. Reader/lister deve
// usar somente estes; nunca varrer raiz para não tocar dados humanos.
//
// Pastas inbox/<area>/<subtipo> são alimentadas pelo share intent
// receiver (M08, Tela 17). Aqui ficam as 7 entradas adicionais alem
// do inboxFinanceiroPix que já existia desde a M02.
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
  inboxSaudeCiclo: 'inbox/saude/ciclo',
  inboxCasaGarantia: 'inbox/casa/garantia',
  inboxCasaContrato: 'inbox/casa/contrato',
  inboxOutros: 'inbox/outros',
  inboxArquivos: 'inbox/arquivos',
  treinos: 'treinos',
  treinosDraft: 'treinos/draft',
  medidas: 'medidas',
  marcos: 'marcos',
  exercicios: 'exercicios',
  alarmes: 'alarmes',
  tarefas: 'tarefas',
  contadores: 'contadores',
  assets: 'assets',
  assetsExercicios: 'assets/exercicios',
  mediaFotos: 'media/fotos',
  mediaAudios: 'media/audios',
  mediaVideos: 'media/videos',
  mediaFrases: 'media/frases',
  mediaAvatares: 'media/avatares',
  mediaScanner: 'media/scanner',
  cache: '.ouroboros/cache',
} as const;

export type VaultFolderKey = keyof typeof VAULT_FOLDERS;

// Verifica se um nome de arquivo bate com o padrao YYYY-MM-DD no
// início (usado para listagens de daily/ e eventos/).
export function fileMatchesDate(filename: string, date: Date): boolean {
  const ymd = formatDateYmd(date);
  return filename.startsWith(ymd);
}
