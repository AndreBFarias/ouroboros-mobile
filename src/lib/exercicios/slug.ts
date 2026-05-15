// Helper de slug para nome de arquivo do exercício. O path canonico
// e exercicios/<slug>.md (e o GIF companion fica em
// assets/exercicios/<slug>.gif). O slug deriva do nome digitado pelo
// usuario na Tela 02 em kebab-case ASCII com no maximo 32 chars.
//
// Acentos são removidos via NFD/diacriticos para preservar slug
// puramente ASCII. Espacos e não-alfanumericos viram '-', múltiplos
// '-' colapsam em um. Limite mais generoso que slugifyEvento (32 vs
// 24) porque nomes de exercício podem ser compostos (rosca-direta-
// halter, agachamento-bulgaro etc.).
//
// Comentarios em código sem acento (convencao shell/CI).

const MAX_LEN = 32;

// Remove diacriticos PT-BR (NFD + unicode property em \p{Diacritic}).
function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Converte string livre em kebab-case ASCII com cap de comprimento.
function toKebab(input: string, maxLen: number = MAX_LEN): string {
  const ascii = stripAccents(input).toLowerCase();
  // Substitui qualquer caractere que não seja [a-z 0-9] por hifen.
  const compacted = ascii.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (compacted.length === 0) return '';
  if (compacted.length <= maxLen) return compacted;
  // Trunca preservando palavras: corta no ultimo '-' antes do limite.
  const truncado = compacted.slice(0, maxLen);
  const ultimoHifen = truncado.lastIndexOf('-');
  if (ultimoHifen > 8) return truncado.slice(0, ultimoHifen);
  return truncado;
}

// Deriva o slug final do nome de arquivo a partir do nome digitado.
// Sempre retorna string não-vazia (fallback 'exercício').
export function slugifyExercicio(nome: string): string {
  const slug = toKebab(nome);
  if (slug.length > 0) return slug;
  return 'exercicio';
}
