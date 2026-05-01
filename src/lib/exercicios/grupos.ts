// Lista canonica de grupos musculares oferecidos como ChipGroup na
// Tela 02 (cadastro). O schema do exercicio aceita qualquer string em
// grupo_muscular[]; esta lista e apenas atalho de UI para reduzir
// digitacao. Slugs ASCII em snake_case para alinhar com convencao
// dos demais slugs do projeto.
//
// Ordem segue agrupamento muscular convencional: superiores -
// inferiores - core/cardio. Pode crescer no futuro sem migracao
// (campo livre no schema).
import type { ChipOption } from '@/components/ui';

export const GRUPOS_MUSCULARES_SLUGS = [
  'peito',
  'costas',
  'ombros',
  'biceps',
  'triceps',
  'pernas',
  'core',
  'cardio',
] as const;

export type GrupoMuscular = (typeof GRUPOS_MUSCULARES_SLUGS)[number];

// Mapa slug -> label acentuado em PT-BR. Sentence case (ADR-0013).
export const GRUPOS_MUSCULARES_LABELS: Record<GrupoMuscular, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  pernas: 'Pernas',
  core: 'Core',
  cardio: 'Cardio',
};

// Pronto para consumo pelo <ChipGroup mode="multi"> na Tela 07
// (filtro) e na Tela 02 (selecao na criacao). Accent purple por
// convencao.
export const GRUPOS_MUSCULARES_OPTIONS: readonly ChipOption[] =
  GRUPOS_MUSCULARES_SLUGS.map((slug) => ({
    value: slug,
    label: GRUPOS_MUSCULARES_LABELS[slug],
    accent: 'purple',
  }));

// Resolve label de um slug. Slugs desconhecidos viram fallback
// mecanico (capitaliza primeira letra).
export function formatGrupoMuscular(slug: string): string {
  const known = (GRUPOS_MUSCULARES_SLUGS as readonly string[]).includes(slug);
  if (known) return GRUPOS_MUSCULARES_LABELS[slug as GrupoMuscular];
  if (slug.length === 0) return slug;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
