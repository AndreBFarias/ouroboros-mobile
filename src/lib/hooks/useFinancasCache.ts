// Hook que carrega o cache financas-cache.json e expoe estado de
// loading, erro e dados ja parseados. Recarrega no useFocusEffect
// (volta da MiniFinanceiroScreen apos navegacao).
//
// Em ambiente web __DEV__, carrega fixture local
// (scripts/fixtures/financas-cache.json) para validacao Nivel A no
// Chrome (ver VALIDATOR_BRIEF §1.9). Em Android, le via SAF do Vault
// real conforme ADR-0012.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { lerFinancasCache } from '@/lib/cache/financas-cache';
import { financasCachePath } from '@/lib/vault/paths';
import { useVault } from '@/lib/stores/vault';
import {
  FinancasCacheSchema,
  type FinancasCache,
} from '@/lib/schemas/financas-cache';

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

export interface UseFinancasCacheResult {
  cache: FinancasCache | null;
  loading: boolean;
  // null em ausencia, string com mensagem em erro de schema/JSON.
  error: string | null;
  recarregar: () => Promise<void>;
}

// Carrega fixture web em dev. Mantido em funcao isolada para nao
// pesar bundle Android: o require so resolve quando o ramo executa
// e o Metro nao inclui no bundle final mobile.
function carregarFixtureWeb(): FinancasCache | null {
  try {
    const data = require('../../../scripts/fixtures/financas-cache.json');
    const parsed = FinancasCacheSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function useFinancasCache(): UseFinancasCacheResult {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const [cache, setCache] = useState<FinancasCache | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    // Web em dev: usa fixture local para validacao Nivel A. Permite
    // checkpoint visual sem precisar de cache real no SAF.
    if (__DEV__ && Platform.OS === 'web') {
      const fixture = carregarFixtureWeb();
      setCache(fixture);
      setLoading(false);
      setError(null);
      return;
    }

    if (!vaultRoot) {
      setCache(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const uri = joinUri(vaultRoot, financasCachePath());
    const r = await lerFinancasCache(uri);
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
