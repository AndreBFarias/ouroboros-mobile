// Tipos compartilhados entre src/lib/health/* e src/lib/stores/settings.ts.
// Extraido para quebrar ciclo de import potencial:
//
//   settings.ts importa TipoHC (campo hcAutopullUltimaSync)
//   autopullScheduler.ts importa useSettings (lê/escreve ultimaSync)
//
// Sem este arquivo, settings.ts -> autopullScheduler.ts -> settings.ts
// criaria ciclo. Mesmo `import type` (elidido em runtime) pode causar
// warning de bundler ou ordem de inicializacao ruim. Tipo puro em
// arquivo dedicado e cirurgico.
//
// Comentarios sem acento.

// Tipos canonicos do Health Connect que o app puxa. Espelham os
// recordTypes suportados pelo modules/health-connect bridge nativa.
export type TipoHC =
  | 'Steps'
  | 'ExerciseSession'
  | 'Weight'
  | 'BodyFat'
  | 'HeartRate'
  | 'SleepSession'
  | 'MenstruationFlow';
