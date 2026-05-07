// M34 / I-FOTO (M-SAVE-FOTO-VALIDA, 2026-05-07): helper de captura de
// foto via expo-image-picker. Copia o asset selecionado para
// <ext>/foto-YYYY-MM-DD-<rand4>.<ext> dentro do Vault e escreve um
// .md companion em markdown/foto-YYYY-MM-DD-<rand4>.md (layout-por-tipo
// H2 / ADR-0023). Caminhos relativos ao Vault sao concatenados via
// vaultUriJoin (canonico H1) — elimina trailing whitespace, %20
// ofensivo e barras duplas em URIs SAF (causa raiz parcial dos saves
// silenciosos no APK alpha em OEMs MIUI/OneUI/HyperOS).
//
// I-FOTO (2026-05-07): saiu do helper compartilhado
// escreverMidiaComCompanion (que usa joinUri local, sem H1) e agora
// aplica vaultUriJoin direto, no padrao do salvarFrase (I-FRASE),
// saveEvento (I-EVENTO) e capturarVideo (I-VIDEO). Comportamento
// observavel:
//   - vaultRoot vazio -> throw com mensagem clara (caller exibe toast
//     'Vault não conectado.'). Antes silenciava com ok=false e o
//     usuario nao entendia o porque.
//   - cancel/permissao negada/web/erro de copy -> ok=false (no-op).
//   - sucesso -> ok=true + paths relativos canonicos.
//   - jpg/jpeg vai para jpg/<basename>.jpg; png vai para png/<basename>.png.
//     Detectado via mimeType retornado pelo picker; fallback por
//     extensao do URI; default jpg para casos ambiguos.
//
// Comportamento por ambiente:
//   - mobile real: pede permissao, abre picker, copia binario, grava
//     companion.
//   - web/dev (MODO_DEV_WEB): delega ao __gauntlet.adicionarFotoMock
//     para manter o ciclo deterministico do gauntlet sem tocar APIs
//     nativas.
//   - web release (sem __DEV__): no-op silencioso.
//
// Companion .md (M34 §4 / ADR-0017):
//   ---
//   tipo: midia_foto
//   arquivo: <basename>
//   data: <iso>
//   autor: <pessoa>
//   para: <Para discriminado>
//   legenda: <opcional>
//   ---
//
// Comentarios sem acento (convencao shell/CI).
// M-GAUNTLET-DEAD-CODE-V2: imports diretos de gauntlet/galeriaMock
// vazariam no bundle release. MODO_DEV_WEB vem do micro-modulo
// gauntletAtivo (zero strings markers); useGaleriaMock entra via
// require lazy guardado por __DEV__ apenas no branch dev web.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { MODO_DEV_WEB } from '@/lib/dev/gauntletAtivo';
import type { Para } from '@/lib/schemas/para';
import { stringifyCompanionMidia } from '@/lib/midia/companion';
import {
  fotoPath,
  fotoCompanionPath,
} from '@/lib/vault/paths';
import { vaultUriJoin } from '@/lib/vault';

declare const __DEV__: boolean;

export type OrigemCaptura = 'galeria' | 'camera';

export interface CapturarFotoOpcoes {
  // Origem: 'galeria' (default, expo-image-picker.launchImageLibrary)
  // ou 'camera' (expo-image-picker.launchCameraAsync).
  origem?: OrigemCaptura;
  // Destinatario emocional do registro. Default { tipo: 'mim' }.
  para?: Para;
  // Legenda opcional digitada pelo usuario antes da captura.
  legenda?: string;
}

export interface CapturarFotoResultado {
  ok: boolean;
  // Path relativo do binario gravado (jpg/foto-... ou png/foto-...).
  // null em cancel / erro / no-op web release.
  arquivo: string | null;
  // Path relativo do companion .md gravado em markdown/. null se foto
  // nao foi gravada (cancel/erro) ou se o caminho gauntlet pulou
  // companion.
  companion: string | null;
}

// Sufixo random curto (4 hex). Espelha o usado em capturarVideo e
// escreverMidiaComCompanion para coerencia de basename.
function suffixCurto(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
}

// Detecta extensao final (jpg ou png) a partir do mimeType retornado
// pelo expo-image-picker, com fallback para extensao do URI. jpg
// cobre image/jpeg + image/jpg; png cobre image/png. Outros tipos
// caem em jpg conservador (a maioria das galerias mobile produz
// jpeg). Sempre lowercase, sem ponto.
function detectarExt(
  uri: string,
  mimeType: string | null | undefined
): 'jpg' | 'png' {
  const m = (mimeType ?? '').toLowerCase();
  if (m === 'image/png') return 'png';
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  // Fallback: ultima parte do path.
  const ult = uri.split('?')[0].split('#')[0].split('/').pop() ?? '';
  const idx = ult.lastIndexOf('.');
  if (idx !== -1 && idx < ult.length - 1) {
    const e = ult.slice(idx + 1).toLowerCase();
    if (e === 'png') return 'png';
    if (e === 'jpg' || e === 'jpeg') return 'jpg';
  }
  return 'jpg';
}

export async function capturarFoto(
  opcoes: CapturarFotoOpcoes = {}
): Promise<CapturarFotoResultado> {
  const para: Para = opcoes.para ?? { tipo: 'mim' };
  const origem: OrigemCaptura = opcoes.origem ?? 'galeria';
  const legenda = opcoes.legenda;

  // Caminho gauntlet: marca entrada na galeria mock para a UI refletir.
  // Companion nao e' escrito (web nao tem vault real). Caller pode
  // checar resultado.companion === null para entender que foi mock.
  // M-GAUNTLET-DEAD-CODE-V2: __DEV__ como guard top-level para Metro DCE.
  if (__DEV__) {
    if (MODO_DEV_WEB) {
      const ts = Date.now();
      const data = new Date(ts).toISOString().slice(0, 10);
      const slug = `mock-${ts}`;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const galeria = require('@/lib/dev/galeriaMock') as typeof import('@/lib/dev/galeriaMock');
      galeria.useGaleriaMock.getState().adicionar({
        uri: `web://mock/foto-${ts}.jpg`,
        data,
        origemPath: `jpg/foto-${data}-mock.jpg`,
        origemSlug: slug,
      });
      return { ok: true, arquivo: `jpg/foto-${data}-mock.jpg`, companion: null };
    }
  }

  if (Platform.OS === 'web') {
    return { ok: false, arquivo: null, companion: null };
  }

  const vaultRoot = useVault.getState().vaultRoot;
  // I-FOTO: throw em vez de silenciar. Caller (MenuCapturaVerde)
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
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) {
      return { ok: false, arquivo: null, companion: null };
    }
    const asset = result.assets[0];
    return await gravar(vaultRoot, asset.uri, asset.mimeType ?? null, para, legenda);
  }

  const galPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!galPerm.granted) {
    return { ok: false, arquivo: null, companion: null };
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.8,
  });
  if (result.canceled || result.assets.length === 0) {
    return { ok: false, arquivo: null, companion: null };
  }
  const asset = result.assets[0];
  return await gravar(vaultRoot, asset.uri, asset.mimeType ?? null, para, legenda);
}

async function gravar(
  vaultRoot: string,
  origemUri: string,
  mimeType: string | null,
  para: Para,
  legenda: string | undefined
): Promise<CapturarFotoResultado> {
  // I-FOTO: writer inline com vaultUriJoin canonico. Espelha o
  // padrao adotado em capturarVideo (I-VIDEO), salvarFrase (I-FRASE)
  // e saveEvento (I-EVENTO). Decisao de saida do helper
  // escreverMidiaComCompanion: ele usa joinUri local (sem
  // normalizacao H1). Migrar o helper afetaria audio/scanner — fora
  // do escopo desta sprint. capturarFoto segue caminho proprio com
  // vaultUriJoin direto.
  try {
    const agora = new Date();
    const rand = suffixCurto();
    const ext = detectarExt(origemUri, mimeType);
    const binarioRel = fotoPath(agora, rand, ext);
    const companionRel = fotoCompanionPath(agora, rand);
    const destinoBin = vaultUriJoin(vaultRoot, binarioRel);
    const destinoCompanion = vaultUriJoin(vaultRoot, companionRel);

    const autor = usePessoa.getState().pessoaAtiva;
    const basename = (binarioRel.split('/').pop() ?? binarioRel);

    await FileSystem.copyAsync({ from: origemUri, to: destinoBin });

    const conteudo = stringifyCompanionMidia({
      tipo: 'midia_foto',
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
  } catch {
    // Erro de copy/write em runtime nativo: silencia em ok=false
    // (caller decide o que mostrar). Throw fica reservado a vault
    // ausente (estado claramente invalido vs falha transiente de IO).
    return { ok: false, arquivo: null, companion: null };
  }
}
