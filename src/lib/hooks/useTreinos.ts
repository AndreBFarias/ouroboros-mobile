// Hook que carrega sessoes de treino do Vault para a pessoa ativa.
// Devolve { sessoes, loading, error, recarregar }. Re-carrega ao
// retornar para a tela (focus) e quando o filtro de pessoa muda.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { listarTreinosComRel } from '@/lib/vault/treinos';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { useFiltroPessoaEfetivo } from '@/lib/stores/filtroEfetivo';
import type { TreinoListado } from '@/lib/vault/treinos';

export interface UseTreinosResult {
  // EXE-1: cada item carrega o `rel` real do arquivo, para que a UI
  // exclua e edite pelo path que existe em vez de remonta-lo.
  sessoes: TreinoListado[];
  loading: boolean;
  error: string | null;
  recarregar: () => Promise<void>;
}

export function useTreinos(): UseTreinosResult {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  // Filtro efetivo respeita pessoa.vaultCompartilhado.
  const filtroPessoa = useFiltroPessoaEfetivo();

  const [sessoes, setSessoes] = useState<TreinoListado[]>([]);
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
      // Quando filtro = 'ambos', não filtra; senao filtra pelo autor
      // ativo. Mesmo padrao usado em useHoje.
      const autor = filtroPessoa === 'ambos' ? null : pessoaAtiva;
      const lista = await listarTreinosComRel(vaultRoot, { autor });
      setSessoes(lista);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'falha ao carregar treinos'
      );
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
