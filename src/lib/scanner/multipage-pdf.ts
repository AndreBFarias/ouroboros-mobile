// Consolida um array de URIs de imagens (já deskewed pelo modulo
// nativo) em um único PDF via expo-print. O HTML embuti as imagens
// com tag <img> apontando para file:// URIs locais; expo-print roda
// o renderer headless e devolve um PDF salvo no cache do app. O
// caller (saveNota) cópia para media/scanner/<basename>.pdf no Vault
// via expo-file-system.
//
// Justificativa de PDF único: usuário que captura recibo multipágina
// quer 1 arquivo, não N. Tambem reduz número de .md companions, que
// no novo padrao (M-VAULT-MD-FIX-scanner) e' 1:1 com o binario na
// pasta media/scanner/.
import * as Print from 'expo-print';

export interface MultipagePdfResultado {
  // Path absoluto file:// no cache do app. Caller (saveNota) cópia
  // para media/scanner/<basename>.pdf via FileSystem.copyAsync e
  // grava o .md companion ao lado.
  uri: string;
}

// Monta HTML simples com uma imagem por página (page-break-after).
// Cada <img> toma 100% da largura A4 mantendo aspect ratio.
function montarHtml(imagensUris: ReadonlyArray<string>): string {
  const paginas = imagensUris
    .map(
      (uri) => `
<div class="pagina">
  <img src="${uri}" />
</div>`
    )
    .join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; size: A4; }
  body { margin: 0; padding: 0; }
  .pagina { width: 100%; page-break-after: always; }
  .pagina:last-child { page-break-after: auto; }
  .pagina img {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
</head>
<body>
${paginas}
</body>
</html>`;
}

// Gera PDF único contendo todas as páginas. Lanca Error se
// printToFileAsync falhar; caller captura e mostra toast.
export async function consolidarPdf(
  imagensUris: ReadonlyArray<string>
): Promise<MultipagePdfResultado> {
  if (imagensUris.length === 0) {
    throw new Error('consolidarPdf: array vazio');
  }
  const html = montarHtml(imagensUris);
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });
  return { uri };
}
