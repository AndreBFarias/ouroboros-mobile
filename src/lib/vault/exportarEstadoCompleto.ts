// Exportar estado completo em ZIP (R-VAULT-CANONICAL-COMPLETE-B).
//
// Coleta os .md de vault/_estado/ (5 estados R-VAULT-A + 4 stats
// agregadas R-VAULT-B = 9 arquivos esperados) e empacota em ZIP
// gravado em cacheDirectory (efemero). Inclui _meta.md com summary
// humano para o usuario inspecionar antes de compartilhar.
//
// Lifecycle do arquivo:
//  - Gerado em cacheDirectory (limpo pelo sistema operacional ou
//    pelo limparCache local).
//  - URI absoluto retornado para o caller, que invoca Sharing.shareAsync
//    para acionar o intent nativo de compartilhamento.
//
// Diferenca vs exportarVault.ts:
//  - exportarVault.ts -> backup completo (todos os .md, binarios,
//    cache, snapshot settings). MANIFEST sha256 por arquivo.
//  - exportarEstadoCompleto -> SO o estado canonico em _estado/. Use
//    case: enviar para sibling Python diagnosticar estado intermediario,
//    debug rapido, share leve (alguns KB).
//
// Plataforma:
//  - Web: vault e mock e cacheDirectory pode estar indisponivel. Retorna
//    null com motivo. Caller renderiza toast.
//  - Android: caminho real via SAF + FileSystem.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { useVault } from '@/lib/stores/vault';
import { ESTADO_FOLDER } from '@/lib/vault/escreverEstado';
import { vaultUriJoin } from '@/lib/vault/paths';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { useVaultMock } from '@/lib/dev/vaultMockStore';

// Versao do schema do _meta.md (ZIP). Bump em mudancas de forma do
// summary, nao do conteudo dos estados.
export const ESTADO_EXPORT_SCHEMA_VERSION = 1;

export interface ExportarEstadoResultado {
  uri: string | null;
  totalArquivos: number;
  sizeBytes: number;
  motivo?: string;
}

// Le um arquivo .md dispatching entre mock (web/dev) e SAF (mobile).
async function lerArquivoMd(uri: string): Promise<string | null> {
  if (Platform.OS === 'web' && __DEV__) {
    const conteudo = useVaultMock.getState().getArquivo(uri);
    return conteudo ?? null;
  }
  try {
    return await StorageAccessFramework.readAsStringAsync(uri);
  } catch {
    return null;
  }
}

// Lista os .md de uma pasta do Vault dispatching entre mock e SAF/FS.
async function listarMd(folderUri: string): Promise<string[]> {
  if (Platform.OS === 'web' && __DEV__) {
    return useVaultMock.getState().listarPasta(folderUri, '.md');
  }
  try {
    let entries: string[];
    if (folderUri.startsWith('content://')) {
      entries = await StorageAccessFramework.readDirectoryAsync(folderUri);
    } else {
      const names = await FileSystem.readDirectoryAsync(folderUri);
      const sep = folderUri.endsWith('/') ? '' : '/';
      entries = names.map((n) => `${folderUri}${sep}${encodeURIComponent(n)}`);
    }
    return entries.filter((u) => u.toLowerCase().endsWith('.md'));
  } catch {
    return [];
  }
}

// Mede bytes UTF-8 de uma string. Mesmo helper de exportarVault.ts
// (duplicado defensivamente para evitar acoplamento entre servicos).
function bytesUtf8(text: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).length;
  }
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c < 0xd800 || c >= 0xe000) n += 3;
    else {
      n += 4;
      i++;
    }
  }
  return n;
}

// Estrutura do _meta.md gerado dentro do ZIP. Sem schema Zod
// (e summary humano, nao contrato). Versionado via constante acima.
function montarMeta(args: {
  totalArquivos: number;
  sizeBytes: number;
  exportadoEm: string;
  arquivos: { rel: string; sizeBytes: number }[];
}): string {
  const sizeKb = (args.sizeBytes / 1024).toFixed(2);
  const linhasArquivos = args.arquivos
    .map((a) => `- ${a.rel} (${a.sizeBytes} bytes)`)
    .join('\n');
  return [
    '---',
    `schema: ${ESTADO_EXPORT_SCHEMA_VERSION}`,
    `exportado_em: ${args.exportadoEm}`,
    `total_arquivos: ${args.totalArquivos}`,
    `size_bytes: ${args.sizeBytes}`,
    `size_kb: ${sizeKb}`,
    '---',
    '',
    '# Estado canonico do app Ouroboros',
    '',
    'Snapshot do que vive em `vault/_estado/` no momento da exportacao.',
    'Cada `.md` contem um pedaco do estado serializado em YAML frontmatter.',
    '',
    `Total de arquivos: **${args.totalArquivos}**`,
    `Tamanho total: **${sizeKb} KB** (${args.sizeBytes} bytes).`,
    '',
    '## Arquivos incluidos',
    '',
    linhasArquivos,
    '',
    '## Como ler',
    '',
    'Cada arquivo tem frontmatter YAML delimitado por `---` no topo.',
    'O corpo apos o frontmatter geralmente esta vazio (todo o estado',
    'vive no frontmatter).',
    '',
    'Parsers recomendados:',
    '- JS/TS: biblioteca `yaml` + `gray-matter`.',
    '- Python: `pyyaml` + `python-frontmatter`.',
    '',
    'Schemas canonicos: `src/lib/schemas/vault_estado.ts`.',
    '',
  ].join('\n');
}

// Gera ZIP com o estado canonico + _meta.md. Salva em cacheDirectory
// e devolve URI absoluto.
export async function exportarEstadoCompletoZip(): Promise<ExportarEstadoResultado> {
  const vaultRoot =
    typeof useVault.getState === 'function'
      ? useVault.getState().vaultRoot
      : null;
  if (!vaultRoot) {
    return {
      uri: null,
      totalArquivos: 0,
      sizeBytes: 0,
      motivo: 'Vault não configurado.',
    };
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return {
      uri: null,
      totalArquivos: 0,
      sizeBytes: 0,
      motivo: 'cacheDirectory ausente.',
    };
  }

  // Folder URI canonico de _estado/.
  const folderUri = vaultUriJoin(vaultRoot, ESTADO_FOLDER);
  const uris = await listarMd(folderUri);
  const limpos = uris.filter((u) => !ehSyncConflict(u));

  const zip = new JSZip();
  const arquivosMeta: { rel: string; sizeBytes: number }[] = [];
  let totalArquivos = 0;
  let sizeBytes = 0;

  for (const uri of limpos) {
    const conteudo = await lerArquivoMd(uri);
    if (conteudo == null) continue;
    // Path relativo dentro do ZIP: '_estado/<filename>'. Decode
    // explicito do filename (SAF retorna URI percent-encoded).
    const segmento = uri.split('/').pop() ?? 'estado.md';
    let filename: string;
    try {
      filename = decodeURIComponent(segmento);
    } catch {
      filename = segmento;
    }
    const relNoZip = `${ESTADO_FOLDER}/${filename}`;
    zip.file(relNoZip, conteudo);
    const bytes = bytesUtf8(conteudo);
    sizeBytes += bytes;
    arquivosMeta.push({ rel: relNoZip, sizeBytes: bytes });
    totalArquivos += 1;
  }

  const exportadoEm = new Date().toISOString();
  const metaContent = montarMeta({
    totalArquivos,
    sizeBytes,
    exportadoEm,
    arquivos: arquivosMeta,
  });
  zip.file('_meta.md', metaContent);

  const conteudoB64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  });

  // Filename: <deviceId>-<timestamp>-estado-completo.zip. deviceId
  // identifica origem (uso em backup multi-device); timestamp evita
  // overwrite acidental em rajada de exports.
  const ts = exportadoEm.replace(/[:.]/g, '').slice(0, 15); // YYYYMMDDTHHmmss
  const destino = `${cacheDir}${ts}-estado-completo.zip`;

  try {
    await FileSystem.writeAsStringAsync(destino, conteudoB64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (e) {
    return {
      uri: null,
      totalArquivos: 0,
      sizeBytes: 0,
      motivo: `Falha ao escrever ZIP: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return { uri: destino, totalArquivos, sizeBytes };
}
