// Sprint M-BACKUP-AUTOMATICO (Bloco C5) — execucao do backup periodico
// local. Reaproveita exportarVaultZip() (A5) que ja entrega ZIP fiel
// com manifest+sha256, snapshot de stores e binarios preservados. Aqui
// so cuidamos do destino fixo (auto/ dentro de Documents/Ouroboros-Backups/),
// rotacao em ate 4 arquivos e atualizacao do timestamp da ultima
// execucao.
//
// Decisoes (spec §5):
//   - Local-only (ADR-0007). Nenhuma chamada de rede.
//   - Rotacao 4 backups: 1 mes de protecao sem encher disco.
//   - Sem encryption (mesma postura do A5: confianca no usuario).
//   - Web: no-op silencioso (FileSystem nao funciona alem do mock).
//
// Plataforma: Android via expo-file-system/legacy (mesma API que o A5).
// O destino canonico fica em
// `${documentDirectory}Ouroboros-Backups/auto/` para o usuario poder
// inspecionar e copiar manualmente quando quiser.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { exportarVaultZip } from '@/lib/services/exportarVault';
import { getDeviceId } from '@/lib/util/deviceId';
import { sha256Base64 } from '@/lib/crypto/sha256';
import {
  BACKUP_SNAPSHOT_SCHEMA_VERSION,
  type BackupSnapshot,
  serializarFrontmatter as serializarBackupSnapshot,
  parseFrontmatter as parseBackupSnapshot,
} from '@/lib/schemas/backup_snapshot';

// Quantos backups guardamos no destino auto/. Ao chegar no quinto, o
// mais antigo e descartado pre-grava (rotacao). Spec §5.
export const MAX_BACKUPS_AUTO = 4;

// Subpasta canonica para backups automaticos. Manualmente o usuario
// pode pasta paralela para os exports manuais (sprint A5 entrega via
// Sharing.shareAsync, fora desta pasta). Aqui o destino e fixo para
// facilitar a inspecao no Files do Android.
export const BACKUP_AUTO_SUBDIR = 'Ouroboros-Backups/auto';

export interface BackupResultado {
  // Caminho absoluto do arquivo .zip gravado, ou null em falha/no-op.
  uri: string | null;
  // Numero de arquivos versionados no Vault no momento da execucao.
  totalArquivos: number;
  // Quantos backups antigos foram descartados na rotacao. 0 quando
  // ainda nao havia 4 backups.
  rotacionados: number;
  // Mensagem curta para tracking. Sem acento na chave do dict de
  // motivos para manter compat com testing-library getByText quando
  // necessario; texto humano vai pelos toasts da UI (§Settings).
  motivo?: string;
  // R-BACKUP-AUTO: snapshot do backup gerado (tipo/versao/origem/
  // contagem/sha256/criado_em). Ausente quando companion .md falhou
  // ou quando o backup nao foi gravado (uri null).
  snapshot?: BackupSnapshot;
}

// R-BACKUP-AUTO: descritor de um backup arquivado para a UI listar
// os 4 ultimos backups com data + tamanho + checksum (quando companion
// .md ja existe). Backups gerados pela sprint M-BACKUP-AUTOMATICO
// (sem companion) entram na lista com snapshot=null mas com bytes
// vindos do FileSystem.getInfoAsync.
export interface BackupArquivado {
  // Caminho absoluto do .zip (passar para restaurarVaultZip).
  uri: string;
  // Nome do arquivo (sem path), util para ordenacao.
  nome: string;
  // Timestamp do modificationTime do .zip (ms epoch). Cai para 0 quando
  // nao foi possivel ler.
  modificadoEmMs: number;
  // Tamanho em bytes do .zip. 0 quando nao foi possivel ler.
  bytes: number;
  // Snapshot canonico do companion .md (R-BACKUP-AUTO). Null em
  // backups antigos (pre-R-BACKUP-AUTO) ou quando companion falhou.
  snapshot: BackupSnapshot | null;
}

// R-BACKUP-AUTO: lista os <=4 backups arquivados em
// Documents/Ouroboros-Backups/auto/. Ordenacao desc por nome (que
// inclui timestamp lexicografico). Em web/sem-vault devolve [].
export async function listarBackupsArquivados(): Promise<BackupArquivado[]> {
  if (Platform.OS === 'web') return [];
  const dir = await garantirPastaAuto();
  if (!dir) return [];
  const nomes = await listarBackupsOrdenadosDesc(dir);
  const out: BackupArquivado[] = [];
  for (const nome of nomes) {
    const uri = `${dir}${nome}`;
    let modificadoEmMs = 0;
    let bytes = 0;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        const mtime = (info as { modificationTime?: number }).modificationTime;
        if (typeof mtime === 'number') modificadoEmMs = Math.floor(mtime * 1000);
        const sz = (info as { size?: number }).size;
        if (typeof sz === 'number') bytes = sz;
      }
    } catch {
      // ignora; entra com defaults 0
    }
    // Tenta ler companion .md correspondente.
    let snapshot: BackupSnapshot | null = null;
    try {
      const companionUri = `${dir}${companionMdName(nome)}`;
      const info = await FileSystem.getInfoAsync(companionUri);
      if (info.exists) {
        const md = await FileSystem.readAsStringAsync(companionUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        snapshot = parseBackupSnapshot(md);
      }
    } catch {
      // companion ausente/ilegivel: tudo bem, .zip continua restauravel.
    }
    out.push({ uri, nome, modificadoEmMs, bytes, snapshot });
  }
  return out;
}

// Helper exposto para a UI exibir "Ultimo backup: ha X dias.". A unica
// fonte de verdade e o mtime do arquivo .zip mais recente em auto/.
// Em web/sem-vault, devolve null.
export async function lerUltimoBackupMs(): Promise<number | null> {
  if (Platform.OS === 'web') return null;
  const dir = await garantirPastaAuto();
  if (!dir) return null;
  const arquivos = await listarBackupsOrdenadosDesc(dir);
  const recente = arquivos[0];
  if (!recente) return null;
  try {
    const info = await FileSystem.getInfoAsync(`${dir}${recente}`);
    if (!info.exists) return null;
    const m = (info as { modificationTime?: number }).modificationTime;
    if (typeof m !== 'number') return null;
    return Math.floor(m * 1000);
  } catch {
    return null;
  }
}

// Texto humano canonico para "Ultimo backup: ha X dias.". Sentence
// case + acentuacao PT-BR completa (BRIEF §1.4).
export function descreverUltimoBackup(timestampMs: number | null): string {
  if (timestampMs === null) return 'Nenhum backup automático ainda.';
  const delta = Date.now() - timestampMs;
  const UM_MIN = 60 * 1000;
  const UMA_HORA = 60 * UM_MIN;
  const UM_DIA = 24 * UMA_HORA;
  if (delta < UM_MIN) return 'Último backup: agora mesmo.';
  if (delta < UMA_HORA) {
    const min = Math.max(1, Math.floor(delta / UM_MIN));
    return `Último backup: há ${min} min.`;
  }
  if (delta < UM_DIA) {
    const h = Math.max(1, Math.floor(delta / UMA_HORA));
    return `Último backup: há ${h}h.`;
  }
  const d = Math.max(1, Math.floor(delta / UM_DIA));
  if (d === 1) return 'Último backup: há 1 dia.';
  return `Último backup: há ${d} dias.`;
}

// Garante que Documents/Ouroboros-Backups/auto/ existe. Devolve o path
// absoluto com barra final, ou null se documentDirectory nao esta
// disponivel (web/test).
async function garantirPastaAuto(): Promise<string | null> {
  const docDir = FileSystem.documentDirectory;
  if (!docDir) return null;
  const dir = `${docDir}${BACKUP_AUTO_SUBDIR}/`;
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {
    // makeDirectoryAsync pode lancar se ja existe sem flag. Idempotente
    // por convencao: se chegou ate aqui sem getInfo retornar exists,
    // tentamos ainda assim e deixamos o write falhar abaixo se for o
    // caso. Mock do jest aceita.
  }
  return dir;
}

// Lista os arquivos `.zip` da pasta auto/ ordenados do mais recente
// para o mais antigo. O nome canonico e `backup-<YYYYMMDDTHHmmss>.zip`,
// ordenavel lexicograficamente.
async function listarBackupsOrdenadosDesc(dir: string): Promise<string[]> {
  let filhos: string[] = [];
  try {
    filhos = await FileSystem.readDirectoryAsync(dir);
  } catch {
    return [];
  }
  return filhos
    .filter((n) => BACKUP_FILENAME_RE.test(n))
    .sort()
    .reverse();
}

// Aplica rotacao mantendo no maximo MAX_BACKUPS_AUTO arquivos no
// destino. Roda APOS gravar o backup novo: assim, se o write falhar,
// nao apagamos historico bom.
//
// R-BACKUP-AUTO: ao deletar um .zip, deletamos tambem o companion
// .md de mesmo basename (best-effort). Companions orfaos sem .zip
// correspondente sao ignorados pela listagem da UI; nao precisam ser
// agressivamente limpos aqui.
async function rotacionar(dir: string): Promise<number> {
  const ordenados = await listarBackupsOrdenadosDesc(dir);
  if (ordenados.length <= MAX_BACKUPS_AUTO) return 0;
  const excedentes = ordenados.slice(MAX_BACKUPS_AUTO);
  let removidos = 0;
  for (const nome of excedentes) {
    try {
      await FileSystem.deleteAsync(`${dir}${nome}`, { idempotent: true });
      removidos += 1;
    } catch {
      // Falha em deletar nao aborta a sprint. Proxima execucao tenta
      // de novo (idempotente).
    }
    // Tenta apagar companion .md correspondente. Idempotente; se nao
    // existe (backup gerado antes da R-BACKUP-AUTO) ignora.
    try {
      await FileSystem.deleteAsync(`${dir}${companionMdName(nome)}`, {
        idempotent: true,
      });
    } catch {
      // ignora
    }
  }
  return removidos;
}

// Carimba o nome do arquivo no formato canonico ordenavel
// YYYYMMDDTHHmmss. Implementacao manual: Date.toISOString() produz
// formato com tracos, dois pontos e ponto; substituimos esses tres
// separadores por string vazia para chegar ao formato compacto
// ordenavel sem essas marcas.
//
// R-BACKUP-AUTO: opcionalmente sufixa com -<deviceId> para distinguir
// backups originados em devices diferentes (multi-device Syncthing).
// Quando deviceId omitido, mantem o formato historico
// `backup-<TS>.zip` da sprint M-BACKUP-AUTOMATICO.
function carimboNome(now: Date = new Date(), deviceId?: string): string {
  const iso = now.toISOString();
  const semSeparadores = iso
    .split('-')
    .join('')
    .split(':')
    .join('')
    .split('.')
    .join('');
  const ts = semSeparadores.slice(0, 15);
  if (deviceId && deviceId.length > 0) {
    return `backup-${ts}-${deviceId}.zip`;
  }
  return `backup-${ts}.zip`;
}

// R-BACKUP-AUTO: padrao regex para reconhecer arquivos de backup
// gerados pelo executarBackup, com ou sem deviceId. Usado pela
// rotacao + listagem na UI. Aceita variantes:
//   backup-YYYYMMDDTHHMMSS.zip            (M-BACKUP-AUTOMATICO)
//   backup-YYYYMMDDTHHMMSS-<deviceId>.zip (R-BACKUP-AUTO)
export const BACKUP_FILENAME_RE = /^backup-\d{8}T\d{6}(-[a-zA-Z0-9-]+)?\.zip$/;
// Companion .md serializado de BackupSnapshot. Mesmo basename do .zip,
// extensao .md.
export function companionMdName(zipName: string): string {
  return zipName.replace(/\.zip$/, '.md');
}

// Move o arquivo do cacheDirectory (onde exportarVaultZip grava) para
// Documents/Ouroboros-Backups/auto/. Usa copy+delete porque
// FileSystem.moveAsync entre containers diferentes pode falhar em
// certos OEMs (heuristica conservadora).
async function moverParaDestino(
  origem: string,
  destino: string
): Promise<boolean> {
  try {
    // Tenta moveAsync primeiro (mais rapido quando funciona).
    await FileSystem.moveAsync({ from: origem, to: destino });
    return true;
  } catch {
    // Fallback: copy+delete. Se copy ok mas delete falha, ainda fica
    // o arquivo orfao no cache; o limparCache (sprint M15) recolhe.
    try {
      await FileSystem.copyAsync({ from: origem, to: destino });
      try {
        await FileSystem.deleteAsync(origem, { idempotent: true });
      } catch {
        // ignora
      }
      return true;
    } catch {
      return false;
    }
  }
}

// API publica: roda 1 backup completo. Reusa exportarVaultZip do A5
// (que ja gera ZIP com MANIFEST + sha256 + binarios + snapshot de
// stores). Aqui apenas reposicionamos o arquivo no destino canonico
// e aplicamos rotacao.
export async function executarBackup(): Promise<BackupResultado> {
  if (Platform.OS === 'web') {
    return {
      uri: null,
      totalArquivos: 0,
      rotacionados: 0,
      motivo: 'Backup automático não disponível em web.',
    };
  }
  // 1. Gera o ZIP via servico canonico A5. Em sucesso devolve URI no
  // cacheDirectory. Em falha (vault nao configurado, sem permissao),
  // propaga motivo.
  const exportado = await exportarVaultZip();
  if (!exportado.uri) {
    return {
      uri: null,
      totalArquivos: exportado.totalArquivos,
      rotacionados: 0,
      motivo: exportado.motivo,
    };
  }
  // 2. Garante destino. Se documentDirectory ausente, abortamos sem
  // deletar o arquivo no cache (limparCache cuida depois).
  const destino = await garantirPastaAuto();
  if (!destino) {
    return {
      uri: null,
      totalArquivos: exportado.totalArquivos,
      rotacionados: 0,
      motivo: 'documentDirectory ausente.',
    };
  }
  // 3. Move para o destino com nome carimbado (com sufixo deviceId
  // quando disponivel). R-BACKUP-AUTO: sufixo facilita distinguir
  // backups multi-device num Vault compartilhado via Syncthing.
  let deviceId: string | null = null;
  try {
    deviceId = await getDeviceId();
  } catch {
    // deviceId pode falhar em web/test environment; mantemos formato
    // historico backup-<TS>.zip nesses casos.
  }
  const nomeFinal = carimboNome(new Date(), deviceId ?? undefined);
  const destinoFinal = `${destino}${nomeFinal}`;
  const moveOk = await moverParaDestino(exportado.uri, destinoFinal);
  if (!moveOk) {
    return {
      uri: null,
      totalArquivos: exportado.totalArquivos,
      rotacionados: 0,
      motivo: 'Falha ao mover backup para o destino.',
    };
  }
  // 4. Companion .md: calcula sha256 do zip, monta BackupSnapshot e
  // grava ao lado com o mesmo basename. Best-effort: falha aqui nao
  // invalida o backup em si (o .zip ja foi gravado e e' a fonte de
  // verdade).
  let snapshot: BackupSnapshot | null = null;
  try {
    const zipB64 = await FileSystem.readAsStringAsync(destinoFinal, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const sha = sha256Base64(zipB64);
    // bytes_totais = tamanho do .zip gravado. Usamos esse numero como
    // proxy do "bytes_totais" do BackupSnapshot por nao termos o
    // somatorio de bytes originais sem reabrir o ZIP (decisao
    // pragmatica documentada no schema). UI exibe tamanho do .zip mesmo.
    let bytesTotais = 0;
    try {
      const info = await FileSystem.getInfoAsync(destinoFinal);
      if (info.exists) {
        const sz = (info as { size?: number }).size;
        if (typeof sz === 'number') bytesTotais = sz;
      }
    } catch {
      // segue com 0; companion ainda e' util para tipo/origem/sha.
    }
    snapshot = {
      tipo: 'backup_snapshot',
      versao: BACKUP_SNAPSHOT_SCHEMA_VERSION,
      criado_em: new Date().toISOString(),
      origem: deviceId ?? 'desconhecido',
      arquivos_incluidos: exportado.totalArquivos,
      bytes_totais: bytesTotais,
      sha256: sha,
    };
    const md = serializarBackupSnapshot(snapshot);
    const companionUri = destino + companionMdName(nomeFinal);
    await FileSystem.writeAsStringAsync(companionUri, md, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    // Companion falhou. Backup .zip continua valido e e' a fonte
    // canonica. Sem rethrow.
  }
  // 5. Rotaciona mantendo MAX_BACKUPS_AUTO. Roda DEPOIS do write para
  // nao apagar historico bom em caso de falha. Companion .md tambem
  // entra na rotacao em rotacionar() abaixo.
  const rotacionados = await rotacionar(destino);
  return {
    uri: destinoFinal,
    totalArquivos: exportado.totalArquivos,
    rotacionados,
    snapshot: snapshot ?? undefined,
  };
}
