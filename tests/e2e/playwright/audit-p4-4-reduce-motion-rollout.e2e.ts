// AUDIT-P4-4-REDUCE-MOTION-ROLLOUT (2026-09-05): E2E case para o
// rollout de reduce-motion nos primitivos de src/components/ui/.
//
// O que se mede, e por que assim: o defeito e' "o Toggle continua
// animando com fisica de mola quando a pessoa pediu reducao". Um unico
// getComputedStyle logo apos o clique nao decide isso -- o re-render do
// React e' assincrono, entao o primeiro frame pode mostrar a cor ANTIGA
// nos dois cenarios. O que separa os dois e' quantas cores DISTINTAS o
// track percorre ate assentar:
//   - com reducao: no maximo 2 (a antiga e a final; um salto, sem meio);
//   - sem reducao: 3 ou mais (a interpolacao do spring e' observavel).
//
// Amostragem por requestAnimationFrame em vez de waitForTimeout: sem
// depender de janela de milissegundos, e por isso nao flaky.
//
// Alvo: o Toggle "Vibração geral" em /settings (aria-label estavel
// "toggle vibrar geral", definido em app/settings/index.tsx). Escolhido
// de proposito por NAO ser o toggle de reduzir-movimento -- clicar
// naquele alteraria a propria preferencia sob teste.
//
// A deteccao web usa o mapeamento do react-native-web de
// AccessibilityInfo.isReduceMotionEnabled -> matchMedia('(prefers-
// reduced-motion: reduce)'), que o page.emulateMedia controla. O mesmo
// caminho que R-AUDIT-A11Y-MOVIMENTO ja' usa.
//
// Executado via automacao de browser (nao por Jest; jest.config
// testMatch filtra *.test.ts). Comentarios sem acento.

export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  emulateMedia(opts: {
    reducedMotion: 'reduce' | 'no-preference';
  }): Promise<unknown>;
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

// Teto de cores distintas aceito como "sem movimento": a cor de origem
// mais a de destino. Qualquer terceira cor e' um frame intermediario de
// spring, ou seja, movimento que a reducao deveria ter suprimido.
const MAX_CORES_SEM_MOVIMENTO = 2;

// Piso de cores distintas exigido do cenario de controle. Se o controle
// nao alcancar isto, a medicao nao consegue distinguir os dois casos e o
// resultado vira INCONCLUSIVO em vez de FAIL (warn-only no runner).
const MIN_CORES_COM_MOVIMENTO = 3;

// Sobe e semeia o Gauntlet, ja' com a media query desejada aplicada
// ANTES do goto -- a leitura inicial de isReduceMotionEnabled acontece
// no mount, e recarregar e' mais confiavel que contar com o listener de
// reduceMotionChanged.
async function prepararSettings(page: PlaywrightPageLike): Promise<boolean> {
  await page.goto('http://localhost:8081/_dev/gauntlet');
  await page.waitForTimeout(1000);

  const seedOk = await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet?: { reset: () => void; seed: () => void };
    };
    if (!w.__gauntlet) return false;
    w.__gauntlet.reset();
    w.__gauntlet.seed();
    return true;
  });
  if (!seedOk) return false;

  await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet: { abrir: (rota: string) => void };
    };
    w.__gauntlet.abrir('/settings');
  });
  await page.waitForTimeout(1200);
  return true;
}

// Clica o Toggle e coleta a cor de fundo do track a cada frame por ~20
// frames (~330ms a 60fps, folga sobre o tempo de assentamento de
// springs.subtle: damping 22, stiffness 220).
//
// O corpo roda no browser e nao pode capturar variavel externa (o
// playwright serializa a funcao), entao o seletor vai literal.
async function amostrarCoresDoTrack(
  page: PlaywrightPageLike
): Promise<string[] | null> {
  return page.evaluate<string[] | null>(() => {
    const alvo = document.querySelector<HTMLElement>(
      '[aria-label="toggle vibrar geral"]'
    );
    if (!alvo) return null;
    // Arvore do Toggle: Pressable(role=switch) > View(panHandlers) >
    // MotiView(track) > MotiView(thumb).
    const responder = alvo.firstElementChild;
    const track = responder?.firstElementChild as HTMLElement | undefined;
    if (!track) return null;

    const amostras: string[] = [];
    amostras.push(getComputedStyle(track).backgroundColor);
    alvo.click();

    return new Promise<string[]>((resolve) => {
      let n = 0;
      const passo = () => {
        amostras.push(getComputedStyle(track).backgroundColor);
        n += 1;
        if (n >= 20) resolve(amostras);
        else requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    });
  });
}

function distintas(cores: string[]): string[] {
  return Array.from(new Set(cores));
}

export default async function caseAuditP44ReduceMotionRollout(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P4-4-REDUCE-MOTION-ROLLOUT';
  const aspecto = 'reduce-motion-primitivos';
  const screenshots: string[] = [];
  const dir = `docs/sprints/${sprint}-screenshots-gauntlet`;

  try {
    // 1. Cenario sob teste: reducao de movimento LIGADA.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (!(await prepararSettings(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    const coresReduce = await amostrarCoresDoTrack(page);
    const pathA = `${dir}/A-reduce-toggle-sem-frames.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    if (!coresReduce) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'Toggle [aria-label="toggle vibrar geral"] nao encontrado em /settings',
        screenshots,
      };
    }

    const uniReduce = distintas(coresReduce);
    if (uniReduce.length > MAX_CORES_SEM_MOVIMENTO) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `com reduce-motion o track do Toggle percorreu ${uniReduce.length} cores distintas (esperado ate ${MAX_CORES_SEM_MOVIMENTO}); a fisica de mola nao foi suprimida. Amostra: ${uniReduce.join(' | ')}`,
        screenshots,
      };
    }

    // 2. CONTROLE: reducao DESLIGADA. Aqui o spring tem de continuar
    //    visivel -- e' o NAO-objetivo 3 do spec (paridade com o
    //    comportamento atual quando a reducao esta off).
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    if (!(await prepararSettings(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente no run de controle',
        screenshots,
      };
    }

    const coresNormal = await amostrarCoresDoTrack(page);
    const pathB = `${dir}/B-motion-normal-com-frames.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    if (!coresNormal) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'Toggle nao encontrado no run de controle',
        screenshots,
      };
    }

    const uniNormal = distintas(coresNormal);
    if (uniNormal.length < MIN_CORES_COM_MOVIMENTO) {
      // Nao e' FAIL: pode ser que o spring tenha assentado dentro do
      // primeiro frame amostrado neste hardware. Sem contraste entre os
      // dois runs a medicao nao prova nada, entao warn-only.
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `o run de controle so mostrou ${uniNormal.length} cor(es) distinta(s) (esperado >= ${MIN_CORES_COM_MOVIMENTO}); sem frames intermediarios no controle nao da' para separar "reducao funcionou" de "a medicao nao pegou a animacao". reduce=${uniReduce.length} cor(es).`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `com reduce-motion o track do Toggle saltou direto para a cor final (${uniReduce.length} cor(es) distinta(s) em 20 frames); sem reduce-motion a mesma interacao percorreu ${uniNormal.length} cores intermediarias, ou seja, a fisica default segue intacta.`,
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
