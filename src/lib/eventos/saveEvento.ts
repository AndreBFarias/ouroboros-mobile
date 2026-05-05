// Persiste um registro de evento (Tela 20) em
// eventos/YYYY-MM-DD-<slug>.md no Vault. Função pura: recebe meta
// validado, body livre, vaultRoot e lista de URIs locais de fotos;
// devolve URI final. Antes de chamar writeVaultFile, copia cada foto
// para media/fotos/eventos-<YYYY-MM-DD>-<rand>-<idx>.jpg e grava
// um companion .md ao lado (frontmatter midia_foto). Atualiza
// meta.fotos com os paths relativos do Vault para o frontmatter
// canonico apontar para os arquivos novos.
//
// Slug do nome do arquivo: deriva do bairro detectado, do texto
// livre ou da categoria via slugifyEvento. Em colisao improvavel
// (mesmo dia, mesmo slug, mesmo autor), aplica sufixo numerico
// crescente.
//
// Backward-compat: arquivos legados sob assets/ continuam visiveis
// na galeria via useFotosAgregadas (que resolve qualquer path
// relativo gravado em meta.fotos[]). Esta sprint so muda o destino
// das fotos NOVAS; nada sobre fotos antigas no disco e' tocado.
import {
  eventosPath,
  formatDateYmd,
  readVaultFile,
  writeVaultFile,
} from '@/lib/vault';
import { EventoSchema, type EventoMeta } from '@/lib/schemas/evento';
import { slugifyEvento } from '@/lib/eventos/slug';
import { escreverMidiaComCompanion } from '@/lib/vault/midiaCompanion';

export interface SaveEventoArgs {
  meta: EventoMeta;
  body: string;
  vaultRoot: string;
  // URIs locais ou content:// das fotos escolhidas no picker.
  // Caller passa array vazio quando não ha fotos.
  fotos: string[];
}

export interface SaveEventoResult {
  uri: string;
  // Paths relativos ao Vault que foram efetivamente escritos em
  // assets/. Útil para o caller logar ou exibir.
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

// Tenta gravar no path canonico. Se já existir, incrementa sufixo
// até encontrar slot livre. Limite defensivo de 9 tentativas para
// não entrar em loop infinito caso o reader minta sobre existencia.
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

// Sufixo random curto (4 chars hex) para deduplicar fotos do mesmo
// evento dentro do mesmo dia sem expor minuto exato. Mesma estrategia
// de capturarFoto.suffixCurto, replicada local para nao acoplar
// midia/capturarFoto (helper especifico de captura via ImagePicker).
function suffixCurto(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
}

// Copia cada foto do URI temporario para
// media/fotos/eventos-<YYYY-MM-DD>-<rand>-<idx>.jpg dentro do Vault
// e grava um companion .md ao lado (frontmatter midia_foto). Devolve
// a lista de paths relativos do binario; o caller usa para popular
// meta.fotos antes de gravar o .md do evento. O .md companion fica
// independente do evento.md e nao e' contado em meta.fotos (apenas
// o binario entra no frontmatter, o companion e' descoberta via
// reader.listVaultFolder).
async function copiarFotos(
  vaultRoot: string,
  data: Date,
  fotos: string[],
  meta: EventoMeta,
  slugEvento: string
): Promise<string[]> {
  if (fotos.length === 0) return [];
  const out: string[] = [];
  const dataIso = meta.data;
  const ymd = formatDateYmd(data);
  // M39.1: loop migrado para escreverMidiaComCompanion. Cada foto
  // recebe basename "<YYYY-MM-DD>-eventos-<rand4>-<idx>.jpg" passado
  // explicitamente via meta.arquivo (preserva regex dos testes M-VAULT-
  // MD-FIX-evento-fotos). O canonico encapsula copia + companion +
  // ordenacao das chaves.
  for (let i = 0; i < fotos.length; i++) {
    const origem = fotos[i];
    const rand = `eventos-${suffixCurto()}-${i + 1}`;
    const arquivo = `${ymd}-${rand}.jpg`;
    const r = await escreverMidiaComCompanion(vaultRoot, origem, {
      tipo: 'midia_foto',
      arquivo,
      data: dataIso,
      autor: meta.autor,
      para: meta.para,
      legenda: `evento ${ymd} ${slugEvento}`,
    });
    out.push(r.binarioPath);
  }
  return out;
}

export async function saveEvento(
  args: SaveEventoArgs
): Promise<SaveEventoResult> {
  const { meta, body, vaultRoot, fotos } = args;

  // Defensivo: revalida o meta antes de tocar em I/O. Quem chama
  // tipicamente já parseou via safeParse, mas testes podem injetar
  // payload bruto.
  const parsed = EventoSchema.safeParse(meta);
  if (!parsed.success) {
    throw new Error(`evento invalido: ${parsed.error.message}`);
  }

  const agora = new Date();

  // Slug deriva do bairro / texto / categoria (nessa ordem). Calculado
  // antes da copia das fotos porque o companion .md de cada foto
  // referencia o slug via "evento <YYYY-MM-DD> <slug>" na legenda
  // (rastreabilidade reversa: galeria -> evento de origem).
  const slug = slugifyEvento({
    texto: body,
    bairro: parsed.data.bairro ?? null,
    categoria: parsed.data.categoria,
  });

  // Copia as fotos primeiro: se a copia falhar, não chegamos a
  // gravar o .md com referências quebradas. Em caso de erro, a
  // promise rejeita e o caller mostra toast de falha. Cada foto
  // entra em media/fotos/<YYYY-MM-DD>-eventos-<rand>-<idx>.jpg
  // + companion .md (frontmatter midia_foto).
  const fotosGravadas = await copiarFotos(
    vaultRoot,
    agora,
    fotos,
    parsed.data,
    slug
  );

  // Atualiza meta.fotos com os paths relativos do Vault. O
  // frontmatter passa a apontar para arquivos reais sob media/fotos/.
  const metaComFotos: EventoMeta = {
    ...parsed.data,
    fotos: fotosGravadas,
  };

  const relCanonico = eventosPath(agora, slug);
  const rel = await resolvePath(vaultRoot, relCanonico);
  const uri = joinUri(vaultRoot, rel);

  await writeVaultFile<EventoMeta>(uri, metaComFotos, body);

  return { uri, fotosGravadas };
}
