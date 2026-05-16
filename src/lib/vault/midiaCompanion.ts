// M39: helpers canonicos para escrita/leitura de pares
// (binario, .md companion) sob media/<categoria>/. Centraliza o
// padrao manual replicado em 9 lugares (capturarFoto, capturarMusica,
// capturarVideo, salvarFrase, recordAudio, saveEvento.copiarFotos,
// medidas/novo, scanner/saveNota, etc) atras de uma API unica que
// respeita ADR-0017.
//
// Decisao M39 §0: este modulo NAO substitui src/lib/midia/companion.ts
// (serializador deterministico M34) — usa internamente. Migracao de
// consumidores existentes para esta API e' incremental: M39 entrega
// schema, helpers e testes; M39.1 migra writers um a um sem mudar
// comportamento de output.
//
// Comentarios sem acento (convencao shell/CI).
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import YAML from 'yaml';
import { stringifyCompanionMidia } from '@/lib/midia/companion';
import {
  MidiaCompanionSchema,
  tipoPorExtensao,
  type MidiaCompanion,
  type TipoMidiaCanonico,
} from '@/lib/schemas/midia-companion';
import {
  formatDateYmd,
  MARKDOWN_FOLDER,
  PNG_FOLDER,
  JPG_FOLDER,
  M4A_FOLDER,
  MP4_FOLDER,
  PDF_FOLDER,
  matchesFeaturePrefix,
  vaultUriJoin,
} from '@/lib/vault/paths';
import { ehSyncConflict } from '@/lib/vault/syncConflict';
import { listVaultFolder, readVaultFile } from '@/lib/vault/reader';

// Concatena root SAF e path relativo, normalizando barras. Idem
// helpers locais espalhados (capturarFoto.joinUri etc); centralizado
// aqui tambem para reuso por chamadores futuros.
function joinUri(root: string, rel: string): string {
  const trimmedRoot = root.endsWith('/') ? root.slice(0, -1) : root;
  return `${trimmedRoot}/${rel}`;
}

// Sufixo random curto (4 hex). Espelha capturarFoto.suffixCurto.
// Mantido local para evitar import circular com capturarFoto que
// pode no futuro consumir este helper.
function suffixCurto(): string {
  return Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0');
}

// Extrai extensao em lowercase a partir de um URI/path. Sem o ponto
// (ex: 'jpg', 'm4a'). Retorna string vazia quando nao ha ponto na
// ultima parte do path.
function extOf(pathOrUri: string): string {
  const ult = pathOrUri.split('/').pop() ?? pathOrUri;
  const idx = ult.lastIndexOf('.');
  if (idx === -1 || idx === ult.length - 1) return '';
  return ult.slice(idx + 1).toLowerCase();
}

// Remove a extensao de um basename (ex: '2026-05-04-abcd.jpg' ->
// '2026-05-04-abcd'). Se nao houver ponto, retorna como esta.
function basenameSemExt(basename: string): string {
  const idx = basename.lastIndexOf('.');
  if (idx === -1) return basename;
  return basename.slice(0, idx);
}

// H2 layout-por-tipo (ADR-0023): roteia binario para a pasta
// canonica baseada na extensao concreta do arquivo, nao no tipo
// semantico. Ex: midia_foto pode chegar como .jpg ou .png;
// destino respectivo e' jpg/ ou png/.
function pastaBinarioPorExt(ext: string, tipo: TipoMidiaCanonico): string {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (e === 'jpg' || e === 'jpeg') return JPG_FOLDER;
  if (e === 'png') return PNG_FOLDER;
  if (e === 'm4a' || e === 'mp3' || e === 'wav' || e === 'ogg' || e === 'opus')
    return M4A_FOLDER;
  if (e === 'mp4' || e === 'mov' || e === 'webm') return MP4_FOLDER;
  if (e === 'pdf') return PDF_FOLDER;
  // Fallback conservador por tipo: midia_foto -> jpg, midia_audio -> m4a,
  // midia_video -> mp4, midia_pdf -> pdf, midia_frase -> markdown (sem
  // binario).
  switch (tipo) {
    case 'midia_foto':
      return JPG_FOLDER;
    case 'midia_audio':
      return M4A_FOLDER;
    case 'midia_video':
      return MP4_FOLDER;
    case 'midia_pdf':
      return PDF_FOLDER;
    case 'midia_frase':
      return MARKDOWN_FOLDER;
  }
}

// Prefixo de feature por tipo. H2: companion .md sempre em markdown/
// e binario em <ext>/, ambos com mesmo basename comecando pelo
// prefixo (foto-, audio-, video-, scanner-, frase-).
function prefixoPorTipo(tipo: TipoMidiaCanonico): string {
  switch (tipo) {
    case 'midia_foto':
      return 'foto-';
    case 'midia_audio':
      return 'audio-';
    case 'midia_video':
      return 'video-';
    case 'midia_pdf':
      return 'scanner-';
    case 'midia_frase':
      return 'frase-';
  }
}

export interface EscreverMidiaResultado {
  // Path relativo ao Vault do binario gravado (media/<sub>/<basename>.<ext>).
  binarioPath: string;
  // Path relativo ao Vault do .md companion (media/<sub>/<basename>.md).
  companionPath: string;
}

// Escreve binario + companion .md como par 1:1 sob media/<categoria>/.
// O basename e' compartilhado: 2026-05-04-abcd.jpg + 2026-05-04-abcd.md.
//
// Comportamento idempotente: se o binarioPath ja existe, NAO sobrescreve
// nem duplica — devolve os paths existentes (caller pode detectar via
// comparar binarioUri com binarioPath ou rechamar leitura). Caso queira
// forcar nova escrita, chame com basename diferente.
//
// Caller fornece o `meta` em shape canonico. O serializador
// stringifyCompanionMidia (M34) e' usado para o conteudo .md;
// schema zod valida o input antes de gravar.
export async function escreverMidiaComCompanion(
  vaultRoot: string,
  binarioUri: string,
  meta: Omit<MidiaCompanion, 'arquivo'> & { arquivo?: string }
): Promise<EscreverMidiaResultado> {
  const ext = extOf(binarioUri) || extOf(meta.arquivo ?? '') || 'bin';
  const pastaBin = pastaBinarioPorExt(ext, meta.tipo);
  const prefixo = prefixoPorTipo(meta.tipo);

  // Basename: caller pode forcar via meta.arquivo (ex: 'medidas-2026-
  // 05-04-frente.jpg'). Quando ausente, gera <prefixo><YYYY-MM-DD>-
  // <rand4>.<ext>. H2 layout-por-tipo: binario em <ext>/<basename>,
  // companion .md em markdown/<basename>.
  const basenameComExt =
    meta.arquivo && meta.arquivo.length > 0
      ? meta.arquivo
      : `${prefixo}${formatDateYmd(new Date(meta.data))}-${suffixCurto()}.${ext}`;

  const basename = basenameSemExt(basenameComExt);
  const binarioPath = `${pastaBin}/${basename}.${ext}`;
  const companionPath = `${MARKDOWN_FOLDER}/${basename}.md`;

  const destinoBin = joinUri(vaultRoot, binarioPath);
  const destinoCompanion = joinUri(vaultRoot, companionPath);

  // Idempotencia: se o binario ja existe, nao sobrescreve. Caller
  // responsavel por garantir basename unico quando quiser nova escrita.
  let binarioJaExiste = false;
  try {
    const info = await FileSystem.getInfoAsync(destinoBin);
    binarioJaExiste = info.exists === true;
  } catch {
    binarioJaExiste = false;
  }

  // Valida meta canonico antes de gravar companion. R-CRIT-3
  // (2026-05-16): validacao subiu para ANTES da copia do binario.
  // Antes, copy ocorria primeiro e schema.parse podia falhar -- o
  // binario ficava orfao no Vault. Validar antes mata o caminho mais
  // comum de orfao silencioso (meta malformado).
  const metaFinal: MidiaCompanion = MidiaCompanionSchema.parse({
    ...meta,
    arquivo: basenameComExt,
  });

  if (!binarioJaExiste) {
    await FileSystem.copyAsync({ from: binarioUri, to: destinoBin });
  }

  const conteudo = stringifyCompanionMidia({
    tipo: metaFinal.tipo,
    arquivo: metaFinal.arquivo,
    data: metaFinal.data,
    autor: metaFinal.autor,
    para: metaFinal.para,
    legenda: metaFinal.legenda,
    medida_ref: metaFinal.medida_ref,
  });

  // R-CRIT-3 (2026-05-16): atomicidade best-effort. Se write companion
  // falhar e tivermos copiado um binario novo (nao idempotencia), tenta
  // deletar para nao deixar orfao. Idempotente: deleteAsync com {
  // idempotent: true } silencia ENOENT. Falha de delete e' ultima
  // linha de defesa -- nao re-lanca; deixa o erro original do write
  // propagar para o caller.
  try {
    await FileSystem.writeAsStringAsync(destinoCompanion, conteudo);
  } catch (err) {
    if (!binarioJaExiste) {
      try {
        await FileSystem.deleteAsync(destinoBin, { idempotent: true });
      } catch {
        // best-effort; o erro original do write e' o relevante.
      }
    }
    throw err;
  }

  return { binarioPath, companionPath };
}

// Companion M34 serializa o campo `para` como string canonica:
//   "mim" | "casal" | "outra:pessoa_a" | "outra:pessoa_b"
// O ParaSchema canonico (zod) espera shape discriminado:
//   { tipo: 'mim' } | { tipo: 'casal' } | { tipo: 'outra', pessoa: ... }
// Esse pre-parser converte a string serializada para o shape esperado
// antes do schema zod validar. Tolerante: shape ja-discriminado
// (objeto) passa intacto.
function deserializarPara(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  if (raw === 'mim') return { tipo: 'mim' };
  if (raw === 'casal') return { tipo: 'casal' };
  const m = raw.match(/^outra:(pessoa_[ab])$/);
  if (m) return { tipo: 'outra', pessoa: m[1] };
  return raw; // schema vai falhar; deixa erro emergir.
}

// Helper: parseia conteudo bruto de companion .md, valida via schema.
function parseCompanionRaw(raw: string): MidiaCompanion | null {
  try {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    const obj = YAML.parse(match[1]) as Record<string, unknown>;
    if (obj && 'para' in obj) {
      obj.para = deserializarPara(obj.para);
    }
    const result = MidiaCompanionSchema.safeParse(obj);
    if (!result.success) return null;
    return result.data;
  } catch {
    return null;
  }
}

// R-CRIT-3 (2026-05-16): item canonico de midia standalone listada
// pelos consumers do Vault (Recap, futuras agregacoes). Standalone =
// foto/audio/video capturado via FAB unificado, com companion .md
// proprio em markdown/, sem registro-mae (diario ou evento). O Recap
// usa para alimentar slide de Memorias e contar fotos/audios/videos
// no periodo. Galeria global (`/galeria`) usa via `listarItensGaleria`
// (que tem cache de schema por tipo); aqui mantemos shape leve para
// agregadores que so precisam tipo + data + path.
export interface ItemMidiaStandalone {
  tipo: TipoMidiaCanonico;
  // YYYY-MM-DD da captura (extraido do `data` ISO do companion, sem
  // hora). Permite filtro por range sem reparsear ISO.
  data: string;
  // URI absoluto do companion .md (passa direto para readVaultFile no
  // detalhe). Bem-vindo manter coerente com ItemGaleria.uri.
  companionUri: string;
  // Path relativo do binario (ex: jpg/foto-2026-05-15-abcd.jpg). Pode
  // ficar `null` para midia_frase (so .md, sem binario).
  binarioPath: string | null;
}

// R-CRIT-3 (2026-05-16): lista companions de midia standalone (foto-,
// audio-, video-, frase-, scanner-) gravados pelo FAB unificado ou
// pelo MicrofoneButton. Le markdown/ uma vez, filtra por prefixo de
// feature, parseia frontmatter com MidiaCompanionSchema (permissivo
// no shape mas estrito no `tipo`).
//
// Por que viver aqui e nao em `galeria.ts`: galeria.ts ja agrega 14
// tipos (humor, diario, evento, marco, foto, audio, video, ...) com
// fallback para schemas genericos. Aqui queremos especificamente os
// tipos midia_* canonicos que sao filhos diretos do FAB, sem precisar
// pagar parse de schemas que nao usaremos no Recap. Helper enxuto vai
// servir ao useRecap sem importar a galeria.ts cheia.
//
// Erros: pasta inexistente -> []. Companion malformado -> ignorado.
// Filtra sync-conflict.
export async function listarMidiasStandalone(
  vaultRoot: string
): Promise<ItemMidiaStandalone[]> {
  const folderUri = vaultUriJoin(vaultRoot, MARKDOWN_FOLDER);
  const todos = (await listVaultFolder(folderUri, '.md')).filter(
    (u) => !ehSyncConflict(u)
  );

  // Tabela prefixo -> (tipo canonico, pasta do binario, ext fallback).
  // frase nao tem binario (so .md), scanner usa pdf ou jpg conforme
  // o caso real.
  const MAPA = [
    {
      prefixo: 'foto-',
      tipo: 'midia_foto' as TipoMidiaCanonico,
    },
    {
      prefixo: 'audio-',
      tipo: 'midia_audio' as TipoMidiaCanonico,
    },
    {
      prefixo: 'video-',
      tipo: 'midia_video' as TipoMidiaCanonico,
    },
    {
      prefixo: 'frase-',
      tipo: 'midia_frase' as TipoMidiaCanonico,
    },
    {
      prefixo: 'scanner-',
      tipo: 'midia_pdf' as TipoMidiaCanonico,
    },
  ];

  const itens: ItemMidiaStandalone[] = [];
  for (const arquivoUri of todos) {
    const entry = MAPA.find((m) => matchesFeaturePrefix(arquivoUri, m.prefixo));
    if (!entry) continue;
    let meta: MidiaCompanion | null = null;
    try {
      const result = await readVaultFile(arquivoUri, MidiaCompanionSchema);
      if (result) meta = result.meta as MidiaCompanion;
    } catch {
      meta = null;
    }
    if (!meta) continue;
    // Normaliza data ISO para YYYY-MM-DD: o schema ja garante ISO
    // valido com offset; slice(0, 10) e' suficiente.
    const data = meta.data.slice(0, 10);
    // binarioPath: deriva do tipo (frase nao tem binario; scanner
    // pode ser jpg ou pdf -- recuperamos ext via meta.arquivo).
    let binarioPath: string | null = null;
    if (entry.tipo === 'midia_frase') {
      binarioPath = null;
    } else {
      const ext = extOf(meta.arquivo);
      if (ext.length > 0) {
        const pasta = pastaBinarioPorExt(ext, entry.tipo);
        binarioPath = `${pasta}/${meta.arquivo}`;
      }
    }
    itens.push({
      tipo: entry.tipo,
      data,
      companionUri: arquivoUri,
      binarioPath,
    });
  }

  // Ordenacao desc por data (mais recente primeiro) para o Recap
  // poder pegar amostra das ultimas N.
  itens.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  return itens;
}

// Le o companion .md de um binario. Caller fornece binarioPath
// relativo ao Vault (ex: 'jpg/foto-2026-05-04-abcd.jpg' no novo
// layout, ou 'media/fotos/2026-05-04-abcd.jpg' no legado). H2
// layout-por-tipo: companion fica em markdown/<basename>.md (binario
// em <ext>/<basename>.<ext>). Tentativa #1: layout novo. Tentativa
// #2: legado (companion ao lado do binario). Retorna meta validado
// ou null.
export async function lerCompanion(
  vaultRoot: string,
  binarioPath: string
): Promise<MidiaCompanion | null> {
  const basename = (binarioPath.split('/').pop() ?? '').replace(
    /\.[a-z0-9]+$/i,
    ''
  );
  // Tentativa #1: H2 layout-por-tipo.
  try {
    const novoUri = joinUri(vaultRoot, `${MARKDOWN_FOLDER}/${basename}.md`);
    const raw = await StorageAccessFramework.readAsStringAsync(novoUri);
    const meta = parseCompanionRaw(raw);
    if (meta) return meta;
  } catch {
    // Cai em fallback legado.
  }
  // Tentativa #2: companion legado (mesma pasta do binario).
  const companionLegadoRel = binarioPath.replace(/\.[a-z0-9]+$/i, '.md');
  try {
    const legadoUri = joinUri(vaultRoot, companionLegadoRel);
    const raw = await StorageAccessFramework.readAsStringAsync(legadoUri);
    return parseCompanionRaw(raw);
  } catch {
    return null;
  }
}

export interface MigracaoResultado {
  // Quantos binarios foram movidos de assets/ para media/<categoria>/.
  migrados: number;
  // Quantos arquivos ja estavam no destino (idempotencia).
  existentes: number;
  // Quantos arquivos foram pulados por extensao desconhecida ou erro.
  pulados: number;
}

// Varre assets/ e move binarios de midia (jpg/m4a/mp4/pdf) para
// <ext>/<basename>.<ext> conforme H2 layout-por-tipo (ADR-0023).
// Idempotente: arquivos ja migrados (com mesmo basename no destino)
// sao ignorados, nao duplicados nem sobrescritos.
//
// Decisao: nao gera companion .md aqui (apenas move o binario).
// Companions sao gerados pelos writers no proximo save; arquivos
// legados ficam sem companion ate que o usuario edite o registro
// mae.
export async function migrarAssetsLegacyParaMedia(
  vaultRoot: string
): Promise<MigracaoResultado> {
  const result: MigracaoResultado = {
    migrados: 0,
    existentes: 0,
    pulados: 0,
  };

  const assetsUri = joinUri(vaultRoot, 'assets');
  // V4.0.2: dispatcha por scheme. file:// devolve nomes diretos via
  // FileSystem.readDirectoryAsync; content:// devolve URIs cheios.
  let entries: string[];
  try {
    if (assetsUri.startsWith('content://')) {
      entries = await StorageAccessFramework.readDirectoryAsync(assetsUri);
    } else {
      const names = await FileSystem.readDirectoryAsync(assetsUri);
      const sep = assetsUri.endsWith('/') ? '' : '/';
      entries = names.map((n) => `${assetsUri}${sep}${encodeURIComponent(n)}`);
    }
  } catch {
    // assets/ nao existe ou sem permissao — nada a migrar.
    return result;
  }

  for (const entryUri of entries) {
    const decoded = decodeURIComponent(entryUri);
    const basename = decoded.split('/').pop() ?? decoded;

    // Pula subpastas (assets/exercicios/) e arquivos ocultos.
    if (basename.length === 0 || basename.startsWith('.')) {
      result.pulados += 1;
      continue;
    }
    // Pula copias de conflito do Syncthing: nao migrar para media/<sub>/
    // como se fosse binario legitimo (vide ADR-0017 e bug B6).
    if (ehSyncConflict(basename)) {
      result.pulados += 1;
      continue;
    }
    // Pula entradas que parecem subpasta (sem extensao). Conservador:
    // assets/exercicios/ tem GIFs com extensao, entao um nome sem
    // ponto provavelmente e' diretorio.
    if (!basename.includes('.')) {
      result.pulados += 1;
      continue;
    }

    const ext = extOf(basename);
    const tipo = tipoPorExtensao(ext);
    if (!tipo) {
      result.pulados += 1;
      continue;
    }
    const pastaBin = pastaBinarioPorExt(ext, tipo);
    const destinoRel = `${pastaBin}/${basename}`;
    const destinoUri = joinUri(vaultRoot, destinoRel);

    // Idempotencia: pula se ja existe no destino.
    let jaExiste = false;
    try {
      const info = await FileSystem.getInfoAsync(destinoUri);
      jaExiste = info.exists === true;
    } catch {
      jaExiste = false;
    }
    if (jaExiste) {
      result.existentes += 1;
      continue;
    }

    try {
      await FileSystem.copyAsync({ from: entryUri, to: destinoUri });
      // Apos copia, remove o original em assets/ para nao deixar
      // duplicata. Erro de delete nao bloqueia a migracao do proximo.
      try {
        await FileSystem.deleteAsync(entryUri, { idempotent: true });
      } catch {
        // Best-effort: se o delete falhar, o usuario tera duplicata
        // (binario em assets/ + media/). Documentado em ADR-0017.
      }
      result.migrados += 1;
    } catch {
      result.pulados += 1;
    }
  }

  return result;
}
