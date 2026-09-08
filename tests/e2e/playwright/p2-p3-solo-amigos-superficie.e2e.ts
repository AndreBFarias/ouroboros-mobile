// P2 + P3 (2026-09-08): a superficie de casal ramifica por
// tipoCompanhia, e os tres valores do onboarding (sozinho, casal,
// amigos) chegam inteiros ate a interface.
//
// O caso mede COMPORTAMENTO, nao presenca visual: navega o diario
// emocional nos tres modos e verifica o que a pessoa le em cada um.
//
//   1. sozinho -> o corpo da tela nao contem "casal", "voces dois" nem
//      o nome da segunda pessoa.
//   2. casal   -> o chip da segunda pessoa e o destino "Para o casal"
//      voltam a existir (controle positivo: sem ele, uma tela que nao
//      renderiza nada passaria o cenario 1 por vacuidade).
//   3. amigos  -> o mesmo destino aparece como "Para todos", e "Para o
//      casal" nao existe mais.
//
// O cenario 3 e' o que so' passa depois da P3: enquanto
// useSettings colapsava casal/amigos em 'duo', quem respondia amigos
// no onboarding lia "Para o casal" na tela seguinte.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

const SCREENSHOT_DIR =
  'docs/sprints/P2-P3-SOLO-AMIGOS-SUPERFICIE-screenshots-gauntlet';

interface GauntletGlobal {
  reset: () => void;
  seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
  setTipoCompanhia: (modo: 'sozinho' | 'casal' | 'amigos') => void;
  abrir: (rota: string) => Promise<void>;
}

const NOME_B = 'Zorvax';

export default async function caseSoloAmigosSuperficie(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'P2-P3-SOLO-AMIGOS-SUPERFICIE';
  const aspecto = 'ramificacao-por-tipocompanhia';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    const apiOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletGlobal };
      if (!w.__gauntlet) return false;
      return typeof w.__gauntlet.setTipoCompanhia === 'function';
    });
    if (!apiOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente ou setTipoCompanhia nao exposto; EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // ----- Cenario 1: sozinho, nenhum vazamento -----
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletGlobal };
      w.__gauntlet.reset();
      w.__gauntlet.seed({ nomeA: 'Alex', nomeB: null });
      w.__gauntlet.setTipoCompanhia('sozinho');
      await w.__gauntlet.abrir('/diario-emocional');
    });
    await page.waitForTimeout(1500);

    const shotSozinho = `${SCREENSHOT_DIR}/A-sozinho-sem-vazamento.png`;
    await page.screenshot({ path: shotSozinho });
    screenshots.push(shotSozinho);

    const vazamentos = await page.evaluate(() => {
      const txt = (document.body.textContent ?? '').toLowerCase();
      const achados: string[] = [];
      if (txt.includes('casal')) achados.push('casal');
      if (txt.includes('voces dois') || txt.includes('vocês dois')) {
        achados.push('voces dois');
      }
      if (txt.includes('zorvax')) achados.push('nome de pessoa_b');
      if (txt.includes('nome_b')) achados.push('placeholder Nome_B');
      return achados;
    });
    if (vazamentos.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `modo sozinho vazou: ${vazamentos.join(', ')}`,
        screenshots,
      };
    }

    // ----- Cenario 2: casal, superficie inteira (controle positivo) -----
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletGlobal };
      w.__gauntlet.reset();
      w.__gauntlet.seed({ nomeA: 'Alex', nomeB: 'Zorvax' });
      w.__gauntlet.setTipoCompanhia('casal');
      await w.__gauntlet.abrir('/diario-emocional');
    });
    await page.waitForTimeout(1500);

    const shotCasal = `${SCREENSHOT_DIR}/B-casal-superficie-inteira.png`;
    await page.screenshot({ path: shotCasal });
    screenshots.push(shotCasal);

    const casalOk = await page.evaluate(() => {
      const rotulos = Array.from(
        document.querySelectorAll('[aria-label]')
      ).map((el) => el.getAttribute('aria-label') ?? '');
      return {
        temChipPessoaB: rotulos.some((r) => r === 'chip Zorvax'),
        temParaCasal: rotulos.some((r) => r === 'chip Para o casal'),
      };
    });
    if (!casalOk.temChipPessoaB || !casalOk.temParaCasal) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          `modo casal perdeu superficie: chip pessoa_b=${casalOk.temChipPessoaB}, ` +
          `chip "Para o casal"=${casalOk.temParaCasal}. O cenario 1 nao vale sem este controle.`,
        screenshots,
      };
    }

    // ----- Cenario 3: amigos, mesmo elemento com outro rotulo -----
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletGlobal };
      w.__gauntlet.setTipoCompanhia('amigos');
      await w.__gauntlet.abrir('/diario-emocional');
    });
    await page.waitForTimeout(1500);

    const shotAmigos = `${SCREENSHOT_DIR}/C-amigos-para-todos.png`;
    await page.screenshot({ path: shotAmigos });
    screenshots.push(shotAmigos);

    const amigosOk = await page.evaluate(() => {
      const rotulos = Array.from(
        document.querySelectorAll('[aria-label]')
      ).map((el) => el.getAttribute('aria-label') ?? '');
      const txt = document.body.textContent ?? '';
      return {
        temParaTodos: rotulos.some((r) => r === 'chip Para todos'),
        temParaCasal: rotulos.some((r) => r === 'chip Para o casal'),
        rodapeSemVocesDois: !txt.includes('vocês dois'),
      };
    });
    if (
      !amigosOk.temParaTodos ||
      amigosOk.temParaCasal ||
      !amigosOk.rodapeSemVocesDois
    ) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          `modo amigos incorreto: "Para todos"=${amigosOk.temParaTodos}, ` +
          `"Para o casal" ainda presente=${amigosOk.temParaCasal}, ` +
          `rodape sem "voces dois"=${amigosOk.rodapeSemVocesDois}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'sozinho sem vazamento (casal / voces dois / nome de pessoa_b ausentes); ' +
        'casal com a superficie inteira (controle positivo); ' +
        'amigos com "Para todos" no lugar de "Para o casal".',
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
