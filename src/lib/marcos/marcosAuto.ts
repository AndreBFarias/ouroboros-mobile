// Verifica e cria marcos automatizados a partir de heuristicas
// client-side. Complementa MOB-bridge-3 (backend) que faz o mesmo
// no desktop. Hash do conteudo evita duplicacao quando ambos rodam
// (mesma frase + autor produz mesmo hash, e saveMarco grava na pasta
// marcos/<data>-<slug>.md - mesmo path se mesmo dia).
//
// 5 criterios canonicos (spec M11 §10):
//   1. 3 treinos em 7 dias    -> "Tres treinos nesta semana."
//   2. Retorno após hiato 5+d -> "Voltou após N dias parados."
//   3. 7 dias humor seguidos  -> "Sete dias acompanhando."
//   4. 30 dias sem trigger    -> "Trinta dias sem trigger."
//   5. Primeira vitoria semana-> "Primeira vitoria desta semana."
//
// Função roda 1x/dia via BOOT_HOOKS. Idempotente: sempre que rodar
// sem mudanca de estado, retorna 0 marcos novos.
//
// Comentarios sem acento (convencao shell/CI).
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { listarTreinos } from '@/lib/vault/treinos';
import { listarMarcos } from '@/lib/vault/marcos';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { saveMarco } from '@/lib/marcos/saveMarco';
import { hashMarcoConteudo } from '@/lib/marcos/hash';
import { MARKDOWN_FOLDER, matchesFeaturePrefix } from '@/lib/vault/paths';
import {
  DiarioEmocionalSchema,
  type DiarioEmocionalMeta,
} from '@/lib/schemas/diario_emocional';
import { HumorSchema, type HumorMeta } from '@/lib/schemas/humor';
import type { Marco } from '@/lib/schemas/marco';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Diferenca em dias inteiros entre duas datas ISO (UTC interna).
function diffDias(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.floor(Math.abs(a - b) / (24 * 60 * 60 * 1000));
}

// Retorna agora em ISO 8601 UTC-3.
function nowIso(): string {
  const d = new Date();
  const TZ = -180;
  const local = new Date(d.getTime() + TZ * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${dd}T${hh}:${mm}:00-03:00`;
}

interface CandidatoMarco {
  descricao: string;
  tags: string[];
}

// Verifica criterio 1: 3 treinos em 7 dias para o autor.
function avaliarTresTreinosSemana(
  treinos: Array<{ data: string; autor: PessoaAutor }>,
  autor: PessoaAutor,
  agora: Date
): CandidatoMarco | null {
  const seteDiasMs = 7 * 24 * 60 * 60 * 1000;
  const limite = agora.getTime() - seteDiasMs;
  const recentes = treinos
    .filter((t) => t.autor === autor)
    .filter((t) => new Date(t.data).getTime() >= limite);
  if (recentes.length >= 3) {
    return {
      descricao: 'Três treinos nesta semana.',
      tags: ['treino', 'consistencia'],
    };
  }
  return null;
}

// Verifica criterio 2: retorno após hiato 5+ dias entre o treino mais
// recente e o anterior.
function avaliarRetornoAposHiato(
  treinos: Array<{ data: string; autor: PessoaAutor }>,
  autor: PessoaAutor
): CandidatoMarco | null {
  const seq = treinos
    .filter((t) => t.autor === autor)
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  if (seq.length < 2) return null;
  const dias = diffDias(seq[0].data, seq[1].data);
  if (dias >= 5) {
    return {
      descricao: `Voltou apos ${dias} dias parados.`,
      tags: ['treino', 'retomada'],
    };
  }
  return null;
}

// Verifica criterio 3: 7 dias consecutivos com humor (daily/) para
// o autor.
function avaliarSeteDiasConsecutivos(
  humores: Array<{ data: string; autor: PessoaAutor }>,
  autor: PessoaAutor,
  agora: Date
): CandidatoMarco | null {
  const filtrados = humores
    .filter((h) => h.autor === autor)
    .map((h) => h.data)
    .sort();
  if (filtrados.length < 7) return null;
  // Verifica se os ultimos 7 entries cobrem 7 dias consecutivos
  // até hoje (ou até ontem, contando ida até hoje).
  const ultimos = filtrados.slice(-7);
  const datas = new Set(ultimos);
  for (let i = 0; i < 7; i++) {
    const d = new Date(agora);
    d.setDate(d.getDate() - i);
    const ymd = d.toISOString().slice(0, 10);
    if (!datas.has(ymd)) return null;
  }
  return {
    descricao: 'Sete dias acompanhando.',
    tags: ['humor', 'consistencia'],
  };
}

// Verifica criterio 4: 30 dias sem trigger registrado.
function avaliarTrintaDiasSemTrigger(
  diarios: Array<DiarioEmocionalMeta>,
  autor: PessoaAutor,
  agora: Date
): CandidatoMarco | null {
  const triggers = diarios
    .filter((d) => d.autor === autor && d.modo === 'trigger')
    .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  if (triggers.length === 0) {
    // Nunca houve trigger para este autor: não podemos afirmar
    // "trinta dias sem" sem ponto de partida. Skip.
    return null;
  }
  const ultimoTrigger = new Date(triggers[0].data);
  const dias = Math.floor(
    (agora.getTime() - ultimoTrigger.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (dias >= 30) {
    return {
      descricao: 'Trinta dias sem trigger.',
      tags: ['emocional', 'consistencia'],
    };
  }
  return null;
}

// Verifica criterio 5: primeira vitoria desta semana (segunda como
// início de semana).
function avaliarPrimeiraConquistaSemana(
  diarios: Array<DiarioEmocionalMeta>,
  autor: PessoaAutor,
  agora: Date
): CandidatoMarco | null {
  // Calcula segunda feira da semana atual.
  const segunda = new Date(agora);
  const dia = segunda.getDay(); // 0=dom, 1=seg, ... 6=sab
  const diff = dia === 0 ? -6 : 1 - dia;
  segunda.setDate(segunda.getDate() + diff);
  segunda.setHours(0, 0, 0, 0);

  const vitorias = diarios
    .filter((d) => d.autor === autor && d.modo === 'vitoria')
    .filter((d) => new Date(d.data).getTime() >= segunda.getTime())
    .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
  if (vitorias.length >= 1) {
    return {
      descricao: 'Primeira vitoria desta semana.',
      tags: ['emocional', 'vitoria'],
    };
  }
  return null;
}

// Le humores (daily/<data>.md) e diarios emocionais para o autor.
async function lerSinaisDeAutor(vaultRoot: string): Promise<{
  humores: HumorMeta[];
  diarios: DiarioEmocionalMeta[];
}> {
  // H2 layout-por-tipo: humor e diario coexistem em markdown/, filtro
  // por prefixo separa as listagens.
  const markdownUri = joinUri(vaultRoot, MARKDOWN_FOLDER);
  const todos = (await listVaultFolder(markdownUri, '.md')).filter(
    (u) => !ehSyncConflict(u)
  );
  const arquivosHumor = todos.filter((u) => matchesFeaturePrefix(u, 'humor-'));
  const arquivosDiario = todos.filter((u) =>
    matchesFeaturePrefix(u, 'diario-')
  );

  const humores: HumorMeta[] = [];
  for (const a of arquivosHumor) {
    try {
      const r = await readVaultFile(a, HumorSchema);
      if (r) humores.push(r.meta);
    } catch {
      // ignora.
    }
  }
  const diarios: DiarioEmocionalMeta[] = [];
  for (const a of arquivosDiario) {
    try {
      const r = await readVaultFile(a, DiarioEmocionalSchema);
      if (r) diarios.push(r.meta);
    } catch {
      // ignora.
    }
  }
  return { humores, diarios };
}

export interface VerificarMarcosAutoResult {
  criados: number;
  ignorados: number;
}

// Função principal. Plugada em BOOT_HOOKS pela M11.
export async function verificarMarcosAuto(
  vaultRootArg?: string
): Promise<VerificarMarcosAutoResult> {
  const vaultRoot =
    typeof vaultRootArg === 'string' && vaultRootArg.length > 0
      ? vaultRootArg
      : useVault.getState().vaultRoot;
  if (!vaultRoot) return { criados: 0, ignorados: 0 };

  const autor = usePessoa.getState().pessoaAtiva;
  const agora = new Date();

  // Coleta sinais.
  const treinos = await listarTreinos(vaultRoot, { autor });
  const { humores, diarios } = await lerSinaisDeAutor(vaultRoot);
  const marcosExistentes = await listarMarcos(vaultRoot, { autor });

  // Conjunto de hashes já gravados para dedupe.
  const hashesExistentes = new Set(
    marcosExistentes
      .map((m) => m.hash)
      .filter((h): h is string => typeof h === 'string')
  );

  // Avalia criterios.
  const candidatos: Array<CandidatoMarco | null> = [
    avaliarTresTreinosSemana(treinos, autor, agora),
    avaliarRetornoAposHiato(treinos, autor),
    avaliarSeteDiasConsecutivos(humores, autor, agora),
    avaliarTrintaDiasSemTrigger(diarios, autor, agora),
    avaliarPrimeiraConquistaSemana(diarios, autor, agora),
  ];

  let criados = 0;
  let ignorados = 0;

  for (const cand of candidatos) {
    if (!cand) continue;
    const hash = hashMarcoConteudo(autor, cand.descricao);
    if (hashesExistentes.has(hash)) {
      ignorados++;
      continue;
    }
    const marco: Marco = {
      tipo: 'marco',
      data: nowIso(),
      autor,
      descricao: cand.descricao,
      tags: cand.tags,
      auto: true,
      origem: 'client',
      hash,
      // M33: marcos automaticos ficam "para mim" por padrao; o
      // usuario pode editar manualmente via UI mais tarde.
      para: { tipo: 'mim' },
    };
    try {
      await saveMarco({ meta: marco, vaultRoot });
      hashesExistentes.add(hash);
      criados++;
    } catch {
      ignorados++;
    }
  }

  return { criados, ignorados };
}
