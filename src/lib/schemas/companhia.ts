// Tipo canonico de companhia (P3, 2026-09-08).
//
// O onboarding pergunta "Voces sao..." e coleta tres respostas:
// sozinho, casal ou amigos. Ate esta sprint, useSettings colapsava
// casal e amigos em 'duo' no mesmo instante em que o onboarding
// coletava a distincao (onboarding.ts:107-109), e a superficie que le
// useSettings so sabia dizer "casal" para quem respondeu amigos.
//
// Aqui vive o tipo unico, para que os dois stores parem de declarar
// dois tipos homonimos com dominios diferentes.
//
// LEITURA TOLERANTE DO LEGADO: instalacao anterior a esta sprint tem
// 'duo' persistido no SecureStore, no .md de _estado/settings-*.md e
// no snapshot-settings.json de um backup ja exportado. Nada disso pode
// quebrar nem virar 'sozinho' (que esconderia a segunda pessoa de quem
// tem uma). 'duo' le como 'casal'; o BootHook
// reconciliarTipoCompanhiaHook corrige para 'amigos' no boot seguinte,
// porque useOnboarding sempre guardou a resposta verdadeira.
//
// Comentarios sem acento (convencao shell/CI).
import { z } from 'zod';

export type TipoCompanhia = 'sozinho' | 'casal' | 'amigos';

export const TIPOS_COMPANHIA: readonly TipoCompanhia[] = [
  'sozinho',
  'casal',
  'amigos',
] as const;

// Valor legado gravado por versoes anteriores em useSettings.
export const TIPO_COMPANHIA_LEGADO_DUO = 'duo' as const;

export function ehTipoCompanhia(valor: unknown): valor is TipoCompanhia {
  return valor === 'sozinho' || valor === 'casal' || valor === 'amigos';
}

// Normaliza qualquer valor lido de disco. Aceita os tres canonicos e o
// legado 'duo'; qualquer outra coisa (undefined, null, shape corrompido)
// cai no fallback.
export function normalizarTipoCompanhia(
  valor: unknown,
  fallback: TipoCompanhia = 'sozinho'
): TipoCompanhia {
  if (ehTipoCompanhia(valor)) return valor;
  if (valor === TIPO_COMPANHIA_LEGADO_DUO) return 'casal';
  return fallback;
}

// Schema para frontmatter e snapshot. O preprocess e' o que mantem
// legivel o .md ja escrito com 'duo'.
export const TipoCompanhiaSchema = z.preprocess(
  (v) => (v === TIPO_COMPANHIA_LEGADO_DUO ? 'casal' : v),
  z.enum(['sozinho', 'casal', 'amigos'])
);

// Predicado unico para "existe uma segunda pessoa". Substitui as
// comparacoes espalhadas contra o literal 'duo'.
export function temSegundaPessoa(tipo: TipoCompanhia): boolean {
  return tipo !== 'sozinho';
}
