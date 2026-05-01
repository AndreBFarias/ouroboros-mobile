// Salva um exercicio no Vault (criacao ou edicao). Quando o caller
// fornece um URI temporario de GIF (do expo-document-picker), copia
// o arquivo para assets/exercicios/<slug>.gif e atualiza meta.gif
// com o path relativo. Em edicao, se o usuario nao trocou o GIF, o
// caller passa gifTemporario=null e o meta.gif preserva o valor
// anterior.
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
// Imports diretos aos modulos finais (nao ao barrel @/lib/vault)
// para evitar ciclo de carregamento durante jest.requireActual nos
// testes que mockam o barrel.
import { exerciciosGifPath } from '@/lib/vault/paths';
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

// Concatena root SAF e path relativo, normalizando barras.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Limit de 5MB para o GIF (decisao do spec). Caller mostra toast de
// erro se exceder.
export const GIF_MAX_BYTES = 5 * 1024 * 1024;

// Valida tamanho do GIF lendo getInfoAsync. Em ambiente sem
// FileSystem.getInfoAsync (web mock), pula validacao.
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
    const relGif = exerciciosGifPath(parsed.data.slug);
    const destinoUri = joinUri(vaultRoot, relGif);
    await FileSystem.copyAsync({ from: gifTemporario, to: destinoUri });
    gifGravado = relGif;
    metaFinal = { ...parsed.data, gif: relGif };
  }

  const { uri } = await escreverExercicio(vaultRoot, metaFinal, body);
  return { uri, gifGravado };
}
