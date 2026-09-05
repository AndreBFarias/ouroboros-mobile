// AUDIT-P2-12: o gate que faltava -- o Recap tem de ENXERGAR o seed.
//
// Ate 2026-09-05 o `lerConquistas` tinha um early-return para vaultRoot
// `web://`, escrito quando o mock web ainda nao tinha reader. O reader
// passou a existir em INFRA-VAULT-WEB-MOCK e o guard ficou, cegando o
// Recap no Gauntlet: com sete eventos gravados e validos, a tela
// mostrava "Sua primeira conquista vai aparecer aqui.".
//
// O custo disso nao foi cosmetico. Empty state e indistinguivel de
// "sem dados", entao a tela nunca denunciou nada -- e a barra de
// filtros de AUDIT-P2-11 passou dois meses desconectada sem ninguem
// notar. Este caso existe para que a proxima cegueira do Recap reprove
// em vez de parecer normal.
//
// Comentarios sem acento.

export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  screenshot(opts: { path: string; fullPage?: boolean }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<unknown>;
}

export interface ResultadoE2E {
  sprint: string;
  aspecto: string;
  status: 'PASS' | 'FAIL' | 'INCONCLUSIVO';
  detalhe: string;
  screenshots: string[];
}

export default async function caseAuditP212RecapLeOSeed(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P2-12-RECAP-CEGO-NO-GAUNTLET';
  const aspecto = 'recap-enxerga-o-seed';
  const screenshots: string[] = [];
  const dir = `docs/sprints/${sprint}-screenshots-gauntlet`;

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

    const semeado = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          seedComDados: (f: string) => Promise<void>;
          listarVaultMock: () => string[];
        };
      };
      if (!w.__gauntlet) return -1;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      await w.__gauntlet.seedComDados('eventos-7');
      return (w.__gauntlet.listarVaultMock() || []).filter((u) =>
        String(u).includes('/markdown/evento-')
      ).length;
    });

    if (semeado === -1) {
      return falha(
        'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?'
      );
    }
    if (semeado !== 7) {
      // Falha do seed, nao do Recap -- separa as duas causas.
      return falha(
        `seedComDados('eventos-7') gravou ${semeado} eventos no vault mock, esperado 7. ` +
          'O defeito esta no seeder, nao na leitura.'
      );
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet?: { abrir: (r: string) => Promise<void> };
      };
      await w.__gauntlet?.abrir('/recap');
    });
    await page.waitForTimeout(2000);

    const entrou = await page.evaluate(() => {
      const alvo = document.querySelector<HTMLElement>(
        '[aria-label="modo calendario"]'
      );
      if (!alvo) return false;
      alvo.click();
      return true;
    });
    if (!entrou) {
      return falha('toggle "modo calendario" nao encontrado no Recap.');
    }
    await page.waitForTimeout(1800);

    const visao = await page.evaluate(() => ({
      // O galho `sem` (brutas.length === 0) e o sintoma exato da cegueira.
      mostraEmptyDeZeroDados: document.body.innerText.includes(
        'Sua primeira conquista vai aparecer aqui.'
      ),
      // Com dados, o controle de filtros de P2-11 tem de estar montado.
      temControleFiltros:
        document.querySelector(
          '[aria-label^="abrir filtros de conquistas"]'
        ) !== null,
      diasMarcados: document.querySelectorAll('[aria-label^="dia "]').length,
    }));

    await page.screenshot({ path: `${dir}/01-recap-com-seed.png` });
    screenshots.push(`${dir}/01-recap-com-seed.png`);

    if (visao.mostraEmptyDeZeroDados) {
      return falha(
        'Recap cego: 7 eventos gravados no vault mock e a tela renderiza o empty ' +
          'state de zero conquistas. Provavel guard `web://` reintroduzido em ' +
          'lerConquistas (ver o comentario AUDIT-P2-12 no loader).'
      );
    }
    if (!visao.temControleFiltros) {
      return falha(
        'Recap saiu do empty state mas o controle de filtros (AUDIT-P2-11) nao montou.'
      );
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        `7 eventos semeados e lidos: o modo Calendario saiu do empty state e montou ` +
        'o controle de filtros. O Recap enxerga o Vault mock do Gauntlet.',
      screenshots,
    };
  } catch (err) {
    return falha(`excecao: ${String(err)}`);
  }
}
