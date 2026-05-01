// Categorias do registro de evento (Tela 20). Lista fechada de 8
// slugs em snake_case ASCII; o slug fica no frontmatter e a UI
// exibe via formatCategoria em Sentence case com acentuacao PT-BR.
//
// Decisão M07 (spec seção 9, item 2): incluir 'exercício' na lista
// como registro casual de "fui na academia"; dados estruturados de
// treino (séries, peso) ficam para a M13 (Galeria/Detalhe Exercício).
//
// O dicionario de labels acentuados existe pelo mesmo motivo de
// tagsRapidas.ts e emocoes.ts pos M05.1: fallback mecanico não
// restaura diacriticos exigidos pela ortografia PT-BR. Slugs
// canonicos com diacritico no original (exercício -> Exercício com
// agudo, evento_social -> Evento social) usam o mapa; slugs sem
// diacritico (rolezinho, compras, consulta, trabalho, rotina,
// outro) caem no fallback mecanico e ficam corretos por
// coincidencia ortografica.
import type { ChipOption } from '@/components/ui';

// Slugs canonicos. NÃO mudar a ordem nem renomear sem migracao de
// dados: estes valores aparecem literais em arquivos .md já
// gravados no Vault.
export const EVENTO_CATEGORIAS_SLUGS = [
  'rolezinho',
  'compras',
  'consulta',
  'trabalho',
  'evento_social',
  'rotina',
  'exercicio',
  'outro',
] as const;

export type EventoCategoria = (typeof EVENTO_CATEGORIAS_SLUGS)[number];

// Mapa slug -> label acentuado em PT-BR. Sentence case obrigatório
// (ADR-0013). Cobre TODAS as 8 categorias mesmo as sem diacritico
// no original, para que mudancas futuras de ortografia ou
// expansoes do dicionario não precisem refatorar a logica de
// fallback. Acentuacao explicita: Exercício -> Exercício com
// agudo (i mais acento agudo), Evento social fica composto.
export const EVENTO_CATEGORIAS_LABELS: Record<EventoCategoria, string> = {
  rolezinho: 'Rolezinho',
  compras: 'Compras',
  consulta: 'Consulta',
  trabalho: 'Trabalho',
  evento_social: 'Evento social',
  rotina: 'Rotina',
  exercicio: 'Exercício',
  outro: 'Outro',
};

function isEventoCategoria(s: string): s is EventoCategoria {
  return (EVENTO_CATEGORIAS_SLUGS as readonly string[]).includes(s);
}

// Converte slug em label de UI. Slugs canonicos usam o mapa
// acentuado; slugs desconhecidos caem no fallback mecanico
// (underscore -> espaco, capitaliza primeiro caractere).
export function formatCategoria(slug: string): string {
  if (isEventoCategoria(slug)) return EVENTO_CATEGORIAS_LABELS[slug];
  const limpo = slug.replace(/_/g, ' ').trim();
  if (limpo.length === 0) return slug;
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

// Pronto para consumo direto pelo <ChipGroup mode="single">. Accent
// purple (cor primaria do app) por convencao, alinhado com a
// estetica das telas de captura. O bairro detectado ganha cyan
// para destacar como info contextual; categoria fica purple.
export const EVENTO_CATEGORIAS_OPTIONS: readonly ChipOption[] =
  EVENTO_CATEGORIAS_SLUGS.map((slug) => ({
    value: slug,
    label: formatCategoria(slug),
    accent: 'purple',
  }));
