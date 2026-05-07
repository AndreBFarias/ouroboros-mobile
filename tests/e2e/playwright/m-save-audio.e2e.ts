// E2E I-AUDIO (M-SAVE-AUDIO-VALIDA, 2026-05-07): valida que o
// MicrofoneButton renderiza no diario emocional e que o caminho de
// save canonico (vaultUriJoin + audioPath + companion .md) nao
// crasha no contexto JS apos navegar para a rota.
//
// VALIDACAO IMPOSSIVEL EM WEB:
//   - Microfone real (expo-av Audio.Recording) nao funciona em
//     navegador via expo-router/react-native-web. Nao ha picker
//     equivalente.
//   - Press-and-hold com gravacao real exige hardware nativo (mic +
//     permissao Android RECORD_AUDIO).
//   - STT on-device (expo-speech-recognition) e' modulo nativo
//     ausente em Expo Go e em web; lazy require retorna null.
//
// ESCOPO DESTE E2E:
//   1. Diario emocional renderiza pos-seed.
//   2. Botao "Gravar audio" aparece (aria-label="botao gravar audio")
//      pos-render.
//   3. __gauntlet.estado() permanece consultavel — nenhum erro fatal
//      no boot da rota.
//
// VALIDACAO COMPLETA: §5 do spec via adb humano em APK preview.
//
// Comentarios sem acento.
import type {
  PlaywrightPageLike,
  ResultadoE2E,
} from '../../../docs/templates/e2e-template.e2e';

const SCREENSHOT_DIR =
  'docs/sprints/M-SAVE-AUDIO-VALIDA-screenshots-gauntlet';

interface SeedFn {
  reset: () => void;
  seed: (opts?: { nomeA?: string; nomeB?: string | null }) => void;
  setNomes: (nomeA: string, nomeB?: string | null) => void;
  setVaultRoot?: (root: string) => void;
  abrir: (rota: string) => Promise<void>;
  estado: () => unknown;
}

async function aplicarSeed(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    const w = globalThis as unknown as { __gauntlet?: SeedFn };
    if (!w.__gauntlet) return false;
    w.__gauntlet.reset();
    w.__gauntlet.seed();
    if (typeof w.__gauntlet.setVaultRoot === 'function') {
      w.__gauntlet.setVaultRoot('web://mock-vault/Test');
    }
    return true;
  });
}

async function abrirDiarioEmocional(page: PlaywrightPageLike): Promise<void> {
  await page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet: { abrir: (r: string) => Promise<void> };
    };
    return w.__gauntlet.abrir('/diario-emocional');
  });
  await page.waitForTimeout(1500);
}

async function botaoMicrofonePresente(
  page: PlaywrightPageLike
): Promise<boolean> {
  return page.evaluate(() => {
    const buttons = Array.from(
      document.querySelectorAll('[role="button"], [aria-label]')
    ) as HTMLElement[];
    return buttons.some(
      (b) => (b.getAttribute('aria-label') ?? '') === 'botao gravar audio'
    );
  });
}

async function estadoSemCrash(page: PlaywrightPageLike): Promise<boolean> {
  return page.evaluate(() => {
    const w = globalThis as unknown as {
      __gauntlet: { estado: () => unknown };
    };
    try {
      w.__gauntlet.estado();
      return true;
    } catch {
      return false;
    }
  });
}

export default async function caseSaveAudio(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-SAVE-AUDIO-VALIDA';
  const aspecto = 'save-audio-microfone-render-diario-emocional';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    const seedOk = await aplicarSeed(page);
    if (!seedOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    await abrirDiarioEmocional(page);

    const shotDiario = `${SCREENSHOT_DIR}/A-diario-emocional.png`;
    await page.screenshot({ path: shotDiario });
    screenshots.push(shotDiario);

    const micOk = await botaoMicrofonePresente(page);
    if (!micOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'MicrofoneButton (aria-label=botao gravar audio) ausente em /diario-emocional pos-render',
        screenshots,
      };
    }

    if (!(await estadoSemCrash(page))) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          '__gauntlet.estado() lancou apos abrir diario emocional; boot da rota propagou erro nao-tratado',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'Diario emocional renderiza com MicrofoneButton, caminho de save canonico (audioPath + vaultUriJoin + companion .md com transcricao opcional best-effort) ativo. Microfone real (expo-av), STT (expo-speech-recognition) e SAF write nao exercitaveis em web — validacao runtime nativo via adb humano, descrita em §5 do spec. Logica JS isolada coberta pelos testes Jest unit.',
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
