// M34 / I-VIDEO (M-SAVE-VIDEO-VALIDA, 2026-05-07): helper de captura
// de video via expo-image-picker (galeria por default; origem='camera'
// alterna para launchCameraAsync com mediaTypes 'videos'). Copia
// binario para mp4/video-YYYY-MM-DD-<rand4>.mp4 e escreve companion
// .md em markdown/video-YYYY-MM-DD-<rand4>.md (layout-por-tipo H2 /
// ADR-0023). Caminhos relativos ao Vault sao concatenados via
// vaultUriJoin (canonico H1) — elimina trailing whitespace, %20
// ofensivo e barras duplas em URIs SAF (causa raiz parcial dos saves
// silenciosos no APK alpha em OEMs MIUI/OneUI/HyperOS).
//
// I-VIDEO (2026-05-07): saiu do helper compartilhado
// escreverMidiaComCompanion (que usa joinUri local) e agora aplica
// vaultUriJoin direto, no padrao do salvarFrase (I-FRASE) e
// saveEvento (I-EVENTO). Comportamento observavel:
//   - vaultRoot vazio -> throw com mensagem clara (caller exibe toast
//     'Vault não conectado.'). Antes silenciava com ok=false e o
//     usuario nao entendia o porque.
//   - cancel/permissao negada/web -> ok=false (no-op silencioso).
//   - sucesso -> ok=true + paths relativos canonicos.
//
// Comportamento por ambiente:
//   - mobile real: pede permissao, abre picker de video, copia binario,
//     grava companion.
//   - web: no-op (retorna ok=false). Validacao web fica para o
//     Gauntlet (sem captura nativa).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import type { Para } from '@/lib/schemas/para';
import { stringifyCompanionMidia } from '@/lib/midia/companion';
import { videoPath, videoCompanionPath } from '@/lib/vault/paths';
import { vaultUriJoin } from '@/lib/vault';
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

// Sufixo random curto (4 hex). Espelha o usado em capturarFoto e
// escreverMidiaComCompanion para coerencia de basename.
function suffixCurto(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
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
  // I-VIDEO: throw em vez de silenciar. Caller (MenuCapturaVerde)
  // captura via try/catch e exibe toast PT-BR explicito ao usuario.
  if (!vaultRoot) {
    throw new Error('Vault não conectado.');
  }

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
}

async function gravar(
  vaultRoot: string,
  origemUri: string,
  para: Para,
  legenda: string | undefined
): Promise<CapturarVideoResultado> {
  // I-VIDEO: writer inline com vaultUriJoin canonico. Espelha o
  // padrao adotado em salvarFrase (I-FRASE) e saveEvento (I-EVENTO).
  // Decisao de saida do helper escreverMidiaComCompanion: ele usa
  // joinUri local (sem normalizacao H1). Migrar o helper afetaria
  // foto/audio/scanner — fora do escopo desta sprint. capturarVideo
  // segue caminho proprio com vaultUriJoin direto.
  const agora = new Date();
  const rand = suffixCurto();
  const binarioRel = videoPath(agora, rand);
  const companionRel = videoCompanionPath(agora, rand);
  const destinoBin = vaultUriJoin(vaultRoot, binarioRel);
  const destinoCompanion = vaultUriJoin(vaultRoot, companionRel);

  const autor = usePessoa.getState().pessoaAtiva;
  const basename = binarioRel.split('/').pop() ?? binarioRel;

  await FileSystem.copyAsync({ from: origemUri, to: destinoBin });

  const conteudo = stringifyCompanionMidia({
    tipo: 'midia_video',
    arquivo: basename,
    data: agora.toISOString(),
    autor,
    para,
    legenda,
  });
  await FileSystem.writeAsStringAsync(destinoCompanion, conteudo);

  return {
    ok: true,
    arquivo: binarioRel,
    companion: companionRel,
  };
}
