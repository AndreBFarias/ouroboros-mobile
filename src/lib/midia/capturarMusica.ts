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
import { useVault } from '@/lib/stores/vault';
import { usePessoa } from '@/lib/stores/pessoa';
import type { Para } from '@/lib/schemas/para';
import { escreverMidiaComCompanion } from '@/lib/vault/midiaCompanion';
import { formatDateYmd } from '@/lib/vault/paths';

export interface CapturarMusicaOpcoes {
  para?: Para;
  legenda?: string;
}

export interface CapturarMusicaResultado {
  ok: boolean;
  arquivo: string | null;
  companion: string | null;
}

// Extrai a extensao do nome do asset. Default 'm4a' (formato canonico
// do M06.5) quando o picker devolve URI sem extensao detectavel.
// M39.1: helpers suffixCurto/joinUri foram para escreverMidiaComCompanion.
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
    // R-CRIT-3 (2026-05-15): basename ganha prefixo canonico `audio-`
    // para que o companion seja detectado pelos listadores agregadores
    // (`listarItensGaleria.inferirTipoDoFilename`, que casa por prefixo
    // de feature). Sem o prefixo, companion nasce em
    // markdown/<YYYY-MM-DD>-<rand>.md e nao casa com `audio-`,
    // `foto-`, `video-`, nem nenhum outro: galeria silencia o item.
    //
    // M39.1: writer migrado para escreverMidiaComCompanion. O helper
    // canonico extrai a extensao do binarioUri, mas como
    // expo-document-picker devolve cache temporario sem extensao
    // confiavel, embutimos no asset URI (sintetico) ou explicitamente
    // via meta.arquivo. O canonico vai re-extrair ext de meta.arquivo
    // via extOf(), entao basename serializa identico.
    const rand = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0');
    const arquivo = `audio-${formatDateYmd(agora)}-${rand}.${ext}`;
    const autor = usePessoa.getState().pessoaAtiva;
    const r = await escreverMidiaComCompanion(vaultRoot, asset.uri, {
      tipo: 'midia_audio',
      arquivo,
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
