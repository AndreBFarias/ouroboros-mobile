// Salva um exercício no Vault (criacao ou edicao). Quando o caller
// fornece um URI temporario de GIF (do expo-document-picker), copia
// o arquivo para gif/exercicio-<slug>.gif (layout-por-tipo H2,
// ADR-0023) e atualiza meta.gif com o path relativo (cross-link
// frontmatter). Em seguida escreve o companion .md em
// markdown/exercicio-<slug>.md. Em edicao, se o usuario não trocou
// o GIF, o caller passa gifTemporario=null e o meta.gif preserva o
// valor anterior.
//
// I-EXERCICIO (M-SAVE-EXERCICIO-VALIDA, 2026-05-07): migra joinUri
// local para vaultUriJoin canonico (H1 do plano golden-zebra). Helper
// canonico (paths.ts:27) limpa trailing whitespace/%20/'/' que SAF
// aplicava em runtime real (sintoma A29 em OEMs MIUI/OneUI/HyperOS).
// Sem essa limpeza, copyAsync({ from, to }) lancava IOException no
// destino corrompido (`/tree/primary:Protocolo-Ouroboros /assets/...
// directory cannot be created` -- screenshot empirico 466875db).
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
// Imports diretos aos modulos finais (não ao barrel @/lib/vault)
// para evitar ciclo de carregamento durante jest.requireActual nos
// testes que mockam o barrel.
import { exercicioGifPath, vaultUriJoin } from '@/lib/vault/paths';
import { escreverExercicio } from '@/lib/vault/exercicios';
import { ExercicioSchema, type Exercicio } from '@/lib/schemas/exercicio';

export interface SaveExercicioArgs {
  meta: Exercicio;
  body?: string;
  vaultRoot: string;
  // URI local (file:// ou content://) do GIF escolhido no picker.
  // null = sem GIF novo (manter o existente em edicao, ou ficar
  // sem GIF em criacao).
  gifTemporario: string | null;
}

export interface SaveExercicioResult {
  uri: string;
  // Path relativo ao Vault que foi efetivamente escrito em
  // assets/exercicios/. null quando nenhum GIF novo foi gravado.
  gifGravado: string | null;
}

// Limit de 5MB para o GIF (decisão do spec). Caller mostra toast de
// erro se exceder.
export const GIF_MAX_BYTES = 5 * 1024 * 1024;

// Valida tamanho do GIF lendo getInfoAsync. Em ambiente sem
// FileSystem.getInfoAsync (web mock), pula validação.
async function validarGif(gifTemporario: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(gifTemporario);
    if (info.exists && typeof info.size === 'number' && info.size > GIF_MAX_BYTES) {
      throw new Error(
        `arquivo maior que limite (${Math.round(info.size / 1024 / 1024)}MB > 5MB)`
      );
    }
  } catch (err) {
    // Re-propaga o erro de tamanho, mas absorve falha de leitura
    // de info quando o picker devolve URI sem stat (web mock).
    if (err instanceof Error && err.message.includes('limite')) {
      throw err;
    }
  }
}

export async function saveExercicio(
  args: SaveExercicioArgs
): Promise<SaveExercicioResult> {
  const { meta, body = '', vaultRoot, gifTemporario } = args;

  // Defensivo: revalida o meta antes de tocar em I/O.
  const parsed = ExercicioSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`exercicio invalido: ${parsed.error.message}`);
  }

  let gifGravado: string | null = null;
  let metaFinal: Exercicio = parsed.data;

  if (typeof gifTemporario === 'string' && gifTemporario.length > 0) {
    await validarGif(gifTemporario);
    const relGif = exercicioGifPath(parsed.data.slug);
    const destinoUri = vaultUriJoin(vaultRoot, relGif);
    await FileSystem.copyAsync({ from: gifTemporario, to: destinoUri });
    gifGravado = relGif;
    metaFinal = { ...parsed.data, gif: relGif };
  }

  const { uri } = await escreverExercicio(vaultRoot, metaFinal, body);
  return { uri, gifGravado };
}
