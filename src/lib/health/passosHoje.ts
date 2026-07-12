// Leitura ao vivo dos passos de HOJE direto do Health Connect.
// R-INT-3-HC-NOTIF-META-PASSOS (2026-05-25).
//
// Diferente do puxadorPassos (src/lib/health/puxadores/passos.ts), que
// agrega dias COMPLETOS para o Vault e por design FILTRA o dia em curso
// (barreira startOfTodayLocal), este helper le justamente o dia em
// curso (00:00 BRT ate agora) para alimentar a badge "X / Y passos" da
// Tela Hoje. O autopull nao grava o dia corrente no Vault, entao a
// badge precisa consultar o HC ao vivo.
//
// Reusa o MESMO import da bridge nativa que o puxador
// (`modules/health-connect/src`) e replica a logica de inicio-do-dia-
// local (UTC-3 BRT fixo). O helper startOfTodayLocal e privado no
// puxador; replicamos aqui sem modificar o puxador (decisao do dono).
//
// Graceful degradation: readRecords ja trata ambiente sem modulo
// nativo (requireOptionalNativeModule devolve null em web/Expo Go) e
// devolve { records: [] }. Mesmo assim envolvemos em try/catch e
// retornamos null em qualquer falha, sinalizando ao caller que a badge
// deve ficar oculta (sem dado confiavel para mostrar).
//
// Comentarios sem acento (convencao shell/CI).
import { readRecords } from '../../../modules/health-connect/src';
import { startOfTodayLocal } from '@/lib/datetime/local';

// Inicio do dia local agora vem do helper canonico
// src/lib/datetime/local.ts (Intl-based, default America/Sao_Paulo).
// Preserva o comportamento BRT anterior bit-a-bit (UTC-3 sem DST),
// resolvendo DST automaticamente caso o fuso mude.

// Shape do StepsRecord vindo da bridge nativa (espelha o puxador).
interface StepsRecordRaw {
  startTime?: string;
  endTime?: string;
  count?: number;
}

// Le os passos de HOJE (00:00 BRT do dia local atual ate agora) e
// soma o `count`. Retorna o total (>= 0) em sucesso, ou null quando o
// modulo nativo esta ausente / sem permissao / qualquer erro -- nesses
// casos a badge deve ficar oculta.
export async function lerPassosHojeHC(): Promise<number | null> {
  try {
    const now = new Date();
    const inicio = startOfTodayLocal(now);
    const res = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: inicio.toISOString(),
        endTime: now.toISOString(),
      },
      ascendingOrder: true,
    });

    // readRecords devolve { records: [] } em ambiente sem suporte. Aqui
    // [] e um dado valido (zero passos hoje), distinto de null (sem
    // acesso). Porem se nao ha NENHUM record e o modulo nativo nao
    // existe, ainda assim somar [] da 0 -- o que e correto: o caller
    // tambem checa o toggle healthConnectSync para decidir exibir.
    const records = (res?.records ?? []) as StepsRecordRaw[];
    let total = 0;
    for (const r of records) {
      if (typeof r.count === 'number' && r.count >= 0) {
        total += r.count;
      }
    }
    return total;
  } catch {
    // Modulo nativo ausente, sem permissao, ou erro de leitura: badge
    // oculta.
    return null;
  }
}
