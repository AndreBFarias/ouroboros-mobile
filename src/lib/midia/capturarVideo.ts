// M34: helper de captura de video via expo-image-picker (galeria por
// default; origem='camera' alterna para launchCameraAsync com
// mediaTypes 'videos'). Copia para media/videos/<YYYY-MM-DD-rand>.mp4
// e escreve .md companion preliminar.
//
// Comportamento por ambiente:
//   - mobile real: pede permissao, abre picker de video, copia binario,
//     grava companion. Cancel/erro silenciam.
//   - web: no-op. Validacao web fica para o Gauntlet (sem captura).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { mediaVideosPath } from '@/lib/vault/paths';
import type { Para } from '@/lib/schemas/para';
import { stringifyCompanionMidia } from '@/lib/midia/companion';
import type { OrigemCaptura } from '@/lib/midia/capturarFoto';

export interface CapturarVideoOpcoes {
  origem?: OrigemCaptura;
  para?: Para;
  legenda?: string;
}

export interface CapturarVideoResultado {
  ok: boolean;
  arquivo: string | null;
  companion: string | null;
}

function suffixCurto(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
}

function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

export async function capturarVideo(
  opcoes: CapturarVideoOpcoes = {}
): Promise<CapturarVideoResultado> {
  const para: Para = opcoes.para ?? { tipo: 'mim' };
  const origem: OrigemCaptura = opcoes.origem ?? 'galeria';
  const legenda = opcoes.legenda;

  if (Platform.OS === 'web') {
    return { ok: false, arquivo: null, companion: null };
  }

  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) {
    return { ok: false, arquivo: null, companion: null };
  }

  try {
    if (origem === 'camera') {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) {
        return { ok: false, arquivo: null, companion: null };
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) {
        return { ok: false, arquivo: null, companion: null };
      }
      return await gravar(vaultRoot, result.assets[0].uri, para, legenda);
    }

    const galPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!galPerm.granted) {
      return { ok: false, arquivo: null, companion: null };
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) {
      return { ok: false, arquivo: null, companion: null };
    }
    return await gravar(vaultRoot, result.assets[0].uri, para, legenda);
  } catch {
    return { ok: false, arquivo: null, companion: null };
  }
}

async function gravar(
  vaultRoot: string,
  origemUri: string,
  para: Para,
  legenda: string | undefined
): Promise<CapturarVideoResultado> {
  const agora = new Date();
  const relBin = mediaVideosPath(agora, suffixCurto());
  const relCompanion = relBin.replace(/\.mp4$/i, '.md');
  const destinoBin = joinUri(vaultRoot, relBin);
  const destinoCompanion = joinUri(vaultRoot, relCompanion);

  await FileSystem.copyAsync({ from: origemUri, to: destinoBin });

  const autor = usePessoa.getState().pessoaAtiva;
  const basename = relBin.split('/').pop() ?? relBin;
  const conteudo = stringifyCompanionMidia({
    tipo: 'midia_video',
    arquivo: basename,
    data: agora.toISOString(),
    autor,
    para,
    legenda,
  });
  await FileSystem.writeAsStringAsync(destinoCompanion, conteudo);

  return { ok: true, arquivo: relBin, companion: relCompanion };
}
