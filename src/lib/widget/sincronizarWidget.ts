// Sincronizacao do widget Quick To-do (R-WIDG-1, 2026-05-17). Plugado
// em tres pontos:
//
//   1. Boot hook (drenarFilaTodoWidget): app aberto le a fila de entries
//      enfileiradas pelo widget enquanto o app estava fechado e
//      converte cada uma em Tarefa real no Vault via criarTarefa.
//   2. Save/excluir tarefa (atualizarCountTodoWidget): qualquer mutacao
//      em tarefas dispara refresh do count pendente exibido pelo widget.
//   3. saveHumor (event-driven do M20): mantido inalterado em
//      atualizarWidgetHomescreen — este modulo nao toca o widget Humor.
//
// Estrategia de persistencia:
//   - Widget process (BroadcastReceiver) so escreve em cacheDir/, nao
//     tem permissoes SAF para escrever no Vault direto.
//   - cacheDir/widget-todo-queue.json acumula entries ate o JS drenar.
//   - cacheDir/widget-todo-count.json e gravado pelo JS para o widget
//     ler ao renderizar (paridade com widget-data.json do M20).
//
// Resiliencia: erros internos viram no-op silencioso para nao quebrar
// boot ou save de tarefa. Toggle widgetHomescreen desligado: early
// return sem tocar bridge nativa.
//
// Comentarios sem acentuacao (convencao shell/CI).
import {
  atualizarCountTodoWidget,
  lerFilaTodoWidget,
  limparFilaTodoWidget,
  type WidgetTodoEntry,
} from '../../../modules/widget-homescreen/src';
import { useSettings } from '@/lib/stores/settings';
import { usePessoa } from '@/lib/stores/pessoa';
import { useVault } from '@/lib/stores/vault';
import {
  TarefaSchema,
  slugifyTitulo,
  sufixoRandom,
  type Tarefa,
} from '@/lib/schemas/tarefa';
import { criarTarefa, listarTarefas } from '@/lib/vault/tarefas';

// Resultado da drenagem da fila. Caller usa para telemetria/log local
// ou para diagnostico em dev. Em runtime normal e ignorado.
export interface DrenarResultado {
  tentadas: number;
  criadas: number;
  falhadas: number;
}

// Deriva meta canonica de uma entry vinda do widget. Spec da tarefa:
//   - autor: pessoaAtiva (do store usePessoa).
//   - data: derivada do entry.criadoEmMs (timezone UTC-3 do projeto).
//   - feito: false (recem-criada).
//   - categoria: 'outro' (default; widget nao categoriza).
//   - pessoa_destino: { tipo: 'mim' } (default v2).
//   - alarme: null (widget nao cria alarme vinculado).
export function montarTarefaDeEntry(
  entry: WidgetTodoEntry,
  pessoaAtiva: 'pessoa_a' | 'pessoa_b'
): { meta: Tarefa; slug: string } | null {
  const titulo = entry.titulo.trim();
  if (titulo.length === 0) return null;

  // Mesmo fuso usado por novaTarefa em app/todo.tsx (UTC-3).
  const TZ = -180;
  const local = new Date(entry.criadoEmMs + TZ * 60_000);
  const y = local.getUTCFullYear();
  const m = String(local.getUTCMonth() + 1).padStart(2, '0');
  const d = String(local.getUTCDate()).padStart(2, '0');
  const data = `${y}-${m}-${d}`;

  const slugBase = slugifyTitulo(titulo);
  const slug = `${slugBase}-${sufixoRandom()}`;
  const meta: Tarefa = {
    tipo: 'tarefa',
    data,
    autor: pessoaAtiva,
    titulo: titulo.slice(0, 200),
    feito: false,
    feito_em: null,
    categoria: 'outro',
    pessoa_destino: { tipo: 'mim' },
    alarme: null,
  };
  // Defensivo: revalida via schema antes de devolver ao caller.
  const parsed = TarefaSchema.safeParse(meta);
  if (!parsed.success) return null;
  return { meta: parsed.data, slug };
}

// Drena a fila do widget criando Tarefa real para cada entry. Tudo
// que cria com sucesso ou que falha vira numero de telemetria. No final
// sempre chama limparFilaTodoWidget() para evitar replay (mesmo
// quando algumas entries falharam — caller pode re-tentar adicionando
// pelo app diretamente).
//
// Toggle widgetHomescreen=false: lerFilaTodoWidget pode ainda devolver
// entries antigas (se o usuario tinha o widget ativo e desligou); o
// drenarFilaTodoWidget mantem o contrato de criar tarefa para o que
// ja foi enfileirado. Caller que quiser pular pode checar toggle antes.
export async function drenarFilaTodoWidget(): Promise<DrenarResultado> {
  const resultado: DrenarResultado = { tentadas: 0, criadas: 0, falhadas: 0 };
  try {
    const vaultRoot = useVault.getState().vaultRoot;
    if (!vaultRoot) return resultado;

    const fila = await lerFilaTodoWidget();
    if (fila.length === 0) return resultado;
    resultado.tentadas = fila.length;

    const pessoaAtiva = usePessoa.getState().pessoaAtiva;
    for (const entry of fila) {
      try {
        const montado = montarTarefaDeEntry(entry, pessoaAtiva);
        if (!montado) {
          resultado.falhadas += 1;
          continue;
        }
        await criarTarefa(vaultRoot, montado.meta, montado.slug);
        resultado.criadas += 1;
      } catch {
        resultado.falhadas += 1;
      }
    }

    // Zera a fila depois do processamento. Faz isso mesmo com falhas
    // para evitar loop infinito de entries malformadas. Falha do clear
    // e tolerada (a fila ainda pode ser reprocessada no proximo boot;
    // criarTarefa usa slug com sufixoRandom -> sem colisao real).
    await limparFilaTodoWidget();

    // Atualiza count pendente apos drenar (so faz sentido se algo foi
    // criado; se 0 criadas, sincronizar count tambem nao machuca).
    await sincronizarCountPendentes();
  } catch {
    // Falha total: deixa a fila quieta. Proximo boot tenta de novo.
  }
  return resultado;
}

// Le o numero de tarefas pendentes do Vault e atualiza o widget para
// refletir. Chamado depois de criar/excluir/marcar-feito tarefa.
// Resiliente: falha silenciosa para nao quebrar fluxo principal.
//
// Toggle widgetHomescreen off: ainda atualiza o count para 0
// (consistencia visual) so se a bridge nativa estiver disponivel.
export async function sincronizarCountPendentes(): Promise<void> {
  try {
    const vaultRoot = useVault.getState().vaultRoot;
    if (!vaultRoot) {
      await atualizarCountTodoWidget(0);
      return;
    }
    const ativo =
      useSettings.getState().featureToggles.widgetHomescreen === true;
    if (!ativo) {
      await atualizarCountTodoWidget(0);
      return;
    }
    const tarefas = await listarTarefas(vaultRoot);
    const pendentes = tarefas.filter((t) => !t.meta.feito).length;
    await atualizarCountTodoWidget(pendentes);
  } catch {
    // No-op silencioso.
  }
}

// Boot hook wrapper. Drena fila + sincroniza count em uma chamada
// idempotente. Plugado em BOOT_HOOKS (reagendamento.ts).
export async function sincronizarWidgetTodoBootHook(): Promise<void> {
  await drenarFilaTodoWidget();
  await sincronizarCountPendentes();
}
