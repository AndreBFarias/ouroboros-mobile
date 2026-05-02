// Wrapper sobre @react-native-ml-kit/text-recognition. Roda OCR
// on-device (ADR-0003 zero rede) sobre uma imagem já deskewed.
//
// O ML Kit free não retorna score de confianca por bloco; derivamos
// uma confianca heurística a partir da densidade de texto retornada:
//   confianca = clamp(blocos_com_texto / 6, 0, 1)
// 6 blocos e o piso tipico para um recibo bem capturado. Fica entre
// 0 (nada) e 1 (texto rico). Usado pelo preview para decidir se
// marca 'revisar: true' (threshold < 0.8).
import TextRecognition from '@react-native-ml-kit/text-recognition';

export interface OcrResultado {
  texto: string;
  confianca: number;
  // Blocos brutos para o overlay cyan no preview (palavras tocaveis).
  blocos: ReadonlyArray<{ texto: string }>;
}

// Roda o OCR na URI informada. URI deve apontar para arquivo local
// (file://...) salvo previamente pelo modulo nativo do scanner.
// Em caso de erro do ML Kit, repassa a Error original para o caller
// decidir UI de erro.
export async function extrairTexto(uri: string): Promise<OcrResultado> {
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
