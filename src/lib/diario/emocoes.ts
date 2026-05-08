// Emocoes do diario emocional (Tela 18). Tres listas fechadas
// segundo o modo do registro: 6 negativas (modo trigger), 6 positivas
// (modo vitoria) e 6 contemplativas (modo reflexao). Slug em
// snake_case ASCII fica no frontmatter; a UI exibe via formatEmocao
// em Sentence case com acentuacao PT-BR.
//
// Decisão M06 (spec seção 9 item 1): listas fixas e fechadas para
// evitar derivas e simplificar agregacao futura. Ampliacao via
// sprint nova se demanda surgir. Sprint G2 (I-DIARIO-REFLEXAO,
// 2026-05-08): adicionada lista contemplativa para o terceiro modo
// canonico (nem trigger, nem vitoria — neutro).
//
// O dicionario de labels acentuados existe pelo mesmo motivo do
// tagsRapidas.ts pos M05.1: fallback mecanico não restaura
// diacriticos exigidos pela ortografia PT-BR.
import type { ChipOption } from '@/components/ui';

export const EMOCOES_NEGATIVAS = [
  'tristeza',
  'raiva',
  'ansiedade',
  'frustracao',
  'medo',
  'solidao',
] as const;

export type EmocaoNegativa = (typeof EMOCOES_NEGATIVAS)[number];

export const EMOCOES_POSITIVAS = [
  'alegria',
  'alivio',
  'gratidao',
  'conexao',
  'paz',
  'orgulho',
] as const;

export type EmocaoPositiva = (typeof EMOCOES_POSITIVAS)[number];

// Emocoes contemplativas (modo reflexao). Sprint G2: ordenadas do
// mais leve ao mais profundo para varredura intuitiva. Sem polaridade
// — nao entram em "Conquistas" nem "Crises" no Recap.
export const EMOCOES_REFLEXIVAS = [
  'pensativo',
  'curioso',
  'gratidao',
  'aceitacao',
  'silencio',
  'contemplacao',
] as const;

export type EmocaoReflexiva = (typeof EMOCOES_REFLEXIVAS)[number];

export type EmocaoSlug = EmocaoNegativa | EmocaoPositiva | EmocaoReflexiva;

// Mapa de slug -> label acentuado em PT-BR. Slugs ASCII no
// frontmatter; apresentacao restaura diacritico onde a ortografia
// exige. Slugs simples (alegria, raiva, paz, orgulho, tristeza,
// ansiedade, medo) caem no fallback mecanico via formatEmocao.
const EMOCOES_LABELS: Record<EmocaoSlug, string> = {
  tristeza: 'Tristeza',
  raiva: 'Raiva',
  ansiedade: 'Ansiedade',
  frustracao: 'Frustração',
  medo: 'Medo',
  solidao: 'Solidão',
  alegria: 'Alegria',
  alivio: 'Alívio',
  gratidao: 'Gratidão',
  conexao: 'Conexão',
  paz: 'Paz',
  orgulho: 'Orgulho',
  pensativo: 'Pensativo',
  curioso: 'Curioso',
  aceitacao: 'Aceitação',
  silencio: 'Silêncio',
  contemplacao: 'Contemplação',
};

function isEmocaoSlug(s: string): s is EmocaoSlug {
  return (
    (EMOCOES_NEGATIVAS as readonly string[]).includes(s) ||
    (EMOCOES_POSITIVAS as readonly string[]).includes(s) ||
    (EMOCOES_REFLEXIVAS as readonly string[]).includes(s)
  );
}

// Converte slug em label de UI. Slugs canonicos usam o mapa
// acentuado; slugs desconhecidos caem no fallback mecanico
// (capitaliza primeiro caractere, mantem o resto).
export function formatEmocao(slug: string): string {
  if (isEmocaoSlug(slug)) return EMOCOES_LABELS[slug];
  const limpo = slug.replace(/_/g, ' ').trim();
  if (limpo.length === 0) return slug;
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

// Sets prontos para consumo direto pelo <ChipGroup mode="multi">.
// Negativas em accent red, positivas em accent green: borda do form
// segue o mesmo eixo cromatico do modo do registro.
export const EMOCOES_NEGATIVAS_OPTIONS: readonly ChipOption[] =
  EMOCOES_NEGATIVAS.map((slug) => ({
    value: slug,
    label: formatEmocao(slug),
    accent: 'red',
  }));

export const EMOCOES_POSITIVAS_OPTIONS: readonly ChipOption[] =
  EMOCOES_POSITIVAS.map((slug) => ({
    value: slug,
    label: formatEmocao(slug),
    accent: 'green',
  }));

// Reflexivas em accent cyan: tom contemplativo, distinto do red
// (trigger) e green (vitoria). Sprint G2.
export const EMOCOES_REFLEXIVAS_OPTIONS: readonly ChipOption[] =
  EMOCOES_REFLEXIVAS.map((slug) => ({
    value: slug,
    label: formatEmocao(slug),
    accent: 'cyan',
  }));
