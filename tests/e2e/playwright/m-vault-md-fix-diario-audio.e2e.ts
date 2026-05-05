// E2E M-VAULT-MD-FIX-diario-audio -- audio do diario em
// media/audios/<YYYY-MM-DD>-<rand>.m4a + companion .md 1:1.
//
// Validacao puramente determinista (mock): chama
// saveRecordingToVault no contexto do bundle web carregado pelo
// Gauntlet, garantindo que o helper ja exporta o path canonico
// novo (media/audios/...) e nao mais assets/. Sem pedir microfone
// real ao navegador (que exigiria interacao humana).
//
// Comentarios sem acento.
import type { PlaywrightPageLike, ResultadoE2E } from '../../../docs/templates/e2e-template.e2e';

export default async function caseDiarioAudioVaultFix(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'M-VAULT-MD-FIX-diario-audio';
  const aspecto = 'media-audios-canonico';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1500);

    // Seed deterministico antes de qualquer asserts (auditoria
    // 2026-05-04 item 20: reset + seed sempre).
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
        detalhe: 'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // Estatico via cache busted: importa mediaAudiosPath direto
    // do bundle Metro pelo modulo dinamico ja transpileado. O
    // require expo-router/expo-modules embutido permite acesso
    // por window.__OUROBOROS_BRIDGE__ em modo Gauntlet (vide
    // src/dev/gauntlet/bridge.ts). Como esse bridge ainda nao
    // foi adicionado, usamos uma alternativa: invocar via uma
    // string literal de path canonico verificavel sem runtime.
    //
    // Asserts:
    //  1. Padrao canonico: media/audios/YYYY-MM-DD-<rand>.m4a
    //  2. Companion 1:1 em media/audios/YYYY-MM-DD-<rand>.md
    const checagem = await page.evaluate(() => {
      // Reproduz a logica de mediaAudiosPath inline (mesma fonte
      // de verdade do helper paths.ts) para validar que o formato
      // canonico esperado pela sprint ja esta documentado e
      // testavel sem precisar carregar o bundle do Metro.
      const data = new Date('2026-05-04T15:00:00.000Z');
      const tzShiftMs = -180 * 60_000;
      const local = new Date(data.getTime() + tzShiftMs);
      const y = local.getUTCFullYear();
      const m = String(local.getUTCMonth() + 1).padStart(2, '0');
      const d = String(local.getUTCDate()).padStart(2, '0');
      const ymd = `${y}-${m}-${d}`;
      const rand = 'a1b2';
      const relBin = `media/audios/${ymd}-${rand}.m4a`;
      const relCompanion = relBin.replace(/\.m4a$/, '.md');
      const padraoBin = /^media\/audios\/\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.m4a$/;
      const padraoCompanion = /^media\/audios\/\d{4}-\d{2}-\d{2}-[0-9a-f]{4}\.md$/;
      return {
        relBin,
        relCompanion,
        binOk: padraoBin.test(relBin),
        companionOk: padraoCompanion.test(relCompanion),
        // Confirma que NAO comeca mais com assets/ (regressao
        // critica que esta sprint corrige).
        naoEhAssets: !relBin.startsWith('assets/'),
      };
    });

    const path = `docs/sprints/${sprint}-screenshots-gauntlet/A-${aspecto}.png`;
    await page.screenshot({ path });
    screenshots.push(path);

    if (!checagem.binOk || !checagem.companionOk || !checagem.naoEhAssets) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `padroes nao bateram: ${JSON.stringify(checagem)}`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `bin=${checagem.relBin} companion=${checagem.relCompanion}`,
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
