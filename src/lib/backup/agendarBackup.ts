// Sprint M-BACKUP-AUTOMATICO (Bloco C5) — agendamento periodico.
//
// Decisao de plataforma: Expo Go puro nao expoe expo-task-manager nem
// expo-background-fetch sem dev-client. Para nao puxar dependencia
// nova nem forcar dev-client (ADR-0003 mantem builds simples), o
// agendamento aqui e "best-effort em foreground": no boot do app
// (helper plugado em _layout via avaliarBackupAutomatico), avaliamos
// se passou >= 7 dias desde a ultima execucao e disparamos
// executarBackup() inline. Enquanto o app fica aberto, um setInterval
// reavalia a cada hora.
//
// Esse modelo cobre o caso real: o usuario abre o app praticamente
// todo dia (consulta humor/diario). Em pior caso (semana inteira sem
// abrir), o backup acontece na proxima abertura. Nao perdemos
// integridade — perdemos, no maximo, atraso de alguns dias.
//
// Quando o toggle backupAutomaticoSemanal estiver OFF (default), nem
// registramos o timer. Quando o usuario liga, o avaliarBackupAutomatico
// passa a checar e o timer comeca.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import { useSettings } from '@/lib/stores/settings';
import {
  executarBackup,
  lerUltimoBackupMs,
  type BackupResultado,
} from '@/lib/backup/executarBackup';

// Intervalo entre execucoes automaticas (7 dias). Spec §2.
export const INTERVALO_BACKUP_MS = 7 * 24 * 60 * 60 * 1000;

// Periodicidade do reavaliador foreground enquanto o app fica aberto.
// 1h e ponto-cego razoavel: o usuario nao precisa fechar/abrir para o
// backup acontecer no dia certo. Em testes, exposto via dependency
// injection para evitar timer real.
export const PERIODICIDADE_AVALIACAO_MS = 60 * 60 * 1000;

// Estado do timer foreground. Mantido em modulo para evitar registrar
// 2 timers se avaliarBackupAutomatico for chamado mais de uma vez no
// boot (defesa contra reload em dev/HMR).
let timerHandle: ReturnType<typeof setInterval> | null = null;

export interface AvaliarOptions {
  // Substituivel em testes para nao tocar relogio real.
  agora?: () => number;
  // Substituivel em testes para nao registrar setInterval real e nao
  // depender do toggle store.
  iniciarTimer?: boolean;
  // Override do executor (inject para testes deterministicos).
  executor?: () => Promise<BackupResultado>;
  // Override do leitor de timestamp do ultimo backup.
  leitorUltimo?: () => Promise<number | null>;
}

// API publica: chamada no boot pelo helper de bootstrap (a integrar
// em sprint futura ou no _layout). Em web/sem-toggle, no-op.
//
// Comportamento:
//   1. Se toggle OFF, garante que nao ha timer ativo (limpa se houver)
//      e retorna sem fazer nada.
//   2. Se toggle ON, le ultimo backup e dispara executor caso delta
//      >= INTERVALO_BACKUP_MS. Independente do disparo, registra timer
//      para reavaliar a cada PERIODICIDADE_AVALIACAO_MS.
export async function avaliarBackupAutomatico(
  opts: AvaliarOptions = {}
): Promise<{ disparou: boolean; resultado: BackupResultado | null }> {
  const ativo = useSettings.getState().featureToggles.backupAutomaticoSemanal;
  // Web: a UX faz sentido (o toggle aparece em settings), mas a
  // execucao depende de FileSystem real. Mantemos no-op para o
  // ambiente web ate dev-client cobrir.
  if (Platform.OS === 'web' || !ativo) {
    cancelarTimer();
    return { disparou: false, resultado: null };
  }
  const agora = opts.agora ? opts.agora() : Date.now();
  const leitor = opts.leitorUltimo ?? lerUltimoBackupMs;
  const executor = opts.executor ?? executarBackup;
  const ultimoMs = await leitor();
  const passou =
    ultimoMs === null ? true : agora - ultimoMs >= INTERVALO_BACKUP_MS;

  // Registra timer foreground (se ainda nao registrou). Sempre que o
  // app permanece aberto, daqui PERIODICIDADE_AVALIACAO_MS revaliamos.
  if (opts.iniciarTimer !== false) {
    registrarTimer();
  }

  if (!passou) {
    return { disparou: false, resultado: null };
  }
  const resultado = await executor();
  return { disparou: true, resultado };
}

// Inicia timer foreground (idempotente). Reavalia o estado completo
// — se o usuario desligar o toggle, a proxima passagem cancela.
function registrarTimer(): void {
  if (timerHandle !== null) return;
  timerHandle = setInterval(() => {
    void avaliarBackupAutomatico({ iniciarTimer: false });
  }, PERIODICIDADE_AVALIACAO_MS);
}

// Cancela timer ativo (no-op se nao havia). Usado quando o usuario
// desliga o toggle ou o app entra em modo background prolongado
// (sprint futura pode chamar aqui via AppState).
export function cancelarTimer(): void {
  if (timerHandle === null) return;
  clearInterval(timerHandle);
  timerHandle = null;
}

// Helper de teste: indica se o timer foreground esta ativo. Nao
// expor em codigo de producao alem de debug.
export function timerAtivo(): boolean {
  return timerHandle !== null;
}
