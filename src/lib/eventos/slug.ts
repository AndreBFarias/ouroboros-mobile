// Helper de slug para nome de arquivo do evento (Tela 20). O path
// canonico e eventos/YYYY-MM-DD-<slug>.md. O slug deriva
// preferencialmente do bairro detectado (ou do texto livre, ou da
// categoria selecionada) em kebab-case ASCII com no maximo 24 chars.
//
// Estrategia de derivacao (em ordem):
//  1. Se bairro foi detectado/preenchido, usa o bairro.
//  2. Senao, usa as 3 primeiras palavras do texto.
//  3. Senao, usa o slug da categoria (já em snake_case).
//  4. Fallback final: 'evento'.
//
// Acentos são removidos via NFD/diacriticos para preservar o slug
// puramente ASCII. Espacos e não-alfanumericos viram '-', múltiplos
// '-' colapsam em um.

const MAX_LEN = 24;

// Remove diacriticos PT-BR (NFD + unicode property em \p{Diacritic}).
function stripAccents(input: string): string {
  return input.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Converte string livre em kebab-case ASCII com cap de comprimento.
function toKebab(input: string, maxLen: number = MAX_LEN): string {
  const ascii = stripAccents(input).toLowerCase();
  // Substitui qualquer caractere que não seja [a-z 0-9] por hifen.
  const compacted = ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (compacted.length === 0) return '';
  if (compacted.length <= maxLen) return compacted;
  // Trunca preservando palavras: corta no ultimo '-' antes do limite.
  const truncado = compacted.slice(0, maxLen);
  const ultimoHifen = truncado.lastIndexOf('-');
  if (ultimoHifen > 8) return truncado.slice(0, ultimoHifen);
  return truncado;
}

export interface SlugifyEventoArgs {
  texto?: string;
  bairro?: string | null;
  categoria?: string;
}

// Deriva o slug final do nome de arquivo do evento. A prioridade
// segue a ordem documentada acima. Sempre retorna string não-vazia
// (fallback 'evento').
export function slugifyEvento(args: SlugifyEventoArgs): string {
  const { texto, bairro, categoria } = args;

  if (typeof bairro === 'string' && bairro.trim().length > 0) {
    const slug = toKebab(bairro);
    if (slug.length > 0) return slug;
  }

  if (typeof texto === 'string' && texto.trim().length > 0) {
    // Pega as 3 primeiras palavras para um slug curto e legivel.
    const palavras = texto.trim().split(/\s+/).slice(0, 3).join(' ');
    const slug = toKebab(palavras);
    if (slug.length > 0) return slug;
  }

  if (typeof categoria === 'string' && categoria.trim().length > 0) {
    const slug = toKebab(categoria);
    if (slug.length > 0) return slug;
  }

  return 'evento';
}
