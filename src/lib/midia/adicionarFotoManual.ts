// Helper de adicao manual de foto a galeria (M11.1 §2.1).
//
// Em mobile real (Platform.OS !== 'web'): pede permissao da galeria
// e abre expo-image-picker; copia o asset selecionado para
// media/fotos/<YYYY-MM-DD>-<rand>.jpg dentro do Vault. A leitura
// subsequente em useFotosAgregadas (lerGaleriaManual) detecta o
// arquivo novo na proxima chamada de recarregar().
//
// Em web/dev (MODO_DEV_WEB): delega ao __gauntlet.adicionarFotoMock
// que insere uma entrada in-memory no useGaleriaMock; o hook
// useFotosAgregadas mescla por cima. Sem contato com expo-image-picker
// (que nao funciona em RN-Web).
//
// Em web release (sem __DEV__): no-op silencioso para nao chamar
// expo-image-picker em ambiente sem suporte.
//
// T1B3 (2026-05-15): adicionarFotoManualDetalhado retorna discriminator
// para callers futuros distinguirem permissao negada de cancel/erro.
// adicionarFotoManual (legado) continua devolvendo boolean (apenas
// 'true' significa foto efetivamente adicionada). Quando um caller for
// adicionado em sprint futura, deve consumir a versao detalhada e
// mostrar toast 'Sem permissão de galeria.' em caso de permissao_negada.
//
// M-GAUNTLET-DEAD-CODE-V2: import direto de useGaleriaMock vazaria a
// string no bundle Android release. Substituido por require lazy
// guardado por __DEV__ (Babel/Metro DCE elimina o branch em release).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useVault } from '@/lib/stores/vault';
import { fotoPath } from '@/lib/vault/paths';
import { MODO_DEV_WEB } from '@/lib/dev/gauntletAtivo';

declare const __DEV__: boolean;

// Sufixo aleatorio curto (4 chars hex) para deduplicar dentro do
// mesmo dia. Mesma politica do MidiaFotoTab M07.x.
function suffixCurto(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
}

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// T1B3: resultado discriminado para callers que precisam distinguir
// causa da falha (permissao negada vs cancel vs erro de copia vs
// vault ausente vs web release no-op).
export type AdicionarFotoResult =
  | { ok: true }
  | {
      ok: false;
      razao: 'sem_vault' | 'permissao_negada' | 'cancelado' | 'erro' | 'no_op';
    };

// Versao detalhada: callers futuros devem consumir esta e mostrar
// toast 'Sem permissão de galeria.' quando razao === 'permissao_negada'.
export async function adicionarFotoManualDetalhado(): Promise<AdicionarFotoResult> {
  // Em web/dev, delega ao gauntlet (sem chamar expo-image-picker).
  // M-GAUNTLET-DEAD-CODE-V2: __DEV__ como guard top-level e pre-requisito
  // para Metro DCE eliminar o branch em release. Combinado com if MODO_
  // DEV_WEB interno, o branch so executa em web dev (e Platform.OS guard
  // implicito de MODO_DEV_WEB previne mobile dev).
  if (__DEV__) {
    if (MODO_DEV_WEB) {
      const ts = Date.now();
      const data = new Date(ts).toISOString().slice(0, 10);
      const slug = `mock-${ts}`;
      const galeria =
        require('@/lib/dev/galeriaMock') as typeof import('@/lib/dev/galeriaMock');
      galeria.useGaleriaMock.getState().adicionar({
        uri: `web://mock/foto-${ts}.jpg`,
        data,
        origemPath: `jpg/foto-${data}-mock-${ts}.jpg`,
        origemSlug: slug,
      });
      return { ok: true };
    }
  }
  // Em web release sem __DEV__, nao tentamos nada.
  if (Platform.OS === 'web') {
    return { ok: false, razao: 'no_op' };
  }
  // Mobile real (Android/iOS) -- expo-image-picker.
  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) return { ok: false, razao: 'sem_vault' };
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, razao: 'permissao_negada' };
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) {
      return { ok: false, razao: 'cancelado' };
    }
    const origem = result.assets[0].uri;
    // H2: derive ext do origem (jpg ou png); fallback jpg.
    const extDetectada = origem.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const relPath = fotoPath(new Date(), suffixCurto(), extDetectada);
    const destino = joinUri(vaultRoot, relPath);
    await FileSystem.copyAsync({ from: origem, to: destino });
    return { ok: true };
  } catch {
    return { ok: false, razao: 'erro' };
  }
}

// Resultado: true quando uma foto foi efetivamente adicionada (caller
// dispara recarregar). false quando cancelado/erro/no-op. Legado para
// callers existentes (testes); delega ao detalhado.
export async function adicionarFotoManual(): Promise<boolean> {
  const detalhe = await adicionarFotoManualDetalhado();
  return detalhe.ok;
}
