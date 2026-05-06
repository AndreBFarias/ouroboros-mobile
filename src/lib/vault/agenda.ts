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
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import {
  agendaEventoPath,
  agendaPessoaFolder,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
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

// Concatena root SAF e path relativo, normalizando barras.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Sanea o eventId para uso seguro como nome de arquivo. Google Calendar
// IDs usam Base32hex (a-v + 0-9) na pratica; defesa em profundidade
// remove qualquer separador de path ou caractere proibido.
function sanitizarEventoId(id: string): string {
  return id.replace(/[/\\:*?"<>|.]+/g, '_');
}

// Garante que <vaultRoot>/agenda/<pessoa>/ existe. Idempotente. SAF
// em mobile real ja cria pastas intermedias quando o caller escreve
// arquivo; aqui apenas tentamos por defesa antes de write em massa
// (alguns OEMs Android falham silencioso na criacao implicita).
async function garantirPastaAgenda(
  vaultRoot: string,
  pessoa: PessoaAutor
): Promise<void> {
  const dir = joinUri(vaultRoot, agendaPessoaFolder(pessoa));
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  } catch {
    // Ja existe ou SAF interpretou como no-op.
  }
}

// Lista todos os eventos de uma pessoa no Vault. Pasta inexistente => [].
// Arquivos malformados (yaml invalido, schema falho) sao ignorados via
// safeParse implicito no readVaultFile (que lanca; aqui catch silencia).
// Ordenacao final: ascendente por inicio (cronologica).
export async function listarEventosAgenda(
  vaultRoot: string,
  pessoa: PessoaAutor
): Promise<AgendaEvento[]> {
  const folderUri = joinUri(vaultRoot, agendaPessoaFolder(pessoa));
  const arquivos = await listVaultFolder(folderUri, '.md');

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

  lidos.sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0));
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
  const uri = joinUri(vaultRoot, rel);
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
  const rel = agendaEventoPath(parsed.data.pessoa, parsed.data.inicio, idSeguro);
  const uri = joinUri(vaultRoot, rel);
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
  const folderUri = joinUri(vaultRoot, agendaPessoaFolder(pessoa));
  const arquivos = await listVaultFolder(folderUri, '.md');
  const idSeguro = sanitizarEventoId(id);
  const sufixo = `-${idSeguro}.md`;

  for (const arquivoUri of arquivos) {
    if (arquivoUri.endsWith(sufixo)) {
      try {
        await StorageAccessFramework.deleteAsync(arquivoUri);
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
// mesma lista e mesmo timestamp resulta em {0, 0, 0}.
export async function sincronizarSnapshotAgenda(
  vaultRoot: string,
  pessoa: PessoaAutor,
  eventos: AgendaEvento[],
  sincronizadoEm: string
): Promise<SincronizacaoResultado> {
  // Indexa estado atual por id antes de mexer.
  const atual = await listarEventosAgenda(vaultRoot, pessoa);
  const atualPorId = new Map<string, AgendaEvento>();
  for (const ev of atual) {
    atualPorId.set(ev.id, ev);
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
    if (eventosIguais(existente, evComTs)) {
      // Idempotencia: ja existe e e identico. Nao reescreve.
      continue;
    }
    await salvarEventoAgenda(vaultRoot, evComTs);
    atualizados += 1;
  }

  // Remove eventos cujo sincronizado_em e menor que o snapshot.
  // (Equivalente a: ids do Vault que nao chegaram no snapshot novo.)
  let removidos = 0;
  for (const ev of atual) {
    if (idsRecebidos.has(ev.id)) continue;
    if (ev.sincronizado_em < sincronizadoEm) {
      await apagarEventoAgenda(vaultRoot, pessoa, ev.id);
      removidos += 1;
    }
  }

  return { adicionados, atualizados, removidos };
}

// Igualdade estrutural simples de dois eventos (todos os campos do
// schema). Usado para idempotencia em sincronizarSnapshotAgenda.
function eventosIguais(a: AgendaEvento, b: AgendaEvento): boolean {
  return (
    a.id === b.id &&
    a.pessoa === b.pessoa &&
    a.titulo === b.titulo &&
    a.inicio === b.inicio &&
    a.fim === b.fim &&
    a.local === b.local &&
    a.fonte === b.fonte &&
    a.sincronizado_em === b.sincronizado_em
  );
}
