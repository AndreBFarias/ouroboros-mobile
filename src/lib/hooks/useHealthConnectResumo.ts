// Q17.d (Onda Q, 2026-05-13): consome readers de lib/health/sync e
// devolve resumos prontos pra Saude Fisica → Evolucao. Pull on-demand
// no focus da tab consumidora. Erro silencioso (path nao-critico:
// dados externos faltando nao quebram fluxo principal).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  sincronizarPassosDeHC,
  sincronizarPesoDeHC,
  sincronizarTreinosDeHC,
} from '@/lib/health/sync';
import { listarPermissoesConcedidas } from '@/lib/health/permissions';
import {
  resumirPassos,
  resumirPeso,
  resumirTreinos,
  type ResumoPassos,
  type ResumoPeso,
  type ResumoTreinos,
} from '@/lib/health/resumo';
import { useSettings } from '@/lib/stores/settings';

export interface UseHealthConnectResumoResult {
  habilitado: boolean;
  loading: boolean;
  passos: ResumoPassos | null;
  peso: ResumoPeso | null;
  treinos: ResumoTreinos | null;
  recarregar: () => Promise<void>;
}

export function useHealthConnectResumo(): UseHealthConnectResumoResult {
  const habilitadoToggle = useSettings(
    (s) => s.featureToggles.healthConnectSync
  );
  const [habilitado, setHabilitado] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [passos, setPassos] = useState<ResumoPassos | null>(null);
  const [peso, setPeso] = useState<ResumoPeso | null>(null);
  const [treinos, setTreinos] = useState<ResumoTreinos | null>(null);

  const carregar = useCallback(async () => {
    if (!habilitadoToggle) {
      setHabilitado(false);
      setPassos(null);
      setPeso(null);
      setTreinos(null);
      return;
    }
    setLoading(true);
    try {
      const concedidas = await listarPermissoesConcedidas();
      if (concedidas.length === 0) {
        setHabilitado(false);
        setPassos(null);
        setPeso(null);
        setTreinos(null);
        return;
      }
      setHabilitado(true);
      // Busca 14 dias de passos pra calcular delta semana atual x anterior.
      const [passosRaw, pesoRaw, treinosRaw] = await Promise.all([
        sincronizarPassosDeHC(14),
        sincronizarPesoDeHC(90),
        sincronizarTreinosDeHC(30),
      ]);
      const hoje = new Date();
      setPassos(resumirPassos(passosRaw, hoje));
      setPeso(resumirPeso(pesoRaw));
      setTreinos(resumirTreinos(treinosRaw, hoje));
    } catch {
      // Erro silencioso: UI mostra "Dados indisponiveis" via null.
      setPassos(null);
      setPeso(null);
      setTreinos(null);
    } finally {
      setLoading(false);
    }
  }, [habilitadoToggle]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  return { habilitado, loading, passos, peso, treinos, recarregar: carregar };
}
