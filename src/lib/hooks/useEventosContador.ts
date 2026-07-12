// Hook que carrega Eventos de um Contador especifico do Vault
// (R-RECAP-5, 2026-05-16). Devolve { eventos, loading, error,
// recarregar }. Re-carrega ao retornar para a tela (focus).
//
// Padroes de useTreinos/useMarcos. Diferenca: hook recebe contadorId
// como parametro (cada contador tem sua propria timeline).
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useVault } from '@/lib/stores/vault';
import { listarEventosContador } from '@/lib/vault/eventosContador';
import type { EventoContador } from '@/lib/schemas/evento_contador';

export interface UseEventosContadorResult {
  eventos: EventoContador[];
  loading: boolean;
  error: string | null;
  recarregar: () => Promise<void>;
}

export function useEventosContador(
  contadorId: string | null
): UseEventosContadorResult {
  const vaultRoot = useVault((s) => s.vaultRoot);

  const [eventos, setEventos] = useState<EventoContador[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!vaultRoot || !contadorId) {
      setEventos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const lista = await listarEventosContador(vaultRoot, contadorId);
      setEventos(lista);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'falha ao carregar eventos'
      );
    } finally {
      setLoading(false);
    }
  }, [vaultRoot, contadorId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  return { eventos, loading, error, recarregar: carregar };
}
