// Helper de slug para nome de arquivo de marco. Path canonico =
// marcos/YYYY-MM-DD-<slug>.md. Slug ASCII derivado da descricao,
// limitado a 24 chars (suficiente para frase curta).
//
// Comentarios sem acento (convencao shell/CI).

const MAX_LEN = 24;

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
  if (ultimoHifen > 6) return truncado.slice(0, ultimoHifen);
  return truncado;
}

// Deriva slug do marco. Fallback "marco" quando descricao vazia.
export function slugifyMarco(descricao: string): string {
  const slug = toKebab(descricao);
  if (slug.length > 0) return slug;
  return 'marco';
}
