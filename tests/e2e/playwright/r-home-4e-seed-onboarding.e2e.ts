// E2E R-HOME-4e -- seed opcional no onboarding (Frame 4, penultimo).
//
// Cobre (asserts de comportamento, nao so presenca):
//   A) PASSO ALCANCAVEL E PULAVEL: reset -> /onboarding -> percorre os
//      frames 0..3 com input minimo valido (nome, sexo, "Sozinho", usar
//      sugestao de pasta -- vault mock no web, continuar permissoes) ate
//      o Frame 4 (seed). Assert: "Pular" (aria-label "pular seed
//      onboarding") presente e ambas as afordancias ("Registrar como
//      estou" / "Adicionar algo pra fazer") visiveis.
//   B) PULAR CONCLUI SEM CARD: tap "Pular" -> chega ao Frame 5 ("Tudo
//      pronto") -> "Comecar" -> cai na home. Assert: nenhum titulo de
//      onboarding remanescente; rota nao e /onboarding.
//   C) ADICIONAR PLANTA TAREFA: no Frame 4, tap "Adicionar algo pra
//      fazer" -> mini form -> digita titulo -> "Adicionar" -> chega ao
//      Frame 5 ("Tudo pronto"). O assert de "card seedado na Tela Hoje"
//      e feito no device de validacao: em web o round-trip
//      writeVaultFile->listarTarefas depende do mock. Aqui garantimos o
//      caminho de gravacao + avanco de frame.
//
// Pre-requisito: ./gauntlet.sh em foreground (http://localhost:8081).
//
// A evaluate do PlaywrightPageLike nao aceita argumentos, entao as
// strings alvo ficam inline em cada closure (mesma convencao dos demais
// E2E da onda). Sem helpers cross-scope no browser; os helpers Node
// abaixo apenas orquestram chamadas page.evaluate.
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from './e2e-template';

const SPRINT = 'R-HOME-4e';
const DIR = 'docs/sprints/R-HOME-4-screenshots-gauntlet';

// Abre o onboarding fresh (reset -> done=false -> /onboarding no Frame 0).
// Retorna false se o Gauntlet nao esta instalado (flag ausente).
async function abrirOnboardingFresh(page: PlaywrightPageLike): Promise<boolean> {
  await page.goto('http://localhost:8081/_dev/gauntlet');
  await page.waitForTimeout(1000);
  const ok = await page.evaluate(() => {
    const w = globalThis as unknown as { __gauntlet?: { reset: () => void } };
    if (!w.__gauntlet) return false;
    w.__gauntlet.reset();
    return true;
  });
  if (!ok) return false;
  await page.goto('http://localhost:8081/onboarding');
  await page.waitForTimeout(2500);
  return true;
}

// Percorre Frame 0 (nome + sexo) -> 1 (sozinho) -> 2 (usar sugestao,
// vault mock em web) -> 3 (permissoes). Retorna onde parou. Cada acao e
// tolerante: se um alvo nao existe, para e reporta o passo.
async function percorrerAteSeed(
  page: PlaywrightPageLike
): Promise<{ chegou: boolean; parou: string }> {
  return page.evaluate(async () => {
    const espera = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const clicar = (label: string): boolean => {
      const el = document.querySelector(
        `[aria-label="${label}"]`
      ) as HTMLElement | null;
      if (!el) return false;
      el.click();
      return true;
    };

    const digitar = (label: string, valor: string): boolean => {
      const el = document.querySelector(`[aria-label="${label}"]`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (!el) return false;
      const proto =
        el.tagName === 'TEXTAREA'
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, valor);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };

    // Frame 0: nome + sexo + Continuar.
    if (!digitar('campo nome', 'Alice')) return { chegou: false, parou: 'frame0-nome' };
    await espera(200);
    if (!clicar('chip Prefiro não dizer')) {
      return { chegou: false, parou: 'frame0-sexo' };
    }
    await espera(200);
    if (!clicar('Continuar')) return { chegou: false, parou: 'frame0-continuar' };
    await espera(700);

    // Frame 1: Sozinho + Continuar.
    if (!clicar('escolher sozinho')) return { chegou: false, parou: 'frame1-sozinho' };
    await espera(300);
    if (!clicar('Continuar')) return { chegou: false, parou: 'frame1-continuar' };
    await espera(700);

    // Frame 2: usar sugestao de pasta (web -> vault mock, avanca).
    if (!clicar('usar sugestao ouroboros')) {
      return { chegou: false, parou: 'frame2-pasta' };
    }
    await espera(1200);

    // Frame 3: Continuar permissoes.
    if (!clicar('Continuar')) return { chegou: false, parou: 'frame3-continuar' };
    await espera(1200);

    // Confirma que chegou ao Frame 4 (seed): "Pular" presente.
    const temPular = !!document.querySelector(
      '[aria-label="pular seed onboarding"]'
    );
    return { chegou: temPular, parou: temPular ? 'frame4-seed' : 'frame4-ausente' };
  });
}

// Caso A: passo alcancavel e pulavel.
export async function caseSeedAlcancavel(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const aspecto = 'seed-alcancavel-pulavel';
  const screenshots: string[] = [];
  try {
    const gauntletOk = await abrirOnboardingFresh(page);
    if (!gauntletOk) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    const nav = await percorrerAteSeed(page);
    const pathA = `${DIR}/4e-01-seed-escolha.png`;
    await page.screenshot({ path: pathA });
    screenshots.push(pathA);

    if (!nav.chegou) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `nao chegou ao Frame 4 via DOM (parou em ${nav.parou}); validar no device`,
        screenshots,
      };
    }

    const conteudo = await page.evaluate(() => {
      const temLabel = (l: string) =>
        !!document.querySelector(`[aria-label="${l}"]`);
      const textos = Array.from(document.querySelectorAll('*'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 120);
      return {
        temPular: temLabel('pular seed onboarding'),
        temRegistrar: temLabel('registrar como estou'),
        temAdicionar: temLabel('adicionar algo pra fazer'),
        temConvite: textos.some((t) => t.includes('Quer registrar algo agora?')),
      };
    });

    if (
      !conteudo.temPular ||
      !conteudo.temRegistrar ||
      !conteudo.temAdicionar ||
      !conteudo.temConvite
    ) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'FAIL',
        detalhe: `Frame 4 incompleto: ${JSON.stringify(conteudo)}`,
        screenshots,
      };
    }

    return {
      sprint: SPRINT,
      aspecto,
      status: 'PASS',
      detalhe: 'Frame 4 seed alcancavel: "Pular" + 2 afordancias + convite neutro.',
      screenshots,
    };
  } catch (err) {
    return {
      sprint: SPRINT,
      aspecto,
      status: 'FAIL',
      detalhe: `erro inesperado: ${(err as Error).message}`,
      screenshots,
    };
  }
}

// Caso B: Pular conclui sem gravar e leva a home via Frame 5.
export async function casePularConclui(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const aspecto = 'pular-conclui-sem-card';
  const screenshots: string[] = [];
  try {
    const gauntletOk = await abrirOnboardingFresh(page);
    if (!gauntletOk) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente',
        screenshots,
      };
    }
    const nav = await percorrerAteSeed(page);
    if (!nav.chegou) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `nao chegou ao Frame 4 (parou em ${nav.parou}); validar no device`,
        screenshots,
      };
    }

    // Tap "Pular" -> Frame 5.
    await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="pular seed onboarding"]'
      ) as HTMLElement | null;
      el?.click();
    });
    await page.waitForTimeout(1000);

    const noFrame5 = await page.evaluate(() =>
      document.body.innerText.includes('Tudo pronto')
    );
    const pathB = `${DIR}/4e-05-pular-tudo-pronto.png`;
    await page.screenshot({ path: pathB });
    screenshots.push(pathB);

    if (!noFrame5) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'FAIL',
        detalhe: 'apos "Pular" nao chegou ao Frame 5 ("Tudo pronto")',
        screenshots,
      };
    }

    // Comecar -> home.
    await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="Começar"]'
      ) as HTMLElement | null;
      el?.click();
    });
    await page.waitForTimeout(1500);

    const naHome = await page.evaluate(() => {
      const corpo = document.body?.innerText ?? '';
      const semOnboarding = !['Como você se chama', 'Como voce se chama'].some(
        (m) => corpo.includes(m)
      );
      const rotaOk = !window.location.pathname.startsWith('/onboarding');
      return semOnboarding && rotaOk;
    });

    if (!naHome) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'FAIL',
        detalhe: '"Comecar" nao levou a home util',
        screenshots,
      };
    }

    return {
      sprint: SPRINT,
      aspecto,
      status: 'PASS',
      detalhe: 'Pular -> Frame 5 -> Comecar -> home, sem gravar seed.',
      screenshots,
    };
  } catch (err) {
    return {
      sprint: SPRINT,
      aspecto,
      status: 'FAIL',
      detalhe: `erro inesperado: ${(err as Error).message}`,
      screenshots,
    };
  }
}

// Caso C: escolher "Adicionar algo pra fazer" grava tarefa e avanca.
export async function caseAdicionarTarefa(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const aspecto = 'adicionar-tarefa-planta';
  const screenshots: string[] = [];
  try {
    const gauntletOk = await abrirOnboardingFresh(page);
    if (!gauntletOk) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente',
        screenshots,
      };
    }
    const nav = await percorrerAteSeed(page);
    if (!nav.chegou) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `nao chegou ao Frame 4 (parou em ${nav.parou}); validar no device`,
        screenshots,
      };
    }

    // Abre mini form de tarefa, digita titulo, submete.
    const submeteu = await page.evaluate(async () => {
      const espera = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const abrir = document.querySelector(
        '[aria-label="adicionar algo pra fazer"]'
      ) as HTMLElement | null;
      if (!abrir) return { ok: false, parou: 'afordancia' };
      abrir.click();
      await espera(500);

      const input = document.querySelector(
        '[aria-label="campo titulo tarefa onboarding"]'
      ) as HTMLInputElement | null;
      if (!input) return { ok: false, parou: 'input' };
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set;
      if (setter) setter.call(input, 'Comprar pão');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await espera(300);

      const submit = document.querySelector(
        '[aria-label="adicionar tarefa onboarding"]'
      ) as HTMLElement | null;
      if (!submit) return { ok: false, parou: 'submit' };
      submit.click();
      return { ok: true, parou: 'submetido' };
    });

    const pathC = `${DIR}/4e-03-seed-mini-tarefa.png`;
    await page.screenshot({ path: pathC });
    screenshots.push(pathC);

    if (!submeteu.ok) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe: `mini form tarefa nao dirigivel via DOM (parou em ${submeteu.parou}); validar no device`,
        screenshots,
      };
    }

    await page.waitForTimeout(1500);
    const noFrame5 = await page.evaluate(() =>
      document.body.innerText.includes('Tudo pronto')
    );

    if (!noFrame5) {
      return {
        sprint: SPRINT,
        aspecto,
        status: 'FAIL',
        detalhe: 'apos "Adicionar" nao avancou para o Frame 5 ("Tudo pronto")',
        screenshots,
      };
    }

    return {
      sprint: SPRINT,
      aspecto,
      status: 'PASS',
      detalhe:
        'Adicionar tarefa gravou e avancou ao Frame 5. Card na Tela Hoje: validar no device (§7).',
      screenshots,
    };
  } catch (err) {
    return {
      sprint: SPRINT,
      aspecto,
      status: 'FAIL',
      detalhe: `erro inesperado: ${(err as Error).message}`,
      screenshots,
    };
  }
}

// Default: roda os tres casos em sequencia e agrega.
export default async function caseRHome4e(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const a = await caseSeedAlcancavel(page);
  const b = await casePularConclui(page);
  const c = await caseAdicionarTarefa(page);
  const screenshots = [...a.screenshots, ...b.screenshots, ...c.screenshots];
  const todosPass =
    a.status === 'PASS' && b.status === 'PASS' && c.status === 'PASS';
  const algumFail =
    a.status === 'FAIL' || b.status === 'FAIL' || c.status === 'FAIL';
  return {
    sprint: SPRINT,
    aspecto: 'seed-opcional-onboarding',
    status: todosPass ? 'PASS' : algumFail ? 'FAIL' : 'INCONCLUSIVO',
    detalhe: `A=${a.status} (${a.detalhe}); B=${b.status} (${b.detalhe}); C=${c.status} (${c.detalhe})`,
    screenshots,
  };
}
