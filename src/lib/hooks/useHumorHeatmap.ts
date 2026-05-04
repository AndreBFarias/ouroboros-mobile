// Hook que carrega o cache humor-heatmap.json e expoe estado de
// loading, erro e dados ja filtrados pela pessoa ativa quando o modo
// nao for 'sobreposto'. Recarrega no useFocusEffect (volta da
// MiniHumorScreen apos registrar humor pelo atalho).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { lerHumorHeatmap } from '@/lib/cache/humor-heatmap';
import { humorHeatmapCachePath } from '@/lib/vault/paths';
import { useVault } from '@/lib/stores/vault';
import { useHumorMock } from '@/lib/dev/humorMock';
import { GAUNTLET_ATIVO } from '@/lib/dev/gauntlet';
import type { HumorHeatmapCache } from '@/lib/schemas/humor_heatmap_cache';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

export type ModoFiltroHumor = PessoaAutor | 'sobreposto';

export interface UseHumorHeatmapResult {
  cache: HumorHeatmapCache | null;
  loading: boolean;
  // null em ausencia, string com mensagem em erro de schema.
  error: string | null;
  recarregar: () => Promise<void>;
}

// M-GAUNTLET-SEED-V2: monta um cache sintetico a partir das celulas do
// useHumorMock. Permite que o heatmap renderize colorido em web/dev
// sem pipeline backend. Em mobile/release, GAUNTLET_ATIVO=false e este
// caminho nunca executa (dead-code apos tree-shake).
function montarCacheMock(
  celulas: HumorHeatmapCache['celulas']
): HumorHeatmapCache {
  // Estatisticas simples: media e contagem por pessoa nas celulas dadas.
  const a = celulas.filter((c) => c.autor === 'pessoa_a');
  const b = celulas.filter((c) => c.autor === 'pessoa_b');
  const media = (xs: HumorHeatmapCache['celulas']): number =>
    xs.length === 0 ? 0 : xs.reduce((s, c) => s + c.humor, 0) / xs.length;
  return {
    schema_version: 1,
    gerado_em: new Date().toISOString(),
    periodo_dias: 91,
    pessoas: ['pessoa_a', 'pessoa_b'],
    celulas,
    estatisticas: {
      pessoa_a: {
        media_humor_30d: Number(media(a).toFixed(2)),
        registros_30d: a.length,
        registros_total: a.length,
      },
      pessoa_b: {
        media_humor_30d: Number(media(b).toFixed(2)),
        registros_30d: b.length,
        registros_total: b.length,
      },
    },
  };
}

export function useHumorHeatmap(): UseHumorHeatmapResult {
  const vaultRoot = useVault((s) => s.vaultRoot);
  // M-GAUNTLET-SEED-V2: assina celulas mock so quando GAUNTLET_ATIVO.
  // Em mobile real a store esta congelada vazia.
  const celulasMock = useHumorMock((s) => s.celulas);
  const [cache, setCache] = useState<HumorHeatmapCache | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setCache(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const uri = joinUri(vaultRoot, humorHeatmapCachePath());
    const r = await lerHumorHeatmap(uri);
    if (r.tipo === 'ok') {
      setCache(r.cache);
    } else if (r.tipo === 'ausente') {
      setCache(null);
    } else {
      setCache(null);
      setError(r.mensagem);
    }
    setLoading(false);
  }, [vaultRoot]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  // M-GAUNTLET-SEED-V2: em web/dev, se a store mock tem celulas, monta
  // cache sintetico e sobrepoe ao cache real. Tem prioridade sobre cache
  // do Vault (que tipicamente esta ausente no mock web). Em mobile real
  // celulasMock e sempre [], entao o ramo sintetico nunca roda.
  const cacheFinal: HumorHeatmapCache | null =
    GAUNTLET_ATIVO && celulasMock.length > 0
      ? montarCacheMock(celulasMock)
      : cache;

  return { cache: cacheFinal, loading, error, recarregar: carregar };
}

// Filtra celulas do cache por pessoa quando modo for individual.
// Em modo 'sobreposto' devolve todas as celulas (caller renderiza
// dois layers separados).
export function filtrarCelulasPorPessoa(
  celulas: HumorHeatmapCache['celulas'],
  modo: ModoFiltroHumor
): HumorHeatmapCache['celulas'] {
  if (modo === 'sobreposto') return celulas;
  return celulas.filter((c) => c.autor === modo);
}
