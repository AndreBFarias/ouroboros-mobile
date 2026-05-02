// Reader do cache humor-heatmap.json (M10). Mobile so le; ADR-0012
// fixa que pipelines de agregacao rodam no desktop.
//
// Contrato:
//   - Cache ausente: devolve null. Caller exibe EmptyState ("Rode o
//     pipeline no desktop pra carregar dados.").
//   - JSON malformado ou schema desconhecido: devolve Error. Caller
//     exibe EmptyState alternativa ("Cache em formato desconhecido.
//     Rode o pipeline atualizado.").
//   - Cache valido: devolve HumorHeatmapCache tipado.
//
// O caller resolve URI absoluto via vaultRoot + humorHeatmapCachePath()
// e passa o URI completo. Este modulo e agnostico a SAF root para
// facilitar mocks em teste.
//
// Comentarios sem acento (convencao shell/CI).
import { StorageAccessFramework } from 'expo-file-system/legacy';
import {
  HumorHeatmapCacheSchema,
  type HumorHeatmapCache,
} from '@/lib/schemas/humor_heatmap_cache';

export type LerHumorHeatmapResult =
  | { tipo: 'ok'; cache: HumorHeatmapCache }
  | { tipo: 'ausente' }
  | { tipo: 'erro'; mensagem: string };

// Le o cache de humor a partir de um URI absoluto resolvido pelo
// caller. Encapsula tres ramos canonicos (ok, ausente, erro) num
// discriminated union para o consumidor decidir UI sem catch tryHard.
export async function lerHumorHeatmap(
  uri: string
): Promise<LerHumorHeatmapResult> {
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

  const result = HumorHeatmapCacheSchema.safeParse(parsed);
  if (!result.success) {
    // Schema invalido inclui schema_version desconhecido (literal(1)).
    // Devolvemos uma mensagem unica para evitar vazar detalhes do zod
    // na UI; testes podem inspecionar result.error diretamente se
    // precisarem.
    return { tipo: 'erro', mensagem: 'Schema desconhecido.' };
  }

  return { tipo: 'ok', cache: result.data };
}
