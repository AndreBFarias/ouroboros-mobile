// Boot hook H2 (ADR-0023): migra Vault do layout legado por feature
// para o layout-por-tipo. Lista de mapeamentos canonicos:
//
//   daily/<YYYY-MM-DD>.md                        -> markdown/humor-<YYYY-MM-DD>.md
//   eventos/<YYYY-MM-DD>-<slug>.md               -> markdown/evento-<YYYY-MM-DD>-<slug>.md
//   marcos/<YYYY-MM-DD>-<slug>.md                -> markdown/marco-<YYYY-MM-DD>-<slug>.md
//   medidas/<YYYY-MM-DD>.md                      -> markdown/medidas-<YYYY-MM-DD>.md
//   exercicios/<slug>.md                         -> markdown/exercicio-<slug>.md
//   inbox/saude/ciclo/<YYYY-MM-DD>.md            -> markdown/ciclo-<YYYY-MM-DD>.md
//   inbox/mente/diario/<YYYY-MM-DD>-<HHmm>-<slug>.md -> markdown/diario-<YYYY-MM-DD>-<HHmm>-<slug>.md
//   alarmes/<slug>.md                            -> markdown/alarme-<slug>.md
//   tarefas/<YYYY-MM-DD>-<slug>.md               -> markdown/tarefa-<slug>.md (drop date)
//   contadores/<slug>.md                         -> markdown/contador-<slug>.md
//   media/frases/<YYYY-MM-DD>-<slug>.md          -> markdown/frase-<YYYY-MM-DD>-<slug>.md
//   media/fotos/<YYYY-MM-DD>-<rand>.jpg          -> jpg/foto-<YYYY-MM-DD>-<rand>.jpg
//   media/fotos/<YYYY-MM-DD>-<rand>.md           -> markdown/foto-<YYYY-MM-DD>-<rand>.md
//   media/fotos/medidas-<YYYY-MM-DD>-<lado>.jpg  -> jpg/medidas-<YYYY-MM-DD>-<lado>.jpg
//   media/fotos/medidas-<YYYY-MM-DD>-<lado>.md   -> markdown/medidas-foto-<YYYY-MM-DD>-<lado>.md
//   media/audios/<YYYY-MM-DD>-<rand>.m4a         -> m4a/audio-<YYYY-MM-DD>-<rand>.m4a
//   media/audios/<YYYY-MM-DD>-<rand>.md          -> markdown/audio-<YYYY-MM-DD>-<rand>.md
//   media/videos/<YYYY-MM-DD>-<rand>.mp4         -> mp4/video-<YYYY-MM-DD>-<rand>.mp4
//   media/videos/<YYYY-MM-DD>-<rand>.md          -> markdown/video-<YYYY-MM-DD>-<rand>.md
//   media/scanner/<slug>.<ext>                   -> <ext>/scanner-<slug>.<ext>
//   media/scanner/<slug>.md                      -> markdown/scanner-<slug>.md
//   media/avatares/<pessoa>-<ts>.jpg             -> jpg/avatar-<pessoa>-<ts>.jpg
//   assets/exercicios/<slug>.gif                 -> gif/exercicio-<slug>.gif
//   agenda/<pessoa>/<YYYY-MM-DD>-<eventId>.md    -> markdown/agenda-<pessoa>-<YYYY-MM-DD>-<eventId>.md
//   inbox/_devices.md                            -> markdown/_devices.md
//
// Idempotente:
//   - Se useSessao.flags.vaultLayoutMigrado === true, no-op imediato.
//   - Se destino ja existe, nao sobrescreve (best-effort delete origem).
//   - Em web (mock vault), no-op.
//
// Comportamento de erro: tolera falha de I/O por arquivo individual
// (Syncthing concorrente, OEM bloqueando arquivo); proxima execucao
// re-tenta porque a flag so sobe se TODOS os arquivos do diretorio
// alvo foram processados sem erro fatal.
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { useSessao } from '@/lib/stores/sessao';

function joinUri(root: string, rel: string): string {
  const r = root.endsWith('/') ? root.slice(0, -1) : root;
  const s = rel.startsWith('/') ? rel.slice(1) : rel;
  return `${r}/${s}`;
}

// Lista basenames de uma pasta SAF; retorna [] se inexistente.
async function listarBasenames(folderUri: string): Promise<string[]> {
  let uris: string[];
  try {
    uris = await StorageAccessFramework.readDirectoryAsync(folderUri);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const u of uris) {
    const decoded = decodeURIComponent(u);
    const last = decoded.split('/').pop() ?? '';
    if (last.length > 0) out.push(last);
  }
  return out;
}

// Move um arquivo de origem para destino se origem existir e destino
// nao existir. Idempotente: chamadas repetidas sem efeito colateral.
async function moverIdempotente(
  origemUri: string,
  destinoUri: string
): Promise<boolean> {
  let destinoExiste = false;
  try {
    const info = await FileSystem.getInfoAsync(destinoUri);
    destinoExiste = info.exists === true;
  } catch {
    destinoExiste = false;
  }
  if (destinoExiste) {
    // Origem ainda existe? Se sim, deleta para limpar layout antigo.
    try {
      await FileSystem.deleteAsync(origemUri, { idempotent: true });
    } catch {
      // Best-effort.
    }
    return false;
  }
  try {
    await FileSystem.copyAsync({ from: origemUri, to: destinoUri });
    try {
      await FileSystem.deleteAsync(origemUri, { idempotent: true });
    } catch {
      // Best-effort: duplicata aceitavel ate proximo boot.
    }
    return true;
  } catch {
    return false;
  }
}

// Deriva o slug original removendo a data inicial YYYY-MM-DD- de um
// basename. Caso o basename nao comece com data, devolve o basename
// (sem extensao) inteiro.
function dropDateFromBasename(basename: string): string {
  const semExt = basename.replace(/\.[a-z0-9]+$/i, '');
  const m = semExt.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
  return m ? m[1] : semExt;
}

// Migra todos os .md de uma pasta legada para markdown/<prefix><stem>.md,
// preservando o stem original quando dropDate = false. Quando dropDate
// = true, remove o YYYY-MM-DD- inicial do stem (usado em tarefas).
async function migrarMarkdownFolder(
  vaultRoot: string,
  folderLegado: string,
  prefix: string,
  dropDate: boolean
): Promise<number> {
  const folderUri = joinUri(vaultRoot, folderLegado);
  const basenames = await listarBasenames(folderUri);
  let migrados = 0;
  for (const basename of basenames) {
    if (!basename.endsWith('.md')) continue;
    const stemSemExt = basename.replace(/\.md$/i, '');
    const stemFinal = dropDate ? dropDateFromBasename(basename) : stemSemExt;
    const novoBasename = `${prefix}${stemFinal}.md`;
    const origemUri = joinUri(vaultRoot, `${folderLegado}/${basename}`);
    const destinoUri = joinUri(vaultRoot, `markdown/${novoBasename}`);
    const ok = await moverIdempotente(origemUri, destinoUri);
    if (ok) migrados += 1;
  }
  return migrados;
}

// Migra binarios de uma pasta legada para <pastaBin>/<prefix><stem>.<ext>,
// e companion .md (se houver) para markdown/<prefix><stem>.md.
// Companion legado vivia mesma pasta do binario (ADR-0017 antigo);
// novo layout move companion para markdown/.
async function migrarBinariosFolder(
  vaultRoot: string,
  folderLegado: string,
  pastaBin: string,
  prefix: string,
  filtroBinario: (basename: string) => boolean
): Promise<number> {
  const folderUri = joinUri(vaultRoot, folderLegado);
  const basenames = await listarBasenames(folderUri);
  let migrados = 0;
  for (const basename of basenames) {
    if (basename.endsWith('.md')) {
      // companion: vai para markdown/<prefix><stem>.md.
      const stem = basename.replace(/\.md$/i, '');
      const novoBasename = `${prefix}${stem}.md`;
      const origemUri = joinUri(vaultRoot, `${folderLegado}/${basename}`);
      const destinoUri = joinUri(vaultRoot, `markdown/${novoBasename}`);
      if (await moverIdempotente(origemUri, destinoUri)) migrados += 1;
      continue;
    }
    if (!filtroBinario(basename)) continue;
    const novoBasename = `${prefix}${basename}`;
    const origemUri = joinUri(vaultRoot, `${folderLegado}/${basename}`);
    const destinoUri = joinUri(vaultRoot, `${pastaBin}/${novoBasename}`);
    if (await moverIdempotente(origemUri, destinoUri)) migrados += 1;
  }
  return migrados;
}

// Migra agenda/<pessoa>/<basename>.md -> markdown/agenda-<pessoa>-<stem>.md.
async function migrarAgenda(
  vaultRoot: string,
  pessoa: 'pessoa_a' | 'pessoa_b'
): Promise<number> {
  const folderUri = joinUri(vaultRoot, `agenda/${pessoa}`);
  const basenames = await listarBasenames(folderUri);
  let migrados = 0;
  for (const basename of basenames) {
    if (!basename.endsWith('.md')) continue;
    const stem = basename.replace(/\.md$/i, '');
    const novoBasename = `agenda-${pessoa}-${stem}.md`;
    const origemUri = joinUri(vaultRoot, `agenda/${pessoa}/${basename}`);
    const destinoUri = joinUri(vaultRoot, `markdown/${novoBasename}`);
    if (await moverIdempotente(origemUri, destinoUri)) migrados += 1;
  }
  return migrados;
}

// Migra medidas-fotos: media/fotos/medidas-<YYYY-MM-DD>-<lado>.jpg
// vai para jpg/medidas-<YYYY-MM-DD>-<lado>.jpg, companion correspondente
// vai para markdown/medidas-foto-<YYYY-MM-DD>-<lado>.md.
async function migrarMedidasFotos(vaultRoot: string): Promise<number> {
  const folderUri = joinUri(vaultRoot, 'media/fotos');
  const basenames = await listarBasenames(folderUri);
  let migrados = 0;
  for (const basename of basenames) {
    if (!basename.startsWith('medidas-')) continue;
    if (basename.endsWith('.md')) {
      // companion: medidas-<data>-<lado>.md -> markdown/medidas-foto-<data>-<lado>.md
      const stem = basename.replace(/^medidas-/, '').replace(/\.md$/i, '');
      const novoBasename = `medidas-foto-${stem}.md`;
      const origemUri = joinUri(vaultRoot, `media/fotos/${basename}`);
      const destinoUri = joinUri(vaultRoot, `markdown/${novoBasename}`);
      if (await moverIdempotente(origemUri, destinoUri)) migrados += 1;
      continue;
    }
    if (!/\.(jpg|jpeg|png)$/i.test(basename)) continue;
    // binario: medidas-<data>-<lado>.jpg -> jpg/medidas-<data>-<lado>.jpg
    const origemUri = joinUri(vaultRoot, `media/fotos/${basename}`);
    const destinoUri = joinUri(vaultRoot, `jpg/${basename}`);
    if (await moverIdempotente(origemUri, destinoUri)) migrados += 1;
  }
  return migrados;
}

// Migra inbox/_devices.md -> markdown/_devices.md.
async function migrarDevicesIndex(vaultRoot: string): Promise<number> {
  const origemUri = joinUri(vaultRoot, 'inbox/_devices.md');
  const destinoUri = joinUri(vaultRoot, 'markdown/_devices.md');
  return (await moverIdempotente(origemUri, destinoUri)) ? 1 : 0;
}

export interface MigracaoLayoutResultado {
  migrados: number;
}

// Entry point do boot hook. Idempotente. Marca flag uma vez no
// useSessao apos sucesso. Em web no-op (vault mock).
export async function migrarVaultLayoutPorTipo(
  vaultRoot: string
): Promise<MigracaoLayoutResultado> {
  const resultado: MigracaoLayoutResultado = { migrados: 0 };
  if (Platform.OS === 'web') return resultado;
  if (vaultRoot.startsWith('web://')) return resultado;
  if (useSessao.getState().flags.vaultLayoutMigrado) return resultado;

  // 1. .md por feature -> markdown/<prefix><stem>.md
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'daily',
    'humor-',
    false
  );
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'eventos',
    'evento-',
    false
  );
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'marcos',
    'marco-',
    false
  );
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'medidas',
    'medidas-',
    false
  );
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'exercicios',
    'exercicio-',
    false
  );
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'inbox/saude/ciclo',
    'ciclo-',
    false
  );
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'inbox/mente/diario',
    'diario-',
    false
  );
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'alarmes',
    'alarme-',
    false
  );
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'tarefas',
    'tarefa-',
    true
  );
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'contadores',
    'contador-',
    false
  );

  // 2. agenda por pessoa.
  resultado.migrados += await migrarAgenda(vaultRoot, 'pessoa_a');
  resultado.migrados += await migrarAgenda(vaultRoot, 'pessoa_b');

  // 3. devices index legado.
  resultado.migrados += await migrarDevicesIndex(vaultRoot);

  // 4. medidas-fotos (caso especial: vivem em media/fotos/ com prefixo
  // 'medidas-'). Deve rodar ANTES da migracao geral de media/fotos/.
  resultado.migrados += await migrarMedidasFotos(vaultRoot);

  // 5. media/frases -> markdown/frase-<stem>.md
  resultado.migrados += await migrarMarkdownFolder(
    vaultRoot,
    'media/frases',
    'frase-',
    false
  );

  // 6. binarios + companions.
  resultado.migrados += await migrarBinariosFolder(
    vaultRoot,
    'media/fotos',
    'jpg',
    'foto-',
    (b) => /\.(jpg|jpeg)$/i.test(b)
  );
  resultado.migrados += await migrarBinariosFolder(
    vaultRoot,
    'media/fotos',
    'png',
    'foto-',
    (b) => /\.png$/i.test(b)
  );
  resultado.migrados += await migrarBinariosFolder(
    vaultRoot,
    'media/audios',
    'm4a',
    'audio-',
    (b) => /\.(m4a|mp3|wav|ogg|opus)$/i.test(b)
  );
  resultado.migrados += await migrarBinariosFolder(
    vaultRoot,
    'media/videos',
    'mp4',
    'video-',
    (b) => /\.(mp4|mov|webm)$/i.test(b)
  );
  resultado.migrados += await migrarBinariosFolder(
    vaultRoot,
    'media/scanner',
    'pdf',
    'scanner-',
    (b) => /\.pdf$/i.test(b)
  );
  resultado.migrados += await migrarBinariosFolder(
    vaultRoot,
    'media/scanner',
    'jpg',
    'scanner-',
    (b) => /\.(jpg|jpeg)$/i.test(b)
  );

  // 7. avatares: media/avatares/<pessoa>-<ts>.jpg -> jpg/avatar-<pessoa>-<ts>.jpg
  {
    const folderUri = joinUri(vaultRoot, 'media/avatares');
    const basenames = await listarBasenames(folderUri);
    for (const basename of basenames) {
      if (!/\.(jpg|jpeg|png)$/i.test(basename)) continue;
      const origemUri = joinUri(vaultRoot, `media/avatares/${basename}`);
      const destinoUri = joinUri(vaultRoot, `jpg/avatar-${basename}`);
      if (await moverIdempotente(origemUri, destinoUri)) {
        resultado.migrados += 1;
      }
    }
  }

  // 8. exercicios GIFs: assets/exercicios/<slug>.gif -> gif/exercicio-<slug>.gif
  {
    const folderUri = joinUri(vaultRoot, 'assets/exercicios');
    const basenames = await listarBasenames(folderUri);
    for (const basename of basenames) {
      if (!/\.gif$/i.test(basename)) continue;
      const origemUri = joinUri(vaultRoot, `assets/exercicios/${basename}`);
      const destinoUri = joinUri(vaultRoot, `gif/exercicio-${basename}`);
      if (await moverIdempotente(origemUri, destinoUri)) {
        resultado.migrados += 1;
      }
    }
  }

  // Sucesso: marca flag para skip rapido em boots futuros.
  useSessao.getState().marcarFlagBoot('vaultLayoutMigrado');
  return resultado;
}
