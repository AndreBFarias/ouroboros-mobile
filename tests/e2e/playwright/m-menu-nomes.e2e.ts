// E2E M-AUDIT-E2E-MENU-NOMES (V2): cobertura de regressao da sprint K2
// (M-MENU-NOMES, commit 8afd857), que renomeou as secoes do MenuLateral:
//   - "Ver"        -> "Acesso Rapido"
//   - "Opcionais"  -> "Utilitarios"
//
// K2 fechou sem caso E2E. V2 adiciona protecao para garantir que regressao
// futura (alguem reverter os labels para os nomes antigos) seja capturada.
//
// Verifica:
//   1. Apos seed + abrirMenu, DOM contem texto "Acesso Rapido" (com acento).
//   2. DOM contem "Utilitarios" (com acento).
//   3. DOM nao contem eyebrow antigo "Ver" nem "Opcionais" como titulos
//      de secao do MenuLateral (regressao protetora).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR =
  'docs/sprints/M-AUDIT-E2E-MENU-NOMES-screenshots-gauntlet';

export default async function caseMenuNomes(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-AUDIT-E2E-MENU-NOMES';
  const aspecto = 'menu-lateral-secoes-acesso-rapido-utilitarios';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    // Reset + seed deterministico (padrao do template).
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          abrirMenu: () => void;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      return typeof w.__gauntlet.abrirMenu === 'function';
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente ou abrirMenu nao exposto; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // Abrir o menu lateral via API determinista do gauntlet.
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { abrirMenu: () => void };
      };
      w.__gauntlet.abrirMenu();
    });
    await page.waitForTimeout(800);

    const shotMenu = `${SCREENSHOT_DIR}/A-menu-lateral-aberto.png`;
    await page.screenshot({ path: shotMenu });
    screenshots.push(shotMenu);

    // Capturar texto integral do body (case-sensitive) para asserts.
    // MenuLateral renderiza titulos de secao em ALL CAPS via TextoEyebrow,
    // entao verificamos contra a versao uppercase tambem.
    const evidencia = await page.evaluate(() => {
      const txt = document.body.textContent ?? '';
      return {
        bruto: txt,
        upper: txt.toUpperCase(),
      };
    });

    // Assert 1: "Acesso Rapido" (com acento). Aceita label canonico ou ALL
    // CAPS renderizado pelo TextoEyebrow.
    const temAcessoRapido =
      evidencia.bruto.includes('Acesso Rápido') ||
      evidencia.upper.includes('ACESSO RÁPIDO');
    if (!temAcessoRapido) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'secao "Acesso Rapido" nao encontrada no DOM apos abrirMenu; K2 (rename de "Ver") regrediu?',
        screenshots,
      };
    }

    // Assert 2: "Utilitarios" (com acento).
    const temUtilitarios =
      evidencia.bruto.includes('Utilitários') ||
      evidencia.upper.includes('UTILITÁRIOS');
    if (!temUtilitarios) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'secao "Utilitarios" nao encontrada no DOM apos abrirMenu; K2 (rename de "Opcionais") regrediu, ou nenhum feature toggle opcional ativo no seed?',
        screenshots,
      };
    }

    // Assert 3 (regressao protetora): nao deve existir eyebrow antigo.
    // Verificamos os tokens em ALL CAPS (formato real do TextoEyebrow no
    // MenuLateral) com delimitadores de palavra para evitar falso positivo
    // de strings que apenas contem essas substrings em outros contextos.
    const regressao = await page.evaluate(() => {
      const eyebrows = Array.from(
        document.querySelectorAll('[role="header"], h1, h2, h3, h4, h5, h6')
      ).map((el) => (el.textContent ?? '').trim().toUpperCase());
      // Filtra os textos curtos que parecem eyebrow de secao do menu.
      const tituloAntigoVer = eyebrows.some((t) => t === 'VER');
      const tituloAntigoOpcionais = eyebrows.some((t) => t === 'OPCIONAIS');
      // Fallback amplo: varre body por padrao isolado " VER " ou
      // " OPCIONAIS " entre quebras (titulos no menu ficam em linha propria).
      const upper = (document.body.textContent ?? '').toUpperCase();
      const padraoVer = /(^|\n|\r|\s)VER(\n|\r|\s|$)/;
      const padraoOpcionais = /(^|\n|\r|\s)OPCIONAIS(\n|\r|\s|$)/;
      return {
        tituloAntigoVer,
        tituloAntigoOpcionais,
        padraoVerNoBody: padraoVer.test(upper),
        padraoOpcionaisNoBody: padraoOpcionais.test(upper),
      };
    });
    if (
      regressao.tituloAntigoVer ||
      regressao.tituloAntigoOpcionais ||
      regressao.padraoVerNoBody ||
      regressao.padraoOpcionaisNoBody
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `regressao detectada: eyebrow antigo presente (Ver=${regressao.tituloAntigoVer || regressao.padraoVerNoBody}, Opcionais=${regressao.tituloAntigoOpcionais || regressao.padraoOpcionaisNoBody}); K2 deveria ter removido esses titulos.`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'MenuLateral exibe "Acesso Rapido" e "Utilitarios" (renomeadas em K2); eyebrow antigo "Ver"/"Opcionais" ausente. Cobertura de regressao da sprint K2 garantida.',
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
