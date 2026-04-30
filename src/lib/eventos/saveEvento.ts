// Persiste um registro de evento (Tela 20) em
// eventos/YYYY-MM-DD-<slug>.md no Vault. Funcao pura: recebe meta
// validado, body livre, vaultRoot e lista de URIs locais de fotos;
// devolve URI final. Antes de chamar writeVaultFile, copia cada foto
// de URI temporario para assets/<formatDateYmdHm>-evento-<idx>.jpg
// e atualiza meta.fotos com paths relativos ao Vault.
//
// Slug do nome do arquivo: deriva do bairro detectado, do texto
// livre ou da categoria via slugifyEvento. Em colisao improvavel
// (mesmo dia, mesmo slug, mesmo autor), aplica sufixo numerico
// crescente.
import * as FileSystem from 'expo-file-system/legacy';
import {
  assetsPath,
  eventosPath,
  formatDateYmdHm,
  readVaultFile,
  writeVaultFile,
} from '@/lib/vault';
import { EventoSchema, type EventoMeta } from '@/lib/schemas/evento';
import { slugifyEvento } from '@/lib/eventos/slug';

export interface SaveEventoArgs {
  meta: EventoMeta;
  body: string;
  vaultRoot: string;
  // URIs locais ou content:// das fotos escolhidas no picker.
  // Caller passa array vazio quando nao ha fotos.
  fotos: string[];
}

export interface SaveEventoResult {
  uri: string;
  // Paths relativos ao Vault que foram efetivamente escritos em
  // assets/. Util para o caller logar ou exibir.
  fotosGravadas: string[];
}

// Concatena root SAF e path relativo, normalizando barras.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Aplica sufixo numerico no rel para evitar colisao ('-1', '-2', ...).
function applyConflictSuffix(rel: string, n: number): string {
  const dotIdx = rel.lastIndexOf('.');
  if (dotIdx === -1) return `${rel}-${n}`;
  return `${rel.slice(0, dotIdx)}-${n}${rel.slice(dotIdx)}`;
}

// Tenta gravar no path canonico. Se ja existir, incrementa sufixo
// ate encontrar slot livre. Limite defensivo de 9 tentativas para
// nao entrar em loop infinito caso o reader minta sobre existencia.
async function resolvePath(
  vaultRoot: string,
  relCanonico: string
): Promise<string> {
  const uriCanonico = joinUri(vaultRoot, relCanonico);
  const existente = await readVaultFile(uriCanonico, EventoSchema);
  if (!existente) return relCanonico;

  for (let n = 1; n <= 9; n++) {
    const rel = applyConflictSuffix(relCanonico, n);
    const uri = joinUri(vaultRoot, rel);
    const ja = await readVaultFile(uri, EventoSchema);
    if (!ja) return rel;
  }
  // Fallback: timestamp em ms para garantir unicidade absoluta.
  return applyConflictSuffix(relCanonico, Date.now());
}

// Copia cada foto do URI temporario para assets/<prefixo>-<idx>.jpg
// dentro do Vault, devolvendo a lista de paths relativos. O caller
// usa esses paths para popular meta.fotos antes de gravar o .md.
async function copiarFotos(
  vaultRoot: string,
  prefixo: string,
  fotos: string[]
): Promise<string[]> {
  if (fotos.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < fotos.length; i++) {
    const origem = fotos[i];
    const relAsset = assetsPath(`${prefixo}-evento-${i + 1}.jpg`);
    const destinoUri = joinUri(vaultRoot, relAsset);
    await FileSystem.copyAsync({ from: origem, to: destinoUri });
    out.push(relAsset);
  }
  return out;
}

export async function saveEvento(
  args: SaveEventoArgs
): Promise<SaveEventoResult> {
  const { meta, body, vaultRoot, fotos } = args;

  // Defensivo: revalida o meta antes de tocar em I/O. Quem chama
  // tipicamente ja parseou via safeParse, mas testes podem injetar
  // payload bruto.
  const parsed = EventoSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`evento invalido: ${parsed.error.message}`);
  }

  const agora = new Date();

  // Copia as fotos primeiro: se a copia falhar, nao chegamos a
  // gravar o .md com referencias quebradas. Em caso de erro, a
  // promise rejeita e o caller mostra toast de falha.
  const prefixo = formatDateYmdHm(agora);
  const fotosGravadas = await copiarFotos(vaultRoot, prefixo, fotos);

  // Atualiza meta.fotos com os paths relativos do Vault. O
  // frontmatter passa a apontar para arquivos reais sob assets/.
  const metaComFotos: EventoMeta = {
    ...parsed.data,
    fotos: fotosGravadas,
  };

  // Slug deriva do bairro / texto / categoria (nessa ordem).
  // Texto livre vem do body (o caller pode passar string vazia se
  // nao quiser corpo no .md).
  const slug = slugifyEvento({
    texto: body,
    bairro: metaComFotos.bairro ?? null,
    categoria: metaComFotos.categoria,
  });

  const relCanonico = eventosPath(agora, slug);
  const rel = await resolvePath(vaultRoot, relCanonico);
  const uri = joinUri(vaultRoot, rel);

  await writeVaultFile<EventoMeta>(uri, metaComFotos, body);

  return { uri, fotosGravadas };
}
