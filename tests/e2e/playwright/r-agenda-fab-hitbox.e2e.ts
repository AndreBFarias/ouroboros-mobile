// E2E R-AGENDA-FAB-HITBOX -- o FAB verde "novo evento" da /agenda deve
// receber o toque no seu CENTRO geometrico, nao ser coberto pelo ultimo
// card da lista "Eventos do dia".
//
// O bug e' de hit-test nativo (Android/Fabric): o elevation:8 vivia num
// FILHO (MotiView) do Pressable, entao o alvo de toque nao subia acima da
// lista irma. Fix: zIndex + elevation no Pressable container (FAB.tsx).
//
// Em web (RN-Web) o hit-test segue o z-order do DOM, entao a prova
// equivalente e': document.elementFromPoint no CENTRO do FAB devolve o
// proprio FAB (ou um descendente), nao um card atras. Complementa o
// device (Nivel B) onde o `input tap` no centro abre o sheet.
//
// Pre-requisito: ./gauntlet.sh em foreground (http://localhost:8081).
//
// Comentarios sem acento (convencao shell/CI).
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

interface GauntletAgenda {
  reset: () => void;
  seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
  abrir: (rota: string) => Promise<void>;
  setContaGoogleMock: (
    pessoa: 'pessoa_a' | 'pessoa_b',
    escopo: 'readonly' | 'write'
  ) => void;
}

export default async function caseRAgendaFabHitbox(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-AGENDA-FAB-HITBOX';
  const aspecto = 'fab-hitbox-centro';
  const screenshots: string[] = [];
  const dir = 'docs/sprints/R-AGENDA-FAB-HITBOX-screenshots-gauntlet';

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 1. Reset + seed + conta pessoa_a com escopo write (FAB verde aparece).
    const setupOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletAgenda };
      if (!w.__gauntlet || !w.__gauntlet.setContaGoogleMock) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed({ nomeA: 'Alice', nomeB: 'Bob' });
      w.__gauntlet.setContaGoogleMock('pessoa_a', 'write');
      return true;
    });
    if (!setupOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet.setContaGoogleMock ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa ou build sem M37.2?',
        screenshots,
      };
    }

    // 2. Abrir /agenda com escopo write: FAB "novo evento" visivel.
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletAgenda };
      await w.__gauntlet.abrir('/agenda');
    });
    await page.waitForTimeout(2000);

    const pathFab = `${dir}/A-fab-centro-livre.png`;
    await page.screenshot({ path: pathFab });
    screenshots.push(pathFab);

    // 3. Hit-test: o CENTRO geometrico do FAB devolve o proprio FAB (ou
    //    descendente), nunca um card da lista atras dele.
    const hit = await page.evaluate(() => {
      const fab = document.querySelector(
        '[aria-label="novo evento"]'
      ) as HTMLElement | null;
      if (!fab) return { ok: false, motivo: 'FAB ausente' };
      const r = fab.getBoundingClientRect();
      const cx = Math.round(r.left + r.width / 2);
      const cy = Math.round(r.top + r.height / 2);
      const topo = document.elementFromPoint(cx, cy);
      const ehFab = !!topo && (topo === fab || fab.contains(topo));
      const rotuloTopo =
        topo && topo instanceof Element
          ? topo.getAttribute('aria-label') ?? topo.tagName
          : 'null';
      return { ok: ehFab, rotuloTopo, cx, cy };
    });
    if (!hit.ok) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `centro do FAB coberto (elementFromPoint devolveu ${JSON.stringify(hit)}); a lista ainda rouba a hitbox`,
        screenshots,
      };
    }

    // 4. Tap no centro do FAB abre o sheet "Novo evento". @gorhom em web e'
    //    flaky (ver m37-2), entao isto e' best-effort: se o form aparecer,
    //    otimo; se nao, o hit-test acima ja provou o alvo livre.
    const abriuSheet = await page.evaluate(async () => {
      const fab = document.querySelector(
        '[aria-label="novo evento"]'
      ) as HTMLElement | null;
      if (!fab) return false;
      fab.click();
      await new Promise((res) => setTimeout(res, 800));
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 40);
      return textos.some((t) => t === 'Novo evento');
    });

    const pathSheet = `${dir}/B-fab-abre-sheet.png`;
    await page.screenshot({ path: pathSheet });
    screenshots.push(pathSheet);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `Hit-test do centro do FAB livre (elementFromPoint devolve o FAB, nao a lista). Sheet apos tap: ${abriuSheet ? 'aberto' : 'best-effort web -- validar no device'}.`,
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
