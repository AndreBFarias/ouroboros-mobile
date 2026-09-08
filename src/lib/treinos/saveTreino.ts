// Salva uma sessao de treino formal no Vault. Wrapper sobre
// escreverTreino que valida o meta com TreinoSessaoSchema antes de
// tocar I/O e deriva o slug a partir da rotina (ou fallback).
//
// EXE-1 (2026-09-08): `slugOverride` virou `relOverride`. O slug sozinho
// nao identificava mais o arquivo depois que a hora entrou no nome, e a
// edicao precisa escrever exatamente onde o arquivo esta -- por isso o
// override e' o path relativo inteiro, vindo da listagem.
//
// EXE-3B (2026-09-08): apos o save bem-sucedido, grava carga/series/reps
// no historico de cada exercicio cadastrado que a sessao cita. Best-effort
// pelo mesmo motivo do bloco do Health Connect abaixo: a sessao ja esta no
// disco e o historico e' derivado dela. Nao entra em `escreverTreino`
// porque o puxador do HC chama aquele writer direto, e o `nome` que ele
// grava e' rotulo de tipo de exercicio, nao exercicio cadastrado.
//
// Q17.c (Onda Q, 2026-05-13): apos save bem-sucedido, opcionalmente
// grava o treino tambem no Health Connect (opt-in via
// settings.featureToggles.healthConnectSync). Best-effort — falha
// no HC nao falha o save local.
//
// Comentarios sem acento (convencao shell/CI).
import { escreverTreino } from '@/lib/vault/treinos';
import {
  TreinoSessaoSchema,
  type TreinoSessao,
} from '@/lib/schemas/treino_sessao';
import { slugifyTreino } from '@/lib/treinos/slug';
import { registrarHistoricoDaSessao } from '@/lib/exercicios/registrarHistoricoDaSessao';
import { escreverTreinoEmHC } from '@/lib/health/sync';
import { useSettings } from '@/lib/stores/settings';

export interface SaveTreinoArgs {
  meta: TreinoSessao;
  body?: string;
  vaultRoot: string;
  // EXE-1: override opcional do path relativo completo (ex:
  // 'treinos/2026-04-23-0712-rotina-a.md'). Quando ausente, o path e'
  // derivado de (data, hora, slug da rotina). Em edicao o caller passa
  // o `rel` que veio da listagem, entao a sessao e' reescrita onde ela
  // esta -- inclusive quando o usuario renomeia a rotina, e inclusive
  // quando o arquivo ainda esta no formato legado sem hora.
  relOverride?: string;
}

export interface SaveTreinoResult {
  uri: string;
  rel: string;
  slug: string;
  // EXE-3B: quantos arquivos de exercicio ganharam entrada de historico
  // nesta gravacao. Zero e' resultado legitimo -- sessao so' com nomes
  // digitados a mao nao casa com exercicio cadastrado nenhum. O caller da
  // UI nao usa este numero; ele existe para que o teste afirme o efeito
  // sem espiar mock interno.
  historicoAtualizados: number;
}

export async function saveTreino(
  args: SaveTreinoArgs
): Promise<SaveTreinoResult> {
  const { meta, body = '', vaultRoot, relOverride } = args;

  const parsed = TreinoSessaoSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`treino invalido: ${parsed.error.message}`);
  }

  const slug = slugifyTreino(parsed.data.rotina ?? 'treino');

  const { uri, rel } = await escreverTreino(
    vaultRoot,
    slug,
    parsed.data,
    body,
    typeof relOverride === 'string' && relOverride.length > 0
      ? { relOverride }
      : undefined
  );

  // EXE-3B: historico por exercicio. Best-effort — a sessao ja esta no
  // disco e o historico e' derivado dela; falha aqui nao pode transformar
  // um save bem-sucedido em erro na tela.
  let historicoAtualizados = 0;
  try {
    const historico = await registrarHistoricoDaSessao({
      vaultRoot,
      sessao: parsed.data,
    });
    historicoAtualizados = historico.atualizados;
  } catch {
    // Silencioso por design (path nao-critico).
  }

  // Q17.c: sync opt-in para Health Connect. Best-effort — falha aqui
  // nao impacta o caller (save no Vault ja aconteceu).
  try {
    const habilitado = useSettings.getState().featureToggles.healthConnectSync;
    if (habilitado) {
      void escreverTreinoEmHC(parsed.data);
    }
  } catch {
    // Sem hook React: usar getState (sincrono). Erros aqui sao
    // silenciosos por design (path nao-critico).
  }

  return { uri, rel, slug, historicoAtualizados };
}
