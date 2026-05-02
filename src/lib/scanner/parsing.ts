// Heuristicas regex PT-BR para extrair valor monetario, data e
// categoria do texto OCR de um recibo / nota fiscal. Modulo puro
// (sem efeitos), facil de testar com jest.
//
// Convencoes:
// - Valor sempre normalizado para Number em centavos -> reais (ex.
//   1234.56). Suporta 'R$ 87,40', '87,40', '87.40', 'R$ 1.234,56'.
// - Data normalizada para 'YYYY-MM-DD'. Suporta 28/04/2026,
//   2026-04-28, 28-04-2026.
// - Categoria volta uma das chaves canonicas do schema: 'mercado',
//   'farmacia', 'transporte', 'alimentacao', 'outro'. Sem acento
//   no valor (chave de schema).

// Categorias canonicas alinhadas com FinanceiroNotaSchema.
export type CategoriaCanonica =
  | 'mercado'
  | 'farmacia'
  | 'transporte'
  | 'alimentacao'
  | 'outro';

// Vocabulario curto. Cada chave canonica vem com palavras-chave
// minusculas (sem acento) tipicas de recibos brasileiros. Ordem de
// avaliacao importa: a primeira categoria que da match vence.
const VOCABULARIO: ReadonlyArray<{
  categoria: CategoriaCanonica;
  termos: ReadonlyArray<string>;
}> = [
  {
    categoria: 'mercado',
    termos: ['mercado', 'supermercado', 'hortifruti', 'sacolao', 'atacadao'],
  },
  {
    categoria: 'farmacia',
    termos: ['farmacia', 'drogaria', 'drogasil', 'pacheco', 'raia'],
  },
  {
    categoria: 'transporte',
    termos: ['uber', '99', 'taxi', 'metro', 'onibus', 'estacionamento', 'gasolina', 'posto'],
  },
  {
    categoria: 'alimentacao',
    termos: ['restaurante', 'lanchonete', 'padaria', 'pizzaria', 'cafe', 'bar'],
  },
];

// Remove acentos para comparacao case-insensitive contra vocabulario.
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Extrai valor monetario do texto. Estrategia:
//  1. Procura ocorrencia 'R$' ou 'r$' seguida de digitos.
//  2. Se houver 'R$', limita o match a partir dali; senao tenta
//     primeiro número que pareca valor (com vírgula decimal ou
//     ponto decimal após 1+ digitos).
//  3. Normaliza separador: BR usa ',' decimal e '.' milhar. Se ha
//     ',' depois de '.', '.' e milhar; senao '.' e decimal.
// Retorna null se nada bate.
export function extrairValor(texto: string): number | null {
  if (typeof texto !== 'string' || texto.length === 0) return null;

  // Captura sequencias do tipo "R$ 1.234,56" ou "87,40" ou "87.40".
  // Uso \d{1,3}(?:[.,]\d{3})* para milhar opcional, depois decimal.
  const rxComRS = /R\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/i;
  const m1 = texto.match(rxComRS);
  let bruto: string | null = null;
  if (m1) {
    bruto = m1[1];
  } else {
    // Sem 'R$' explicito: pega o primeiro número com decimal.
    const rxSemRS = /\b([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})\b/;
    const m2 = texto.match(rxSemRS);
    if (m2) bruto = m2[1];
  }
  if (bruto === null) return null;

  // Normalizacao: detectar qual separador e decimal.
  // Heuristica: se ha ',', e decimal e '.' e milhar.
  // Se não ha ',', '.' e o decimal.
  let normalizado: string;
  if (bruto.includes(',')) {
    normalizado = bruto.replace(/\./g, '').replace(',', '.');
  } else {
    // So '.': trato como decimal. Ex: '87.40'.
    normalizado = bruto;
  }
  const numero = Number(normalizado);
  if (!Number.isFinite(numero) || numero < 0) return null;
  return numero;
}

// Extrai data do texto e devolve em formato ISO 'YYYY-MM-DD'.
// Aceita: 28/04/2026, 28-04-2026, 2026-04-28.
// Retorna null se nada bate.
export function extrairData(texto: string): string | null {
  if (typeof texto !== 'string' || texto.length === 0) return null;

  // Formato 1: YYYY-MM-DD já canonico.
  const rxIso = /\b(\d{4})-(\d{2})-(\d{2})\b/;
  const mIso = texto.match(rxIso);
  if (mIso) {
    const [, y, m, d] = mIso;
    if (validarComponentes(y, m, d)) return `${y}-${m}-${d}`;
  }

  // Formato 2: DD/MM/YYYY ou DD-MM-YYYY.
  const rxBr = /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/;
  const mBr = texto.match(rxBr);
  if (mBr) {
    const [, d, m, y] = mBr;
    if (validarComponentes(y, m, d)) return `${y}-${m}-${d}`;
  }

  return null;
}

// Validador minimo de range de data. Nao tenta ser calendario completo;
// rejeita mês > 12 ou dia > 31.
function validarComponentes(y: string, m: string, d: string): boolean {
  const ny = Number(y);
  const nm = Number(m);
  const nd = Number(d);
  if (!Number.isFinite(ny) || !Number.isFinite(nm) || !Number.isFinite(nd)) {
    return false;
  }
  if (ny < 1900 || ny > 2999) return false;
  if (nm < 1 || nm > 12) return false;
  if (nd < 1 || nd > 31) return false;
  return true;
}

// Extrai categoria por palavra-chave. Retorna 'outro' como fallback
// (nunca retorna null). Comparacao normaliza acento e case.
export function extrairCategoria(texto: string): CategoriaCanonica {
  if (typeof texto !== 'string' || texto.length === 0) return 'outro';
  const norm = normalizar(texto);
  for (const entrada of VOCABULARIO) {
    for (const termo of entrada.termos) {
      if (norm.includes(termo)) return entrada.categoria;
    }
  }
  return 'outro';
}
