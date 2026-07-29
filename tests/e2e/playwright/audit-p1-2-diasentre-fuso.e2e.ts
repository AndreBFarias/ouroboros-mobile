// Caso E2E AUDIT-P1-2-DIASENTRE-FUSO: guarda de regressao do numero de
// dias do contador na janela 21:00-23:59 BRT.
//
// O defeito: diasEntre truncava o `agora` pelos campos UTC do Date. Das
// 21:00 as 23:59 BRT o dia UTC ja virou, entao o card mostrava +1 dia --
// e um "Resetei" nessa janela gravava o numero inflado em `recorde`, que
// nunca decresce (Math.max). Dano permanente em dado do usuario.
//
// Como o relogio de parede nao e controlavel no Gauntlet, este caso
// SUBSTITUI o relogio da pagina por um instante fixo (2026-07-27 23:30
// BRT) antes de navegar. O contador e injetado no Vault mock com
// inicio 2026-07-20, entao o card DEVE mostrar 7 dias. Antes do fix
// mostraria 8.
//
// Estrutura copiada de tests/e2e/playwright/e2e-template.ts. Executado
// via automacao de browser no Gauntlet, nao por Jest (jest.config
// testMatch filtra *.test.ts).
//
// IMPORTANTE: navegar sempre via __gauntlet.abrir(); page.goto()
// recarrega a pagina, destroi o useVaultMock in-memory e desfaz o
// relogio fixado.
//
// Comentarios sem acento (convencao shell/CI).

import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

export default async function case_audit_p1_2_diasentre_fuso(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P1-2-DIASENTRE-FUSO';
  const aspecto = 'contador-dias-janela-noturna';
  const screenshots: string[] = [];

  try {
    // 1. Navegar para o gauntlet.
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    // 2. Reset + seed deterministico (define vaultRoot do mock).
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
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // 3. Fixar o relogio da pagina em 2026-07-27 23:30 BRT
    //    (= 2026-07-28T02:30Z, ou seja, dia UTC ja virado). O wrapper
    //    so intercepta `new Date()` sem argumentos e Date.now(); todo o
    //    resto (parse, UTC, prototype, instanceof) delega ao original,
    //    entao Intl continua formatando normalmente.
    const relogioOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        Date: DateConstructor;
        __relogioFixadoE2E?: boolean;
      };
      if (w.__relogioFixadoE2E) return true;
      const FIXO = w.Date.parse('2026-07-28T02:30:00Z');
      const Original = w.Date;
      const bruta = function (...args: unknown[]): Date {
        if (args.length === 0) return new Original(FIXO);
        return Reflect.construct(Original, args) as Date;
      };
      // prototype compartilhado: sem isso `d instanceof Date` passa a
      // ser false no app e diasEntre trataria o Date como string.
      Object.defineProperty(bruta, 'prototype', {
        value: Original.prototype,
      });
      const Fixa = bruta as unknown as DateConstructor;
      Fixa.now = () => FIXO;
      Fixa.parse = Original.parse;
      Fixa.UTC = Original.UTC;
      w.Date = Fixa;
      w.__relogioFixadoE2E = true;
      return new Date().getTime() === FIXO;
    });
    if (!relogioOk) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'nao foi possivel fixar o relogio da pagina em 23:30 BRT; sem isso a janela do defeito nao e observavel.',
        screenshots,
      };
    }

    // 4. Injetar um contador no Vault mock com inicio conhecido.
    //    20/07 -> 27/07 = 7 dias em dia civil local.
    const injetado = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          estado: () => { vaultRoot: string | null };
          setArquivoMock: (uri: string, conteudo: string) => void;
        };
      };
      const g = w.__gauntlet;
      if (!g) return false;
      const raiz = g.estado().vaultRoot ?? 'web://mock-vault/Ouroboros';
      const md = [
        '---',
        'tipo: contador',
        'slug: teste-fuso',
        'titulo: Teste fuso',
        'inicio: 2026-07-20',
        'recorde: 0',
        'resets: []',
        'criado_em: 2026-07-20T10:00:00-03:00',
        'para:',
        '  tipo: mim',
        '---',
        '',
      ].join('\n');
      g.setArquivoMock(`${raiz}/markdown/contador-teste-fuso.md`, md);
      return true;
    });
    if (!injetado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'nao foi possivel injetar o contador no Vault mock.',
        screenshots,
      };
    }

    // 5. Abrir a lista de contadores (SPA-navigate, sem reload).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> | void };
      };
      await w.__gauntlet?.abrir('/contadores');
    });
    await page.waitForTimeout(1200);

    const caminho =
      'docs/sprints/AUDIT-P1-2-DIASENTRE-FUSO-screenshots-gauntlet/contador-2330-brt.png';
    await page.screenshot({ path: caminho });
    screenshots.push(caminho);

    // 6. Assert sobre comportamento: o accessibilityLabel do card carrega
    //    o numero de dias renderizado ("contador Teste fuso 7 dias").
    const analise = await page.evaluate(() => {
      const nos = Array.from(
        document.querySelectorAll('[aria-label^="contador Teste fuso"]')
      );
      const rotulo = nos.length > 0 ? (nos[0].getAttribute('aria-label') ?? '') : '';
      return { achou: nos.length > 0, rotulo, corpo: document.body?.innerText ?? '' };
    });

    if (!analise.achou) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'card do contador injetado nao renderizou (Vault mock pode nao ter sido lido pela tela); numero de dias nao observavel.',
        screenshots,
      };
    }
    if (!/\b7 dias\b/.test(analise.rotulo)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `com o relogio em 23:30 BRT o card deveria mostrar 7 dias (inicio 2026-07-20); aria-label observado: "${analise.rotulo}".`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'as 23:30 BRT (dia UTC ja virado) o card mostra 7 dias, nao 8: diasEntre compara dia civil local.',
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
