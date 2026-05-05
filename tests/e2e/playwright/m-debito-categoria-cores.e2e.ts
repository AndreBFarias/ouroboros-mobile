// E2E M-DEBITO-CATEGORIA-CORES -- 8 categorias de tarefa com cores
// distintas no SheetNovaTarefa.
//
// Antes do fix: todas as 7 categorias semanticas (trabalho/casa/rotina/
// financas/desenvolvimento_pessoal/obrigacoes/saude) renderizavam com
// borderColor laranja (#ffb86c). Outro ja era ghost (muted-decor).
//
// Depois do fix: cada slug tem cor semantica Dracula distinta:
//   trabalho                -> cyan    rgb(139, 233, 253)
//   casa                    -> pink    rgb(255, 121, 198)
//   rotina                  -> purple  rgb(189, 147, 249)
//   financas                -> green   rgb(80, 250, 123)
//   desenvolvimento_pessoal -> yellow  rgb(241, 250, 140)
//   obrigacoes              -> orange  rgb(255, 184, 108)
//   saude                   -> red     rgb(255, 85, 85)
//   outro                   -> ghost   rgb(98, 114, 164)  (muted-decor)
//
// Asserts:
//   1. Todos os 8 chips estao no DOM.
//   2. As 8 borderColors sao todas distintas entre si.
//   3. Nenhum chip semantico (exceto obrigacoes) tem borda laranja.
//   4. Mapeamento exato slug -> cor confere.
//
// Comentarios sem acento (convencao shell/CI).
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

// rgb esperado por slug. Aceita match flexivel ("139, 233, 253" ou
// "139,233,253").
const ESPERADO: ReadonlyArray<{
  slug: string;
  label: string;
  rgbRegex: RegExp;
  nomeCor: string;
}> = [
  { slug: 'trabalho',                label: 'Trabalho',                rgbRegex: /139,\s*233,\s*253/, nomeCor: 'cyan' },
  { slug: 'casa',                    label: 'Casa',                    rgbRegex: /255,\s*121,\s*198/, nomeCor: 'pink' },
  { slug: 'rotina',                  label: 'Rotina',                  rgbRegex: /189,\s*147,\s*249/, nomeCor: 'purple' },
  { slug: 'financas',                label: 'Finanças',                rgbRegex: /80,\s*250,\s*123/,  nomeCor: 'green' },
  { slug: 'desenvolvimento_pessoal', label: 'Desenvolvimento pessoal', rgbRegex: /241,\s*250,\s*140/, nomeCor: 'yellow' },
  { slug: 'obrigacoes',              label: 'Obrigações',              rgbRegex: /255,\s*184,\s*108/, nomeCor: 'orange' },
  { slug: 'saude',                   label: 'Saúde',                   rgbRegex: /255,\s*85,\s*85/,   nomeCor: 'red' },
  { slug: 'outro',                   label: 'Outro',                   rgbRegex: /98,\s*114,\s*164/,  nomeCor: 'ghost' },
];

export default async function caseMDebitoCategoriaCores(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-DEBITO-CATEGORIA-CORES';
  const aspecto = 'cores-distintas-categoria';
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

    // Captura borderColor de cada um dos 8 chips de categoria. Lista
    // inline (closure nao funciona em browser_evaluate; rotulos
    // hard-coded espelham ESPERADO acima).
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
      const out: Record<string, { borderColor: string; backgroundColor: string }> = {};
      for (const lbl of rotulos) {
        const el = document.querySelector(
          `[aria-label="chip ${lbl}"]`
        ) as HTMLElement | null;
        if (!el) {
          out[lbl] = { borderColor: 'NAO_ENCONTRADO', backgroundColor: '' };
          continue;
        }
        const filho = el.querySelector('*') as HTMLElement | null;
        const target = filho ?? el;
        const cs = getComputedStyle(target);
        out[lbl] = {
          borderColor: cs.borderColor,
          backgroundColor: cs.backgroundColor,
        };
      }
      return out;
    });

    // 1. Todos os 8 chips estao presentes.
    const ausentes = ESPERADO.filter(
      (e) => cores[e.label]?.borderColor === 'NAO_ENCONTRADO'
    );
    if (ausentes.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `chips ausentes no DOM: ${ausentes.map((a) => a.label).join(', ')}`,
        screenshots,
      };
    }

    // 2. Mapeamento exato slug -> cor.
    const divergencias: string[] = [];
    for (const esp of ESPERADO) {
      const cor = cores[esp.label];
      if (!cor) continue;
      if (!esp.rgbRegex.test(cor.borderColor)) {
        divergencias.push(
          `${esp.label} (${esp.nomeCor}): esperado match /${esp.rgbRegex.source}/, obtido borderColor="${cor.borderColor}"`
        );
      }
    }
    if (divergencias.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `mapeamento slug->cor divergente: ${divergencias.join(' | ')}`,
        screenshots,
      };
    }

    // 3. As 8 borderColors sao todas distintas entre si (sem laranja
    // monocromatico em massa).
    const setBordas = new Set(
      ESPERADO.map((e) => cores[e.label]?.borderColor).filter(Boolean)
    );
    if (setBordas.size < 8) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `borderColors nao sao todas distintas: ${setBordas.size} cores unicas em 8 chips. Bordas: ${JSON.stringify(cores)}`,
        screenshots,
      };
    }

    // Screenshot final com todos os chips visiveis.
    const shotPath =
      'docs/sprints/M-DEBITO-CATEGORIA-CORES-screenshots-gauntlet/A-categorias-coloridas.png';
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
      detalhe: `8 chips com cores distintas confirmadas via getComputedStyle.borderColor. Mapeamento canonico Dracula respeitado: ${ESPERADO.map((e) => `${e.slug}=${e.nomeCor}`).join(', ')}`,
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
