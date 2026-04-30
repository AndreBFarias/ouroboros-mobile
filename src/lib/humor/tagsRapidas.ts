// Tags rapidas do registro de humor (Tela 15). Lista fechada de 8
// slugs em snake_case. Slug fica no frontmatter; UI exibe formatado
// em Sentence case via formatTag.
//
// Decisao M05 (spec secao 9, item 2): lista fixa para evitar derivas
// e simplificar comparacao agregada futura. Tag livre fica como
// candidata a sprint posterior se demanda surgir.
import type { ChipOption } from '@/components/ui';

// Slugs canonicos. NAO mudar a ordem nem renomear sem migracao de
// dados: estes valores aparecem literais em arquivos .md ja gravados
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

// Converte slug snake_case em rotulo legivel para UI:
//   'trabalho_pesado' -> 'Trabalho pesado'
//   'boa_conversa'    -> 'Boa conversa'
//   'cansaco'         -> 'Cansaco' (sem acento porque slug e ASCII)
// Nao acrescenta acentuacao porque o slug e o identificador puro;
// labels apresentaveis com acento (se desejado) devem ser tabela
// separada em sprint futura.
export function formatTag(slug: string): string {
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
