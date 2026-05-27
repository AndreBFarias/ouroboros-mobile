// R-RECAP-6 (2026-05-16) -- export do slide atual do slideshow Memorias
// como PNG + share intent nativo via expo-sharing.
//
// R-RECAP-7 (2026-05-26) -- formato escolhivel antes do share:
//   - 'stories' (default, retrocompat): 1080x1920 (9:16 vertical).
//   - 'quadrado': 1080x1080 (1:1 feed/post).
// O caller passa `formato` em ExportarSlideOpcoes; o tamanho do
// capture e' parametrizado por DIMENSOES_POR_FORMATO.
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

// Formatos de share suportados. 'stories' = 9:16 vertical (Instagram
// Stories / status). 'quadrado' = 1:1 (feed / post). Default 'stories'
// preserva o comportamento do R-RECAP-6 (retrocompat).
export type FormatoShare = 'stories' | 'quadrado';

// Dimensoes alvo do PNG por formato. Forcadas via props width/height
// do captureRef -- independente da resolucao do device. Garante
// consistencia visual em qualquer celular.
const DIMENSOES_POR_FORMATO: Record<
  FormatoShare,
  { largura: number; altura: number }
> = {
  stories: { largura: 1080, altura: 1920 },
  quadrado: { largura: 1080, altura: 1080 },
};

// Formato default quando o caller nao especifica (retrocompat
// R-RECAP-6). Mantem stories como antes.
const FORMATO_DEFAULT: FormatoShare = 'stories';

export interface ExportarSlideOpcoes {
  // Ref do componente capturavel (View wrapper com dimensoes alvo
  // posicionado fora da viewport ou o slide visivel).
  slideRef: { current: unknown };
  // Id do slide (abertura, numeros, vitorias, midias, crises,
  // encerramento). Usado no nome do arquivo para debug.
  slideId: string;
  // Formato do PNG exportado. Default 'stories' (1080x1920). Quando
  // 'quadrado', captura 1080x1080. Opcional para retrocompat.
  formato?: FormatoShare;
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

// Captura o slide atual como PNG no formato escolhido (default
// 'stories' 1080x1920; 'quadrado' 1080x1080). Em web (release),
// devolve { uri: null, motivo: 'web' } -- caller exibe toast
// "Compartilhamento indisponivel."
//
// Em mobile, chama captureRef com width/height forcados conforme o
// formato, salva o arquivo em
// cacheDirectory/recap-share-<id>-<formato>-<ts>.png e devolve a
// URI. O formato entra no nome para debug e para evitar colisao
// quando o usuario exporta os dois formatos do mesmo slide no mesmo
// timestamp. PNG fica ate o share sheet fechar; cleanup opcional via
// removerSlidePngTemp para o caller decidir quando deletar (apos
// shareAsync resolver, em pratica).
export async function exportarSlideMemorias(
  opcoes: ExportarSlideOpcoes
): Promise<ExportarSlideResultado> {
  if (Platform.OS === 'web') {
    return { uri: null, motivo: 'web' };
  }

  const ts = opcoes.timestamp ?? Date.now();
  const formato = opcoes.formato ?? FORMATO_DEFAULT;
  const { largura, altura } = DIMENSOES_POR_FORMATO[formato];
  const cache = FileSystem.cacheDirectory;
  if (!cache) {
    return { uri: null, motivo: 'erro' };
  }
  const destino = `${cache}recap-share-${opcoes.slideId}-${formato}-${ts}.png`;

  try {
    const capturado = await captureRef(opcoes.slideRef, {
      format: 'png',
      quality: 1,
      width: largura,
      height: altura,
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
// dimensao. RECAP_SHARE_LARGURA/ALTURA preservam o nome R-RECAP-6
// (formato stories 9:16) por retrocompat com testes existentes.
export const RECAP_SHARE_LARGURA = DIMENSOES_POR_FORMATO.stories.largura;
export const RECAP_SHARE_ALTURA = DIMENSOES_POR_FORMATO.stories.altura;

// R-RECAP-7: dimensoes do formato quadrado (1:1 feed/post).
export const RECAP_SHARE_QUADRADO_LARGURA =
  DIMENSOES_POR_FORMATO.quadrado.largura;
export const RECAP_SHARE_QUADRADO_ALTURA =
  DIMENSOES_POR_FORMATO.quadrado.altura;

// R-RECAP-7: lookup de dimensoes por formato. Util para a UI
// posicionar o container capturavel com o aspect ratio correto e
// para asserts de teste sem reimplementar o mapa.
export function dimensoesShare(formato: FormatoShare): {
  largura: number;
  altura: number;
} {
  return DIMENSOES_POR_FORMATO[formato];
}
