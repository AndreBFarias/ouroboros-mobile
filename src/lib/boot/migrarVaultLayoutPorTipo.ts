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
//   - Se useSessao.flags.vaultLayoutMigrado === true, no-op imediato
//     (salvo a varredura de recuperacao descrita mais abaixo).
//   - Se destino ja existe, nao sobrescreve (best-effort delete origem).
//   - Em web (mock vault), no-op.
//
// Whitelist `inbox/` (ADR-0024, sprint G1): apenas os subpaths
// listados acima sao migrados. Arquivos do share intent receiver
// (M08) que vivem em `inbox/financeiro/{pix,extrato,nota}/`,
// `inbox/saude/{exame,receita}/`, `inbox/casa/{garantia,contrato}/`
// e `inbox/outros/` NAO sao tocados; permanecem em `inbox/` como
// triagem temporaria, exceao parcial ao layout-por-tipo (ADR-0023).
// Cobertura por regressao em
// tests/lib/boot/migrarVaultLayoutPorTipo-inbox-whitelist.test.ts.
//
// Comportamento de erro: tolera falha de I/O por arquivo individual
// (Syncthing concorrente, OEM bloqueando arquivo); proxima execucao
// re-tenta porque a flag so sobe se TODOS os arquivos do diretorio
// alvo foram processados sem erro fatal.
//
// AUDIT-P1-5 (2026-07-28): ate esta sprint o paragrafo acima era um
// contrato mentiroso. `marcarFlagBoot('vaultLayoutMigrado')` era a
// ultima instrucao da funcao, fora de qualquer condicional, e o sinal
// de falha nem chegava ate la: `moverIdempotente` devolvia `false`
// tanto para "destino ja existia" (sucesso idempotente) quanto para "a
// copia falhou", e MigracaoLayoutResultado so contava acertos.
// Consequencia: um arquivo que falhasse a copia ficava em
// `daily/`/`contadores/` para sempre e NENHUM leitor o enxergava — todos
// varrem apenas `markdown/` (MARKDOWN_FOLDER em src/lib/vault/paths.ts).
// O registro sumia do historico, do Recap e das medias sem erro e sem
// log, e a flag impedia qualquer boot futuro de re-tentar.
//
// O contrato agora e cumprido literalmente:
//   - `moverIdempotente` devolve tres estados ('movido' | 'ja-estava' |
//     'falhou'), separando sucesso idempotente de erro real;
//   - o resultado carrega `falhas` + `pathsFalhos` (paths relativos);
//   - a flag so sobe quando `falhas === 0`. Com falha parcial a flag
//     fica false e o proximo boot re-tenta, o que e seguro porque
//     destino existente nunca e sobrescrito.
//
// Recuperacao de Vaults ja afetados: quem instalou antes desta sprint
// pode ter `vaultLayoutMigrado === true` com orfaos no layout legado, e
// o guard de entrada impediria o re-teste. `recuperarOrfaosVaultLayout`
// roda os mesmos 8 passos IGNORANDO `vaultLayoutMigrado`, guardada pela
// flag propria `vaultLayoutOrfaosVarridos`. E disparada pelo proprio
// `migrarVaultLayoutPorTipo` (ja plugado em BOOT_HOOKS), evitando um
// segundo registro de hook. Num Vault sadio as pastas legadas estao
// vazias e a varredura e no-op (so listagens).
//
// Comentarios sem acento (convencao shell/CI).
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import { useSessao } from '@/lib/stores/sessao';
import { devLog } from '@/lib/util/devLog';
import { ehSyncConflict } from '@/lib/vault/syncConflict';

function joinUri(root: string, rel: string): string {
  const r = root.endsWith('/') ? root.slice(0, -1) : root;
  const s = rel.startsWith('/') ? rel.slice(1) : rel;
  return `${r}/${s}`;
}

// Lista basenames de uma pasta; retorna [] se inexistente.
// V4.0.2: dispatcha por scheme. file:// devolve nomes diretos;
// content:// devolve URIs cheios e extraimos basename.
//
// AUDIT-T1B6-MIGRATION-FIX (2026-05-15): filtra copias de conflito do
// Syncthing (.sync-conflict-<TS>-<dispid>.<ext>) ANTES de devolver ao
// caller. Sem isso, migration moveria humor-2026-05-06.sync-conflict-...md
// de daily/ para markdown/humor-2026-05-06.sync-conflict-...md,
// perpetuando o conflito no layout-por-tipo. Filtro defensivo, nao
// destrutivo: arquivos sync-conflict permanecem no path original para
// reconciliacao manual via Obsidian/Syncthing.
// AUDIT-P1-5B: tres estados, no mesmo vocabulario de MovimentoResultado.
//
// O `catch { return [] }` anterior era ambiguo do mesmo jeito que o
// boolean que a AUDIT-P1-5 desfez em MovimentoResultado: "pasta nao
// existe" (benigno, esperado num Vault novo) e "nao consegui ler"
// (perda real) viravam a mesma lista vazia, e a migracao seguia como se
// tivesse terminado. Pasta ilegivel ficava para tras em silencio e a
// flag subia dizendo que o layout estava migrado.
export type ListagemResultado =
  | { estado: 'listada'; basenames: string[] }
  | { estado: 'inexistente' }
  | { estado: 'falhou' };

async function listarBasenames(folderUri: string): Promise<ListagemResultado> {
  const ehContent = folderUri.startsWith('content://');
  try {
    if (ehContent) {
      const uris = await StorageAccessFramework.readDirectoryAsync(folderUri);
      const out: string[] = [];
      for (const u of uris) {
        const decoded = decodeURIComponent(u);
        const last = decoded.split('/').pop() ?? '';
        if (last.length > 0 && !ehSyncConflict(last)) out.push(last);
      }
      return { estado: 'listada', basenames: out };
    }
    const nomes = await FileSystem.readDirectoryAsync(folderUri);
    return {
      estado: 'listada',
      basenames: nomes.filter((n) => !ehSyncConflict(n)),
    };
  } catch {
    // Distinguir os dois casos so' e' possivel em file://.
    //
    // Em content:// (SAF) getInfoAsync NAO serve como discriminador, e o
    // resultado seria INVERTIDO: para esse scheme ele so devolve
    // exists:true quando consegue abrir um InputStream, coisa que um
    // DIRETORIO nunca faz -- pasta existente e legivel devolveria
    // exists:false. E pasta ausente nem chega la, porque a checagem de
    // permissao levanta antes. Mapear isso daria "inexistente" para
    // pasta boa e "falhou" para pasta ausente: exatamente o contrario do
    // que a sprint quer, e travaria a flag one-shot para sempre --
    // transformando a migracao num fan-out de 22 listagens SAF por boot.
    //
    // Entao em content:// mantemos o comportamento historico
    // (fail-open, tratado como inexistente) e a melhoria vale para
    // file://, que e' o caminho do Vault em armazenamento primario.
    if (ehContent) return { estado: 'inexistente' };
    try {
      const info = await FileSystem.getInfoAsync(folderUri);
      return info.exists ? { estado: 'falhou' } : { estado: 'inexistente' };
    } catch {
      // Nem listar nem sondar: nao da para afirmar que sumiu.
      return { estado: 'falhou' };
    }
  }
}

// AUDIT-P1-5B: traduz o resultado da listagem para os call sites.
// Devolve os basenames quando deu para listar; null quando nao ha o que
// iterar. 'falhou' conta como UMA falha da pasta inteira -- sem isso a
// flag one-shot subiria com a pasta ilegivel para tras, e o proximo boot
// nao tentaria de novo.
function basenamesOuFalha(
  r: ListagemResultado,
  resultado: MigracaoLayoutResultado,
  relPasta: string
): string[] | null {
  if (r.estado === 'listada') return r.basenames;
  if (r.estado === 'falhou') {
    resultado.falhas += 1;
    resultado.pathsFalhos.push(relPasta);
  }
  return null;
}

// Resultado de um movimento individual. Os tres estados existem para
// desfazer a ambiguidade do `boolean` anterior (AUDIT-P1-5), que
// devolvia `false` tanto para sucesso benigno quanto para erro real:
//   - 'movido':    copia concluida nesta execucao (origem removida).
//   - 'ja-estava': destino ja existia; nada a fazer. Sucesso idempotente,
//                  o registro esta visivel para os leitores.
//   - 'falhou':    copyAsync levantou. O arquivo continua no layout
//                  legado e nenhum leitor o enxerga.
export type MovimentoResultado = 'movido' | 'ja-estava' | 'falhou';

// Move um arquivo de origem para destino se origem existir e destino
// nao existir. Idempotente: chamadas repetidas sem efeito colateral.
async function moverIdempotente(
  origemUri: string,
  destinoUri: string
): Promise<MovimentoResultado> {
  let destinoExiste = false;
  try {
    const info = await FileSystem.getInfoAsync(destinoUri);
    destinoExiste = info.exists === true;
  } catch {
    destinoExiste = false;
  }
  if (destinoExiste) {
    // Origem ainda existe? Se sim, deleta para limpar layout antigo.
    // Falha do delete nao e falha da migracao: o destino esta la e os
    // leitores enxergam o registro; sobra so uma duplicata legada.
    try {
      await FileSystem.deleteAsync(origemUri, { idempotent: true });
    } catch {
      // Best-effort.
    }
    return 'ja-estava';
  }
  try {
    await FileSystem.copyAsync({ from: origemUri, to: destinoUri });
    try {
      await FileSystem.deleteAsync(origemUri, { idempotent: true });
    } catch {
      // Best-effort: duplicata aceitavel ate proximo boot.
    }
    return 'movido';
  } catch {
    return 'falhou';
  }
}

// Executa um movimento e contabiliza no acumulador da migracao. Recebe
// paths RELATIVOS ao vaultRoot porque a lista de falhas precisa deles
// (o URI absoluto de content:// nao diz nada ao ler o log).
//
// 'ja-estava' nao entra em nenhum contador: nao houve trabalho novo e
// tambem nao houve falha. Contar como falha travaria a flag para sempre
// em qualquer Vault ja migrado.
async function moverEContabilizar(
  resultado: MigracaoLayoutResultado,
  vaultRoot: string,
  relOrigem: string,
  relDestino: string
): Promise<void> {
  const movimento = await moverIdempotente(
    joinUri(vaultRoot, relOrigem),
    joinUri(vaultRoot, relDestino)
  );
  if (movimento === 'movido') {
    resultado.migrados += 1;
  } else if (movimento === 'falhou') {
    resultado.falhas += 1;
    resultado.pathsFalhos.push(relOrigem);
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
  resultado: MigracaoLayoutResultado,
  vaultRoot: string,
  folderLegado: string,
  prefix: string,
  dropDate: boolean
): Promise<void> {
  const folderUri = joinUri(vaultRoot, folderLegado);
  const basenames = basenamesOuFalha(
    await listarBasenames(folderUri),
    resultado,
    folderLegado
  );
  if (basenames === null) return;
  for (const basename of basenames) {
    if (!basename.endsWith('.md')) continue;
    const stemSemExt = basename.replace(/\.md$/i, '');
    const stemFinal = dropDate ? dropDateFromBasename(basename) : stemSemExt;
    const novoBasename = `${prefix}${stemFinal}.md`;
    await moverEContabilizar(
      resultado,
      vaultRoot,
      `${folderLegado}/${basename}`,
      `markdown/${novoBasename}`
    );
  }
}

// Migra binarios de uma pasta legada para <pastaBin>/<prefix><stem>.<ext>,
// e companion .md (se houver) para markdown/<prefix><stem>.md.
// Companion legado vivia mesma pasta do binario (ADR-0017 antigo);
// novo layout move companion para markdown/.
async function migrarBinariosFolder(
  resultado: MigracaoLayoutResultado,
  vaultRoot: string,
  folderLegado: string,
  pastaBin: string,
  prefix: string,
  filtroBinario: (basename: string) => boolean
): Promise<void> {
  const folderUri = joinUri(vaultRoot, folderLegado);
  const basenames = basenamesOuFalha(
    await listarBasenames(folderUri),
    resultado,
    folderLegado
  );
  if (basenames === null) return;
  for (const basename of basenames) {
    if (basename.endsWith('.md')) {
      // companion: vai para markdown/<prefix><stem>.md.
      const stem = basename.replace(/\.md$/i, '');
      await moverEContabilizar(
        resultado,
        vaultRoot,
        `${folderLegado}/${basename}`,
        `markdown/${prefix}${stem}.md`
      );
      continue;
    }
    if (!filtroBinario(basename)) continue;
    await moverEContabilizar(
      resultado,
      vaultRoot,
      `${folderLegado}/${basename}`,
      `${pastaBin}/${prefix}${basename}`
    );
  }
}

// Migra agenda/<pessoa>/<basename>.md -> markdown/agenda-<pessoa>-<stem>.md.
async function migrarAgenda(
  resultado: MigracaoLayoutResultado,
  vaultRoot: string,
  pessoa: 'pessoa_a' | 'pessoa_b'
): Promise<void> {
  const relPasta = `agenda/${pessoa}`;
  const folderUri = joinUri(vaultRoot, relPasta);
  const basenames = basenamesOuFalha(
    await listarBasenames(folderUri),
    resultado,
    relPasta
  );
  if (basenames === null) return;
  for (const basename of basenames) {
    if (!basename.endsWith('.md')) continue;
    const stem = basename.replace(/\.md$/i, '');
    await moverEContabilizar(
      resultado,
      vaultRoot,
      `agenda/${pessoa}/${basename}`,
      `markdown/agenda-${pessoa}-${stem}.md`
    );
  }
}

// Migra medidas-fotos: media/fotos/medidas-<YYYY-MM-DD>-<lado>.jpg
// vai para jpg/medidas-<YYYY-MM-DD>-<lado>.jpg, companion correspondente
// vai para markdown/medidas-foto-<YYYY-MM-DD>-<lado>.md.
async function migrarMedidasFotos(
  resultado: MigracaoLayoutResultado,
  vaultRoot: string
): Promise<void> {
  const folderUri = joinUri(vaultRoot, 'media/fotos');
  const basenames = basenamesOuFalha(
    await listarBasenames(folderUri),
    resultado,
    'media/fotos'
  );
  if (basenames === null) return;
  for (const basename of basenames) {
    if (!basename.startsWith('medidas-')) continue;
    if (basename.endsWith('.md')) {
      // companion: medidas-<data>-<lado>.md -> markdown/medidas-foto-<data>-<lado>.md
      const stem = basename.replace(/^medidas-/, '').replace(/\.md$/i, '');
      await moverEContabilizar(
        resultado,
        vaultRoot,
        `media/fotos/${basename}`,
        `markdown/medidas-foto-${stem}.md`
      );
      continue;
    }
    if (!/\.(jpg|jpeg|png)$/i.test(basename)) continue;
    // binario: medidas-<data>-<lado>.jpg -> jpg/medidas-<data>-<lado>.jpg
    await moverEContabilizar(
      resultado,
      vaultRoot,
      `media/fotos/${basename}`,
      `jpg/${basename}`
    );
  }
}

// Migra inbox/_devices.md -> markdown/_devices.md.
//
// Unico passo que nao vem de uma listagem de pasta: o path e fixo e
// pode simplesmente nao existir (caso comum). Sem o getInfoAsync da
// origem, o copyAsync levantaria ENOENT e — com a contabilidade de
// falhas de AUDIT-P1-5 — todo Vault sem devices index legado ficaria
// com `falhas >= 1` para sempre, travando a flag e re-rodando a
// migracao inteira a cada boot.
async function migrarDevicesIndex(
  resultado: MigracaoLayoutResultado,
  vaultRoot: string
): Promise<void> {
  const origemRel = 'inbox/_devices.md';
  let origemExiste = false;
  try {
    const info = await FileSystem.getInfoAsync(joinUri(vaultRoot, origemRel));
    origemExiste = info.exists === true;
  } catch {
    origemExiste = false;
  }
  if (!origemExiste) return;
  await moverEContabilizar(
    resultado,
    vaultRoot,
    origemRel,
    'markdown/_devices.md'
  );
}

export interface MigracaoLayoutResultado {
  migrados: number;
  // AUDIT-P1-5: arquivos que ficaram no layout legado por erro de I/O.
  // Enquanto > 0 a flag `vaultLayoutMigrado` nao sobe.
  falhas: number;
  // Paths RELATIVOS ao vaultRoot dos arquivos que falharam. Nunca o
  // conteudo do arquivo.
  pathsFalhos: string[];
}

function novoResultado(): MigracaoLayoutResultado {
  return { migrados: 0, falhas: 0, pathsFalhos: [] };
}

// Os 8 passos da migracao, isolados do controle de flags para que a
// varredura de recuperacao (AUDIT-P1-5) reuse exatamente o mesmo
// caminho de codigo — nao uma copia que envelhece em silencio.
async function executarPassosMigracao(
  resultado: MigracaoLayoutResultado,
  vaultRoot: string
): Promise<void> {
  // 1. .md por feature -> markdown/<prefix><stem>.md
  await migrarMarkdownFolder(resultado, vaultRoot, 'daily', 'humor-', false);
  await migrarMarkdownFolder(resultado, vaultRoot, 'eventos', 'evento-', false);
  await migrarMarkdownFolder(resultado, vaultRoot, 'marcos', 'marco-', false);
  await migrarMarkdownFolder(
    resultado,
    vaultRoot,
    'medidas',
    'medidas-',
    false
  );
  await migrarMarkdownFolder(
    resultado,
    vaultRoot,
    'exercicios',
    'exercicio-',
    false
  );
  await migrarMarkdownFolder(
    resultado,
    vaultRoot,
    'inbox/saude/ciclo',
    'ciclo-',
    false
  );
  await migrarMarkdownFolder(
    resultado,
    vaultRoot,
    'inbox/mente/diario',
    'diario-',
    false
  );
  await migrarMarkdownFolder(resultado, vaultRoot, 'alarmes', 'alarme-', false);
  await migrarMarkdownFolder(resultado, vaultRoot, 'tarefas', 'tarefa-', true);
  await migrarMarkdownFolder(
    resultado,
    vaultRoot,
    'contadores',
    'contador-',
    false
  );

  // 2. agenda por pessoa.
  await migrarAgenda(resultado, vaultRoot, 'pessoa_a');
  await migrarAgenda(resultado, vaultRoot, 'pessoa_b');

  // 3. devices index legado.
  await migrarDevicesIndex(resultado, vaultRoot);

  // 4. medidas-fotos (caso especial: vivem em media/fotos/ com prefixo
  // 'medidas-'). Deve rodar ANTES da migracao geral de media/fotos/.
  await migrarMedidasFotos(resultado, vaultRoot);

  // 5. media/frases -> markdown/frase-<stem>.md
  await migrarMarkdownFolder(
    resultado,
    vaultRoot,
    'media/frases',
    'frase-',
    false
  );

  // 6. binarios + companions.
  await migrarBinariosFolder(
    resultado,
    vaultRoot,
    'media/fotos',
    'jpg',
    'foto-',
    (b) => /\.(jpg|jpeg)$/i.test(b)
  );
  await migrarBinariosFolder(
    resultado,
    vaultRoot,
    'media/fotos',
    'png',
    'foto-',
    (b) => /\.png$/i.test(b)
  );
  await migrarBinariosFolder(
    resultado,
    vaultRoot,
    'media/audios',
    'm4a',
    'audio-',
    (b) => /\.(m4a|mp3|wav|ogg|opus)$/i.test(b)
  );
  await migrarBinariosFolder(
    resultado,
    vaultRoot,
    'media/videos',
    'mp4',
    'video-',
    (b) => /\.(mp4|mov|webm)$/i.test(b)
  );
  await migrarBinariosFolder(
    resultado,
    vaultRoot,
    'media/scanner',
    'pdf',
    'scanner-',
    (b) => /\.pdf$/i.test(b)
  );
  await migrarBinariosFolder(
    resultado,
    vaultRoot,
    'media/scanner',
    'jpg',
    'scanner-',
    (b) => /\.(jpg|jpeg)$/i.test(b)
  );

  // 7. avatares: media/avatares/<pessoa>-<ts>.jpg -> jpg/avatar-<pessoa>-<ts>.jpg
  {
    const folderUri = joinUri(vaultRoot, 'media/avatares');
    const basenames = basenamesOuFalha(
      await listarBasenames(folderUri),
      resultado,
      'media/avatares'
    );
    for (const basename of basenames ?? []) {
      if (!/\.(jpg|jpeg|png)$/i.test(basename)) continue;
      await moverEContabilizar(
        resultado,
        vaultRoot,
        `media/avatares/${basename}`,
        `jpg/avatar-${basename}`
      );
    }
  }

  // 8. exercicios GIFs: assets/exercicios/<slug>.gif -> gif/exercicio-<slug>.gif
  {
    const folderUri = joinUri(vaultRoot, 'assets/exercicios');
    const basenames = basenamesOuFalha(
      await listarBasenames(folderUri),
      resultado,
      'assets/exercicios'
    );
    for (const basename of basenames ?? []) {
      if (!/\.gif$/i.test(basename)) continue;
      await moverEContabilizar(
        resultado,
        vaultRoot,
        `assets/exercicios/${basename}`,
        `gif/exercicio-${basename}`
      );
    }
  }
}

// Diagnostico das falhas parciais. So emite em __DEV__ (devLog); em
// release o corpo vira dead-code. Registra contagem e paths relativos,
// nunca o conteudo do arquivo.
function logarFalhas(origem: string, resultado: MigracaoLayoutResultado): void {
  if (resultado.falhas === 0) return;
  devLog('[migrarVaultLayout]', origem, 'falhas parciais', {
    falhas: resultado.falhas,
    migrados: resultado.migrados,
    paths: resultado.pathsFalhos,
    aviso:
      'arquivos ou pastas inteiras seguem no layout legado e nenhum leitor os enxerga; ' +
      'flag nao marcada, proximo boot re-tenta',
  });
}

// Entry point do boot hook. Idempotente. Em web no-op (vault mock).
//
// AUDIT-P1-5: a flag `vaultLayoutMigrado` so e marcada quando
// `falhas === 0`. Quando ja esta marcada, delega uma unica varredura de
// recuperacao para Vaults migrados pela versao que subia a flag
// incondicionalmente.
export async function migrarVaultLayoutPorTipo(
  vaultRoot: string
): Promise<MigracaoLayoutResultado> {
  const resultado = novoResultado();
  if (Platform.OS === 'web') return resultado;
  if (vaultRoot.startsWith('web://')) return resultado;

  const flags = useSessao.getState().flags;
  if (flags.vaultLayoutMigrado) {
    if (flags.vaultLayoutOrfaosVarridos) return resultado;
    return recuperarOrfaosVaultLayout(vaultRoot);
  }

  await executarPassosMigracao(resultado, vaultRoot);

  if (resultado.falhas > 0) {
    // Contrato do cabecalho: flag NAO sobe com falha parcial. O proximo
    // boot re-tenta; destino existente nao e sobrescrito, entao repetir
    // e barato e seguro.
    logarFalhas('migracao', resultado);
    return resultado;
  }

  // Sucesso total: marca flag para skip rapido em boots futuros. A
  // varredura de recuperacao tambem e dispensada — nao ha orfaos que
  // ela pudesse achar.
  useSessao.getState().marcarFlagBoot('vaultLayoutMigrado');
  useSessao.getState().marcarFlagBoot('vaultLayoutOrfaosVarridos');
  return resultado;
}

// Varredura de recuperacao one-shot (AUDIT-P1-5). Roda os mesmos 8
// passos IGNORANDO `vaultLayoutMigrado`, para resgatar arquivos que a
// versao antiga deixou no layout legado quando a copia falhou e a flag
// subiu assim mesmo.
//
// Idempotente por construcao: num Vault sadio as pastas legadas estao
// vazias e o custo e apenas o das listagens. Guardada pela flag propria
// `vaultLayoutOrfaosVarridos`, que so sobe quando a varredura termina
// sem falhas — se falhar, o proximo boot tenta de novo.
export async function recuperarOrfaosVaultLayout(
  vaultRoot: string
): Promise<MigracaoLayoutResultado> {
  const resultado = novoResultado();
  if (Platform.OS === 'web') return resultado;
  if (vaultRoot.startsWith('web://')) return resultado;

  await executarPassosMigracao(resultado, vaultRoot);

  if (resultado.falhas > 0) {
    logarFalhas('recuperacao de orfaos', resultado);
    return resultado;
  }

  if (resultado.migrados > 0) {
    devLog('[migrarVaultLayout]', 'orfaos recuperados', {
      migrados: resultado.migrados,
    });
  }
  useSessao.getState().marcarFlagBoot('vaultLayoutOrfaosVarridos');
  return resultado;
}
