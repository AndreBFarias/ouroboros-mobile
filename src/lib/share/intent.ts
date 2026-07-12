// Helpers de leitura de intent recebido via share sheet do Android
// (M08, Tela 17). A entrada e a URI do arquivo + mime type +
// origem (package do app emissor), todos passados como query params
// para a rota /share-receive.
//
// Decisão: não usamos expo-intent-launcher para "ler" o intent
// programaticamente. A activity e configurada como singleTask em
// app.json e o RootLayout passa a URL inicial pelo
// useDeepLinkListener (M00.5), que estende a M08 reconhecendo
// action.SEND. O resultado e que /share-receive recebe os campos
// como query string normalizada.
//
// Funções puras (sem side effect) para facilitar teste unitario.

// Resultado canonico extraido do intent. Mime type usa default
// 'application/octet-stream' quando ausente; isso satisfaz o schema
// (string não vazia) e não precisa de ramos extras na UI.
export interface SharedIntentInput {
  readonly uri: string;
  readonly mimeType: string;
  readonly origem: string | null;
  readonly nomeSugerido: string | null;
}

// Mime types que o app aceita oficialmente (alinhado com
// android.intentFilters em app.json). Outros mime types são aceitos
// pelo helper mas o caller deve degradar para 'outro' na UI.
const MIME_PERMITIDOS: ReadonlyArray<string> = ['application/pdf'];

const MIME_PREFIXOS_PERMITIDOS: ReadonlyArray<string> = ['image/'];

// Decide se o mime type recebido bate com o intent filter declarado.
// Útil para a tela mostrar warning quando algum app envia formato
// fora do contrato (ex: text/plain).
export function mimeAceito(mimeType: string): boolean {
  if (MIME_PERMITIDOS.includes(mimeType)) return true;
  return MIME_PREFIXOS_PERMITIDOS.some((p) => mimeType.startsWith(p));
}

// Extrai a extensao do nome de arquivo informado, ou deduz pelo mime
// type. Sem ponto inicial. Devolve string vazia quando não consegue
// deduzir.
export function extensaoDe(mimeType: string, nome?: string | null): string {
  if (nome && nome.includes('.')) {
    const idx = nome.lastIndexOf('.');
    const ext = nome
      .slice(idx + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (ext.length > 0 && ext.length <= 6) return ext;
  }
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType.startsWith('image/')) return 'img';
  return '';
}

// Normaliza os parametros recebidos pelo router. Garante mime type
// não vazio e devolve null em uri ausente. Caller pode descartar
// silenciosamente quando uri esta null (rota acessada sem intent
// real, ex: deep link manual).
export interface RawIntentParams {
  uri?: string | string[] | null;
  mime?: string | string[] | null;
  origem?: string | string[] | null;
  nome?: string | string[] | null;
}

function pickFirst(value: string | string[] | null | undefined): string | null {
  if (typeof value === 'string') return value.length > 0 ? value : null;
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'string'
  ) {
    return value[0].length > 0 ? value[0] : null;
  }
  return null;
}

export function parseIntentParams(
  raw: RawIntentParams
): SharedIntentInput | null {
  const uri = pickFirst(raw.uri);
  if (!uri) return null;
  const mime = pickFirst(raw.mime) ?? 'application/octet-stream';
  const origem = pickFirst(raw.origem);
  const nomeSugerido = pickFirst(raw.nome);
  return {
    uri,
    mimeType: mime,
    origem,
    nomeSugerido,
  };
}

// Sugestao de nome amigavel para a UI (header do modal). Quando o
// arquivo veio sem nome, usa o sufixo da uri ou o mime type. Sem
// extensao no resultado.
export function nomeAmigavel(input: SharedIntentInput): string {
  if (input.nomeSugerido && input.nomeSugerido.trim().length > 0) {
    const trim = input.nomeSugerido.trim();
    const idx = trim.lastIndexOf('.');
    return idx > 0 ? trim.slice(0, idx) : trim;
  }
  // content://... ou file://... -> pega o segmento final
  const segs = input.uri.split('/');
  const last = segs[segs.length - 1] ?? '';
  if (last.length > 0 && last.length < 64) {
    const idx = last.lastIndexOf('.');
    return idx > 0 ? last.slice(0, idx) : last;
  }
  if (input.mimeType === 'application/pdf') return 'documento';
  if (input.mimeType.startsWith('image/')) return 'imagem';
  return 'arquivo';
}
