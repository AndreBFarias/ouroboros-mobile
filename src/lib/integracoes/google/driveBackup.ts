// Cliente de upload do ZIP de backup local para o Google Drive.
// R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO (2026-05-25).
//
// REUSO (nao recriamos nada):
//   - OAuth/token: useGoogleAuth + SCOPE_DRIVE_FILE (googleAuthFlow.ts).
//   - ZIP local: listarBackupsArquivados() de executarBackup.ts, que ja
//     gera o backup fiel via exportarVaultZip (MANIFEST + sha256 +
//     binarios) em Documents/Ouroboros-Backups/auto/.
//   - sha256: sha256Base64 de crypto/sha256.
//
// PASSO HUMANO PENDENTE (R-SEC-1): o upload so funciona em runtime real
// DEPOIS que o dono registrar o scope drive.file no OAuth consent screen
// do Google Cloud Console (e, se Google exigir, passar pela verificacao).
// Ate la este modulo fica DORMENTE: o toggle backupDriveAutomatico nasce
// OFF e nada chama fazerBackupDrive sem opt-in explicito. Sem rede de
// saida por default (principio do projeto).
//
// Arquitetura de testabilidade: a funcao publica fazerBackupDrive monta
// as dependencias reais (token via store, listagem via FileSystem, fetch
// global) e delega para executarBackupDrive, que recebe TODAS as deps por
// injecao. Os testes exercitam executarBackupDrive com fakes
// deterministicos (sem rede, sem store, sem FileSystem).
//
// Comentarios sem acento (convencao shell/CI). Strings de erro em PT-BR
// sentence case com acentuacao.
//
// IMPORTANTE (testabilidade): so importamos TIPOS estaticamente. As deps
// de runtime (react-native Platform, expo-file-system, useGoogleAuth,
// listarBackupsArquivados) entram via import dinamico DENTRO de
// fazerBackupDrive. Isso espelha o padrao de calendarSync.ts (apenas
// import type) e mantem o modulo importavel em testes Jest sem arrastar a
// cadeia nativa do Expo. O executor puro (executarBackupDrive) e o
// adapter dependem apenas de injecao.
import type { Integracao } from '@/lib/integracoes/scheduler';
import type { PessoaAutor } from '@/lib/schemas/pessoa';

// Nome canonico da pasta criada no Drive para abrigar os backups. Drive
// nao tem caminhos: a "pasta" e' um file com mimeType folder; o ZIP entra
// como filho via parents=[folderId].
export const DRIVE_PASTA_NOME = 'Ouroboros Backups';

// Custom property gravada no metadata de cada ZIP no Drive. Permite
// idempotencia: antes de subir, listamos arquivos com este property ==
// sha do ZIP local; se ja existe, nao re-upamos.
export const DRIVE_PROP_SHA256 = 'ouroboros_backup_sha256';

// Endpoints Drive v3. Upload multipart e' endpoint separado do CRUD de
// metadata (vide referencia da spec).
const DRIVE_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

// Resultado canonico do upload. uploadado=false cobre tanto no-op
// gracioso (sem token, sem backup, ja existente) quanto falha (erro
// preenchido). fileId presente quando subiu ou ja existia.
export interface DriveBackupResultado {
  uploadado: boolean;
  fileId?: string;
  bytes?: number;
  // Sentence case PT-BR com acentuacao quando preenchido.
  erro?: string;
  // true quando o sha ja existia no Drive (idempotencia: nao re-upou).
  jaExistia?: boolean;
}

// Descricao minima de um arquivo no Drive (resposta de files.list).
export interface DriveArquivo {
  id: string;
  name: string;
}

// Cliente HTTP minimo que o executor usa. Injetado nos testes.
export interface DriveHttp {
  // Lista arquivos via files.list. Retorna ids+names (sem paginacao
  // alem da primeira pagina: o uso aqui e' encontrar pasta unica ou
  // checar duplicata por property, ambos cabem na primeira pagina).
  listar(query: string, accessToken: string): Promise<DriveArquivo[]>;
  // Cria a pasta de backups e retorna o id.
  criarPasta(nome: string, accessToken: string): Promise<string>;
  // Faz upload multipart do ZIP (conteudo base64) com metadata. Retorna
  // o fileId criado.
  uploadMultipart(input: {
    nome: string;
    pastaId: string;
    sha256: string;
    conteudoBase64: string;
    accessToken: string;
  }): Promise<string>;
}

// Dependencias injetaveis de executarBackupDrive. A funcao publica
// fazerBackupDrive preenche com as implementacoes reais.
export interface ExecutarBackupDriveDeps {
  // Garante access token valido (refresh se preciso). null = conta nao
  // conectada ou invalida -> no-op gracioso.
  refreshToken: () => Promise<string | null>;
  // Localiza o ZIP de backup local mais recente. null = nada para subir.
  acharBackupLocal: () => Promise<{ uri: string; nome: string } | null>;
  // Le o ZIP local como base64 (para o multipart e para o sha256).
  lerZipBase64: (uri: string) => Promise<string>;
  // Calcula sha256 do conteudo base64.
  calcularSha: (conteudoBase64: string) => string;
  // Cliente Drive.
  http: DriveHttp;
}

// Monta a query files.list para localizar a pasta de backups por nome,
// nao-trashed, tipo folder, no escopo do app. Drive escapa aspas simples
// no valor; o nome canonico nao tem aspas entao concatenacao direta e'
// segura aqui.
function queryPasta(nome: string): string {
  return `mimeType='application/vnd.google-apps.folder' and name='${nome}' and trashed=false`;
}

// Query para checar se um ZIP com este sha ja foi uploadado. Usa
// appProperties (custom property privada do app).
function queryDuplicata(sha256: string): string {
  return `appProperties has { key='${DRIVE_PROP_SHA256}' and value='${sha256}' } and trashed=false`;
}

// Garante a pasta de backups: procura por nome; cria se ausente. Retorna
// o folderId.
async function garantirPasta(
  http: DriveHttp,
  accessToken: string
): Promise<string> {
  const achados = await http.listar(queryPasta(DRIVE_PASTA_NOME), accessToken);
  const existente = achados[0];
  if (existente) return existente.id;
  return http.criarPasta(DRIVE_PASTA_NOME, accessToken);
}

// Executor puro: recebe todas as deps por injecao. Fluxo:
//   1. Token null -> no-op gracioso (conta nao conectada).
//   2. Sem ZIP local -> no-op gracioso (nada para subir ainda).
//   3. Calcula sha do ZIP; se ja existe no Drive -> idempotente, no-op.
//   4. Garante pasta; faz upload multipart; retorna fileId.
// Qualquer excecao vira { uploadado: false, erro } sem rethrow para nao
// derrubar o orquestrador de integracoes.
export async function executarBackupDrive(
  deps: ExecutarBackupDriveDeps
): Promise<DriveBackupResultado> {
  try {
    const accessToken = await deps.refreshToken();
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      return { uploadado: false, erro: 'Conta Google não conectada.' };
    }
    const local = await deps.acharBackupLocal();
    if (!local) {
      return { uploadado: false, erro: 'Nenhum backup local para enviar.' };
    }
    const conteudoBase64 = await deps.lerZipBase64(local.uri);
    const sha = deps.calcularSha(conteudoBase64);

    // Idempotencia: se um arquivo com este sha ja existe no Drive, nao
    // re-upamos. Devolve o fileId existente para a UI confirmar.
    const duplicatas = await deps.http.listar(queryDuplicata(sha), accessToken);
    const duplicata = duplicatas[0];
    if (duplicata) {
      return { uploadado: false, jaExistia: true, fileId: duplicata.id };
    }

    const pastaId = await garantirPasta(deps.http, accessToken);
    const fileId = await deps.http.uploadMultipart({
      nome: local.nome,
      pastaId,
      sha256: sha,
      conteudoBase64,
      accessToken,
    });
    // bytes originais do ZIP a partir do base64 (3 bytes por 4 chars,
    // descontando padding).
    const limpos = conteudoBase64.replace(/=+$/g, '');
    const bytes = Math.floor((limpos.length * 3) / 4);
    return { uploadado: true, fileId, bytes };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'Falha desconhecida no upload.';
    return { uploadado: false, erro: msg };
  }
}

// Implementacao real do DriveHttp via fetch global. Lanca em status
// >= 400 com texto do servidor para diagnostico (capturado pelo
// try/catch do executor).
export const driveHttpReal: DriveHttp = {
  async listar(query, accessToken) {
    const url = `${DRIVE_FILES_URL}?q=${encodeURIComponent(
      query
    )}&fields=${encodeURIComponent('files(id,name)')}&spaces=drive`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const detalhe = await res.text();
      throw new Error(`drive.list ${res.status}: ${detalhe}`);
    }
    const json = (await res.json()) as { files?: DriveArquivo[] };
    return Array.isArray(json.files) ? json.files : [];
  },
  async criarPasta(nome, accessToken) {
    const res = await fetch(`${DRIVE_FILES_URL}?fields=id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: nome,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (!res.ok) {
      const detalhe = await res.text();
      throw new Error(`drive.criarPasta ${res.status}: ${detalhe}`);
    }
    const json = (await res.json()) as { id?: string };
    if (typeof json.id !== 'string' || json.id.length === 0) {
      throw new Error('drive.criarPasta: resposta sem id.');
    }
    return json.id;
  },
  async uploadMultipart(input) {
    // Multipart related: parte 1 = metadata JSON; parte 2 = bytes do ZIP.
    // O conteudo chega em base64; sinalizamos Content-Transfer-Encoding
    // base64 para o Drive decodificar a parte binaria.
    const boundary = `ouroboros-${Date.now()}`;
    const metadata = {
      name: input.nome,
      parents: [input.pastaId],
      mimeType: 'application/zip',
      appProperties: { [DRIVE_PROP_SHA256]: input.sha256 },
    };
    const corpo =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      'Content-Type: application/zip\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      `${input.conteudoBase64}\r\n` +
      `--${boundary}--`;
    const res = await fetch(`${DRIVE_UPLOAD_URL}&fields=id`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: corpo,
    });
    if (!res.ok) {
      const detalhe = await res.text();
      throw new Error(`drive.upload ${res.status}: ${detalhe}`);
    }
    const json = (await res.json()) as { id?: string };
    if (typeof json.id !== 'string' || json.id.length === 0) {
      throw new Error('drive.upload: resposta sem id.');
    }
    return json.id;
  },
};

// API publica conforme contrato da spec. Monta as deps reais e delega ao
// executor puro. `agora` fica disponivel para futura escolha de qual ZIP
// subir por data; hoje subimos sempre o mais recente (o writer local ja
// rotaciona em 4). Mantido na assinatura para estabilidade do contrato.
//
// Em web e' no-op: FileSystem real nao funciona alem do mock e Drive
// upload depende do ZIP local. Sem rede de saida em web.
export async function fazerBackupDrive(
  vaultRoot: string,
  agora: Date,
  pessoa: PessoaAutor = 'pessoa_a'
): Promise<DriveBackupResultado> {
  void agora;
  void vaultRoot;
  // require lazy: so resolve a cadeia nativa em runtime mobile, mantendo o
  // modulo importavel em testes puros (vide nota do topo). require (CJS)
  // em vez de import() dinamico porque o ambiente Jest do projeto nao
  // habilita ESM modules (--experimental-vm-modules); babel-jest resolve
  // require com os mocks normalmente.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Platform } = require('react-native') as typeof import('react-native');
  if (Platform.OS === 'web') {
    return { uploadado: false, erro: 'Backup Drive não disponível em web.' };
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useGoogleAuth } = require('@/lib/stores/googleAuth') as typeof import('@/lib/stores/googleAuth');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { listarBackupsArquivados } = require('@/lib/backup/executarBackup') as typeof import('@/lib/backup/executarBackup');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { sha256Base64 } = require('@/lib/crypto/sha256') as typeof import('@/lib/crypto/sha256');
  return executarBackupDrive({
    refreshToken: () => useGoogleAuth.getState().refreshIfNeeded(pessoa),
    acharBackupLocal: async () => {
      const arquivos = await listarBackupsArquivados();
      const recente = arquivos[0];
      if (!recente) return null;
      return { uri: recente.uri, nome: recente.nome };
    },
    lerZipBase64: (uri) =>
      FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      }),
    calcularSha: (conteudoBase64) => sha256Base64(conteudoBase64),
    http: driveHttpReal,
  });
}

// Adapter para o orquestrador puro de integracoes (scheduler.ts). O
// contrato Integracao espera sincronizar(): { novos, erro }. Mapeamos:
//   - uploadado=true     -> novos: 1 (1 backup enviado).
//   - jaExistia / no-op  -> novos: 0, erro: null (nada a fazer, sucesso).
//   - falha real         -> novos: 0, erro: <mensagem>.
//
// DORMENTE por design: o wiring (app/_layout.tsx) so injeta esta
// integracao no array do scheduler quando featureToggles
// .backupDriveAutomatico === true E o throttle semanal
// (driveBackupUltimaSync) permitir. Enquanto o toggle nasce OFF e o
// scope drive.file aguarda registro no Cloud Console (R-SEC-1), nenhum
// upload ocorre. Pronto para plug sem alterar o scheduler.
export function criarIntegracaoDriveBackup(
  vaultRoot: string,
  agora: Date,
  pessoa: PessoaAutor = 'pessoa_a'
): Integracao {
  return {
    nome: 'drive_backup',
    async sincronizar() {
      const r = await fazerBackupDrive(vaultRoot, agora, pessoa);
      if (r.uploadado) return { novos: 1, erro: null };
      // jaExistia ou no-op gracioso (sem token/sem backup) sao sucessos
      // silenciosos: nada a enviar nao e' erro. So propagamos erro quando
      // houve falha real de upload (erro presente sem jaExistia).
      if (r.jaExistia) return { novos: 0, erro: null };
      // Mensagens de no-op gracioso (conta nao conectada, sem backup
      // local) tambem nao sao erro de execucao do scheduler.
      const noOpGracioso =
        r.erro === 'Conta Google não conectada.' ||
        r.erro === 'Nenhum backup local para enviar.' ||
        r.erro === 'Backup Drive não disponível em web.';
      if (noOpGracioso) return { novos: 0, erro: null };
      return { novos: 0, erro: r.erro ?? 'Falha no upload Drive.' };
    },
  };
}
