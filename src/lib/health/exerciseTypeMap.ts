// Mapa de exerciseType (enum int do Health Connect) para nome PT-BR.
// R-INT-3-HC-AUTOPULL-EXERCICIO (2026-05-25).
//
// Os valores int seguem a constante ExerciseSessionRecord.ExerciseType
// do androidx.health.connect.client. Cobrimos os tipos mais comuns
// registrados por wearables e apps de terceiros (Strava, Google Fit,
// Samsung Health). Tipos fora do mapa caem no fallback canonico
// "Atividade fisica" via exerciseTypePtbr.
//
// Nomes em PT-BR Sentence case, com acentuacao completa, pois compoem
// o titulo da sessao gravada no Vault (texto visivel ao usuario na
// listagem de treinos). Os comentarios permanecem sem acento
// (convencao shell/CI).
//
// Referencia oficial dos codigos:
// https://developer.android.com/reference/androidx/health/connect/client/records/ExerciseSessionRecord

// Fallback usado para qualquer exerciseType ausente do mapa (inclui o
// codigo 0 = OTHER_WORKOUT do HC e valores desconhecidos).
export const EXERCICIO_PTBR_FALLBACK = 'Atividade física';

// Codigos canonicos do HC -> rotulo PT-BR. Lista nao-exaustiva dos
// 80+ tipos: cobre os de maior incidencia. Ausentes usam o fallback.
export const EXERCISE_TYPES_PTBR: Record<number, string> = {
  2: 'Badminton',
  4: 'Beisebol',
  5: 'Basquete',
  8: 'Ciclismo',
  9: 'Ciclismo indoor',
  10: 'Boliche',
  11: 'Boxe',
  13: 'Calistenia',
  14: 'Críquete',
  16: 'Dança',
  25: 'Elíptico',
  26: 'Treino funcional',
  27: 'Esgrima',
  28: 'Futebol americano',
  29: 'Futebol',
  31: 'Frisbee',
  32: 'Golfe',
  33: 'Ginástica',
  34: 'Handebol',
  35: 'Treino intervalado de alta intensidade',
  36: 'Hóquei',
  37: 'Corrida em escada',
  38: 'Escalada',
  39: 'Patinação no gelo',
  44: 'Artes marciais',
  46: 'Paddle',
  47: 'Parapente',
  48: 'Pilates',
  50: 'Racquetball',
  51: 'Escalada em rocha',
  52: 'Remo',
  53: 'Remo indoor',
  54: 'Rugby',
  56: 'Corrida',
  57: 'Corrida na esteira',
  58: 'Vela',
  59: 'Esportes aquáticos',
  60: 'Patinação',
  61: 'Esqui',
  62: 'Snowboard',
  63: 'Surfe de neve',
  64: 'Futebol de salão',
  65: 'Squash',
  66: 'Escada simulada',
  68: 'Musculação',
  70: 'Surfe',
  71: 'Natação em águas abertas',
  72: 'Natação em piscina',
  73: 'Tênis de mesa',
  74: 'Tênis',
  76: 'Vôlei',
  77: 'Caminhada',
  78: 'Polo aquático',
  79: 'Levantamento de peso',
  80: 'Cadeira de rodas',
  81: 'Yoga',
  82: 'Esqui aquático',
};

// Resolve o rotulo PT-BR de um exerciseType. Codigo ausente do mapa
// (inclui OTHER_WORKOUT=0 e qualquer valor novo) cai no fallback.
export function exerciseTypePtbr(tipo: number | null | undefined): string {
  if (typeof tipo !== 'number' || !Number.isFinite(tipo)) {
    return EXERCICIO_PTBR_FALLBACK;
  }
  return EXERCISE_TYPES_PTBR[tipo] ?? EXERCICIO_PTBR_FALLBACK;
}

// Mapa de packageName do Android -> nome humanizado da origem. Usado
// para preencher fonte_hc_origin a partir de metadata.dataOrigin. App
// fora do mapa exibe o proprio packageName (melhor que nada). Sem
// dataOrigin disponivel, usa o fallback generico.
const ORIGENS_HC: Record<string, string> = {
  'com.strava': 'Strava',
  'com.google.android.apps.fitness': 'Google Fit',
  'com.google.android.apps.healthdata': 'Conexão Saúde',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.samsung.android.app.health': 'Samsung Health',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.xiaomi.wearable': 'Mi Fitness',
  'com.huami.watch.hmwatchmanager': 'Zepp',
  'com.mc.miband1': 'Notify for Mi Band',
};

// Fallback quando dataOrigin nao informa um packageName conhecido nem
// um packageName cru utilizavel.
export const ORIGEM_HC_FALLBACK = 'Health Connect';

// Humaniza o packageName de dataOrigin. packageName conhecido vira
// nome amigavel; desconhecido mas presente retorna o proprio
// packageName; ausente retorna o fallback.
export function origemHcHumanizada(
  packageName: string | null | undefined
): string {
  if (typeof packageName !== 'string' || packageName.trim() === '') {
    return ORIGEM_HC_FALLBACK;
  }
  return ORIGENS_HC[packageName] ?? packageName;
}
