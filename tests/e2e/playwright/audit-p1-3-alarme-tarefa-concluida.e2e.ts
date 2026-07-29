// E2E AUDIT-P1-3: concluir uma tarefa desmonta o alarme companion.
//
// Cenario de falha que originou a sprint: pessoa_a cria "Tomar remedio"
// com alarme para as 08:00; as 07:00 marca a tarefa como concluida; as
// 08:00 a notificacao toca assim mesmo. Em recorrencia diaria o
// schedule sobrevivia indefinidamente porque reagendarAlarmes (boot
// hook) so filtra por `alarme.ativo` do companion no Vault.
//
// O assert forte deste caso e o ESTADO DO COMPANION NO VAULT MOCK, nao
// a presenca do check na UI: em web, cancelarAlarme e no-op (nao existe
// expo-notifications no DOM), entao a unica evidencia observavel do fix
// e o companion .md passar de `ativo: true` para `ativo: false`.
//
// Passos:
//   1. reset + seed (vaultRoot web://mock-vault/Ouroboros).
//   2. criarTarefaMock com alarme ativo -> criarTarefa escreve a tarefa
//      e o companion alarme-<slug>-alarme-<deviceId>.md.
//   3. Le o companion no vault mock: precisa nascer `ativo: true`.
//   4. Abre /todo e CLICA na linha da tarefa (caminho real do usuario:
//      ItemTarefa -> handleTap -> marcarFeito).
//   5. Le o companion de novo: precisa estar `ativo: false`.
//   6. Le a tarefa: `feito: true` e `slug_vinculado` preservado (a
//      premissa da decisao S2 - reabrir nao re-agenda, re-ativar exige
//      edicao explicita do alarme).
//
// Comentarios sem acento (convencao shell/CI).
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

const TITULO = 'Tomar remédio';
const DIR_SHOTS =
  'docs/sprints/AUDIT-P1-3-ALARME-TAREFA-CONCLUIDA-screenshots-gauntlet';

interface GauntletMinimo {
  reset: () => void;
  seed: () => void;
  setVaultRoot?: (root: string) => void;
  abrir: (rota: string) => Promise<void>;
  criarTarefaMock: (meta?: Record<string, unknown>) => Promise<{
    rel: string;
  } | null>;
  listarVaultMock: () => string[];
  lerVaultMock: (uri: string) => string | null;
}

export default async function caseAlarmeTarefaConcluida(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P1-3-ALARME-TAREFA-CONCLUIDA';
  const aspecto = 'concluir-tarefa-desativa-companion';
  const screenshots: string[] = [];

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    const seedOk = await page.evaluate(() => {
      const w = globalThis as unknown as { __gauntlet?: GauntletMinimo };
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
        detalhe:
          'window.__gauntlet ausente; flag EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }

    // 2. Tarefa com alarme companion ativo para hoje as 08:00. O rel
    //    fica em globalThis porque o harness (PlaywrightPageLike) so
    //    aceita evaluate sem argumentos.
    const criada = await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: GauntletMinimo;
        __auditP13Rel?: string;
      };
      const hoje = new Date().toISOString().slice(0, 10);
      const out = await w.__gauntlet.criarTarefaMock({
        titulo: 'Tomar remédio',
        data: hoje,
        alarme: {
          ativo: true,
          data_hora_iso: `${hoje}T08:00:00-03:00`,
          recorrencia: 'diaria',
        },
      });
      if (out) w.__auditP13Rel = out.rel;
      return out;
    });
    if (!criada) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'criarTarefaMock devolveu null (vaultRoot ausente?)',
        screenshots,
      };
    }

    // 3. Companion nasce ativo. Path canonico:
    //    markdown/alarme-<slug-tarefa>-alarme-<deviceId>.md. O slug sai
    //    do rel devolvido por criarTarefaMock (markdown/tarefa-<slug>-
    //    <deviceId>.md) para o assert mirar ESTE companion, nao "algum".
    const companionAntes = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: GauntletMinimo;
        __auditP13Rel: string;
      };
      const slug = w.__auditP13Rel
        .replace(/^markdown\/tarefa-/, '')
        .replace(/-ouro-[a-z0-9]{6}\.md$/, '')
        .replace(/\.md$/, '');
      const uri = w.__gauntlet
        .listarVaultMock()
        .find((u) => u.includes(`/markdown/alarme-${slug}-alarme`));
      if (!uri) return null;
      return { uri, raw: w.__gauntlet.lerVaultMock(uri) };
    });
    if (!companionAntes || !companionAntes.raw) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'companion alarme-<slug>-alarme.md nao foi criado no vault mock',
        screenshots,
      };
    }
    if (!/^ativo: true$/m.test(companionAntes.raw)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `companion nasceu sem "ativo: true"; conteudo: ${companionAntes.raw.slice(0, 200)}`,
        screenshots,
      };
    }

    // 4. Caminho real do usuario: /todo -> tap na linha da tarefa.
    await page.evaluate(async () => {
      const w = globalThis as unknown as { __gauntlet: GauntletMinimo };
      await w.__gauntlet.abrir('/todo');
    });
    await page.waitForTimeout(1500);

    const antesShot = `${DIR_SHOTS}/A-tarefa-pendente-com-alarme.png`;
    await page.screenshot({ path: antesShot });
    screenshots.push(antesShot);

    const tapOk = await page.evaluate(() => {
      const linha = document.querySelector(
        '[aria-label="tarefa Tomar remédio pendente"]'
      ) as HTMLElement | null;
      if (!linha) return false;
      linha.click();
      return true;
    });
    if (!tapOk) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `linha "[aria-label=tarefa ${TITULO} pendente]" ausente em /todo`,
        screenshots,
      };
    }
    // marcarFeito -> escreverTarefa -> desativarAlarmeCompanion.
    await page.waitForTimeout(1500);

    const depoisShot = `${DIR_SHOTS}/B-tarefa-concluida-companion-off.png`;
    await page.screenshot({ path: depoisShot });
    screenshots.push(depoisShot);

    // 5 + 6. Estado final no Vault mock: companion desativado, tarefa
    // feita, slug_vinculado preservado.
    const final = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: GauntletMinimo;
        __auditP13Rel: string;
      };
      const rel = w.__auditP13Rel;
      const slug = rel
        .replace(/^markdown\/tarefa-/, '')
        .replace(/-ouro-[a-z0-9]{6}\.md$/, '')
        .replace(/\.md$/, '');
      const uris = w.__gauntlet.listarVaultMock();
      const uriAlarme = uris.find((u) =>
        u.includes(`/markdown/alarme-${slug}-alarme`)
      );
      const uriTarefa = uris.find((u) => u.endsWith(rel));
      return {
        alarme: uriAlarme ? w.__gauntlet.lerVaultMock(uriAlarme) : null,
        tarefa: uriTarefa ? w.__gauntlet.lerVaultMock(uriTarefa) : null,
      };
    });

    if (!final.alarme || !/^ativo: false$/m.test(final.alarme)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `companion continua ativo apos concluir (bug AUDIT-P1-3); conteudo: ${String(final.alarme).slice(0, 200)}`,
        screenshots,
      };
    }
    if (!final.tarefa || !/^feito: true$/m.test(final.tarefa)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'tarefa nao ficou feito: true apos o tap',
        screenshots,
      };
    }
    if (!/slug_vinculado:/.test(final.tarefa)) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe:
          'slug_vinculado sumiu do bloco alarme da tarefa (quebra premissa S2)',
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe:
        'companion nasce ativo: true; tap na tarefa em /todo grava feito: true e vira ativo: false no companion; slug_vinculado preservado',
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
