// Caso E2E EXE-1: a identidade de uma sessao de treino e' o arquivo, e a
// aba Treinos passa a falar do arquivo que existe.
//
// O que este caso mede, em ordem, sempre por CONTAGEM e por nome de
// arquivo -- nunca por presenca de texto:
//   1. Sessao em formato legado (sem hora) e' listada ANTES de qualquer
//      migracao. Se a listagem passar a filtrar por padrao de nome, o
//      historico do usuario some da tela sem erro nenhum (o sintoma que
//      migrarVaultLayoutPorTipo.ts:59 ja pagou uma vez).
//   2. Sessao legada e sessao no formato novo, da MESMA rotina e do
//      MESMO dia, coexistem e contam DUAS. Antes da EXE-1 as duas
//      resolviam para o mesmo path e a segunda truncava a primeira.
//   3. Excluir pela UI apaga exatamente o arquivo da sessao escolhida.
//      E' o teste do `rel`, e o discriminador do caso: a sessao aberta e'
//      a das 19:40 (a mais recente do dia), mas o path que o codigo
//      ANTIGO remontava a partir do conteudo seria
//      'treinos/<dia>-rotina-e2e.md' -- justamente o nome da sessao
//      LEGADA das 06:05. Com o bug presente, este caso apaga o arquivo
//      errado e o assert final pega.
//
// O QUE ESTE CASO NAO MEDE, e por que: a migracao one-shot de boot
// (migrarTreinosParaPathComHora) nao e' exercitada aqui. `autoSeedDev()`
// em app/_layout.tsx define o vaultRoot em todo boot dev-web, entao os
// hooks one-shot queimam a flag no mount com o Vault mock ainda vazio, e
// `disparaBootHooks()` depois disso nao tem efeito. E' a mesma corrida ja
// registrada em AUDIT-P2-13 (ver o cabecalho de
// audit-p1-4-agenda-evento-duplicado.e2e.ts), e importar esse padrao
// produziria um caso verde intermitente -- pior que vermelho, porque
// ensina a ignorar o gate. A migracao e' provada em
// tests/lib/boot/migrarTreinosParaPathComHora.test.ts, com contagem
// identica antes e depois, colisao com sufixo e rollback.
//
// IMPORTANTE: navegar sempre via __gauntlet.abrir(); page.goto()
// recarrega a pagina e destroi o useVaultMock in-memory.
//
// Estrutura copiada de tests/e2e/playwright/e2e-template.ts. Executado
// via automacao de browser no Gauntlet, nao por Jest.
//
// Comentarios sem acento (convencao shell/CI).

import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

const PASTA = 'docs/sprints/EXE-1-IDENTIDADE-SESSAO-TREINO-screenshots-gauntlet';

interface GauntletMinimo {
  reset: () => void;
  seed: () => void;
  estado: () => { vaultRoot: string | null };
  abrir: (rota: string) => Promise<void> | void;
  setArquivoMock: (uri: string, conteudo: string) => void;
  listarVaultMock: () => string[];
  disparaBootHooks: () => Promise<void>;
}

export default async function case_exe_1_identidade_sessao_treino(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'EXE-1-IDENTIDADE-SESSAO-TREINO';
  const aspecto = 'contagem-e-identidade-de-sessao';
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
    await page.waitForTimeout(1000);

    // 1. Reset + seed (define vaultRoot do mock e pula onboarding). O
    //    contexto (raiz do vault + dia de hoje no fuso do app) fica em
    //    globalThis.__exe1: o harness so aceita evaluate sem argumento,
    //    entao cada passo le dali em vez de fechar sobre variavel.
    const ctxInicial = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: GauntletMinimo;
        __exe1?: { raiz: string; ymd: string };
      };
      if (!w.__gauntlet) return null;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      const raiz =
        w.__gauntlet.estado().vaultRoot ?? 'web://mock-vault/Ouroboros';
      // Dia de hoje no fuso do app (o mesmo que formatDateYmd usa).
      const ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      w.__exe1 = { raiz, ymd };
      return { raiz, ymd };
    });
    if (!ctxInicial) {
      return falha('window.__gauntlet ausente; EXPO_PUBLIC_GAUNTLET nao ativa?');
    }

    // 2. Injetar UMA sessao em formato LEGADO (sem hora no nome), com o
    //    conteudo dizendo 06:05.
    const injetouLegado = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: GauntletMinimo;
        __exe1?: { raiz: string; ymd: string };
      };
      const g = w.__gauntlet;
      const ctx = w.__exe1;
      if (!g || !ctx) return false;
      const md = [
        '---',
        '_schema_version: 1',
        'tipo: treino_sessao',
        `data: "${ctx.ymd}T06:05:00-03:00"`,
        'autor: pessoa_a',
        'rotina: Rotina E2E',
        'duracao_min: 40',
        'exercicios:',
        '  - nome: Agachamento',
        '    series: 3',
        '    reps: 12',
        '---',
        '',
      ].join('\n');
      g.setArquivoMock(`${ctx.raiz}/treinos/${ctx.ymd}-rotina-e2e.md`, md);
      return true;
    });
    if (!injetouLegado) {
      return falha('nao foi possivel injetar a sessao legada no Vault mock.');
    }

    // 3. Abrir a aba Treinos e medir a contagem com o legado no disco.
    await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      return w.__gauntlet?.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1500);

    const shot1 = `${PASTA}/01-legado-listado-sem-migracao.png`;
    await page.screenshot({ path: shot1 });
    screenshots.push(shot1);

    const contagemLegado = await page.evaluate(() => {
      const m = document.body.innerText.match(/(\d+)\s+treinos?\s+em 90 dias/);
      return m ? Number(m[1]) : -1;
    });
    if (contagemLegado !== 1) {
      return falha(
        `sessao em formato legado nao aparece na aba Treinos: contagem=${contagemLegado} (esperado 1). ` +
          'A listagem virou filtro por nome e o historico sumiu em silencio.'
      );
    }

    // 4. Segunda sessao da MESMA rotina, no MESMO dia, outra hora, ja
    //    no formato novo. Convive com a legada.
    const injetouSegunda = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: GauntletMinimo;
        __exe1?: { raiz: string; ymd: string };
      };
      const g = w.__gauntlet;
      const ctx = w.__exe1;
      if (!g || !ctx) return false;
      const md = [
        '---',
        '_schema_version: 1',
        'tipo: treino_sessao',
        `data: "${ctx.ymd}T19:40:00-03:00"`,
        'autor: pessoa_a',
        'rotina: Rotina E2E',
        'duracao_min: 55',
        'exercicios:',
        '  - nome: Supino',
        '    series: 4',
        '    reps: 8',
        '---',
        '',
      ].join('\n');
      g.setArquivoMock(`${ctx.raiz}/treinos/${ctx.ymd}-1940-rotina-e2e.md`, md);
      return true;
    });
    if (!injetouSegunda) return falha('nao foi possivel injetar a 2a sessao.');

    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      await w.__gauntlet?.abrir('/');
    });
    await page.waitForTimeout(500);
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      await w.__gauntlet?.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1500);

    const shot3 = `${PASTA}/02-duas-sessoes-mesmo-dia-mesma-rotina.png`;
    await page.screenshot({ path: shot3 });
    screenshots.push(shot3);

    const contagemDuas = await page.evaluate(() => {
      const m = document.body.innerText.match(/(\d+)\s+treinos?\s+em 90 dias/);
      return m ? Number(m[1]) : -1;
    });
    if (contagemDuas !== 2) {
      return falha(
        `duas sessoes da mesma rotina no mesmo dia contam ${contagemDuas} (esperado 2).`
      );
    }

    // 5. Abrir o dia no heatmap e excluir a sessao mais recente (19:40).
    //    O path da exclusao vem da listagem, nao de uma remontagem do
    //    conteudo -- e e' aqui que o bug antigo apagaria a sessao das
    //    06:05 por engano.
    const abriuDia = await page.evaluate(() => {
      const w = globalThis as unknown as { __exe1?: { ymd: string } };
      const ymd = w.__exe1?.ymd ?? '';
      const cel = document.querySelector(
        `[aria-label^="celula ${ymd} "]`
      ) as HTMLElement | null;
      if (!cel) return false;
      cel.click();
      return true;
    });
    if (!abriuDia) return falha('celula do dia nao encontrada no heatmap.');
    await page.waitForTimeout(900);

    const shot4 = `${PASTA}/03-detalhe-do-dia.png`;
    await page.screenshot({ path: shot4 });
    screenshots.push(shot4);

    // Dois toques: o primeiro pede confirmacao, o segundo executa.
    const clicouExcluir = await page.evaluate(() => {
      const alvo = document.querySelector(
        '[aria-label="Excluir"]'
      ) as HTMLElement | null;
      if (!alvo) return false;
      alvo.click();
      return true;
    });
    if (!clicouExcluir) return falha('botao Excluir nao encontrado no sheet.');
    await page.waitForTimeout(500);

    const shot5 = `${PASTA}/04-confirmacao-de-exclusao.png`;
    await page.screenshot({ path: shot5 });
    screenshots.push(shot5);

    await page.evaluate(() => {
      const botoes = Array.from(
        document.querySelectorAll('[aria-label="Excluir"]')
      ) as HTMLElement[];
      const alvo = botoes[botoes.length - 1];
      alvo?.click();
    });
    await page.waitForTimeout(1200);

    const shot6 = `${PASTA}/05-apos-exclusao-uma-sessao.png`;
    await page.screenshot({ path: shot6 });
    screenshots.push(shot6);

    const depois = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: GauntletMinimo;
        __exe1?: { raiz: string; ymd: string };
      };
      const ymd = w.__exe1?.ymd ?? '';
      const raiz = w.__exe1?.raiz ?? '';
      // Prefixo da RAIZ do vault: `excluirTreino` regrava o arquivo em
      // cache://lixeira/treinos/, que tambem casaria um filtro por
      // '/treinos/' e mascararia a contagem.
      const arquivos = (w.__gauntlet?.listarVaultMock() ?? []).filter(
        (u) => u.startsWith(`${raiz}/treinos/`) && u.endsWith('.md')
      );
      const m = document.body.innerText.match(/(\d+)\s+treinos?\s+em 90 dias/);
      return {
        arquivos,
        // A das 19:40 (formato novo) e' a que a UI mandou excluir.
        temTarde: arquivos.some((u) => u.endsWith(`${ymd}-1940-rotina-e2e.md`)),
        // A das 06:05 (formato legado) tem de sobreviver: e' o arquivo
        // que o codigo antigo apagaria por engano.
        temLegada: arquivos.some((u) => u.endsWith(`${ymd}-rotina-e2e.md`)),
        contagem: m ? Number(m[1]) : -1,
      };
    });

    if (depois.arquivos.length !== 1 || depois.temTarde || !depois.temLegada) {
      return falha(
        `exclusao mirou o arquivo errado: restaram ${JSON.stringify(depois.arquivos)} ` +
          '(esperado apenas a sessao legada das 06:05). Sinal classico do bug antigo: ' +
          'a tela remontou o path a partir do conteudo e apagou a sessao errada.'
      );
    }
    if (depois.contagem !== 1) {
      return falha(
        `a aba Treinos nao refletiu a exclusao: contagem=${depois.contagem} (esperado 1).`
      );
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'sessao em formato legado listada sem migracao (1); legada + nova da mesma rotina ' +
        'no mesmo dia contaram 2; a exclusao da sessao das 19:40 apagou exatamente esse ' +
        'arquivo e preservou a das 06:05 -- o path veio da listagem, nao do conteudo.',
      screenshots,
    };
  } catch (err) {
    return falha(err instanceof Error ? err.message : String(err));
  }
}
