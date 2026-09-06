// Helpers de leitura, listagem, escrita e exclusao de eventos de agenda
// no Vault (M37.1.2). Cada evento vive em
// agenda/<pessoa>/YYYY-MM-DD-<eventId>.md com frontmatter validado pelo
// AgendaEventoSchema. Padrao alinhado ao ADR-0019: persistencia canonica
// em .md individual. Substitui o cache JSON unico introduzido em M37.1
// (depreca media/cache/agenda-<pessoa>.json).
//
// sincronizarSnapshotAgenda e o entry point principal: recebe a lista
// completa de eventos remotos e o timestamp de sincronizacao; escreve
// cada evento como .md individual e remove os .md cujo sincronizado_em
// e menor que o timestamp passado (eventos deletados remotamente
// desaparecem do Vault sem precisar manter cursor externo).
//
// Em web (mock OAuth dev), vaultRoot pode ser 'web://mock-vault/...'
// e StorageAccessFramework e mockado pelo jest.setup.cjs (no-op em
// release Android). Idempotencia garantida por igualdade estrutural
// no parse + comparacao de sincronizado_em.
//
// AUDIT-INFRA-VAULT-MOCK-DELETE (2026-09-05): apagarEventoAgenda passa
// por deleteVaultFile em vez de chamar o SAF direto. Em web/dev isso
// remove o .md do useVaultMock -- antes a chamada lancava, o catch
// engolia, e o evento apagado continuava aparecendo no Gauntlet.
//
// Concatenacao de URI usa vaultUriJoin canonico (paths.ts) — trim
// agressivo de trailing whitespace, %20 ofensivo e barras duplas
// que vinham contaminando saves em OEMs MIUI/OneUI/HyperOS
// (Armadilha A29). Substituiu o helper local joinUri legado em
// I-AGENDA (M-SAVE-AGENDA-VALIDA).
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import * as FileSystem from 'expo-file-system/legacy';
import { deleteVaultFile } from '@/lib/vault/remover';
import {
  agendaEventoPath,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// AgendaEventoSchema: frontmatter canonico de cada .md em agenda/.
// Conforme spec M37.1.2 secao 3 (7 campos: id, pessoa, titulo, inicio,
// fim, local opcional, fonte literal, sincronizado_em).
export const AgendaEventoSchema = z.object({
  id: z.string().min(1),
  pessoa: z.enum(['pessoa_a', 'pessoa_b']),
  titulo: z.string().min(1),
  inicio: z.string().min(1),
  fim: z.string().min(1),
  local: z.string().optional(),
  fonte: z.literal('google_calendar'),
  sincronizado_em: z.string().min(1),
});
export type AgendaEvento = z.infer<typeof AgendaEventoSchema>;

// Resultado da sincronizacao: contadores para diagnostico/log.
export interface SincronizacaoResultado {
  adicionados: number;
  atualizados: number;
  removidos: number;
}

// Sanea o eventId para uso seguro como nome de arquivo. Google Calendar
// IDs usam Base32hex (a-v + 0-9) na pratica; defesa em profundidade
// remove qualquer separador de path ou caractere proibido.
function sanitizarEventoId(id: string): string {
  return id.replace(/[/\\:*?"<>|.]+/g, '_');
}

// Garante que <vaultRoot>/markdown/ existe. Idempotente. SAF
// em mobile real ja cria pastas intermedias quando o caller escreve
// arquivo; aqui apenas tentamos por defesa antes de write em massa
// (alguns OEMs Android falham silencioso na criacao implicita).
async function garantirPastaAgenda(
  vaultRoot: string,
  _pessoa: PessoaAutor
): Promise<void> {
  void _pessoa;
  const dir = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // Ja existe ou SAF interpretou como no-op.
  }
}

// Lista todos os eventos de uma pessoa no Vault (H2 layout-por-tipo).
// Le markdown/ filtrando por prefixo 'agenda-<pessoa>-'. Pasta
// inexistente => []. Arquivos malformados (yaml invalido, schema falho)
// sao ignorados via safeParse implicito no readVaultFile (que lanca;
// aqui catch silencia). Ordenacao final: ascendente por inicio
// (cronologica).
export async function listarEventosAgenda(
  vaultRoot: string,
  pessoa: PessoaAutor
): Promise<AgendaEvento[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, `agenda-${pessoa}-`)
  );

  const lidos: AgendaEvento[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, AgendaEventoSchema);
      if (result) lidos.push(result.meta);
    } catch {
      // Ignora arquivos malformados (defesa: nao quebrar a listagem
      // por causa de um .md corrompido vindo de Syncthing parcial).
    }
  }

  lidos.sort((a, b) =>
    a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0
  );
  return lidos;
}

// Le um evento especifico pelo path relativo (basicamente para tests).
// Retorna null se ausente ou malformado.
export async function lerEventoAgenda(
  vaultRoot: string,
  pessoa: PessoaAutor,
  iso: string,
  id: string
): Promise<AgendaEvento | null> {
  const rel = agendaEventoPath(pessoa, iso, sanitizarEventoId(id));
  const uri = vaultUriJoin(vaultRoot, rel);
  try {
    const result = await readVaultFile(uri, AgendaEventoSchema);
    return result ? result.meta : null;
  } catch {
    return null;
  }
}

// Salva (ou regrava) um evento como .md individual. Body do .md
// recebe a descricao opcional do evento (markdown livre); frontmatter
// recebe os 7 campos canonicos.
export async function salvarEventoAgenda(
  vaultRoot: string,
  evento: AgendaEvento,
  descricao: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = AgendaEventoSchema.safeParse(evento);
  if (!parsed.success) {
    throw new Error(`evento agenda invalido: ${parsed.error.message}`);
  }
  await garantirPastaAgenda(vaultRoot, parsed.data.pessoa);
  const idSeguro = sanitizarEventoId(parsed.data.id);
  const rel = agendaEventoPath(
    parsed.data.pessoa,
    parsed.data.inicio,
    idSeguro
  );
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<AgendaEvento>(uri, parsed.data, descricao);
  return { uri, rel };
}

// Apaga um evento pelo id. Localiza o arquivo cujo basename termina em
// '-<id>.md' (independente da data — ja que o caller pode nao saber
// o inicio antigo se o evento mudou de dia). Idempotente: ausencia
// nao e erro.
export async function apagarEventoAgenda(
  vaultRoot: string,
  pessoa: PessoaAutor,
  id: string
): Promise<void> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, `agenda-${pessoa}-`)
  );
  const idSeguro = sanitizarEventoId(id);
  const sufixo = `-${idSeguro}.md`;

  for (const arquivoUri of arquivos) {
    if (arquivoUri.endsWith(sufixo)) {
      try {
        await deleteVaultFile(arquivoUri);
      } catch {
        // Tolera falha (arquivo ja removido por sync concorrente).
      }
    }
  }
}

// Sincroniza o snapshot completo de eventos remotos com o Vault.
// Entry point principal usado pelo cache de M37.1.2.
//
// Algoritmo:
//   1. Le todos os .md atuais em agenda/<pessoa>/, indexa por id.
//   2. Para cada evento da lista nova: escreve .md individual
//      (sincronizado_em = timestamp passado). Conta como "adicionado"
//      se id nao existia, "atualizado" se existia mas o conteudo
//      diferiu, ignora se ja era identico (idempotencia).
//   3. Apos escrever os novos, le novamente a pasta e remove qualquer
//      .md cujo sincronizado_em e menor que o timestamp passado
//      (eventos deletados remotamente).
//
// Retorna contadores para diagnostico. Idempotente: rodar 2x com a
// mesma lista resulta em {0, 0, 0} mesmo com timestamps de
// sincronizacao DIFERENTES (AUDIT-P1-7) -- que e o unico cenario que o
// caller real produz. Nenhum .md e reescrito quando nada mudou de fato.
export async function sincronizarSnapshotAgenda(
  vaultRoot: string,
  pessoa: PessoaAutor,
  eventos: AgendaEvento[],
  sincronizadoEm: string
): Promise<SincronizacaoResultado> {
  // Indexa estado atual por id antes de mexer. Alem do registro mais
  // recente de cada id, conta quantos .md existem por id: como o nome
  // do arquivo embute a data (agendaEventoPath), um mesmo id pode ter
  // sobrado em mais de uma data (duplicata herdada de syncs anteriores
  // ao AUDIT-P1-4).
  const atual = await listarEventosAgenda(vaultRoot, pessoa);
  const atualPorId = new Map<string, AgendaEvento>();
  const arquivosPorId = new Map<string, number>();
  for (const ev of atual) {
    atualPorId.set(ev.id, ev);
    arquivosPorId.set(ev.id, (arquivosPorId.get(ev.id) ?? 0) + 1);
  }

  let adicionados = 0;
  let atualizados = 0;

  // Escreve eventos novos/modificados. Cada evento recebe o
  // sincronizado_em do snapshot inteiro para que o passo de remocao
  // funcione por timestamp uniforme.
  const idsRecebidos = new Set<string>();
  for (const ev of eventos) {
    idsRecebidos.add(ev.id);
    const evComTs: AgendaEvento = { ...ev, sincronizado_em: sincronizadoEm };
    const existente = atualPorId.get(ev.id);
    if (!existente) {
      await salvarEventoAgenda(vaultRoot, evComTs);
      adicionados += 1;
      continue;
    }
    // AUDIT-P1-4: o path deriva de inicio, entao remarcar o evento
    // muda o nome do arquivo. Sem apagar antes de gravar, o .md da
    // data antiga fica orfao para sempre: a etapa de remocao abaixo so
    // olha ids ausentes do snapshot, e este id continua presente.
    // Mesmo tratamento quando o Vault ja carrega mais de um .md para o
    // id (duplicata criada antes deste fix). apagarEventoAgenda varre
    // por sufixo '-<id>.md', entao limpa todas as copias numa passada,
    // independente da data no nome.
    const idSeguro = sanitizarEventoId(ev.id);
    const pathMudou =
      agendaEventoPath(pessoa, existente.inicio, idSeguro) !==
      agendaEventoPath(pessoa, evComTs.inicio, idSeguro);
    const duplicado = (arquivosPorId.get(ev.id) ?? 1) > 1;
    if (!pathMudou && !duplicado && eventosIguais(existente, evComTs)) {
      // Idempotencia: ja existe, e identico e ocupa um arquivo so.
      // Nao reescreve.
      continue;
    }
    if (pathMudou || duplicado) {
      await apagarEventoAgenda(vaultRoot, pessoa, ev.id);
    }
    await salvarEventoAgenda(vaultRoot, evComTs);
    atualizados += 1;
  }

  // Remove eventos cujo sincronizado_em e menor que o snapshot.
  // (Equivalente a: ids do Vault que nao chegaram no snapshot novo.)
  // idsRemovidos evita repetir a varredura e contar duas vezes quando o
  // mesmo id aparece em mais de um arquivo (AUDIT-P1-4): uma chamada de
  // apagarEventoAgenda ja apaga todas as copias daquele id.
  let removidos = 0;
  const idsRemovidos = new Set<string>();
  for (const ev of atual) {
    if (idsRecebidos.has(ev.id)) continue;
    if (idsRemovidos.has(ev.id)) continue;
    if (ev.sincronizado_em < sincronizadoEm) {
      await apagarEventoAgenda(vaultRoot, pessoa, ev.id);
      idsRemovidos.add(ev.id);
      removidos += 1;
    }
  }

  return { adicionados, atualizados, removidos };
}

// Igualdade de CONTEUDO de dois eventos. Usado para idempotencia em
// sincronizarSnapshotAgenda.
//
// AUDIT-P1-7: `sincronizado_em` ficou de fora de proposito. E metadado
// de sincronizacao, nao conteudo do evento, e sincronizarSnapshotAgenda
// carimba todos os eventos com o timestamp do snapshot corrente antes
// de comparar. Como o caller real (calendarCache.ts) gera um timestamp
// novo a cada refresh, incluir o campo tornava a comparacao sempre
// falsa: o guard de idempotencia nunca disparava e todos os .md eram
// reescritos, tocando o mtime de cada arquivo e fazendo o Syncthing
// propagar churn sem informacao nova para os 4 dispositivos.
//
// O campo continua sendo gravado no frontmatter: a etapa de remocao
// (eventos que sumiram do Google) segue comparando
// `ev.sincronizado_em < sincronizadoEm`.
function eventosIguais(a: AgendaEvento, b: AgendaEvento): boolean {
  return (
    a.id === b.id &&
    a.pessoa === b.pessoa &&
    a.titulo === b.titulo &&
    a.inicio === b.inicio &&
    a.fim === b.fim &&
    a.local === b.local &&
    a.fonte === b.fonte
  );
}
