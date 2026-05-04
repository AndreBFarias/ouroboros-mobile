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
import { formatDateYmd } from '@/lib/vault/paths';
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
export function seedHumores(dias: number = 30, hoje?: Date): void {
  if (!GAUNTLET_ATIVO) return;
  const total = Math.max(1, Math.min(30, dias));
  const limiar = -(total - 1); // ex: dias=30 -> limiar -29; dias=7 -> limiar -6
  const fonte = humoresFixture.celulas as HumorFixtureCelula[];
  const celulas: HumorHeatmapCell[] = fonte
    .filter((c) => c.offsetDias >= limiar)
    .map((c) => ({
      data: formatDateYmd(dataDeOffset(c.offsetDias, hoje)),
      autor: comoAutor(c.autor),
      humor: c.humor,
      energia: c.energia,
      ansiedade: c.ansiedade,
      foco: c.foco,
      tags: c.tags,
    }));
  useHumorMock.getState().definir(celulas);
}

// seedDiarios: gera entradas de diario emocional a partir do fixture
// diarios-3.json. qtd controla quantas (1..3); default 3.
export function seedDiarios(qtd: number = 3, agora?: Date): void {
  if (!GAUNTLET_ATIVO) return;
  const total = Math.max(1, Math.min(3, qtd));
  const fonte = diariosFixture.entradas as DiarioFixtureEntrada[];
  const entradas: DiarioMockEntrada[] = fonte
    .slice(0, total)
    .map((e) => ({
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
}

// seedEventos: gera eventos a partir do fixture eventos-7.json.
// qtd controla quantos (1..7); default 7.
export function seedEventos(qtd: number = 7, hoje?: Date): void {
  if (!GAUNTLET_ATIVO) return;
  const total = Math.max(1, Math.min(7, qtd));
  const fonte = eventosFixture.eventos as EventoFixtureEntrada[];
  const eventos: EventoMockEntrada[] = fonte
    .slice(0, total)
    .map((e) => ({
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
