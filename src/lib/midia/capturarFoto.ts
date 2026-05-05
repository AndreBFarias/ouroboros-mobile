// M34: helper de captura de foto via expo-image-picker (camera ou
// galeria). Copia o asset selecionado para media/fotos/<YYYY-MM-DD-rand>.jpg
// dentro do Vault e escreve um .md companion preliminar com metadata
// minima (M39 ratifica formato canonico via ADR-0017).
//
// Comportamento por ambiente:
//   - mobile real: pede permissao, abre picker (galeria por default;
//     origin='camera' alterna para launchCameraAsync), copia binario,
//     grava companion e devolve true. Cancel/erro silenciam para false.
//   - web/dev (GAUNTLET_ATIVO): delega ao adicionarFotoMock para
//     manter o ciclo determiniscao do gauntlet sem tocar APIs nativas.
//   - web release (sem __DEV__): no-op silencioso.
//
// Companion .md preliminar (M34 §4):
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
import * as ImagePicker from 'expo-image-picker';
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import { MODO_DEV_WEB } from '@/lib/dev/gauntletAtivo';
import type { Para } from '@/lib/schemas/para';
import { escreverMidiaComCompanion } from '@/lib/vault/midiaCompanion';

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
  // Path relativo do binario gravado (media/fotos/...). null em
  // cancel / erro / no-op web release.
  arquivo: string | null;
  // Path relativo do companion .md gravado. null se foto nao foi
  // gravada (cancel/erro) ou se o caminho gauntlet pulou companion.
  companion: string | null;
}

// M39.1: helpers locais suffixCurto/joinUri foram para
// src/lib/vault/midiaCompanion.ts (escreverMidiaComCompanion gere
// basename + path interno).

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
        origemPath: `media/fotos/mock-${ts}.jpg`,
        origemSlug: slug,
      });
      return { ok: true, arquivo: `media/fotos/mock-${ts}.jpg`, companion: null };
    }
  }

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
        mediaTypes: ['images'],
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
      mediaTypes: ['images'],
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
): Promise<CapturarFotoResultado> {
  // M39.1: writer migrado para o helper canonico
  // escreverMidiaComCompanion. Ele encapsula suffixCurto, joinUri,
  // copia binaria, ordem de chaves do .md companion e validacao zod.
  // Comportamento observavel preservado: copy chamado uma vez, write
  // chamado uma vez, paths em media/fotos/<YYYY-MM-DD>-<rand4>.jpg /
  // .md.
  try {
    const agora = new Date();
    const autor = usePessoa.getState().pessoaAtiva;
    const r = await escreverMidiaComCompanion(vaultRoot, origemUri, {
      tipo: 'midia_foto',
      data: agora.toISOString(),
      autor,
      para,
      legenda,
    });
    return {
      ok: true,
      arquivo: r.binarioPath,
      companion: r.companionPath,
    };
  } catch {
    return { ok: false, arquivo: null, companion: null };
  }
}
