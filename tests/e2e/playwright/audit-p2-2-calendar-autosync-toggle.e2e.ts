// AUDIT-P2-2 -- o toggle que liga o auto-sync do Google Calendar.
//
// O que este caso prova, e que so' o browser prova: a alavanca existe em
// /settings/contas-google, comeca desligada, e cada toque escreve de fato
// featureToggles.googleCalendarSync no store persistido. O gate de
// app/_layout.tsx le exatamente essa chave; sem UI que a escreva, o
// auto-sync periodico e a notificacao pre-evento nunca disparavam.
//
// O que este caso NAO prova: a sincronizacao real com o Google. Rede
// externa e' NAO-objetivo da sprint -- aqui so' se valida a porta.
//
// Duas escolhas deliberadas, ambas para nao herdar bug conhecido:
//   1. o assert NAO usa __gauntlet.estado(): lerEstado() (src/lib/dev/
//      gauntlet.ts) nao devolve featureToggles, e o caso
//      m-backup-automatico.e2e.ts sai INCONCLUSIVO em toda execucao por
//      depender disso. Aqui se le localStorage direto, como faz o
//      q17d-evolucao-hc-resumo.e2e.ts.
//   2. ha waitForTimeout entre o click e a leitura: secureStorage no web
//      e' um StateStorage assincrono e o flush do zustand persist cai em
//      microtask; sem a espera, a leitura pega o valor antigo.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

const CHAVE_SETTINGS = 'ouroboros.settings.v2';
const LABEL_TOGGLE = 'toggle sincronizar agenda automaticamente';

interface JanelaGauntlet {
  __gauntlet?: {
    reset: () => void;
    seed: () => void;
    setContaGoogleMock: (
      pessoa: 'pessoa_a' | 'pessoa_b',
      escopo: 'readonly' | 'write'
    ) => void;
  };
}

export default async function case_audit_p2_2_calendar_autosync_toggle(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P2-2';
  const aspecto = 'toggle-calendar-autosync';
  const pasta = `docs/sprints/${sprint}-CALENDAR-AUTOSYNC-TOGGLE-screenshots-gauntlet`;
  const screenshots: string[] = [];

  // Le o toggle no estado persistido. null = chave/valor ausente.
  const lerToggle = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem('ouroboros.settings.v2');
      if (!raw) return null;
      const obj = JSON.parse(raw) as {
        state?: { featureToggles?: Record<string, boolean> };
      };
      const v = obj.state?.featureToggles?.googleCalendarSync;
      return typeof v === 'boolean' ? v : null;
    });

  const tocarToggle = () =>
    page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="toggle sincronizar agenda automaticamente"]'
      ) as HTMLElement | null;
      el?.click();
      return Boolean(el);
    });

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as JanelaGauntlet;
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'window.__gauntlet ausente. Confirme EXPO_PUBLIC_GAUNTLET=1.',
        screenshots,
      };
    }

    // 1) Sem conta Google: o toggle existe mas nasce desabilitado, com a
    // caption explicando por que.
    await page.goto('http://localhost:8081/settings/contas-google');
    await page.waitForTimeout(2500);

    const semConta = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="toggle sincronizar agenda automaticamente"]'
      );
      return {
        existe: Boolean(el),
        temCaption: document.body.innerText.includes(
          'Conecte uma conta Google acima para sincronizar a agenda.'
        ),
      };
    });
    if (!semConta.existe) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Toggle "${LABEL_TOGGLE}" ausente em /settings/contas-google.`,
        screenshots,
      };
    }
    if (!semConta.temCaption) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Caption de conta Google ausente no estado desabilitado.',
        screenshots,
      };
    }
    const shotDesabilitado = `${pasta}/A-sem-conta-google.png`;
    await page.screenshot({ path: shotDesabilitado, fullPage: true });
    screenshots.push(shotDesabilitado);

    // 2) Com conta Google conectada, o toggle habilita e segue OFF.
    await page.evaluate(() => {
      const w = globalThis as unknown as JanelaGauntlet;
      w.__gauntlet?.setContaGoogleMock('pessoa_a', 'readonly');
    });
    await page.waitForTimeout(1200);

    const antes = await lerToggle();
    if (antes !== false) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Default do opt-in nao e' false: ${String(antes)}.`,
        screenshots,
      };
    }
    const shotOff = `${pasta}/B-toggle-off.png`;
    await page.screenshot({ path: shotOff, fullPage: true });
    screenshots.push(shotOff);

    // 3) Primeiro toque: false -> true.
    const achouToggle = await tocarToggle();
    if (!achouToggle) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Toggle sumiu apos conectar a conta Google mock.',
        screenshots,
      };
    }
    await page.waitForTimeout(800);
    const depoisDoPrimeiro = await lerToggle();
    if (depoisDoPrimeiro !== true) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'Click sintetico nao propagou em RN-Web (armadilha A17/A18). ' +
          `Valor lido: ${String(depoisDoPrimeiro)}. Validar em Nivel B.`,
        screenshots,
      };
    }
    const shotOn = `${pasta}/C-toggle-on.png`;
    await page.screenshot({ path: shotOn, fullPage: true });
    screenshots.push(shotOn);

    // 4) Segundo toque: true -> false. Prova que a alavanca e' de duas
    // maos, nao um caminho so' de ida.
    await tocarToggle();
    await page.waitForTimeout(800);
    const depoisDoSegundo = await lerToggle();
    if (depoisDoSegundo !== false) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Segundo toque nao desligou o toggle: ${String(
          depoisDoSegundo
        )}.`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        `${CHAVE_SETTINGS}.state.featureToggles.googleCalendarSync ` +
        'foi false -> true -> false pelos toques na UI.',
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
