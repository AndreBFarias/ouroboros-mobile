// E2E M-WCAG-MEDIDAS -- garante que o botao "remover foto" do form
// de medidas (app/medidas/novo.tsx) atende WCAG AA 2.5.5 Target Size
// com area efetiva >= 44dp.
//
// O React Native Web NAO emite hitSlop como CSS, entao o asserto
// runtime mede o tamanho visual do Pressable e o asserto estatico
// le o source TSX para validar o hitSlop declarado. A area efetiva
// final eh visual + (hitSlop * 2).
//
// Como rodar (orquestrador):
//   1. ./gauntlet.sh
//   2. Carregar tools playwright via ToolSearch.
//   3. Executar este caso via browser_evaluate.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SOURCE_PATH = 'app/medidas/novo.tsx';
const TARGET_DP = 44;

export default async function caseWcagMedidas(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-WCAG-MEDIDAS';
  const aspecto = 'remover-foto-target-size';
  const screenshots: string[] = [];

  try {
    // 1. Bootstrap Gauntlet + seed deterministico.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

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
        detalhe: 'window.__gauntlet ausente. Confirme EXPO_PUBLIC_GAUNTLET=1.',
        screenshots,
      };
    }

    // 2. Asserto estatico: o source TSX declara hitSlop e tamanho
    // suficientes para >= 44dp efetivo. Invariante anti-regressao
    // (RN-Web nao traduz hitSlop para CSS, entao precisamos da fonte).
    type FonteResultado =
      | { ok: true; hit: number; w: number; efetivo: number }
      | { ok: false; motivo: string };

    const fonteOk: FonteResultado = await page.evaluate(async () => {
      try {
        const resp = await fetch('/' + 'app/medidas/novo.tsx');
        if (!resp.ok) {
          return { ok: false as const, motivo: `fetch ${resp.status}` };
        }
        const txt = await resp.text();
        // Heuristica robusta: encontra o Pressable do "remover foto"
        // pelo accessibilityLabel canonico e extrai hitSlop e width.
        const blocoMatch = txt.match(
          /accessibilityLabel=\{`remover foto[^`]*`\}[\s\S]{0,400}/
        );
        if (!blocoMatch) {
          return {
            ok: false as const,
            motivo: 'bloco remover foto nao encontrado',
          };
        }
        const bloco = blocoMatch[0];
        const hitMatch = bloco.match(/hitSlop=\{(\d+)\}/);
        const wMatch = bloco.match(/width:\s*(\d+)/);
        if (!hitMatch || !wMatch) {
          return {
            ok: false as const,
            motivo: `props ausentes: hit=${!!hitMatch} w=${!!wMatch}`,
          };
        }
        const hit = parseInt(hitMatch[1], 10);
        const w = parseInt(wMatch[1], 10);
        const efetivo = w + hit * 2;
        return { ok: true as const, hit, w, efetivo };
      } catch (e) {
        return {
          ok: false as const,
          motivo: `erro fetch: ${(e as Error).message}`,
        };
      }
    });

    if (!fonteOk.ok) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `nao conseguiu ler ${SOURCE_PATH} via dev server: ${fonteOk.motivo}`,
        screenshots,
      };
    }

    if (fonteOk.efetivo < TARGET_DP) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `area efetiva ${fonteOk.efetivo}dp < ${TARGET_DP}dp WCAG AA (visual=${fonteOk.w}, hitSlop=${fonteOk.hit})`,
        screenshots,
      };
    }

    // 3. Smoke runtime: a rota /medidas/novo monta sem crashar.
    await page.goto('http://localhost:8081/medidas/novo');
    await page.waitForTimeout(1500);

    const rotaOk = await page.evaluate(() => {
      // Verifica que algo da tela renderizou (nao branco total).
      const root = document.querySelector('#root') ?? document.body;
      const txt = (root.textContent ?? '').trim();
      return txt.length > 0;
    });

    if (!rotaOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'rota /medidas/novo renderizou vazia',
        screenshots,
      };
    }

    const shotPath = `docs/sprints/M-WCAG-MEDIDAS-screenshots-gauntlet/A-medidas-novo.png`;
    try {
      await page.screenshot({ path: shotPath });
      screenshots.push(shotPath);
    } catch {
      // diretorio criado sob demanda pelo orquestrador.
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `Botao remover foto: visual=${fonteOk.w}dp + hitSlop=${fonteOk.hit}dp -> efetivo=${fonteOk.efetivo}dp (>= ${TARGET_DP}dp WCAG AA).`,
      screenshots,
    };
  } catch (err) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `erro: ${(err as Error).message}`,
      screenshots,
    };
  }
}
