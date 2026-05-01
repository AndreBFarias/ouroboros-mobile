// Servico de exportacao do Vault em ZIP. M15 chamou a API simples:
// gerar 1 ZIP com tudo, salvar em cacheDirectory, retornar URI para
// Sharing.shareAsync. UI mostra toast "Exportando..." enquanto roda.
//
// Decisao M15 (spec secao 11): UI sem barra de progresso. Sucesso
// abre share sheet; falha mostra toast vermelho.
//
// Estrategia:
//   - Iterar pastas canonicas via VAULT_FOLDERS de paths.ts.
//   - readDirectoryAsync recursivo onde necessario (assets/* tem
//     subpastas; inbox/* idem).
//   - Adicionar binarios com base64; texto com utf-8.
//   - Gerar ZIP via JSZip 3.x e salvar em cacheDirectory.
//
// Plataforma:
//   - Web: vault e mock; retorna null sem erro (UI pode mostrar
//     toast "Exportação não disponível em web").
//   - Android: caminho real.
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { VAULT_FOLDERS } from '@/lib/vault/paths';
import { loadVaultRoot } from '@/lib/vault/permissions';

// Resultado canonico. URI null em falha; mensagem para tracking.
export interface ExportarResultado {
  uri: string | null;
  totalArquivos: number;
  motivo?: string;
}

// Conjunto de extensoes binarias. Ler como base64.
const BIN_EXT = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'pdf',
  'm4a',
  'mp3',
  'wav',
  'mp4',
  'mov',
]);

function isBinario(nome: string): boolean {
  const idx = nome.lastIndexOf('.');
  if (idx < 0) return false;
  const ext = nome.slice(idx + 1).toLowerCase();
  return BIN_EXT.has(ext);
}

// Lista recursivamente arquivos abaixo de `pasta`. Retorna paths
// relativos ao `vaultRoot`. Se a pasta nao existe, devolve [].
async function listarRecursivo(
  vaultRoot: string,
  rel: string
): Promise<string[]> {
  const base = vaultRoot.replace(/\/$/, '');
  const target = `${base}/${rel}`;
  let info: FileSystem.FileInfo;
  try {
    info = await FileSystem.getInfoAsync(target);
  } catch {
    return [];
  }
  if (!info.exists || !info.isDirectory) return [];
  const filhos = await FileSystem.readDirectoryAsync(target);
  const out: string[] = [];
  for (const filho of filhos) {
    const filhoRel = `${rel}/${filho}`;
    const filhoTarget = `${base}/${filhoRel}`;
    let finfo: FileSystem.FileInfo;
    try {
      finfo = await FileSystem.getInfoAsync(filhoTarget);
    } catch {
      continue;
    }
    if (!finfo.exists) continue;
    if (finfo.isDirectory) {
      const subs = await listarRecursivo(vaultRoot, filhoRel);
      out.push(...subs);
    } else {
      out.push(filhoRel);
    }
  }
  return out;
}

// Gera ZIP com tudo e salva em cacheDirectory/ouroboros-export-<ts>.zip.
// Em sucesso, retorna URI absoluto. Em falha (sem permissao SAF, web,
// erro de IO), retorna null com motivo.
export async function exportarVaultZip(): Promise<ExportarResultado> {
  if (Platform.OS === 'web') {
    return {
      uri: null,
      totalArquivos: 0,
      motivo: 'Exportação não disponível em web.',
    };
  }
  const vaultRoot = await loadVaultRoot();
  if (!vaultRoot) {
    return {
      uri: null,
      totalArquivos: 0,
      motivo: 'Vault não configurado.',
    };
  }
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return {
      uri: null,
      totalArquivos: 0,
      motivo: 'cacheDirectory ausente.',
    };
  }

  const zip = new JSZip();
  let totalArquivos = 0;

  const pastasCanonicas = Object.values(VAULT_FOLDERS);
  for (const pasta of pastasCanonicas) {
    const arquivos = await listarRecursivo(vaultRoot, pasta);
    for (const rel of arquivos) {
      const absoluto = `${vaultRoot.replace(/\/$/, '')}/${rel}`;
      try {
        if (isBinario(rel)) {
          const b64 = await FileSystem.readAsStringAsync(absoluto, {
            encoding: FileSystem.EncodingType.Base64,
          });
          zip.file(rel, b64, { base64: true });
        } else {
          const txt = await FileSystem.readAsStringAsync(absoluto, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          zip.file(rel, txt);
        }
        totalArquivos += 1;
      } catch {
        // Arquivo ilegivel; pula sem abortar exportacao toda.
      }
    }
  }

  const conteudo = await zip.generateAsync({ type: 'base64' });
  const ts = new Date()
    .toISOString()
    .replace(/[:.]/g, '')
    .slice(0, 15); // YYYYMMDDTHHmmss
  const destino = `${cacheDir}ouroboros-export-${ts}.zip`;
  await FileSystem.writeAsStringAsync(destino, conteudo, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { uri: destino, totalArquivos };
}
