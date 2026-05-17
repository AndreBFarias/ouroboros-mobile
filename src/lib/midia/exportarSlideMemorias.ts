// R-RECAP-6 (2026-05-16) -- export do slide atual do slideshow Memorias
// como PNG 1080x1920 (formato Instagram Stories) + share intent
// nativo via expo-sharing.
//
// Funcao pura, testavel. Recebe ref do componente capturavel +
// metadados do slide, devolve URI do PNG temporario (cacheDirectory)
// e dispara o share sheet do Android.
//
// Filosofia (ADR-0005): export efemero. Nao persiste no Vault. PNG
// vive em cache/recap-share-<ts>.png ate o usuario fechar o share
// sheet; cleanup explicito via removerSlidePngTemp.
//
// Comentarios sem acento (convencao shell/CI).
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// Dimensoes alvo do PNG. Formato Instagram Stories (9:16 vertical
// portrait). Forcadas via props width/height do captureRef --
// independente da resolucao do device. Garante consistencia visual
// em qualquer celular.
const LARGURA_ALVO = 1080;
const ALTURA_ALVO = 1920;

export interface ExportarSlideOpcoes {
  // Ref do componente capturavel (View wrapper com dimensoes 1080x1920
  // posicionado fora da viewport ou o slide visivel).
  slideRef: { current: unknown };
  // Id do slide (abertura, numeros, vitorias, midias, crises,
  // encerramento). Usado no nome do arquivo para debug.
  slideId: string;
  // Timestamp opcional para o nome do arquivo. Default: Date.now().
  // Test override para determinismo.
  timestamp?: number;
}

export interface ExportarSlideResultado {
  // URI absoluta do PNG em cacheDirectory. null em web release ou erro
  // de captura. Caller usa para Sharing.shareAsync.
  uri: string | null;
  // Motivo do null. 'web' = ambiente sem captura nativa.
  // 'erro' = falha de captureRef ou write.
  // null se ok.
  motivo: 'web' | 'erro' | null;
}

// Captura o slide atual como PNG 1080x1920. Em web (release),
// devolve { uri: null, motivo: 'web' } -- caller exibe toast
// "Compartilhamento indisponivel."
//
// Em mobile, chama captureRef com width/height forcados, salva o
// arquivo em cacheDirectory/recap-share-<id>-<ts>.png e devolve a
// URI. PNG fica ate o share sheet fechar; cleanup opcional via
// removerSlidePngTemp para o caller decidir quando deletar (apos
// shareAsync resolver, em pratica).
export async function exportarSlideMemorias(
  opcoes: ExportarSlideOpcoes
): Promise<ExportarSlideResultado> {
  if (Platform.OS === 'web') {
    return { uri: null, motivo: 'web' };
  }

  const ts = opcoes.timestamp ?? Date.now();
  const cache = FileSystem.cacheDirectory;
  if (!cache) {
    return { uri: null, motivo: 'erro' };
  }
  const destino = `${cache}recap-share-${opcoes.slideId}-${ts}.png`;

  try {
    const capturado = await captureRef(opcoes.slideRef, {
      format: 'png',
      quality: 1,
      width: LARGURA_ALVO,
      height: ALTURA_ALVO,
      result: 'tmpfile',
    });
    // captureRef devolve URI temporaria do nativo. Move para nosso
    // path deterministico em cache/ via copyAsync + delete origem
    // (best-effort). Se copy falhar, devolve a URI do tmpfile direto.
    try {
      await FileSystem.copyAsync({ from: capturado, to: destino });
      // Best-effort delete do tmpfile original. Falha aqui nao impede
      // o share.
      await FileSystem.deleteAsync(capturado, { idempotent: true }).catch(
        () => undefined
      );
      return { uri: destino, motivo: null };
    } catch {
      // Falha de copy: devolve a URI tmpfile direto. Funciona com
      // shareAsync sem garantia de cleanup pelo caller.
      return { uri: capturado, motivo: null };
    }
  } catch {
    // Falha de captureRef: view nao mountada, ref invalida ou erro
    // nativo. Caller exibe toast de erro.
    return { uri: null, motivo: 'erro' };
  }
}

// Dispara share intent nativo do Android. Em web (release) ou se
// expo-sharing indisponivel, devolve false (caller exibe toast).
//
// Separado de exportarSlideMemorias para testabilidade independente
// e para o caller ter controle granular (pausar slide -> capturar
// -> share -> retomar).
export async function compartilharSlidePng(uri: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const disponivel = await Sharing.isAvailableAsync();
    if (!disponivel) return false;
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Compartilhar',
    });
    return true;
  } catch {
    // Usuario cancelou o sheet, ou intent falhou. Best-effort: false.
    return false;
  }
}

// Cleanup do PNG temporario. Best-effort: ignora erro de delete
// (arquivo pode ja ter sido removido pelo OS, ou nunca ter existido).
export async function removerSlidePngTemp(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort.
  }
}

// Constantes exportadas para inspecao em testes / asserts de
// dimensao. Nao alterar sem revisar Instagram Stories specs (9:16).
export const RECAP_SHARE_LARGURA = LARGURA_ALVO;
export const RECAP_SHARE_ALTURA = ALTURA_ALVO;
