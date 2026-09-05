// Caso E2E AUDIT-P2-8-BOTAOMARCAR-SF3: o proof-of-work que a sprint
// R-SF-3 exigia e nunca foi entregue -- tres marcacoes + historico
// visivel + lembrete silenciado.
//
// O defeito: BotaoMarcar existia com 7 casos de teste verdes e ZERO
// renders de producao. registrarMarcacao, silenciarLembreteHoje,
// calcularTimeline e calcularAderenciaSemanal ficaram orfaos junto.
// Nenhuma interacao de usuario chegava a criar arquivo de marcacao.
//
// ATENCAO ao path: o spec da sprint fala em `rotinas/<id>/historico-
// <data>.md`, que NAO EXISTE. O path real e
// markdown/rotina-marcacao-<slug>-<YYYY-MM-DD>.md
// (rotinaMarcacaoPath, src/lib/vault/rotina_marcacao.ts). Preservar o
// formato e NAO-objetivo da sprint, entao este caso asserta o path
// REAL -- assertar o do spec produziria um E2E vermelho para sempre.
//
// O seed deterministico NAO cria rotina nenhuma (`rotina: 'Rotina seed'`
// em seedDeterministico.ts e apenas um CAMPO de treino_sessao). Este
// caso injeta a rotina ele mesmo via __gauntlet.setArquivoMock.
//
// Os tres toques sao espacados: registrarMarcacao deduplica timestamps
// ISO identicos, entao dois taps no mesmo milissegundo virariam uma
// marcacao so e o assert de 3 falharia por motivo errado.
//
// Estrutura copiada de tests/e2e/playwright/e2e-template.ts. Executado
// via automacao de browser no Gauntlet, nao por Jest (jest.config
// testMatch filtra *.test.ts).
//
// IMPORTANTE: navegar sempre via __gauntlet.abrir(); page.goto()
// recarrega a pagina e destroi o useVaultMock in-memory.
//
// Comentarios sem acento (convencao shell/CI).

import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

const PASTA = 'docs/sprints/AUDIT-P2-8-BOTAOMARCAR-SF3-screenshots-gauntlet';

export default async function case_audit_p2_8_botaomarcar_sf3(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P2-8-BOTAOMARCAR-SF3';
  const aspecto = 'marcacao-rapida-timeline-aderencia';
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

    // 3. Injetar a rotina no Vault mock. Autor pessoa_a porque o seed
    //    deixa pessoaAtiva no default pessoa_a.
    const injetado = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          estado: () => { vaultRoot: string | null };
          setArquivoMock: (uri: string, conteudo: string) => void;
        };
      };
      const g = w.__gauntlet;
      if (!g) return null;
      const raiz = g.estado().vaultRoot ?? 'web://mock-vault/Ouroboros';
      const md = [
        '---',
        'tipo: rotina_treino',
        'slug: venvanse',
        'nome: Venvanse',
        'descricao: null',
        'exercicios:',
        '  - nome: Tomar o comprimido',
        '    carga_kg: null',
        '    series: 1',
        '    reps: "1"',
        '    descanso_seg: 90',
        '    observacao: null',
        'data_criacao: 2026-09-01',
        'autor: pessoa_a',
        'categoria: medicacao',
        'silenciar_sugestao_ate: null',
        '---',
        '',
      ].join('\n');
      g.setArquivoMock(`${raiz}/markdown/rotina-venvanse.md`, md);
      return raiz;
    });
    if (!injetado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'nao foi possivel injetar a rotina no Vault mock.',
        screenshots,
      };
    }

    // 4. Abrir a lista de rotinas (SPA-navigate, sem reload).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> | void };
      };
      await w.__gauntlet?.abrir('/rotinas');
    });
    await page.waitForTimeout(1200);

    const antes = `${PASTA}/01-lista-rotinas-nao-marcada.png`;
    await page.screenshot({ path: antes });
    screenshots.push(antes);

    // 5. O botao tem que existir. AUDIT-P2-8 nasceu justamente porque
    //    nao existia.
    const temBotao = await page.evaluate(
      () => !!document.querySelector('[aria-label="marcar rotina Venvanse"]')
    );
    if (!temBotao) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'BotaoMarcar nao renderizou no card de /rotinas (aria-label "marcar rotina Venvanse" ausente).',
        screenshots,
      };
    }

    // 6. Tres toques espacados. Cada tap = uma marcacao distinta.
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const alvo = document.querySelector(
          '[aria-label="marcar rotina Venvanse"]'
        ) as HTMLElement | null;
        alvo?.click();
      });
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(600);

    const depois = `${PASTA}/02-lista-rotinas-marcada.png`;
    await page.screenshot({ path: depois });
    screenshots.push(depois);

    // 7. Assert de comportamento no arquivo do dia. O nome do arquivo
    //    carrega a data local, entao localizamos pela listagem do mock
    //    em vez de recalcular o fuso aqui.
    const arquivo = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          listarVaultMock: () => string[];
          lerVaultMock: (uri: string) => string | null;
        };
      };
      const g = w.__gauntlet;
      if (!g) return null;
      const uri = g
        .listarVaultMock()
        .find((u) => u.includes('rotina-marcacao-venvanse-'));
      if (!uri) return { uri: null, raw: null };
      return { uri, raw: g.lerVaultMock(uri) };
    });

    if (!arquivo || !arquivo.uri || !arquivo.raw) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'nenhum markdown/rotina-marcacao-venvanse-<data>.md foi gravado apos 3 toques; o onPress nao chegou em registrarMarcacao.',
        screenshots,
      };
    }

    const marcacoes = (arquivo.raw.match(/^\s+- '?\d{4}-\d{2}-\d{2}T/gm) ?? [])
      .length;
    if (marcacoes !== 3) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `esperava 3 marcacoes distintas em ${arquivo.uri}, achei ${marcacoes}. Conteudo: ${arquivo.raw}`,
        screenshots,
      };
    }
    if (
      !/silenciar_lembrete_ate:\s*'?\d{4}-\d{2}-\d{2}T23:59:59/.test(
        arquivo.raw
      )
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `silenciar_lembrete_ate nao foi gravado; a parte "lembrete silenciado se marcado antes" do R-SF-3 continua sem caller. Conteudo: ${arquivo.raw}`,
        screenshots,
      };
    }

    // 8. Estado visual do botao vira marcado. NAO da para ler
    //    aria-checked aqui: react-native-web 0.21 removeu o mapeamento
    //    de accessibilityState (createDOMProps so conhece aria-checked /
    //    accessibilityChecked), e BotaoMarcar usa accessibilityState.
    //    O sinal observavel e o fundo: transparente quando nao marcado,
    //    purple (#bd93f9 = rgb(189, 147, 249)) quando marcado.
    const fundo = await page.evaluate(() => {
      const alvo = document.querySelector(
        '[aria-label="marcar rotina Venvanse"]'
      );
      if (!alvo) return null;
      return globalThis.getComputedStyle(alvo).backgroundColor;
    });
    if (!fundo || !/189,\s*147,\s*249/.test(fundo)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `apos marcar, o botao deveria ficar com fundo purple rgb(189, 147, 249); observado: ${String(fundo)}.`,
        screenshots,
      };
    }

    // 9. Detalhe da rotina: timeline + aderencia semanal.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (rota: string) => Promise<void> | void };
      };
      await w.__gauntlet?.abrir('/rotinas/venvanse');
    });
    await page.waitForTimeout(1400);

    const detalhe = `${PASTA}/03-detalhe-timeline-aderencia.png`;
    await page.screenshot({ path: detalhe });
    screenshots.push(detalhe);

    const analise = await page.evaluate(() => {
      const corpo = document.body?.innerText ?? '';
      const rotuloAderencia =
        document
          .querySelector('[aria-label^="aderencia semanal"]')
          ?.getAttribute('aria-label') ?? '';
      const ocorrencias = (corpo.match(/\d{2}\/\d{2} às \d{2}:\d{2}/g) ?? [])
        .length;
      return {
        temTitulo: corpo.includes('Últimas marcações'),
        rotuloAderencia,
        ocorrencias,
      };
    });

    if (!analise.temTitulo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'o detalhe da rotina nao mostra a secao "Últimas marcações"; calcularTimeline continua sem consumidor de UI.',
        screenshots,
      };
    }
    if (analise.ocorrencias < 3) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `a timeline deveria listar as 3 ocorrencias; contei ${analise.ocorrencias}.`,
        screenshots,
      };
    }
    if (!/de 7 dias/.test(analise.rotuloAderencia)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `a linha de aderencia semanal nao renderizou; aria-label observado: "${analise.rotuloAderencia}".`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `3 toques no BotaoMarcar gravaram 3 marcacoes em ${arquivo.uri} com silenciar_lembrete_ate preenchido; o botao virou marcado e o detalhe mostra timeline (${analise.ocorrencias} ocorrencias) e aderencia semanal ("${analise.rotuloAderencia}").`,
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
