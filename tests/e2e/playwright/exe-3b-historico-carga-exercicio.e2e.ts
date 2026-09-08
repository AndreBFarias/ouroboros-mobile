// Caso E2E EXE-3B: registrar uma sessao de treino grava a carga no
// historico do exercicio cadastrado, e a Tela 08 deixa de mostrar o
// empty state permanente.
//
// O que este caso mede, em ordem, sempre pelo VALOR gravado -- nunca
// pela presenca do grafico:
//   1. ANTES: exercicio cadastrado com historico vazio mostra
//      "Sem historico" e nao mostra linha "Ultima vez:".
//   2. Registrar a sessao pelo caminho real da UI ("Duplicar pra hoje"
//      no detalhe do dia, que chama `saveTreino`) faz o append.
//   3. DEPOIS: o empty state sumiu e a linha "Ultima vez:" traz a carga,
//      as series e as reps que estavam na sessao -- 62.5 kg, 4x8. Numero
//      distinto de qualquer default do seed, entao acerto por
//      coincidencia nao passa.
//   4. O arquivo do exercicio no Vault tem UMA entrada de historico com
//      aquela carga. Fecha o circuito no disco, e nao so' no texto da
//      tela: substring em tela passaria se o numero viesse de outro
//      lugar (a linha de meta-info tambem imprime carga recente).
//
// Por que "Duplicar pra hoje" e nao o sheet de novo treino: e' o caminho
// de UI mais curto que chega em `saveTreino` com carga conhecida sem
// depender de digitacao em TextInput do RN-Web (que em web tem
// comportamento proprio de foco e mascara). Os outros dois callers
// (executor de rotina e SheetNovoTreino) passam pela mesma funcao.
//
// IMPORTANTE: navegar sempre via __gauntlet.abrir(); page.goto()
// recarrega a pagina e destroi o useVaultMock in-memory.
//
// Estrutura copiada de tests/e2e/playwright/e2e-template.ts. Executado
// via automacao de browser no Gauntlet, nao por Jest.
//
// Comentarios sem acento (convencao shell/CI).

import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

const PASTA =
  'docs/sprints/EXE-3B-HISTORICO-CARGA-EXERCICIO-screenshots-gauntlet';

interface GauntletMinimo {
  reset: () => void;
  seed: () => void;
  estado: () => { vaultRoot: string | null };
  abrir: (rota: string) => Promise<void> | void;
  setArquivoMock: (uri: string, conteudo: string) => void;
  lerVaultMock: (uri: string) => string | null;
}

export default async function case_exe_3b_historico_carga_exercicio(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'EXE-3B-HISTORICO-CARGA-EXERCICIO';
  const aspecto = 'historico-de-carga-por-exercicio';
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
    //    contexto fica em globalThis.__exe3b: o harness so aceita
    //    evaluate sem argumento, entao cada passo le dali.
    const ctx = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: GauntletMinimo;
        __exe3b?: { raiz: string; ymd: string };
      };
      if (!w.__gauntlet) return null;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      const raiz =
        w.__gauntlet.estado().vaultRoot ?? 'web://mock-vault/Ouroboros';
      const ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      w.__exe3b = { raiz, ymd };
      return { raiz, ymd };
    });
    if (!ctx) {
      return falha(
        'window.__gauntlet ausente; EXPO_PUBLIC_GAUNTLET nao ativa?'
      );
    }

    // 2. Semear um exercicio CADASTRADO com historico vazio e uma sessao
    //    do dia que o cita com carga conhecida (62.5 kg, 4x8).
    const semeou = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: GauntletMinimo;
        __exe3b?: { raiz: string; ymd: string };
      };
      const g = w.__gauntlet;
      const c = w.__exe3b;
      if (!g || !c) return false;
      const exercicio = [
        '---',
        '_schema_version: 1',
        'tipo: exercicio',
        'slug: supino-reto',
        'nome: Supino reto',
        'grupo_muscular:',
        '  - peito',
        'nivel: intermediario',
        'equipamento: barra',
        'instrucao: Desca a barra ate o peito e suba.',
        'dicas: []',
        'gif: ""',
        'historico: []',
        '---',
        '',
      ].join('\n');
      g.setArquivoMock(
        `${c.raiz}/markdown/exercicio-supino-reto.md`,
        exercicio
      );
      const sessao = [
        '---',
        '_schema_version: 1',
        'tipo: treino_sessao',
        `data: "${c.ymd}T08:00:00-03:00"`,
        'autor: pessoa_a',
        'rotina: Rotina E2E 3B',
        'duracao_min: 45',
        'exercicios:',
        '  - nome: Supino reto',
        '    series: 4',
        '    reps: 8',
        '    carga_kg: 62.5',
        '---',
        '',
      ].join('\n');
      g.setArquivoMock(
        `${c.raiz}/treinos/${c.ymd}-0800-rotina-e2e-3b.md`,
        sessao
      );
      return true;
    });
    if (!semeou) return falha('nao foi possivel semear o Vault mock.');

    // 3. ANTES: a Tela 08 esta no empty state permanente.
    await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      return w.__gauntlet?.abrir('/exercicios/supino-reto');
    });
    await page.waitForTimeout(1500);

    const shot1 = `${PASTA}/01-sem-historico-antes.png`;
    await page.screenshot({ path: shot1 });
    screenshots.push(shot1);

    const antes = await page.evaluate(() => {
      const txt = document.body.innerText;
      return {
        temEmptyState: txt.includes('Sem histórico'),
        temUltimaVez: txt.includes('Última vez'),
        temNome: txt.includes('Supino reto'),
      };
    });
    if (!antes.temNome) {
      return falha(
        'a Tela 08 nao carregou o exercicio semeado (nome ausente na tela).'
      );
    }
    if (!antes.temEmptyState || antes.temUltimaVez) {
      return falha(
        `estado inicial inesperado: emptyState=${antes.temEmptyState}, ultimaVez=${antes.temUltimaVez}. ` +
          'O exercicio foi semeado com historico vazio.'
      );
    }

    // 4. Registrar a sessao pelo caminho da UI: aba Treinos -> celula do
    //    dia -> "Duplicar pra hoje" (chama saveTreino).
    await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      return w.__gauntlet?.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1600);

    const abriuDia = await page.evaluate(() => {
      const w = globalThis as unknown as { __exe3b?: { ymd: string } };
      const ymd = w.__exe3b?.ymd ?? '';
      const cel = document.querySelector(
        `[aria-label^="celula ${ymd} "]`
      ) as HTMLElement | null;
      if (!cel) return false;
      cel.click();
      return true;
    });
    if (!abriuDia) return falha('celula do dia nao encontrada no heatmap.');
    await page.waitForTimeout(900);

    const shot2 = `${PASTA}/02-sessao-do-dia-com-carga.png`;
    await page.screenshot({ path: shot2 });
    screenshots.push(shot2);

    const duplicou = await page.evaluate(() => {
      const alvo = document.querySelector(
        '[aria-label="Duplicar pra hoje"]'
      ) as HTMLElement | null;
      if (!alvo) return false;
      alvo.click();
      return true;
    });
    if (!duplicou) {
      return falha('botao "Duplicar pra hoje" nao encontrado no sheet do dia.');
    }
    await page.waitForTimeout(1600);

    // 5. DEPOIS: o empty state sumiu e a linha "Ultima vez" traz o valor.
    await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      return w.__gauntlet?.abrir('/exercicios/supino-reto');
    });
    await page.waitForTimeout(1600);

    const shot3 = `${PASTA}/03-historico-com-carga-depois.png`;
    await page.screenshot({ path: shot3 });
    screenshots.push(shot3);

    const depois = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: GauntletMinimo;
        __exe3b?: { raiz: string; ymd: string };
      };
      const c = w.__exe3b;
      const txt = document.body.innerText;
      const linha = txt.match(/Última vez: [^\n]+/);
      const bruto =
        w.__gauntlet?.lerVaultMock(
          `${c?.raiz ?? ''}/markdown/exercicio-supino-reto.md`
        ) ?? '';
      return {
        temEmptyState: txt.includes('Sem histórico'),
        linha: linha ? linha[0] : '',
        // Uma entrada de historico, com a carga da sessao.
        entradas: (bruto.match(/- data:/g) ?? []).length,
        temCargaNoArquivo: bruto.includes('carga: 62.5'),
        temSeriesNoArquivo: /series: 4/.test(bruto) && /reps: 8/.test(bruto),
      };
    });

    if (depois.temEmptyState) {
      return falha(
        'a Tela 08 continua no empty state "Sem historico" depois de registrar a sessao: ' +
          'o append em exercicio.historico nao aconteceu.'
      );
    }
    // DD/MM de hoje, o dia em que a sessao duplicada foi gravada.
    const dm = `${ctx.ymd.slice(8, 10)}/${ctx.ymd.slice(5, 7)}`;
    const esperada = `Última vez: ${dm}, 62.5 kg, 4x8`;
    if (depois.linha !== esperada) {
      return falha(
        `linha "Ultima vez" errada: "${depois.linha}" (esperado "${esperada}").`
      );
    }
    if (depois.entradas !== 1 || !depois.temCargaNoArquivo) {
      return falha(
        `o arquivo do exercicio nao ficou como esperado: entradas=${depois.entradas} ` +
          `(esperado 1), carga gravada=${depois.temCargaNoArquivo}.`
      );
    }
    if (!depois.temSeriesNoArquivo) {
      return falha('series/reps nao chegaram ao arquivo do exercicio.');
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'exercicio cadastrado abria em "Sem historico"; registrar a sessao pela UI ' +
        `("Duplicar pra hoje") gravou UMA entrada de historico com 62.5 kg, 4x8 no ` +
        `arquivo markdown/exercicio-supino-reto.md, e a Tela 08 passou a exibir "${esperada}".`,
      screenshots,
    };
  } catch (err) {
    return falha(err instanceof Error ? err.message : String(err));
  }
}
