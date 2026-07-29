// Sprint M-AUDIT-MIGUE-RESTORE-SNAPSHOT (S3): cobre
// restaurarVaultZip + aplicarSnapshot. Foco no caso "restore com
// snapshot-settings.json restaura stores".
//
// Comentarios sem acento (convencao shell/CI).

// Mock de expo-file-system/legacy: identico ao usado no integration
// test de roundtrip, mas redeclarado para isolamento.
jest.mock('expo-file-system/legacy', () => {
  const arquivos = new Map<
    string,
    { content: string; encoding: 'utf8' | 'base64' }
  >();
  const dirs = new Set<string>();
  dirs.add('file:///mock/cache');
  dirs.add('file:///mock/documents');

  function ensureParents(uri: string): void {
    const parts = uri.split('/');
    parts.pop();
    let acc = '';
    for (const p of parts) {
      acc = acc.length === 0 ? p : `${acc}/${p}`;
      if (acc.length > 0 && !acc.endsWith(':')) {
        dirs.add(acc);
      }
    }
  }

  return {
    __esModule: true,
    documentDirectory: 'file:///mock/documents/',
    cacheDirectory: 'file:///mock/cache/',
    EncodingType: { UTF8: 'utf8', Base64: 'base64' },
    makeDirectoryAsync: jest.fn((uri: string) => {
      dirs.add(uri.replace(/\/$/, ''));
      ensureParents(uri.replace(/\/$/, ''));
      return Promise.resolve();
    }),
    getInfoAsync: jest.fn((uri: string) => {
      const sem = uri.replace(/\/$/, '');
      if (arquivos.has(sem)) {
        return Promise.resolve({ exists: true, isDirectory: false, uri });
      }
      if (dirs.has(sem)) {
        return Promise.resolve({ exists: true, isDirectory: true, uri });
      }
      return Promise.resolve({ exists: false, isDirectory: false, uri });
    }),
    readDirectoryAsync: jest.fn((uri: string) => {
      const base = uri.replace(/\/$/, '') + '/';
      const filhos = new Set<string>();
      for (const k of arquivos.keys()) {
        if (k.startsWith(base)) {
          const resto = k.slice(base.length);
          const idx = resto.indexOf('/');
          filhos.add(idx === -1 ? resto : resto.slice(0, idx));
        }
      }
      return Promise.resolve([...filhos]);
    }),
    writeAsStringAsync: jest.fn(
      (
        uri: string,
        content: string,
        opt?: { encoding?: 'utf8' | 'base64' }
      ) => {
        const encoding = opt?.encoding ?? 'utf8';
        const sem = uri.replace(/\/$/, '');
        arquivos.set(sem, { content, encoding });
        ensureParents(sem);
        return Promise.resolve();
      }
    ),
    readAsStringAsync: jest.fn(
      (uri: string, opt?: { encoding?: 'utf8' | 'base64' }) => {
        const sem = uri.replace(/\/$/, '');
        const entry = arquivos.get(sem);
        if (!entry) {
          return Promise.reject(new Error(`ENOENT: ${uri}`));
        }
        const wanted = opt?.encoding ?? 'utf8';
        if (entry.encoding === wanted) {
          return Promise.resolve(entry.content);
        }
        if (entry.encoding === 'utf8' && wanted === 'base64') {
          return Promise.resolve(
            Buffer.from(entry.content, 'utf8').toString('base64')
          );
        }
        return Promise.resolve(
          Buffer.from(entry.content, 'base64').toString('utf8')
        );
      }
    ),
    deleteAsync: jest.fn(() => Promise.resolve()),
    __arquivos: arquivos,
    __dirs: dirs,
  };
});

jest.mock('@/lib/vault/permissions', () => ({
  __esModule: true,
  loadVaultRoot: jest.fn(() => Promise.resolve('file:///mock/vault')),
}));

jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'android' },
}));

import * as FileSystem from 'expo-file-system/legacy';
import {
  restaurarVaultZip,
  aplicarSnapshot,
} from '@/lib/services/restaurarVault';
import {
  EXPORT_SCHEMA_VERSION,
  type SnapshotSettings,
} from '@/lib/services/exportarVault';
import {
  useSettings,
  type SettingsExportShape,
} from '@/lib/stores/settings';
import { useOnboarding } from '@/lib/stores/onboarding';
import { usePessoa } from '@/lib/stores/pessoa';
import { PESSOAS_CONFIG } from '@/config/pessoas.config';

const VAULT = 'file:///mock/vault';

const fsMock = FileSystem as unknown as {
  __arquivos: Map<string, { content: string; encoding: 'utf8' | 'base64' }>;
  __dirs: Set<string>;
};

function snapshotValido(): SnapshotSettings {
  // R-INFRA-SETTINGS-EXPORT-SHAPE: amarra o literal ao tipo canonico.
  // Se a interface ganhar um campo novo, o tsc reclama aqui (fixture
  // desatualizada) em vez de o erro escapar para o runtime do restore.
  const settings: SettingsExportShape = {
    somVibracao: {
      geral: false,
      despertar: false,
      conquista: true,
      botoes: false,
    },
    pessoa: {
      ativa: 'pessoa_b',
      vaultCompartilhado: false,
      tipoCompanhia: 'duo',
    },
    featureToggles: {
      cicloMenstrual: false,
      alarmePessoal: false,
      todoLeve: true,
      contadorDiasSem: true,
      calendarioConquistas: true,
      widgetHomescreen: true,
      widgetMostraNome: true,
      mostrarFinancasEmDesenvolvimento: true,
      backupAutomaticoSemanal: true,
      healthConnectSync: false,
      recapAmbientAudio: false,
      recapAudioAnexadoAutoplay: true,
      recapMusicaFundo: true,
      googleCalendarSync: false,
      backupDriveAutomatico: false,
      hcAutopullBackground: false,
      reduzirMovimento: false,
    },
    privacidade: {
      biometriaAbrir: true,
      ocultarTranscricoes: true,
    },
    midia: {
      capPorRegistro: 8,
      permitirAudio: false,
    },
    recap: {
      slideshowIntervaloS: 4,
    },
    hcAutopullUltimaSync: {
      Steps: null,
      ExerciseSession: null,
      Weight: null,
      BodyFat: null,
      HeartRate: null,
      SleepSession: null,
      MenstruationFlow: null,
    },
    calendarSyncUltimaSync: {
      pessoa_a: null,
      pessoa_b: null,
    },
    driveBackupUltimaSync: null,
    metaPassosDia: 8000,
  };
  return {
    schema: EXPORT_SCHEMA_VERSION,
    exportadoEm: '2026-05-08T12:00:00.000Z',
    settings,
    onboarding: {
      done: true,
      tipoCompanhia: 'casal',
      sexoDeclarado: {
        pessoa_a: 'feminino',
        pessoa_b: 'masculino',
      },
      permissoes: {
        storage: true,
        camera: true,
        microfone: false,
        notificacoes: true,
        localizacao: false,
      },
    },
    pessoa: {
      pessoaAtiva: 'pessoa_b',
      filtroPessoa: 'ambos',
      nomes: {
        pessoa_a: 'Restaurada A',
        pessoa_b: 'Restaurada B',
      },
      fotos: {
        pessoa_a: 'file:///mock/foto-a.jpg',
        pessoa_b: null,
      },
    },
  };
}

function resetStores() {
  useSettings.getState().resetar();
  useOnboarding.getState().resetar();
  usePessoa.getState().resetar();
}

describe('aplicarSnapshot (M-AUDIT-MIGUE-RESTORE-SNAPSHOT)', () => {
  beforeEach(() => {
    resetStores();
    fsMock.__arquivos.clear();
    fsMock.__dirs.clear();
    fsMock.__dirs.add('file:///mock/cache');
    fsMock.__dirs.add(VAULT);
    jest.clearAllMocks();
  });

  it('aborta sem mexer em stores quando confirmado=false (default Q1)', () => {
    const snap = snapshotValido();
    const settingsAntes = useSettings.getState().somVibracao.geral;
    const nomesAntes = usePessoa.getState().nomes.pessoa_a;

    const r = aplicarSnapshot(snap, { confirmado: false });

    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('nao-confirmado');
    expect(useSettings.getState().somVibracao.geral).toBe(settingsAntes);
    expect(usePessoa.getState().nomes.pessoa_a).toBe(nomesAntes);
  });

  it('aborta com motivo schema-incompativel quando schema diverge (Q2)', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const snap = snapshotValido();
    snap.schema = 999;
    const settingsAntes = useSettings.getState().somVibracao.geral;

    const r = aplicarSnapshot(snap, { confirmado: true });

    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('schema-incompativel');
    expect(useSettings.getState().somVibracao.geral).toBe(settingsAntes);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('aplica snapshot completo nos 3 stores quando confirmado=true', () => {
    const snap = snapshotValido();

    const r = aplicarSnapshot(snap, { confirmado: true });

    expect(r.ok).toBe(true);
    // useSettings.
    expect(useSettings.getState().somVibracao).toEqual(
      snap.settings.somVibracao
    );
    expect(useSettings.getState().featureToggles).toEqual(
      snap.settings.featureToggles
    );
    expect(useSettings.getState().privacidade).toEqual(
      snap.settings.privacidade
    );
    expect(useSettings.getState().midia).toEqual(snap.settings.midia);
    // useOnboarding.
    expect(useOnboarding.getState().done).toBe(true);
    expect(useOnboarding.getState().tipoCompanhia).toBe('casal');
    expect(useOnboarding.getState().sexoDeclarado).toEqual({
      pessoa_a: 'feminino',
      pessoa_b: 'masculino',
    });
    expect(useOnboarding.getState().permissoes).toEqual(
      snap.onboarding.permissoes
    );
    // usePessoa.
    expect(usePessoa.getState().pessoaAtiva).toBe('pessoa_b');
    expect(usePessoa.getState().filtroPessoa).toBe('ambos');
    expect(usePessoa.getState().nomes).toEqual(snap.pessoa.nomes);
    expect(usePessoa.getState().fotos).toEqual(snap.pessoa.fotos);
  });

  it('rejeita snapshot sem chaves obrigatorias', () => {
    const r = aplicarSnapshot(
      { schema: EXPORT_SCHEMA_VERSION } as unknown as SnapshotSettings,
      { confirmado: true }
    );
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('snapshot-invalido');
  });

  // R-RECAP-9b (2026-07-11): restaurar um backup ANTIGO (exportado antes do
  // R-RECAP-9) traz featureToggles SEM recapMusicaFundo. Sem o back-fill, o
  // setState wholesale reintroduzia recapMusicaFundo=undefined -> musica muda
  // (mesma classe do bug do persist, segunda porta via restore).
  it('back-filla featureToggle novo ausente do snapshot antigo, preservando escolha organica', () => {
    const snap = snapshotValido();
    // Escolha organica do usuario no backup: cicloMenstrual desligado.
    snap.settings.featureToggles.cicloMenstrual = false;
    // Simula backup pre-R-RECAP-9: a chave nova nao existia no shape exportado.
    delete (
      snap.settings.featureToggles as unknown as Record<string, unknown>
    ).recapMusicaFundo;
    expect(snap.settings.featureToggles.recapMusicaFundo).toBeUndefined();

    const r = aplicarSnapshot(snap, { confirmado: true });

    expect(r.ok).toBe(true);
    // Back-fill: a chave nova recebe o default v2 (LIGADA), nao undefined.
    expect(useSettings.getState().featureToggles.recapMusicaFundo).toBe(true);
    // Escolha organica do snapshot vence o default (persistido por cima).
    expect(useSettings.getState().featureToggles.cicloMenstrual).toBe(false);
    // Outra escolha organica preservada (widgetMostraNome=true no fixture).
    expect(useSettings.getState().featureToggles.widgetMostraNome).toBe(true);
  });

  it('back-filla sub-objeto ausente do snapshot corrompido (spread de undefined e no-op)', () => {
    const snap = snapshotValido();
    // Snapshot corrompido: featureToggles inteiro ausente.
    delete (snap.settings as unknown as Record<string, unknown>).featureToggles;

    const r = aplicarSnapshot(snap, { confirmado: true });

    expect(r.ok).toBe(true);
    // Cai nos defaults v2 limpos em vez de virar undefined.
    expect(useSettings.getState().featureToggles.recapMusicaFundo).toBe(true);
    expect(useSettings.getState().featureToggles.cicloMenstrual).toBe(true);
  });

  // AUDIT-P1-8 (2026-07-28): a segunda porta do A47 estava fechada so'
  // para settings. O guard `if (snap.onboarding.permissoes)` cobre o
  // sub-objeto AUSENTE por inteiro, nao o sub-objeto PRESENTE com uma
  // chave faltando -- que e' a forma exata da armadilha. Restaurar um
  // backup exportado antes da sprint que adicionou uma permissao trazia
  // `permissoes` sem ela.
  it('back-filla permissao ausente do snapshot antigo, preservando as concedidas', () => {
    const snap = snapshotValido();
    // Escolha organica do backup: microfone negado, camera concedida.
    snap.onboarding.permissoes = {
      storage: true,
      camera: true,
      microfone: false,
      notificacoes: true,
    } as unknown as NonNullable<typeof snap.onboarding.permissoes>;
    expect(
      (snap.onboarding.permissoes as unknown as Record<string, unknown>)
        .localizacao
    ).toBeUndefined();

    const r = aplicarSnapshot(snap, { confirmado: true });

    expect(r.ok).toBe(true);
    // Back-fill: a permissao nova recebe o default false em vez de
    // `undefined` (que faria o app re-pedir permissao ja resolvida).
    expect(useOnboarding.getState().permissoes.localizacao).toBe(false);
    // Escolhas organicas do backup vencem o default.
    expect(useOnboarding.getState().permissoes.storage).toBe(true);
    expect(useOnboarding.getState().permissoes.camera).toBe(true);
    expect(useOnboarding.getState().permissoes.microfone).toBe(false);
    expect(useOnboarding.getState().permissoes.notificacoes).toBe(true);
  });

  it('back-filla sexoDeclarado incompleto do snapshot antigo', () => {
    const snap = snapshotValido();
    snap.onboarding.sexoDeclarado = {
      pessoa_a: 'nao-binario',
    } as unknown as NonNullable<typeof snap.onboarding.sexoDeclarado>;

    const r = aplicarSnapshot(snap, { confirmado: true });

    expect(r.ok).toBe(true);
    expect(useOnboarding.getState().sexoDeclarado.pessoa_a).toBe('nao-binario');
    expect(useOnboarding.getState().sexoDeclarado.pessoa_b).toBeNull();
  });

  it('back-filla nomes/fotos incompletos do snapshot antigo', () => {
    const snap = snapshotValido();
    // Backup de quem usava sozinho: so' pessoa_a tem nome e foto.
    snap.pessoa.nomes = {
      pessoa_a: 'Restaurada A',
    } as unknown as typeof snap.pessoa.nomes;
    snap.pessoa.fotos = {
      pessoa_a: 'file:///mock/foto-a.jpg',
    } as unknown as typeof snap.pessoa.fotos;

    const r = aplicarSnapshot(snap, { confirmado: true });

    expect(r.ok).toBe(true);
    // Back-fill: cai no default generico e no null, nao em undefined
    // (que derrubaria o avatar de pessoa_b para a inicial sem nome).
    expect(usePessoa.getState().nomes.pessoa_b).toBe(
      PESSOAS_CONFIG.pessoa_b.nome
    );
    expect(usePessoa.getState().fotos.pessoa_b).toBeNull();
    // Escolhas organicas do backup preservadas.
    expect(usePessoa.getState().nomes.pessoa_a).toBe('Restaurada A');
    expect(usePessoa.getState().fotos.pessoa_a).toBe('file:///mock/foto-a.jpg');
  });

  it('back-filla nomes/fotos ausentes por inteiro (snapshot corrompido)', () => {
    const snap = snapshotValido();
    delete (snap.pessoa as unknown as Record<string, unknown>).nomes;
    delete (snap.pessoa as unknown as Record<string, unknown>).fotos;

    const r = aplicarSnapshot(snap, { confirmado: true });

    expect(r.ok).toBe(true);
    expect(usePessoa.getState().nomes).toEqual({
      pessoa_a: PESSOAS_CONFIG.pessoa_a.nome,
      pessoa_b: PESSOAS_CONFIG.pessoa_b.nome,
    });
    expect(usePessoa.getState().fotos).toEqual({
      pessoa_a: null,
      pessoa_b: null,
    });
  });

  it('tolera snapshot antigo sem sexoDeclarado/permissoes (campo aditivo)', () => {
    const snap = snapshotValido();
    delete snap.onboarding.sexoDeclarado;
    delete snap.onboarding.permissoes;
    const sexoAntes = useOnboarding.getState().sexoDeclarado;
    const permissoesAntes = useOnboarding.getState().permissoes;

    const r = aplicarSnapshot(snap, { confirmado: true });

    expect(r.ok).toBe(true);
    // Q3 fidelidade aditiva: campos antigos preservados quando ausentes
    // do snapshot (em vez de zerados).
    expect(useOnboarding.getState().sexoDeclarado).toBe(sexoAntes);
    expect(useOnboarding.getState().permissoes).toBe(permissoesAntes);
    expect(useOnboarding.getState().tipoCompanhia).toBe('casal');
  });
});

describe('restaurarVaultZip + aplicarSnapshotSettings', () => {
  beforeEach(() => {
    resetStores();
    fsMock.__arquivos.clear();
    fsMock.__dirs.clear();
    fsMock.__dirs.add('file:///mock/cache');
    fsMock.__dirs.add(VAULT);
    jest.clearAllMocks();
  });

  async function gerarZipComSnapshot(
    snap: SnapshotSettings,
    nome: string
  ): Promise<string> {
    const JSZipRequire = require('jszip') as typeof import('jszip');
    const z = new JSZipRequire();
    const snapJson = JSON.stringify(snap);
    z.file('.ouroboros/snapshot-settings.json', snapJson);
    const sha256Mod =
      require('@/lib/crypto/sha256') as typeof import('@/lib/crypto/sha256');
    const manifest = {
      schema: EXPORT_SCHEMA_VERSION,
      exportadoEm: '2026-05-08T12:00:00.000Z',
      totalArquivos: 1,
      porSubpasta: { snapshotSettings: 1 },
      arquivos: [
        {
          path: '.ouroboros/snapshot-settings.json',
          bytes: snapJson.length,
          sha256: sha256Mod.sha256Utf8(snapJson),
          binario: false,
        },
      ],
    };
    z.file('MANIFEST.json', JSON.stringify(manifest));
    const b64 = await z.generateAsync({ type: 'base64' });
    const path = `file:///mock/cache/${nome}`;
    fsMock.__arquivos.set(path, { content: b64, encoding: 'base64' });
    return path;
  }

  it('restore com aplicarSnapshotSettings=true restaura stores', async () => {
    const snap = snapshotValido();
    const zipPath = await gerarZipComSnapshot(snap, 'test-1.zip');

    const res = await restaurarVaultZip(zipPath, {
      sobrescrever: true,
      aplicarSnapshotSettings: true,
    });

    expect(res.ok).toBe(true);
    expect(res.snapshotAplicado?.ok).toBe(true);
    expect(useSettings.getState().somVibracao.geral).toBe(false);
    expect(usePessoa.getState().nomes.pessoa_a).toBe('Restaurada A');
    expect(useOnboarding.getState().tipoCompanhia).toBe('casal');
  });

  it('restore default (sem aplicarSnapshotSettings) NAO toca stores', async () => {
    const snap = snapshotValido();
    const zipPath = await gerarZipComSnapshot(snap, 'test-2.zip');
    const nomeOriginal = usePessoa.getState().nomes.pessoa_a;

    const res = await restaurarVaultZip(zipPath, { sobrescrever: true });

    expect(res.ok).toBe(true);
    expect(res.snapshotAplicado).toBeUndefined();
    expect(usePessoa.getState().nomes.pessoa_a).toBe(nomeOriginal);
  });

  it('restore com flag mas snapshot ausente no zip retorna motivo', async () => {
    const JSZipRequire = require('jszip') as typeof import('jszip');
    const z = new JSZipRequire();
    z.file(
      'MANIFEST.json',
      JSON.stringify({
        schema: EXPORT_SCHEMA_VERSION,
        exportadoEm: '',
        totalArquivos: 0,
        porSubpasta: {},
        arquivos: [],
      })
    );
    const b64 = await z.generateAsync({ type: 'base64' });
    const zipPath = `file:///mock/cache/sem-snap.zip`;
    fsMock.__arquivos.set(zipPath, { content: b64, encoding: 'base64' });

    const res = await restaurarVaultZip(zipPath, {
      sobrescrever: true,
      aplicarSnapshotSettings: true,
    });

    expect(res.ok).toBe(true);
    expect(res.snapshotAplicado?.ok).toBe(false);
    expect(res.snapshotAplicado?.motivo).toBe('snapshot-ausente');
  });
});
