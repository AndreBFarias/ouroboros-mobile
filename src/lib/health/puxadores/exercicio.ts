// Puxador HC -> Vault para ExerciseSessionRecord.
// R-INT-3-HC-AUTOPULL-EXERCICIO (2026-05-25).
//
// Implementa o contrato `Puxador` definido em autopullScheduler.ts.
// Le ExerciseSession do HC dentro de [since, now] e grava cada sessao
// como um treino_sessao no Vault (treinos/YYYY-MM-DD-hc-<id>.md),
// reusando o writer escreverTreino. Sao treinos registrados por
// wearables ou apps de terceiros (Strava, Google Fit, Samsung Health)
// que o usuario nao precisa redigitar no Ouroboros.
//
// Idempotencia: cada sessao do HC tem metadata.id estavel. Antes de
// escrever, listamos os treinos existentes e montamos o conjunto de
// fonte_hc_id ja persistidos. Records cujo id ja esta presente sao
// pulados. Assim rodar o puxador N vezes nao duplica sessoes.
//
// Decisoes do dono (espelham puxadorPassos):
//   1. Pessoa via useSettings.getState().pessoa.ativa (campo canonico).
//   2. Janela default 7d quando since vem null.
//
// Erros: o puxador NAO propaga excecao para o scheduler. Captura
// internamente e retorna {novos: 0, erro: mensagem}. Scheduler
// preserva ultimaSync nesse caso, garantindo ponto de retomada.
//
// Comentarios sem acento (convencao shell/CI).
import { readRecords } from '../../../../modules/health-connect/src';
import { escreverTreino, listarTreinos } from '@/lib/vault/treinos';
import { useSettings } from '@/lib/stores/settings';
import { useVault } from '@/lib/stores/vault';
import { exerciseTypePtbr, origemHcHumanizada } from '@/lib/health/exerciseTypeMap';
import type { Puxador } from '@/lib/health/autopullScheduler';
import type { PessoaAutor } from '@/lib/schemas/pessoa';
import type { TreinoSessao } from '@/lib/schemas/treino_sessao';

// Janela default se since vier null (mesma do scheduler — 7 dias).
const JANELA_DEFAULT_MS = 7 * 24 * 60 * 60 * 1000;

// Limites de duracao_min do TreinoSessaoSchema (1..240). Sessao com
// duracao calculada fora desse range e' clampada para caber no schema
// sem perder o registro.
const DURACAO_MIN = 1;
const DURACAO_MAX = 240;

// Shape do ExerciseSessionRecord que vem da bridge nativa (espelha o
// contrato documentado em modules/health-connect/src/index.ts):
//   { startTime, endTime, title?, exerciseType, notes?, metadata }
// metadata sempre tem { id, dataOrigin: {packageName}, ... }.
interface ExerciseSessionRaw {
  metadata?: {
    id?: string;
    dataOrigin?: { packageName?: string };
  };
  startTime?: string;
  endTime?: string;
  title?: string;
  exerciseType?: number;
  notes?: string;
}

// Le pessoa atual do store, com fallback defensivo para pessoa_a.
// Familia (vaultCompartilhado=true) nao gera duplicacao: cada pessoa
// roda o puxador no proprio device, autor reflete quem disparou.
function lerPessoaAtiva(): PessoaAutor {
  try {
    const pessoa = useSettings.getState().pessoa?.ativa;
    if (pessoa === 'pessoa_a' || pessoa === 'pessoa_b') return pessoa;
  } catch {
    // Store nao inicializado (teste isolado ou boot incompleto);
    // fallback.
  }
  return 'pessoa_a';
}

// Slug de arquivo a partir do metadata.id do HC. Prefixo hc- + id
// saneado para kebab-case ascii (o id do HC e' um UUID, ja seguro,
// mas saneamos defensivamente contra ids de origens exoticas).
function slugDeId(id: string): string {
  const limpo = id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `hc-${limpo || 'sem-id'}`;
}

// Duracao em minutos entre dois ISO datetimes, arredondada e clampada
// ao range valido do schema. Diferenca <= 0 ou invalida vira DURACAO_MIN.
function duracaoMin(startIso: string, endIso: string): number {
  const ini = new Date(startIso).getTime();
  const fim = new Date(endIso).getTime();
  if (Number.isNaN(ini) || Number.isNaN(fim) || fim <= ini) {
    return DURACAO_MIN;
  }
  const mins = Math.round((fim - ini) / 60000);
  if (mins < DURACAO_MIN) return DURACAO_MIN;
  if (mins > DURACAO_MAX) return DURACAO_MAX;
  return mins;
}

// Implementa Puxador<ExerciseSession>. Le sessoes, filtra duplicatas
// por fonte_hc_id e escreve as novas como treino_sessao.
export const puxadorExercicio: Puxador = {
  tipo: 'ExerciseSession',
  async puxar({ since, pageSize }) {
    try {
      const vaultRoot = useVault.getState().vaultRoot;
      if (!vaultRoot) {
        return { novos: 0, erro: 'vault_root_indisponivel' };
      }

      const now = new Date();
      const startTimeIso =
        since ?? new Date(now.getTime() - JANELA_DEFAULT_MS).toISOString();

      const res = await readRecords('ExerciseSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTimeIso,
          endTime: now.toISOString(),
        },
        pageSize,
        ascendingOrder: true,
      });

      const records = res.records as ExerciseSessionRaw[];
      if (records.length === 0) {
        return { novos: 0, erro: null };
      }

      // Idempotencia: conjunto dos fonte_hc_id ja persistidos. Sessoes
      // legadas sem o campo simplesmente nao entram no Set (nao colidem).
      const existentes = await listarTreinos(vaultRoot);
      const idsPersistidos = new Set<string>();
      for (const t of existentes) {
        if (typeof t.fonte_hc_id === 'string' && t.fonte_hc_id !== '') {
          idsPersistidos.add(t.fonte_hc_id);
        }
      }

      const autor = lerPessoaAtiva();
      let escritos = 0;

      for (const r of records) {
        const id = r.metadata?.id;
        if (typeof id !== 'string' || id === '') continue;
        // Pula record ja persistido (idempotencia por metadata.id).
        if (idsPersistidos.has(id)) continue;
        if (typeof r.startTime !== 'string' || typeof r.endTime !== 'string') {
          continue;
        }
        const inicio = new Date(r.startTime);
        if (Number.isNaN(inicio.getTime())) continue;

        const labelTipo = exerciseTypePtbr(r.exerciseType);
        const origem = origemHcHumanizada(r.metadata?.dataOrigin?.packageName);
        // Titulo prioriza o title da sessao (quando o app de origem
        // informa um nome proprio); senao usa o tipo + origem.
        const tituloBase =
          typeof r.title === 'string' && r.title.trim() !== ''
            ? r.title.trim()
            : labelTipo;
        const titulo = `${tituloBase} importado de ${origem}`;

        const meta: TreinoSessao = {
          tipo: 'treino_sessao',
          data: r.startTime,
          autor,
          rotina: titulo,
          duracao_min: duracaoMin(r.startTime, r.endTime),
          // Schema exige ao menos 1 exercicio. Sessao do HC nao traz
          // detalhe de series/reps, entao registramos um item unico
          // representando a sessao inteira.
          exercicios: [
            {
              nome: labelTipo,
              series: 1,
              reps: 1,
            },
          ],
          observacoes:
            typeof r.notes === 'string' && r.notes.trim() !== ''
              ? r.notes.trim()
              : undefined,
          fonte_hc_id: id,
          fonte_hc_origin: origem,
          exercicio_hc_type:
            typeof r.exerciseType === 'number' ? r.exerciseType : undefined,
        };

        await escreverTreino(vaultRoot, slugDeId(id), meta);
        idsPersistidos.add(id);
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
