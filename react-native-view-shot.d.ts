// R-RECAP-6 (2026-05-16): declaracao minima para react-native-view-shot
// permitir typecheck antes da instalacao via `npm install`. O pacote
// e' nativo (~1.7MB unpacked) e nao roda em testes (mockado em
// jest.setup.cjs). Esta declaracao expoe apenas a API consumida pelo
// app: captureRef com options { format, quality, width, height,
// result }.
//
// Apos `npm install react-native-view-shot@4.0.3`, esta declaracao
// continua valida (o tipo do pacote real e' compativel) -- pode ser
// removida no futuro se desejado, mas e' inocua.
//
// Comentarios sem acento (convencao shell/CI).

declare module 'react-native-view-shot' {
  export interface CaptureOptions {
    format?: 'png' | 'jpg' | 'webm' | 'raw';
    quality?: number;
    width?: number;
    height?: number;
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64';
    snapshotContentContainer?: boolean;
    fileName?: string;
  }

  // Aceita ref ou ReactElement. Devolve URI string (tmpfile) ou base64.
  // Tipo loose -- o pacote real aceita union mais amplo, mas o uso no
  // app passa sempre RefObject com width/height/format.
  export function captureRef(
    view: unknown,
    options?: CaptureOptions
  ): Promise<string>;
}
