// P4 (2026-09-08) -- credencial por usuario, com degradacao graciosa e
// visivel.
//
// O QUE SO' O BROWSER PROVA AQUI
//
// A suite Jest ja cobre o store, os dois fluxos OAuth e o texto de cada
// tela isoladamente. O que ela nao consegue medir e' o CIRCUITO: colar
// um codigo em /settings/credenciais, ele atravessar o SecureStore (que
// no web e' localStorage, armadilha A15) e o hub /integracoes mudar de
// estado por causa disso. Sao tres modulos e uma serializacao no meio;
// cada um verde sozinho nao garante a costura.
//
// Por isso o passo 4 e' o que importa mais: ele fecha o circuito no
// CONSUMIDOR, com o valor lido do armazenamento real, e nao por
// substring no texto da tela (armadilha registrada no commit 60ebfdb).
//
// O que este caso NAO prova: que o codigo cadastrado e' aceito pelo
// Google ou pelo Spotify. Isso depende de rede externa e de um cadastro
// no painel deles -- nao-objetivo da sprint, e nunca sera testavel
// aqui.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

// Chave do zustand persist. Inlineada tambem dentro dos page.evaluate,
// que so aceitam closure zero-arg (e2e-template.ts:27).
const CHAVE_CREDENCIAIS = 'ouroboros.credenciais.v1';
// Formato real do painel do Spotify: 32 caracteres hexadecimais. Valor
// sintetico, nao e' credencial de ninguem.
const CLIENT_ID_SPOTIFY = '0123456789abcdef0123456789abcdef';

interface JanelaGauntlet {
  __gauntlet?: {
    reset: () => void;
    seed: () => void;
  };
}

export default async function case_p4_credencial_por_usuario(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'P4';
  const aspecto = 'credencial-por-usuario';
  const pasta = `docs/sprints/${sprint}-CREDENCIAL-POR-USUARIO-screenshots-gauntlet`;
  const screenshots: string[] = [];

  // Le a credencial do armazenamento real, com o parser real (JSON do
  // zustand persist). Nada de procurar o valor no texto da tela.
  const lerCredencialSpotify = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem('ouroboros.credenciais.v1');
      if (!raw) return null;
      const obj = JSON.parse(raw) as {
        state?: { spotify?: string | null };
      };
      return obj.state?.spotify ?? null;
    });

  const lerEstadosDosCards = () =>
    page.evaluate(() => {
      const slugs = ['google_calendar', 'spotify', 'youtube', 'google_drive'];
      const saida: Record<string, string | null> = {};
      for (const slug of slugs) {
        const el = document.querySelector(
          `[aria-label^="estado ${slug} "]`
        ) as HTMLElement | null;
        const label = el?.getAttribute('aria-label') ?? null;
        saida[slug] = label ? label.replace(`estado ${slug} `, '') : null;
      }
      return saida;
    });

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as JanelaGauntlet;
      if (!w.__gauntlet) return false;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
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

    // 1) Instalacao limpa: os quatro cards que dependem de servidor de
    // terceiro nascem em sem_credencial, e o hub explica por que.
    await page.goto('http://localhost:8081/integracoes');
    await page.waitForTimeout(2500);

    const estadosIniciais = await lerEstadosDosCards();
    const esperadoInicial = [
      'google_calendar',
      'spotify',
      'youtube',
      'google_drive',
    ];
    const foraDoEsperado = esperadoInicial.filter(
      (slug) => estadosIniciais[slug] !== 'sem_credencial'
    );
    if (foraDoEsperado.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Cards que deveriam nascer sem credencial: ${foraDoEsperado.join(
          ', '
        )}. Lido: ${JSON.stringify(estadosIniciais)}`,
        screenshots,
      };
    }

    const textoHonesto = await page.evaluate(() =>
      document.body.innerText.includes('Algumas delas pedem um código próprio')
    );
    if (!textoHonesto) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'O hub nao explica por que as integracoes comecam desligadas.',
        screenshots,
      };
    }

    const shotA = `${pasta}/A-hub-sem-credencial.png`;
    await page.screenshot({ path: shotA, fullPage: true });
    screenshots.push(shotA);

    // 2) A tela de cadastro comeca vazia nos dois provedores.
    await page.goto('http://localhost:8081/settings/credenciais');
    await page.waitForTimeout(2000);

    const antes = await lerCredencialSpotify();
    if (antes !== null) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Instalacao limpa ja tinha credencial: ${String(antes)}.`,
        screenshots,
      };
    }

    const shotB = `${pasta}/B-tela-credenciais-vazia.png`;
    await page.screenshot({ path: shotB, fullPage: true });
    screenshots.push(shotB);

    // 3) Colar o codigo e guardar. O setter nativo mais o evento input
    // sao necessarios porque atribuir .value direto nao dispara o
    // onChange do React (padrao dos casos m-save-*).
    const digitou = await page.evaluate(() => {
      const input = document.querySelector(
        '[aria-label="campo credencial spotify"]'
      ) as HTMLInputElement | null;
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(input, '0123456789abcdef0123456789abcdef');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    if (!digitou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Campo "campo credencial spotify" ausente na tela.',
        screenshots,
      };
    }

    const guardou = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="guardar credencial spotify"]'
      ) as HTMLElement | null;
      el?.click();
      return Boolean(el);
    });
    if (!guardou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Botao "guardar credencial spotify" ausente na tela.',
        screenshots,
      };
    }
    // secureStorage no web e' StateStorage assincrono e o flush do
    // zustand persist cai em microtask; sem espera, a leitura pega o
    // valor antigo (mesma razao do audit-p2-2).
    await page.waitForTimeout(1200);

    const gravado = await lerCredencialSpotify();
    if (gravado !== CLIENT_ID_SPOTIFY) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Credencial nao chegou a ${CHAVE_CREDENCIAIS}. Lido: ${String(
          gravado
        )}`,
        screenshots,
      };
    }

    const shotC = `${pasta}/C-credencial-guardada.png`;
    await page.screenshot({ path: shotC, fullPage: true });
    screenshots.push(shotC);

    // 4) O circuito fecha no consumidor: o hub reflete a credencial nova
    // no card do Spotify, e SO' nele -- os tres do Google continuam
    // pedindo o codigo que ainda nao foi cadastrado.
    await page.goto('http://localhost:8081/integracoes');
    await page.waitForTimeout(2500);

    const estadosDepois = await lerEstadosDosCards();
    if (estadosDepois.spotify !== 'desconectado') {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Card Spotify nao reagiu a credencial: ${String(
          estadosDepois.spotify
        )}`,
        screenshots,
      };
    }
    const googleVazou = ['google_calendar', 'youtube', 'google_drive'].filter(
      (slug) => estadosDepois[slug] !== 'sem_credencial'
    );
    if (googleVazou.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Credencial do Spotify vazou para cards do Google: ${googleVazou.join(
          ', '
        )}`,
        screenshots,
      };
    }

    const shotD = `${pasta}/D-hub-apos-credencial.png`;
    await page.screenshot({ path: shotD, fullPage: true });
    screenshots.push(shotD);

    // 5) O nucleo segue mudo sobre credencial. A Home e' a primeira tela
    // de quem abre o aplicativo; um aviso de cadastro aqui sugeriria que
    // a pessoa precisa de autorizacao para usar o que ja e' dela.
    await page.goto('http://localhost:8081/');
    await page.waitForTimeout(2500);

    const nucleoLimpo = await page.evaluate(() => {
      const texto = document.body.innerText.toLowerCase();
      return !texto.includes('credencial') && !texto.includes('client id');
    });
    if (!nucleoLimpo) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'A Home mostra aviso de credencial. O nucleo nao depende dela.',
        screenshots,
      };
    }

    const shotE = `${pasta}/E-home-sem-aviso.png`;
    await page.screenshot({ path: shotE, fullPage: true });
    screenshots.push(shotE);

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Quatro cards nascem sem credencial; guardar o codigo do Spotify grava no armazenamento real e so o card dele reage; a Home segue sem aviso.',
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
