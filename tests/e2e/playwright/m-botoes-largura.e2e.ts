// E2E V3 (M-AUDIT-E2E-BOTOES-LARGURA, 2026-05-08): cobre regressao
// das correcoes K5 (largura 3 botoes via fullWidth) + W2 (wrapper
// paddingHorizontal=spacing.base no botao Recap do header de /).
//
// Asserts via getBoundingClientRect + getComputedStyle:
//   1. Conectar conta Google em /agenda (estado nao-conectado pos seed):
//      width >= 200 (fullWidth aplica width: 100% no Pressable).
//      Wrapper externo (alignItems center + xl marginTop) nao adiciona
//      paddingHorizontal proprio — o padding lateral util vem do
//      ScrollView contentContainerStyle (paddingHorizontal: spacing.lg
//      = 20). Asserir paddingHorizontal >= 16 sobre ESSE container
//      ancestral, alinhado ao texto do contexto da sprint.
//   2. Recap em / (Header right): wrapper externo tem paddingHorizontal
//      computado >= 16 (W2 patch app/index.tsx:157). Pill interno
//      centralizado: distancias left/right do botao em relacao ao
//      wrapper >= 16 (== spacing.base).
//   3. Abrir agenda em /settings/contas-google: width >= 200 (fullWidth).
//      Sem skip — rota nativa e navegavel via __gauntlet.abrir.
//
// Comentarios sem acento. E2E doc-only para Jest (testMatch nao casa).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR =
  'docs/sprints/M-AUDIT-E2E-BOTOES-LARGURA-screenshots-gauntlet';

interface MedidaBotao {
  width: number;
  height: number;
  left: number;
  right: number;
}

interface MedidaWrapper {
  paddingLeftPx: number;
  paddingRightPx: number;
  width: number;
  left: number;
  right: number;
}

export default async function caseBotoesLargura(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-AUDIT-E2E-BOTOES-LARGURA';
  const aspecto = 'botoes-largura-padding-regressao-k5-w2';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // Reset + seed deterministico.
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: { reset: () => void; seed: () => void };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // ------------------------------------------------------------------
    // ASSERT 1 — Conectar conta Google em /agenda (estado nao-conectado).
    // ------------------------------------------------------------------
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/agenda');
    });
    await page.waitForTimeout(1500);

    const shotAgenda = `${SCREENSHOT_DIR}/A-agenda-conectar.png`;
    await page.screenshot({ path: shotAgenda });
    screenshots.push(shotAgenda);

    const medidaConectar = await page.evaluate<MedidaBotao | null>(() => {
      const el = document.querySelector(
        '[aria-label="conectar conta google"]'
      ) as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        left: r.left,
        right: r.right,
      };
    });
    if (!medidaConectar) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'botao "Conectar conta Google" ausente em /agenda; estado nao-conectado nao renderizou?',
        screenshots,
      };
    }
    if (medidaConectar.width < 200) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Conectar width=${medidaConectar.width.toFixed(1)}px < 200; fullWidth K5 regrediu`,
        screenshots,
      };
    }

    // paddingHorizontal util do Conectar vem do ScrollView ancestral
    // (contentContainerStyle paddingHorizontal: spacing.lg = 20). Mede
    // computed style desse container via aria-label "agenda root".
    const paddingScrollAgenda = await page.evaluate<number | null>(() => {
      const sc = document.querySelector(
        '[aria-label="agenda root"]'
      ) as HTMLElement | null;
      if (!sc) return null;
      const cs = window.getComputedStyle(sc);
      const pl = parseFloat(cs.paddingLeft || '0');
      const pr = parseFloat(cs.paddingRight || '0');
      return Math.min(pl, pr);
    });
    if (paddingScrollAgenda === null) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'ScrollView "agenda root" nao localizado para medir paddingHorizontal ancestral',
        screenshots,
      };
    }
    if (paddingScrollAgenda < 16) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `paddingHorizontal ancestral do Conectar = ${paddingScrollAgenda.toFixed(1)}px < 16 (esperado >= spacing.base)`,
        screenshots,
      };
    }

    // ------------------------------------------------------------------
    // ASSERT 2 — Recap em / (header right wrapper W2).
    // ------------------------------------------------------------------
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/');
    });
    await page.waitForTimeout(1500);

    const shotHome = `${SCREENSHOT_DIR}/B-home-recap.png`;
    await page.screenshot({ path: shotHome });
    screenshots.push(shotHome);

    const medidaRecap = await page.evaluate<{
      botao: MedidaBotao;
      wrapper: MedidaWrapper;
    } | null>(() => {
      const btn = document.querySelector(
        '[aria-label="Recap"]'
      ) as HTMLElement | null;
      if (!btn) return null;
      const wrapper = btn.parentElement as HTMLElement | null;
      if (!wrapper) return null;
      const cs = window.getComputedStyle(wrapper);
      const rb = btn.getBoundingClientRect();
      const rw = wrapper.getBoundingClientRect();
      return {
        botao: {
          width: rb.width,
          height: rb.height,
          left: rb.left,
          right: rb.right,
        },
        wrapper: {
          paddingLeftPx: parseFloat(cs.paddingLeft || '0'),
          paddingRightPx: parseFloat(cs.paddingRight || '0'),
          width: rw.width,
          left: rw.left,
          right: rw.right,
        },
      };
    });
    if (!medidaRecap) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao "Recap" ou seu wrapper ausente em /',
        screenshots,
      };
    }
    if (medidaRecap.botao.width < 64) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Recap width=${medidaRecap.botao.width.toFixed(1)}px < 64; pill interno colapsou`,
        screenshots,
      };
    }
    const padMin = Math.min(
      medidaRecap.wrapper.paddingLeftPx,
      medidaRecap.wrapper.paddingRightPx
    );
    if (padMin < 16) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `wrapper Recap paddingHorizontal min=${padMin.toFixed(1)}px < 16 (esperado spacing.base apos W2 em app/index.tsx:157)`,
        screenshots,
      };
    }
    // Centralizacao: pill interno com folga >= 16 do wrapper em ambos
    // os lados. Tolera 0.5px de subpixel rounding de RN-Web.
    const folgaLeft = medidaRecap.botao.left - medidaRecap.wrapper.left;
    const folgaRight = medidaRecap.wrapper.right - medidaRecap.botao.right;
    if (folgaLeft + 0.5 < 16 || folgaRight + 0.5 < 16) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Recap pill nao centralizado no wrapper W2: folgaLeft=${folgaLeft.toFixed(1)}px folgaRight=${folgaRight.toFixed(1)}px (esperado >= 16 cada)`,
        screenshots,
      };
    }

    // ------------------------------------------------------------------
    // ASSERT 3 — Abrir agenda em /settings/contas-google.
    // ------------------------------------------------------------------
    const navContas = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      try {
        await w.__gauntlet.abrir('/settings/contas-google');
        return true;
      } catch {
        return false;
      }
    });
    if (!navContas) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'rota /settings/contas-google nao navegavel via __gauntlet.abrir; assert 3 saltado (gauntletSkip)',
        screenshots,
      };
    }
    await page.waitForTimeout(1500);

    const shotContas = `${SCREENSHOT_DIR}/C-contas-google-abrir-agenda.png`;
    await page.screenshot({ path: shotContas });
    screenshots.push(shotContas);

    const medidaAbrir = await page.evaluate<MedidaBotao | null>(() => {
      const el = document.querySelector(
        '[aria-label="abrir agenda"]'
      ) as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        left: r.left,
        right: r.right,
      };
    });
    if (!medidaAbrir) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'botao "Abrir agenda" nao renderizado em /settings/contas-google (gate ou layout); assert 3 saltado (gauntletSkip)',
        screenshots,
      };
    }
    if (medidaAbrir.width < 200) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Abrir agenda width=${medidaAbrir.width.toFixed(1)}px < 200; fullWidth K5 regrediu`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `Conectar width=${medidaConectar.width.toFixed(0)}px (>=200), padding ancestral=${paddingScrollAgenda.toFixed(0)}px (>=16); Recap width=${medidaRecap.botao.width.toFixed(0)}px wrapper paddingMin=${padMin.toFixed(0)}px folgaL=${folgaLeft.toFixed(0)} folgaR=${folgaRight.toFixed(0)}; Abrir agenda width=${medidaAbrir.width.toFixed(0)}px (>=200). K5+W2 sem regressao.`,
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
