// Servico de restauracao de Vault a partir de ZIP exportado por
// exportarVaultZip(). M-EXPORT-COMPLETO (Bloco A5).
//
// Fluxo:
//   1. Le ZIP via JSZip a partir do path informado.
//   2. Extrai MANIFEST.json e valida schema.
//   3. Para cada entrada, valida sha256 antes de escrever.
//   4. Default: append em <vaultRoot>/restaurado-<YYYY-MM-DD>/
//      (nao destrutivo). Se sobrescrever=true, escreve direto em
//      <vaultRoot>/. Cabe a' UI confirmar antes de chamar com
//      sobrescrever=true.
//   5. Snapshot de settings (.ouroboros/snapshot-settings.json) e'
//      gravado no destino e, quando o caller passa
//      `aplicarSnapshotSettings: true`, tambem e' aplicado nos stores
//      via aplicarSnapshot() abaixo (M-AUDIT-MIGUE-RESTORE-SNAPSHOT).
//
// Decisoes (spec §6):
//   - MANIFEST.json e fonte de verdade: arquivo sem entrada no
//     manifest e' descartado; entrada cujo sha nao bate vai para
//     `falhas` e nao e' escrita.
//   - Restore default nao-destrutivo (cria pasta restaurado-<data>/).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { loadVaultRoot } from '@/lib/vault/permissions';
import { sha256Base64, sha256Utf8 } from '@/lib/crypto/sha256';
import {
  EXPORT_SCHEMA_VERSION,
  type Manifest,
  type ManifestEntry,
  type SnapshotSettings,
} from '@/lib/services/exportarVault';
import { useSettings } from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';

export interface RestauracaoFalha {
  path: string;
  motivo:
    | 'sha-divergente'
    | 'arquivo-ausente'
    | 'erro-escrita'
    | 'manifest-divergente';
}

export interface RestauracaoResultado {
  ok: boolean;
  raizDestino: string | null; // pasta onde os arquivos foram escritos.
  totalEscritos: number;
  totalIgnorados: number; // arquivos no zip sem entry no manifest.
  falhas: RestauracaoFalha[];
  motivo?: string; // motivo de falha global (zip ilegivel, manifest ausente).
  // Resultado do aplicarSnapshot quando solicitado. Ausente se
  // aplicarSnapshotSettings nao foi passado.
  snapshotAplicado?: AplicarSnapshotResultado;
}

export interface RestauracaoOpcoes {
  // Quando true, escreve direto em <vaultRoot>/. Default false:
  // cria <vaultRoot>/restaurado-<YYYY-MM-DD>/ e popula la.
  sobrescrever?: boolean;
  // Quando true, le .ouroboros/snapshot-settings.json do zip e aplica
  // nos stores zustand (useSettings/useOnboarding/usePessoa) via
  // aplicarSnapshot({ confirmado: true }). Default false. A UI deve
  // confirmar com o usuario antes de passar true (Q1 spec).
  aplicarSnapshotSettings?: boolean;
}

// Resultado da aplicacao do snapshot. Separado do RestauracaoResultado
// porque aplicarSnapshot e' chamada standalone tambem (UI pode optar
// por aplicar so o snapshot sem restaurar arquivos).
export interface AplicarSnapshotResultado {
  ok: boolean;
  motivo?: string; // 'nao-confirmado' | 'schema-incompativel' | 'snapshot-invalido'.
}

// Helper local: garante que a pasta exista. Idempotente.
async function garantirPasta(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && info.isDirectory) return;
  } catch {
    // segue para criar.
  }
  await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
}

// Junta segmentos cuidando das barras finais.
function joinPath(root: string, rel: string): string {
  const r = root.endsWith('/') ? root.slice(0, -1) : root;
  const s = rel.startsWith('/') ? rel.slice(1) : rel;
  return `${r}/${s}`;
}

// Garante a arvore de subpastas para um path de arquivo.
async function garantirArvore(absoluto: string): Promise<void> {
  const idx = absoluto.lastIndexOf('/');
  if (idx <= 0) return;
  const pasta = absoluto.slice(0, idx);
  await garantirPasta(pasta);
}

// Sufixo legivel para a pasta restaurado-<YYYY-MM-DD>. Sem hora pra
// que reentregas no mesmo dia caiam na mesma pasta (idempotente do
// ponto de vista do usuario).
function sufixoData(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Restaura um ZIP de export gerado por exportarVaultZip().
// Validacao: MANIFEST.json no zip e' obrigatorio. Cada entrada do
// manifest tem sha conferido contra o conteudo do zip antes de
// escrever no destino.
export async function restaurarVaultZip(
  zipPath: string,
  opcoes: RestauracaoOpcoes = {}
): Promise<RestauracaoResultado> {
  const fail = (motivo: string): RestauracaoResultado => ({
    ok: false,
    raizDestino: null,
    totalEscritos: 0,
    totalIgnorados: 0,
    falhas: [],
    motivo,
  });

  if (Platform.OS === 'web') {
    return fail('Restauração não disponível em web.');
  }
  const vaultRoot = await loadVaultRoot();
  if (!vaultRoot) {
    return fail('Vault não configurado.');
  }

  // Le o ZIP como base64 e abre via JSZip.
  let zipB64: string;
  try {
    zipB64 = await FileSystem.readAsStringAsync(zipPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return fail('Falha ao ler o arquivo zip.');
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipB64, { base64: true });
  } catch {
    return fail('Arquivo zip inválido ou corrompido.');
  }

  const manifestEntry = zip.file('MANIFEST.json');
  if (!manifestEntry) {
    return fail('MANIFEST.json ausente no zip.');
  }
  let manifest: Manifest;
  try {
    const raw = await manifestEntry.async('string');
    manifest = JSON.parse(raw) as Manifest;
  } catch {
    return fail('MANIFEST.json ilegível.');
  }
  if (manifest.schema !== EXPORT_SCHEMA_VERSION) {
    return fail(
      `Schema do manifest incompatível (esperado ${EXPORT_SCHEMA_VERSION}, encontrado ${manifest.schema}).`
    );
  }
  if (!Array.isArray(manifest.arquivos)) {
    return fail('MANIFEST.json sem lista de arquivos.');
  }

  // Define raiz de destino. Default cria pasta restaurado-<data>/.
  const raizDestino = opcoes.sobrescrever
    ? vaultRoot.replace(/\/$/, '')
    : joinPath(vaultRoot, `restaurado-${sufixoData(new Date())}`);
  await garantirPasta(raizDestino);

  // Indexa entradas do manifest por path para deteccao de extras no zip.
  const indice = new Map<string, ManifestEntry>();
  for (const e of manifest.arquivos) {
    indice.set(e.path, e);
  }

  const falhas: RestauracaoFalha[] = [];
  let totalEscritos = 0;
  let totalIgnorados = 0;

  for (const entry of manifest.arquivos) {
    const zipFile = zip.file(entry.path);
    if (!zipFile) {
      falhas.push({ path: entry.path, motivo: 'arquivo-ausente' });
      continue;
    }
    try {
      if (entry.binario) {
        const b64 = await zipFile.async('base64');
        const sha = sha256Base64(b64);
        if (sha !== entry.sha256) {
          falhas.push({ path: entry.path, motivo: 'sha-divergente' });
          continue;
        }
        const destino = joinPath(raizDestino, entry.path);
        await garantirArvore(destino);
        await FileSystem.writeAsStringAsync(destino, b64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        totalEscritos += 1;
      } else {
        const txt = await zipFile.async('string');
        const sha = sha256Utf8(txt);
        if (sha !== entry.sha256) {
          falhas.push({ path: entry.path, motivo: 'sha-divergente' });
          continue;
        }
        const destino = joinPath(raizDestino, entry.path);
        await garantirArvore(destino);
        await FileSystem.writeAsStringAsync(destino, txt, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        totalEscritos += 1;
      }
    } catch {
      falhas.push({ path: entry.path, motivo: 'erro-escrita' });
    }
  }

  // Conta arquivos extras no zip que nao apareceram no manifest
  // (alem de MANIFEST.json em si).
  zip.forEach((relativePath) => {
    if (relativePath === 'MANIFEST.json') return;
    if (!indice.has(relativePath)) {
      totalIgnorados += 1;
    }
  });

  // Se solicitado, aplica snapshot de settings nos stores. Le do zip
  // (nao do destino) para nao depender de qual pasta o restore usou.
  let snapshotAplicado: AplicarSnapshotResultado | undefined;
  if (opcoes.aplicarSnapshotSettings) {
    const snapEntry = zip.file('.ouroboros/snapshot-settings.json');
    if (!snapEntry) {
      snapshotAplicado = { ok: false, motivo: 'snapshot-ausente' };
    } else {
      try {
        const raw = await snapEntry.async('string');
        const parsed = JSON.parse(raw) as SnapshotSettings;
        snapshotAplicado = aplicarSnapshot(parsed, { confirmado: true });
      } catch {
        snapshotAplicado = { ok: false, motivo: 'snapshot-invalido' };
      }
    }
  }

  return {
    ok: falhas.length === 0,
    raizDestino,
    totalEscritos,
    totalIgnorados,
    falhas,
    snapshotAplicado,
  };
}

// Aplica um snapshot serializado (gerado por gerarSnapshotSettings()
// no momento do export) sobre os stores zustand do app:
// useSettings + useOnboarding + usePessoa.
//
// Decisoes durables (spec §10 M-AUDIT-MIGUE-RESTORE-SNAPSHOT):
//   - Q1: precisa confirmacao explicita. Default `confirmado=false`
//     aborta sem mexer em nada e devolve motivo 'nao-confirmado'.
//     UI sempre passa `{ confirmado: true }` apos diálogo.
//   - Q2: schema diferente do EXPORT_SCHEMA_VERSION aborta com
//     motivo 'schema-incompativel'. Nao tenta migrar.
//   - Q3: o campo onboarding/settings/pessoa do snapshot NAO inclui
//     vaultRoot — preserva o vaultRoot atual do dispositivo (esta
//     informacao vive em SecureStore separado, nao no snapshot).
//
// Sem efeito colateral em filesystem; so toca stores em memoria.
// Persistencia automatica fica por conta do middleware `persist` de
// cada store (zustand reage ao setState e grava no SecureStore).
export function aplicarSnapshot(
  snap: SnapshotSettings,
  opts: { confirmado: boolean }
): AplicarSnapshotResultado {
  if (!opts.confirmado) {
    return { ok: false, motivo: 'nao-confirmado' };
  }
  if (!snap || typeof snap !== 'object') {
    return { ok: false, motivo: 'snapshot-invalido' };
  }
  if (snap.schema !== EXPORT_SCHEMA_VERSION) {
    console.error(
      `[aplicarSnapshot] schema incompativel: esperado ${EXPORT_SCHEMA_VERSION}, recebido ${snap.schema}`
    );
    return { ok: false, motivo: 'schema-incompativel' };
  }
  if (!snap.settings || !snap.onboarding || !snap.pessoa) {
    return { ok: false, motivo: 'snapshot-invalido' };
  }

  // Aplica em ordem: settings -> onboarding -> pessoa. setState
  // recebe shape parcial; zustand mescla com mutators existentes.
  useSettings.setState({
    somVibracao: snap.settings.somVibracao,
    pessoa: snap.settings.pessoa,
    featureToggles: snap.settings.featureToggles,
    privacidade: snap.settings.privacidade,
    midia: snap.settings.midia,
  });
  // R-INT-3-HC-NOTIF-META-PASSOS: campo aditivo. Snaps antigos
  // (exportados antes da sprint) nao tem metaPassosDia; quando ausente
  // ou invalido, mantem o valor atual do store em vez de zerar.
  if (
    typeof snap.settings.metaPassosDia === 'number' &&
    Number.isFinite(snap.settings.metaPassosDia) &&
    snap.settings.metaPassosDia > 0
  ) {
    useSettings.getState().setMetaPassosDia(snap.settings.metaPassosDia);
  }
  // sexoDeclarado e permissoes opcionais (campo aditivo: snaps antigos
  // exportados antes do patch nao tem). Quando ausente, mantem o que
  // ja esta no store em vez de zerar.
  const onboardingPatch: Partial<ReturnType<typeof useOnboarding.getState>> = {
    done: snap.onboarding.done,
    tipoCompanhia: snap.onboarding.tipoCompanhia,
  };
  if (snap.onboarding.sexoDeclarado) {
    onboardingPatch.sexoDeclarado = snap.onboarding.sexoDeclarado;
  }
  if (snap.onboarding.permissoes) {
    onboardingPatch.permissoes = snap.onboarding.permissoes;
  }
  useOnboarding.setState(onboardingPatch);
  usePessoa.setState({
    pessoaAtiva: snap.pessoa.pessoaAtiva,
    filtroPessoa: snap.pessoa.filtroPessoa,
    nomes: snap.pessoa.nomes,
    fotos: snap.pessoa.fotos,
  });

  return { ok: true };
}
