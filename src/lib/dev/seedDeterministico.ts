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
  modo: 'trigger' | 'vitoria' | 'reflexao';
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
}
