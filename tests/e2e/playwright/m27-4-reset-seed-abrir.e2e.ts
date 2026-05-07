// E2E M27.4 -- valida que reset() + seed() + abrir('/saude-fisica') em
// sequencia rapida (<2s) NAO produz "Maximum update depth exceeded"
// no console. Bug pre-existente desde M24, fix em M27.4 via latch
// persistente do useBootStatus em SessaoBootGate.
//
// Sequencia:
//   1. Bootstrap inicial (espera latch useBootStatus.pronto = true).
//   2. reset() + seed() + abrir('/saude-fisica') sem awaits intermediarios.
//   3. Verifica console.error capturado pelo gauntlet -- nenhum
//      'Maximum update depth' deve aparecer.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

interface ConsoleErroCapturado {
  ts: number;
  msg: string;
}

interface GauntletParaTeste {
  reset: () => void;
  seed: () => void;
  abrir: (rota: string) => Promise<void>;
  aguardarBoot: (timeoutMs?: number) => Promise<boolean>;
  consoleErros: () => ConsoleErroCapturado[];
  estado: () => { rota: string };
}

export default async function caseM27_4(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M27.4';
  const aspecto = 'reset-seed-abrir';
  const screenshots: string[] = [];

  try {
    // 1. Carrega o gauntlet (instala window.__gauntlet).
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Aguarda boot inicial completar (latch useBootStatus.pronto =
    //    true). Sem isto, o reset/seed disparado antes do bootstrap
    //    inicial nao testa o caminho A do M27.4 (latch persistente).
    const bootInicialOk = await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet?: GauntletParaTeste };
      if (!w.__gauntlet) return false;
      return w.__gauntlet.aguardarBoot(60000);
    });
    if (!bootInicialOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'aguardarBoot inicial retornou false em 60s',
        screenshots,
      };
    }

    // 3. Sequencia rapida reset + seed + abrir('/saude-fisica') sem
    //    intervalos. Esta e a reproducao do bug original.
    const sequenciaOk = await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet?: GauntletParaTeste };
      if (!w.__gauntlet) return { ok: false, motivo: 'gauntlet ausente' };
      try {
        w.__gauntlet.reset();
        w.__gauntlet.seed();
        await w.__gauntlet.abrir('/saude-fisica');
        return { ok: true, motivo: '' };
      } catch (err) {
        return { ok: false, motivo: (err as Error).message };
      }
    });
    if (!sequenciaOk.ok) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `sequencia reset+seed+abrir falhou: ${sequenciaOk.motivo}`,
        screenshots,
      };
    }

    // 4. Pequena janela para React processar updates pendentes apos
    //    a navegacao. Se houvesse "Maximum update depth", ele seria
    //    emitido nesta janela (loop de re-render trava o microtask).
    await page.waitForTimeout(1500);

    // 5. Le o buffer de console.error do gauntlet. Procura qualquer
    //    ocorrencia de "Maximum update depth" -- substring case
    //    sensitive porque o React emite literal.
    const erros = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletParaTeste };
      if (!w.__gauntlet) return [] as ConsoleErroCapturado[];
      return w.__gauntlet.consoleErros();
    });
    const erroMaxDepth = erros.find((e) =>
      e.msg.includes('Maximum update depth')
    );

    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-${aspecto}.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    if (erroMaxDepth) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `console emitiu "Maximum update depth" apos reset+seed+abrir: ${erroMaxDepth.msg.slice(0, 240)}`,
        screenshots,
      };
    }

    // 6. Confirma que a navegacao completou para /memoria. Se o loop
    //    travasse o React, a rota nao avancaria.
    const rotaAtual = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletParaTeste };
      return w.__gauntlet?.estado().rota ?? '';
    });
    if (!rotaAtual.startsWith('/saude-fisica')) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `rota apos abrir('/saude-fisica') ficou em "${rotaAtual}"`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `reset+seed+abrir('/saude-fisica') sem "Maximum update depth"; ${erros.length} erros totais no buffer (nenhum bate). Rota final: ${rotaAtual}`,
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
