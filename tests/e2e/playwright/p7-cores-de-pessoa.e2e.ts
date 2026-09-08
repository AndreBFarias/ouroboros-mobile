// P7 (2026-09-08) -- a cor de pessoa deixa de ser regra e vira default
// editavel, com recusa de cor que reprova no contraste.
//
// O QUE SO' O BROWSER PROVA AQUI
//
// A suite Jest ja cobre o piso de contraste, o store e a tela isolados.
// O que ela nao mede e' o CIRCUITO: escolher a cor em
// /settings/cores-pessoa, o valor atravessar o SecureStore (que no web
// e' localStorage, armadilha A15) e OUTRA tela repintar por causa
// disso. Sao tres modulos e uma serializacao no meio.
//
// Por isso o passo 5 e' o que mais importa: ele le a cor RENDERIZADA
// pelo navegador em outra rota (getComputedStyle da borda do radio de
// pessoa em /settings), e nao a string que a propria tela de troca
// mostra. Asserto por substring no texto passaria por coincidencia
// (armadilha registrada no commit 60ebfdb).
//
// O passo 3 fecha o outro lado da decisao: cor ilegivel NAO entra. A
// prova e' a ausencia dela no armazenamento real, mais o aviso com os
// dois numeros na tela -- razao obtida e razao minima.
//
// O que este caso NAO prova: como a cor aparece no widget da tela
// inicial. O widget e' superficie nativa do Android e nao existe no
// Gauntlet; a chamada que o empurra esta coberta em Jest.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

// Chave do zustand persist. Inlineada tambem dentro dos page.evaluate,
// que so aceitam closure zero-arg (e2e-template.ts:27).
const CHAVE_CORES = 'ouroboros.cores-pessoa.v1';
// Verde da paleta do projeto: passa no piso, e e' visivelmente
// diferente do roxo default em captura.
const COR_ESCOLHIDA = '#50fa7b';
const COR_ESCOLHIDA_RGB = 'rgb(80, 250, 123)';
const COR_DEFAULT_A = '#bd93f9';
// Cinza escuro: reprova por contraste contra o fundo do aplicativo.
const COR_ILEGIVEL = '#101014';

interface JanelaGauntlet {
  __gauntlet?: {
    reset: () => void;
    seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
  };
}

export default async function case_p7_cores_de_pessoa(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'P7';
  const aspecto = 'cores-de-pessoa';
  const pasta = `docs/sprints/${sprint}-CORES-DE-PESSOA-screenshots-gauntlet`;
  const screenshots: string[] = [];

  // Le a cor do armazenamento real, com o parser real (JSON do zustand
  // persist). Nada de procurar o hex no texto da tela.
  const lerCorGuardada = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem('ouroboros.cores-pessoa.v1');
      if (!raw) return null;
      const obj = JSON.parse(raw) as {
        state?: { cores?: { pessoa_a?: string } };
      };
      return obj.state?.cores?.pessoa_a ?? null;
    });

  const lerAviso = () =>
    page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="aviso cor pessoa_a"]'
      ) as HTMLElement | null;
      return el?.innerText ?? null;
    });

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as JanelaGauntlet;
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      // nomeB liga o modo casal: com duas pessoas, a tela mostra os
      // dois blocos e o radio de /settings existe para medir a cor.
      w.__gauntlet.seed({ nomeA: 'Nome_A', nomeB: 'Nome_B' });
      return true;
    });
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: 'window.__gauntlet ausente. Confirme EXPO_PUBLIC_GAUNTLET=1.',
        screenshots,
      };
    }

    // 1) Instalacao limpa: a tela abre nos defaults, e diz que eles sao
    // ponto de partida, nao escolha da pessoa.
    await page.goto('http://localhost:8081/settings/cores-pessoa');
    await page.waitForTimeout(2500);

    const blocos = await page.evaluate(() => ({
      a: Boolean(document.querySelector('[aria-label="bloco cor pessoa_a"]')),
      b: Boolean(document.querySelector('[aria-label="bloco cor pessoa_b"]')),
      partida: document.body.innerText.includes('cor de partida'),
    }));
    if (!blocos.a || !blocos.b) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Blocos de cor ausentes: ${JSON.stringify(blocos)}`,
        screenshots,
      };
    }

    const shotA = `${pasta}/A-tela-cores-default.png`;
    await page.screenshot({ path: shotA, fullPage: true });
    screenshots.push(shotA);

    // 2) Nada guardado ainda: a cor em vigor e' o default, e o
    // armazenamento nao tem escolha nenhuma da pessoa.
    const antes = await lerCorGuardada();
    if (antes !== null && antes !== COR_DEFAULT_A) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Instalacao limpa ja tinha cor propria: ${String(antes)}.`,
        screenshots,
      };
    }

    // 3) Cor ilegivel: a interface RECUSA. Nao basta avisar -- o valor
    // nao pode chegar ao armazenamento.
    const digitou = await page.evaluate(() => {
      const input = document.querySelector(
        '[aria-label="campo cor pessoa_a"]'
      ) as HTMLInputElement | null;
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(input, '#101014');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    if (!digitou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Campo "campo cor pessoa_a" ausente na tela.',
        screenshots,
      };
    }

    await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="usar cor pessoa_a"]'
      ) as HTMLElement | null;
      el?.click();
    });
    await page.waitForTimeout(1200);

    const guardadaAposRecusa = await lerCorGuardada();
    if (guardadaAposRecusa === COR_ILEGIVEL) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Cor ilegivel ${COR_ILEGIVEL} foi guardada em ${CHAVE_CORES}.`,
        screenshots,
      };
    }

    const aviso = await lerAviso();
    if (aviso === null) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'A recusa nao explicou nada: aviso ausente na tela.',
        screenshots,
      };
    }
    // O texto precisa carregar os DOIS numeros (obtido e minimo) e nao
    // pode culpar quem escolheu.
    const numeros = aviso.match(/\d,\d para 1/g) ?? [];
    const culpa = /inválid|erro|falha|!/i.test(aviso);
    if (numeros.length < 2 || culpa) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Aviso fora do contrato (numeros=${numeros.length}, culpa=${culpa}): ${aviso}`,
        screenshots,
      };
    }

    const shotB = `${pasta}/B-recusa-com-numeros.png`;
    await page.screenshot({ path: shotB, fullPage: true });
    screenshots.push(shotB);

    // 4) Cor legivel pelo atalho: entra, e chega ao armazenamento real.
    await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="cor verde para pessoa_a"]'
      ) as HTMLElement | null;
      el?.click();
    });
    // secureStorage no web e' StateStorage assincrono e o flush do
    // zustand persist cai em microtask; sem espera, a leitura pega o
    // valor antigo (mesma razao do audit-p2-2).
    await page.waitForTimeout(1200);

    const guardada = await lerCorGuardada();
    if (guardada !== COR_ESCOLHIDA) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Cor escolhida nao chegou a ${CHAVE_CORES}. Lido: ${String(
          guardada
        )}`,
        screenshots,
      };
    }

    const shotC = `${pasta}/C-cor-escolhida.png`;
    await page.screenshot({ path: shotC, fullPage: true });
    screenshots.push(shotC);

    // 5) O circuito fecha em OUTRA tela, e no pixel: a borda do radio de
    // pessoa ativa em /settings e' pintada com a cor da pessoa.
    await page.goto('http://localhost:8081/settings');
    await page.waitForTimeout(2500);

    const corRenderizada = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="pessoa nome_a"]'
      ) as HTMLElement | null;
      if (!el) return null;
      return window.getComputedStyle(el).borderTopColor;
    });
    if (corRenderizada === null) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Radio de pessoa ausente em /settings; nao ha o que medir.',
        screenshots,
      };
    }
    if (corRenderizada !== COR_ESCOLHIDA_RGB) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Outra tela nao repintou. Esperado ${COR_ESCOLHIDA_RGB}, obtido ${corRenderizada}.`,
        screenshots,
      };
    }

    const shotD = `${pasta}/D-consumidor-repintado.png`;
    await page.screenshot({ path: shotD, fullPage: true });
    screenshots.push(shotD);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'A tela abre nos defaults; cor ilegivel e recusada com a razao obtida e a minima no texto; cor legivel chega ao armazenamento real e repinta o radio de pessoa em /settings.',
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
