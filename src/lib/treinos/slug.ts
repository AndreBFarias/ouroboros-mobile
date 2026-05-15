// Helper de slug para nome de arquivo de sessao de treino formal.
// Path canonico = treinos/YYYY-MM-DD-<slug>.md. Slug em kebab-case
// ASCII derivado de rotina (ex: "rotina A" -> "rotina-a") ou fallback
// "treino" quando rotina vazia.
//
// Mesma logica de slugifyExercicio (NFD, ASCII, cap de comprimento)
// para consistencia entre slugs do projeto.
//
// Comentarios sem acento (convencao shell/CI).

const MAX_LEN = 32;

function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function toKebab(input: string, maxLen: number = MAX_LEN): string {
  const ascii = stripAccents(input).toLowerCase();
  const compacted = ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (compacted.length === 0) return '';
  if (compacted.length <= maxLen) return compacted;
  const truncado = compacted.slice(0, maxLen);
  const ultimoHifen = truncado.lastIndexOf('-');
  if (ultimoHifen > 8) return truncado.slice(0, ultimoHifen);
  return truncado;
}

// Deriva slug do nome do treino. Fallback "treino" quando vazio.
export function slugifyTreino(nome: string): string {
  const slug = toKebab(nome);
  if (slug.length > 0) return slug;
  return 'treino';
}
