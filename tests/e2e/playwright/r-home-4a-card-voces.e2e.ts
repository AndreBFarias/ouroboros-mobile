// E2E R-HOME-4a -- motor de feed adaptativo + card garantido "Voces".
//
// Cobre (asserts de comportamento, nao so presenca):
//   A) DIA VAZIO (seed + reset humor): a Tela Hoje mostra o card
//      garantido "Voces" com convite "ainda não registrou hoje"; NENHUMA
//      caixa "Nada nas próximas horas" / "Sem tarefas pendentes" aparece
//      (self-hide dos cards sem substancia).
//   B) DIA CHEIO (seedComDados('humores-30d')): o fixture tem registro de
//      HOJE (offset 0) apenas para pessoa_a -- entao a linha de pessoa_a
//      mostra rotulo de mood (" · hoje") e a de pessoa_b segue com
//      convite. Assert: existe pelo menos uma linha de mood do dia. NOTA:
//      nao existe writer de humor exportado; semear registro de HOJE para
//      pessoa_b exigiria API nova (fora de escopo -- fica pra validacao
//      device de validacao). Assert ajustado conforme a especificacao.
//   C) MODO SOZINHO (setTipoCompanhia('sozinho')): titulo vira "Voce" e
//      so a linha de pessoa_a aparece (sem linha de pessoa_b).
//
// Cada page.evaluate inlina a coleta de textos do DOM (mesma convencao do
// r-home-3.e2e.ts) -- sem helpers cross-scope, sem eval.
//
// Pre-requisito: ./gauntlet.sh em foreground (http://localhost:8081).
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from './e2e-template';

export default async function caseRHome4a(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'R-HOME-4a';
  const aspecto = 'feed-adaptativo-card-voces';
  const screenshots: string[] = [];
  const dir = 'docs/sprints/R-HOME-4-screenshots-gauntlet';

  try {
    // ---- A) DIA VAZIO --------------------------------------------------
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          setNomes: (a: string, b?: string) => void;
          setTipoCompanhia: (m: 'sozinho' | 'casal' | 'amigos') => void;
        };
      };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setNomes('Alice', 'Bob');
      w.__gauntlet.setTipoCompanhia('casal');
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

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    const pathA = `${dir}/A-dia-vazio-casal.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    const vazio = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 120);
      return {
        temVoces: textos.includes('Vocês'),
        temConvite: textos.some((t) => t.includes('ainda não registrou hoje')),
        temNadaProximos: textos.some((t) =>
          t.includes('Nada nas próximas horas')
        ),
        temSemTarefas: textos.some((t) => t.includes('Sem tarefas pendentes')),
      };
    });

    if (!vazio.temVoces || !vazio.temConvite) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `dia vazio: card Voces/convite ausente: ${JSON.stringify(vazio)}`,
        screenshots,
      };
    }
    if (vazio.temNadaProximos || vazio.temSemTarefas) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `dia vazio: caixa toxica de empty state apareceu: ${JSON.stringify(vazio)}`,
        screenshots,
      };
    }

    // ---- B) DIA CHEIO --------------------------------------------------
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { seedComDados: (f: string) => Promise<void> };
      };
      await w.__gauntlet?.seedComDados('humores-30d');
    });
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    const pathB = `${dir}/B-dia-cheio-casal.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    const cheio = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 120);
      return {
        temVoces: textos.includes('Vocês'),
        // Linha de mood do dia: contem " · hoje" (registro de hoje).
        temMoodHoje: textos.some((t) => t.includes('· hoje')),
      };
    });

    if (!cheio.temVoces || !cheio.temMoodHoje) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `dia cheio: card Voces sem linha de mood do dia: ${JSON.stringify(cheio)}`,
        screenshots,
      };
    }

    // ---- C) MODO SOZINHO ----------------------------------------------
    await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          setTipoCompanhia: (m: 'sozinho' | 'casal' | 'amigos') => void;
        };
      };
      w.__gauntlet?.setTipoCompanhia('sozinho');
    });
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(1500);

    const pathC = `${dir}/C-sozinho.png`;
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);

    const sozinho = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 120);
      return {
        temVoceSingular: textos.includes('Você'),
        temVocesPlural: textos.includes('Vocês'),
        temNomeB: textos.includes('Bob'),
      };
    });

    if (!sozinho.temVoceSingular || sozinho.temVocesPlural || sozinho.temNomeB) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `sozinho: titulo/linha incorretos (esperado "Você" sem pessoa_b): ${JSON.stringify(sozinho)}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Feed adaptativo OK. Dia vazio: card Voces + convite, sem caixa "Nada"/"Sem tarefas". Dia cheio: linha de mood do dia. Sozinho: titulo "Voce" so com pessoa_a.',
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
