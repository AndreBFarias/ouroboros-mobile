// E2E V4 v2 (escopo expandido pos-rejeicao formal V4 v1, 2026-05-08):
// valida que o boot hook M38 atualizarDeviceIndexHook realmente grava
// markdown/_devices.md no useVaultMock quando re-disparado apos seed.
//
// Saneamento de debito: V4.0 introduziu useVaultMock + interception em
// reader.ts/writer.ts, mas BOOT_HOOKS rodam uma unica vez no mount do
// RootLayout (antes de seed definir vaultRoot), entao em E2Es o hook
// M38 fazia early return e _devices.md nunca era gravado. V4 v2 expoe
// __gauntlet.disparaBootHooks() que re-dispara a fila completa apos
// seed; este caso valida que o frontmatter canonico (deviceId ouro-...,
// nome_amigavel, pessoa, primeira/ultima_atividade) aparece no mock.
//
// Verifica:
//   1. window.__gauntlet expoe lerVaultMock + disparaBootHooks.
//   2. Apos reset+seed+disparaBootHooks, _devices.md existe no mock no
//      path canonico web://mock-vault/Ouroboros/markdown/_devices.md.
//   3. Conteudo contem frontmatter com:
//      - tipo: devices_index
//      - deviceId no formato ouro-<token>
//      - nome_amigavel: dispositivo-1
//      - pessoa: pessoa_a
//      - primeira_atividade: ISO datetime
//      - ultima_atividade: ISO datetime
//      - substituido_por: null
//   4. Re-disparar disparaBootHooks novamente (sem reset/seed) produz
//      conteudo identico ao primeiro -- idempotencia byte-a-byte. O
//      hook M38 atualiza ultima_atividade quando ja ha registro, mas
//      como o re-disparo ocorre dentro do mesmo segundo de relogio
//      (precisao ms do Date.now), o ISO de ultima_atividade pode
//      mudar nos ultimos digitos; aceitamos diferenca somente em
//      ultima_atividade e exigimos que TODO o resto bata.
//
// Comentarios sem acento.

import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR = 'docs/sprints/V4-screenshots-gauntlet';

export default async function caseSaveDevicesIndex(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'V4-disparaBootHooks';
  const aspecto = 'save-devices-index-via-bootHooks-mock';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // 1. Sanity: API exposta.
    const apiOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          lerVaultMock?: unknown;
          listarVaultMock?: unknown;
          disparaBootHooks?: unknown;
        };
      };
      if (!w.__gauntlet) return false;
      return (
        typeof w.__gauntlet.lerVaultMock === 'function' &&
        typeof w.__gauntlet.listarVaultMock === 'function' &&
        typeof w.__gauntlet.disparaBootHooks === 'function'
      );
    });
    if (!apiOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente ou disparaBootHooks/lerVaultMock/listarVaultMock nao expostos; sprint nao foi aplicada?',
        screenshots,
      };
    }

    // 2. Reset + seed + disparaBootHooks (sequencia canonica V4 v2).
    const seedOk = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: {
          reset: () => void;
          seed: () => void;
          disparaBootHooks: () => Promise<void>;
        };
      };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      await w.__gauntlet.disparaBootHooks();
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'reset/seed/disparaBootHooks lancou erro',
        screenshots,
      };
    }

    // 3. Le _devices.md do mock no path canonico.
    const md1 = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { lerVaultMock: (uri: string) => string | null };
      };
      const uri = 'web://mock-vault/Ouroboros/markdown/_devices.md';
      return w.__gauntlet.lerVaultMock(uri);
    });
    if (md1 === null || md1 === undefined) {
      // Ajuda diagnostico: lista o que foi gravado para o usuario ver.
      const todas = await page.evaluate(() => {
        const w = globalThis as unknown as {
          __gauntlet: { listarVaultMock: () => string[] };
        };
        return w.__gauntlet.listarVaultMock();
      });
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `_devices.md nao foi gravado em web://mock-vault/Ouroboros/markdown/_devices.md apos disparaBootHooks. listarVaultMock=${JSON.stringify(
          todas
        )}`,
        screenshots,
      };
    }

    // 4. Frontmatter canonico do M38.
    const checks: Array<{ nome: string; presente: boolean }> = [
      {
        nome: 'tipo: devices_index',
        presente: md1.includes('tipo: devices_index'),
      },
      { nome: 'registro:', presente: md1.includes('registro:') },
      { nome: 'deviceId ouro-', presente: /ouro-[a-z0-9]+/i.test(md1) },
      {
        nome: 'nome_amigavel: dispositivo-1',
        presente: md1.includes('nome_amigavel: dispositivo-1'),
      },
      { nome: 'pessoa: pessoa_a', presente: md1.includes('pessoa: pessoa_a') },
      // ISO datetime: YYYY-MM-DDTHH:MM:SS
      {
        nome: 'primeira_atividade ISO',
        presente:
          /primeira_atividade:\s*['"]?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(md1),
      },
      {
        nome: 'ultima_atividade ISO',
        presente: /ultima_atividade:\s*['"]?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(
          md1
        ),
      },
      {
        nome: 'substituido_por: null',
        presente: md1.includes('substituido_por: null'),
      },
    ];
    const faltando = checks.filter((c) => !c.presente).map((c) => c.nome);
    if (faltando.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `frontmatter incompleto: faltando ${JSON.stringify(
          faltando
        )}. Conteudo bruto (primeiros 600 chars): ${md1.slice(0, 600)}`,
        screenshots,
      };
    }

    const shotApos1 = `${SCREENSHOT_DIR}/A-devices-md-apos-1o-disparo.png`;
    await page.screenshot({ path: shotApos1 });
    screenshots.push(shotApos1);

    // 5. Idempotencia: re-disparar disparaBootHooks (sem reset/seed) e
    //    comparar bytes. ultima_atividade pode mudar (ms diferentes
    //    no mesmo segundo); aceitamos divergencia SO em
    //    ultima_atividade. Tudo o mais (deviceId, primeira_atividade,
    //    nome_amigavel, pessoa) deve permanecer identico.
    const md2 = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: {
          disparaBootHooks: () => Promise<void>;
          lerVaultMock: (uri: string) => string | null;
        };
      };
      await w.__gauntlet.disparaBootHooks();
      const uri = 'web://mock-vault/Ouroboros/markdown/_devices.md';
      return w.__gauntlet.lerVaultMock(uri);
    });
    if (md2 === null || md2 === undefined) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: '_devices.md sumiu apos 2o disparo de disparaBootHooks',
        screenshots,
      };
    }

    // Strip ultima_atividade dos dois e compara o resto byte-a-byte.
    const stripUlt = (s: string): string =>
      s.replace(/^\s*ultima_atividade:.*$/m, 'ultima_atividade: <STRIPPED>');
    const md1Sem = stripUlt(md1);
    const md2Sem = stripUlt(md2);
    if (md1Sem !== md2Sem) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `idempotencia falhou: campos imutaveis divergem entre disparos. md1=${md1Sem.slice(
          0,
          400
        )} md2=${md2Sem.slice(0, 400)}`,
        screenshots,
      };
    }

    // primeira_atividade DEVE ser estritamente identica (so muda na
    // primeira gravacao do device).
    const primeira1 = md1.match(/primeira_atividade:.*$/m)?.[0];
    const primeira2 = md2.match(/primeira_atividade:.*$/m)?.[0];
    if (!primeira1 || !primeira2 || primeira1 !== primeira2) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `primeira_atividade mudou entre disparos: '${primeira1}' vs '${primeira2}' (esperado: estavel)`,
        screenshots,
      };
    }

    const shotApos2 = `${SCREENSHOT_DIR}/B-devices-md-apos-2o-disparo.png`;
    await page.screenshot({ path: shotApos2 });
    screenshots.push(shotApos2);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'reset+seed+disparaBootHooks gravou markdown/_devices.md no useVaultMock; frontmatter canonico M38 presente (tipo, registro, deviceId ouro-, nome_amigavel, pessoa, primeira/ultima_atividade ISO, substituido_por null); 2o disparo idempotente (so ultima_atividade muda; primeira_atividade estavel).',
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
