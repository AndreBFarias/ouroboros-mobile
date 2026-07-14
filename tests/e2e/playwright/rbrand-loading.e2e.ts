// R-BRAND-2-ANIMACOES (2026-07-13): E2E de reduce-motion para os loaders
// de marca. Valida COMPORTAMENTO observavel no Gauntlet web, focado no
// contrato central da sprint: "com reduce-motion o loader nao anima".
//
// O observavel deterministico e reachable SEM OAuth/backup e' o overlay
// de fechamento do ciclo (C1) no save de humor:
//   - com prefers-reduced-motion: reduce, o save NAVEGA IMEDIATO — o
//     micro-overlay [aria-label="fechando o ciclo"] NAO chega a montar
//     (sem cascata de 350ms);
//   - com prefers-reduced-motion: no-preference (controle), o overlay
//     MONTA por ~350ms antes de voltar (a cascata acontece).
//
// A deteccao web usa o mapeamento do react-native-web de
// AccessibilityInfo.isReduceMotionEnabled -> matchMedia('(prefers-
// reduced-motion: reduce)'), que o page.emulateMedia do playwright
// controla (mesmo mecanismo canonico do R-AUDIT-A11Y-MOVIMENTO §5.1;
// NAO um setter __gauntlet inexistente).
//
// Os anels C2 (backup) e E2 (abas de midia) tem o mesmo early-return de
// reduce-motion, coberto por teste unitario (tests/components/brand/
// OuroborosLoading.test.tsx) — aqui exercitamos o fluxo de app real.
//
// Executado via automacao de browser (nao por Jest; jest.config
// testMatch filtra *.test.ts). Comentarios sem acento.

export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  emulateMedia(opts: {
    reducedMotion: 'reduce' | 'no-preference';
  }): Promise<unknown>;
  click(selector: string): Promise<unknown>;
  waitForTimeout(ms: number): Promise<unknown>;
  screenshot(opts: { path: string; fullPage?: boolean }): Promise<unknown>;
}

export interface ResultadoE2E {
  sprint: string;
  aspecto: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVO';
  detalhe: string;
  screenshots: string[];
}

// Rotulo do overlay de fechamento do ciclo (C1) em web: aria-label
// "fechando o ciclo" (usado literalmente dentro dos page.evaluate, que
// serializam a funcao e nao capturam constantes externas).

// Reset + seed deterministico e navega para o humor rapido.
async function abrirHumor(page: PlaywrightPageLike): Promise<boolean> {
  const ok = await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet?: {
        reset: () => void;
        seed: () => void;
        abrir: (rota: string) => void;
      };
    };
    if (!w.__gauntlet) return false;
    w.__gauntlet.reset();
    w.__gauntlet.seed();
    w.__gauntlet.abrir('/humor-rapido');
    return true;
  });
  await page.waitForTimeout(1200);
  return ok;
}

// True se o overlay de fechamento esta no DOM neste instante.
async function overlayPresente(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(
    () => document.querySelectorAll('[aria-label="fechando o ciclo"]').length > 0
  );
}

// Poll curto: retorna true assim que o overlay aparecer dentro de
// `janelaMs`, senao false. Usado para "apareceu?" (controle) e para
// "nunca apareceu?" (reduce).
async function esperarOverlay(
  page: PlaywrightPageLike,
  janelaMs: number
): Promise<boolean> {
  const PASSO = 40;
  let decorrido = 0;
  while (decorrido < janelaMs) {
    if (await overlayPresente(page)) return true;
    await page.waitForTimeout(PASSO);
    decorrido += PASSO;
  }
  return false;
}

export default async function caseRBrandLoading(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-BRAND-2-ANIMACOES';
  const aspecto = 'reduce-motion-loaders';
  const screenshots: string[] = [];
  const dir = `docs/sprints/${sprint}-screenshots-gauntlet`;

  try {
    // ===== 1. reduce-motion ON: save NAVEGA imediato, sem overlay. =====
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    const seedOk = await abrirHumor(page);
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // Sliders ja tem default 3 (payload valido). Salvar direto.
    await page.click('text=Salvar');
    // Com reduce-motion o overlay NAO deve montar em nenhum momento da
    // janela (navegacao foi imediata). Poll amplo para provar ausencia.
    const apareceuComReduce = await esperarOverlay(page, 900);
    const pathA = `${dir}/A-reduce-sem-overlay.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);
    if (apareceuComReduce) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'com reduce-motion o overlay de fechamento (C1) apareceu — deveria navegar imediato sem cascata',
        screenshots,
      };
    }

    // ===== 2. CONTROLE (motion-normal): overlay MONTA por ~350ms. =====
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const seedOk2 = await abrirHumor(page);
    if (!seedOk2) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'nao reabriu o humor no passo de controle',
        screenshots,
      };
    }
    await page.click('text=Salvar');
    const apareceuSemReduce = await esperarOverlay(page, 1500);
    const pathB = `${dir}/B-normal-com-overlay.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);
    if (!apareceuSemReduce) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'sem reduce-motion o overlay de fechamento (C1) NAO apareceu (regressao da cascata padrao)',
        screenshots,
      };
    }

    // Apos ~350ms a cascata conclui e navega: o overlay some.
    await page.waitForTimeout(600);
    const sumiu = !(await overlayPresente(page));
    const pathC = `${dir}/C-normal-pos-navegacao.png`;
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);
    if (!sumiu) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'overlay ainda presente apos 600ms — a cascata pode nao ter concluido a navegacao',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'reduce-motion navega imediato sem o overlay de fechamento (C1); motion-normal monta o overlay ~350ms e depois navega. Anels C2/E2 tem o mesmo early-return coberto por teste unitario.',
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
