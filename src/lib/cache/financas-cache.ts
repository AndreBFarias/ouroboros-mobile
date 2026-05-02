// Reader do cache financas-cache.json (M14). Mobile so le; ADR-0012
// fixa que pipelines de agregacao rodam no desktop.
//
// Padrao M10: arquivo em src/lib/cache/, mesma estrutura do reader
// humor-heatmap.ts (uniformidade canonica para readers de cache
// readonly).
//
// Contrato:
//   - Cache ausente: devolve { tipo: 'ausente' }. Caller exibe
//     EmptyState ("Rode o pipeline no desktop pra carregar dados.").
//   - JSON malformado ou schema desconhecido: devolve { tipo: 'erro' }.
//     Caller exibe EmptyState alternativa ("Cache em formato
//     desconhecido. Rode o pipeline atualizado.").
//   - Cache valido: devolve { tipo: 'ok', cache } tipado.
//
// O caller resolve URI absoluto via vaultRoot + financasCachePath() e
// passa o URI completo. Este modulo e agnostico a SAF root para
// facilitar mocks em teste.
//
// Comentarios sem acento (convencao shell/CI).
import { StorageAccessFramework } from 'expo-file-system/legacy';
import {
  FinancasCacheSchema,
  type FinancasCache,
} from '@/lib/schemas/financas-cache';

export type LerFinancasCacheResult =
  | { tipo: 'ok'; cache: FinancasCache }
  | { tipo: 'ausente' }
  | { tipo: 'erro'; mensagem: string };

// Le o cache de financas a partir de um URI absoluto resolvido pelo
// caller. Encapsula tres ramos canonicos (ok, ausente, erro) num
// discriminated union para o consumidor decidir UI sem catch tryHard.
export async function lerFinancasCache(
  uri: string
): Promise<LerFinancasCacheResult> {
  let raw: string;
  try {
    raw = await StorageAccessFramework.readAsStringAsync(uri);
  } catch {
    // SAF nao distingue 'nao existe' de 'sem permissao'. Tratamos
    // qualquer falha de I/O como ausencia de cache.
    return { tipo: 'ausente' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { tipo: 'erro', mensagem: 'JSON malformado.' };
  }

  const result = FinancasCacheSchema.safeParse(parsed);
  if (!result.success) {
    // Schema invalido inclui schema_version desconhecido (literal(1)).
    // Devolvemos uma mensagem unica para evitar vazar detalhes do zod
    // na UI; testes podem inspecionar result.error diretamente se
    // precisarem.
    return { tipo: 'erro', mensagem: 'Schema desconhecido.' };
  }

  return { tipo: 'ok', cache: result.data };
}
