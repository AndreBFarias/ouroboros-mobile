// Testes do cliente de upload de backup para o Google Drive.
// R-INT-5-GOOGLE-DRIVE-BACKUP-AUTO (2026-05-25).
//
// REUSO: o executor executarBackupDrive recebe TODAS as deps por injecao
// (token, listagem de backup local, leitura do zip, sha, http). Os testes
// exercitam-no com fakes deterministicos -- sem rede, sem store, sem
// FileSystem. Cobrem:
//
//   1. Token null -> no-op gracioso (conta nao conectada), nao chama http.
//   2. Sem backup local -> no-op gracioso, nao chama http.
//   3. sha ja existe no Drive -> idempotencia: jaExistia=true, nao upa.
//   4. Caminho feliz: cria pasta (ausente) + upload multipart -> uploadado.
//   5. Pasta ja existe -> reusa folderId, nao cria de novo.
//   6. Excecao no http -> { uploadado: false, erro } sem rethrow.
//   7. Adapter criarIntegracaoDriveBackup mapeia resultado para o
//      contrato Integracao do scheduler.
//
// Comentarios sem acento (convencao shell/CI).
import {
  executarBackupDrive,
  criarIntegracaoDriveBackup,
  DRIVE_PASTA_NOME,
  DRIVE_PROP_SHA256,
  type DriveHttp,
  type ExecutarBackupDriveDeps,
} from '@/lib/integracoes/google/driveBackup';

// Mock dos modulos nativos para o adapter (que importa
// fazerBackupDrive -> Platform/FileSystem/store). Platform web faz a
// funcao publica retornar no-op gracioso sem tocar rede.
jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'web' },
}));

// Http fake configuravel: registra chamadas e devolve respostas pre-
// programadas. Sem rede.
function criarHttpFake(over: Partial<DriveHttp> = {}): {
  http: DriveHttp;
  chamadas: {
    listar: Array<{ query: string }>;
    criarPasta: number;
    upload: Array<{ nome: string; pastaId: string; sha256: string }>;
  };
} {
  const chamadas = {
    listar: [] as Array<{ query: string }>,
    criarPasta: 0,
    upload: [] as Array<{ nome: string; pastaId: string; sha256: string }>,
  };
  const http: DriveHttp = {
    listar: async (query) => {
      chamadas.listar.push({ query });
      return [];
    },
    criarPasta: async () => {
      chamadas.criarPasta += 1;
      return 'pasta-nova-id';
    },
    uploadMultipart: async (input) => {
      chamadas.upload.push({
        nome: input.nome,
        pastaId: input.pastaId,
        sha256: input.sha256,
      });
      return 'file-novo-id';
    },
    ...over,
  };
  return { http, chamadas };
}

function depsBase(over: Partial<ExecutarBackupDriveDeps> = {}): {
  deps: ExecutarBackupDriveDeps;
  chamadas: ReturnType<typeof criarHttpFake>['chamadas'];
} {
  const { http, chamadas } = criarHttpFake(
    (over.http as Partial<DriveHttp>) ?? {}
  );
  const deps: ExecutarBackupDriveDeps = {
    refreshToken: async () => 'tok-valido',
    acharBackupLocal: async () => ({
      uri: 'file:///docs/auto/backup-20260525T120000.zip',
      nome: 'backup-20260525T120000.zip',
    }),
    lerZipBase64: async () => 'QUJDREVG', // "ABCDEF" base64
    calcularSha: () => 'sha-fixo-123',
    http,
    ...over,
    // garante que http custom de over.http nao sobrescreva o instrumentado
    ...(over.http ? {} : {}),
  };
  return { deps, chamadas };
}

describe('executarBackupDrive', () => {
  it('token null: no-op gracioso, nao toca http', async () => {
    const { http, chamadas } = criarHttpFake();
    const r = await executarBackupDrive({
      refreshToken: async () => null,
      acharBackupLocal: async () => ({ uri: 'x', nome: 'x.zip' }),
      lerZipBase64: async () => 'QQ==',
      calcularSha: () => 'sha',
      http,
    });
    expect(r.uploadado).toBe(false);
    expect(r.erro).toBe('Conta Google não conectada.');
    expect(chamadas.listar).toHaveLength(0);
    expect(chamadas.upload).toHaveLength(0);
  });

  it('sem backup local: no-op gracioso, nao toca http', async () => {
    const { http, chamadas } = criarHttpFake();
    const r = await executarBackupDrive({
      refreshToken: async () => 'tok',
      acharBackupLocal: async () => null,
      lerZipBase64: async () => 'QQ==',
      calcularSha: () => 'sha',
      http,
    });
    expect(r.uploadado).toBe(false);
    expect(r.erro).toBe('Nenhum backup local para enviar.');
    expect(chamadas.listar).toHaveLength(0);
  });

  it('idempotencia: mesmo sha ja no Drive nao re-upa', async () => {
    const { http, chamadas } = criarHttpFake({
      listar: async (query) => {
        // primeira chamada e a query de duplicata; devolve um arquivo
        if (query.includes(DRIVE_PROP_SHA256)) {
          return [{ id: 'ja-existe-id', name: 'backup-antigo.zip' }];
        }
        return [];
      },
    });
    const r = await executarBackupDrive({
      refreshToken: async () => 'tok',
      acharBackupLocal: async () => ({ uri: 'u', nome: 'b.zip' }),
      lerZipBase64: async () => 'QUJD',
      calcularSha: () => 'sha-dup',
      http,
    });
    expect(r.uploadado).toBe(false);
    expect(r.jaExistia).toBe(true);
    expect(r.fileId).toBe('ja-existe-id');
    expect(chamadas.upload).toHaveLength(0);
    expect(chamadas.criarPasta).toBe(0);
  });

  it('caminho feliz: cria pasta ausente e faz upload', async () => {
    const { deps, chamadas } = depsBase();
    const r = await executarBackupDrive(deps);
    expect(r.uploadado).toBe(true);
    expect(r.fileId).toBe('file-novo-id');
    expect(typeof r.bytes).toBe('number');
    expect(chamadas.criarPasta).toBe(1);
    expect(chamadas.upload).toHaveLength(1);
    expect(chamadas.upload[0]?.pastaId).toBe('pasta-nova-id');
    expect(chamadas.upload[0]?.sha256).toBe('sha-fixo-123');
    // a query de pasta usa o nome canonico
    expect(
      chamadas.listar.some((c) => c.query.includes(DRIVE_PASTA_NOME))
    ).toBe(true);
  });

  it('pasta ja existe: reusa folderId, nao cria de novo', async () => {
    const { http, chamadas } = criarHttpFake({
      listar: async (query) => {
        if (query.includes(DRIVE_PROP_SHA256)) return []; // sem duplicata
        // query de pasta -> ja existe
        return [{ id: 'pasta-existente', name: DRIVE_PASTA_NOME }];
      },
    });
    const r = await executarBackupDrive({
      refreshToken: async () => 'tok',
      acharBackupLocal: async () => ({ uri: 'u', nome: 'b.zip' }),
      lerZipBase64: async () => 'QUJD',
      calcularSha: () => 'sha-x',
      http,
    });
    expect(r.uploadado).toBe(true);
    expect(chamadas.criarPasta).toBe(0);
    expect(chamadas.upload[0]?.pastaId).toBe('pasta-existente');
  });

  it('excecao no http: retorna erro sem rethrow', async () => {
    const { http } = criarHttpFake({
      listar: async () => {
        throw new Error('drive.list 401: token invalido');
      },
    });
    const r = await executarBackupDrive({
      refreshToken: async () => 'tok',
      acharBackupLocal: async () => ({ uri: 'u', nome: 'b.zip' }),
      lerZipBase64: async () => 'QUJD',
      calcularSha: () => 'sha-y',
      http,
    });
    expect(r.uploadado).toBe(false);
    expect(r.erro).toContain('401');
  });
});

describe('criarIntegracaoDriveBackup (adapter scheduler)', () => {
  it('em web faz no-op gracioso mapeado para novos 0 / erro null', async () => {
    // Platform.OS === 'web' (mock) faz fazerBackupDrive retornar no-op
    // gracioso; o adapter NAO propaga isso como erro de scheduler.
    const integracao = criarIntegracaoDriveBackup('file:///vault', new Date());
    expect(integracao.nome).toBe('drive_backup');
    const r = await integracao.sincronizar();
    expect(r).toEqual({ novos: 0, erro: null });
  });
});
