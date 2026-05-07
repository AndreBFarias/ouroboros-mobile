// E2E M-WCAG-COMPLETO -- auditoria runtime de contraste WCAG AA em
// rotas chave (/memoria, /humor, /eventos, /todo, /financas).
//
// Para cada rota, percorre todo elemento <Text> visivel com fontSize
// efetivo < 18 (texto normal WCAG) e mede a razao entre `color` e o
// `backgroundColor` cumulativo do ancestral mais proximo opaco.
// Falha se qualquer ratio < 4.5 e o texto nao estiver marcado com
// `data-a11y="decor"` (override explicito de uso decorativo).
//
// Espelha a formula de tests/e2e/playwright/m34-2-botao-contraste.e2e.ts
// e tambem do helper src/lib/a11y/contraste.ts.
//
// Como rodar (orquestrador):
//   1. ./gauntlet.sh
//   2. Carregar tools playwright via ToolSearch.
//   3. Executar este caso via browser_evaluate.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

interface Violacao {
  rota: string;
  tag: string;
  texto: string;
  color: string;
  bg: string;
  ratio: number;
  fontSize: number;
}

const ROTAS = ['/saude-fisica', '/humor', '/eventos', '/todo', '/financas'];

export default async function caseWcagAudit(
  page: PlaywrightPageLike,
): Promise<ResultadoE2E> {
  const sprint = 'M-WCAG-COMPLETO';
  const aspecto = 'auditoria-contraste-runtime';
  const screenshots: string[] = [];

  try {
    // 1. Bootstrap Gauntlet + seed.
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
        detalhe: 'window.__gauntlet ausente. Confirme EXPO_PUBLIC_GAUNTLET=1.',
        screenshots,
      };
    }

    const todasViolacoes: Violacao[] = [];

    // 2. Para cada rota, navega e mede contraste de todo texto normal.
    // O orquestrador deve serializar a string da rota dentro do loop;
    // como evaluate nao aceita args na tipagem PlaywrightPageLike
    // minima, usamos goto direto (passa pelos gates pos-seed).
    for (const rota of ROTAS) {
      await page.goto(`http://localhost:8081${rota}`);
      await page.waitForTimeout(1500);

      const violacoesRota = await page.evaluate(() => {
        function srgbToLin(c: number): number {
          const x = c / 255;
          return x <= 0.03928
            ? x / 12.92
            : Math.pow((x + 0.055) / 1.055, 2.4);
        }
        function parseRgb(
          s: string,
        ): { r: number; g: number; b: number; a: number } | null {
          const m = s.match(/rgba?\(([^)]+)\)/i);
          if (m) {
            const partes = m[1].split(',').map((p) => parseFloat(p.trim()));
            if (partes.length >= 3) {
              return {
                r: partes[0],
                g: partes[1],
                b: partes[2],
                a: partes.length >= 4 ? partes[3] : 1,
              };
            }
          }
          return null;
        }
        function ratio(fg: string, bg: string): number | null {
          const f = parseRgb(fg);
          const b = parseRgb(bg);
          if (!f || !b) return null;
          const Lf =
            0.2126 * srgbToLin(f.r) +
            0.7152 * srgbToLin(f.g) +
            0.0722 * srgbToLin(f.b);
          const Lb =
            0.2126 * srgbToLin(b.r) +
            0.7152 * srgbToLin(b.g) +
            0.0722 * srgbToLin(b.b);
          const claro = Math.max(Lf, Lb);
          const escuro = Math.min(Lf, Lb);
          return (claro + 0.05) / (escuro + 0.05);
        }
        // Sobe a arvore ate achar background opaco.
        function bgOpaco(el: HTMLElement): string {
          let cur: HTMLElement | null = el;
          while (cur) {
            const bg = getComputedStyle(cur).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              return bg;
            }
            cur = cur.parentElement;
          }
          // Fallback para body (Dracula bgPage).
          return getComputedStyle(document.body).backgroundColor || '#14151a';
        }
        const out: Array<{
          tag: string;
          texto: string;
          color: string;
          bg: string;
          ratio: number;
          fontSize: number;
        }> = [];
        const todos = Array.from(
          document.querySelectorAll('*'),
        ) as HTMLElement[];
        todos.forEach((el) => {
          const txt = (el.textContent ?? '').trim();
          if (!txt || txt.length > 200) return;
          // Apenas elementos que contem texto direto, nao aninhado.
          const filhosTexto = Array.from(el.childNodes).some(
            (n) => n.nodeType === 3 && (n.textContent ?? '').trim(),
          );
          if (!filhosTexto) return;
          // Override decorativo via atributo (opt-in explicito do
          // componente que sabe que e rotulo decorativo).
          if (el.getAttribute('data-a11y') === 'decor') return;
          const cs = getComputedStyle(el);
          const fontSize = parseFloat(cs.fontSize);
          // Texto normal WCAG: < 18px.
          if (!Number.isFinite(fontSize) || fontSize >= 18) return;
          const color = cs.color;
          const bg = bgOpaco(el);
          const r = ratio(color, bg);
          if (r === null) return;
          if (r < 4.5) {
            out.push({
              tag: el.tagName.toLowerCase(),
              texto: txt.slice(0, 60),
              color,
              bg,
              ratio: Number(r.toFixed(2)),
              fontSize,
            });
          }
        });
        return out;
      });

      violacoesRota.forEach((v) => {
        todasViolacoes.push({ rota, ...v });
      });

      const shotPath = `docs/sprints/M-WCAG-COMPLETO-screenshots-gauntlet/${rota.replace('/', '')}-contraste.png`;
      try {
        await page.screenshot({ path: shotPath });
        screenshots.push(shotPath);
      } catch {
        // diretorio pode nao existir; orquestrador cria sob demanda.
      }
    }

    if (todasViolacoes.length > 0) {
      const resumo = todasViolacoes
        .slice(0, 10)
        .map(
          (v) =>
            `[${v.rota}] ${v.tag} "${v.texto}" -> ratio=${v.ratio} fs=${v.fontSize} fg=${v.color} bg=${v.bg}`,
        )
        .join(' | ');
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `${todasViolacoes.length} violacoes WCAG AA texto normal. Primeiras: ${resumo}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `Auditoria limpa em ${ROTAS.length} rotas. Zero violacoes de contraste em texto normal.`,
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
