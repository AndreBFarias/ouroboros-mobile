// Helpers de leitura, listagem, escrita e exclusao de tarefas no
// Vault (M17). Cada tarefa vive em tarefas/YYYY-MM-DD-<slug>.md com
// frontmatter validado pelo TarefaSchema. Path inclui data de criacao
// (estavel por toda a vida da tarefa, mesmo após marcar feito).
//
// Exclusao usa lixeira soft: move o .md para
// cacheDirectory/lixeira/tarefas/<timestamp>-<basename>.md. Limpeza
// automática via boot hook limparLixeiraExpirada (cap de 30 dias).
//
// listarTarefas devolve a lista ordenada com pendentes (data desc) e
// feitas (feito_em desc) intercaladas; o caller separa em grupos.
//
// M31: criarTarefa ganha branch para alarme vinculado. Quando
// meta.alarme.ativo === true, escreve antes uma entry em
// alarmes/<slug-tarefa>-alarme.md via escreverAlarme + agendarAlarme,
// e popula meta.alarme.slug_vinculado para cancelamento idempotente
// posterior. reabrirTarefa inverte marcarFeito (concluida -> pendente).
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
// Imports apontam diretamente para os modulos finais (não para o
// barrel @/lib/vault) para evitar ciclo de carregamento.
import { tarefasPath, VAULT_FOLDERS } from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { TarefaSchema, type Tarefa } from '@/lib/schemas/tarefa';
import { escreverAlarme } from '@/lib/vault/alarmes';
import { agendarAlarme } from '@/lib/services/alarmesNotificacoes';
import { AlarmeSchema, type Alarme } from '@/lib/schemas/alarme';

// Item lido do Vault: meta + path relativo ao root (ex:
// 'tarefas/2026-04-29-comprar-pao.md'). UI usa esse path como id estavel
// (slug + data) para distinguir duas tarefas com mesmo titulo.
export interface TarefaListada {
  meta: Tarefa;
  rel: string;
}

// Concatena root SAF e path relativo, normalizando barras.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Extrai path relativo a partir de uma URI absoluta (root + 'tarefas/...').
function uriParaRelativo(uri: string, root: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  if (uri.startsWith(`${trimmedRoot}/`)) {
    return uri.slice(trimmedRoot.length + 1);
  }
  // Fallback: tenta achar 'tarefas/' no final.
  const idx = uri.lastIndexOf('tarefas/');
  return idx >= 0 ? uri.slice(idx) : uri;
}

// Lista todas as tarefas do Vault. Pasta inexistente => [].
// Ordenacao final: pendentes (mais recentes primeiro por data),
// depois feitas (mais recentes primeiro por feito_em). Caller separa
// em grupos visuais.
export async function listarTarefas(
  vaultRoot: string
): Promise<TarefaListada[]> {
  const folderUri = joinUri(vaultRoot, VAULT_FOLDERS.tarefas);
  const arquivos = await listVaultFolder(folderUri, '.md');

  const lidos: TarefaListada[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, TarefaSchema);
      if (result) {
        lidos.push({
          meta: result.meta,
          rel: uriParaRelativo(arquivoUri, vaultRoot),
        });
      }
    } catch {
      // Ignora arquivos malformados.
    }
  }

  // Pendentes primeiro (asc por data inverso), depois feitas (asc por
  // feito_em inverso). 'a < b' coercia string ISO para comparacao
  // lexicografica que coincide com cronologica.
  lidos.sort((a, b) => {
    if (a.meta.feito !== b.meta.feito) return a.meta.feito ? 1 : -1;
    if (!a.meta.feito) {
      // Ambos pendentes: data desc.
      if (a.meta.data !== b.meta.data) {
        return a.meta.data < b.meta.data ? 1 : -1;
      }
      return a.rel < b.rel ? -1 : 1;
    }
    // Ambos feitos: feito_em desc (null vai para o fim).
    const fa = a.meta.feito_em ?? '';
    const fb = b.meta.feito_em ?? '';
    if (fa !== fb) return fa < fb ? 1 : -1;
    return a.rel < b.rel ? -1 : 1;
  });
  return lidos;
}

// Le uma tarefa pelo path relativo. Retorna null se ausente.
export async function lerTarefa(
  vaultRoot: string,
  rel: string
): Promise<Tarefa | null> {
  const uri = joinUri(vaultRoot, rel);
  const result = await readVaultFile(uri, TarefaSchema);
  return result ? result.meta : null;
}

// Cria ou atualiza uma tarefa em path canonico. O caller fornece meta
// validado e path relativo. Body livre opcional (tipicamente vazio).
export async function escreverTarefa(
  vaultRoot: string,
  rel: string,
  meta: Tarefa,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  const parsed = TarefaSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`tarefa invalida: ${parsed.error.message}`);
  }
  const uri = joinUri(vaultRoot, rel);
  await writeVaultFile<Tarefa>(uri, parsed.data, body);
  return { uri, rel };
}

// Helper para criar uma tarefa nova: deriva path canonico
// tarefas/YYYY-MM-DD-<slug>.md a partir do meta. Caller responsável
// por garantir que slug e unico (sufixo random recomendado).
//
// M31: branch alarme vinculado. Quando meta.alarme.ativo === true e
// meta.alarme.data_hora_iso esta preenchido, monta um Alarme e o
// persiste em alarmes/<slug>-alarme.md ANTES de gravar a tarefa,
// agendando o trigger nativo via agendarAlarme. O slug_vinculado e
// gravado dentro do meta.alarme da tarefa para cancelamento idempotente
// posterior (marcarFeito futuro pode chamar cancelarAlarme(slug)).
//
// Falha ao agendar/escrever alarme nao impede a criacao da tarefa: o
// alarme companion fica como TODO (slug_vinculado preenchido mas sem
// schedule garantido). Decisao conservadora: a tarefa e a entidade
// canonica; o alarme e um companion opcional que pode ser re-tentado.
export async function criarTarefa(
  vaultRoot: string,
  meta: Tarefa,
  slug: string,
  body: string = ''
): Promise<{ uri: string; rel: string }> {
  let metaFinal = meta;

  // M31: branch alarme. So roda quando o usuario explicitou alarme
  // ativo + horario; caso contrario o bloco continua null/inativo.
  if (meta.alarme && meta.alarme.ativo && meta.alarme.data_hora_iso) {
    const slugAlarme = `${slug}-alarme`;
    const alarmeMontado = construirAlarmeDeTarefa(meta, slugAlarme);
    if (alarmeMontado) {
      try {
        await escreverAlarme(vaultRoot, alarmeMontado);
        // agendarAlarme e no-op em web e idempotente em nativo. Falhas
        // de schedule (sem permissao, cap atingido) nao quebram a
        // criacao da tarefa.
        await agendarAlarme(alarmeMontado).catch(() => undefined);
      } catch {
        // Mantem tarefa criavel mesmo se alarme companion falhar.
      }
      metaFinal = {
        ...meta,
        alarme: { ...meta.alarme, slug_vinculado: slugAlarme },
      };
    }
  }

  const dataDate = new Date(`${metaFinal.data}T00:00:00-03:00`);
  const rel = tarefasPath(dataDate, slug);
  return escreverTarefa(vaultRoot, rel, metaFinal, body);
}

// M31: helper que monta um Alarme valido a partir do meta.alarme da
// tarefa. Reusa o vocabulario do AlarmeSchema (M30): titulo herda o
// titulo da tarefa; horario deriva de data_hora_iso (HH:MM 24h);
// dias_semana fica [] para recorrencia nao-semanal e [0..6] (todos
// os dias) para 'semanal' como default conservador.
//
// Retorna null se o meta.alarme nao tiver data_hora_iso valido (caller
// ja deve filtrar; defesa em profundidade).
function construirAlarmeDeTarefa(meta: Tarefa, slug: string): Alarme | null {
  if (!meta.alarme || !meta.alarme.data_hora_iso) return null;
  const date = new Date(meta.alarme.data_hora_iso);
  if (Number.isNaN(date.getTime())) return null;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const horario = `${hh}:${mm}`;
  const recorrencia = meta.alarme.recorrencia;
  // semanal default: todos os 7 dias quando o usuario escolhe recorrer
  // semanalmente sem especificar dia (caso comum: "todo dia da semana
  // util" pode ser refinado em UI futura). Conservador: cobre todos
  // para nao silenciar trigger.
  const diasSemana =
    recorrencia === 'semanal' ? [0, 1, 2, 3, 4, 5, 6] : [];
  const proposto: Alarme = {
    tipo: 'alarme',
    slug,
    titulo: meta.titulo,
    horario,
    dias_semana: diasSemana,
    recorrencia,
    data_unica: meta.alarme.data_hora_iso,
    tag: 'outro',
    som: 'gentle',
    ativo: true,
    snooze_minutos: 5,
    criado_em: new Date().toISOString().replace('Z', '+00:00'),
    ultimo_disparo: null,
    notification_ids: [],
    snooze_id: null,
  };
  const parsed = AlarmeSchema.safeParse(proposto);
  return parsed.success ? parsed.data : null;
}

// Marca tarefa como feita ou pendente, regravando o frontmatter.
// Caller fornece path relativo e novo estado; meta atual e relido,
// modificado e regravado. Operacao idempotente.
export async function marcarFeito(
  vaultRoot: string,
  rel: string,
  feito: boolean,
  agora: Date = new Date()
): Promise<Tarefa> {
  const atual = await lerTarefa(vaultRoot, rel);
  if (!atual) {
    throw new Error(`tarefa nao encontrada: ${rel}`);
  }
  const atualizado: Tarefa = {
    ...atual,
    feito,
    feito_em: feito ? agora.toISOString() : null,
  };
  await escreverTarefa(vaultRoot, rel, atualizado);
  return atualizado;
}

// M31: reabre uma tarefa concluida, voltando para o estado pendente.
// Inverte semantica de marcarFeito: feito=false, feito_em=null. Idempotente
// (chamar em tarefa ja pendente nao quebra). Lanca quando a tarefa nao
// existe (alinha com marcarFeito).
//
// TODO M30: re-agendamento do alarme companion ainda nao e responsabilidade
// deste helper. Quando o usuario reabre uma tarefa, o alarme original ja
// foi cancelado por marcarFeito (decisao M30); decidir se re-cria ou nao
// fica para sprint futura. Por hora, alarme companion permanece cancelado;
// usuario edita a tarefa pra re-ativar manualmente.
export async function reabrirTarefa(
  vaultRoot: string,
  rel: string
): Promise<Tarefa> {
  const atual = await lerTarefa(vaultRoot, rel);
  if (!atual) {
    throw new Error(`tarefa nao encontrada: ${rel}`);
  }
  const atualizado: Tarefa = {
    ...atual,
    feito: false,
    feito_em: null,
  };
  await escreverTarefa(vaultRoot, rel, atualizado);
  return atualizado;
}

// Move uma tarefa para a lixeira soft. Retorna o path final na
// lixeira. cacheDirectory/lixeira/tarefas/<timestamp>-<basename>.md.
// Em ambiente web FileSystem.cacheDirectory pode ser null; usamos
// prefixo mock para não quebrar testes; caller real depende de
// ambiente nativo.
export async function excluirTarefa(
  vaultRoot: string,
  rel: string
): Promise<{ lixeiraPath: string }> {
  const origemUri = joinUri(vaultRoot, rel);
  const cacheBase = FileSystem.cacheDirectory ?? 'cache://';
  const lixeiraDir = `${cacheBase}lixeira/tarefas/`;
  try {
    await FileSystem.makeDirectoryAsync(lixeiraDir, { intermediates: true });
  } catch {
    // Já existe.
  }

  const ts = formatTimestampLixeira(new Date());
  const nomeArquivo = rel.split('/').pop() ?? 'tarefa.md';
  const lixeiraPath = `${lixeiraDir}${ts}-${nomeArquivo}`;

  let raw: string;
  try {
    raw = await StorageAccessFramework.readAsStringAsync(origemUri);
    await FileSystem.writeAsStringAsync(lixeiraPath, raw);
    await StorageAccessFramework.deleteAsync(origemUri);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`falha ao mover para lixeira: ${msg}`);
  }
  return { lixeiraPath };
}

// Formata timestamp para nome de arquivo na lixeira: YYYYMMDD-HHmmss.
function formatTimestampLixeira(date: Date): string {
  const TZ_OFFSET_MIN = -180;
  const local = new Date(date.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  const ss = String(local.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}
