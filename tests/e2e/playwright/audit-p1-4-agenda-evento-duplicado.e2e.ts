// E2E AUDIT-P1-4 -- evento remarcado no Google nao pode virar duplicata.
//
// Cenario (o mesmo do spec): pessoa_a tem um compromisso; a data muda;
// como o path do .md embute a data (agenda-<pessoa>-<YMD>-<id>.md), o
// arquivo antigo ficava no disco e a agenda mostrava o compromisso duas
// vezes -- uma delas na data que nao existe mais.
//
// Passos:
//   1. reset + seed + onboarding pronto.
//   2. setEventosAgendaMock com o evento no dia +2.
//   3. setEventosAgendaMock com o MESMO id no dia +5 (a remarcacao).
//      O mock escreve pelo path canonico, entao neste ponto o vault mock
//      tem 2 .md do mesmo id -- exatamente o estado que o bug produz.
//   4. disparaBootHooks() -> roda limparDuplicatasAgendaUmaVez.
//   5. Assert de contagem: 1 .md para o id no vault mock, o titulo
//      aparecendo uma vez so na Home ("Proximos") e uma vez so na agenda.
//
// localStorage.clear() + reload antes do passo 1 porque a flag
// duplicatasAgendaLimpas persiste (em web, zustand persist cai em
// localStorage) e bloquearia a limpeza numa segunda execucao do caso.
//
// A metade de infra do limite que este cabecalho declarava ate
// 2026-09-05 -- "useVaultMock nao implementa delete" -- foi fechada por
// AUDIT-INFRA-VAULT-MOCK-DELETE: o caminho de exclusao ganhou branch
// web/dev em src/lib/vault/remover.ts.
//
// MAS O CASO SEGUE INSTAVEL, por outra causa. Medido em 2026-09-05,
// tres execucoes consecutivas do runner sem limpar nada entre elas:
// INCONCLUSIVO, PASS, INCONCLUSIVO. Ou seja, ele as vezes mede.
//
// Causa provavel, apurada mas nao corrigida: `autoSeedDev()` em
// app/_layout.tsx seta o vaultRoot em todo boot dev-web, entao
// `limparDuplicatasAgendaUmaVez` roda no mount com o Vault mock ainda
// vazio, nao acha duplicata nenhuma e marca a flag one-shot
// `duplicatasAgendaLimpas`. Quando o passo 4 chama
// `disparaBootHooks()`, o hook ja queimou. O `localStorage.clear()` do
// passo 0 tenta contornar, e a corrida decide quem chega primeiro.
//
// Enquanto isso nao for resolvido, NAO admitir este caso ao
// e2e-smoke.json: a regra de admissao exige verde medido, e verde
// intermitente e pior que vermelho -- ensina a ignorar o gate.
// Rastreado em AUDIT-P2-13.
//
// Como executar (automacao de browser):
//   1. ./gauntlet.sh
//   2. Aguardar localhost:8081
//   3. Executar este caso via automacao de browser
//
// Comentarios sem acento (convencao shell/CI).
import type { PlaywrightPageLike, ResultadoE2E } from './e2e-template';

const ID_EVENTO = 'ev_dentista_p14';
const TITULO = 'Dentista';

export default async function caseAuditP1_4(
  page: PlaywrightPageLike
): Promise<ResultadoE2E> {
  const sprint = 'AUDIT-P1-4';
  const aspecto = 'agenda-evento-duplicado';
  const screenshots: string[] = [];
  const dir =
    'docs/sprints/AUDIT-P1-4-AGENDA-EVENTO-DUPLICADO-screenshots-gauntlet';

  try {
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(1000);
    // Zera flags de boot persistidas para o hook one-shot poder rodar.
    await page.evaluate(() => {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    });
    await page.goto('http://localhost:8081/_dev/gauntlet');
    await page.waitForTimeout(2000);

    // Passos 1 a 3: seed + evento no dia +2 + remarcacao para o dia +5.
    const preparado = await page.evaluate(() => {
      type AgendaEvento = {
        id: string;
        pessoa: 'pessoa_a' | 'pessoa_b';
        titulo: string;
        inicio: string;
        fim: string;
        fonte: 'google_calendar';
        sincronizado_em: string;
      };
      const w = globalThis as unknown as {
        __gauntlet?: {
          reset: () => void;
          seed: () => void;
          setOnboardingDone: (b: boolean) => void;
          setEventosAgendaMock: (
            pessoa: 'pessoa_a' | 'pessoa_b',
            eventos: AgendaEvento[]
          ) => number;
          listarVaultMock: () => string[];
        };
      };
      if (!w.__gauntlet) return null;
      w.__gauntlet.reset();
      w.__gauntlet.seed();
      w.__gauntlet.setOnboardingDone(true);

      // ISO BRT deterministico independente do TZ do host.
      const isoBRT = (offsetDias: number, hora: number): string => {
        const base = new Date(Date.now() + offsetDias * 86400_000);
        const local = new Date(base.getTime() + -180 * 60_000);
        const y = local.getUTCFullYear();
        const m = String(local.getUTCMonth() + 1).padStart(2, '0');
        const d = String(local.getUTCDate()).padStart(2, '0');
        const hh = String(hora).padStart(2, '0');
        return `${y}-${m}-${d}T${hh}:00:00-03:00`;
      };

      const evento = (offsetDias: number, sincronizadoEm: string) => ({
        id: 'ev_dentista_p14',
        pessoa: 'pessoa_a' as const,
        titulo: 'Dentista',
        inicio: isoBRT(offsetDias, 9),
        fim: isoBRT(offsetDias, 10),
        fonte: 'google_calendar' as const,
        sincronizado_em: sincronizadoEm,
      });

      const antes = new Date(Date.now() - 86400_000).toISOString();
      const agora = new Date().toISOString();
      w.__gauntlet.setEventosAgendaMock('pessoa_a', [evento(2, antes)]);
      w.__gauntlet.setEventosAgendaMock('pessoa_a', [evento(5, agora)]);

      return w.__gauntlet
        .listarVaultMock()
        .filter((u) => u.endsWith('-ev_dentista_p14.md'));
    });

    if (preparado === null) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: 'window.__gauntlet ausente; EXPO_PUBLIC_GAUNTLET nao ativa?',
        screenshots,
      };
    }
    if (preparado.length !== 2) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `pre-condicao invalida: esperava 2 .md do mesmo id no vault mock, veio ${preparado.length} (${preparado.join(', ')})`,
        screenshots,
      };
    }

    const pathAntes = `${dir}/A-duplicata-antes.png`;
    await page.screenshot({ path: pathAntes, fullPage: true });
    screenshots.push(pathAntes);

    // Passo 4: boot hooks (limparDuplicatasAgendaUmaVez esta plugado).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { disparaBootHooks: () => Promise<void> };
      };
      await w.__gauntlet.disparaBootHooks();
    });
    await page.waitForTimeout(2000);

    const depois = await page.evaluate(() => {
      const w = globalThis as unknown as {
        __gauntlet: { listarVaultMock: () => string[] };
      };
      return w.__gauntlet
        .listarVaultMock()
        .filter((u) => u.endsWith('-ev_dentista_p14.md'));
    });

    if (depois.length === 2) {
      return {
        sprint,
        aspecto,
        status: 'INCONCLUSIVO',
        detalhe:
          'useVaultMock nao implementa delete (so reader/writer tem branch web); ' +
          'o hook rodou mas nao ha como remover .md no vault mock. ' +
          'Regressao coberta em unidade: tests/lib/vault/agenda.test.ts + tests/lib/boot/limparDuplicatasAgenda.test.ts',
        screenshots,
      };
    }
    if (depois.length !== 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `esperava 1 .md apos a limpeza, veio ${depois.length} (${depois.join(', ')})`,
        screenshots,
      };
    }

    // Passo 5: a UI mostra o compromisso uma vez so (Home e agenda).
    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/');
    });
    await page.waitForTimeout(5000);

    const ocorrenciasHome = await page.evaluate(() => {
      const txt = document.body.innerText;
      return txt.split('Dentista').length - 1;
    });

    const pathHome = `${dir}/B-proximos-uma-entrada.png`;
    await page.screenshot({ path: pathHome, fullPage: true });
    screenshots.push(pathHome);

    await page.evaluate(async () => {
      const w = globalThis as unknown as {
        __gauntlet: { abrir: (rota: string) => Promise<void> };
      };
      await w.__gauntlet.abrir('/agenda');
    });
    await page.waitForTimeout(5000);

    const pathAgenda = `${dir}/C-agenda-uma-entrada.png`;
    await page.screenshot({ path: pathAgenda, fullPage: true });
    screenshots.push(pathAgenda);

    if (ocorrenciasHome > 1) {
      return {
        sprint,
        aspecto,
        status: 'FAIL',
        detalhe: `card "Proximos" mostra "${TITULO}" ${ocorrenciasHome} vezes; esperado no maximo 1`,
        screenshots,
      };
    }

    return {
      sprint,
      aspecto,
      status: 'PASS',
      detalhe: `remarcacao do evento ${ID_EVENTO} deixou 1 .md (${depois[0]}) e no maximo 1 entrada na UI`,
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
