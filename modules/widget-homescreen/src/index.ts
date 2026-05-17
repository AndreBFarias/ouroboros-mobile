// Bridge JS -> Kotlin do widget homescreen (M20 + R-WIDG-1). Module
// nativo vive em modules/widget-homescreen/android/. No web ou em
// ambiente sem expo-modules, todas as funcoes sao no-op silenciosos para
// preservar smoke do Chrome (ADR-0007 zero rede + Nivel A).
//
// R-WIDG-1 (2026-05-17): adicionado widget Quick To-do 4x2 com
// EditText + botao "+" + count de pendentes. Fluxo:
//   1. Usuario digita texto no widget e tapa "+".
//   2. WidgetProvider grava entry em cacheDir/widget-todo-queue.json.
//   3. Quando o app abre (boot hook) ou app esta em foreground, JS
//      chama drenarFilaTodoWidget() que le a queue, cria Tarefa real
//      via criarTarefa() e zera a queue.
//   4. App periodicamente atualiza count via atualizarCountTodoWidget()
//      gravando cacheDir/widget-todo-count.json + dispara refresh do
//      provider para renderizar count atualizado.
//
// Comentarios sem acentuacao (convencao shell/CI).
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

// Forma serializada que o Kotlin espera. Strings simples + arrays de
// numero. JSON puro: sem Date, sem refs.
export interface WidgetData {
  ativo: boolean;
  avatarLetra: string;
  avatarCor?: string;
  humor: number | null;
  frase?: string | null;
  // 7 entradas (D-6 ... D-0). 0 = sem registro; 1..5 = humor medio
  // do dia. Maior que 7 e ignorado pelo provider Kotlin.
  heatmap: number[];
}

// R-WIDG-1: entry enfileirada pelo widget quando o usuario tapa "+".
// Persistida em cacheDir/widget-todo-queue.json (array). A JS drena
// e cria Tarefa no Vault na proxima abertura (boot hook) ou em
// foreground (NavigatorListener).
export interface WidgetTodoEntry {
  titulo: string;
  criadoEmMs: number;
}

interface NativeModuleShape {
  atualizarWidget(jsonString: string): Promise<boolean>;
  desativarWidget(): Promise<boolean>;
  // R-WIDG-1:
  atualizarCountTodo(count: number): Promise<boolean>;
  lerFilaTodo(): Promise<string>;
  limparFilaTodo(): Promise<boolean>;
}

function getNative(): NativeModuleShape | null {
  if (Platform.OS !== 'android') return null;
  // Module pode estar ausente em Expo Go (sem prebuild).
  // requireOptionalNativeModule devolve null em vez de lancar.
  return requireOptionalNativeModule<NativeModuleShape>('WidgetHomescreen');
}

export async function atualizarWidget(data: WidgetData): Promise<void> {
  const native = getNative();
  if (!native) return;
  try {
    await native.atualizarWidget(JSON.stringify(data));
  } catch {
    // Falha do widget nao deve quebrar fluxo do app.
  }
}

export async function desativarWidget(): Promise<void> {
  const native = getNative();
  if (!native) return;
  try {
    await native.desativarWidget();
  } catch {
    // idem.
  }
}

// R-WIDG-1: regrava cacheDir/widget-todo-count.json com o count atual
// de tarefas pendentes e dispara refresh do TodoWidgetProvider. Quando
// o widget nao esta instalado, e no-op (mgr.getAppWidgetIds devolve
// array vazio no provider Kotlin). Em web no-op.
export async function atualizarCountTodoWidget(count: number): Promise<void> {
  const native = getNative();
  if (!native) return;
  try {
    await native.atualizarCountTodo(count);
  } catch {
    // Falha do widget nao deve quebrar fluxo do app.
  }
}

// R-WIDG-1: le fila de entries enfileiradas pelo widget. Devolve
// array vazio se queue inexistente ou malformada. Sem efeito colateral:
// chamadores que processarem entries devem chamar limparFilaTodoWidget()
// explicitamente quando todas tiverem virado Tarefa real.
export async function lerFilaTodoWidget(): Promise<WidgetTodoEntry[]> {
  const native = getNative();
  if (!native) return [];
  try {
    const raw = await native.lerFilaTodo();
    if (!raw || raw === '[]') return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is WidgetTodoEntry =>
          typeof x === 'object' &&
          x !== null &&
          typeof (x as WidgetTodoEntry).titulo === 'string' &&
          typeof (x as WidgetTodoEntry).criadoEmMs === 'number'
      )
      .map((e) => ({
        titulo: e.titulo.trim().slice(0, 200),
        criadoEmMs: e.criadoEmMs,
      }))
      .filter((e) => e.titulo.length > 0);
  } catch {
    return [];
  }
}

// R-WIDG-1: zera o arquivo de fila. Chamado pelo drain depois de
// processar as entries. Idempotente.
export async function limparFilaTodoWidget(): Promise<void> {
  const native = getNative();
  if (!native) return;
  try {
    await native.limparFilaTodo();
  } catch {
    // idem.
  }
}

const _default = {
  atualizarWidget,
  desativarWidget,
  atualizarCountTodoWidget,
  lerFilaTodoWidget,
  limparFilaTodoWidget,
};
export default _default;
