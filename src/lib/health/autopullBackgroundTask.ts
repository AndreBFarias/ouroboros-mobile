// Registro guarded da task de background do autopull HC.
// R-INT-3-HC-AUTOPULL-BACKGROUND (2026-05-25).
//
// Esta sprint adiciona execucao do autopull HC com o app FECHADO, opt-in
// via featureToggles.hcAutopullBackground (default false; custo de bateria).
//
// GATE DE BUILD NATIVO: expo-task-manager + expo-background-task NAO estao
// instalados no momento desta sprint. Background e' codigo nativo
// (WorkManager no Android) e exige rebuild do dev-client/APK -- nao pega via
// OTA/Metro. Para nao quebrar o bundle/smoke atual (que roda sem a lib), o
// carregamento dos modulos nativos e' LAZY e GUARDED: usamos require dinamico
// dentro de try/catch. Se o modulo nativo estiver ausente, cada funcao vira
// no-op silencioso (mesma defesa do requireOptionalNativeModule da bridge HC).
//
// Decisao de lib: expo-background-task (WorkManager, recomendado SDK 53+),
// NAO expo-background-fetch (deprecada no SDK 53+).
//
// Reuso: a task chama orquestrarHCAutopull com os 5 puxadores concretos
// (mesmo array do wiring foreground em app/_layout.tsx). NAO reimplementa o
// scheduler nem os puxadores.
//
// Comentarios sem acento (convencao shell/CI).

import { orquestrarHCAutopull } from '@/lib/health/autopullScheduler';
import { puxadorPassos } from '@/lib/health/puxadores/passos';
import { puxadorExercicio } from '@/lib/health/puxadores/exercicio';
import { puxadorMedidas } from '@/lib/health/puxadores/medidas';
import { puxadorMenstruacao } from '@/lib/health/puxadores/menstruacao';
import { puxadorSono } from '@/lib/health/puxadores/sleep';
import { useSettings } from '@/lib/stores/settings';

// Nome canonico da task registrada no TaskManager. Constante exportada para
// o wiring em _layout (registrar/desregistrar) e testes referenciarem sem
// duplicar string magica.
export const HC_AUTOPULL_BACKGROUND_TASK = 'hc-autopull-background';

// Intervalo minimo solicitado ao WorkManager (segundos). 6h equilibra
// frescor dos dados de saude com economia de bateria. O Android pode atrasar
// a execucao conforme Doze/restricoes do OEM -- e' um piso, nao garantia.
const INTERVALO_MINIMO_S = 6 * 60 * 60;

// Shape minimo do modulo expo-task-manager que consumimos. Declarado local
// para nao depender de @types da lib (ausente no bundle atual).
interface TaskManagerLike {
  defineTask(
    nome: string,
    executor: () => Promise<unknown> | unknown
  ): void;
  isTaskRegisteredAsync(nome: string): Promise<boolean>;
}

// Shape minimo do modulo expo-background-task que consumimos.
interface BackgroundTaskLike {
  registerTaskAsync(
    nome: string,
    opts?: { minimumInterval?: number }
  ): Promise<void>;
  unregisterTaskAsync(nome: string): Promise<void>;
}

// Carrega expo-task-manager de forma lazy/guarded. Retorna null quando a lib
// nativa esta ausente (bundle atual sem prebuild). require dinamico evita que
// o bundler/tsc exija a dependencia em build time.
function carregarTaskManager(): TaskManagerLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-task-manager') as TaskManagerLike;
  } catch {
    return null;
  }
}

// Carrega expo-background-task de forma lazy/guarded. Retorna null quando a
// lib nativa esta ausente.
function carregarBackgroundTask(): BackgroundTaskLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-background-task') as BackgroundTaskLike;
  } catch {
    return null;
  }
}

// Guarda contra dupla definicao da task no mesmo runtime (hot reload em dev,
// re-import). defineTask deve ser chamado no maximo uma vez por nome.
let taskDefinida = false;

// Define a task no TaskManager (idempotente, no-op sem lib nativa). A task
// reusa orquestrarHCAutopull com os 5 puxadores -- mesmo array do foreground.
// Respeita o toggle hcAutopullBackground em runtime: se o usuario desligou
// entre o registro e a execucao, vira no-op gracioso.
function definirTask(taskManager: TaskManagerLike): void {
  if (taskDefinida) return;
  taskDefinida = true;
  taskManager.defineTask(HC_AUTOPULL_BACKGROUND_TASK, async () => {
    const ligado = useSettings.getState().featureToggles.hcAutopullBackground;
    if (!ligado) {
      console.log('[hc-autopull]', 'background skip (toggle off)');
      return;
    }
    try {
      const r = await orquestrarHCAutopull([
        puxadorPassos,
        puxadorExercicio,
        puxadorMedidas,
        puxadorMenstruacao,
        puxadorSono,
      ]);
      const totalNovos = r.tipos.reduce((acc, t) => acc + t.novos, 0);
      const totalErros = r.tipos.filter((t) => t.erro !== null).length;
      console.log('[hc-autopull]', 'background ok', {
        rodadoEm: r.rodadoEm,
        totalNovos,
        totalErros,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log('[hc-autopull]', 'background erro', msg);
    }
  });
}

// Registra a task de background no WorkManager. No-op silencioso quando as
// libs nativas estao ausentes (gate de build). Idempotente: registrar duas
// vezes e' tolerado pelo expo-background-task. Chamado pelo wiring em
// _layout quando o toggle hcAutopullBackground esta ON.
export async function registrarHCAutopullBackground(): Promise<void> {
  const taskManager = carregarTaskManager();
  const backgroundTask = carregarBackgroundTask();
  if (!taskManager || !backgroundTask) {
    console.log(
      '[hc-autopull]',
      'background indisponivel (lib nativa ausente; exige rebuild)'
    );
    return;
  }
  definirTask(taskManager);
  try {
    await backgroundTask.registerTaskAsync(HC_AUTOPULL_BACKGROUND_TASK, {
      minimumInterval: INTERVALO_MINIMO_S,
    });
    console.log('[hc-autopull]', 'background registrado');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log('[hc-autopull]', 'background registro falhou', msg);
  }
}

// Desregistra a task de background. No-op silencioso sem lib nativa ou quando
// a task nunca chegou a ser registrada. Chamado pelo wiring quando o toggle
// vai para OFF.
export async function desregistrarHCAutopullBackground(): Promise<void> {
  const taskManager = carregarTaskManager();
  const backgroundTask = carregarBackgroundTask();
  if (!taskManager || !backgroundTask) return;
  try {
    const registrada = await taskManager.isTaskRegisteredAsync(
      HC_AUTOPULL_BACKGROUND_TASK
    );
    if (!registrada) return;
    await backgroundTask.unregisterTaskAsync(HC_AUTOPULL_BACKGROUND_TASK);
    console.log('[hc-autopull]', 'background desregistrado');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log('[hc-autopull]', 'background desregistro falhou', msg);
  }
}
