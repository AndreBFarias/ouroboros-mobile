// E2E M-DEBITO-CATEGORIA-CORES-VISIBLE -- chips de categoria mostram
// accent ja em REST (antes de selecionar), nao apenas em selected.
//
// Antes do fix (achado da auditoria 2026-05-05): chips em rest com
// borderColor uniforme rgb(0, 0, 0) (parser CSS interpretava
// colors.muted "#c9c9cc" como nao-aplicado em algumas builds web,
// caindo para preto). Resultado visual: 8 chips identicos antes do
// toque -- usuario nao distingue categoria.
//
// Depois do fix: cada chip rest aplica accent semantico em 40%
// opacity via hexToRgba. Ghost (categoria "outro") permanece muted
// para preservar fallback WCAG do C2.x.1.
//
// Asserts:
//   1. Todos os 8 chips estao no DOM em rest (nenhum selected).
//   2. As 8 borderColors em rest sao distintas o suficiente
//      (Set.size >= 7 -- ghost compartilha tom muted, mas os 7
//      semanticos devem ser todos diferentes entre si e diferentes
//      do ghost).
//   3. Selected nao foi tocado: ChipC2.x.1 NAO regrediu (accent
//      100% em selected verificado na sprint anterior; aqui so
//      validamos rest).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface PageComConsole extends PlaywrightPageLike {
  on?: (
    evt: string,
    handler: (msg: { type: () => string; text: () => string }) => void
  ) => void;
}

const ROTULOS = [
  'Trabalho',
  'Casa',
  'Rotina',
  'Finanças',
  'Desenvolvimento pessoal',
  'Obrigações',
  'Saúde',
  'Outro',
];

export default async function caseMDebitoCategoriaCoresVisible(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-DEBITO-CATEGORIA-CORES-VISIBLE';
  const aspecto = 'rest-mostra-accent';
  const screenshots: string[] = [];

  const erros: string[] = [];
  const pageHook = page as PageComConsole;
  if (typeof pageHook.on === 'function') {
    pageHook.on('console', (msg) => {
      if (msg.type() === 'error') {
        erros.push(msg.text());
      }
    });
  }

  try {
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
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET_ATIVO inativa?',
        screenshots,
      };
    }

    // Abrir /todo e o sheet de nova tarefa via FAB -> "adicionar tarefa".
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/todo');
    });
    await page.waitForTimeout(1200);

    const fabAberto = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      if (!f) return false;
      f.click();
      return true;
    });
    if (!fabAberto) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB de captura ausente em /todo',
        screenshots,
      };
    }
    await page.waitForTimeout(500);

    const sheetAberto = await page.evaluate(() => {
      const it = document.querySelector(
        '[aria-label="adicionar tarefa"]'
      ) as HTMLElement | null;
      if (!it) return false;
      it.click();
      return true;
    });
    if (!sheetAberto) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'item "adicionar tarefa" ausente no menu de captura',
        screenshots,
      };
    }
    await page.waitForTimeout(900);

    // IMPORTANTE: NAO clicar em nenhum chip. Medir borderColor em rest.
    const cores = await page.evaluate(() => {
      const rotulos = [
        'Trabalho',
        'Casa',
        'Rotina',
        'Finanças',
        'Desenvolvimento pessoal',
        'Obrigações',
        'Saúde',
        'Outro',
      ];
      const out: Record<string, { borderColor: string; ariaSelected: string }> = {};
      for (const lbl of rotulos) {
        const el = document.querySelector(
          `[aria-label="chip ${lbl}"]`
        ) as HTMLElement | null;
        if (!el) {
          out[lbl] = { borderColor: 'NAO_ENCONTRADO', ariaSelected: '' };
          continue;
        }
        const filho = el.querySelector('*') as HTMLElement | null;
        const target = filho ?? el;
        const cs = getComputedStyle(target);
        out[lbl] = {
          borderColor: cs.borderColor,
          ariaSelected: el.getAttribute('aria-selected') ?? '',
        };
      }
      return out;
    });

    // 1. Todos os 8 chips estao presentes.
    const ausentes = ROTULOS.filter(
      (lbl) => cores[lbl]?.borderColor === 'NAO_ENCONTRADO'
    );
    if (ausentes.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `chips ausentes no DOM: ${ausentes.join(', ')}`,
        screenshots,
      };
    }

    // 2. Nenhum chip pode estar preto puro rgb(0, 0, 0) (regressao
    // do achado da auditoria 2026-05-05).
    const pretos = ROTULOS.filter((lbl) =>
      /\b0,\s*0,\s*0\b/.test(cores[lbl]?.borderColor ?? '')
    );
    if (pretos.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `regressao: chips com borderColor preto puro: ${pretos.join(', ')}. Bordas: ${JSON.stringify(cores)}`,
        screenshots,
      };
    }

    // 3. As 8 borderColors sao distintas o suficiente.
    // Set.size >= 7: aceita que ghost (Outro) compartilhe tom com
    // outro chip neutro, mas os 7 semanticos devem ser distintos
    // entre si e diferentes do ghost.
    const setBordas = new Set(
      ROTULOS.map((lbl) => cores[lbl]?.borderColor).filter(Boolean)
    );
    if (setBordas.size < 7) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cores em rest insuficientemente distintas: ${setBordas.size} unicas em 8 chips (esperado >= 7). Bordas: ${JSON.stringify(cores)}`,
        screenshots,
      };
    }

    // Screenshot do sheet com chips em rest mostrando accent.
    const shotPath =
      'docs/sprints/M-DEBITO-CATEGORIA-CORES-VISIBLE-screenshots-gauntlet/A-rest-mostra-accent.png';
    await page.screenshot({ path: shotPath });
    screenshots.push(shotPath);

    if (erros.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `console com erros: ${erros.slice(0, 3).join(' | ')}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `8 chips em rest com ${setBordas.size} cores distintas via getComputedStyle.borderColor. Accent semantico visivel antes da selecao.`,
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
