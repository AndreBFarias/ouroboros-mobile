// Tags rapidas do registro de humor (Tela 15). Lista fechada de 8
// slugs em snake_case. Slug fica no frontmatter; UI exibe formatado
// em Sentence case via formatTag.
//
// Decisão M05 (spec seção 9, item 2): lista fixa para evitar derivas
// e simplificar comparacao agregada futura. Tag livre fica como
// candidata a sprint posterior se demanda surgir.
import type { ChipOption } from '@/components/ui';

// Slugs canonicos. NÃO mudar a ordem nem renomear sem migracao de
// dados: estes valores aparecem literais em arquivos .md já gravados
// no Vault.
export const TAGS_RAPIDAS_SLUGS = [
  'trabalho_pesado',
  'boa_conversa',
  'cansaco',
  'exercicio',
  'foco_dificil',
  'dormi_mal',
  'treino_bom',
  'dia_leve',
] as const;

export type TagRapidaSlug = (typeof TAGS_RAPIDAS_SLUGS)[number];

// Mapa de slug -> label acentuado em PT-BR. Strings de UI seguem a
// regra de Sentence case com acentuacao completa do projeto. O slug
// e ASCII por convencao do Vault, mas a apresentacao precisa ter o
// diacritico que o portugues exige (cansaco -> Cansaco com cedilha,
// exercício -> Exercício com agudo). Slugs sem diacritico no original
// (ex.: 'trabalho_pesado') caem no fallback mecanico.
const TAGS_RAPIDAS_LABELS: Record<TagRapidaSlug, string> = {
  trabalho_pesado: 'Trabalho pesado',
  boa_conversa: 'Boa conversa',
  cansaco: 'Cansaço',
  exercicio: 'Exercício',
  foco_dificil: 'Foco difícil',
  dormi_mal: 'Dormi mal',
  treino_bom: 'Treino bom',
  dia_leve: 'Dia leve',
};

function isTagRapidaSlug(s: string): s is TagRapidaSlug {
  return (TAGS_RAPIDAS_SLUGS as readonly string[]).includes(s);
}

// Converte slug em label de UI. Para slugs canonicos, usa o mapa
// acentuado (TAGS_RAPIDAS_LABELS). Para slugs desconhecidos (caso
// de teste ou tag livre futura), faz fallback mecanico
// (underscore -> espaco, capitalizacao do primeiro caractere).
export function formatTag(slug: string): string {
  if (isTagRapidaSlug(slug)) return TAGS_RAPIDAS_LABELS[slug];
  const limpo = slug.replace(/_/g, ' ').trim();
  if (limpo.length === 0) return slug;
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

// Pronto para consumo direto pelo <ChipGroup mode="multi">.
export const TAGS_RAPIDAS: readonly ChipOption[] = TAGS_RAPIDAS_SLUGS.map(
  (slug) => ({
    value: slug,
    label: formatTag(slug),
    accent: 'cyan',
  })
);
