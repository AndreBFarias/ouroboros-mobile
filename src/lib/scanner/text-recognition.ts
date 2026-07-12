// Wrapper sobre @react-native-ml-kit/text-recognition. Roda OCR
// on-device (ADR-0003 zero rede) sobre uma imagem já deskewed.
//
// O ML Kit free não retorna score de confianca por bloco; derivamos
// uma confianca heurística a partir da densidade de texto retornada:
//   confianca = clamp(blocos_com_texto / 6, 0, 1)
// 6 blocos e o piso tipico para um recibo bem capturado. Fica entre
// 0 (nada) e 1 (texto rico). Usado pelo preview para decidir se
// marca 'revisar: true' (threshold < 0.8).
//
// A28 (2026-05-06): require lazy + safe stub. ML Kit é módulo nativo
// (Android Java + iOS bridge); não disponível em Expo Go. Import
// top-level crashava o boot. Stub retorna texto vazio + confianca 0
// em Expo Go; APK preview/release carrega normal.

interface MLKitTextBlock {
  text: string;
}
interface MLKitResult {
  text?: string;
  blocks: ReadonlyArray<MLKitTextBlock>;
}
interface TextRecognitionModule {
  recognize: (uri: string) => Promise<MLKitResult>;
}

function carregarTextRecognition(): TextRecognitionModule | null {
  try {
    const mod = require('@react-native-ml-kit/text-recognition') as {
      default?: TextRecognitionModule;
    };
    return mod.default ?? null;
  } catch {
    return null;
  }
}

export interface OcrResultado {
  texto: string;
  confianca: number;
  // Blocos brutos para o overlay cyan no preview (palavras tocaveis).
  blocos: ReadonlyArray<{ texto: string }>;
}

// Roda o OCR na URI informada. URI deve apontar para arquivo local
// (file://...) salvo previamente pelo modulo nativo do scanner.
// Em caso de erro do ML Kit, repassa a Error original para o caller
// decidir UI de erro. Em Expo Go retorna OcrResultado vazio com
// confianca 0 (caller já trata 'revisar: true' nesse caso).
export async function extrairTexto(uri: string): Promise<OcrResultado> {
  const TextRecognition = carregarTextRecognition();
  if (!TextRecognition) {
    return { texto: '', confianca: 0, blocos: [] };
  }
  const resultado = await TextRecognition.recognize(uri);
  const blocosComTexto = resultado.blocks.filter(
    (b) => typeof b.text === 'string' && b.text.trim().length > 0
  );
  const confiancaBruta = blocosComTexto.length / 6;
  const confianca = Math.max(0, Math.min(1, confiancaBruta));
  const blocos = blocosComTexto.map((b) => ({ texto: b.text }));
  return {
    texto: resultado.text ?? '',
    confianca,
    blocos,
  };
}
