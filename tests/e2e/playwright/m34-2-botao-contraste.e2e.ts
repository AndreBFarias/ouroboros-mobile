// E2E M34.2 -- contraste WCAG AA do botao "Registrar foto" no empty
// state da aba Fotos da MemoriasScreen. Mede ratio entre cor do texto
// renderizado e cor do background efetivo via getComputedStyle e exige
// >= 4.5:1 (WCAG AA para texto regular).
//
// Bug anterior (M34): o botao usava apenas className NativeWind
// ("bg-purple") em <MotiView>, e o NativeWind interop nao propagava
// para o DOM em RN-Web. Resultado: backgroundColor herdado (transparente
// sobre #14151a) com texto cor #282a36 -> ratio ~1.05:1, invisivel.
// Fix M34.2: aplicar style direto no Button.tsx alem de className.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

// Calcula luminancia relativa WCAG. Aceita string CSS rgb()/rgba()/hex.
function srgbToLin(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function parseRgb(s: string): { r: number; g: number; b: number; a: number } | null {
  // rgb(...) ou rgba(...)
  const m = s.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
    if (parts.length >= 3) {
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length >= 4 ? parts[3] : 1,
      };
    }
  }
  // hex curto
  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 6) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: 1,
      };
    }
  }
  return null;
}

export default async function caseM342Contraste(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M34.2';
  const aspecto = 'botao-contraste';
  const screenshots: string[] = [];

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
        detalhe: 'window.__gauntlet ausente',
        screenshots,
      };
    }

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/saude-fisica');
    });
    await page.waitForTimeout(1500);

    // Trocar para aba Fotos onde mora o empty state.
    const tabClicada = await page.evaluate(() => {
      const t = document.querySelector(
        '[aria-label="tab fotos"]'
      ) as HTMLElement | null;
      if (!t) return false;
      t.click();
      return true;
    });
    if (!tabClicada) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'tab fotos nao encontrada',
        screenshots,
      };
    }
    await page.waitForTimeout(800);

    // Localizar o botao "Registrar foto" via accessibilityLabel/aria.
    // Mede backgroundColor efetivo do botao + color do <Text>.
    const medida = await page.evaluate(() => {
      // RN-Web usa role="button" + aria-label. O Pressable do Button
      // deriva accessibilityLabel do label "Registrar foto".
      const candidatos = Array.from(
        document.querySelectorAll('[role="button"]')
      ) as HTMLElement[];
      const alvo = candidatos.find((b) => {
        const aria = b.getAttribute('aria-label') ?? '';
        const txt = b.textContent ?? '';
        return aria.includes('Registrar foto') || txt.includes('Registrar foto');
      });
      if (!alvo) {
        return { ok: false, motivo: 'botao nao encontrado' };
      }
      // Walk down: a MotiView interna carrega o backgroundColor via style
      // direto (M34.2). O <Text> dentro carrega color.
      let bg = '';
      const filhosComBg = alvo.querySelectorAll('*');
      for (const el of Array.from(filhosComBg)) {
        const cs = getComputedStyle(el as HTMLElement);
        if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          bg = cs.backgroundColor;
          break;
        }
      }
      // Se nao achou no filho, le o do proprio alvo.
      if (!bg) {
        bg = getComputedStyle(alvo).backgroundColor;
      }
      const textoEl = alvo.querySelector('div, span') as HTMLElement | null;
      const textColor = textoEl
        ? getComputedStyle(textoEl).color
        : getComputedStyle(alvo).color;
      const rect = alvo.getBoundingClientRect();
      return {
        ok: true,
        bg,
        textColor,
        width: rect.width,
        height: rect.height,
        ariaLabel: alvo.getAttribute('aria-label'),
      };
    });

    const shotPath =
      'docs/sprints/M34.2-screenshots-gauntlet/A-botao-registrar-foto-contraste.png';
    await page.screenshot({ path: shotPath });
    screenshots.push(shotPath);

    if (!medida.ok) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: medida.motivo ?? 'medicao falhou',
        screenshots,
      };
    }

    const bgRgb = parseRgb(medida.bg ?? '');
    const fgRgb = parseRgb(medida.textColor ?? '');
    if (!bgRgb || !fgRgb) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `cores nao parseadas: bg="${medida.bg}" text="${medida.textColor}"`,
        screenshots,
      };
    }

    const Lbg =
      0.2126 * srgbToLin(bgRgb.r) +
      0.7152 * srgbToLin(bgRgb.g) +
      0.0722 * srgbToLin(bgRgb.b);
    const Lfg =
      0.2126 * srgbToLin(fgRgb.r) +
      0.7152 * srgbToLin(fgRgb.g) +
      0.0722 * srgbToLin(fgRgb.b);
    const lighter = Math.max(Lbg, Lfg);
    const darker = Math.min(Lbg, Lfg);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    if (ratio < 4.5) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          `contraste WCAG AA falhou: ratio ${ratio.toFixed(2)}:1 (< 4.5). ` +
          `bg=${medida.bg} text=${medida.textColor} ` +
          `(WxH=${medida.width}x${medida.height})`,
        screenshots,
      };
    }

    // Sanity check: o botao tem area minima de 44x44 (toque WCAG).
    if ((medida.width ?? 0) < 44 || (medida.height ?? 0) < 44) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          `area de toque insuficiente: ${medida.width}x${medida.height} (< 44x44)`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        `ratio=${ratio.toFixed(2)}:1 (>= 4.5), ` +
        `bg=${medida.bg}, text=${medida.textColor}, ` +
        `area=${medida.width}x${medida.height}`,
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
