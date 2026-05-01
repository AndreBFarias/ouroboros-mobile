// Presets nomeados de snap points do BottomSheet. Arrays imutaveis
// (readonly) para que cada tela apenas referencie a constante sem
// recriar literais a cada render.
//
// SHEET_DEFAULT mantem o par ['40%', '85%'] adotado em M01.4 quando
// o BottomSheet ganhou seu fallback. Telas que abrem em snap unico
// (humor rapido, eventos, diario) consomem os presets de altura
// fixa abaixo. Nao trocar valores sem revisao explicita; varias
// telas calibraram conteudo com altura especifica.
export const SHEET_60: readonly string[] = ['60%'] as const;
export const SHEET_70: readonly string[] = ['70%'] as const;
export const SHEET_80: readonly string[] = ['80%'] as const;
export const SHEET_90: readonly string[] = ['90%'] as const;
export const SHEET_DEFAULT: readonly string[] = ['40%', '85%'] as const;
