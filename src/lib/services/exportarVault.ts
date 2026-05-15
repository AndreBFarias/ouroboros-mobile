// Servico de exportacao do Vault em ZIP. M15 lancou a versao basica
// (apenas conteudo das pastas canonicas). M-EXPORT-COMPLETO (Bloco A5)
// expande para entregar um backup fiel:
//
//   1. Todos os .md de cada subpasta canonica (recursivo).
//   2. Todos os binarios (jpg/mp4/m4a/pdf) com bytes preservados.
//   3. Todos os companion .md de mídia (M34/M39).
//   4. Cache .ouroboros/cache/*.json (heatmap, financas-cache,
//      marcos-auto).
//   5. Snapshot de settings/identidade em
//      .ouroboros/snapshot-settings.json (serializa useSettings,
//      useOnboarding, usePessoa).
//   6. MANIFEST.json na raiz com versao, data, contagem por subpasta
//      e sha256 de cada arquivo (validado no restore).
//
// Decisoes (spec §6):
//   - Snapshot fica em .ouroboros/ (oculto no Obsidian, nao polui Vault).
//   - Sem encryption (ADR-0007: confianca no usuario).
//   - JSZip level 1 (mantem binarios streamable).
//
// Plataforma:
//   - Web: vault e mock; retorna null sem erro.
//   - Android: caminho real via SAF (FileSystem/legacy).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { VAULT_FOLDERS } from '@/lib/vault/paths';
import { loadVaultRoot } from '@/lib/vault/permissions';
import { sha256Base64, sha256Utf8 } from '@/lib/crypto/sha256';
import { useSettings } from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';

// Versao do schema MANIFEST. Bump a cada mudanca incompativel.
export const EXPORT_SCHEMA_VERSION = 1;

// Resultado canonico. URI null em falha; mensagem para tracking.
export interface ExportarResultado {
  uri: string | null;
  totalArquivos: number;
  motivo?: string;
}

// Estrutura do MANIFEST.json gravado na raiz do ZIP. Restore valida
// cada arquivo via sha256 antes de escrever no Vault destino.
export interface ManifestEntry {
  path: string; // path relativo ao ZIP (igual ao path no Vault).
  bytes: number; // tamanho original (decodificado se base64).
  sha256: string; // hash do conteudo bruto.
  binario: boolean; // true = base64 no ZIP; false = utf8 puro.
}

export interface Manifest {
  schema: number; // EXPORT_SCHEMA_VERSION.
  exportadoEm: string; // ISO 8601.
  totalArquivos: number;
  porSubpasta: Record<string, number>; // contagem por chave de VAULT_FOLDERS.
  arquivos: ManifestEntry[];
}

// Snapshot de stores serializaveis. Fotos binarias NAO entram aqui
// (vao como arquivo em media/avatares/). URIs locais ficam, restore
// pode ou nao reconstruir o link.
export interface SnapshotSettings {
  schema: number;
  exportadoEm: string;
  settings: Omit<
    ReturnType<typeof useSettings.getState>,
    | 'setSomVibracao'
    | 'setPessoa'
    | 'setFeatureToggle'
    | 'setPrivacidade'
    | 'setMidia'
    | 'resetar'
  >;
  onboarding: {
    done: boolean;
    tipoCompanhia: ReturnType<typeof useOnboarding.getState>['tipoCompanhia'];
    // sexoDeclarado e permissoes incluidos em
    // M-AUDIT-MIGUE-RESTORE-SNAPSHOT (campo aditivo, schema=1 mantem).
    // Opcional para tolerar snapshots antigos exportados antes do
    // patch (parser do restore aceita ausencia).
    sexoDeclarado?: ReturnType<typeof useOnboarding.getState>['sexoDeclarado'];
    permissoes?: ReturnType<typeof useOnboarding.getState>['permissoes'];
  };
  pessoa: {
    pessoaAtiva: ReturnType<typeof usePessoa.getState>['pessoaAtiva'];
    filtroPessoa: ReturnType<typeof usePessoa.getState>['filtroPessoa'];
    nomes: ReturnType<typeof usePessoa.getState>['nomes'];
    fotos: ReturnType<typeof usePessoa.getState>['fotos'];
  };
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

// Calcula tamanho original em bytes a partir do conteudo gravado no
// ZIP. Para utf8 medimos os bytes da TextEncoder; para base64
// decodificamos para saber o tamanho real.
function bytesUtf8(text: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).length;
  }
  // Fallback: estima via charCodes (suficiente para fallback antigo).
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

function bytesBase64(b64: string): number {
  // Padding "=" conta como zero bytes adicionados.
  const limpos = b64.replace(/=+$/g, '');
  return Math.floor((limpos.length * 3) / 4);
}

// Serializa snapshot de stores. Fora de componente React, usamos
// getState() puro. Os mutators sao removidos para o JSON ficar
// estavel e carregavel.
export function gerarSnapshotSettings(): SnapshotSettings {
  const s = useSettings.getState();
  const o = useOnboarding.getState();
  const p = usePessoa.getState();
  return {
    schema: EXPORT_SCHEMA_VERSION,
    exportadoEm: new Date().toISOString(),
    settings: {
      somVibracao: s.somVibracao,
      pessoa: s.pessoa,
      featureToggles: s.featureToggles,
      privacidade: s.privacidade,
      midia: s.midia,
    },
    onboarding: {
      done: o.done,
      tipoCompanhia: o.tipoCompanhia,
      sexoDeclarado: o.sexoDeclarado,
      permissoes: o.permissoes,
    },
    pessoa: {
      pessoaAtiva: p.pessoaAtiva,
      filtroPessoa: p.filtroPessoa,
      nomes: p.nomes,
      fotos: p.fotos,
    },
  };
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
  const entries: ManifestEntry[] = [];
  const porSubpasta: Record<string, number> = {};
  let totalArquivos = 0;

  // H2 layout-por-tipo (ADR-0023): VAULT_FOLDERS e tupla readonly de
  // strings. Cada nome de pasta e usado como chave de contagem no
  // MANIFEST (markdown, png, jpg, m4a, mp4, pdf, gif, .ouroboros/cache).
  for (const pasta of VAULT_FOLDERS) {
    const arquivos = await listarRecursivo(vaultRoot, pasta);
    const chave = pasta;
    porSubpasta[chave] = 0;
    for (const rel of arquivos) {
      const absoluto = `${vaultRoot.replace(/\/$/, '')}/${rel}`;
      try {
        if (isBinario(rel)) {
          const b64 = await FileSystem.readAsStringAsync(absoluto, {
            encoding: FileSystem.EncodingType.Base64,
          });
          zip.file(rel, b64, { base64: true });
          entries.push({
            path: rel,
            bytes: bytesBase64(b64),
            sha256: sha256Base64(b64),
            binario: true,
          });
        } else {
          const txt = await FileSystem.readAsStringAsync(absoluto, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          zip.file(rel, txt);
          entries.push({
            path: rel,
            bytes: bytesUtf8(txt),
            sha256: sha256Utf8(txt),
            binario: false,
          });
        }
        totalArquivos += 1;
        porSubpasta[chave] += 1;
      } catch {
        // Arquivo ilegivel; pula sem abortar exportacao toda.
      }
    }
  }

  // Snapshot de stores em .ouroboros/snapshot-settings.json.
  const snapshot = gerarSnapshotSettings();
  const snapshotJson = JSON.stringify(snapshot, null, 2);
  const snapshotPath = '.ouroboros/snapshot-settings.json';
  zip.file(snapshotPath, snapshotJson);
  entries.push({
    path: snapshotPath,
    bytes: bytesUtf8(snapshotJson),
    sha256: sha256Utf8(snapshotJson),
    binario: false,
  });
  totalArquivos += 1;
  porSubpasta['snapshotSettings'] = 1;

  // MANIFEST.json na raiz. Importante: nao incluir o proprio MANIFEST
  // na lista de arquivos (sha auto-referente quebraria validacao).
  const manifest: Manifest = {
    schema: EXPORT_SCHEMA_VERSION,
    exportadoEm: new Date().toISOString(),
    totalArquivos,
    porSubpasta,
    arquivos: entries,
  };
  const manifestJson = JSON.stringify(manifest, null, 2);
  zip.file('MANIFEST.json', manifestJson);

  // generateAsync com level 1 (rapido, mantem binarios streamable).
  const conteudo = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 1 },
  });
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15); // YYYYMMDDTHHmmss
  const destino = `${cacheDir}ouroboros-export-${ts}.zip`;
  await FileSystem.writeAsStringAsync(destino, conteudo, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { uri: destino, totalArquivos };
}
