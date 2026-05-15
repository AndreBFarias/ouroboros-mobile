// Wrapper sobre launchScanner do @dariyd/react-native-document-scanner.
// Centraliza a leitura da setting qualidadeScanner, o mapeamento para
// o range 0..1 que o pacote espera e a normalizacao de erros.
//
// O modulo nativo entrega imagens já retificadas (deskewed) via ML
// Kit Document Scanner API no Android e VisionKit no iOS, entao o
// caller recebe URIs prontas para OCR.
//
// A28 (2026-05-06): require lazy + safe stub. O modulo nativo nao
// existe em Expo Go; import top-level crashava o boot do bundle JS
// quando a rota /scanner era pre-avaliada. Stub retorna falha
// graciosa em Expo Go; APK preview/release carrega normal.

// ScanResult: shape canonico do pacote nativo. Tipo local para
// poder importar lazy sem dependencia top-level.
interface ScanResult {
  didCancel?: boolean;
  error?: boolean;
  errorMessage?: string;
  images?: ReadonlyArray<{
    uri: string;
    width: number;
    height: number;
    fileSize: number;
  }>;
}

type LaunchScannerFn = (config: { quality: number }) => Promise<ScanResult>;

function carregarNativeLaunch(): LaunchScannerFn | null {
  try {
    const mod = require('@dariyd/react-native-document-scanner') as {
      launchScanner?: LaunchScannerFn;
    };
    return mod.launchScanner ?? null;
  } catch {
    return null;
  }
}

// Sprint M29: tipo local (antes vinha de useSettings, removido em v2).
// 'maxima' continua sendo o unico valor usado em runtime; demais
// permanecem para compatibilidade do mapeamento ate eventual cleanup.
export type ScannerQualidade = '8mp' | '12mp' | 'maxima';

// Mapeamento canonico das qualidades para o quality 0..1 do pacote
// nativo. 'maxima' = 1.0 (sem compressao adicional); '12mp' = 0.85;
// '8mp' = 0.7.
const MAPA_QUALIDADE: Record<ScannerQualidade, number> = {
  '8mp': 0.7,
  '12mp': 0.85,
  maxima: 1.0,
};

export interface DeskewedImagem {
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

export type ScannerErro =
  | { tipo: 'cancelado' }
  | { tipo: 'falha_nativa'; mensagem: string };

export type ScannerSucesso = {
  ok: true;
  imagens: ReadonlyArray<DeskewedImagem>;
};

export type ScannerFalha = {
  ok: false;
  erro: ScannerErro;
};

export type ScannerResultado = ScannerSucesso | ScannerFalha;

// Dispara o modal nativo. Caller decide o que fazer com cada caso
// via discriminated union ('ok'). Nao lanca: erros do pacote viram
// resultado tipado.
export async function abrirScanner(
  qualidade: ScannerQualidade
): Promise<ScannerResultado> {
  const nativeLaunch = carregarNativeLaunch();
  if (!nativeLaunch) {
    return {
      ok: false,
      erro: {
        tipo: 'falha_nativa',
        mensagem: 'Scanner disponível apenas no app instalado.',
      },
    };
  }
  const quality = MAPA_QUALIDADE[qualidade];
  let resultado: ScanResult;
  try {
    resultado = await nativeLaunch({ quality });
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : 'erro desconhecido';
    return { ok: false, erro: { tipo: 'falha_nativa', mensagem } };
  }

  if (resultado.didCancel === true) {
    return { ok: false, erro: { tipo: 'cancelado' } };
  }
  if (resultado.error === true) {
    return {
      ok: false,
      erro: {
        tipo: 'falha_nativa',
        mensagem: resultado.errorMessage ?? 'falha do modulo nativo',
      },
    };
  }
  if (!resultado.images || resultado.images.length === 0) {
    return {
      ok: false,
      erro: { tipo: 'falha_nativa', mensagem: 'nenhuma imagem retornada' },
    };
  }

  const imagens: DeskewedImagem[] = resultado.images.map((img) => ({
    uri: img.uri,
    width: img.width,
    height: img.height,
    fileSize: img.fileSize,
  }));

  return { ok: true, imagens };
}
