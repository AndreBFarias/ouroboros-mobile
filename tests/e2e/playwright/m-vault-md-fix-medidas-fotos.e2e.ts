// E2E M-VAULT-MD-FIX-medidas-fotos -- valida que a Tela 12 (Novas
// medidas) carrega no Gauntlet com os 3 botoes de foto (frente,
// costas, lado) presentes e acessiveis. O path canonico
// media/fotos/medidas-<data>-<lado>.jpg e validado em testes Jest
// (tests/lib/vault/paths.test.ts); aqui o e2e cobre apenas a
// presenca da UI sem disparar picker (web nao tem expo-image-picker
// real).
//
// Spec: docs/sprints/M-VAULT-MD-FIX-medidas-fotos-spec.md
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

export default async function caseMVaultMdFixMedidasFotos(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-VAULT-MD-FIX-medidas-fotos';
  const aspecto = 'tela-12-fotos-novo-path';
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

    // Navega para a Tela 12 (Novas medidas) via __gauntlet.abrir.
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/medidas/novo');
    });
    await page.waitForTimeout(1500);

    // Confirma que os 3 botoes de foto (frente/costas/lado) estao no DOM.
    const presentes = await page.evaluate(() => {
      const tem = (label: string) =>
        !!document.querySelector(`[aria-label="escolher foto ${label}"]`);
      return {
        frente: tem('frente'),
        costas: tem('costas'),
        lado: tem('lado'),
      };
    });

    const screenshotPath = `docs/sprints/M-VAULT-MD-FIX-medidas-fotos-screenshots-gauntlet/A-tela-12-fotos.png`;
    await page.screenshot({ path: screenshotPath });
    screenshots.push(screenshotPath);

    if (!presentes.frente || !presentes.costas || !presentes.lado) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `botoes ausentes: frente=${presentes.frente} costas=${presentes.costas} lado=${presentes.lado}`,
        screenshots,
      };
    }

    // Confirma que o titulo "Novas medidas" aparece (Header).
    const tituloOk = await page.evaluate(() => {
      // Procura por texto exato em qualquer Text do header.
      const corpo = document.body.innerText ?? '';
      return corpo.includes('Novas medidas') && corpo.includes('Frente') && corpo.includes('Costas') && corpo.includes('Lado');
    });
    if (!tituloOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'titulo "Novas medidas" ou labels Frente/Costas/Lado ausentes no DOM',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Tela 12 carrega com 3 botoes de foto. Path canonico media/fotos/medidas-<data>-<lado>.jpg validado em jest.',
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
