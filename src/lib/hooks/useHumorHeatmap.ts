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

export function useHumorHeatmap(): UseHumorHeatmapResult {
  const vaultRoot = useVault((s) => s.vaultRoot);
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

  return { cache, loading, error, recarregar: carregar };
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
