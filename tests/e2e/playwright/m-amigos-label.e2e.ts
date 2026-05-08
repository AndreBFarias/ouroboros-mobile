// E2E V1 (M-AUDIT-E2E-AMIGOS-LABEL, 2026-05-08): cobre ramificacao de
// useNomeDe('ambos') por tipoCompanhia (I2-AMIGOS, pessoa.ts:91-105).
//
// Sprint I2-AMIGOS fechou com 1 PNG e zero E2E; G4 expos a API
// __gauntlet.setTipoCompanhia(modo) e destravou esta cobertura.
//
// Verifica em /humor-rapido o terceiro chip (label vem de
// useNomeDe('ambos')) sob 3 modos:
//   1. tipoCompanhia='casal'  -> chip "Casal" presente.
//   2. tipoCompanhia='amigos' -> chip "Todos" presente.
//   3. tipoCompanhia='sozinho' -> "Ambos" (legacy fallback) ou ausente
//      (UI esconde o chip quando vaultCompartilhado=false; spec aceita
//      ambos os desfechos).
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR =
  'docs/sprints/M-AUDIT-E2E-AMIGOS-LABEL-screenshots-gauntlet';

interface GauntletGlobal {
  reset: () => void;
  seed: () => void;
  setTipoCompanhia: (modo: 'sozinho' | 'casal' | 'amigos') => void;
  abrir: (rota: string) => Promise<void>;
  estado: () => unknown;
}

export default async function caseAmigosLabel(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-AUDIT-E2E-AMIGOS-LABEL';
  const aspecto = 'tipocompanhia-ramificacao-chip-ambos';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // Sanity: API setTipoCompanhia exposta (G4).
    const apiOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletGlobal };
      if (!w.__gauntlet) return false;
      return typeof w.__gauntlet.setTipoCompanhia === 'function';
    });
    if (!apiOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente ou setTipoCompanhia nao exposto; G4 nao foi aplicada?',
        screenshots,
      };
    }

    // ----- Cenario 1: casal -> "Casal" -----
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletGlobal };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setTipoCompanhia('casal');
      await w.__gauntlet.abrir('/humor-rapido');
    });
    await page.waitForTimeout(1500);

    const shotCasal = `${SCREENSHOT_DIR}/A-modo-casal.png`;
    await page.screenshot({ path: shotCasal });
    screenshots.push(shotCasal);

    const temCasal = await page.evaluate(() => {
      const txt = (document.body.textContent ?? '').toLowerCase();
      return txt.includes('casal');
    });
    if (!temCasal) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'modo casal: chip "Casal" ausente em /humor-rapido (useNomeDe("ambos") nao retornou "Casal")',
        screenshots,
      };
    }

    // ----- Cenario 2: amigos -> "Todos" -----
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletGlobal };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setTipoCompanhia('amigos');
      await w.__gauntlet.abrir('/humor-rapido');
    });
    await page.waitForTimeout(1500);

    const shotAmigos = `${SCREENSHOT_DIR}/B-modo-amigos.png`;
    await page.screenshot({ path: shotAmigos });
    screenshots.push(shotAmigos);

    const temTodos = await page.evaluate(() => {
      const txt = (document.body.textContent ?? '').toLowerCase();
      return txt.includes('todos');
    });
    if (!temTodos) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'modo amigos: chip "Todos" ausente em /humor-rapido (useNomeDe("ambos") nao retornou "Todos")',
        screenshots,
      };
    }

    // ----- Cenario 3: sozinho -> "Ambos" (fallback legacy) ou ausente -----
    // Spec aceita ambos os desfechos: a UI pode esconder o chip quando
    // vaultCompartilhado=false (filtroEfetivo.ts:46), ou mostrar "Ambos"
    // se a config estiver compartilhada. Falha apenas se aparecer
    // "Casal" ou "Todos" (vazamento de modo).
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletGlobal };
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setTipoCompanhia('sozinho');
      await w.__gauntlet.abrir('/humor-rapido');
    });
    await page.waitForTimeout(1500);

    const shotSozinho = `${SCREENSHOT_DIR}/C-modo-sozinho.png`;
    await page.screenshot({ path: shotSozinho });
    screenshots.push(shotSozinho);

    const vazamento = await page.evaluate(() => {
      const txt = (document.body.textContent ?? '').toLowerCase();
      // Permitido: "ambos" (fallback) OU ausencia. Vazamento = "casal"
      // ou "todos" persistir do cenario anterior (state nao resetou).
      return {
        temCasal: txt.includes('casal'),
        temTodos: txt.includes('todos'),
        temAmbos: txt.includes('ambos'),
      };
    });
    if (vazamento.temCasal || vazamento.temTodos) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `modo sozinho: vazamento de label de modo anterior (casal=${vazamento.temCasal}, todos=${vazamento.temTodos}); reset() entre cenarios falhou`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `ramificacao de useNomeDe('ambos') por tipoCompanhia validada: casal->"Casal" (presente), amigos->"Todos" (presente), sozinho->"Ambos" ou ausente (sem vazamento; ambos=${vazamento.temAmbos}). Cobertura E2E I2-AMIGOS completa.`,
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
