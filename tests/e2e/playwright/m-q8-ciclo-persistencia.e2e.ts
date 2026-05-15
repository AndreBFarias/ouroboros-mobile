// E2E Q8 (Onda Q, 2026-05-12): valida que registro de ciclo persiste e
// aparece na lista "Ultimos registros" + mini-stats apos save no
// cenario que QUEBRAVA antes do fix Bloqueador A — config casal
// masculino+feminino com pessoaAtiva=pessoa_a (default).
//
// Antes do fix:
//   - save grava autor=pessoa_b (inferido por autorPadrao a partir do
//     sexoDeclarado.pessoa_b=feminino)
//   - load em /ciclo filtrava por pessoaAtiva=pessoa_a (default da
//     store), causando empty state apesar do arquivo persistir no disco
//
// Depois do fix (app/ciclo/index.tsx):
//   - load tambem usa autorPadrao(tipoCompanhia, sexoA, sexoB) ?? pessoaAtiva
//     replicando a logica do registrar.tsx — simetria save/load
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface GauntletShape {
  reset: () => void;
  seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
  setVaultRoot?: (root: string) => void;
  setTipoCompanhia?: (modo: 'sozinho' | 'casal' | 'amigos') => void;
  abrir: (rota: string) => Promise<void>;
  estado: () => unknown;
}

export default async function caseQ8CicloPersistencia(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-Q8-CICLO-PERSISTENCIA';
  const aspecto = 'persistencia-casal-fem';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // 1. Seed casal masculino+feminino com pessoaAtiva=pessoa_a default.
    //    Esse e o cenario que disparava o bug.
    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletShape };
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed({ nomeA: 'Nome_A', nomeB: 'Nome_B' });
      if (typeof w.__gauntlet.setVaultRoot === 'function') {
        w.__gauntlet.setVaultRoot('web://mock-vault/Test');
      }
      if (typeof w.__gauntlet.setTipoCompanhia === 'function') {
        w.__gauntlet.setTipoCompanhia('casal');
      }
      // Setar sexoDeclarado direto via store (forma robusta — store eh
      // exposto em modo dev gauntlet). Pessoa_a masculino + pessoa_b
      // feminino = caso classico do Bloqueador A.
      const z = globalThis as unknown as {
        __OB_SET_SEXO?: (p: string, s: string) => void;
      };
      if (typeof z.__OB_SET_SEXO === 'function') {
        z.__OB_SET_SEXO('pessoa_a', 'masculino');
        z.__OB_SET_SEXO('pessoa_b', 'feminino');
      }
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ligada?',
        screenshots,
      };
    }

    // 2. Abrir /ciclo/registrar, salvar e voltar.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/ciclo/registrar');
    });
    await page.waitForTimeout(1500);

    const tapSalvar = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll('[role="button"]')
      ) as HTMLElement[];
      const alvo = buttons.find(
        (b) => (b.textContent ?? '').trim() === 'Salvar'
      );
      if (!alvo) return false;
      alvo.click();
      return true;
    });
    if (!tapSalvar) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao Salvar nao encontrado em /ciclo/registrar',
        screenshots,
      };
    }
    await page.waitForTimeout(1500);

    // 3. Abrir /ciclo (vai listar). Antes do fix, lista vinha vazia.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/ciclo');
    });
    await page.waitForTimeout(1200);

    const shotCiclo =
      'docs/sprints/M-Q8-CICLO-PERSISTENCIA-screenshots-gauntlet/A-lista.png';
    await page.screenshot({ path: shotCiclo });
    screenshots.push(shotCiclo);

    // 4. Assert: lista NAO esta em empty state. Procura por
    //    "Ultimos registros" ou "Dia X do ciclo" na DOM. Ambos sao
    //    exclusivos do estado nao-vazio (Q8). Se nao encontrar,
    //    bug retornou (provavelmente fix Bloqueador A regrediu).
    const naoEmpty = await page.evaluate(() => {
      const txt = document.body.textContent ?? '';
      const temUltimos = txt.includes('Últimos registros');
      const temDiaCiclo = /Dia \d+ do ciclo/.test(txt);
      const temFraseEmpty = txt.includes(
        'Pode registrar o início do primeiro ciclo'
      );
      // Sucesso = pelo menos um indicador positivo + ausencia da frase
      // canonica do empty state.
      return (temUltimos || temDiaCiclo) && !temFraseEmpty;
    });
    if (!naoEmpty) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'lista em /ciclo permaneceu vazia apos save com autor inferido (Bloqueador A regrediu)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'registro de ciclo persistiu e aparece em /ciclo (lista + mini-stats) com casal masculino+feminino e pessoaAtiva default — simetria save/load do autor inferido confirmada',
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
