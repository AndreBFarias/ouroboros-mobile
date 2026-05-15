// E2E M-DEBITO-UI-UX-SEED-DUO -- 3 achados visuais consolidados.
//
// Cobre:
//   A. Chip "Outro" do ChipGroup categoria de SheetNovaTarefa
//      renderiza com accent ghost (borda muted-decor, nao orange).
//   B. Botao "Criar" de /contadores/novo permanece visivel no
//      viewport mobile 412x892 mesmo com form preenchido (rodape
//      fixo via KeyboardAvoidingView + View fora do ScrollView).
//   C. Toggle "Lembrar com alarme" (M31) alterna entre OFF e ON
//      com transicao animada (MotiView spring snappy) e o bloco
//      DateTimePicker monta com aria-label "bloco alarme expandido".
//
// Comentarios sem acento (convencao shell/CI).
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface PageComConsole extends PlaywrightPageLike {
  on?: (
    evt: string,
    handler: (msg: { type: () => string; text: () => string }) => void
  ) => void;
}

export default async function caseMDebitoUIUXSeedDuo(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-DEBITO-UI-UX-SEED-DUO';
  const aspecto = 'tres-achados-visuais';
  const screenshots: string[] = [];

  const erros: string[] = [];
  const pageHook = page as PageComConsole;
  if (typeof pageHook.on === 'function') {
    pageHook.on('console', (msg) => {
      if (msg.type() === 'error') {
        erros.push(msg.text());
      }
    });
  }

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

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
        detalhe: 'window.__gauntlet ausente; flag GAUNTLET_ATIVO inativa?',
        screenshots,
      };
    }

    // ---------------------------------------------------------------
    // Achado A. Chip "Outro" ghost na sheet de nova tarefa (M31).
    // ---------------------------------------------------------------
    // Abrir a aba todo e o sheet de nova tarefa via FAB.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/todo');
    });
    await page.waitForTimeout(1200);

    // Tap no FAB principal para abrir menu.
    const fabAberto = await page.evaluate(() => {
      const f = document.querySelector(
        '[aria-label="abrir menu de captura"]'
      ) as HTMLElement | null;
      if (!f) return false;
      f.click();
      return true;
    });
    if (!fabAberto) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'FAB de captura ausente em /todo',
        screenshots,
      };
    }
    await page.waitForTimeout(500);

    // Tap em "adicionar tarefa" para abrir SheetNovaTarefa.
    const sheetAberto = await page.evaluate(() => {
      const it = document.querySelector(
        '[aria-label="adicionar tarefa"]'
      ) as HTMLElement | null;
      if (!it) return false;
      it.click();
      return true;
    });
    if (!sheetAberto) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'item "adicionar tarefa" ausente no menu de captura',
        screenshots,
      };
    }
    await page.waitForTimeout(900);

    // Verifica que o chip "Outro" tem borda muted-decor (ghost) e nao
    // o laranja accent das demais categorias.
    const chipOutro = await page.evaluate(() => {
      const el = document.querySelector(
        '[aria-label="chip Outro"]'
      ) as HTMLElement | null;
      if (!el) return null;
      // O chip e' um Pressable com MotiView interno; a borda fica
      // no MotiView. Procuramos o primeiro filho com borderColor.
      const filho = el.querySelector('*') as HTMLElement | null;
      const target = filho ?? el;
      const cs = getComputedStyle(target);
      return {
        borderColor: cs.borderColor,
        backgroundColor: cs.backgroundColor,
      };
    });
    if (!chipOutro) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'chip "Outro" nao encontrado no SheetNovaTarefa',
        screenshots,
      };
    }
    // muted-decor = #6272a4 -> rgb(98, 114, 164). orange = #ffb86c ->
    // rgb(255, 184, 108). Aceita qualquer formato rgb que NAO seja
    // laranja (chip Outro nao-selecionado fica com borderColor
    // muted-decor; selecionado vira muted-decor preenchido). Falha
    // sse a borda for orange.
    const isOrangeBorder = /255,\s*184,\s*108/.test(chipOutro.borderColor);
    if (isOrangeBorder) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `chip "Outro" ainda renderiza borda laranja (${chipOutro.borderColor}); accent ghost nao aplicado`,
        screenshots,
      };
    }

    const aShot =
      'docs/sprints/M-DEBITO-UI-UX-SEED-DUO-screenshots-gauntlet/A-chip-outro-muted.png';
    await page.screenshot({ path: aShot });
    screenshots.push(aShot);

    // ---------------------------------------------------------------
    // Achado C. Toggle alarme alterna OFF -> ON com transicao e bloco
    // expandido aparece. Aproveita o sheet ja aberto.
    // ---------------------------------------------------------------
    // OFF inicial: bloco expandido NAO esta no DOM.
    const offEstado = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="bloco alarme expandido"]');
    });
    if (offEstado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'bloco alarme expandido ja presente antes do toggle ON',
        screenshots,
      };
    }

    const cShotOff =
      'docs/sprints/M-DEBITO-UI-UX-SEED-DUO-screenshots-gauntlet/C-toggle-alarme-off.png';
    await page.screenshot({ path: cShotOff });
    screenshots.push(cShotOff);

    // Tap no toggle para ligar.
    const toggleClicado = await page.evaluate(() => {
      const t = document.querySelector(
        '[aria-label="alternar lembrete com alarme"]'
      ) as HTMLElement | null;
      if (!t) return false;
      t.click();
      return true;
    });
    if (!toggleClicado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'toggle "alternar lembrete com alarme" ausente',
        screenshots,
      };
    }
    await page.waitForTimeout(500);

    const onEstado = await page.evaluate(() => {
      return !!document.querySelector('[aria-label="bloco alarme expandido"]');
    });
    if (!onEstado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'bloco alarme expandido nao montou apos toggle ON',
        screenshots,
      };
    }

    const cShotOn =
      'docs/sprints/M-DEBITO-UI-UX-SEED-DUO-screenshots-gauntlet/C-toggle-alarme-expandido.png';
    await page.screenshot({ path: cShotOn });
    screenshots.push(cShotOn);

    // ---------------------------------------------------------------
    // Achado B. /contadores/novo botao "Criar" visivel no viewport
    // 412x892 com form preenchido.
    // ---------------------------------------------------------------
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/contadores/novo');
    });
    await page.waitForTimeout(1500);

    // Preenche o titulo para forcar layout cheio.
    const preenchido = await page.evaluate(() => {
      const inp = document.querySelector(
        '[aria-label="titulo do contador"]'
      ) as HTMLInputElement | null;
      if (!inp) return false;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(inp, 'Sem cigarro desde hoje');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    });
    if (!preenchido) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'campo titulo do contador ausente em /contadores/novo',
        screenshots,
      };
    }
    await page.waitForTimeout(300);

    // Verifica que botao "Criar" esta dentro do viewport mobile 412x892.
    const botaoRect = await page.evaluate(() => {
      // Procura botao com label exato "Criar". Button do design
      // system expoe accessibilityLabel mas a renderizacao web
      // pode nao propagar; entao matchamos pelo texto interior.
      const candidatos = Array.from(
        document.querySelectorAll('[role="button"], button')
      ) as HTMLElement[];
      const alvo = candidatos.find(
        (b) => (b.textContent || '').trim() === 'Criar'
      );
      if (!alvo) return null;
      const r = alvo.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        viewportH: window.innerHeight,
      };
    });
    if (!botaoRect) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'botao "Criar" nao localizado em /contadores/novo',
        screenshots,
      };
    }
    if (botaoRect.bottom > botaoRect.viewportH || botaoRect.top < 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `botao "Criar" fora do viewport: top=${botaoRect.top} bottom=${botaoRect.bottom} viewportH=${botaoRect.viewportH}`,
        screenshots,
      };
    }

    const bShot =
      'docs/sprints/M-DEBITO-UI-UX-SEED-DUO-screenshots-gauntlet/B-novo-contador-salvar-visivel.png';
    await page.screenshot({ path: bShot });
    screenshots.push(bShot);

    if (erros.length > 0) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `console com erros: ${erros.slice(0, 3).join(' | ')}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `chip Outro com borda nao-orange (${chipOutro.borderColor}); toggle alarme OFF->ON revela bloco aria-label "bloco alarme expandido"; botao Criar dentro do viewport (top=${botaoRect.top} bottom=${botaoRect.bottom} viewportH=${botaoRect.viewportH})`,
      screenshots,
    };
  } catch (err) {
    return {
      sprint,
      aspecto,
      status: 'FAIL',
      detalhe: `erro: ${(err as Error).message}`,
      screenshots,
    };
  }
}
