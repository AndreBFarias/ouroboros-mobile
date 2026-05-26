// Agregador de metadados de backup Drive para o card do hub de
// integracoes. R-INT-5-DRIVE-HUB-ATIVO (2026-05-25).
//
// REUSO (nao recriamos nada):
//   - Backups locais: listarBackupsArquivados() de executarBackup.ts ja
//     enumera os <=4 ZIPs em Documents/Ouroboros-Backups/auto/ com nome,
//     mtime e bytes. Esse ZIP local e' exatamente o artefato que
//     fazerBackupDrive sobe para o Drive (driveBackup.ts sobe o mais
//     recente). Portanto a contagem/tamanho local e' o espelho fiel do
//     que existe (ou existira no proximo upload) na nuvem.
//   - Ultimo upload Drive: driveBackupUltimaSync no settings store, ja
//     escrito pelo wiring apos cada upload OK.
//
// Por que nao consultar o Drive remoto aqui: o scope drive.file fica
// DORMENTE ate o passo humano R-SEC-1 (registro no Cloud Console). Sem
// ele, um files.list remoto falharia ou exigiria rede de saida sem
// consentimento. O resumo honesto usa o estado local + o timestamp do
// ultimo upload confirmado, sem inventar dados de nuvem que nao podemos
// ler ainda.
//
// Arquitetura de testabilidade: montarDriveResumo recebe TODAS as deps
// por injecao (numero de backups, bytes, ultimo upload iso). O adapter
// carregarDriveResumo monta as deps reais via import lazy, mantendo o
// modulo importavel em testes puros sem arrastar a cadeia nativa do
// Expo.
//
// Comentarios sem acento (convencao shell/CI). Strings de UI em PT-BR
// sentence case com acentuacao.
import type { BackupArquivado } from '@/lib/backup/executarBackup';

// Resumo consumido pelo card Drive. Numeros agregados + textos prontos
// para a UI (ja em PT-BR sentence case com acentuacao).
export interface DriveResumo {
  // Quantidade de backups locais disponiveis para enviar/restaurar.
  totalBackups: number;
  // Soma dos bytes dos backups locais.
  bytesTotais: number;
  // Epoch ms do ultimo upload Drive confirmado. null = nunca enviado.
  ultimoUploadMs: number | null;
  // Linha 2 do card, pronta para render.
  texto: string;
}

// Deps puras de montarDriveResumo. A funcao publica preenche com leitura
// real do FileSystem (backups locais) e do settings store (ultimo sync).
export interface DriveResumoDeps {
  // Backups locais arquivados (mesmo artefato que sobe para o Drive).
  backupsLocais: BackupArquivado[];
  // ISO string do ultimo upload Drive confirmado, ou null.
  ultimoUploadIso: string | null;
}

// Converte bytes em texto humano curto. Usa base 1024 e uma casa
// decimal para KB/MB; bytes crus abaixo de 1 KB.
export function formatarBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  const KB = 1024;
  const MB = KB * 1024;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${bytes} B`;
}

// Texto humano para "ultimo backup na nuvem". Espelha os thresholds de
// descreverUltimoBackup (executarBackup.ts) mas com a copy "na nuvem"
// para deixar claro que e' o upload Drive, nao o backup local.
export function textoUltimoUpload(ms: number | null): string {
  if (ms === null || ms <= 0) return 'Nenhum backup na nuvem ainda.';
  const delta = Date.now() - ms;
  const UM_MIN = 60 * 1000;
  const UMA_HORA = 60 * UM_MIN;
  const UM_DIA = 24 * UMA_HORA;
  if (delta < UM_MIN) return 'Último envio: agora mesmo.';
  if (delta < UMA_HORA) {
    const min = Math.max(1, Math.floor(delta / UM_MIN));
    return `Último envio: há ${min} min.`;
  }
  if (delta < UM_DIA) {
    const h = Math.max(1, Math.floor(delta / UMA_HORA));
    return `Último envio: há ${h}h.`;
  }
  const d = Math.max(1, Math.floor(delta / UM_DIA));
  if (d === 1) return 'Último envio: há 1 dia.';
  return `Último envio: há ${d} dias.`;
}

// Parser tolerante de ISO -> epoch ms. Retorna null para entradas
// vazias/invalidas (nunca lanca).
function isoParaMs(iso: string | null): number | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

// Executor puro: agrega os backups locais + o timestamp do ultimo
// upload Drive em um DriveResumo pronto para a UI. Nunca lanca.
export function montarDriveResumo(deps: DriveResumoDeps): DriveResumo {
  const totalBackups = deps.backupsLocais.length;
  const bytesTotais = deps.backupsLocais.reduce(
    (acc, b) => acc + (Number.isFinite(b.bytes) ? b.bytes : 0),
    0
  );
  const ultimoUploadMs = isoParaMs(deps.ultimoUploadIso);
  // Quando nao ha backup local, o usuario ainda nao gerou nada para
  // subir. Mensagem orienta sem alarmismo.
  if (totalBackups === 0) {
    return {
      totalBackups: 0,
      bytesTotais: 0,
      ultimoUploadMs,
      texto: 'Nenhum backup local para enviar ainda.',
    };
  }
  const plural = totalBackups === 1 ? 'backup' : 'backups';
  const texto = `${totalBackups} ${plural} · ${formatarBytes(
    bytesTotais
  )} · ${textoUltimoUpload(ultimoUploadMs)}`;
  return { totalBackups, bytesTotais, ultimoUploadMs, texto };
}

// Adapter de runtime: carrega backups locais e o ultimo upload Drive,
// e delega ao executor puro. Import lazy (require CJS) para manter o
// modulo importavel em testes sem a cadeia nativa do Expo, espelhando
// driveBackup.ts.
export async function carregarDriveResumo(): Promise<DriveResumo> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { listarBackupsArquivados } = require('@/lib/backup/executarBackup') as typeof import('@/lib/backup/executarBackup');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useSettings } = require('@/lib/stores/settings') as typeof import('@/lib/stores/settings');
  let backupsLocais: BackupArquivado[] = [];
  try {
    backupsLocais = await listarBackupsArquivados();
  } catch {
    // Sem vault / web / erro de FileSystem: resumo vazio honesto.
    backupsLocais = [];
  }
  const ultimoUploadIso = useSettings.getState().driveBackupUltimaSync;
  return montarDriveResumo({ backupsLocais, ultimoUploadIso });
}
