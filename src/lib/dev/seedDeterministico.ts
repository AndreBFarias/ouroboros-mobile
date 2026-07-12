// M-GAUNTLET-SEED-V2: helpers de seed deterministico para popular
// stores mock com dados sinteticos. Web/dev only -- todos os helpers
// de dados (humores/diarios/eventos) sao no-op fora de GAUNTLET_ATIVO.
//
// Versao 1 (M-GAUNTLET): cobria so seed minimo de identidade.
// Versao 2 (M-GAUNTLET-SEED-V2): adiciona seedHumores, seedDiarios e
// seedEventos chamando fixtures JSON deterministicas em
// src/lib/dev/fixtures/. Cada fixture guarda offsetDias / offsetHoras
// relativos a "hoje" para ser invariante no tempo; o seeder calcula
// data real em runtime.
//
// Determinismo: as fixtures sao geradas uma vez (ver bloco no topo
// de cada .json), nao dependem de Math.random. Duas chamadas
// consecutivas a seedHumores/seedDiarios/seedEventos produzem
// exatamente o mesmo conteudo nas stores mock.
//
// Comentarios sem acento (convencao shell/CI).
import { GAUNTLET_ATIVO, gauntlet, type SeedOpcoes } from '@/lib/dev/gauntlet';
import { useHumorMock } from '@/lib/dev/humorMock';
import { useDiarioMock, type DiarioMockEntrada } from '@/lib/dev/diarioMock';
import { useEventosMock, type EventoMockEntrada } from '@/lib/dev/eventosMock';
import {
  formatDateYmd,
  diarioPath,
  eventoPath,
  humorPath,
  passosPath,
  sonoPath,
  treinosPath,
  medidasPath,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { stringifyFrontmatter } from '@/lib/vault/frontmatter';
import { useVault } from '@/lib/stores/vault';
import { useVaultMock } from '@/lib/dev/vaultMockStore';
import type { HumorHeatmapCell } from '@/lib/schemas/humor_heatmap_cache';
import type { PessoaAutor, PessoaId } from '@/lib/schemas/pessoa';

import humoresFixture from '@/lib/dev/fixtures/humores-30d.json';
import diariosFixture from '@/lib/dev/fixtures/diarios-3.json';
import eventosFixture from '@/lib/dev/fixtures/eventos-7.json';

// Tipos das fixtures (espelham os JSONs gerados). Mantem o JSON tipado
// sem necessidade de zod; o gerador deterministico ja garante shape.
interface HumorFixtureCelula {
  offsetDias: number;
  autor: 'pessoa_a' | 'pessoa_b';
  humor: number;
  energia: number;
  ansiedade: number;
  foco: number;
  tags: string[];
}

interface DiarioFixtureEntrada {
  offsetHoras: number;
  autor: 'pessoa_a' | 'pessoa_b';
  // R0 lexical: aceita ambos vocabularios (legacy + canonico).
  // Fixtures antigas com 'trigger'/'vitoria' permanecem validas; novas
  // entradas devem usar 'gatilho'/'conquista'.
  modo: 'trigger' | 'vitoria' | 'gatilho' | 'conquista' | 'reflexao';
  intensidade: number;
  emocoes: string[];
  com: string[];
  contextoSocial: Array<'amigos' | 'sozinho'>;
  texto: string;
  estrategia?: string;
  funcionou?: boolean;
  tags: string[];
  midia?: string[];
}

interface EventoFixtureEntrada {
  offsetDias: number;
  autor: 'pessoa_a' | 'pessoa_b';
  modo: 'positivo' | 'negativo';
  lugar: string;
  categoria: string;
  com: string[];
  intensidade: number;
  descricao: string;
  fotos: string[];
  midia: string[];
  slug: string;
}

// Identidade -- mesmas APIs da v1.
export function seedSozinho(nomeA: string = 'Nome_A'): void {
  gauntlet.seed({ nomeA, nomeB: null });
}

export function seedDuo(
  nomeA: string = 'Nome_A',
  nomeB: string = 'Nome_B'
): void {
  gauntlet.seed({ nomeA, nomeB });
}

export function seedCustom(opts: SeedOpcoes): void {
  gauntlet.seed(opts);
}

export function resetTotal(): void {
  gauntlet.reset();
}

// Calcula uma data real (Date) a partir de offsetDias relativo a hoje.
// Hoje = referencia opcional (default: new Date()) para permitir
// determinismo em teste (caller injeta data fixa).
function dataDeOffset(offsetDias: number, hoje?: Date): Date {
  const base = hoje ? new Date(hoje.getTime()) : new Date();
  base.setUTCHours(12, 0, 0, 0); // meio-dia UTC para evitar drift de DST/TZ
  base.setUTCDate(base.getUTCDate() + offsetDias);
  return base;
}

function dataIsoDeOffsetHoras(offsetHoras: number, agora?: Date): string {
  const base = agora ? new Date(agora.getTime()) : new Date();
  base.setTime(base.getTime() + offsetHoras * 3600_000);
  // ISO 8601 com hora ate minuto, fuso UTC (Z).
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d = String(base.getUTCDate()).padStart(2, '0');
  const hh = String(base.getUTCHours()).padStart(2, '0');
  const mm = String(base.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}Z`;
}

// V4.0.1 (INFRA-VAULT-MOCK-CONVERGENCIA): helpers de espelhamento.
// Cada seed* alem de popular o store de dominio (humorMock, diarioMock,
// eventosMock) tambem popula useVaultMock com o .md serializado, para
// que reader/Recap web enxerguem os fixtures via caminho canonico.

// Slug curto a partir das primeiras palavras de um texto livre. ASCII
// kebab-case, max 24 chars. Espelha companion.slugDeFrase mas mais
// curto (path de diario ja tem timestamp, slug serve so para legibilidade).
function slugCurto(texto: string): string {
  const limpo = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 24)
    .replace(/-+$/, '');
  return limpo.length > 0 ? limpo : 'sem-titulo';
}

// Espelha um conteudo .md serializado no useVaultMock no path
// <vaultRoot>/<rel>. Se vaultRoot nao foi setado (caller esqueceu
// seed de identidade), pula silenciosamente -- mock so faz sentido
// quando ha vaultRoot.
function espelharNoVaultMock(rel: string, conteudo: string): void {
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return;
  const uri = vaultUriJoin(vaultRoot, rel);
  useVaultMock.getState().setArquivo(uri, conteudo);
}

// Casts seguros: a fixture guarda 'pessoa_a'/'pessoa_b'/'ambos' como
// string; o tipo PessoaId/PessoaAutor restringe a esses literais.
function comoAutor(s: string): PessoaAutor {
  return s === 'pessoa_b' ? 'pessoa_b' : 'pessoa_a';
}
function comoPessoaId(s: string): PessoaId {
  if (s === 'pessoa_b') return 'pessoa_b';
  if (s === 'ambos') return 'ambos';
  return 'pessoa_a';
}

// seedHumores: gera dias de humor a partir do fixture humores-30d.json.
// Argumento dias = N controla quantos dias do fixture sao usados (1..30).
// Default 30 = todos. Persiste em useHumorMock; reset() limpa.
//
// Em mobile/release (GAUNTLET_ATIVO=false), e no-op. Em web/dev, plug
// no useHumorHeatmap mescla as celulas com qualquer cache real.
//
// Hoje = parametro opcional para teste deterministico.
//
// V4.0.1: alem de useHumorMock, popular useVaultMock com .md
// serializado em markdown/humor-YYYY-MM-DD-<autor>.md. Path canonico
// do reader e markdown/humor-YYYY-MM-DD.md, mas dois autores no mesmo
// dia colidem; sufixo por autor evita colisao e ainda casa o filtro
// matchesFeaturePrefix('humor-').
export function seedHumores(dias: number = 30, hoje?: Date): void {
  if (!GAUNTLET_ATIVO) return;
  const total = Math.max(1, Math.min(30, dias));
  const limiar = -(total - 1); // ex: dias=30 -> limiar -29; dias=7 -> limiar -6
  const fonte = humoresFixture.celulas as HumorFixtureCelula[];
  const filtradas = fonte.filter((c) => c.offsetDias >= limiar);
  const celulas: HumorHeatmapCell[] = filtradas.map((c) => ({
    data: formatDateYmd(dataDeOffset(c.offsetDias, hoje)),
    autor: comoAutor(c.autor),
    humor: c.humor,
    energia: c.energia,
    ansiedade: c.ansiedade,
    foco: c.foco,
    tags: c.tags,
  }));
  useHumorMock.getState().definir(celulas);

  // V4.0.1: espelhar cada celula como .md no vault mock.
  for (const c of filtradas) {
    const date = dataDeOffset(c.offsetDias, hoje);
    const dataYmd = formatDateYmd(date);
    const autor = comoAutor(c.autor);
    const meta = {
      tipo: 'humor' as const,
      data: dataYmd,
      autor,
      humor: c.humor,
      energia: c.energia,
      ansiedade: c.ansiedade,
      foco: c.foco,
      tags: c.tags,
    };
    const conteudo = stringifyFrontmatter(meta, '');
    // Path com sufixo de autor para evitar colisao entre 2 pessoas.
    const relBase = humorPath(date); // markdown/humor-YYYY-MM-DD.md
    const rel = relBase.replace(/\.md$/, `-${autor}.md`);
    espelharNoVaultMock(rel, conteudo);
  }
}

// seedDiarios: gera entradas de diario emocional a partir do fixture
// diarios-3.json. qtd controla quantas (1..3); default 3.
//
// V4.0.1: alem de useDiarioMock, popular useVaultMock com .md
// serializado por DiarioEmocionalSchema em markdown/diario-YYYY-MM-DD-
// HHmm-<slug>.md. Reader filtra por prefixo 'diario-'.
export function seedDiarios(qtd: number = 3, agora?: Date): void {
  if (!GAUNTLET_ATIVO) return;
  const total = Math.max(1, Math.min(3, qtd));
  const fonte = diariosFixture.entradas as DiarioFixtureEntrada[];
  const selecionadas = fonte.slice(0, total);
  const entradas: DiarioMockEntrada[] = selecionadas.map((e) => ({
    data: dataIsoDeOffsetHoras(e.offsetHoras, agora),
    autor: comoAutor(e.autor),
    modo: e.modo,
    intensidade: e.intensidade,
    emocoes: e.emocoes,
    com: e.com.map(comoPessoaId),
    contextoSocial: e.contextoSocial,
    texto: e.texto,
    estrategia: e.estrategia,
    funcionou: e.funcionou,
    tags: e.tags,
    midia: e.midia ?? [],
  }));
  useDiarioMock.getState().definir(entradas);

  // V4.0.1: espelhar cada entrada como .md no vault mock.
  for (const e of selecionadas) {
    const base = agora ? new Date(agora.getTime()) : new Date();
    base.setTime(base.getTime() + e.offsetHoras * 3600_000);
    const dataIso = dataIsoDeOffsetHoras(e.offsetHoras, agora);
    const slug = slugCurto(e.texto);
    const rel = diarioPath(base, slug);
    // Schema DiarioEmocionalSchema (note: campo canonico
    // contexto_social com underscore, midia como array de objetos
    // {tipo,path}). Mapeamos a fixture (que usa contextoSocial
    // camelCase + midia como array de strings) para o shape canonico.
    const midiaCanonica = (e.midia ?? []).map((path) => ({
      tipo: 'foto' as const,
      path,
    }));
    const meta: Record<string, unknown> = {
      tipo: 'diario_emocional',
      data: dataIso,
      autor: comoAutor(e.autor),
      modo: e.modo,
      emocoes: e.emocoes,
      intensidade: e.intensidade,
      com: e.com.map(comoPessoaId),
      contexto_social: e.contextoSocial,
      texto: e.texto,
      midia: midiaCanonica,
      para: { tipo: 'mim' },
    };
    if (typeof e.estrategia === 'string') meta.estrategia = e.estrategia;
    if (typeof e.funcionou === 'boolean') meta.funcionou = e.funcionou;
    const conteudo = stringifyFrontmatter(meta, e.texto);
    espelharNoVaultMock(rel, conteudo);
  }
}

// seedEventos: gera eventos a partir do fixture eventos-7.json.
// qtd controla quantos (1..7); default 7.
//
// V4.0.1: alem de useEventosMock, popular useVaultMock com .md
// serializado por EventoSchema em markdown/evento-YYYY-MM-DD-<slug>.md.
// Reader filtra por prefixo 'evento-'.
export function seedEventos(qtd: number = 7, hoje?: Date): void {
  if (!GAUNTLET_ATIVO) return;
  const total = Math.max(1, Math.min(7, qtd));
  const fonte = eventosFixture.eventos as EventoFixtureEntrada[];
  const selecionados = fonte.slice(0, total);
  const eventos: EventoMockEntrada[] = selecionados.map((e) => ({
    data: formatDateYmd(dataDeOffset(e.offsetDias, hoje)),
    autor: comoAutor(e.autor),
    modo: e.modo,
    lugar: e.lugar,
    categoria: e.categoria,
    com: e.com.map(comoPessoaId),
    intensidade: e.intensidade,
    descricao: e.descricao,
    fotos: e.fotos,
    midia: e.midia,
    slug: e.slug,
  }));
  useEventosMock.getState().definir(eventos);

  // V4.0.1: espelhar cada evento como .md no vault mock. EventoSchema
  // exige data ISO 8601 com hora (regex Iso8601). formatDateYmd da
  // YYYY-MM-DD apenas; complementamos com 'T12:00:00-03:00' (meio-dia
  // sao paulo, deterministico). Schema tambem refina: modo='positivo'
  // exige midia.length > 0 -- fixture eventos-7 ja respeita.
  for (const e of selecionados) {
    const date = dataDeOffset(e.offsetDias, hoje);
    const dataYmd = formatDateYmd(date);
    const dataIso = `${dataYmd}T12:00:00-03:00`;
    const rel = eventoPath(date, e.slug);
    const midiaCanonica = (e.midia ?? []).map((path) => ({
      tipo: 'foto' as const,
      path,
    }));
    const meta = {
      tipo: 'evento' as const,
      data: dataIso,
      autor: comoAutor(e.autor),
      modo: e.modo,
      lugar: e.lugar,
      categoria: e.categoria,
      com: e.com.map(comoPessoaId),
      intensidade: e.intensidade,
      fotos: e.fotos,
      midia: midiaCanonica,
      para: { tipo: 'mim' as const },
    };
    const conteudo = stringifyFrontmatter(meta, e.descricao);
    espelharNoVaultMock(rel, conteudo);
  }
}

// R-INT-3-HC-RECAP-CARD-FOLLOWUP: seed de saude para o Gauntlet.
// Diferente de humor/diario/evento (que tem store de dominio dedicada),
// saude e lida direto do Vault pelos readers canonicos (listarPassos,
// listarSono, listarTreinos, listarMedidas). Por isso seedSaude escreve
// SO no useVaultMock (espelho do SAF em web/dev), nos paths canonicos:
//   - markdown/passos-YYYY-MM-DD.md          (PassosSchema)
//   - markdown/sono-YYYY-MM-DD-hc-<id>.md    (SonoSchema)
//   - treinos/YYYY-MM-DD-<slug>.md           (TreinoSessaoSchema)
//   - markdown/medidas-YYYY-MM-DD.md         (MedidasSchema)
// Sem store de dominio: o caminho de leitura do Recap em web/dev passa
// por reader.ts -> useVaultMock, entao popular o vault mock basta para a
// secao Saude aparecer no Gauntlet preenchida.

// ISO 8601 com offset fixo de São Paulo (-03:00) a partir de um Date.
// Usado para inicio/fim de sono e data de treino (schemas exigem offset).
function isoBrt(d: Date): string {
  // Date interno em UTC; subtraimos 3h e formatamos com sufixo -03:00
  // para representar o mesmo instante no fuso de São Paulo.
  const local = new Date(d.getTime() - 3 * 3600_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  const ss = String(local.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${dd}T${hh}:${mm}:${ss}-03:00`;
}

// seedSaude: popula o vault mock com N dias de dados de saude canonicos
// (passos diarios + sono por noite + 1-2 treinos + 1 medida). dias=7
// default; clamp 1..30. Deterministico: passos e medidas derivam de
// offset, sem Math.random. No-op fora do Gauntlet. Hoje = parametro
// opcional para teste deterministico.
export function seedSaude(dias: number = 7, hoje?: Date): void {
  if (!GAUNTLET_ATIVO) return;
  const total = Math.max(1, Math.min(30, dias));
  const autor: PessoaAutor = 'pessoa_a';

  // Passos: um arquivo por dia, dos ultimos `total` dias completos
  // (offset -total .. -1, sem o dia em curso, espelhando o puxador que
  // so escreve dias encerrados). Total varia deterministicamente por dia.
  for (let i = total; i >= 1; i -= 1) {
    const date = dataDeOffset(-i, hoje);
    const dataYmd = formatDateYmd(date);
    // Passos do dia: base 6000 + variacao deterministica por dia (0..3500).
    const variacao = ((i * 1373) % 3500);
    const passos = 6000 + variacao;
    const meta = {
      tipo: 'passos' as const,
      data: dataYmd,
      autor,
      total: passos,
      fonte_hc: true as const,
      sincronizado_em: isoBrt(date),
    };
    const conteudo = stringifyFrontmatter(meta, '');
    espelharNoVaultMock(passosPath(date), conteudo);
  }

  // Sono: uma sessao por noite, dos ultimos `total` dias. data = dia do
  // despertar. Duracao 6.5h..8h deterministica. fonte_hc_id estavel por
  // dia para idempotencia (e para o path nao colidir).
  for (let i = total; i >= 1; i -= 1) {
    const date = dataDeOffset(-i, hoje);
    const dataYmd = formatDateYmd(date);
    // Despertar ~07:30 BRT; inicio ~23:30 da noite anterior + variacao.
    const duracaoMin = 390 + ((i * 53) % 90); // 6h30 .. ~8h
    const fim = new Date(date.getTime());
    fim.setUTCHours(10, 30, 0, 0); // 07:30 BRT
    const inicio = new Date(fim.getTime() - duracaoMin * 60_000);
    const hcId = `seed-sono-${dataYmd}`;
    const meta = {
      tipo: 'sono' as const,
      data: dataYmd,
      autor,
      inicio: isoBrt(inicio),
      fim: isoBrt(fim),
      duracao_min: duracaoMin,
      fonte_hc_id: hcId,
      fonte_hc_origin: 'com.seed.health',
    };
    const conteudo = stringifyFrontmatter(meta, '');
    espelharNoVaultMock(sonoPath(date, hcId), conteudo);
  }

  // Treinos: 2 sessoes no periodo (dias -2 e -5, ou clamp se total < 5).
  // Cada uma com fonte_hc_id (sessao importada do HC) e 1 exercicio
  // (schema exige min 1). Path em treinos/YYYY-MM-DD-<slug>.md.
  const offsetsTreino = [2, 5].filter((o) => o <= total);
  const offsetsFinal =
    offsetsTreino.length > 0 ? offsetsTreino : [Math.min(1, total)];
  for (const off of offsetsFinal) {
    const date = dataDeOffset(-off, hoje);
    const dataYmd = formatDateYmd(date);
    // Hora fixa 18:00 BRT para a data ISO do treino.
    const dt = new Date(date.getTime());
    dt.setUTCHours(21, 0, 0, 0); // 18:00 BRT
    const duracaoMin = 45 + ((off * 17) % 30); // 45 .. ~74 min
    const slug = 'seed-treino';
    const meta = {
      tipo: 'treino_sessao' as const,
      data: isoBrt(dt),
      autor,
      rotina: 'Rotina seed',
      duracao_min: duracaoMin,
      exercicios: [
        {
          nome: 'Agachamento',
          series: 3,
          reps: 12,
          carga_kg: 40,
        },
      ],
      fonte_hc_id: `seed-hc-${dataYmd}`,
      fonte_hc_origin: 'Conexão Saúde',
    };
    const conteudo = stringifyFrontmatter(meta, '');
    espelharNoVaultMock(treinosPath(date, slug), conteudo);
  }

  // Medida: 1 registro recente com peso (offset -1, ou o dia mais antigo
  // se total=1 nao tiver -1). Inclui gordura para exercitar a linha
  // completa. Sem foto.
  {
    const offMedida = total >= 1 ? 1 : 0;
    const date = dataDeOffset(-offMedida, hoje);
    const dataYmd = formatDateYmd(date);
    const meta = {
      tipo: 'medidas' as const,
      data: dataYmd,
      autor,
      peso: 72.5,
      gordura: 18.2,
      fotos: [] as string[],
    };
    const conteudo = stringifyFrontmatter(meta, '');
    espelharNoVaultMock(medidasPath(date), conteudo);
  }
}

// Utility para testes: leitores diretos das stores mock.
export function lerHumoresMock(): HumorHeatmapCell[] {
  return useHumorMock.getState().celulas.slice();
}

export function lerDiariosMock(): DiarioMockEntrada[] {
  return useDiarioMock.getState().entradas.slice();
}

export function lerEventosMock(): EventoMockEntrada[] {
  return useEventosMock.getState().eventos.slice();
}

// Conveniencia v2: chama todos. Util para validacao manual via
// __gauntlet em browser dev console.
export function seedTudo(): void {
  seedDuo();
  seedHumores();
  seedDiarios();
  seedEventos();
  seedSaude();
}
