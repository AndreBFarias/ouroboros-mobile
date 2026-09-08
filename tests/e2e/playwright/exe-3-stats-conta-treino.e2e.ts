// Caso E2E EXE-3: o treino passa a existir para quem CONTA e para quem
// CLICA.
//
// O que este caso mede, sempre por numero e nunca por presenca de texto:
//   1. O card "Treinos" do grid Numeros do Recap mostra as sessoes
//      semeadas (aria-label carrega o valor, entao a leitura e' do dado
//      renderizado, nao de um texto decorativo).
//   2. O toque no card abre uma lista com EXATAMENTE esse numero de
//      linhas. Antes da EXE-3 o branch de treinos em app/recap-lista.tsx
//      devolvia [] com um comentario prometendo uma sprint futura: o
//      card dizia "2 treinos" e o toque abria "Nenhum item neste
//      periodo". Numero sem lista atras.
//   3. O agregado canonico de stats (_estado/stats-7d-<device>.md, o
//      arquivo que o repositorio irmao le) carrega countPorTipo.
//      treino_sessao com o MESMO numero que a UI mostrou. Ate a EXE-3
//      esse arquivo nao tinha chave de treino nenhuma -- e, como o
//      schema e' record aberto, a ausencia nao produzia erro de
//      compilacao nem de schema. Era um numero que nunca existia.
//
// A tripla igualdade e' o ponto: card, lista e arquivo tem de dizer o
// mesmo numero. Conferir o .md sozinho seria substring em texto gerado
// (o digito 2 aparece em meia duzia de campos de um stats-*.md); o valor
// so vale porque bate com uma contagem medida por outro caminho. O
// circuito fechado pelo parser real esta em Jest
// (tests/lib/stats/escreverStats.test.ts, caso do round-trip por
// stringifyFrontmatter + parseFrontmatter + EstadoStatsAgregadasSchema).
//
// IMPORTANTE: navegar sempre via __gauntlet.abrir(); page.goto()
// recarrega a pagina e destroi o useVaultMock in-memory.
//
// Estrutura copiada de tests/e2e/playwright/e2e-template.ts. Executado
// via automacao de browser no Gauntlet, nao por Jest.
//
// Comentarios sem acento (convencao shell/CI).

import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

const PASTA = 'docs/sprints/EXE-3-STATS-CONTA-TREINO-screenshots-gauntlet';

// Rotina das sessoes semeadas por seedComDados('saude-7d')
// (src/lib/dev/seedDeterministico.ts, seedSaude).
const ROTINA_SEMEADA = 'Rotina seed';

interface GauntletMinimo {
  reset: () => void;
  seed: () => void;
  seedComDados: (fixture: 'saude-7d') => Promise<void>;
  abrir: (rota: string) => Promise<void> | void;
  listarVaultMock: () => string[];
  lerVaultMock: (uri: string) => string | null;
  disparaBootHooks: () => Promise<void>;
}

export default async function case_exe_3_stats_conta_treino(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'EXE-3-STATS-CONTA-TREINO';
  const aspecto = 'contagem-de-treino-e-drill-down';
  const screenshots: string[] = [];

  const falha = (detalhe: string): ResultadoE2E => ({
    sprint,
    aspecto,
    status: 'FAIL',
    detalhe,
    screenshots,
  });

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    // 1. Reset + seed + fixture de saude (semeia 2 sessoes de treino nos
    //    dias -2 e -5, ambas dentro da janela 'semana' do Recap).
    const semeou = await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      const g = w.__gauntlet;
      if (!g || typeof g.seedComDados !== 'function') return false;
      g.reset();
      g.seed();
      await g.seedComDados('saude-7d');
      return true;
    });
    if (!semeou) {
      return falha(
        'window.__gauntlet ausente ou sem seedComDados; EXPO_PUBLIC_GAUNTLET nao ativa?'
      );
    }

    // Confere no disco do mock quantas sessoes o fixture deixou. E' a
    // verdade contra a qual a UI e o arquivo de stats sao medidos.
    const noDisco = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      return (w.__gauntlet?.listarVaultMock() ?? []).filter(
        (u) => u.includes('/treinos/') && u.endsWith('.md')
      ).length;
    });
    if (noDisco < 2) {
      return falha(
        `o fixture 'saude-7d' deixou ${noDisco} sessoes em treinos/ (esperado 2 ou mais).`
      );
    }

    // 2. Recap: ler o numero do card de treinos.
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      await w.__gauntlet?.abrir('/recap');
    });
    await page.waitForTimeout(2000);

    const shot1 = `${PASTA}/01-card-numeros-com-treinos.png`;
    await page.screenshot({ path: shot1, fullPage: true });
    screenshots.push(shot1);

    const doCard = await page.evaluate(() => {
      // O aria-label do card e' `<valor> treinos no periodo`
      // (RecapSecaoNumeros). Ler dali evita depender de layout.
      const el = document.querySelector(
        '[aria-label$="treinos no periodo"]'
      ) as HTMLElement | null;
      if (!el) return { achou: false, valor: -1 };
      const m = (el.getAttribute('aria-label') ?? '').match(/^(\d+)\s/);
      return { achou: true, valor: m ? Number(m[1]) : -1 };
    });
    if (!doCard.achou) {
      return falha('card de treinos nao encontrado na secao Numeros do Recap.');
    }
    if (doCard.valor !== noDisco) {
      return falha(
        `o card diz ${doCard.valor} treinos, mas ha ${noDisco} sessoes em treinos/.`
      );
    }

    // 3. Rodar a fila de boot para que statsAgregadasHook escreva os 4
    //    stats-*.md contra o Vault ja semeado (esse hook nao e' one-shot:
    //    roda a cada boot, entao re-disparar tem efeito).
    const doArquivo = await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      const g = w.__gauntlet;
      if (!g) return { uri: null as string | null, sessao: -1, minutos: -1 };
      await g.disparaBootHooks();
      const uri =
        g.listarVaultMock().find((u) => u.includes('/_estado/stats-7d')) ?? null;
      if (!uri) return { uri: null, sessao: -1, minutos: -1 };
      const raw = g.lerVaultMock(uri) ?? '';
      const s = raw.match(/^\s*treino_sessao:\s*(\d+)\s*$/m);
      const m = raw.match(/^\s*treino_minutos:\s*(\d+)\s*$/m);
      return {
        uri,
        sessao: s ? Number(s[1]) : -1,
        minutos: m ? Number(m[1]) : -1,
      };
    });
    if (!doArquivo.uri) {
      return falha(
        'nenhum _estado/stats-7d-*.md no Vault mock depois de disparaBootHooks.'
      );
    }
    if (doArquivo.sessao !== doCard.valor) {
      return falha(
        `o agregado canonico diz treino_sessao=${doArquivo.sessao} e a UI diz ${doCard.valor}. ` +
          '-1 significa chave ausente, que e o defeito original: countPorTipo sem chave de treino.'
      );
    }
    if (doArquivo.minutos <= 0) {
      return falha(
        `treino_minutos=${doArquivo.minutos} no ${doArquivo.uri} (esperado a soma das duracoes).`
      );
    }

    // 4. Tocar o card e contar as linhas do drill-down.
    const clicou = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label$="treinos no periodo"]'
      ) as HTMLElement | null;
      if (!el) return false;
      el.click();
      return true;
    });
    if (!clicou) return falha('nao foi possivel tocar no card de treinos.');
    await page.waitForTimeout(2000);

    const shot2 = `${PASTA}/02-lista-de-treinos-do-periodo.png`;
    await page.screenshot({ path: shot2, fullPage: true });
    screenshots.push(shot2);

    const daLista = await page.evaluate(() => {
      const linhas = Array.from(
        document.querySelectorAll('[aria-label^="abrir "]')
      ) as HTMLElement[];
      const daRotina = linhas.filter(
        (el) => (el.getAttribute('aria-label') ?? '') === 'abrir Rotina seed'
      );
      return {
        total: linhas.length,
        daRotina: daRotina.length,
        // Cada linha carrega a duracao como subtitulo '<n> min'. A
        // leitura e' por linha, e nao no body inteiro, e case-insensitive:
        // o subtitulo do card tem textTransform uppercase, entao innerText
        // devolve '49 MIN'.
        comDuracao: daRotina.filter((el) =>
          /\d+\s*min/i.test(el.innerText ?? '')
        ).length,
        vazio: document.body.innerText.includes('Nenhum item neste período'),
      };
    });

    if (daLista.vazio) {
      return falha(
        'o drill-down de treinos abriu no empty state. E o sintoma exato do bug: ' +
          'o branch tipo=treinos devolvia [] enquanto o card mostrava numero maior que zero.'
      );
    }
    if (daLista.daRotina !== doCard.valor) {
      return falha(
        `a lista tem ${daLista.daRotina} linhas da rotina semeada (total de linhas: ${daLista.total}), ` +
          `e o card dizia ${doCard.valor}. O numero e a lista precisam ser o mesmo dado.`
      );
    }
    if (daLista.comDuracao < doCard.valor) {
      return falha(
        `apenas ${daLista.comDuracao} linhas mostram a duracao em minutos (esperado ${doCard.valor}).`
      );
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        `${noDisco} sessoes em treinos/, card do Recap com ${doCard.valor}, ` +
        `${daLista.daRotina} linhas no drill-down (com duracao em cada) e ` +
        `treino_sessao=${doArquivo.sessao} / treino_minutos=${doArquivo.minutos} ` +
        `em ${doArquivo.uri}. Os tres caminhos concordam.`,
      screenshots,
    };
  } catch (err) {
    return falha(err instanceof Error ? err.message : String(err));
  }
}
