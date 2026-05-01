// Bridge JS -> Kotlin do widget homescreen (M20). Module nativo
// vive em modules/widget-homescreen/android/. No web ou em ambiente
// sem expo-modules, todas as funcoes sao no-op silenciosos para
// preservar smoke do Chrome (ADR-0007 zero rede + Nivel A).
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

interface NativeModuleShape {
  atualizarWidget(jsonString: string): Promise<boolean>;
  desativarWidget(): Promise<boolean>;
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

const _default = { atualizarWidget, desativarWidget };
export default _default;
