// Puxador HC -> Vault para SleepSessionRecord.
// R-INT-3-HC-AUTOPULL-SLEEP (2026-05-25).
//
// Implementa o contrato `Puxador` definido em autopullScheduler.ts.
// Le SleepSession do HC dentro de [since, now], calcula duracao em
// minutos por sessao, deriva a data do despertar (endTime em BRT) e
// escreve UMA sessao por arquivo via escreverSono.
//
// Diferente de passos (agregado por dia, regrava on-call), sono e
// chaveado por sessao. Idempotencia: antes de escrever, lista a pasta
// markdown/ uma unica vez e monta o set de hc ids ja persistidos
// (extraidos do slug sono-<data>-hc-<id>.md). Sessao com id ja presente
// e pulada.
//
// Decisoes do dono (espelham passos):
//   1. Pessoa via useSettings.getState().pessoa.ativa (campo canonico).
//   2. Sem barreira "dia em curso": uma sessao de sono so' aparece no HC
//      depois de encerrada (wearable fecha a sessao ao detectar
//      despertar). endTime no futuro e' defesa contra dado corrompido.
//
// Erros: o puxador NAO propaga excecao para o scheduler. Captura
// internamente e retorna {novos: 0, erro: mensagem}. Scheduler preserva
// ultimaSync nesse caso, garantindo ponto de retomada.
//
// Comentarios sem acento (convencao shell/CI).
import { readRecords } from '../../../../modules/health-connect/src';
import { escreverSono } from '@/lib/vault/sono';
import { listVaultFolder } from '@/lib/vault/reader';
import { MARKDOWN_FOLDER } from '@/lib/vault/paths';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';
import { isoToDataLocalYmd } from '@/lib/datetime/local';
import type { Puxador } from '@/lib/health/autopullScheduler';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// Janela default se since vier null (mesma do scheduler — 7 dias).
const JANELA_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000;

// Calculo de dia-local (isoToDataLocalYmd) agora vem do helper canonico
// src/lib/datetime/local.ts (Intl-based, default America/Sao_Paulo).
// Preserva o BRT anterior bit-a-bit.

// Teto defensivo de duracao (24h) — mesma constante do SonoSchema.
const DURACAO_MAX_MIN = 1440;

// Shape do SleepSessionRecord que vem da bridge nativa (espelha o
// mapeamento sleepSessionToMap em modules/health-connect Utils.kt):
//   { startTime, endTime, title?, notes?, stages: [...], metadata }.
// Nesta v1 nao usamos stages (sem analytics de ciclos).
interface SleepRecordRaw {
  metadata?: { id?: string; dataOrigin?: { packageName?: string } };
  startTime?: string;
  endTime?: string;
}

// Sanitiza o hc id do mesmo jeito que sonoPath, para comparar contra os
// slugs ja escritos. Mantem em sincronia com paths.ts (sonoPath).
function slugifyHcId(hcId: string): string {
  return hcId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Le pessoa atual do store, com fallback defensivo para pessoa_a.
function lerPessoaAtiva(): PessoaAutor {
  try {
    const pessoa = useSettings.getState().pessoa?.ativa;
    if (pessoa === 'pessoa_a' || pessoa === 'pessoa_b') return pessoa;
  } catch {
    // Store nao inicializado (teste isolado ou boot incompleto).
  }
  return 'pessoa_a';
}

// Monta o set de slugs de hc id ja persistidos no Vault, lendo a pasta
// markdown/ uma unica vez. Extrai o id do filename sono-<data>-hc-<id>.md.
// Em caso de falha de listagem, retorna set vazio (puxador segue e
// escreve; writer regrava sem corromper).
async function lerSlugsExistentes(vaultRoot: string): Promise<Set<string>> {
  const folderUri = `${vaultRoot.endsWith('/') ? vaultRoot.slice(0, -1) : vaultRoot}/${MARKDOWN_FOLDER}`;
  const slugs = new Set<string>();
  let uris: string[];
  try {
    uris = await listVaultFolder(folderUri, '.md');
  } catch {
    return slugs;
  }
  for (const uri of uris) {
    let decoded = uri;
    try {
      decoded = decodeURIComponent(uri);
    } catch {
      // mantem uri cru se decode falhar
    }
    const base = decoded.split('/').pop() ?? decoded;
    // sono-<data>-hc-<id>.md -> captura <id>.
    const m = base.match(/^sono-\d{4}-\d{2}-\d{2}-hc-(.+)\.md$/);
    if (m) slugs.add(m[1]);
  }
  return slugs;
}

// Implementa Puxador. Le SleepSession, calcula duracao, deduplica por hc
// id e escreve uma sessao por arquivo.
export const puxadorSono: Puxador = {
  tipo: 'SleepSession',
  async puxar({ since, pageSize }) {
    try {
      const vaultRoot = useVault.getState().vaultRoot;
      if (!vaultRoot) {
        return { novos: 0, erro: 'vault_root_indisponivel' };
      }

      const now = new Date();
      const startTimeIso =
        since ?? new Date(now.getTime() - JANELA_DEFAULT_MS).toISOString();

      const res = await readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTimeIso,
          endTime: now.toISOString(),
        },
        pageSize,
        ascendingOrder: true,
      });

      const records = res.records as SleepRecordRaw[];
      if (records.length === 0) {
        return { novos: 0, erro: null };
      }

      const existentes = await lerSlugsExistentes(vaultRoot);
      const autor = lerPessoaAtiva();

      let escritos = 0;
      for (const r of records) {
        if (
          typeof r.startTime !== 'string' ||
          typeof r.endTime !== 'string'
        ) {
          continue;
        }
        const inicioUtc = new Date(r.startTime);
        const fimUtc = new Date(r.endTime);
        if (Number.isNaN(inicioUtc.getTime()) || Number.isNaN(fimUtc.getTime())) {
          continue;
        }
        // Duracao em minutos. Sessao invertida ou nula e descartada
        // (dado corrompido). Teto de 24h protege contra endTime
        // disparatado.
        const duracaoMin = Math.round(
          (fimUtc.getTime() - inicioUtc.getTime()) / 60_000
        );
        if (duracaoMin <= 0 || duracaoMin > DURACAO_MAX_MIN) continue;

        // Idempotencia: pula sessao ja persistida (por hc id). Sem id no
        // metadata, nao da pra deduplicar com seguranca; pula o record
        // (evita lixo sem chave estavel no Vault).
        const hcId = r.metadata?.id;
        if (typeof hcId !== 'string' || hcId.length === 0) continue;
        const slug = slugifyHcId(hcId);
        if (existentes.has(slug)) continue;

        const data = isoToDataLocalYmd(r.endTime);
        if (!data) continue;

        await escreverSono(vaultRoot, {
          data,
          autor,
          inicio: r.startTime,
          fim: r.endTime,
          duracao_min: duracaoMin,
          fonte_hc_id: hcId,
          fonte_hc_origin: r.metadata?.dataOrigin?.packageName,
        });
        // Marca como existente pra nao reescrever se o mesmo id vier 2x
        // no mesmo batch (HC pode retornar duplicatas em janelas
        // sobrepostas).
        existentes.add(slug);
        escritos += 1;
      }

      return { novos: escritos, erro: null };
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : String(e ?? 'erro_desconhecido');
      return { novos: 0, erro: msg };
    }
  },
};
