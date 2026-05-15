// Hook que carrega medidas corporais (M12) do Vault filtrando por
// pessoa ativa. Mesmo padrao de useMarcos / useTreinos: lista
// reativa, recarregar manual, useFocusEffect para refletir saves
// recentes ao voltar pra rota.
//
// Introduzido em M11.4 para permitir que SecaoEvolucaoCorporal e o
// bloco "Anexar evolucao corporal" do SheetNovoMarco consumam
// medidas sem duplicar a logica de listarMedidas + filtro de autor.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { listarMedidas, type MedidasPeriodo } from '@/lib/vault/medidas';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { useFiltroPessoaEfetivo } from '@/lib/stores/filtroEfetivo';
import type { Medida } from '@/lib/schemas/medidas';

export interface UseMedidasArgs {
  periodo?: MedidasPeriodo;
}

export interface UseMedidasResult {
  medidas: Medida[];
  loading: boolean;
  error: string | null;
  recarregar: () => Promise<void>;
}

export function useMedidas(args: UseMedidasArgs = {}): UseMedidasResult {
  const periodo = args.periodo ?? 'tudo';
  const vaultRoot = useVault((s) => s.vaultRoot);
  const pessoaAtiva = usePessoa((s) => s.pessoaAtiva);
  // Filtro efetivo respeita pessoa.vaultCompartilhado: quando false,
  // forca pessoaAtiva mesmo se o store guardar 'ambos'.
  const filtroPessoa = useFiltroPessoaEfetivo();

  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setMedidas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const todas = await listarMedidas(vaultRoot, { periodo });
      // listarMedidas nao filtra por autor; aplicamos aqui para
      // respeitar a pessoa ativa quando filtroPessoa != 'ambos'.
      const filtradas =
        filtroPessoa === 'ambos'
          ? todas
          : todas.filter((m) => m.autor === pessoaAtiva);
      setMedidas(filtradas);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'falha ao carregar medidas'
      );
    } finally {
      setLoading(false);
    }
  }, [vaultRoot, pessoaAtiva, filtroPessoa, periodo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  return { medidas, loading, error, recarregar: carregar };
}
