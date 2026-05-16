// Mapa bi-direcional entre o vocabulario legado e o vocabulario canonico
// adotado em Onda R / sprint R0 (M-LEX-CRISE-CONQUISTA-GATILHO-REFLEXAO).
//
// Onda R fixa quatro termos para registros do diario emocional:
//   - "Crise"      (UI) <-> 'trigger' (legado)   -> 'gatilho' (canonico)
//   - "Conquista"  (UI) <-> 'vitoria' (legado)   -> 'conquista' (canonico)
//   - "Reflexao"   (UI) <-> 'reflexao' (legado, mantem) -> 'reflexao'
//   - "Reflexao"   tambem e o nome do atalho de acesso rapido que
//                  substitui o antigo "Humor rapido" no MenuLateral.
//
// Estrategia de compat:
//   - Leitura do Vault aceita ambos os valores no frontmatter `modo:`,
//     remapeando legacy -> canonico via DiarioEmocionalModoSchema
//     (z.preprocess) em src/lib/schemas/diario_emocional.ts.
//   - Escrita SEMPRE emite o valor canonico ('gatilho'/'conquista'/'reflexao').
//   - .md antigos no Vault permanecem legiveis indefinidamente -- nao
//     ha rewrite forcado. O pipeline desktop sibling (protocolo-ouroboros)
//     precisa absorver o mesmo mapeamento (issue etl-contract).
//
// Documentado em docs/SCHEMA-MIGRATION.md e ADR-0025.
// Comentarios sem acentuacao (convencao shell/CI).
export const DIARIO_MODO_LEGADO_TO_CANONICO = {
  trigger: 'gatilho',
  vitoria: 'conquista',
  reflexao: 'reflexao',
} as const;

export type DiarioModoLegado = keyof typeof DIARIO_MODO_LEGADO_TO_CANONICO;
export type DiarioModoCanonico =
  (typeof DIARIO_MODO_LEGADO_TO_CANONICO)[DiarioModoLegado];

// Conjunto dos valores aceitos em leitura (legado + canonico).
export const DIARIO_MODO_ACEITO_INPUT: readonly string[] = [
  'trigger',
  'vitoria',
  'reflexao',
  'gatilho',
  'conquista',
] as const;

// Normaliza um modo (legado ou canonico) para o canonico. Lanca quando
// o valor nao bate em nenhuma chave conhecida (cabe ao caller decidir
// se isso e erro de schema ou apenas filtro).
export function normalizarDiarioModo(input: string): DiarioModoCanonico {
  if (input in DIARIO_MODO_LEGADO_TO_CANONICO) {
    return DIARIO_MODO_LEGADO_TO_CANONICO[input as DiarioModoLegado];
  }
  // Aceita o valor canonico ja normalizado (idempotente).
  if (input === 'gatilho' || input === 'conquista' || input === 'reflexao') {
    return input;
  }
  throw new Error(
    `modo de diario emocional invalido: '${input}' (esperado: ${DIARIO_MODO_ACEITO_INPUT.join(' | ')})`
  );
}

// Mapa inverso (canonico -> legado) usado em testes e migracao
// externa. Reflexao e identica nos dois sentidos.
export const DIARIO_MODO_CANONICO_TO_LEGADO: Readonly<
  Record<DiarioModoCanonico, DiarioModoLegado>
> = {
  gatilho: 'trigger',
  conquista: 'vitoria',
  reflexao: 'reflexao',
} as const;
