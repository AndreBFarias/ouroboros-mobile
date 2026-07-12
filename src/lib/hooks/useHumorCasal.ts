// Hook do card Voces (R-HOME-4a). Le listarHumor(vaultRoot) e seleciona
// o ULTIMO registro de cada autor (pessoa_a / pessoa_b). listarHumor ja
// devolve os registros ordenados desc por data, entao o primeiro match
// de cada autor e o mais recente.
//
// Em modo sozinho (tipoCompanhia === 'sozinho') nunca le o autor
// pessoa_b: pessoaB fica sempre null.
//
// O ymd de hoje e calculado dentro do carregar (fuso BRT), NAO via prop
// 'now: Date' -- passar Date por prop criaria nova referencia a cada
// render e re-dispararia o effect (loop de re-fetch), armadilha ja
// documentada em useHoje.ts:68-72.
//
// Padrao de recarga: useEffect (dispara no mount, cobre testes) +
// useFocusEffect (re-dispara ao voltar o foco da tela, navegacao real),
// espelhando useEventosContador.ts.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useVault } from '@/lib/stores/vault';
import { useOnboarding } from '@/lib/stores/onboarding';
import { listarHumor } from '@/lib/vault/humor';
import type { HumorMeta } from '@/lib/schemas/humor';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

export interface HumorPessoa {
  // Registro de humor mais recente daquele autor.
  meta: HumorMeta;
  // meta.data (YYYY-MM-DD), exposto para conveniencia da UI.
  dataYmd: string;
  // true quando meta.data === ymd de hoje (BRT).
  registrouHoje: boolean;
}

export interface HumorCasalData {
  pessoaA: HumorPessoa | null; // null = nunca registrou
  pessoaB: HumorPessoa | null; // null em modo sozinho OU nunca registrou
  ehSozinho: boolean;
  loading: boolean;
  reload: () => void;
}

// YYYY-MM-DD de agora no fuso BRT (-180 min). Espelha formatYmdLocal.
function ymdHojeBrt(): string {
  const local = new Date(Date.now() + -180 * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useHumorCasal(): HumorCasalData {
  const vaultRoot = useVault((s) => s.vaultRoot);
  const tipoCompanhia = useOnboarding((s) => s.tipoCompanhia);
  const ehSozinho = tipoCompanhia === 'sozinho';

  const [pessoaA, setPessoaA] = useState<HumorPessoa | null>(null);
  const [pessoaB, setPessoaB] = useState<HumorPessoa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setPessoaA(null);
      setPessoaB(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const todos = await listarHumor(vaultRoot);
      const hojeYmd = ymdHojeBrt();
      const ultimoDe = (autor: PessoaAutor): HumorPessoa | null => {
        const meta = todos.find((h) => h.autor === autor);
        if (!meta) return null;
        return {
          meta,
          dataYmd: meta.data,
          registrouHoje: meta.data === hojeYmd,
        };
      };
      setPessoaA(ultimoDe('pessoa_a'));
      setPessoaB(ehSozinho ? null : ultimoDe('pessoa_b'));
    } finally {
      setLoading(false);
    }
  }, [vaultRoot, ehSozinho]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  return { pessoaA, pessoaB, ehSozinho, loading, reload: carregar };
}
