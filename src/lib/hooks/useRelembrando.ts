// Hook do card "Relembrando" (R-HOME-4d). Carrega o historico completo
// do Vault (diarios + humores) via listarDiarios/listarHumor, monta o
// pool de candidatos das tres origens (reflexao, conquista, humor) e
// devolve a selecao deterministica do dia (selecionarRelembranca).
//
// Fonte deliberadamente NAO e o useRecap: o range do Recap e limitado a
// 365 dias (resolverPeriodo) e nao alcanca a efeméride "ha 1 ano" com
// folga. Aqui lemos o historico inteiro direto dos listadores.
//
// Sem guarda 'web://': listarDiarios/listarHumor tiveram o early-return
// web removido em V4.0.1 (INFRA-VAULT-MOCK-CONVERGENCIA) e delegam ao
// useVaultMock em web __DEV__, resolvendo prontamente. O card irmao
// CardVoces (useHumorCasal) le a mesma fonte sem guarda e funciona no
// Gauntlet -- espelhamos esse padrao para o E2E poder exercitar o
// caminho "com lembranca" semeando um .md antigo no vault mock.
//
// `hoje` e a chave YYYY-MM-DD sao memoizados uma vez por montagem para
// estabilidade (a selecao do dia nao pode oscilar entre focos). Recarga:
// useEffect (mount, cobre testes) + useFocusEffect (volta de foco,
// navegacao real), espelhando useHumorCasal/useEventosContador.
//
// Comentarios sem acento (convencao shell/CI).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useVault } from '@/lib/stores/vault';
import { listarDiarios } from '@/lib/vault/diario';
import { listarHumor } from '@/lib/vault/humor';
import {
  selecionarRelembranca,
  type CandidatoRelembranca,
  type Relembranca,
} from '@/lib/relembrando/selecionar';

export interface RelembrandoData {
  relembranca: Relembranca | null;
  loading: boolean;
}

// Date ajustado a BRT (-180 min): seus campos UTC representam o dia
// local, casando com diasEntre (trunca por dia UTC) e com os YYYY-MM-DD
// gravados no Vault.
function hojeBrt(): Date {
  return new Date(Date.now() + -180 * 60_000);
}

export function useRelembrando(): RelembrandoData {
  const vaultRoot = useVault((s) => s.vaultRoot);

  // Estabilidade por montagem: mesma referencia de `hoje` entre focos.
  const hoje = useMemo(() => hojeBrt(), []);

  const [relembranca, setRelembranca] = useState<Relembranca | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const carregar = useCallback(async () => {
    if (!vaultRoot) {
      setRelembranca(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [diarios, humores] = await Promise.all([
        listarDiarios(vaultRoot),
        listarHumor(vaultRoot),
      ]);

      const candidatos: CandidatoRelembranca[] = [];

      // Diarios -> reflexao e conquista (texto nao vazio). O id espelha
      // os ids do Recap para navegar ao mesmo detalhe; usamos a data em
      // YYYY-MM-DD (diario.data e ISO com hora, cortamos os 10 primeiros
      // chars) porque diasEntre exige o dia puro. /diario-emocional
      // ignora o slug hoje (limitacao pre-existente §12), entao o id e
      // consistencia, nao deep-link.
      for (const d of diarios) {
        const texto = (d.texto ?? '').trim();
        if (texto.length === 0) continue;
        const dataYmd = d.data.slice(0, 10);
        if (d.modo === 'reflexao') {
          candidatos.push({
            origem: 'reflexao',
            id: `diario_reflexao:${dataYmd}:${d.autor}`,
            data: dataYmd,
            frase: texto,
          });
        } else if (d.modo === 'conquista') {
          candidatos.push({
            origem: 'conquista',
            id: `diario_vitoria:${dataYmd}:${d.autor}`,
            data: dataYmd,
            frase: texto,
          });
        }
      }

      // Humor -> so registros com frase (o humor navega para o
      // historico, nao para um item; id apenas informativo).
      for (const h of humores) {
        const frase = (h.frase ?? '').trim();
        if (frase.length === 0) continue;
        candidatos.push({
          origem: 'humor',
          id: `humor:${h.data}`,
          data: h.data,
          frase,
        });
      }

      setRelembranca(selecionarRelembranca(candidatos, hoje));
    } finally {
      setLoading(false);
    }
  }, [vaultRoot, hoje]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  return { relembranca, loading };
}
