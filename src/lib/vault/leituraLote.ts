// Camada de leitura em lote do Vault (R-AUDIT-VAULT-PERF, achados 11/12).
// Duas primitivas que colapsam o fan-out de I/O da Home e do Recap sem
// mudar a saida observavel:
//
//   - readVaultFiles: le uma lista de URIs em chunks paralelos, no lugar
//     do `for ... await readVaultFile` serial de dentro de cada listar*.
//   - lerListagemMarkdown: lista markdown/ UMA vez por ciclo; o filtro
//     por tipo continua no chamador (predicado atual preservado verbatim).
//
// Por que readVaultFiles vive AQUI e nao em reader.ts: os testes unit
// dos listar* mockam '@/lib/vault/reader' com apenas
// { listVaultFolder, readVaultFile }. Se readVaultFiles morasse em
// reader.ts, esses mocks parciais o tornariam undefined e quebrariam as
// suites. Aqui readVaultFiles reusa o readVaultFile importado de reader,
// entao o mock de readVaultFile continua valendo e o branch web/dev
// (A15, reader.ts:34-38) e o tratamento de erro atual sao preservados.
//
// Invariante critico: a ORDEM DE ENTRADA e preservada; o sort final de
// cada listar* continua sendo a fonte unica de ordenacao. Arquivos
// null/malformados sao descartados em silencio, igual ao loop serial.
//
// Comentarios sem acento (convencao shell/CI).
import type { ZodType } from 'zod';
import type { ParsedFrontmatter } from '@/lib/vault/frontmatter';
import { MARKDOWN_FOLDER, vaultUriJoin } from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';

// Tamanho default do bloco paralelo. Le em blocos para nao abrir
// centenas de descriptors SAF de uma vez no Android (cada leitura abre
// um handle). 24 paraleliza de forma agressiva sem estourar o limite de
// file descriptors em OEMs.
const CHUNK_DEFAULT = 24;

// Resultado de uma leitura em lote: mantem a URI de origem junto do
// parse para o chamador poder derivar o que precisar (tarefas usa a URI
// para o path relativo; midiaCompanion a correlaciona com o prefixo de
// feature). Espelha o retorno nao-nulo de readVaultFile.
export interface ArquivoLido<T> {
  uri: string;
  parsed: ParsedFrontmatter<T>;
}

// Le uma lista de URIs em chunks paralelos, reusando readVaultFile por
// dentro. Preserva a ordem de entrada e descarta null/malformado em
// silencio (mesma semantica do `for ... await readVaultFile` serial que
// substitui). O caller aplica o sort final como antes.
export async function readVaultFiles<T>(
  uris: string[],
  schema: ZodType<T>,
  opts?: { chunk?: number }
): Promise<ArquivoLido<T>[]> {
  const chunk = opts?.chunk ?? CHUNK_DEFAULT;
  const lidos: ArquivoLido<T>[] = [];
  for (let i = 0; i < uris.length; i += chunk) {
    const bloco = uris.slice(i, i + chunk);
    // O `.map` invoca readVaultFile em ordem de entrada (async roda
    // sincrono ate o primeiro await), preservando a ordem de consumo de
    // mocks encadeados; Promise.all mantem a ordem dos resultados.
    const resultados = await Promise.all(
      bloco.map(async (uri): Promise<ArquivoLido<T> | null> => {
        try {
          const parsed = await readVaultFile(uri, schema);
          return parsed ? { uri, parsed } : null;
        } catch {
          // Igual ao loop serial: arquivo malformado descartado.
          return null;
        }
      })
    );
    for (const r of resultados) {
      if (r) lidos.push(r);
    }
  }
  return lidos;
}

// Lista as URIs cruas de todos os .md em markdown/ UMA vez por ciclo. O
// filtro por tipo (prefixo de feature + sync-conflict) continua no
// chamador, para preservar cada predicado atual verbatim. Root vazio
// => [] (nao chama vaultUriJoin, que lancaria).
export async function lerListagemMarkdown(vaultRoot: string): Promise<string[]> {
  if (!vaultRoot) return [];
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  return listVaultFolder(folderUri, '.md');
}
