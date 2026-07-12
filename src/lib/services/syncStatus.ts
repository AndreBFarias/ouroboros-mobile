// Heuristica de status de sync via mtime da pasta do Vault. Decisão
// M15: independente do método (Syncthing, Obsidian Sync, sem sync),
// olhamos so a ultima modificacao para classificar.
//
// Cores (CONTRACT seção 1.5 + spec M15):
//   - 'verde'    = mtime < 30min atras (atualizado).
//   - 'amarelo'  = entre 30min e 6h.
//   - 'vermelho' = > 6h, OU diretorio não existe, OU conflito
//     detectado em <vault>/.stversions/ (Syncthing).
//
// Heuristica e local: não chama API do Syncthing. Apenas inspeciona
// filesystem. Em web, retorna 'desconhecido' porque expo-file-system
// não acessa filesystem real do desktop.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

export type SyncCor = 'verde' | 'amarelo' | 'vermelho' | 'desconhecido';

export interface SyncStatus {
  cor: SyncCor;
  ultimaModificacao: Date | null;
  conflito: boolean;
  // Path inspecionado (debug). Vazio quando rodando em web ou sem URI.
  alvo: string;
}

const TRINTA_MIN_MS = 30 * 60 * 1000;
const SEIS_HORAS_MS = 6 * 60 * 60 * 1000;

// Calcula cor a partir de delta-ms (separavel para teste).
export function classificar(deltaMs: number): SyncCor {
  if (deltaMs < TRINTA_MIN_MS) return 'verde';
  if (deltaMs < SEIS_HORAS_MS) return 'amarelo';
  return 'vermelho';
}

// Le mtime do diretorio raiz do vault. URI vem do permission helper
// (M02). Se a URI não existe ou não for legivel, retorna vermelho
// com `ultimaModificacao: null`.
export async function verificarSyncStatus(
  vaultUri: string | null
): Promise<SyncStatus> {
  if (Platform.OS === 'web' || !vaultUri) {
    return {
      cor: 'desconhecido',
      ultimaModificacao: null,
      conflito: false,
      alvo: vaultUri ?? '',
    };
  }
  try {
    const info = await FileSystem.getInfoAsync(vaultUri);
    if (!info.exists) {
      return {
        cor: 'vermelho',
        ultimaModificacao: null,
        conflito: false,
        alvo: vaultUri,
      };
    }
    // Se Syncthing tem .stversions/ com arquivos, marca conflito.
    const stversions = `${vaultUri.replace(/\/$/, '')}/.stversions`;
    let conflito = false;
    try {
      const sinfo = await FileSystem.getInfoAsync(stversions);
      if (sinfo.exists && sinfo.isDirectory) {
        const filhos = await FileSystem.readDirectoryAsync(stversions);
        conflito = filhos.length > 0;
      }
    } catch {
      // Sem .stversions, ok.
    }

    const mtimeS =
      typeof (info as { modificationTime?: number }).modificationTime ===
      'number'
        ? (info as { modificationTime: number }).modificationTime
        : null;
    const mtimeMs = mtimeS !== null ? mtimeS * 1000 : null;
    if (mtimeMs === null) {
      return {
        cor: 'vermelho',
        ultimaModificacao: null,
        conflito,
        alvo: vaultUri,
      };
    }
    const delta = Date.now() - mtimeMs;
    const corBase = classificar(delta);
    const cor: SyncCor = conflito ? 'vermelho' : corBase;
    return {
      cor,
      ultimaModificacao: new Date(mtimeMs),
      conflito,
      alvo: vaultUri,
    };
  } catch {
    return {
      cor: 'vermelho',
      ultimaModificacao: null,
      conflito: false,
      alvo: vaultUri,
    };
  }
}

// Texto humano para a UI (sentence case PT-BR). Evita
// "ha X minutos" sem acentuacao por respeitar a regra invariante
// 1.4 do BRIEF.
export function descreverDelta(date: Date | null): string {
  if (!date) return 'Sem registro de sincronização.';
  const delta = Date.now() - date.getTime();
  if (delta < 60 * 1000) return 'Atualizado agora mesmo.';
  if (delta < TRINTA_MIN_MS) {
    const min = Math.floor(delta / (60 * 1000));
    return `Atualizado há ${min} min.`;
  }
  if (delta < SEIS_HORAS_MS) {
    const h = Math.floor(delta / (60 * 60 * 1000));
    return `Atualizado há ${h}h.`;
  }
  const h = Math.floor(delta / (60 * 60 * 1000));
  return `Última atualização há ${h}h.`;
}
