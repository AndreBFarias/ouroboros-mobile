// Reader/writer + path canonico de marcacoes de rotina (R-SF-3).
// Cada arquivo agrupa marcacoes do mesmo dia para uma mesma rotina:
//   markdown/rotina-marcacao-<slug>-<YYYY-MM-DD>.md
//
// Decisao de path: 1 arquivo por (rotina, dia) em vez de:
//   - 1 arquivo por marcacao -> explode quantidade de .md no Vault e
//     no Syncthing (rotina diaria por 90 dias = 90 arquivos so dela).
//   - 1 arquivo unico por rotina com array gigante -> conflitos de
//     Syncthing quando dois devices marcam no mesmo dia (merge yaml
//     impossivel sem perda).
// Agregacao diaria e' o ponto de equilibrio: max 1 entrada/dia/rotina
// (compativel com fluxo "marquei Venvanse hoje") e cap defensivo
// MAX_MARCACOES_DIA dentro do dia.
//
// API:
//  - registrarMarcacao: tap rapido. Le-ou-cria o arquivo do dia,
//    append idempotente, persiste. Retorna meta atualizada.
//  - listarMarcacoesUltimosDias: le N arquivos diarios e retorna lista
//    em ordem cronologica reversa (mais recente primeiro). Usado pela
//    UI de timeline + helper de aderencia semanal.
//  - silenciarLembreteHoje: marca o campo silenciar_lembrete_ate ate
//    fim do dia local; usado quando usuario marca antes do alarme
//    companion disparar.
//
// Comentarios sem acento (convencao shell/CI).
import {
  MARKDOWN_FOLDER,
  formatDateYmd,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { writeVaultFile } from '@/lib/vault/writer';
import {
  RotinaMarcacaoSchema,
  type RotinaMarcacao,
} from '@/lib/schemas/rotina_marcacao';
import {
  appendMarcacao,
  calcularSilenciarLembreteAte,
} from '@/lib/rotinas/marcacao';

const DIA_MS = 24 * 60 * 60 * 1000;

// markdown/rotina-marcacao-<slug>-<YYYY-MM-DD>.md
// Local (nao em paths.ts) para minimizar surface area do helper
// compartilhado; quando novas features tocarem rotina-marcacao,
// promover para paths.ts.
export function rotinaMarcacaoPath(slug: string, data: Date): string {
  return `markdown/rotina-marcacao-${slug}-${formatDateYmd(data)}.md`;
}

const PREFIXO_FEATURE = 'rotina-marcacao-';

// Le a entrada do dia (ou null se nao existir). Helper interno + util
// para callers que querem inspecionar antes de tocar.
export async function lerMarcacaoDia(
  vaultRoot: string,
  slug: string,
  data: Date
): Promise<RotinaMarcacao | null> {
  const rel = rotinaMarcacaoPath(slug, data);
  const uri = vaultUriJoin(vaultRoot, rel);
  const result = await readVaultFile(uri, RotinaMarcacaoSchema);
  return result ? result.meta : null;
}

// Registra uma marcacao (tap do botao). Le entrada do dia, append
// idempotente, persiste e retorna meta final. Caller deve passar
// agora (Date) e autor; helper resolve YYYY-MM-DD via fuso canonico.
//
// Idempotencia: dois taps com mesmo ts ISO (segundo identico) sao
// consolidados via appendMarcacao (no-op no 2o). Para criar marcacao
// distinta no mesmo segundo, caller precisa avancar ts em >=1s.
export async function registrarMarcacao(
  vaultRoot: string,
  args: {
    rotinaSlug: string;
    autor: 'pessoa_a' | 'pessoa_b';
    agora: Date;
  }
): Promise<RotinaMarcacao> {
  const { rotinaSlug, autor, agora } = args;
  const tsIso = agora.toISOString().replace('Z', '-03:00').replace('.000', '');
  const data = formatDateYmd(agora);

  const existente = await lerMarcacaoDia(vaultRoot, rotinaSlug, agora);
  const novasMarcacoes = appendMarcacao(existente?.marcacoes ?? [], tsIso);

  const proposto: RotinaMarcacao = {
    tipo: 'rotina_marcacao',
    rotina_slug: rotinaSlug,
    data,
    autor,
    marcacoes: novasMarcacoes,
    silenciar_lembrete_ate: existente?.silenciar_lembrete_ate ?? null,
  };

  const parsed = RotinaMarcacaoSchema.safeParse(proposto);
  if (!parsed.success) {
    throw new Error(`rotina_marcacao invalida: ${parsed.error.message}`);
  }

  const rel = rotinaMarcacaoPath(rotinaSlug, agora);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<RotinaMarcacao>(uri, parsed.data, '');
  return parsed.data;
}

// Lista todas as entradas de uma rotina nos ultimos `janelaDias` dias
// (incluindo hoje). Retorna em ordem cronologica reversa (mais recente
// primeiro), filtrando por autor para preservar privacidade do Vault
// (mesmo padrao de rotina.ts).
//
// Estrategia: enumera dias da janela, le cada arquivo se existir
// (skip ausentes), agrega. Custa <=janelaDias I/O reads; para a
// janela canonica de 7 dias e' barato.
export async function listarMarcacoesUltimosDias(
  vaultRoot: string,
  args: {
    rotinaSlug: string;
    autor: 'pessoa_a' | 'pessoa_b';
    agora?: Date;
    janelaDias?: number;
  }
): Promise<RotinaMarcacao[]> {
  const { rotinaSlug, autor } = args;
  const agora = args.agora ?? new Date();
  const janelaDias = args.janelaDias ?? 7;

  const entradas: RotinaMarcacao[] = [];
  for (let i = 0; i < janelaDias; i++) {
    const d = new Date(agora.getTime() - i * DIA_MS);
    const meta = await lerMarcacaoDia(vaultRoot, rotinaSlug, d);
    if (meta && meta.autor === autor) entradas.push(meta);
  }
  // Ordem reversa por data (mais recente primeiro).
  entradas.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return entradas;
}

// Marca o campo silenciar_lembrete_ate da entrada do dia como fim do
// dia local. Usado quando usuario marca a rotina antes do horario do
// alarme companion: queremos suprimir o lembrete sem cancelar o
// alarme recorrente (que volta a disparar amanha). Idempotente: se ja
// silenciado para o mesmo dia, no-op.
//
// Se a entrada do dia ainda nao existe (usuario silenciou sem marcar),
// cria entrada minima com array vazio? NAO: schema exige marcacoes.min(1).
// Esta funcao so faz sentido APOS uma marcacao do dia. Caller deve
// chamar registrarMarcacao primeiro; se chamar isolada e arquivo nao
// existe, retornamos null e caller decide.
export async function silenciarLembreteHoje(
  vaultRoot: string,
  args: {
    rotinaSlug: string;
    agora: Date;
  }
): Promise<RotinaMarcacao | null> {
  const { rotinaSlug, agora } = args;
  const existente = await lerMarcacaoDia(vaultRoot, rotinaSlug, agora);
  if (!existente) return null;

  const proposto: RotinaMarcacao = {
    ...existente,
    silenciar_lembrete_ate: calcularSilenciarLembreteAte(agora),
  };
  const parsed = RotinaMarcacaoSchema.safeParse(proposto);
  if (!parsed.success) {
    throw new Error(`rotina_marcacao invalida: ${parsed.error.message}`);
  }
  const rel = rotinaMarcacaoPath(rotinaSlug, agora);
  const uri = vaultUriJoin(vaultRoot, rel);
  await writeVaultFile<RotinaMarcacao>(uri, parsed.data, '');
  return parsed.data;
}

// Util para callers que precisam inspecionar todas as entradas de
// marcacao no Vault (caso futuro: indexar todas as rotinas para
// dashboard global). Por enquanto nao usado por nenhuma tela; mantido
// privado-de-fato (export para tests).
export async function listarTodasMarcacoes(
  vaultRoot: string,
  autor: 'pessoa_a' | 'pessoa_b'
): Promise<RotinaMarcacao[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = await listVaultFolder(folderUri, '.md');
  const arquivos = todos.filter(
    (u) => !ehSyncConflict(u) && matchesFeaturePrefix(u, PREFIXO_FEATURE)
  );

  const lidas: RotinaMarcacao[] = [];
  for (const arquivoUri of arquivos) {
    try {
      const result = await readVaultFile(arquivoUri, RotinaMarcacaoSchema);
      if (result && result.meta.autor === autor) lidas.push(result.meta);
    } catch {
      // Ignora arquivos malformados.
    }
  }
  // Ordem reversa por data + slug (mais recente primeiro).
  lidas.sort((a, b) => {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1;
    return a.rotina_slug.localeCompare(b.rotina_slug);
  });
  return lidas;
}
