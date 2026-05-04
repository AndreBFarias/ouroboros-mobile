// M34: helper de captura de musica/audio via expo-document-picker
// (audio/*). Copia o asset para media/audios/<YYYY-MM-DD-rand>.<ext>
// preservando a extensao original e escreve um .md companion preliminar.
//
// Decisao: nao reaproveitar saveRecordingToVault (M06.5) porque ele
// e' especifico de gravacao live com Audio.Recording -> assets/. Aqui
// o usuario escolhe arquivo ja existente do storage; o destino canonico
// (media/audios/) tambem e diferente.
//
// Comportamento por ambiente:
//   - mobile real: abre DocumentPicker filtrado por audio/*; aceita
//     o asset, copia binario, grava companion. Cancel/erro silenciam.
//   - web: no-op. expo-document-picker em web tem suporte limitado e
//     a sprint reserva validacao web ao Gauntlet (sem captura real).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { mediaAudiosPath } from '@/lib/vault/paths';
import type { Para } from '@/lib/schemas/para';
import { stringifyCompanionMidia } from '@/lib/midia/companion';

export interface CapturarMusicaOpcoes {
  para?: Para;
  legenda?: string;
}

export interface CapturarMusicaResultado {
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

// Extrai a extensao do nome do asset. Default 'm4a' (formato canonico
// do M06.5) quando o picker devolve URI sem extensao detectavel.
function extrairExtensao(name: string | null | undefined): string {
  if (!name) return 'm4a';
  const m = name.match(/\.([a-z0-9]{1,5})$/i);
  return m ? m[1].toLowerCase() : 'm4a';
}

export async function capturarMusica(
  opcoes: CapturarMusicaOpcoes = {}
): Promise<CapturarMusicaResultado> {
  const para: Para = opcoes.para ?? { tipo: 'mim' };
  const legenda = opcoes.legenda;

  if (Platform.OS === 'web') {
    return { ok: false, arquivo: null, companion: null };
  }

  const vaultRoot = useVault.getState().vaultRoot;
  if (!vaultRoot) {
    return { ok: false, arquivo: null, companion: null };
  }

  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) {
      return { ok: false, arquivo: null, companion: null };
    }
    const asset = result.assets?.[0];
    if (!asset) {
      return { ok: false, arquivo: null, companion: null };
    }

    const agora = new Date();
    const ext = extrairExtensao(asset.name);
    // mediaAudiosPath fixa .m4a; para preservar a extensao original
    // trocamos a posfix manualmente.
    const relCanonico = mediaAudiosPath(agora, suffixCurto());
    const relBin = relCanonico.replace(/\.m4a$/i, `.${ext}`);
    const relCompanion = relBin.replace(/\.[a-z0-9]+$/i, '.md');
    const destinoBin = joinUri(vaultRoot, relBin);
    const destinoCompanion = joinUri(vaultRoot, relCompanion);

    await FileSystem.copyAsync({ from: asset.uri, to: destinoBin });

    const autor = usePessoa.getState().pessoaAtiva;
    const basename = relBin.split('/').pop() ?? relBin;
    const conteudo = stringifyCompanionMidia({
      tipo: 'midia_audio',
      arquivo: basename,
      data: agora.toISOString(),
      autor,
      para,
      legenda,
    });
    await FileSystem.writeAsStringAsync(destinoCompanion, conteudo);

    return { ok: true, arquivo: relBin, companion: relCompanion };
  } catch {
    return { ok: false, arquivo: null, companion: null };
  }
}
