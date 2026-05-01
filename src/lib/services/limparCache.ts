// Limpa cache local: deleta exports antigos do exportarVault e
// arquivos temporarios em <cacheDir>. Spec M15 secao 5.6: botao
// "Limpar cache local" mostra toast "Cache limpo." apos sucesso.
//
// Estrategia conservadora:
//   - So apaga `ouroboros-export-*.zip` em cacheDirectory (nao toca
//     em arquivos de outras libs no mesmo cache).
//   - Idempotente: ausencia de arquivos retorna 0 sem erro.
//   - Web: no-op (cacheDirectory nao se aplica).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface LimparCacheResultado {
  arquivosRemovidos: number;
  motivo?: string;
}

// Remove ouroboros-export-*.zip de cacheDirectory. Retorna contagem.
export async function limparCache(): Promise<LimparCacheResultado> {
  if (Platform.OS === 'web') {
    return { arquivosRemovidos: 0, motivo: 'Cache não se aplica em web.' };
  }
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return { arquivosRemovidos: 0, motivo: 'cacheDirectory ausente.' };
  }
  let arquivosRemovidos = 0;
  try {
    const filhos = await FileSystem.readDirectoryAsync(cacheDir);
    for (const filho of filhos) {
      if (!filho.startsWith('ouroboros-export-')) continue;
      if (!filho.endsWith('.zip')) continue;
      try {
        await FileSystem.deleteAsync(`${cacheDir}${filho}`, {
          idempotent: true,
        });
        arquivosRemovidos += 1;
      } catch {
        // Falha individual nao aborta a limpeza.
      }
    }
  } catch {
    return {
      arquivosRemovidos,
      motivo: 'Falha ao listar cache.',
    };
  }
  return { arquivosRemovidos };
}
