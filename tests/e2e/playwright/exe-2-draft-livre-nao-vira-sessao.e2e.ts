// Caso E2E EXE-2: marcar tres exercicios num dia produz UM treino, nao
// tres.
//
// O que este caso mede, sempre por CONTAGEM de arquivo e de item --
// nunca por presenca de texto:
//   1. Tres toques em "Adicionar a treino livre", em tres exercicios
//      DIFERENTES, deixam UM arquivo em treinos/ e ZERO em
//      treinos/draft/. Antes da EXE-2 cada toque criava um draft
//      proprio, porque o nome do arquivo carregava o slug do exercicio.
//   2. Esse arquivo unico lista os tres exercicios.
//   3. A aba Treinos conta 1 treino, nao 3. E' o numero que alimentava o
//      "5 sessoes, 150 minutos" do Recap e o marco automatico de tres
//      treinos na semana.
//
// O toast novo entra por captura (02-toast-...), nao por assert de
// texto: o assert do caso e' sobre o disco.
//
// O QUE ESTE CASO NAO MEDE: a migracao one-shot dos drafts legados. O
// `autoSeedDev()` de app/_layout.tsx define o vaultRoot em todo boot
// dev-web, entao os hooks one-shot queimam no mount com o Vault mock
// ainda vazio (corrida ja registrada em AUDIT-P2-13, ver o cabecalho de
// audit-p1-4-agenda-evento-duplicado.e2e.ts). Exercita-la aqui produziria
// caso verde intermitente. O colapso por dia da migracao esta provado em
// tests/lib/treinos/migrarDraftsParaTreinoSessao.test.ts, com cinco
// drafts virando uma sessao e com a remigracao convergindo no mesmo
// arquivo.
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
  'docs/sprints/EXE-2-DRAFT-LIVRE-NAO-VIRA-SESSAO-screenshots-gauntlet';

interface GauntletMinimo {
  aguardarBoot: (timeoutMs?: number) => Promise<boolean>;
  reset: () => void;
  seed: () => void;
  estado: () => { vaultRoot: string | null };
  abrir: (rota: string) => Promise<void> | void;
  setArquivoMock: (uri: string, conteudo: string) => void;
  lerVaultMock: (uri: string) => string | null;
  listarVaultMock: () => string[];
}

export default async function case_exe_2_draft_livre_nao_vira_sessao(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'EXE-2-DRAFT-LIVRE-NAO-VIRA-SESSAO';
  const aspecto = 'um-treino-por-dia-em-vez-de-um-por-exercicio';
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

    // 1. Reset + seed e injecao dos tres exercicios. O contexto fica em
    //    globalThis.__exe2: o harness so aceita evaluate sem argumento.
    //
    //    `aguardarBoot` antes de qualquer coisa: sem ele a primeira
    //    navegacao pega o router ainda nao instalado ("Gauntlet: router
    //    nao instalado") e o caso reprova por corrida de mount, nao por
    //    defeito -- medido na primeira execucao deste arquivo.
    const ctx = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: GauntletMinimo;
        __exe2?: { raiz: string; slugs: string[] };
      };
      if (!w.__gauntlet) return null;
      await w.__gauntlet.aguardarBoot(30000);
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      const raiz =
        w.__gauntlet.estado().vaultRoot ?? 'web://mock-vault/Ouroboros';
      const slugs = ['supino-e2e', 'agachamento-e2e', 'remada-e2e'];
      const nomes: Record<string, string> = {
        'supino-e2e': 'Supino reto',
        'agachamento-e2e': 'Agachamento livre',
        'remada-e2e': 'Remada curvada',
      };
      for (const slug of slugs) {
        const md = [
          '---',
          '_schema_version: 1',
          'tipo: exercicio',
          `slug: ${slug}`,
          `nome: ${nomes[slug]}`,
          'grupo_muscular:',
          '  - peito',
          'nivel: iniciante',
          'equipamento: Barra',
          'instrucao: Movimento controlado, sem travar as articulacoes.',
          'dicas: []',
          "gif: ''",
          'historico: []',
          '---',
          '',
        ].join('\n');
        w.__gauntlet.setArquivoMock(
          `${raiz}/markdown/exercicio-${slug}.md`,
          md
        );
      }
      w.__exe2 = { raiz, slugs };
      return { raiz, slugs };
    });
    if (!ctx) {
      return falha(
        'window.__gauntlet ausente; EXPO_PUBLIC_GAUNTLET nao ativa?'
      );
    }

    // 2. Tocar "Adicionar a treino livre" em cada um dos tres. O evaluate
    //    do harness so aceita funcao sem argumento, entao o proximo slug
    //    e' lido do proprio __exe2 e o indice avanca la dentro.
    for (let i = 0; i < ctx.slugs.length; i++) {
      const abriu = await page.evaluate(async () => {
        const w = globalThis as unknown as {
          __gauntlet?: GauntletMinimo;
          __exe2?: { raiz: string; slugs: string[]; indice?: number };
        };
        const st = w.__exe2;
        if (!w.__gauntlet || !st) return null;
        const indice = st.indice ?? 0;
        const slug = st.slugs[indice];
        st.indice = indice + 1;
        // Passa pela Home entre um exercicio e outro: `replace` para a
        // mesma rota com outro parametro nao remonta a tela. As duas
        // navegacoes vao com retry curto porque o router pode nao estar
        // instalado no instante exato do primeiro toque.
        const navegar = async (rota: string): Promise<void> => {
          for (let t = 0; t < 10; t++) {
            try {
              await w.__gauntlet?.abrir(rota);
              return;
            } catch {
              await new Promise((r) => setTimeout(r, 300));
            }
          }
          throw new Error(`nao consegui navegar para ${rota}`);
        };
        await navegar('/');
        await navegar(`/exercicios/${slug}`);
        return slug;
      });
      if (!abriu) return falha('contexto __exe2 perdido entre as navegacoes.');
      const slug = abriu;
      await page.waitForTimeout(1200);

      const clicou = await page.evaluate(() => {
        const alvo = document.querySelector(
          '[aria-label="Adicionar a treino livre"]'
        ) as HTMLElement | null;
        if (!alvo) return false;
        alvo.click();
        return true;
      });
      if (!clicou) {
        return falha(
          `botao "Adicionar a treino livre" nao encontrado em /exercicios/${slug}.`
        );
      }
      await page.waitForTimeout(900);

      if (i === 0) {
        const shotToast = `${PASTA}/01-toast-adicionado-ao-treino-de-hoje.png`;
        await page.screenshot({ path: shotToast });
        screenshots.push(shotToast);
      }
      if (i === ctx.slugs.length - 1) {
        const shotUltimo = `${PASTA}/02-terceiro-exercicio-marcado.png`;
        await page.screenshot({ path: shotUltimo });
        screenshots.push(shotUltimo);
      }
    }

    // 3. O disco: um arquivo de sessao, nenhum draft, tres exercicios.
    const noDisco = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet?: GauntletMinimo;
        __exe2?: { raiz: string };
      };
      const raiz = w.__exe2?.raiz ?? '';
      const todos = w.__gauntlet?.listarVaultMock() ?? [];
      // Prefixo da RAIZ: a lixeira vive em cache://lixeira/treinos/ e
      // tambem casaria um filtro por '/treinos/'.
      const sessoes = todos.filter(
        (u) =>
          u.startsWith(`${raiz}/treinos/`) &&
          !u.startsWith(`${raiz}/treinos/draft/`) &&
          u.endsWith('.md')
      );
      const drafts = todos.filter((u) =>
        u.startsWith(`${raiz}/treinos/draft/`)
      );
      const conteudo =
        sessoes.length === 1
          ? (w.__gauntlet?.lerVaultMock(sessoes[0]) ?? '')
          : '';
      return {
        sessoes,
        drafts,
        // Cada item da lista de exercicios comeca com "- nome:".
        itens: (conteudo.match(/-\s+nome:/g) ?? []).length,
        temRotinaLivre: /rotina:\s*['"]?Treino livre/.test(conteudo),
      };
    });

    if (noDisco.drafts.length > 0) {
      return falha(
        `o caminho novo ainda escreve em treinos/draft/: ${JSON.stringify(noDisco.drafts)}.`
      );
    }
    if (noDisco.sessoes.length !== 1) {
      return falha(
        `tres exercicios marcados num dia produziram ${noDisco.sessoes.length} arquivos ` +
          `(esperado 1): ${JSON.stringify(noDisco.sessoes)}. E' o bug do draft por exercicio.`
      );
    }
    if (noDisco.itens !== 3) {
      return falha(
        `a sessao unica lista ${noDisco.itens} exercicios (esperado 3).`
      );
    }
    if (!noDisco.temRotinaLivre) {
      return falha('a sessao gravada nao tem rotina "Treino livre".');
    }

    // 4. A aba Treinos conta 1, nao 3.
    await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
      return w.__gauntlet?.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1800);

    const shotAba = `${PASTA}/03-aba-treinos-conta-um.png`;
    await page.screenshot({ path: shotAba });
    screenshots.push(shotAba);

    const contagem = await page.evaluate(() => {
      const m = document.body.innerText.match(/(\d+)\s+treinos?\s+em 90 dias/);
      return m ? Number(m[1]) : -1;
    });
    if (contagem !== 1) {
      return falha(
        `a aba Treinos conta ${contagem} treinos (esperado 1). Tres exercicios ` +
          'marcados num dia voltaram a virar tres sessoes.'
      );
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'tres exercicios diferentes marcados no mesmo dia deixaram UM arquivo em treinos/, ' +
        'zero em treinos/draft/, com os tres exercicios na mesma sessao; a aba Treinos contou 1.',
      screenshots,
    };
  } catch (err) {
    return falha(err instanceof Error ? err.message : String(err));
  }
}
