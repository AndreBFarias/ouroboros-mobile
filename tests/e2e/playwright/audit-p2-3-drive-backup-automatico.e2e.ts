// Sprint AUDIT-P2-3-DRIVE-BACKUP-AUTOMATICO — E2E via Gauntlet (web).
//
// O que este caso prova: o card Google Drive em /integracoes descreve o
// estado REAL do agendamento semanal, em vez da afirmacao incondicional
// antiga ("Backup automático ligado. Envia o ZIP do Vault toda semana."),
// que mentia porque nenhum agendador existia e continua sendo forte
// demais enquanto R-SEC-1 (scope drive.file no Cloud Console) nao fecha.
//
//   1. toggle backupDriveAutomatico ON  -> a linha do card traz
//      "Automático semanal ligado, aguardando autorização no
//      Google." e NAO traz a frase antiga.
//   2. toggle OFF -> a linha traz "Automático semanal desligado.".
//
// Pre-requisito nao obvio: o card so entra no ramo conectado quando
// alguma conta Google tem accessToken. __gauntlet.reset() zera as duas
// contas e aplicarSeed nao conecta nenhuma, entao sem
// setContaGoogleMock o card cai no ramo desconectado e nenhuma das
// frases renderiza (o E2E de R-INT-5 documenta esse mesmo tropeco).
//
// O upload em si nao e' observavel em web (fazerBackupDrive retorna cedo)
// nem no device antes de R-SEC-1: este caso valida a copy e o estado,
// nunca o envio.
//
// Comentarios sem acento.

export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  screenshot(opts: { path: string; fullPage?: boolean }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<unknown>;
}

export interface ResultadoE2E {
  sprint: string;
  aspecto: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVO';
  detalhe: string;
  screenshots: string[];
}

interface GauntletWeb {
  reset: () => void;
  seed: () => void;
  abrir: (rota: string) => Promise<void>;
  setFeatureToggle: (chave: string, valor: boolean) => void;
  setContaGoogleMock: (
    pessoa: 'pessoa_a' | 'pessoa_b',
    escopo: 'readonly' | 'write'
  ) => void;
}

const FRASE_LIGADO =
  'Automático semanal ligado, aguardando autorização no Google.';
const FRASE_DESLIGADO = 'Automático semanal desligado.';
const FRASE_ANTIGA_QUE_MENTIA =
  'Backup automático ligado. Envia o ZIP do Vault toda semana.';

export default async function caseDriveBackupAutomatico(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P2-3-DRIVE-BACKUP-AUTOMATICO';
  const aspecto = 'copy-agendamento-semanal';
  const dir = `docs/sprints/${sprint}-screenshots-gauntlet`;
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 1. Reset + seed + conta Google conectada + toggle ON.
    const preparado = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletWeb };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      // Sem conta conectada o card Drive fica no ramo desconectado e
      // nenhuma frase do agendamento renderiza.
      w.__gauntlet.setContaGoogleMock('pessoa_a', 'write');
      w.__gauntlet.setFeatureToggle('backupDriveAutomatico', true);
      return true;
    });
    if (!preparado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletWeb };
      await w.__gauntlet.abrir('/integracoes');
    });
    await page.waitForTimeout(1200);

    // 2. Card conectado (pre-requisito para as frases renderizarem).
    const conectado = await page.evaluate(
      () =>
        !!document.querySelector('[aria-label="estado google_drive conectado"]')
    );
    if (!conectado) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'card Drive nao ficou conectado apos setContaGoogleMock; frases do agendamento nao renderizam nesse ramo',
        screenshots,
      };
    }

    const pathLigado = `${dir}/A-integracoes-drive-automatico-ligado.png`;
    await page.screenshot({ path: pathLigado });
    screenshots.push(pathLigado);

    const textoLigado = await page.evaluate(() => document.body.innerText);
    if (!textoLigado.includes(FRASE_LIGADO)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `com o toggle ON o card nao traz a ressalva de autorizacao pendente: "${FRASE_LIGADO}"`,
        screenshots,
      };
    }
    if (textoLigado.includes(FRASE_ANTIGA_QUE_MENTIA)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'a afirmacao incondicional antiga ainda aparece no card Drive',
        screenshots,
      };
    }

    // 3. Mesmo card com o toggle OFF.
    await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet: GauntletWeb };
      w.__gauntlet.setFeatureToggle('backupDriveAutomatico', false);
    });
    await page.waitForTimeout(800);

    const pathDesligado = `${dir}/B-integracoes-drive-automatico-desligado.png`;
    await page.screenshot({ path: pathDesligado });
    screenshots.push(pathDesligado);

    const textoDesligado = await page.evaluate(() => document.body.innerText);
    if (!textoDesligado.includes(FRASE_DESLIGADO)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `com o toggle OFF o card nao traz "${FRASE_DESLIGADO}"`,
        screenshots,
      };
    }

    // 4. Copy espelhada em Contas Google (a tela que liga o toggle).
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletWeb };
      await w.__gauntlet.abrir('/settings/contas-google');
    });
    await page.waitForTimeout(1000);

    const pathContas = `${dir}/C-contas-google-backup-automatico.png`;
    await page.screenshot({ path: pathContas });
    screenshots.push(pathContas);

    const textoContas = await page.evaluate(() => document.body.innerText);
    const temRessalva = textoContas.includes(
      'O envio começa quando o acesso ao Drive for autorizado na sua conta Google.'
    );
    if (!temRessalva) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'Contas Google nao traz a ressalva de autorizacao pendente no bloco de backup automatico',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'card Drive descreve o agendamento semanal com ressalva quando ligado, "desligado" quando off, e Contas Google espelha a ressalva',
      screenshots,
    };
  } catch (err) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `erro inesperado: ${(err as Error).message}`,
      screenshots,
    };
  }
}
