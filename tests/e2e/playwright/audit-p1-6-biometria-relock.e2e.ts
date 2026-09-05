// AUDIT-P1-6 -- superficie de Settings do re-lock de biometria.
//
// LIMITE HONESTO, declarado aqui e no spec: o relock em si NAO e'
// observavel na web. O gate roda com bypass={MODO_DEV_WEB}
// (app/_layout.tsx) e LocalAuthentication nao tem implementacao web util
// (biometriaGate.tsx sai cedo em Platform.OS === 'web'). A prova do
// relock e' Jest (tests/lib/boot/biometriaGate.test.tsx, 6 casos) mais
// validacao Nivel C no aparelho.
//
// O que ESTE caso prova, e que so' o browser prova:
//   1. o controle de timeout aparece somente com o toggle ligado;
//   2. alterar o controle persiste em useSettings;
//   3. o app segue navegavel -- ou seja, o bypass do Gauntlet continua
//      de pe' e nenhuma rota trancou por causa da mudanca.
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

interface JanelaGauntlet {
  __gauntlet?: {
    reset: () => void;
    seed: () => void;
  };
  __settingsSnapshot?: {
    biometriaAbrir: boolean;
    biometriaTimeoutSegundos: number;
  };
}

export default async function case_audit_p1_6_biometria_relock(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P1-6';
  const aspecto = 'settings-timeout-biometria';
  const screenshots: string[] = [];

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

    await page.goto('http://localhost:8081/settings');
    await page.waitForTimeout(2500);

    // 1. Com o toggle desligado (default), o controle nao existe.
    const antes = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*')).map(
        (e) => e.textContent ?? ''
      );
      return textos.some((t) => t === 'Pedir de novo depois de');
    });
    if (antes) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'Controle de timeout visivel com o toggle de biometria desligado.',
        screenshots,
      };
    }

    // 2. Liga o toggle -- o controle deve aparecer.
    const clicou = await page.evaluate(() => {
      const alvo = Array.from(document.querySelectorAll('*')).find(
        (e) => e.getAttribute?.('aria-label') === 'toggle biometria abrir'
      ) as HTMLElement | undefined;
      if (!alvo) return false;
      alvo.click();
      return true;
    });
    if (!clicou) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Toggle "biometria abrir" nao encontrado em Settings.',
        screenshots,
      };
    }
    await page.waitForTimeout(600);

    const depois = await page.evaluate(() => {
      const textos = Array.from(document.querySelectorAll('*')).map(
        (e) => e.textContent ?? ''
      );
      return {
        temRotulo: textos.some((t) => t === 'Pedir de novo depois de'),
        temOpcoes: ['30 segundos', '1 minuto', '2 minutos', '5 minutos'].every(
          (o) => textos.some((t) => t === o)
        ),
      };
    });
    if (!depois.temRotulo || !depois.temOpcoes) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Controle incompleto apos ligar o toggle: rotulo=${depois.temRotulo} opcoes=${depois.temOpcoes}`,
        screenshots,
      };
    }

    await page.screenshot({
      path: 'docs/sprints/AUDIT-P1-6-screenshots-gauntlet/settings-timeout.png',
    });
    screenshots.push(
      'docs/sprints/AUDIT-P1-6-screenshots-gauntlet/settings-timeout.png'
    );

    // 3. Trocar a opcao persiste no store.
    const persistiu = await page.evaluate(() => {
      const alvo = Array.from(document.querySelectorAll('*')).find(
        (e) => e.textContent === '5 minutos'
      ) as HTMLElement | undefined;
      if (!alvo) return null;
      alvo.click();
      return true;
    });
    if (!persistiu) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Opcao "5 minutos" nao encontrada.',
        screenshots,
      };
    }
    await page.waitForTimeout(600);

    // Prova de persistencia mais forte que ler o DOM logo apos o clique:
    // recarrega a pagina e confere que a escolha sobreviveu ao reload.
    // O Chip nao emite aria-selected (accessibilityState={{selected}} nao
    // vira atributo para role=button no RN Web), entao a leitura e' pelo
    // estilo computado: selecionado pinta o fundo, nao-selecionado fica
    // transparente (src/components/ui/Chip.tsx).
    await page.goto('http://localhost:8081/settings');
    await page.waitForTimeout(2500);

    const selecionadoAposReload = await page.evaluate(() => {
      const rotulos = ['30 segundos', '1 minuto', '2 minutos', '5 minutos'];
      const preenchidos: string[] = [];
      for (const rotulo of rotulos) {
        const botao = Array.from(document.querySelectorAll('button')).find(
          (b) => b.getAttribute('aria-label') === `chip ${rotulo}`
        );
        // O fundo do chip fica no FILHO do <button>, nao no proprio
        // button -- verificado no DOM do RN Web.
        const interno = botao?.querySelector('*');
        if (!interno) continue;
        const bg = getComputedStyle(interno).backgroundColor;
        const transparente =
          bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)' || bg === '';
        if (!transparente) preenchidos.push(rotulo);
      }
      return preenchidos.join('|');
    });
    if (!selecionadoAposReload.includes('5 minutos')) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `Escolha nao sobreviveu ao reload. Chips preenchidos: "${selecionadoAposReload}" (esperado conter "5 minutos").`,
        screenshots,
      };
    }

    // 4. O app segue navegavel: o bypass do Gauntlet continua de pe'.
    await page.goto('http://localhost:8081/');
    await page.waitForTimeout(2000);
    const homeOk = await page.evaluate(
      () => (document.body.innerText ?? '').trim().length > 30
    );
    if (!homeOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'Home vazia apos ligar biometria -- o gate pode ter trancado o Gauntlet.',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Controle de timeout aparece so com o toggle ligado, persiste a escolha e o app segue navegavel. O relock em si e coberto por Jest + Nivel C.',
      screenshots,
    };
  } catch (e) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `Excecao: ${String(e).slice(0, 200)}`,
      screenshots,
    };
  }
}
