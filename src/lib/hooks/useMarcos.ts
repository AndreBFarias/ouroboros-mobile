// Hook que carrega marcos do Vault para a pessoa ativa. Mesmo
// padrao de useTreinos.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { listarMarcos } from '@/lib/vault/marcos';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import type { Marco } from '@/lib/schemas/marco';

export interface UseMarcosResult {
  marcos: Marco[];
  loading: boolean;
  error: string | null;
  recarregar: () => Promise<void>;
}

export function useMarcos(): UseMarcosResult {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const filtroPessoa = usePessoa((s) => s.filtroPessoa);

  const [marcos, setMarcos] = useState<Marco[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setMarcos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const autor = filtroPessoa === 'ambos' ? null : pessoaAtiva;
      const lista = await listarMarcos(vaultRoot, { autor });
      setMarcos(lista);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'falha ao carregar marcos');
    } finally {
      setLoading(false);
    }
  }, [vaultRoot, pessoaAtiva, filtroPessoa]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  return { marcos, loading, error, recarregar: carregar };
}
