// Helpers de leitura, listagem, escrita e exclusao de tarefas no
// Vault (M17 + M31). Cada tarefa vive em markdown/tarefa-<slug>.md
// (layout-por-tipo H2 / ADR-0023) com frontmatter validado pelo
// TarefaSchema. Path nao inclui data: tarefa e persistente; data de
// criacao vive no frontmatter (campo `data`).
//
// Exclusao usa lixeira soft: move o .md para
// cacheDirectory/lixeira/tarefas/<timestamp>-<basename>.md. Limpeza
// automatica via boot hook limparLixeiraExpirada (cap de 30 dias).
//
// listarTarefas devolve a lista ordenada com pendentes (data desc) e
// feitas (feito_em desc) intercaladas; o caller separa em grupos.
//
// M31: criarTarefa ganha branch para alarme vinculado. Quando
// meta.alarme.ativo === true, escreve antes uma entry em
// markdown/alarme-<slug-tarefa>-alarme.md via escreverAlarme +
// agendarAlarme, e popula meta.alarme.slug_vinculado para cancelamento
// idempotente posterior. reabrirTarefa inverte marcarFeito (concluida
// -> pendente).
//
// I-TAREFA (M-SAVE-TAREFA-VALIDA, 2026-05-07): writer migrado do
// joinUri local (so trim de barras) para vaultUriJoin canonico do
// modulo paths.ts. vaultUriJoin trata trailing whitespace, %20
// ofensivo e barras duplas em URIs SAF de OEMs MIUI/HyperOS/OneUI
// (origem: armadilha A29 do BRIEF). vaultRoot vazio agora throw em
// vez de silenciar — caller (app/todo.tsx) trata com toast PT-BR
// explicito + comTimeout 10s para impedir loader infinito.
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
// Imports apontam diretamente para os modulos finais (não para o
// barrel @/lib/vault) para evitar ciclo de carregamento.
import {
  tarefaPath,
  vaultUriJoin,
  MARKDOWN_FOLDER,
  matchesFeaturePrefix,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { writeVaultFile } from '@/lib/vault/writer';
import { TarefaSchema, type Tarefa } from '@/lib/schemas/tarefa';
import { escreverAlarme } from '@/lib/vault/alarmes';
import {
  agendarAlarme,
  cancelarAlarme,
} from '@/lib/services/alarmesNotificacoes';
import { AlarmeSchema, type Alarme } from '@/lib/schemas/alarme';
import { applyDeviceIdSuffix, getDeviceId } from '@/lib/util/deviceId';

// Item lido do Vault: meta + path relativo ao root (ex:
// 'tarefas/2026-04-29-comprar-pao.md'). UI usa esse path como id estavel
// (slug + data) para distinguir duas tarefas com mesmo titulo.
export interface TarefaListada {
  meta: Tarefa;
  rel: string;
}

// Extrai path relativo a partir de uma URI absoluta. Espelha o trim
// canonico de vaultUriJoin (trailing whitespace, %20 ofensivo, barras
// duplas) antes de remover o prefixo do root.
function uriParaRelativo(uri: string, root: string): string {
  const trimmedRoot = root
    .trim()
    .replace(/\s+$/, '')
    .replace(/%20+$/, '')
    .replace(/\/+$/, '');
  if (uri.startsWith(`${trimmedRoot}/`)) {
    return uri.slice(trimmedRoot.length + 1);
  }
  // Fallback: tenta achar 'markdown/' no final (layout-por-tipo H2).
  // Cai para 'tarefas/' como ultimo recurso (arquivos legados).
  const idxMd = uri.lastIndexOf('markdown/');
  if (idxMd >= 0) return uri.slice(idxMd);
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
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter((u) => matchesFeaturePrefix(u, 'tarefa-'));

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
  const uri = vaultUriJoin(vaultRoot, rel);
  const result = await readVaultFile(uri, TarefaSchema);
  return result ? result.meta : null;
}

// Cria ou atualiza uma tarefa em path canonico. O caller fornece meta
// validado e path relativo. Body livre opcional (tipicamente vazio).
//
// M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR (S2): le meta antigo do path
// antes de regravar; se existir alarme companion vinculado e
// data_hora_iso/recorrencia/ativo mudou, regrava o companion .md e
// chama agendarAlarme (idempotente: agendarAlarme ja cancela schedules
// previos do mesmo slug). Quando o usuario desativa o alarme em edit
// (ativo: true -> false), cancela schedules sem regravar companion.
// Operacao silenciosa em falha (mantem write da tarefa como source of
// truth canonico, conforme decisao M31). marcarFeito/reabrirTarefa
// passam por aqui mas nao mudam data_hora_iso -> branch inerte.
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
  const uri = vaultUriJoin(vaultRoot, rel);

  // S2: detecta transicao de alarme companion. Le meta antigo (silent
  // se ausente; e o caso comum de criarTarefa via escreverTarefa).
  let metaAntigo: Tarefa | null = null;
  try {
    const lido = await readVaultFile(uri, TarefaSchema);
    metaAntigo = lido ? lido.meta : null;
  } catch {
    metaAntigo = null;
  }

  await writeVaultFile<Tarefa>(uri, parsed.data, body);

  // S2: branch de re-agendamento. So roda quando ha estado anterior;
  // criacao nova nao passa por aqui (criarTarefa ja agenda inicial).
  if (metaAntigo) {
    await reagendarAlarmeCompanion(vaultRoot, metaAntigo, parsed.data);
  }

  return { uri, rel };
}

// S2: detecta transicao do bloco alarme entre versao antiga e nova da
// tarefa, e dispara re-agendamento idempotente do companion. Retorna
// silenciosamente em qualquer falha (alarme e companion opcional, a
// tarefa em si ja foi persistida com sucesso). Casos cobertos:
//
//   - Mudanca de data_hora_iso/recorrencia/ativo com slug vinculado:
//     reconstroi Alarme via construirAlarmeDeTarefa, regrava companion
//     .md e chama agendarAlarme (que cancela schedules previos antes).
//   - ativo: true -> false (toggle off): cancela schedules sem regravar
//     companion (mantem .md historico).
//
// slug_vinculado pode estar em meta.alarme antigo ou novo; preferimos
// o antigo quando ambos preenchidos (mesmo slug por construcao
// determinismica em criarTarefa, mas defesa em profundidade).
async function reagendarAlarmeCompanion(
  vaultRoot: string,
  antigo: Tarefa,
  novo: Tarefa
): Promise<void> {
  const alarmeAntigo = antigo.alarme;
  const alarmeNovo = novo.alarme;

  // Re-agendamento so e responsabilidade de escreverTarefa quando ja
  // existia um alarme companion vinculado. Criacao inicial fica com
  // criarTarefa (que ja chama escreverAlarme + agendarAlarme). Sem
  // slug_vinculado antigo -> nao e edicao de alarme existente.
  const slugVinculado = alarmeAntigo?.slug_vinculado;
  if (!slugVinculado) return;

  const tinhaSchedule =
    !!alarmeAntigo &&
    alarmeAntigo.ativo === true &&
    !!alarmeAntigo.data_hora_iso;
  const querSchedule =
    !!alarmeNovo && alarmeNovo.ativo === true && !!alarmeNovo.data_hora_iso;

  // Toggle off (ou remocao do bloco): cancela schedules e sai.
  if (tinhaSchedule && !querSchedule) {
    try {
      await cancelarAlarme(slugVinculado);
    } catch {
      // Ignora; tarefa ja foi persistida.
    }
    return;
  }

  // Sem schedule novo (e sem cancelar): nada a fazer.
  if (!querSchedule) return;

  // Detecta mudanca real: data_hora_iso, recorrencia ou ativo
  // (false -> true). Se nada relevante mudou, no-op (evita custo de
  // reescrita do .md e re-schedule no SO).
  const dataMudou =
    alarmeAntigo?.data_hora_iso !== alarmeNovo?.data_hora_iso;
  const recorrenciaMudou =
    alarmeAntigo?.recorrencia !== alarmeNovo?.recorrencia;
  const ativoMudou = alarmeAntigo?.ativo !== alarmeNovo?.ativo;
  if (!dataMudou && !recorrenciaMudou && !ativoMudou) return;

  // Reconstroi Alarme companion com os dados novos da tarefa.
  const alarmeMontado = construirAlarmeDeTarefa(novo, slugVinculado);
  if (!alarmeMontado) return;

  try {
    await escreverAlarme(vaultRoot, alarmeMontado);
    // agendarAlarme cancela schedules previos do mesmo slug antes de
    // criar novos -> idempotente. Falha individual nao quebra o fluxo.
    await agendarAlarme(alarmeMontado).catch(() => undefined);
  } catch {
    // Tarefa ja foi escrita; companion fica desatualizado mas usuario
    // pode re-tentar via toggle de alarme ou save manual.
  }
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

  // H2 layout-por-tipo: tarefa nao usa data no path. Slug ja inclui
  // sufixo random para deduplicar; data de criacao vive no frontmatter.
  const relCanonico = tarefaPath(slug);

  // M38: conflict resolution. Se ja existe arquivo no path canonico
  // com autor diferente (outro device criou tarefa de mesmo dia/slug),
  // aplica suffix '-<deviceId>' pra evitar overwrite cego em sync.
  // Mesmo autor regravando = edicao legitima -> mantem canonico.
  const uriCanonico = vaultUriJoin(vaultRoot, relCanonico);
  const existente = await readVaultFile(uriCanonico, TarefaSchema);
  let rel = relCanonico;
  if (existente && existente.meta.autor !== metaFinal.autor) {
    const deviceId = await getDeviceId();
    rel = applyDeviceIdSuffix(relCanonico, deviceId);
  }

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
// S2 (M-AUDIT-MIGUE-TAREFA-ALARME-REAGENDAR): nao re-agenda o alarme
// companion ao reabrir. Quando o usuario reabre uma tarefa, o alarme
// original ja foi cancelado por marcarFeito (decisao M30); a sprint S2
// decidiu manter o companion cancelado e exigir edicao explicita do
// alarme para re-ativar. Re-agendamento automatico em edicao de
// data_hora_iso/recorrencia agora vive em escreverTarefa via
// reagendarAlarmeCompanion.
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
  const origemUri = vaultUriJoin(vaultRoot, rel);
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
