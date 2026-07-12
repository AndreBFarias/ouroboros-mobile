// E2E R-HOME-4d -- valida o card "Relembrando" (rodape garantido da home
// viva). Cobre (spec §5):
//   1) Home COM historico: semeia diarios-3 + humores-30d e injeta um
//      diario de reflexao datado no passado (-40d, via saveDiario -> vault
//      mock). Assert: card "Relembrando" presente no rodape, tocavel, com
//      rotulo de tempo ("ha N dias"/"ha 1 mes"/"ha 1 ano").
//   2) Estabilidade: navegar para outra rota e voltar -> o texto do card e
//      o MESMO (deterministico no dia).
//   3) Tap no card -> navega (reflexao/conquista -> /diario-emocional).
//   4) Cold start: reset + seed (vault vazio, onboarding concluido) ->
//      card "Relembrando" presente com a BOAS-VINDAS contemplativo (dono
//      §12); NENHUMA caixa "Nada ..."; nenhum "!" nem "voce fez".
//
// Pre-requisito: ./gauntlet.sh em foreground (EXPO_PUBLIC_GAUNTLET=1).
//
// NAO roda via npm test (jest testMatch filtra *.test.ts). Executado pelo
// automacao de browser.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from './e2e-template';

const DIR = 'docs/sprints/R-HOME-4-screenshots-gauntlet';

export default async function caseRHome4d(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-HOME-4d';
  const aspecto = 'card-relembrando-rodape-contemplativo';
  const screenshots: string[] = [];

  try {
    // 1. Boot gauntlet + reset + seed (onboarding done + vault).
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);
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

    // 2. Semear fixtures + injetar uma lembranca datada no passado. Os
    //    fixtures diarios-3/humores-30d sozinhos podem cair todos abaixo
    //    do limiar (idade < 2) ou sem frase; por isso injetamos uma
    //    reflexao de -40 dias via saveDiario (writeVaultFile -> vault mock
    //    em web/dev). meta.data no passado; listarDiarios le do frontmatter.
    const memoriaOk = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        require?: (id: string) => unknown;
        __gauntlet?: {
          seedComDados: (f: string) => Promise<void>;
        };
      };
      try {
        await w.__gauntlet?.seedComDados('diarios-3');
        await w.__gauntlet?.seedComDados('humores-30d');

        const diarioMod = w.require?.('@/lib/diario/saveDiario') as
          | undefined
          | {
              saveDiario: (
                meta: Record<string, unknown>,
                body: string,
                vaultRoot: string
              ) => Promise<{ uri: string }>;
            };
        const vaultMod = w.require?.('@/lib/stores/vault') as
          | undefined
          | { useVault: { getState: () => { vaultRoot: string | null } } };
        if (!diarioMod?.saveDiario || !vaultMod?.useVault) return 'sem require';
        const vaultRoot = vaultMod.useVault.getState().vaultRoot;
        if (!vaultRoot) return 'sem vaultRoot';

        // -40 dias no fuso BRT.
        const local = new Date(Date.now() - 40 * 86_400_000 + -180 * 60_000);
        const y = local.getUTCFullYear();
        const m = String(local.getUTCMonth() + 1).padStart(2, '0');
        const d = String(local.getUTCDate()).padStart(2, '0');
        const dataIso = `${y}-${m}-${d}T12:00:00-03:00`;
        await diarioMod.saveDiario(
          {
            tipo: 'diario_emocional',
            data: dataIso,
            autor: 'pessoa_a',
            modo: 'reflexao',
            emocoes: ['paz'],
            intensidade: 3,
            com: [],
            contexto_social: [],
            texto: 'Tarde tranquila e leve no parque',
            midia: [],
            para: { tipo: 'mim' },
          },
          'Tarde tranquila e leve no parque',
          vaultRoot
        );
        return 'ok';
      } catch (e) {
        return `erro: ${(e as Error).message}`;
      }
    });
    if (memoriaOk !== 'ok') {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `nao foi possivel semear a memoria antiga: ${memoriaOk}`,
        screenshots,
      };
    }

    // 3. Abrir Tela Hoje.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(2000);

    const pathA = `${DIR}/4d-relembrando-com-memoria.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    // 4. Assert: card "Relembrando" presente e tocavel (aria-label
    //    "relembrando", nao "relembrando boas vindas") + rotulo de tempo.
    const comMemoria = await page.evaluate(() => {
      // Rotulo de tempo calmo do card (spec §2). Inline: a funcao roda no
      // browser e nao pode fechar sobre variaveis do modulo Node.
      const rotuloRe = /há \d+ dias|há 1 mês|há \d+ meses|há 1 ano|há \d+ anos/;
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 120);
      const btn = document.querySelector(
        '[role="button"][aria-label="relembrando"]'
      );
      return {
        temTitulo: textos.some((t) => t === 'Relembrando'),
        temBotao: !!btn,
        temRotulo: (btn?.textContent ?? '').match(rotuloRe) !== null,
        conteudoBotao: (btn?.textContent ?? '').trim(),
      };
    });
    if (!comMemoria.temTitulo || !comMemoria.temBotao || !comMemoria.temRotulo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `card "Relembrando" com memoria ausente ou sem rotulo de tempo: ${JSON.stringify(comMemoria)}`,
        screenshots,
      };
    }

    // 5. Estabilidade: sair para /recap e voltar; texto do card e o mesmo.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/recap');
    });
    await page.waitForTimeout(800);
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    const conteudoDepois = await page.evaluate(() => {
      const btn = document.querySelector(
        '[role="button"][aria-label="relembrando"]'
      );
      return (btn?.textContent ?? '').trim();
    });
    if (conteudoDepois !== comMemoria.conteudoBotao) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `card Relembrando instavel entre focos: antes="${comMemoria.conteudoBotao}" depois="${conteudoDepois}"`,
        screenshots,
      };
    }

    // 6. Tap no card -> navega para /diario-emocional (reflexao/conquista).
    const tapOk = await page.evaluate(() => {
      const btn = document.querySelector(
        '[role="button"][aria-label="relembrando"]'
      );
      if (!btn) return false;
      (btn as HTMLElement).click();
      return true;
    });
    if (!tapOk) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'card "relembrando" nao encontrado para tap',
        screenshots,
      };
    }
    await page.waitForTimeout(1500);
    const rotaPosTap = await page.evaluate(() =>
      typeof window !== 'undefined' ? window.location.pathname : ''
    );
    if (
      !/diario-emocional/.test(rotaPosTap) &&
      !/humor/.test(rotaPosTap)
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `tap no card nao navegou para o detalhe (rota="${rotaPosTap}")`,
        screenshots,
      };
    }

    // 7. Cold start: reset + seed (vault vazio, onboarding concluido).
    //    reset zera o vault mock; seed re-monta a home sem memorias.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          abrir: (rota: string) => Promise<void>;
        };
      };
      w.__gauntlet?.reset();
      w.__gauntlet?.seed();
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(2000);

    const pathC = `${DIR}/4d-relembrando-cold-start.png`;
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);

    const coldStart = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 120);
      const temBoasVindas = textos.some((t) =>
        /Um lugar para guardar o que voc/i.test(t)
      );
      return {
        temTitulo: textos.some((t) => t === 'Relembrando'),
        temBoasVindas,
        // O card garantido nunca some no cold start.
        temBotaoMemoria: !!document.querySelector(
          '[role="button"][aria-label="relembrando"]'
        ),
        // Tom: nenhuma caixa "Nada ...", nenhum "!", nenhum "voce fez".
        temCaixaNada: textos.some((t) => /nada/i.test(t)),
        temExclamacao: textos.some((t) => t.includes('!')),
        temVoceFez: textos.some((t) => /você fez|voce fez/i.test(t)),
      };
    });
    if (
      !coldStart.temTitulo ||
      !coldStart.temBoasVindas ||
      coldStart.temBotaoMemoria
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cold start deveria mostrar o titulo Relembrando + boas-vindas (sem card de memoria): ${JSON.stringify(coldStart)}`,
        screenshots,
      };
    }
    if (
      coldStart.temCaixaNada ||
      coldStart.temExclamacao ||
      coldStart.temVoceFez
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cold start violou o tom (caixa "Nada"/exclamacao/"voce fez"): ${JSON.stringify(coldStart)}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'card "Relembrando" com memoria (rotulo de tempo) + estavel entre focos + tap abre o detalhe; cold start mostra boas-vindas contemplativo sem caixa "Nada"/exclamacao/"voce fez"',
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
