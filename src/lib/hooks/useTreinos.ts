// Hook que carrega sessoes de treino do Vault para a pessoa ativa.
// Devolve { sessoes, loading, error, recarregar }. Re-carrega ao
// retornar para a tela (focus) e quando o filtro de pessoa muda.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { listarTreinos } from '@/lib/vault/treinos';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

export interface UseTreinosResult {
  sessoes: TreinoSessao[];
  loading: boolean;
  error: string | null;
  recarregar: () => Promise<void>;
}

export function useTreinos(): UseTreinosResult {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  const filtroPessoa = usePessoa((s) => s.filtroPessoa);

  const [sessoes, setSessoes] = useState<TreinoSessao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setSessoes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Quando filtro = 'ambos', nao filtra; senao filtra pelo autor
      // ativo. Mesmo padrao usado em useHoje.
      const autor =
        filtroPessoa === 'ambos' ? null : pessoaAtiva;
      const lista = await listarTreinos(vaultRoot, { autor });
      setSessoes(lista);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'falha ao carregar treinos');
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

  return { sessoes, loading, error, recarregar: carregar };
}
