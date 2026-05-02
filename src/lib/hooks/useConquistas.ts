// Hook que carrega conquistas do Vault e aplica os 5 filtros (M11.5).
// Mesmo padrão de useMarcos: vault root via store, recarregar em
// foco da tela, error string opcional. Filtros vivem no estado local
// do hook (não persistem entre sessões — decisão de UX: cada visita
// começa neutra, sem surpresa).
//
// Os 5 filtros (adendo A4): pessoa, mês, tipo de mídia, intensidade,
// bairro. `aplicarFiltros` é função pura testável; o hook só orquestra
// estado e ciclo de vida.
//
// Comentários em PT-BR com acentuação correta desde o primeiro commit.
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { useVaultCompartilhado } from '@/lib/stores/filtroEfetivo';
import { lerConquistas } from '@/lib/conquistas/loader';
import {
  aplicarFiltros,
  FILTROS_DEFAULT,
  type FiltrosConquistas,
  type FiltroMes,
  type FiltroTipoMidia,
  type FiltroIntensidade,
} from '@/lib/conquistas/filtros';
import { useVault } from '@/lib/stores/vault';
import { useFiltroPessoaEfetivo } from '@/lib/stores/filtroEfetivo';
import type { Conquista } from '@/lib/conquistas/types';
import type { PessoaId } from '@/lib/schemas/pessoa';

export interface UseConquistasResult {
  // Lista bruta carregada do Vault (sem filtros aplicados).
  brutas: Conquista[];
  // Lista após aplicar todos os filtros do estado.
  conquistas: Conquista[];
  // Telemetria do loader (ajuda diagnosticar empty state).
  totaisPorOrigem: { evento_positivo: number; diario_vitoria: number };
  loading: boolean;
  error: string | null;
  filtros: FiltrosConquistas;
  setFiltroPessoa: (p: PessoaId) => void;
  setFiltroMes: (m: FiltroMes) => void;
  setFiltroTipoMidia: (t: FiltroTipoMidia) => void;
  setFiltroIntensidade: (i: FiltroIntensidade) => void;
  setFiltroBairro: (q: string) => void;
  resetarFiltros: () => void;
  recarregar: () => Promise<void>;
}

export function useConquistas(): UseConquistasResult {
  const vaultRoot = useVault((s) => s.vaultRoot);
  // Default do filtro "pessoa" segue a lente global do app (filtroPessoa
  // do store). O usuário pode trocar localmente sem afetar outras telas.
  // Filtro efetivo respeita pessoa.vaultCompartilhado: quando false,
  // o default ja vem como pessoaAtiva (ignora 'ambos').
  const filtroPessoaGlobal = useFiltroPessoaEfetivo();
  // Quando vaultCompartilhado=false, o filtro de pessoa fica trancado
  // em filtroPessoaGlobal (=pessoaAtiva). Mesmo se o estado local
  // tivesse 'ambos' antes do toggle, a aplicacao usa o efetivo.
  const vaultCompartilhado = useVaultCompartilhado();

  const [brutas, setBrutas] = useState<Conquista[]>([]);
  const [totaisPorOrigem, setTotaisPorOrigem] = useState<{
    evento_positivo: number;
    diario_vitoria: number;
  }>({ evento_positivo: 0, diario_vitoria: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosConquistas>({
    ...FILTROS_DEFAULT,
    pessoa: filtroPessoaGlobal,
  });

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setBrutas([]);
      setTotaisPorOrigem({ evento_positivo: 0, diario_vitoria: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { conquistas, totaisPorOrigem: totais } = await lerConquistas(
        vaultRoot
      );
      setBrutas(conquistas);
      setTotaisPorOrigem(totais);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'falha ao carregar conquistas'
      );
    } finally {
      setLoading(false);
    }
  }, [vaultRoot]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  // Quando vaultCompartilhado=false, sobrescreve pessoa do filtro
  // local com o efetivo. Isolamento de privacidade no nivel do dado:
  // mesmo que o estado local guarde 'ambos' (ex.: filtros foram
  // salvos antes do toggle de privacidade), o aplicarFiltros recebe
  // sempre a pessoa correta.
  const filtrosEfetivos = useMemo(
    () =>
      vaultCompartilhado ? filtros : { ...filtros, pessoa: filtroPessoaGlobal },
    [filtros, vaultCompartilhado, filtroPessoaGlobal]
  );

  const conquistas = useMemo(
    () => aplicarFiltros(brutas, filtrosEfetivos),
    [brutas, filtrosEfetivos]
  );

  const setFiltroPessoa = useCallback(
    (p: PessoaId) => setFiltros((f) => ({ ...f, pessoa: p })),
    []
  );
  const setFiltroMes = useCallback(
    (m: FiltroMes) => setFiltros((f) => ({ ...f, mes: m })),
    []
  );
  const setFiltroTipoMidia = useCallback(
    (t: FiltroTipoMidia) => setFiltros((f) => ({ ...f, tipoMidia: t })),
    []
  );
  const setFiltroIntensidade = useCallback(
    (i: FiltroIntensidade) => setFiltros((f) => ({ ...f, intensidade: i })),
    []
  );
  const setFiltroBairro = useCallback(
    (q: string) => setFiltros((f) => ({ ...f, bairro: q })),
    []
  );
  const resetarFiltros = useCallback(
    () => setFiltros({ ...FILTROS_DEFAULT, pessoa: filtroPessoaGlobal }),
    [filtroPessoaGlobal]
  );

  return {
    brutas,
    conquistas,
    totaisPorOrigem,
    loading,
    error,
    filtros,
    setFiltroPessoa,
    setFiltroMes,
    setFiltroTipoMidia,
    setFiltroIntensidade,
    setFiltroBairro,
    resetarFiltros,
    recarregar: carregar,
  };
}
